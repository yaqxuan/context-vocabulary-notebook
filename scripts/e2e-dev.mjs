import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'cvn-e2e-'));
mkdirSync(path.join(tmpDir, 'uploads'), { recursive: true });

const env = {
  ...process.env,
  CLIENT_PORT: process.env.CLIENT_PORT ?? '5174',
  DATABASE_PATH: path.join(tmpDir, 'context-vocabulary-notebook.sqlite'),
  UPLOADS_DIR: path.join(tmpDir, 'uploads'),
  PORT: process.env.PORT ?? '3108',
};

const commands = [
  [process.execPath, ['node_modules/tsx/dist/cli.mjs', 'watch', 'src/server/index.ts']],
  [process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0']],
];

let stopping = false;

function cleanup() {
  rmSync(tmpDir, { recursive: true, force: true });
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => {
    cleanup();
    process.exit(code);
  }, 500);
}

const children = commands.map(([command, args]) => {
  const child = spawn(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    if (!stopping && code && code !== 0) stop(code);
  });
  return child;
});

process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(0));
process.on('exit', cleanup);
