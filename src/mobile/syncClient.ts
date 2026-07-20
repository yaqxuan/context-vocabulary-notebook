import packageMetadata from '../../package.json';
import type {
  PairingPayload,
  SignedConnectionProfile,
  SyncCardActionBatchResult,
  SyncEventBatchResult,
  SyncSnapshot,
} from '../shared/sync.js';
import { decodePairingPayloadText, SYNC_PROTOCOL_VERSION } from '../shared/sync.js';
import {
  MobileDatabase,
  type MobileConfig,
  type MobileConnectionMode,
  type MobileTransport,
} from './db.js';
import { MobileError } from './errors.js';
import { LanDiscovery, PinnedHttp, type PinnedHttpResponse } from './native.js';

export class MobileSyncError extends MobileError {
  constructor(public readonly status: number, message: string) {
    super('http_error', message, { status });
    this.name = 'MobileSyncError';
  }
}

interface SyncEndpoint {
  baseUrl: string;
  pin?: string;
  transport: MobileTransport;
  source: 'discovered-lan' | 'saved-lan' | 'pairing-lan' | 'tailscale';
}

interface CapabilitiesResponse {
  protocol_version: number;
  server_id: string;
  minimum_client_version: string;
}

const ENDPOINT_PROBE_TIMEOUT_MS = 4_000;

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connection probe timed out')), timeoutMs);
    operation.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

function isPinnedIdentityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /pinned server identity|certificate pin|pin mismatch/iu.test(message);
}

function isTerminalSyncError(error: unknown): boolean {
  if (error instanceof MobileSyncError) return error.status >= 400 && error.status < 500;
  return error instanceof MobileError
    && ['server_mismatch', 'upgrade_required', 'pc_identity_changed'].includes(error.code);
}

function normalizedBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new MobileError('https_required');
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

  private async discoverLan(config: MobileConfig): Promise<SyncEndpoint | null> {
    if (!config.server_id || !config.lan_spki_sha256) return null;
    try {
      const result = await LanDiscovery.discover();
      const service = result.services.find((item) => item.attributes.server_id === config.server_id);
      if (service?.host && service.port) {
        const url = normalizedBaseUrl(`https://${service.host.includes(':') ? `[${service.host}]` : service.host}:${service.port}`);
        return { baseUrl: url, pin: config.lan_spki_sha256, transport: 'lan', source: 'discovered-lan' };
      }
    } catch { /* mDNS is a convenience; the pinned saved address remains authoritative */ }
    return null;
  }

  private validateCapabilities(capabilities: CapabilitiesResponse, config: MobileConfig): void {
    if (capabilities.protocol_version !== SYNC_PROTOCOL_VERSION || capabilities.server_id !== config.server_id) {
      throw new MobileError('server_mismatch');
    }
    if (!isClientVersionSupported(packageMetadata.version, capabilities.minimum_client_version)) {
      throw new MobileError('upgrade_required', undefined, {
        minimum: capabilities.minimum_client_version,
        current: packageMetadata.version,
      });
    }
  }

  private async availableEndpoints(
    config: MobileConfig,
    pairingLanUrls: string[] = [],
  ): Promise<SyncEndpoint[]> {
    const mode = config.connection_mode ?? config.selected_transport;
    const candidateOperations: Array<Promise<SyncEndpoint | null>> = [];
    if (mode === 'auto' || mode === 'lan') {
      candidateOperations.push(this.discoverLan(config));
      candidateOperations.push(Promise.resolve().then(() => (
        config.lan_url && config.lan_spki_sha256
          ? {
              baseUrl: normalizedBaseUrl(config.lan_url), pin: config.lan_spki_sha256,
              transport: 'lan' as const, source: 'saved-lan' as const,
            }
          : null
      )));
      for (const value of pairingLanUrls) {
        candidateOperations.push(Promise.resolve().then(() => (
          config.lan_spki_sha256
            ? {
                baseUrl: normalizedBaseUrl(value), pin: config.lan_spki_sha256,
                transport: 'lan' as const, source: 'pairing-lan' as const,
              }
            : null
        )));
      }
    }
    if (mode === 'auto' || mode === 'tailscale') {
      candidateOperations.push(Promise.resolve(config.tailscale_url ? {
        baseUrl: normalizedBaseUrl(config.tailscale_url),
        transport: 'tailscale' as const,
        source: 'tailscale' as const,
      } : null));
    }
    if (!candidateOperations.length) throw new MobileError('pairing_transport_missing');

    const startedAt = Date.now();
    const results = await Promise.all(candidateOperations.map(async (operation, index) => {
      let candidate: SyncEndpoint | null = null;
      try {
        candidate = await withTimeout(operation, ENDPOINT_PROBE_TIMEOUT_MS);
        if (!candidate) return {
          endpoint: null, candidate: null, error: null,
          completedAt: Number.MAX_SAFE_INTEGER, index,
        };
        const capabilities = parseJson<CapabilitiesResponse>(await withTimeout(
          this.request(candidate, '/v1/capabilities'),
          ENDPOINT_PROBE_TIMEOUT_MS,
        ));
        this.validateCapabilities(capabilities, config);
        return {
          endpoint: candidate, candidate, error: null,
          completedAt: Date.now() - startedAt, index,
        };
      } catch (error) {
        return {
          endpoint: null, candidate, error,
          completedAt: Number.MAX_SAFE_INTEGER, index,
        };
      }
    }));

    const storedIdentityFailure = results.find((result) => (
      (result.candidate?.source === 'saved-lan' || result.candidate?.source === 'tailscale')
      && result.error
      && (
        isPinnedIdentityError(result.error)
        || (result.error instanceof MobileError && result.error.code === 'server_mismatch')
      )
    ));
    if (storedIdentityFailure) {
      if (isPinnedIdentityError(storedIdentityFailure.error)) {
        throw new MobileError('pc_identity_changed');
      }
      throw storedIdentityFailure.error;
    }

    const endpoints = results
      .filter((result): result is typeof result & { endpoint: SyncEndpoint } => Boolean(result.endpoint))
      .sort((a, b) => a.completedAt - b.completedAt || a.index - b.index)
      .map((result) => result.endpoint)
      .filter((endpoint, index, values) => values.findIndex((item) => item.baseUrl === endpoint.baseUrl) === index);
    if (endpoints.length) return endpoints;

    const error = results.find((result) => result.error)?.error;
    if (error) throw error;
    if (mode === 'lan') throw new MobileError('lan_not_configured');
    if (mode === 'tailscale') throw new MobileError('tailscale_not_configured');
    throw new MobileError('pairing_transport_missing');
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
    mode: MobileConnectionMode,
    onWaiting?: () => void,
  ): Promise<void> {
    const config = await this.db.getConfig();
    const lanUrl = payload.lan?.urls[0] ?? null;
    await this.db.updateConnection({
      serverId: payload.server_id,
      credential: null,
      mode,
      // Pairing payloads can contain several interfaces. Do not turn the first
      // one into an authoritative saved address until it has actually passed
      // certificate pinning and the capabilities check.
      lanUrl: null,
      lanSpkiSha256: payload.lan?.spki_sha256 ?? null,
      lanPublicKey: payload.lan?.public_key_spki ?? null,
      lanServiceName: payload.lan?.service_name ?? null,
      tailscaleUrl: payload.tailscale_url,
    });
    const pairedConfig = await this.db.getConfig();
    const endpoint = (await this.availableEndpoints(
      pairedConfig,
      payload.lan?.urls ?? (lanUrl ? [lanUrl] : []),
    ))[0]!;
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
      if (status.status === 'denied') throw new MobileError('pairing_denied');
      if (status.status === 'approved' && status.credential && status.device_id === config.device_id) {
        await this.db.updateConnection({ serverId: payload.server_id, credential: status.credential });
        await this.db.markSuccessfulTransport(endpoint.transport, endpoint.transport === 'lan' ? endpoint.baseUrl : undefined);
        return;
      }
    }
    throw new MobileError('pairing_expired');
  }

  async applySignedConnectionProfile(value: SignedConnectionProfile): Promise<void> {
    const config = await this.db.getConfig();
    if (!config.server_id || value.profile.server_id !== config.server_id || !config.lan_public_key) {
      throw new MobileError('profile_wrong_pc');
    }
    const verified = await PinnedHttp.verifySignature({
      data: JSON.stringify(value.profile),
      signature: value.signature,
      publicKeySpki: config.lan_public_key,
    });
    if (!verified.valid) throw new MobileError('profile_signature_invalid');
    if (value.profile.lan_spki_sha256 !== config.lan_spki_sha256) throw new MobileError('pc_identity_changed');
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
    const config = await this.db.getConfig();
    if (!config.server_id || !config.credential) throw new MobileError('not_paired');
    const endpoints = await this.availableEndpoints(config);
    let lastError: unknown;
    for (const endpoint of endpoints) {
      try {
        const result = await this.performSyncWithEndpoint(config, endpoint);
        await this.db.markSuccessfulTransport(
          endpoint.transport,
          endpoint.transport === 'lan' ? endpoint.baseUrl : undefined,
        );
        return result;
      } catch (error) {
        lastError = isPinnedIdentityError(error) ? new MobileError('pc_identity_changed') : error;
        if (isTerminalSyncError(lastError)) throw lastError;
      }
    }
    throw lastError ?? new MobileError('unknown');
  }

  private async performSyncWithEndpoint(
    initialConfig: MobileConfig,
    endpoint: SyncEndpoint,
  ): Promise<{ revision: number; uploaded: number; downloadedMedia: number }> {
    let config = initialConfig;
    const auth = { Authorization: `Bearer ${config.credential}` };
    const capabilities = parseJson<CapabilitiesResponse>(await this.request(endpoint, '/v1/capabilities'));
    this.validateCapabilities(capabilities, config);

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
    throw new MobileError('pairing_code_invalid');
  }
  if (!value.tailscale_url && !value.lan) throw new MobileError('pairing_transport_missing');
  return value;
}
