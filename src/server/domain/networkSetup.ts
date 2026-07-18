import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Database } from 'better-sqlite3';
import type { DeviceSyncRuntime } from '../deviceSyncRuntime.js';
import {
  detectTailscale,
  setTailscaleUrl,
  startTailscaleServe,
  type TailscaleStatus,
} from './deviceSync.js';
import { detectWslNetwork, type WslNetworkDiagnostics } from './networkDiagnostics.js';

export interface FirewallSetupStatus {
  platform: 'windows' | 'wsl' | 'other';
  required: boolean;
  configured: boolean;
  requires_admin: boolean;
}

export interface DeviceSyncSetupStatus {
  lan_running: boolean;
  mdns_running: boolean;
  firewall: FirewallSetupStatus;
  wsl: WslNetworkDiagnostics;
  tailscale: TailscaleStatus;
  restart_wsl_required: boolean;
}

function powershellAvailable(): boolean {
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'], {
      timeout: 3000, stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch { return false; }
}

function windowsScriptPath(scriptName: string): string {
  const localPath = path.resolve(process.cwd(), 'scripts', scriptName);
  if (process.platform === 'win32') return localPath;
  return execFileSync('wslpath', ['-w', localPath], {
    encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function firewallConfigured(wsl: WslNetworkDiagnostics, port: number): boolean {
  if (!powershellAvailable()) return false;
  const command = wsl.is_wsl
    ? `$rule = Get-NetFirewallHyperVRule -Name 'CVNDeviceSync' -ErrorAction SilentlyContinue; `
      + `if ($rule -and $rule.Protocol -eq 'TCP' -and @($rule.LocalPorts) -contains '${port}' `
      + `-and (\"$($rule.VMCreatorId)\".Trim('{}')) -ieq '40E0AC32-46A5-438A-A0B2-2B479E8F2E90') { 'yes' }`
    : `$rule = Get-NetFirewallRule -Name 'CVNDeviceSync' -ErrorAction SilentlyContinue; `
      + `$filter = $rule | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue; `
      + `if ($rule -and \"$($rule.Enabled)\" -eq 'True' -and \"$($rule.Profile)\" -eq 'Private' `
      + `-and $filter.Protocol -eq 'TCP' -and \"$($filter.LocalPort)\" -eq '${port}') { 'yes' }`;
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
      encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() === 'yes';
  } catch { return false; }
}

export function firewallSetupStatus(wsl: WslNetworkDiagnostics, port = 3109): FirewallSetupStatus {
  const windows = process.platform === 'win32';
  const supported = windows || wsl.is_wsl;
  return {
    platform: wsl.is_wsl ? 'wsl' : windows ? 'windows' : 'other',
    required: supported,
    configured: supported ? firewallConfigured(wsl, port) : false,
    requires_admin: supported,
  };
}

export function configureDeviceSyncFirewall(port: number, wsl: WslNetworkDiagnostics): void {
  if (!(process.platform === 'win32' || wsl.is_wsl) || !powershellAvailable()) return;
  const script = windowsScriptPath('configure-device-sync-firewall.ps1').replace(/'/gu, "''");
  const argumentsList = [
    "'-NoProfile'", "'-ExecutionPolicy'", "'Bypass'", "'-File'", `'\"${script}\"'`,
    "'-Port'", `'${port}'`, ...(wsl.is_wsl ? ["'-HyperV'"] : []),
  ].join(',');
  const command = `Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -ArgumentList @(${argumentsList})`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
    encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function configureWslMirrored(): void {
  if (!process.env.WSL_DISTRO_NAME || !powershellAvailable()) return;
  const script = windowsScriptPath('configure-wsl-mirrored.ps1');
  execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script,
  ], { encoding: 'utf8', timeout: 15_000, stdio: ['ignore', 'pipe', 'pipe'] });
}

export function deviceSyncSetupStatus(
  db: Database,
  runtime: DeviceSyncRuntime,
  restartWslRequired = false,
): DeviceSyncSetupStatus {
  const config = db.prepare('SELECT lan_port FROM sync_server_config WHERE id = 1')
    .get() as { lan_port: number };
  const wsl = detectWslNetwork(config.lan_port);
  return {
    lan_running: runtime.lanRunning,
    mdns_running: runtime.lanRunning,
    firewall: firewallSetupStatus(wsl, config.lan_port),
    wsl,
    tailscale: detectTailscale(db),
    restart_wsl_required: restartWslRequired,
  };
}

export async function runAutomaticDeviceSyncSetup(
  db: Database,
  runtime: DeviceSyncRuntime,
  options: { configureFirewall: boolean },
): Promise<DeviceSyncSetupStatus> {
  await runtime.setLanEnabled(true);
  const config = db.prepare('SELECT lan_port FROM sync_server_config WHERE id = 1')
    .get() as { lan_port: number };
  const wsl = detectWslNetwork(config.lan_port);
  const firewall = firewallSetupStatus(wsl, config.lan_port);
  if (
    options.configureFirewall
    && firewall.required
    && !firewall.configured
    && (!wsl.is_wsl || wsl.networking_mode === 'mirrored')
  ) {
    configureDeviceSyncFirewall(config.lan_port, wsl);
  }
  let tailscale = detectTailscale(db);
  if (tailscale.installed && tailscale.online && !tailscale.serve_enabled) {
    tailscale = startTailscaleServe(db, Number(process.env.SYNC_PORT ?? 3108));
  }
  if (tailscale.online && tailscale.serve_enabled && tailscale.dns_name) {
    const url = `https://${tailscale.dns_name}`;
    try {
      const response = await fetch(`${url}/v1/capabilities`, { signal: AbortSignal.timeout(7000) });
      const capabilities = await response.json() as { protocol_version?: unknown; server_id?: unknown };
      const server = db.prepare('SELECT server_id FROM sync_server_config WHERE id = 1')
        .get() as { server_id: string };
      if (!response.ok || capabilities.protocol_version !== 1 || capabilities.server_id !== server.server_id) {
        throw new Error('Tailscale Serve returned a different sync server');
      }
      setTailscaleUrl(db, url);
      tailscale = detectTailscale(db);
    } catch (error) {
      tailscale = {
        ...tailscale,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return {
    ...deviceSyncSetupStatus(db, runtime),
    tailscale,
  };
}
