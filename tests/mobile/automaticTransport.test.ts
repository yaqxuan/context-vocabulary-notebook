import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request, discover } = vi.hoisted(() => ({ request: vi.fn(), discover: vi.fn() }));

vi.mock('../../src/mobile/native.js', () => ({
  PinnedHttp: { request },
  LanDiscovery: { discover },
}));

import type { MobileConfig, MobileDatabase } from '../../src/mobile/db.js';
import { MobileSyncClient } from '../../src/mobile/syncClient.js';

const config: MobileConfig = {
  device_id: 'phone', device_name: 'Android', server_id: 'pc-1', credential: 'credential',
  selected_transport: 'lan', connection_mode: 'auto', last_successful_transport: null,
  lan_url: 'https://192.168.1.2:3109', lan_spki_sha256: 'pin', lan_public_key: 'key',
  lan_service_name: 'cvn', tailscale_url: 'https://pc.example.ts.net', snapshot_revision: 1,
  next_device_sequence: 1, next_card_action_sequence: 1, last_sync_at: null,
  interface_language: '中文', target_language_override: null,
  override_base_pc_target_language: null,
};

describe('Android automatic transport selection', () => {
  beforeEach(() => {
    request.mockReset();
    discover.mockReset();
    discover.mockResolvedValue({ services: [] });
  });

  it('accepts both validated LAN and Tailscale candidates', async () => {
    request.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ protocol_version: 1, server_id: 'pc-1', minimum_client_version: '0.3.0-alpha.7' }),
      contentType: 'application/json',
    });
    const client = new MobileSyncClient({} as MobileDatabase);
    const endpoints = await (client as unknown as {
      availableEndpoints(value: MobileConfig): Promise<Array<{ transport: string }>>;
    }).availableEndpoints(config);

    expect(endpoints.map((endpoint) => endpoint.transport).sort()).toEqual(['lan', 'tailscale']);
  });

  it('does not bypass a saved LAN identity mismatch in automatic mode', async () => {
    request.mockImplementation((options: { spkiSha256?: string }) => {
      if (options.spkiSha256) return Promise.reject(new Error('Pinned server identity does not match'));
      return Promise.resolve({
        status: 200,
        body: JSON.stringify({ protocol_version: 1, server_id: 'pc-1', minimum_client_version: '0.3.0-alpha.7' }),
        contentType: 'application/json',
      });
    });
    const client = new MobileSyncClient({} as MobileDatabase);

    await expect((client as unknown as {
      availableEndpoints(value: MobileConfig): Promise<unknown>;
    }).availableEndpoints(config)).rejects.toMatchObject({ code: 'pc_identity_changed' });
  });

  it('does not bypass a saved endpoint that reports another server id', async () => {
    request.mockImplementation((options: { url: string }) => Promise.resolve({
      status: 200,
      body: JSON.stringify({
        protocol_version: 1,
        server_id: options.url.includes('192.168.1.2') ? 'different-pc' : 'pc-1',
        minimum_client_version: '0.3.0-alpha.7',
      }),
      contentType: 'application/json',
    }));
    const client = new MobileSyncClient({} as MobileDatabase);

    await expect((client as unknown as {
      availableEndpoints(value: MobileConfig): Promise<unknown>;
    }).availableEndpoints(config)).rejects.toMatchObject({ code: 'server_mismatch' });
  });
});
