import packageMetadata from '../../package.json';
import type {
  PairingPayload,
  SignedConnectionProfile,
  SyncCardActionBatchResult,
  SyncEventBatchResult,
  SyncSnapshot,
} from '../shared/sync.js';
import { decodePairingPayloadText, SYNC_PROTOCOL_VERSION } from '../shared/sync.js';
import { MobileDatabase, type MobileConfig, type MobileTransport } from './db.js';
import { LanDiscovery, PinnedHttp, type PinnedHttpResponse } from './native.js';

export class MobileSyncError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'MobileSyncError';
  }
}

function normalizedBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Only HTTPS sync URLs are allowed');
  return url.origin;
}

function parseJson<T>(response: PinnedHttpResponse): T {
  if (response.status < 200 || response.status >= 300) {
    let message = `Sync request failed with HTTP ${response.status}`;
    try {
      const body = JSON.parse(response.body) as { message?: unknown; error?: unknown };
      if (typeof body.message === 'string') message = body.message;
      else if (typeof body.error === 'string') message = body.error;
    } catch { /* keep the HTTP status message */ }
    throw new MobileSyncError(response.status, message);
  }
  if (!response.body) return undefined as T;
  return JSON.parse(response.body) as T;
}

export function isClientVersionSupported(current: string, minimum: string): boolean {
  const parse = (value: string): { core: number[]; prerelease: string[] | null } | null => {
    const match = value.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/u);
    if (!match) return null;
    return {
      core: [Number(match[1]), Number(match[2]), Number(match[3])],
      prerelease: match[4]?.split('.') ?? null,
    };
  };
  const currentVersion = parse(current);
  const minimumVersion = parse(minimum);
  if (!currentVersion || !minimumVersion) return current === minimum;
  for (let index = 0; index < 3; index += 1) {
    if (currentVersion.core[index]! !== minimumVersion.core[index]!) {
      return currentVersion.core[index]! > minimumVersion.core[index]!;
    }
  }
  if (!minimumVersion.prerelease) return currentVersion.prerelease === null;
  if (!currentVersion.prerelease) return true;
  const length = Math.max(currentVersion.prerelease.length, minimumVersion.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const currentPart = currentVersion.prerelease[index];
    const minimumPart = minimumVersion.prerelease[index];
    if (currentPart === undefined) return false;
    if (minimumPart === undefined) return true;
    if (currentPart === minimumPart) continue;
    const currentNumber = /^\d+$/u.test(currentPart) ? Number(currentPart) : null;
    const minimumNumber = /^\d+$/u.test(minimumPart) ? Number(minimumPart) : null;
    if (currentNumber !== null && minimumNumber !== null) return currentNumber > minimumNumber;
    if (currentNumber !== null) return false;
    if (minimumNumber !== null) return true;
    return currentPart.localeCompare(minimumPart) > 0;
  }
  return true;
}

export class MobileSyncClient {
  private activeSync: Promise<{ revision: number; uploaded: number; downloadedMedia: number }> | null = null;

  constructor(private readonly db: MobileDatabase) {}

  private async discoverLan(config: MobileConfig): Promise<string | null> {
    if (!config.server_id) return config.lan_url;
    try {
      const result = await LanDiscovery.discover();
      const service = result.services.find((item) => item.attributes.server_id === config.server_id);
      if (service?.host && service.port) {
        const url = normalizedBaseUrl(`https://${service.host.includes(':') ? `[${service.host}]` : service.host}:${service.port}`);
        await this.db.updateConnection({ serverId: config.server_id, lanUrl: url });
        return url;
      }
    } catch { /* mDNS is a convenience; the pinned saved address remains authoritative */ }
    return config.lan_url;
  }

  private async endpoint(config: MobileConfig): Promise<{ baseUrl: string; pin?: string }> {
    if (config.selected_transport === 'lan') {
      const baseUrl = await this.discoverLan(config);
      if (!baseUrl || !config.lan_spki_sha256) throw new Error('LAN connection is not configured');
      return { baseUrl: normalizedBaseUrl(baseUrl), pin: config.lan_spki_sha256 };
    }
    if (!config.tailscale_url) throw new Error('Tailscale connection is not configured');
    return { baseUrl: normalizedBaseUrl(config.tailscale_url) };
  }

  private async request(
    endpoint: { baseUrl: string; pin?: string },
    path: string,
    options: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
  ): Promise<PinnedHttpResponse> {
    return PinnedHttp.request({
      url: `${endpoint.baseUrl}${path}`,
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'X-CVN-Protocol': String(SYNC_PROTOCOL_VERSION),
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      spkiSha256: endpoint.pin,
    });
  }

  async pairAndWait(
    payload: PairingPayload,
    transport: MobileTransport,
    onWaiting?: () => void,
  ): Promise<void> {
    const config = await this.db.getConfig();
    const lanUrl = payload.lan?.urls[0] ?? null;
    await this.db.updateConnection({
      serverId: payload.server_id,
      credential: null,
      transport,
      lanUrl,
      lanSpkiSha256: payload.lan?.spki_sha256 ?? null,
      lanPublicKey: payload.lan?.public_key_spki ?? null,
      lanServiceName: payload.lan?.service_name ?? null,
      tailscaleUrl: payload.tailscale_url,
    });
    const endpoint = transport === 'lan'
      ? { baseUrl: normalizedBaseUrl(lanUrl ?? ''), pin: payload.lan?.spki_sha256 }
      : { baseUrl: normalizedBaseUrl(payload.tailscale_url ?? '') };
    parseJson(await this.request(endpoint, '/v1/pair', {
      method: 'POST',
      body: { session_id: payload.session_id, secret: payload.secret, device_id: config.device_id, device_name: config.device_name },
    }));
    onWaiting?.();
    while (Date.now() < Date.parse(payload.expires_at)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const status = parseJson<{ status: string; credential?: string; device_id?: string }>(await this.request(
        endpoint,
        `/v1/pair/${encodeURIComponent(payload.session_id)}/status`,
        { headers: { 'X-Pairing-Secret': payload.secret } },
      ));
      if (status.status === 'denied') throw new Error('Pairing was denied on the PC');
      if (status.status === 'approved' && status.credential && status.device_id === config.device_id) {
        await this.db.updateConnection({ serverId: payload.server_id, credential: status.credential });
        return;
      }
    }
    throw new Error('Pairing session expired');
  }

  async applySignedConnectionProfile(value: SignedConnectionProfile): Promise<void> {
    const config = await this.db.getConfig();
    if (!config.server_id || value.profile.server_id !== config.server_id || !config.lan_public_key) {
      throw new Error('Connection profile does not belong to the paired PC');
    }
    const verified = await PinnedHttp.verifySignature({
      data: JSON.stringify(value.profile),
      signature: value.signature,
      publicKeySpki: config.lan_public_key,
    });
    if (!verified.valid) throw new Error('Connection profile signature is invalid');
    if (value.profile.lan_spki_sha256 !== config.lan_spki_sha256) throw new Error('PC identity changed; pair again');
    await this.db.updateConnection({
      serverId: config.server_id,
      lanUrl: value.profile.lan_urls[0] ?? config.lan_url,
      lanServiceName: value.profile.lan_service_name,
      tailscaleUrl: value.profile.tailscale_url,
    });
  }

  async syncNow(): Promise<{ revision: number; uploaded: number; downloadedMedia: number }> {
    if (this.activeSync) return this.activeSync;
    const operation = this.performSync();
    this.activeSync = operation;
    try {
      return await operation;
    } finally {
      if (this.activeSync === operation) this.activeSync = null;
    }
  }

  private async performSync(): Promise<{ revision: number; uploaded: number; downloadedMedia: number }> {
    let config = await this.db.getConfig();
    if (!config.server_id || !config.credential) throw new Error('Pair with a PC before syncing');
    const endpoint = await this.endpoint(config);
    const auth = { Authorization: `Bearer ${config.credential}` };
    const capabilities = parseJson<{
      protocol_version: number;
      server_id: string;
      minimum_client_version: string;
    }>(await this.request(endpoint, '/v1/capabilities'));
    if (capabilities.protocol_version !== SYNC_PROTOCOL_VERSION || capabilities.server_id !== config.server_id) {
      throw new Error('Connected server identity or sync protocol does not match');
    }
    if (!isClientVersionSupported(packageMetadata.version, capabilities.minimum_client_version)) {
      throw new Error(
        `Android app ${capabilities.minimum_client_version} or newer is required; installed version is ${packageMetadata.version}`,
      );
    }

    let uploaded = 0;
    while (true) {
      const events = await this.db.pendingEvents();
      if (!events.length) break;
      const result = parseJson<SyncEventBatchResult>(await this.request(endpoint, '/v1/events', { method: 'POST', headers: auth, body: { events } }));
      await this.db.markUploaded(result.accepted_through);
      uploaded += events.length;
      if (events.length < 500) break;
    }

    while (true) {
      const actions = await this.db.pendingCardActions();
      if (!actions.length) break;
      const result = parseJson<SyncCardActionBatchResult>(await this.request(
        endpoint,
        '/v1/card-actions',
        { method: 'POST', headers: auth, body: { actions } },
      ));
      await this.db.markCardActionsUploaded(result.accepted_through);
      uploaded += actions.length;
      if (actions.length < 500) break;
    }

    config = await this.db.getConfig();
    const snapshotResponse = await this.request(endpoint, `/v1/snapshot?known_revision=${config.snapshot_revision}`, { headers: auth });
    if (snapshotResponse.status !== 204) {
      const snapshot = parseJson<SyncSnapshot>(snapshotResponse);
      await this.db.applySnapshot(snapshot);
      await PinnedHttp.clearMedia({ keepSha256: await this.db.mediaHashes() });
    }

    let downloadedMedia = 0;
    for (const item of await this.db.missingMedia()) {
      const result = await PinnedHttp.download({
        url: `${endpoint.baseUrl}/v1/media/${item.sha256}`,
        sha256: item.sha256,
        fileName: item.file_name,
        headers: { ...auth, 'X-CVN-Protocol': String(SYNC_PROTOCOL_VERSION) },
        spkiSha256: endpoint.pin,
      });
      await this.db.setMediaPath(item.sha256, result.path);
      downloadedMedia += 1;
    }

    config = await this.db.getConfig();
    parseJson(await this.request(endpoint, `/v1/snapshot/${config.snapshot_revision}/ack`, { method: 'POST', headers: auth }));
    await this.db.markSyncCompleted();
    return { revision: config.snapshot_revision, uploaded, downloadedMedia };
  }

  async unpair(): Promise<void> {
    await this.db.clearPairing();
    await PinnedHttp.clearMedia({ keepSha256: [] });
  }
}

export function parsePairingPayload(raw: string): PairingPayload {
  const value = decodePairingPayloadText(raw) as PairingPayload;
  if (value.protocol_version !== SYNC_PROTOCOL_VERSION || !value.server_id || !value.session_id || !value.secret || !value.expires_at) {
    throw new Error('This is not a supported Context Vocabulary Notebook pairing code');
  }
  if (!value.tailscale_url && !value.lan) throw new Error('Pairing code does not contain a usable connection');
  return value;
}
