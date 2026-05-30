import express from 'express';
import path from 'node:path';
import type { Database } from 'better-sqlite3';
import { cardsRouter } from './routes/cards.js';
import { contextsRouter } from './routes/contexts.js';
import { tagsRouter } from './routes/tags.js';
import { mediaRouter } from './routes/media.js';
import { reviewRouter } from './routes/review.js';
import { settingsRouter } from './routes/settings.js';
import { statisticsRouter } from './routes/statistics.js';
import { ensureUploadsDir, resolveUploadPath } from './storage/uploads.js';
import { BadRequestError } from './http/errors.js';

export interface AppOptions {
  uploadsDir?: string;
}

const DEFAULT_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export function createApp(db: Database, options: AppOptions = {}): express.Express {
  const uploadsDir = options.uploadsDir ?? DEFAULT_UPLOADS_DIR;
  ensureUploadsDir(uploadsDir);

  const application = express();
  application.use(express.json());

  // Health check
  application.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  // Serve uploaded files - path traversal guard via resolveUploadPath
  application.get('/uploads/:fileName', (req, res) => {
    const fileName = req.params.fileName;

    // Reject obvious traversal attempts in the parameter itself
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      res.status(400).json({ error: 'Invalid file name' });
      return;
    }

    try {
      const filePath = resolveUploadPath(uploadsDir, fileName);
      res.sendFile(filePath, (err) => {
        if (err) {
          res.status(404).json({ error: 'File not found' });
        }
      });
    } catch {
      res.status(400).json({ error: 'Invalid file name' });
    }
  });

  // API routes
  application.use('/api/cards', cardsRouter(db));
  application.use('/api', contextsRouter(db));
  application.use('/api/tags', tagsRouter(db));
  application.use('/api/media', mediaRouter(db, uploadsDir));
  application.use('/api/review', reviewRouter(db));
  application.use('/api/settings', settingsRouter(db));
  application.use('/api/statistics', statisticsRouter(db));

  return application;
}

// Default singleton app used by the production server entry point.
// It uses the real DB connection established in index.ts at startup.
// Routes are wired lazily here by creating the app without a db,
// so the production entry point calls createApp(getDb()) after initConnection.
// For backwards compatibility we export a placeholder that index.ts replaces.

// Note: index.ts imports this module and calls createApp(db) directly.
// We still export `app` as a pre-wired instance only for the health test
// which does not need db. The health route is db-free so this works.
import { getDb } from './db/connection.js';

let _cachedApp: express.Express | null = null;

export function getOrCreateApp(): express.Express {
  if (_cachedApp) return _cachedApp;
  try {
    const db = getDb();
    _cachedApp = createApp(db);
  } catch {
    // DB not yet initialised (e.g., during tests that use createApp directly).
    // Fall back to a minimal app with just the health route.
    const fallback = express();
    fallback.use(express.json());
    fallback.get('/api/health', (_req, res) => res.json({ ok: true }));
    return fallback;
  }
  return _cachedApp!;
}

export const app = getOrCreateApp();
