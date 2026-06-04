import { spawn } from 'node:child_process';

const npmEntrypoint = process.env.npm_execpath;
const npmCommand = npmEntrypoint ? process.execPath : 'npm';
const npmArgs = npmEntrypoint ? [npmEntrypoint] : [];
const spawnOptions = {
  stdio: 'inherit',
  shell: !npmEntrypoint && process.platform === 'win32'
};

const commands = [
  [npmCommand, [...npmArgs, 'run', 'dev:server']],
  [npmCommand, [...npmArgs, 'run', 'dev:client']]
];

const children = commands.map(([command, args]) => {
  const child = spawn(command, args, spawnOptions);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
      stop();
    }
  });
  return child;
});

const stop = () => {
  for (const child of children) {
    child.kill('SIGTERM');
  }
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
