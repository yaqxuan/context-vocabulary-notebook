import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProductionApp } from './startup.js';

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
const app = createProductionApp();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
