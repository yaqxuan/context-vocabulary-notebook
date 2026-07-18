import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { DeviceSyncSection } from '../../src/client/components/DeviceSyncSection.js';
import { I18nProvider } from '../../src/client/i18n/I18nProvider.js';

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('shows both transports and persists explicit LAN selection', async () => {
  let lanPatch: unknown;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url === '/api/settings') return Promise.resolve(json({ interface_language: '中文' }));
    if (url === '/api/device-sync/status') return Promise.resolve(json({
      config: { server_id: 'pc', tailscale_url: null, lan_enabled: 0, lan_port: 3109, lan_fingerprint: null, lan_public_key: null, lan_service_name: 'cvn-vocabulary-notebook' },
      devices: [], pairing_requests: [],
      lan_running: false,
      wsl: { is_wsl: true, networking_mode: 'mirrored', lan_supported: true, firewall_command: 'New-NetFirewallHyperVRule -LocalPorts 3109', verify_command: 'Test-NetConnection -Port 3109', note: 'Scoped rule' },
    }));
    if (url === '/api/device-sync/tailscale') return Promise.resolve(json({ installed: true, online: true, dns_name: 'pc.tailnet.ts.net', configured_url: null, serve_command: 'tailscale serve --bg 3108', serve_available: true, serve_enabled: false, cli_path: 'tailscale', authorization_url: null, error: null }));
    if (url === '/api/device-sync/setup') return Promise.resolve(json({
      lan_running: false, mdns_running: false, restart_wsl_required: false,
      firewall: { platform: 'wsl', required: true, configured: false, requires_admin: true },
      wsl: { is_wsl: true, networking_mode: 'mirrored', lan_supported: true, firewall_command: 'New-NetFirewallHyperVRule -LocalPorts 3109', verify_command: 'Test-NetConnection -Port 3109', note: 'Scoped rule' },
      tailscale: { installed: true, online: true, dns_name: 'pc.tailnet.ts.net', configured_url: null, serve_command: 'tailscale serve --bg 3108', serve_available: true, serve_enabled: false, cli_path: 'tailscale', authorization_url: null, error: null },
    }));
    if (url === '/api/device-sync/lan' && init?.method === 'PATCH') {
      lanPatch = JSON.parse(init.body as string);
      return Promise.resolve(json({ enabled: true, restart_required: false, running: true }));
    }
    return Promise.resolve(json({}));
  });

  render(<I18nProvider><DeviceSyncSection /></I18nProvider>);
  expect((await screen.findAllByText('局域网')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Tailscale').length).toBeGreaterThan(0);
  expect(screen.getByText('WSL: mirrored')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '启用局域网同步' }));
  await waitFor(() => expect(lanPatch).toEqual({ enabled: true }));
  expect(await screen.findByText(/立即生效/u)).toBeInTheDocument();
});
