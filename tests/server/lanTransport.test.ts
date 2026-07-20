import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { X509Certificate, verify } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createTestDb } from '../../src/server/db/testDb.js';
import {
  ensureLanIdentity,
  isAdvertisableLanAddress,
  signedConnectionProfile,
} from '../../src/server/domain/lanIdentity.js';
import { detectWslNetwork } from '../../src/server/domain/networkDiagnostics.js';
import { isPrivateNetworkAddress, startLanSyncServer, type LanSyncServer } from '../../src/server/lanServer.js';
import { DeviceSyncRuntime } from '../../src/server/deviceSyncRuntime.js';

let db: Database;
let tempDir: string;
let lanServer: LanSyncServer | undefined;

beforeEach(() => {
  lanServer = undefined;
  db = createTestDb();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-lan-'));
});

afterEach(async () => {
  await lanServer?.close();
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function getCapabilities(port: number, rejectUnauthorized: boolean): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = https.get({ hostname: '127.0.0.1', port, path: '/v1/capabilities', rejectUnauthorized }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.on('error', reject);
  });
}

describe('LAN sync transport', () => {
  it('generates one stable P-256 identity and signs connection profiles', async () => {
    const identityDir = path.join(tempDir, 'identity');
    const first = await ensureLanIdentity(db, identityDir);
    const second = await ensureLanIdentity(db, identityDir);
    expect(second.spkiSha256).toBe(first.spkiSha256);
    if (process.platform !== 'win32') expect(fs.statSync(path.join(identityDir, 'server-key.pem')).mode & 0o777).toBe(0o600);
    const certificate = new X509Certificate(first.certificatePem);
    expect(certificate.publicKey.asymmetricKeyType).toBe('ec');

    const signed = signedConnectionProfile(db, first);
    expect(verify('sha256', Buffer.from(JSON.stringify(signed.profile)), certificate.publicKey, Buffer.from(signed.signature, 'base64url'))).toBe(true);
  });

  it('serves only HTTPS and presents the pinned self-signed identity', async () => {
    lanServer = await startLanSyncServer({
      db,
      uploadsDir: tempDir,
      identityDir: path.join(tempDir, 'identity'),
      port: 0,
      host: '127.0.0.1',
      advertise: false,
    });
    const address = lanServer.server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    await expect(getCapabilities(address.port, true)).rejects.toThrow();
    const response = await getCapabilities(address.port, false);
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ protocol_version: 1 });
  });

  it('accepts only private, Tailnet, loopback, link-local, and ULA sources', () => {
    expect(isPrivateNetworkAddress('127.0.0.1')).toBe(true);
    expect(isPrivateNetworkAddress('::ffff:192.168.1.8')).toBe(true);
    expect(isPrivateNetworkAddress('10.2.3.4')).toBe(true);
    expect(isPrivateNetworkAddress('100.100.20.30')).toBe(true);
    expect(isPrivateNetworkAddress('fd00::10')).toBe(true);
    expect(isPrivateNetworkAddress('8.8.8.8')).toBe(false);
    expect(isPrivateNetworkAddress('2001:4860:4860::8888')).toBe(false);
  });

  it('does not advertise Tailnet or unusable link-local addresses as LAN URLs', () => {
    expect(isAdvertisableLanAddress('192.168.1.231')).toBe(true);
    expect(isAdvertisableLanAddress('10.20.30.40')).toBe(true);
    expect(isAdvertisableLanAddress('fd12:3456::10')).toBe(true);
    expect(isAdvertisableLanAddress('100.95.236.101')).toBe(false);
    expect(isAdvertisableLanAddress('fd7a:115c:a1e0::8f33:ec66')).toBe(false);
    expect(isAdvertisableLanAddress('fe80::d48:471c:e60b:b421')).toBe(false);
  });

  it('reports a scoped WSL firewall command without changing the system', () => {
    const result = detectWslNetwork(3109);
    if (result.is_wsl) {
      expect(result.firewall_command).toContain('-LocalPorts 3109');
      expect(result.verify_command).toContain('-Port 3109');
      expect(['mirrored', 'nat', 'unknown']).toContain(result.networking_mode);
    } else {
      expect(result.firewall_command).toBeNull();
      expect(result.verify_command).toBeNull();
      expect(result.lan_supported).toBe(true);
    }
  });

  it('enables and disables the LAN listener without restarting the app', async () => {
    db.prepare('UPDATE sync_server_config SET lan_port = 0 WHERE id = 1').run();
    const runtime = new DeviceSyncRuntime(db, tempDir, path.join(tempDir, 'runtime-identity'), { advertise: false });
    await runtime.setLanEnabled(true);
    expect(runtime.lanRunning).toBe(true);
    expect((db.prepare('SELECT lan_enabled FROM sync_server_config WHERE id = 1').get() as { lan_enabled: number }).lan_enabled).toBe(1);
    await runtime.setLanEnabled(false);
    expect(runtime.lanRunning).toBe(false);
  });
});
