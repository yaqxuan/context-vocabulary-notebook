import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import {
  approvePairing,
  createPairingSession,
  denyPairing,
  detectTailscale,
  listDevices,
  revokeDevice,
  setTailscaleUrl,
} from '../domain/deviceSync.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';
import { ensureLanIdentity, signedConnectionProfile } from '../domain/lanIdentity.js';
import { detectWslNetwork } from '../domain/networkDiagnostics.js';

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

export function deviceSyncRouter(db: Database, identityDir: string): Router {
  const router = Router();

  router.get('/status', asyncRoute(async (_req, res) => {
    const config = db.prepare(`
      SELECT server_id, tailscale_url, lan_enabled, lan_port, lan_fingerprint, lan_public_key, lan_service_name
      FROM sync_server_config WHERE id = 1
    `).get();
    const pairing_requests = db.prepare(`
      SELECT session_id, status, requested_device_id, requested_name, created_at, expires_at, approved_at
      FROM pairing_sessions
      WHERE expires_at > ?
      ORDER BY created_at DESC
    `).all(new Date().toISOString());
    const port = (config as { lan_port: number }).lan_port;
    res.json({ config, devices: listDevices(db), pairing_requests, wsl: detectWslNetwork(port) });
  }));

  router.get('/tailscale', asyncRoute(async (_req, res) => {
    res.json(detectTailscale(db));
  }));

  router.patch('/tailscale', asyncRoute(async (req, res) => {
    const value = (req.body as Record<string, unknown>).tailscale_url;
    if (value !== null && typeof value !== 'string') throw new BadRequestError('tailscale_url must be a string or null');
    setTailscaleUrl(db, value as string | null);
    res.json(detectTailscale(db));
  }));

  router.post('/pairing-sessions', asyncRoute(async (_req, res) => {
    await ensureLanIdentity(db, identityDir);
    res.status(201).json(createPairingSession(db));
  }));

  router.patch('/lan', asyncRoute(async (req, res) => {
    const enabled = (req.body as Record<string, unknown>).enabled;
    if (typeof enabled !== 'boolean') throw new BadRequestError('enabled must be a boolean');
    if (enabled) await ensureLanIdentity(db, identityDir);
    db.prepare('UPDATE sync_server_config SET lan_enabled = ?, updated_at = ? WHERE id = 1')
      .run(enabled ? 1 : 0, new Date().toISOString());
    res.json({ enabled, restart_required: true });
  }));

  router.get('/connection-profile', asyncRoute(async (_req, res) => {
    const identity = await ensureLanIdentity(db, identityDir);
    res.json(signedConnectionProfile(db, identity));
  }));

  router.post('/pairing-sessions/:sessionId/approve', asyncRoute(async (req, res) => {
    res.json(approvePairing(db, paramStr(req.params.sessionId)));
  }));

  router.post('/pairing-sessions/:sessionId/deny', asyncRoute(async (req, res) => {
    denyPairing(db, paramStr(req.params.sessionId));
    res.status(204).end();
  }));

  router.delete('/devices/:deviceId', asyncRoute(async (req, res) => {
    revokeDevice(db, paramStr(req.params.deviceId));
    res.status(204).end();
  }));

  return router;
}
