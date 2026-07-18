import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Database } from 'better-sqlite3';
import { PAIRING_SESSION_TTL_MS, SYNC_PROTOCOL_VERSION, type PairingPayload } from '../../shared/sync.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../http/errors.js';
import { lanUrls } from './lanIdentity.js';

interface PairingSessionRow {
  session_id: string;
  secret_hash: string;
  status: 'created' | 'awaiting_approval' | 'approved' | 'denied';
  requested_device_id: string | null;
  requested_name: string | null;
  issued_credential: string | null;
  created_at: string;
  expires_at: string;
  approved_at: string | null;
}

export interface SyncDeviceRow {
  device_id: string;
  device_name: string;
  device_type: 'android';
  paired_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

export interface TailscaleStatus {
  installed: boolean;
  online: boolean;
  dns_name: string | null;
  configured_url: string | null;
  serve_command: string;
  serve_available: boolean;
  serve_enabled: boolean;
  cli_path: string | null;
  authorization_url: string | null;
  error: string | null;
}

interface ResolvedTailscale {
  cli: string;
  status: { BackendState?: string; Self?: { DNSName?: string } };
}

function digest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function randomSecret(): string {
  return randomBytes(32).toString('base64url');
}

function activeSession(db: Database, sessionId: string, secret: string, now = new Date()): PairingSessionRow {
  const session = db.prepare('SELECT * FROM pairing_sessions WHERE session_id = ?').get(sessionId) as PairingSessionRow | undefined;
  if (!session || session.secret_hash !== digest(secret)) throw new UnauthorizedError('Invalid pairing session');
  if (Date.parse(session.expires_at) <= now.getTime()) throw new UnauthorizedError('Pairing session expired');
  return session;
}

export function createPairingSession(db: Database, now = new Date()): PairingPayload {
  const server = db.prepare(`
    SELECT server_id, tailscale_url, lan_enabled, lan_port, lan_fingerprint, lan_public_key, lan_service_name
    FROM sync_server_config WHERE id = 1
  `).get() as {
    server_id: string;
    tailscale_url: string | null;
    lan_enabled: number;
    lan_port: number;
    lan_fingerprint: string | null;
    lan_public_key: string | null;
    lan_service_name: string;
  };
  const sessionId = randomUUID();
  const secret = randomSecret();
  const expiresAt = new Date(now.getTime() + PAIRING_SESSION_TTL_MS).toISOString();
  db.prepare('DELETE FROM pairing_sessions WHERE expires_at <= ?').run(now.toISOString());
  db.prepare(`
    INSERT INTO pairing_sessions (session_id, secret_hash, status, created_at, expires_at)
    VALUES (?, ?, 'created', ?, ?)
  `).run(sessionId, digest(secret), now.toISOString(), expiresAt);
  return {
    protocol_version: SYNC_PROTOCOL_VERSION,
    server_id: server.server_id,
    session_id: sessionId,
    secret,
    expires_at: expiresAt,
    tailscale_url: server.tailscale_url,
    lan: server.lan_enabled && server.lan_fingerprint && server.lan_public_key ? {
      service_name: server.lan_service_name,
      urls: lanUrls(server.lan_port),
      spki_sha256: server.lan_fingerprint,
      public_key_spki: server.lan_public_key,
    } : null,
  };
}

export function requestPairing(
  db: Database,
  sessionId: string,
  secret: string,
  deviceId: string,
  deviceName: string,
  now = new Date(),
): { status: 'awaiting_approval' } {
  const session = activeSession(db, sessionId, secret, now);
  if (!deviceId.trim() || !deviceName.trim()) throw new ConflictError('Device id and name are required');
  if (session.status === 'denied') throw new ForbiddenError('Pairing request was denied');
  if (session.status === 'approved') return { status: 'awaiting_approval' };
  if (session.status === 'awaiting_approval' && session.requested_device_id !== deviceId) {
    throw new ConflictError('Pairing session is already claimed');
  }
  db.prepare(`
    UPDATE pairing_sessions
    SET status = 'awaiting_approval', requested_device_id = ?, requested_name = ?
    WHERE session_id = ?
  `).run(deviceId.trim(), deviceName.trim().slice(0, 100), sessionId);
  return { status: 'awaiting_approval' };
}

export function approvePairing(db: Database, sessionId: string, now = new Date()): SyncDeviceRow {
  return db.transaction(() => {
    const session = db.prepare('SELECT * FROM pairing_sessions WHERE session_id = ?').get(sessionId) as PairingSessionRow | undefined;
    if (!session) throw new NotFoundError('Pairing session not found');
    if (Date.parse(session.expires_at) <= now.getTime()) throw new ConflictError('Pairing session expired');
    if (session.status !== 'awaiting_approval' || !session.requested_device_id || !session.requested_name) {
      throw new ConflictError('Pairing session is not awaiting approval');
    }
    const activeDevice = db.prepare('SELECT device_id FROM sync_devices WHERE revoked_at IS NULL').get() as { device_id: string } | undefined;
    if (activeDevice && activeDevice.device_id !== session.requested_device_id) {
      throw new ConflictError('Revoke the active Android device before pairing another');
    }
    const credential = randomSecret();
    db.prepare(`
      INSERT INTO sync_devices
        (device_id, device_name, device_type, credential_hash, paired_at, last_seen_at, revoked_at)
      VALUES (?, ?, 'android', ?, ?, NULL, NULL)
      ON CONFLICT(device_id) DO UPDATE SET
        device_name = excluded.device_name,
        credential_hash = excluded.credential_hash,
        paired_at = excluded.paired_at,
        last_seen_at = NULL,
        revoked_at = NULL
    `).run(session.requested_device_id, session.requested_name, digest(credential), now.toISOString());
    db.prepare(`
      INSERT OR IGNORE INTO sync_device_cursors
        (device_id, accepted_event_sequence, acknowledged_revision, updated_at)
      VALUES (?, 0, 0, ?)
    `).run(session.requested_device_id, now.toISOString());
    db.prepare(`
      UPDATE pairing_sessions
      SET status = 'approved', issued_credential = ?, approved_at = ?
      WHERE session_id = ?
    `).run(credential, now.toISOString(), sessionId);
    return getDevice(db, session.requested_device_id);
  })();
}

export function pairingStatus(
  db: Database,
  sessionId: string,
  secret: string,
  now = new Date(),
): { status: PairingSessionRow['status']; credential?: string; device_id?: string } {
  return db.transaction(() => {
    const session = activeSession(db, sessionId, secret, now);
    if (session.status === 'denied') {
      db.prepare('DELETE FROM pairing_sessions WHERE session_id = ?').run(sessionId);
      return { status: 'denied' as const };
    }
    if (session.status !== 'approved' || !session.issued_credential || !session.requested_device_id) return { status: session.status };
    const result = { status: 'approved' as const, credential: session.issued_credential, device_id: session.requested_device_id };
    db.prepare('DELETE FROM pairing_sessions WHERE session_id = ?').run(sessionId);
    return result;
  })();
}

export function denyPairing(db: Database, sessionId: string): void {
  const result = db.prepare(`
    UPDATE pairing_sessions SET status = 'denied', issued_credential = NULL WHERE session_id = ?
  `).run(sessionId);
  if (result.changes === 0) throw new NotFoundError('Pairing session not found');
}

export function listDevices(db: Database): SyncDeviceRow[] {
  return db.prepare(`
    SELECT device_id, device_name, device_type, paired_at, last_seen_at, revoked_at
    FROM sync_devices ORDER BY paired_at DESC
  `).all() as SyncDeviceRow[];
}

export function getDevice(db: Database, deviceId: string): SyncDeviceRow {
  const device = db.prepare(`
    SELECT device_id, device_name, device_type, paired_at, last_seen_at, revoked_at
    FROM sync_devices WHERE device_id = ?
  `).get(deviceId) as SyncDeviceRow | undefined;
  if (!device) throw new NotFoundError('Sync device not found');
  return device;
}

export function authenticateDevice(db: Database, credential: string, now = new Date()): SyncDeviceRow {
  const device = db.prepare(`
    SELECT device_id, device_name, device_type, paired_at, last_seen_at, revoked_at
    FROM sync_devices WHERE credential_hash = ?
  `).get(digest(credential)) as SyncDeviceRow | undefined;
  if (!device) throw new UnauthorizedError('Invalid device credential');
  if (device.revoked_at) throw new ForbiddenError('Device has been revoked');
  db.prepare('UPDATE sync_devices SET last_seen_at = ? WHERE device_id = ?').run(now.toISOString(), device.device_id);
  return { ...device, last_seen_at: now.toISOString() };
}

export function revokeDevice(db: Database, deviceId: string, now = new Date()): void {
  const result = db.prepare(`
    UPDATE sync_devices SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL
  `).run(now.toISOString(), deviceId);
  if (result.changes === 0) throw new NotFoundError('Active sync device not found');
}

export function setTailscaleUrl(db: Database, url: string | null): void {
  if (url !== null) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new ConflictError('Tailscale URL must be a valid HTTPS URL'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.toLowerCase().endsWith('.ts.net')) {
      throw new ConflictError('Tailscale URL must be a MagicDNS HTTPS URL ending in .ts.net');
    }
    url = parsed.origin;
  }
  db.prepare('UPDATE sync_server_config SET tailscale_url = ?, updated_at = ? WHERE id = 1')
    .run(url, new Date().toISOString());
}

function tailscaleCandidates(): string[] {
  const configuredCli = process.env.CVN_TAILSCALE_CLI_PATH?.trim();
  const candidates: Array<string | null | undefined> = [configuredCli, 'tailscale'];
  if (process.platform === 'win32' || process.env.WSL_DISTRO_NAME) {
    candidates.push('tailscale.exe');
    const programFiles = process.env.ProgramFiles;
    const localAppData = process.env.LOCALAPPDATA;
    if (programFiles) candidates.push(path.join(programFiles, 'Tailscale', 'tailscale.exe'));
    if (localAppData) candidates.push(path.join(localAppData, 'Tailscale', 'tailscale.exe'));
    try {
      const executable = execFileSync('powershell.exe', [
        '-NoProfile', '-Command',
        "(Get-Process tailscale-ipn -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path)",
      ], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (executable) {
        const windowsCli = path.win32.join(path.win32.dirname(executable), 'tailscale.exe');
        if (process.env.WSL_DISTRO_NAME) {
          try {
            candidates.push(execFileSync('wslpath', ['-u', windowsCli], {
              encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
            }).trim());
          } catch { candidates.push(windowsCli); }
        } else {
          candidates.push(windowsCli);
        }
      }
    } catch { /* PowerShell interop is optional */ }
  }
  return candidates
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      if (!process.env.WSL_DISTRO_NAME || !/^[a-z]:\\/iu.test(value)) return value;
      try {
        return execFileSync('wslpath', ['-u', value], {
          encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      } catch { return value; }
    })
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => !path.isAbsolute(value) || fs.existsSync(value));
}

function resolveTailscale(): ResolvedTailscale | null {
  const candidates = tailscaleCandidates();
  for (const cli of candidates) {
    try {
      const output = execFileSync(cli, ['status', '--json'], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
      const status = JSON.parse(output) as { BackendState?: string; Self?: { DNSName?: string } };
      return { cli, status };
    } catch { /* try a native CLI, then the Windows CLI exposed through WSL interop */ }
  }
  return null;
}

function serveStatus(cli: string): boolean {
  try {
    const output = execFileSync(cli, ['serve', 'status', '--json'], {
      encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return Boolean(output && output !== '{}' && output !== 'null');
  } catch {
    try {
      const output = execFileSync(cli, ['serve', 'status'], {
        encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
      });
      return /https:\/\//iu.test(output) && !/no serve config/iu.test(output);
    } catch { return false; }
  }
}

export function detectTailscale(db: Database): TailscaleStatus {
  const configured = db.prepare('SELECT tailscale_url FROM sync_server_config WHERE id = 1').get() as { tailscale_url: string | null };
  const resolved = resolveTailscale();
  if (!resolved) {
    return {
      installed: false, online: false, dns_name: null, configured_url: configured.tailscale_url,
      serve_command: 'tailscale serve --bg 3108', serve_available: false, serve_enabled: false,
      cli_path: null, authorization_url: null, error: null,
    };
  }
  const dnsName = resolved.status.Self?.DNSName?.replace(/\.$/u, '') ?? null;
  let serveAvailable = false;
  try {
    execFileSync(resolved.cli, ['serve', '--help'], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'ignore', 'ignore'] });
    serveAvailable = true;
  } catch { /* an older client can be online without Serve support */ }
  return {
    installed: true,
    online: resolved.status.BackendState === 'Running',
    dns_name: dnsName,
    configured_url: configured.tailscale_url,
    serve_command: 'tailscale serve --bg 3108',
    serve_available: serveAvailable,
    serve_enabled: serveAvailable && serveStatus(resolved.cli),
    cli_path: resolved.cli,
    authorization_url: null,
    error: null,
  };
}

export function startTailscaleServe(db: Database, port = 3108): TailscaleStatus {
  const resolved = resolveTailscale();
  if (!resolved) return detectTailscale(db);
  try {
    const output = execFileSync(resolved.cli, ['serve', '--bg', String(port)], {
      encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ...detectTailscale(db), authorization_url: output.match(/https:\/\/login\.tailscale\.com\/\S+/u)?.[0] ?? null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const combined = `${detail} ${(error as { stdout?: string; stderr?: string }).stdout ?? ''} ${(error as { stderr?: string }).stderr ?? ''}`;
    return {
      ...detectTailscale(db),
      authorization_url: combined.match(/https:\/\/login\.tailscale\.com\/\S+/u)?.[0] ?? null,
      error: combined.trim(),
    };
  }
}
