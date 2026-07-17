import fs from 'node:fs';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Database } from 'better-sqlite3';
import {
  SYNC_PROTOCOL_VERSION,
  type SyncCardActionInput,
  type SyncReviewEventInput,
} from '../shared/sync.js';
import { authenticateDevice, pairingStatus, requestPairing } from './domain/deviceSync.js';
import {
  SyncEventConflictError,
  SyncSequenceGapError,
  acknowledgeSnapshot,
  applyCardActionBatch,
  applyReviewEventBatch,
  buildSyncSnapshot,
  resolveDerivedAudioPath,
} from './domain/sync.js';
import { asyncRoute } from './http/asyncRoute.js';
import {
  BadRequestError,
  ConflictError,
  HttpError,
  UnauthorizedError,
  UpgradeRequiredError,
  makeErrorBody,
} from './http/errors.js';
import { resolveUploadPath } from './storage/uploads.js';

function requireProtocol(req: Request, _res: Response, next: NextFunction): void {
  if (req.header('X-CVN-Protocol') !== String(SYNC_PROTOCOL_VERSION)) {
    next(new UpgradeRequiredError(`Sync protocol ${SYNC_PROTOCOL_VERSION} is required`));
    return;
  }
  next();
}

function syncAuth(db: Database) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authorization = req.header('Authorization');
    if (!authorization?.startsWith('Bearer ') || authorization.length <= 7) {
      next(new UnauthorizedError());
      return;
    }
    try {
      res.locals.syncDevice = authenticateDevice(db, authorization.slice(7));
      next();
    } catch (error) {
      next(error);
    }
  };
}

function asSyncHttpError(error: unknown): never {
  if (error instanceof SyncSequenceGapError) throw new ConflictError(error.message);
  if (error instanceof SyncEventConflictError) throw new BadRequestError(error.message);
  throw error;
}

export function createSyncApp(
  db: Database,
  uploadsDir: string,
  options: { allowRemoteAddress?: (address: string | undefined) => boolean } = {},
): express.Express {
  const app = express();
  app.disable('x-powered-by');
  if (options.allowRemoteAddress) {
    app.use((req, res, next) => {
      if (!options.allowRemoteAddress!(req.socket.remoteAddress)) {
        res.status(403).json({ error: 'LAN source is not allowed', message: 'LAN source is not allowed' });
        return;
      }
      next();
    });
  }
  app.use(express.json({ limit: '1mb' }));

  app.get('/v1/capabilities', (_req, res) => {
    const server = db.prepare('SELECT server_id FROM sync_server_config WHERE id = 1').get() as { server_id: string };
    res.json({
      protocol_version: SYNC_PROTOCOL_VERSION,
      server_id: server.server_id,
      server_time: new Date().toISOString(),
      minimum_client_version: '0.3.0-alpha',
    });
  });

  app.post('/v1/pair', requireProtocol, asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    if (typeof body.session_id !== 'string' || typeof body.secret !== 'string' || typeof body.device_id !== 'string' || typeof body.device_name !== 'string') {
      throw new BadRequestError('session_id, secret, device_id, and device_name are required');
    }
    res.status(202).json(requestPairing(db, body.session_id, body.secret, body.device_id, body.device_name));
  }));

  app.get('/v1/pair/:sessionId/status', requireProtocol, asyncRoute(async (req, res) => {
    const secret = req.header('X-Pairing-Secret');
    if (!secret) throw new UnauthorizedError('Pairing secret is required');
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0]! : req.params.sessionId;
    res.json(pairingStatus(db, sessionId, secret));
  }));

  app.use('/v1', requireProtocol, syncAuth(db));

  app.post('/v1/events', asyncRoute(async (req, res) => {
    const body = req.body as { events?: unknown };
    if (!Array.isArray(body.events)) throw new BadRequestError('events must be an array');
    try {
      res.json(applyReviewEventBatch(db, res.locals.syncDevice.device_id as string, body.events as SyncReviewEventInput[]));
    } catch (error) {
      asSyncHttpError(error);
    }
  }));

  app.post('/v1/card-actions', asyncRoute(async (req, res) => {
    const body = req.body as { actions?: unknown };
    if (!Array.isArray(body.actions)) throw new BadRequestError('actions must be an array');
    try {
      res.json(applyCardActionBatch(
        db,
        res.locals.syncDevice.device_id as string,
        body.actions as SyncCardActionInput[],
      ));
    } catch (error) {
      asSyncHttpError(error);
    }
  }));

  app.get('/v1/snapshot', asyncRoute(async (req, res) => {
    const rawRevision = req.query.known_revision;
    let knownRevision: number | undefined;
    if (rawRevision !== undefined) {
      knownRevision = Number(Array.isArray(rawRevision) ? rawRevision[0] : rawRevision);
      if (!Number.isSafeInteger(knownRevision) || knownRevision < 0) throw new BadRequestError('known_revision must be a non-negative integer');
    }
    const snapshot = buildSyncSnapshot(db, uploadsDir, knownRevision);
    if (!snapshot) {
      res.status(204).end();
      return;
    }
    res.json(snapshot);
  }));

  app.post('/v1/snapshot/:revision/ack', asyncRoute(async (req, res) => {
    const revision = Number(Array.isArray(req.params.revision) ? req.params.revision[0] : req.params.revision);
    try {
      acknowledgeSnapshot(db, res.locals.syncDevice.device_id as string, revision);
      res.status(204).end();
    } catch (error) {
      asSyncHttpError(error);
    }
  }));

  app.get('/v1/media/:sha256', asyncRoute(async (req, res) => {
    const sha256 = Array.isArray(req.params.sha256) ? req.params.sha256[0]! : req.params.sha256;
    if (!/^[a-f0-9]{64}$/u.test(sha256)) throw new BadRequestError('Invalid media hash');
    const media = db.prepare(`
      SELECT file_name, mime_type FROM media_files
      WHERE sha256 = ? AND deleted_at IS NULL AND is_available = 1 AND media_type IN ('image', 'audio', 'video')
      ORDER BY id LIMIT 1
    `).get(sha256) as { file_name: string; mime_type: string } | undefined;
    const derivedPath = media ? null : resolveDerivedAudioPath(uploadsDir, sha256);
    if (!media && !derivedPath) {
      res.status(404).json({ error: 'Media not found', message: 'Media not found' });
      return;
    }
    const filePath = media ? resolveUploadPath(uploadsDir, media.file_name) : derivedPath!;
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.status(404).json({ error: 'Media not found', message: 'Media not found' });
      return;
    }
    res.type(media?.mime_type ?? 'audio/mp4');
    // Derived audio is kept in the private `.cvn-sync-audio` cache directory.
    // Express ignores dot-directories by default, so explicitly allow this exact,
    // hash-addressed path after it has been resolved and validated above.
    res.sendFile(filePath, { dotfiles: 'allow' });
  }));

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json(makeErrorBody(error));
      return;
    }
    res.status(500).json({ error: 'Internal sync error', message: 'Internal sync error' });
  });
  return app;
}
