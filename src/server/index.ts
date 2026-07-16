import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProductionApp } from './startup.js';
import { getDb } from './db/connection.js';
import { createSyncApp } from './syncApp.js';
import { startLanSyncServer } from './lanServer.js';

function findProjectRoot(startDir: string): string {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}

function loadEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) return;
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/u, '$2');
    process.env[key] ??= value;
  }
}

const projectRoot = findProjectRoot(path.dirname(fileURLToPath(import.meta.url)));
loadEnvFile(path.join(projectRoot, '.env'));

const port = Number(process.env.PORT ?? 3107);
const host = process.env.HOST ?? '127.0.0.1';
const app = createProductionApp();

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

if (process.env.CVN_DEVICE_SYNC !== '0') {
  const syncPort = Number(process.env.SYNC_PORT ?? 3108);
  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
  createSyncApp(getDb(), uploadsDir).listen(syncPort, '127.0.0.1', () => {
    console.log(`Device sync listening on http://127.0.0.1:${syncPort}`);
  });
  if (process.env.CVN_LAN_SYNC === '1') {
    getDb().prepare('UPDATE sync_server_config SET lan_enabled = 1, updated_at = ? WHERE id = 1').run(new Date().toISOString());
  }
  const lanConfig = getDb().prepare('SELECT lan_enabled, lan_port FROM sync_server_config WHERE id = 1').get() as { lan_enabled: number; lan_port: number };
  if (process.env.CVN_LAN_SYNC === '1' || lanConfig.lan_enabled === 1) {
    const lanPort = Number(process.env.LAN_SYNC_PORT ?? lanConfig.lan_port);
    const identityDir = path.resolve(process.cwd(), process.env.SYNC_IDENTITY_DIR ?? 'data/sync-identity');
    void startLanSyncServer({ db: getDb(), uploadsDir, identityDir, port: lanPort })
      .then(() => console.log(`LAN device sync listening on https://[::]:${lanPort}`))
      .catch((error: unknown) => console.error('Failed to start LAN device sync:', error));
  }
}
