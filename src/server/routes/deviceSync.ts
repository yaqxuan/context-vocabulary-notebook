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

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

export function deviceSyncRouter(db: Database): Router {
  const router = Router();

  router.get('/status', asyncRoute(async (_req, res) => {
    const config = db.prepare('SELECT server_id, tailscale_url FROM sync_server_config WHERE id = 1').get();
    const pairing_requests = db.prepare(`
      SELECT session_id, status, requested_device_id, requested_name, created_at, expires_at, approved_at
      FROM pairing_sessions
      WHERE expires_at > ?
      ORDER BY created_at DESC
    `).all(new Date().toISOString());
    res.json({ config, devices: listDevices(db), pairing_requests });
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
    res.status(201).json(createPairingSession(db));
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
