import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const devScript = path.join(repoRoot, 'scripts/dev.mjs');

function readDevScript() {
  return fs.readFileSync(devScript, 'utf8');
}

describe('dev.mjs Windows command spawning', () => {
  it('uses npm.cmd on Windows when spawning npm scripts', () => {
    const script = readDevScript();

    expect(script).toContain('process.platform === \'win32\'');
    expect(script).toContain('npm.cmd');
    expect(script).toContain("[npmCommand, ['run', 'dev:server']]");
    expect(script).toContain("[npmCommand, ['run', 'dev:client']]");
  });
});
