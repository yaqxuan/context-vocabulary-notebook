import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const devScript = path.join(repoRoot, 'scripts/dev.mjs');

function readDevScript() {
  return fs.readFileSync(devScript, 'utf8');
}

describe('dev.mjs npm command spawning', () => {
  it('uses the current Node executable and npm CLI entrypoint inside npm lifecycle scripts', () => {
    const script = readDevScript();

    expect(script).toContain('process.env.npm_execpath');
    expect(script).toContain('process.execPath');
    expect(script).toContain("[npmCommand, [...npmArgs, 'run', 'dev:server']]");
    expect(script).toContain("[npmCommand, [...npmArgs, 'run', 'dev:client']]");
    expect(script).not.toContain('npm.cmd');
  });
});
