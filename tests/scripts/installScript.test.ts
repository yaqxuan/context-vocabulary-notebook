import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const installScript = path.join(repoRoot, 'scripts/install.sh');

function writeExecutable(filePath: string, content: string) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

describe('install.sh path selection', () => {
  it('updates the current directory instead of nesting when run inside this project repo', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-install-'));
    const projectDir = path.join(tempRoot, 'context-vocabulary-notebook');
    const binDir = path.join(tempRoot, 'bin');
    const logPath = path.join(tempRoot, 'commands.log');

    fs.mkdirSync(path.join(projectDir, '.git'), { recursive: true });
    fs.mkdirSync(binDir);
    fs.writeFileSync(path.join(projectDir, '.env.example'), 'PORT=3107\n');
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{"name":"context-vocabulary-notebook","scripts":{"build":"echo build"}}\n');
    fs.writeFileSync(path.join(projectDir, 'package-lock.json'), '{"lockfileVersion":3}\n');

    writeExecutable(path.join(binDir, 'git'), `#!/usr/bin/env bash
printf 'git %s\\n' "$*" >> ${JSON.stringify(logPath)}
if [ "$1" = "--version" ]; then echo 'git version 2.43.0'; exit 0; fi
if [ "$1" = "-C" ] && [ "$3" = "pull" ]; then exit 0; fi
if [ "$1" = "clone" ]; then mkdir -p "$3/.git"; printf 'PORT=3107\\n' > "$3/.env.example"; printf '{"scripts":{"build":"echo build"}}\\n' > "$3/package.json"; printf '{"lockfileVersion":3}\\n' > "$3/package-lock.json"; exit 0; fi
exit 0
`);
    writeExecutable(path.join(binDir, 'node'), `#!/usr/bin/env bash
if [ "$1" = "-p" ]; then echo 22; else echo 'v22.0.0'; fi
`);
    writeExecutable(path.join(binDir, 'npm'), `#!/usr/bin/env bash
printf 'npm %s\\n' "$*" >> ${JSON.stringify(logPath)}
if [ "$1" = "--version" ]; then echo '10.0.0'; exit 0; fi
exit 0
`);

    execFileSync('bash', [installScript], {
      cwd: projectDir,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
        CVN_HOME: '',
      },
      stdio: 'pipe',
    });

    const commands = fs.readFileSync(logPath, 'utf8');
    expect(commands).toContain(`git -C ${projectDir} pull --ff-only`);
    expect(commands).not.toContain('git clone');
    expect(fs.existsSync(path.join(projectDir, 'context-vocabulary-notebook'))).toBe(false);
  });
});
