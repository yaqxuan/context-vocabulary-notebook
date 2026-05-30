import { spawn } from 'node:child_process';

const commands = [
  ['npm', ['run', 'dev:server']],
  ['npm', ['run', 'dev:client']]
];

const children = commands.map(([command, args]) => {
  const child = spawn(command, args, { stdio: 'inherit' });
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
