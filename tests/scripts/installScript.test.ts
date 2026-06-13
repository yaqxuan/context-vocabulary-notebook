import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const installScript = path.join(repoRoot, 'scripts/install.sh');
const powerShellInstallScript = path.join(repoRoot, 'scripts/install.ps1');
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

function readPowerShellInstallScript() {
  return fs.readFileSync(powerShellInstallScript, 'utf8');
}

function functionBody(script: string, name: string) {
  const start = script.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const nextFunction = script.indexOf('\nfunction ', start + 1);
  return script.slice(start, nextFunction === -1 ? script.length : nextFunction);
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

    expect(output).toContain('The target directory is not empty');
    const commands = fs.readFileSync(logPath, 'utf8');
    expect(commands).not.toContain('git clone');
  });
});

describe('README current behavior docs', () => {
  it('documents current local OCR/STT and AI suggestion behavior', () => {
    const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
    const englishReadme = fs.readFileSync(path.join(repoRoot, 'README.en.md'), 'utf8');
    const envExample = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');

    expect(readme).toContain('整句翻译');
    expect(readme).toContain('词形还原');
    expect(readme).toContain('拼写检查');
    expect(readme).toContain('WSL 通常最稳');
    expect(readme).toContain('Windows 原生 PowerShell 可以安装');
    expect(readme).toContain('STT 需要单独安装 whisper.cpp');
    expect(englishReadme).toContain('Local Clip Recognition (OCR / STT)');
    expect(englishReadme).toContain('whisper.cpp');
    expect(englishReadme).toContain('Tesseract');
    expect(englishReadme).not.toContain('/audio/transcriptions');
    expect(englishReadme).not.toContain('TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES');
    expect(envExample).toContain('CVN_WHISPER_CPP_MODEL');
    expect(envExample).toContain('CVN_TESSERACT_LANG');
  });
});

describe('install.ps1 installer safeguards', () => {
  it('only requires winget when a missing dependency must be installed', () => {
    const script = readPowerShellInstallScript();
    const ensureEnvironment = functionBody(script, 'Ensure-Environment');

    const meaningfulLines = ensureEnvironment.split('\n').map((line) => line.trim()).filter(Boolean);

    expect(ensureEnvironment).toContain('if (-not (Has-Command "git"))');
    expect(ensureEnvironment).toContain('Ensure-Winget');
    expect(ensureEnvironment.indexOf('if (-not (Has-Command "git"))')).toBeLessThan(ensureEnvironment.indexOf('Ensure-Winget'));
    expect(meaningfulLines[1]).toBe('if (-not (Has-Command "git")) {');
  });

  it('preserves process-scoped PATH entries when refreshing installed tool locations', () => {
    const refreshPath = functionBody(readPowerShellInstallScript(), 'Refresh-Path');

    expect(refreshPath).toContain('$CurrentPath = $env:Path');
    expect(refreshPath).toContain('$CurrentPath');
    expect(refreshPath).not.toContain('$env:Path = $MachinePath + ";" + $UserPath');
  });

  it('uses literal path operations for user-selected install directories', () => {
    const script = readPowerShellInstallScript();
    const projectDir = functionBody(script, 'Test-ProjectDir');
    const installProject = functionBody(script, 'Install-Project');

    expect(projectDir).toContain('-LiteralPath');
    expect(installProject).toContain('[System.IO.Directory]::CreateDirectory($InstallDir)');
    expect(installProject).toContain('Push-Location -LiteralPath $InstallDir');
    expect(installProject).toContain('Set-Location -LiteralPath $InstallDir');
  });

  it('does not block on Visual Studio Build Tools before trying npm install', () => {
    const ensureEnvironment = functionBody(readPowerShellInstallScript(), 'Ensure-Environment');

    expect(ensureEnvironment).not.toContain('Install-WindowsNativeBuildTools');
    expect(ensureEnvironment).not.toContain('Visual Studio Build Tools');
  });

  it('installs Windows native build tools and retries npm install after native dependency failure', () => {
    const script = readPowerShellInstallScript();
    const invokeNpmCi = functionBody(script, 'Invoke-NpmCi');
    const installProject = functionBody(script, 'Install-Project');
    const installNativeBuildTools = functionBody(script, 'Install-WindowsNativeBuildTools');
    const nativeBuildFailureCheck = functionBody(script, 'Test-NpmNativeBuildFailure');

    expect(invokeNpmCi).toContain('cmd.exe');
    expect(invokeNpmCi).toContain('npm ci >');
    expect(invokeNpmCi).not.toContain('2>&1 | Tee-Object');
    expect(invokeNpmCi).not.toContain('> $script:LastNpmCiLog 2>&1');
    expect(installProject).toContain('if (-not (Invoke-NpmCi))');
    expect(installProject).toContain('if (Test-NpmNativeBuildFailure)');
    expect(installProject).toContain('Install-WindowsNativeBuildTools');
    expect(installProject).toContain('Retrying npm ci after installing native build tools');
    expect(installProject).toContain('if (-not (Invoke-NpmCi))');
    expect(nativeBuildFailureCheck).toContain('better-sqlite3');
    expect(nativeBuildFailureCheck).toContain('node-gyp');
    const pythonAvailableCheck = functionBody(script, 'Test-PythonAvailable');
    const vsWherePath = functionBody(script, 'Get-VSWherePath');
    const vcToolsAvailableCheck = functionBody(script, 'Test-VCToolsAvailable');

    expect(nativeBuildFailureCheck).toContain('gyp ERR! find VS');
    expect(pythonAvailableCheck).toContain('python --version');
    expect(vsWherePath).toContain('vswhere.exe');
    expect(vcToolsAvailableCheck).toContain('Microsoft.VisualStudio.Component.VC.Tools.x86.x64');
    expect(installNativeBuildTools).toContain('setup.exe');
    expect(installNativeBuildTools).toContain('modify');
    expect(installNativeBuildTools).toContain('Microsoft.VisualStudio.Workload.VCTools');
    expect(installNativeBuildTools).toContain('if (-not (Test-VCToolsAvailable))');
    expect(installNativeBuildTools).toContain('Visual Studio Build Tools was installed or modified, but MSVC C++ tools are still unavailable');
    expect(installNativeBuildTools).toContain('if (-not (Test-PythonAvailable))');
    expect(installNativeBuildTools).not.toContain('if (-not (Has-Command "python"))');
    expect(installNativeBuildTools).toContain('if (Test-VCToolsAvailable)');
    expect(installNativeBuildTools).toContain('Visual Studio Build Tools with MSVC C++ tools already found');
    expect(installNativeBuildTools).toContain('Microsoft.VisualStudio.2022.BuildTools');
    expect(installNativeBuildTools).toContain('Microsoft.VisualStudio.Workload.VCTools');
    expect(installNativeBuildTools).toContain('Refresh-Path');
  });

  it('installs directly into the current PowerShell location in examples', () => {
    const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
    const installProject = functionBody(readPowerShellInstallScript(), 'Install-Project');

    expect(readme).not.toContain('$HOME\\context-vocabulary-notebook');
    expect(readme).not.toContain('.\\context-vocabulary-notebook');
    expect(readme).not.toContain('Read-Host');
    expect(readme).not.toContain('$ErrorActionPreference = "Stop"');
    expect(readme).not.toContain('$InstallDir = (Get-Location).Path');
    expect(readme).toContain('irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex');
    expect(readme).toContain('$env:CVN_HOME = "C:\\path\\to\\empty-folder"');
    expect(installProject).not.toContain('$HOME\\context-vocabulary-notebook');
    expect(installProject).not.toContain('.\\context-vocabulary-notebook');
    expect(installProject).not.toContain('Read-Host');
    expect(installProject).toContain('`$InstallDir = "C:\\path\\to\\empty-folder"');
    expect(installProject).toContain('Set-Location `$InstallDir');
  });
});
