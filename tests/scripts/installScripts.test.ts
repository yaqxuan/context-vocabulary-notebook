import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const bashInstaller = readFileSync(path.join(root, 'scripts/install.sh'), 'utf8');
const powershellInstaller = readFileSync(path.join(root, 'scripts/install.ps1'), 'utf8');

describe('one-click installers', () => {
  it('enforces the Node.js versions required by the current Vite release', () => {
    expect(bashInstaller).toContain('major === 20 && minor >= 19');
    expect(bashInstaller).toContain('major === 22 && minor >= 12');
    expect(bashInstaller).toContain('major > 22');

    expect(powershellInstaller).toContain('$ParsedVersion.Major -eq 20 -and $ParsedVersion.Minor -ge 19');
    expect(powershellInstaller).toContain('$ParsedVersion.Major -eq 22 -and $ParsedVersion.Minor -ge 12');
    expect(powershellInstaller).toContain('$ParsedVersion.Major -gt 22');
  });

  it('keeps Bash installation fail-fast', () => {
    expect(bashInstaller).toContain('set -euo pipefail');
    expect(bashInstaller).toContain('git -C "$INSTALL_DIR" pull --ff-only');
    expect(bashInstaller).toContain('npm run build');
    expect(bashInstaller).toContain('--prefer-offline');
    expect(bashInstaller).toContain('--fetch-timeout=60000');
  });

  it('checks every critical native command in the PowerShell installer', () => {
    expect(powershellInstaller).toContain('function Invoke-CheckedNative');
    expect(powershellInstaller).toContain('-Arguments @("-C", $InstallDir, "pull", "--ff-only")');
    expect(powershellInstaller).toContain('-Arguments @("clone", $RepoUrl, ".")');
    expect(powershellInstaller).toContain('-Arguments @("run", "build")');
    expect(powershellInstaller).toContain('if (-not (Invoke-NpmCi))');
    expect(powershellInstaller).toContain('npm ci --prefer-offline --no-audit --no-fund');
    expect(powershellInstaller).toContain('--fetch-timeout=60000');

    expect(powershellInstaller).not.toMatch(/^\s+git -C "\$InstallDir" pull --ff-only\s*$/m);
    expect(powershellInstaller).not.toMatch(/^\s+git clone \$RepoUrl \.\s*$/m);
    expect(powershellInstaller).not.toMatch(/^\s+npm run build\s*$/m);
  });
});
