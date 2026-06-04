import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const installScript = path.join(repoRoot, 'scripts/install.sh');
const repoUrl = 'https://github.com/yaqxuan/context-vocabulary-notebook.git';

function writeExecutable(filePath: string, content: string) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function createTooling(tempRoot: string) {
  const binDir = path.join(tempRoot, 'bin');
  const logPath = path.join(tempRoot, 'commands.log');
  fs.mkdirSync(binDir);

  writeExecutable(path.join(binDir, 'git'), `#!/usr/bin/env bash
printf 'git %s\\n' "$*" >> ${JSON.stringify(logPath)}
if [ "$1" = "--version" ]; then echo 'git version 2.43.0'; exit 0; fi
if [ "$1" = "-C" ] && [ "$3" = "pull" ]; then exit 0; fi
if [ "$1" = "clone" ]; then target="$3"; mkdir -p "$target/.git"; printf 'PORT=3107\\n' > "$target/.env.example"; printf '{"name":"context-vocabulary-notebook","scripts":{"build":"echo build"}}\\n' > "$target/package.json"; printf '{"lockfileVersion":3}\\n' > "$target/package-lock.json"; exit 0; fi
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

  return { binDir, logPath };
}

function runInstall(cwd: string, binDir: string, extraEnv: Record<string, string> = {}) {
  return execFileSync('bash', [installScript], {
    cwd,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      CVN_HOME: '',
      ...extraEnv,
    },
    stdio: 'pipe',
  }).toString();
}

describe('install.sh path selection', () => {
  it('clones into the current empty directory by default', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-install-'));
    const installDir = path.join(tempRoot, 'empty-install');
    fs.mkdirSync(installDir);
    const { binDir, logPath } = createTooling(tempRoot);

    runInstall(installDir, binDir);

    const commands = fs.readFileSync(logPath, 'utf8');
    expect(commands).toContain(`git clone ${repoUrl} .`);
    expect(fs.existsSync(path.join(installDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'context-vocabulary-notebook'))).toBe(false);
  });

  it('updates the current directory instead of nesting when run inside this project repo', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-install-'));
    const projectDir = path.join(tempRoot, 'context-vocabulary-notebook');
    fs.mkdirSync(path.join(projectDir, '.git'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.env.example'), 'PORT=3107\n');
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{"name":"context-vocabulary-notebook","scripts":{"build":"echo build"}}\n');
    fs.writeFileSync(path.join(projectDir, 'package-lock.json'), '{"lockfileVersion":3}\n');
    const { binDir, logPath } = createTooling(tempRoot);

    runInstall(projectDir, binDir);

    const commands = fs.readFileSync(logPath, 'utf8');
    expect(commands).toContain(`git -C ${projectDir} pull --ff-only`);
    expect(commands).not.toContain('git clone');
    expect(fs.existsSync(path.join(projectDir, 'context-vocabulary-notebook'))).toBe(false);
  });

  it('refuses to install into a non-empty non-project directory by default', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-install-'));
    const occupiedDir = path.join(tempRoot, 'occupied');
    fs.mkdirSync(occupiedDir);
    fs.writeFileSync(path.join(occupiedDir, 'notes.txt'), 'personal file\n');
    const { binDir, logPath } = createTooling(tempRoot);

    let output = '';
    try {
      runInstall(occupiedDir, binDir);
    } catch (error) {
      output = Buffer.concat([
        (error as { stdout?: Buffer }).stdout ?? Buffer.from(''),
        (error as { stderr?: Buffer }).stderr ?? Buffer.from(''),
      ]).toString();
    }

    expect(output).toContain('当前目录不是空目录');
    const commands = fs.readFileSync(logPath, 'utf8');
    expect(commands).not.toContain('git clone');
  });
});
