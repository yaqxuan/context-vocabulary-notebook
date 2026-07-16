import { describe, expect, it } from 'vitest';

import { parsePairingPayload } from '../../src/mobile/syncClient.js';

describe('Android pairing payload validation', () => {
  it('accepts a protocol-v1 payload with pinned LAN identity', () => {
    const payload = parsePairingPayload(JSON.stringify({
      protocol_version: 1,
      server_id: 'pc-1',
      session_id: 'session-1',
      secret: 'one-time-secret',
      expires_at: '2026-07-16T12:05:00.000Z',
      tailscale_url: null,
      lan: {
        service_name: 'cvn-vocabulary-notebook',
        urls: ['https://192.168.1.4:3109'],
        spki_sha256: 'pin',
        public_key_spki: 'public-key',
      },
    }));
    expect(payload.server_id).toBe('pc-1');
    expect(payload.lan?.spki_sha256).toBe('pin');
  });

  it('rejects protocol downgrade and payloads without an HTTPS transport', () => {
    expect(() => parsePairingPayload(JSON.stringify({
      protocol_version: 0,
      server_id: 'pc-1', session_id: 's', secret: 'x', expires_at: '2026-07-16T12:05:00.000Z',
      tailscale_url: null, lan: null,
    }))).toThrow(/supported/u);
    expect(() => parsePairingPayload(JSON.stringify({
      protocol_version: 1,
      server_id: 'pc-1', session_id: 's', secret: 'x', expires_at: '2026-07-16T12:05:00.000Z',
      tailscale_url: null, lan: null,
    }))).toThrow(/usable connection/u);
  });
});
