import fs from 'node:fs';
import path from 'node:path';

import type { Express } from 'express';

import { createApp } from './app.js';
import { initConnection } from './db/connection.js';
import { initDb } from './db/init.js';

const DEFAULT_DATABASE_PATH = path.resolve(process.cwd(), 'data/context-vocabulary-notebook.sqlite');
const DEFAULT_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

function resolveLocalPath(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return path.resolve(process.cwd(), value);
}

export function createProductionApp(): Express {
  const databasePath = process.env.DATABASE_PATH === ':memory:'
    ? ':memory:'
    : resolveLocalPath(process.env.DATABASE_PATH, DEFAULT_DATABASE_PATH);
  const uploadsDir = resolveLocalPath(process.env.UPLOADS_DIR, DEFAULT_UPLOADS_DIR);

  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = initConnection(databasePath);
  initDb(db);
  return createApp(db, { uploadsDir });
}
