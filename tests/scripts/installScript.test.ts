import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const installScript = path.join(repoRoot, 'scripts/install.sh');
const powerShellInstallScript = path.join(repoRoot, 'scripts/install.ps1');
const recognitionInstallScript = path.join(repoRoot, 'scripts/install-recognition.sh');
const powerShellRecognitionInstallScript = path.join(repoRoot, 'scripts/install-recognition-windows.ps1');
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

function createRecognitionTooling(tempRoot: string) {
  const binDir = path.join(tempRoot, 'bin');
  const logPath = path.join(tempRoot, 'recognition-commands.log');
  fs.mkdirSync(binDir);

  writeExecutable(path.join(binDir, 'git'), `#!/usr/bin/env bash
printf 'git %s\\n' "$*" >> ${JSON.stringify(logPath)}
if [ "$1" = "clone" ]; then target="$3"; mkdir -p "$target/.git"; exit 0; fi
if [ "$1" = "-C" ] && [ "$3" = "pull" ]; then exit 0; fi
exit 0
`);
  writeExecutable(path.join(binDir, 'cmake'), `#!/usr/bin/env bash
printf 'cmake %s\\n' "$*" >> ${JSON.stringify(logPath)}
if [ "$1" = "--build" ]; then mkdir -p "$2/bin"; printf '#!/usr/bin/env bash\\necho whisper.cpp help\\n' > "$2/bin/whisper-cli"; chmod +x "$2/bin/whisper-cli"; fi
exit 0
`);
  writeExecutable(path.join(binDir, 'curl'), `#!/usr/bin/env bash
printf 'curl %s\\n' "$*" >> ${JSON.stringify(logPath)}
out=''
while [ "$#" -gt 0 ]; do
  if [ "$1" = "-o" ]; then shift; out="$1"; fi
  shift || true
done
if [ -n "$out" ]; then mkdir -p "$(dirname "$out")"; printf 'model' > "$out"; fi
exit 0
`);
  writeExecutable(path.join(binDir, 'ffmpeg'), `#!/usr/bin/env bash
echo 'ffmpeg version stub'
`);
  writeExecutable(path.join(binDir, 'tesseract'), `#!/usr/bin/env bash
echo 'tesseract 5.5.0'
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

function runRecognitionInstall(cwd: string, binDir: string, extraEnv: Record<string, string> = {}) {
  return execFileSync('bash', [recognitionInstallScript], {
    cwd,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      CVN_SKIP_SYSTEM_PACKAGES: '1',
      ...extraEnv,
    },
    stdio: 'pipe',
  }).toString();
}

function readPowerShellInstallScript() {
  return fs.readFileSync(powerShellInstallScript, 'utf8');
}

function readPowerShellRecognitionInstallScript() {
  return fs.readFileSync(powerShellRecognitionInstallScript, 'utf8');
}

function functionBody(script: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = script.match(new RegExp(`function ${escapedName}(?:\\s|\\()`));
  expect(match?.index ?? -1).toBeGreaterThanOrEqual(0);
  const start = match!.index!;
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

describe('install-recognition.sh installer', () => {
  it('refuses to install recognition tooling outside this project', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-recognition-'));
    fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"name":"other-project"}\n');
    const { binDir } = createRecognitionTooling(tempRoot);

    let output = '';
    try {
      runRecognitionInstall(tempRoot, binDir);
    } catch (error) {
      output = Buffer.concat([
        (error as { stdout?: Buffer }).stdout ?? Buffer.from(''),
        (error as { stderr?: Buffer }).stderr ?? Buffer.from(''),
      ]).toString();
    }

    expect(output).toContain('context-vocabulary-notebook');
    expect(output).toContain('package.json');
  });

  it('updates existing CVN recognition keys in .env instead of duplicating them', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-recognition-'));
    fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"name":"context-vocabulary-notebook"}\n');
    fs.writeFileSync(path.join(tempRoot, '.env'), [
      'PORT=3107',
      'CVN_STT_PROVIDER=old',
      'CVN_WHISPER_CPP_MODEL=/old/model.bin',
      'OTHER_KEY=keep',
      '',
    ].join('\n'));
    const { binDir } = createRecognitionTooling(tempRoot);

    runRecognitionInstall(tempRoot, binDir, { CVN_TESSERACT_LANG: 'jpn' });
    runRecognitionInstall(tempRoot, binDir, { CVN_TESSERACT_LANG: 'jpn' });

    const envFile = fs.readFileSync(path.join(tempRoot, '.env'), 'utf8');
    expect(envFile.match(/^CVN_STT_PROVIDER=/gm)).toHaveLength(1);
    expect(envFile.match(/^CVN_TESSERACT_LANG=/gm)).toHaveLength(1);
    expect(envFile.match(/^CVN_WHISPER_CPP_MODEL=/gm)).toHaveLength(1);
    expect(envFile.match(/^CVN_WHISPER_CPP_PATH=/gm)).toHaveLength(1);
    expect(envFile).toContain('PORT=3107');
    expect(envFile).toContain('OTHER_KEY=keep');
    expect(envFile).toContain('CVN_STT_PROVIDER=whisper.cpp');
    expect(envFile).toContain('CVN_TESSERACT_LANG=jpn');
    expect(envFile).toContain(`CVN_WHISPER_CPP_MODEL=${path.join(tempRoot, 'models', 'ggml-small.bin')}`);
  });

  it('rejects unsafe Tesseract language codes before installing recognition tools', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-recognition-'));
    fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"name":"context-vocabulary-notebook"}\n');
    const { binDir, logPath } = createRecognitionTooling(tempRoot);

    let output = '';
    try {
      runRecognitionInstall(tempRoot, binDir, { CVN_TESSERACT_LANG: 'jpn;rm -rf /' });
    } catch (error) {
      output = Buffer.concat([
        (error as { stdout?: Buffer }).stdout ?? Buffer.from(''),
        (error as { stderr?: Buffer }).stderr ?? Buffer.from(''),
      ]).toString();
    }

    expect(output).toContain('Invalid CVN_TESSERACT_LANG');
    expect(fs.existsSync(logPath)).toBe(false);
  });

  it('uses project-local tools and models paths for Unix recognition dependencies', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-recognition-'));
    fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"name":"context-vocabulary-notebook"}\n');
    const { binDir, logPath } = createRecognitionTooling(tempRoot);

    runRecognitionInstall(tempRoot, binDir);

    const commands = fs.readFileSync(logPath, 'utf8');
    expect(commands).toContain(`git clone https://github.com/ggerganov/whisper.cpp.git ${path.join(tempRoot, 'tools', 'whisper.cpp')}`);
    expect(commands).toContain(`curl -L -o ${path.join(tempRoot, 'models', 'ggml-small.bin')}`);
    expect(fs.existsSync(path.join(tempRoot, 'tools'))).toBe(true);
    expect(fs.existsSync(path.join(tempRoot, 'models'))).toBe(true);
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

describe('install-recognition-windows.ps1 safeguards', () => {
  it('guards execution to this project directory', () => {
    const script = readPowerShellRecognitionInstallScript();

    expect(script).toContain('Test-ProjectDir');
    expect(script).toContain('package.json');
    expect(script).toContain('"name"\\s*:\\s*"context-vocabulary-notebook"');
    expect(script).toContain('throw');
  });

  it('uses project-local tools and models paths', () => {
    const script = readPowerShellRecognitionInstallScript();

    expect(script).toContain('Join-Path $AppRoot "tools"');
    expect(script).toContain('Join-Path $AppRoot "models"');
    expect(script).toContain('ffmpeg');
    expect(script).toContain('tesseract');
    expect(script).toContain('whisper.cpp');
    expect(script).toContain('ggml-small.bin');
    expect(script).toContain('-LiteralPath');
  });

  it('updates .env CVN keys instead of blindly appending duplicates', () => {
    const script = readPowerShellRecognitionInstallScript();

    expect(script).toContain('Assert-TesseractLang');
    expect(script).toContain('^[A-Za-z0-9_]+(\\+[A-Za-z0-9_]+)*$');
    expect(script).toContain('Set-EnvValue');
    expect(script).toContain('CVN_STT_PROVIDER');
    expect(script).toContain('CVN_TESSERACT_LANG');
    expect(script).toContain('traineddata');
    expect(script).toContain('CVN_WHISPER_CPP_PATH');
    expect(script).toContain('CVN_WHISPER_CPP_MODEL');
    expect(script).not.toContain('Add-Content -Encoding UTF8 .env');
  });

  it('downloads FFmpeg from a pinned direct release asset and verifies its hash', () => {
    const script = readPowerShellRecognitionInstallScript();

    expect(script).not.toContain('api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest');
    expect(script).not.toContain('Invoke-RestMethod');
    expect(script).not.toContain('releases/download/latest');
    expect(script).toContain('$FfmpegZipUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-06-14-13-33/ffmpeg-n7.1.4-39-ga5faeca88f-win64-gpl-7.1.zip"');
    expect(script).toContain('$FfmpegZipSha256 = "9bf9423be2096818d950b05748b50538a9013913ee8e26813b66172eea9b4015"');
    expect(script).toContain('$TesseractInstallerSha256 = "f3fc4236425b690c8be756f35793f77394ee004be0a6460a440c754d892f68bc"');
    expect(script).toContain('Download-File $FfmpegZipUrl $ZipPath');
    expect(script).toContain('$ProgressPreference = "SilentlyContinue"');
    expect(script).toContain('Get-Command "curl.exe" -ErrorAction SilentlyContinue');
    expect(script).toContain('--location --fail --retry 3 --retry-delay 2 --output $OutFile $Uri');
    expect(script).toContain('Download failed with curl.exe exit code $LASTEXITCODE for $Uri');
    expect(script).toContain('Invoke-WebRequest -Uri $Uri -OutFile $OutFile');
    expect(script).toContain('Assert-FileSha256 $ZipPath $FfmpegZipSha256');
    expect(script).toContain('Get-FileHash -LiteralPath $Path -Algorithm SHA256');
    expect(script).toContain('ffmpeg-n7.1.4-39-ga5faeca88f-win64-gpl-7.1.zip');
  });

  it('uses existing default Tesseract before running installer and times out installer hangs', () => {
    const script = readPowerShellRecognitionInstallScript();
    const installTesseract = functionBody(script, 'Install-Tesseract');
    const copyDefaultTesseract = functionBody(script, 'Copy-DefaultTesseractInstall');

    expect(script).toContain('$TesseractInstallerTimeoutSeconds = 180');
    expect(script).toContain('function Invoke-TesseractInstaller');
    expect(script).toContain('Start-Process -FilePath $InstallerPath -ArgumentList $ArgumentList -PassThru');
    expect(script).not.toContain('-Verb RunAs');
    expect(script).toContain('$Process.WaitForExit($TesseractInstallerTimeoutSeconds * 1000)');
    expect(script).toContain('Stop-Process -Id $Process.Id -Force');
    expect(script).toContain('Tesseract installer did not finish within $TesseractInstallerTimeoutSeconds seconds');
    expect(installTesseract.indexOf('$DefaultCopy = Copy-DefaultTesseractInstall')).toBeLessThan(installTesseract.indexOf('Download-File $TesseractInstallerUrl $InstallerPath'));
    expect(installTesseract).toContain('Assert-FileSha256 $InstallerPath $TesseractInstallerSha256');
    expect(installTesseract).toContain('$InstallExitCode = Invoke-TesseractInstaller $InstallerPath @("/S", $TesseractInstallDirArg)');
    expect(installTesseract).toContain('Tesseract installer failed with exit code $InstallExitCode');
    expect(installTesseract).not.toContain('if ($LASTEXITCODE -ne 0) { throw "Tesseract installer failed with exit code $LASTEXITCODE" }');
    expect(copyDefaultTesseract).toContain('Assert-TesseractVersion $DefaultTesseract');
    expect(copyDefaultTesseract).toContain('$DefaultInstall = "C:\\Program Files\\Tesseract-OCR"');
    expect(copyDefaultTesseract).toContain('Copy-Item -LiteralPath $DefaultTesseract -Destination (Join-Path $TesseractRoot "tesseract.exe") -Force');
    expect(copyDefaultTesseract).toContain('Get-ChildItem -LiteralPath $DefaultInstall -Filter "*.dll" -File');
    expect(copyDefaultTesseract).not.toContain('Copy-Item -Path (Join-Path $DefaultInstall "*") -Destination $TesseractRoot -Recurse -Force');
    expect(copyDefaultTesseract).toContain('$Installed = Find-FirstFile $TesseractRoot "tesseract.exe"');
    expect(copyDefaultTesseract).toContain('return $Installed.FullName');
  });

  it('downloads recognition assets idempotently before verification', () => {
    const script = readPowerShellRecognitionInstallScript();

    expect(script).toContain('Test-Path');
    expect(script).toContain('Invoke-WebRequest');
    expect(script).toContain('Expand-Archive');
    expect(script).toContain('Write-Verification');
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

    expect(ensureEnvironment).not.toContain('Has-VCTools');
    expect(ensureEnvironment).not.toContain('Visual Studio Build Tools');
  });

  it('prints Windows native-build guidance when npm install fails', () => {
    const installProject = functionBody(readPowerShellInstallScript(), 'Install-Project');

    expect(installProject).toContain('if (-not (Invoke-NpmCi))');
    expect(installProject).toContain('better-sqlite3');
    expect(installProject).toContain('node-gyp');
    expect(installProject).toContain('Python');
    expect(installProject).toContain('Visual Studio Build Tools');
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
