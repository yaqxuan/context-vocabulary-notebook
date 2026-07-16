import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

export interface WslNetworkDiagnostics {
  is_wsl: boolean;
  networking_mode: 'mirrored' | 'nat' | 'unknown' | null;
  lan_supported: boolean;
  firewall_command: string | null;
  verify_command: string | null;
  note: string | null;
}

export function detectWslNetwork(lanPort = 3109): WslNetworkDiagnostics {
  const isWsl = Boolean(process.env.WSL_INTEROP) || (fs.existsSync('/proc/version') && /microsoft/iu.test(fs.readFileSync('/proc/version', 'utf8')));
  if (!isWsl) return { is_wsl: false, networking_mode: null, lan_supported: true, firewall_command: null, verify_command: null, note: null };
  let mode: 'mirrored' | 'nat' | 'unknown' = 'unknown';
  try {
    const output = execFileSync('wslinfo', ['--networking-mode'], { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).trim().toLowerCase();
    if (output.includes('mirrored')) mode = 'mirrored';
    else if (output.includes('nat')) mode = 'nat';
  } catch {
    mode = 'unknown';
  }
  const firewallCommand = `New-NetFirewallHyperVRule -Name "CVNDeviceSync" -DisplayName "Context Vocabulary Notebook device sync" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts ${lanPort}`;
  return {
    is_wsl: true,
    networking_mode: mode,
    lan_supported: mode === 'mirrored',
    firewall_command: firewallCommand,
    verify_command: `Test-NetConnection -ComputerName localhost -Port ${lanPort}`,
    note: mode === 'mirrored' ? 'Allow only the device sync port in the Hyper-V firewall.' : 'WSL NAT mode requires manual port forwarding; Tailscale is recommended.',
  };
}
