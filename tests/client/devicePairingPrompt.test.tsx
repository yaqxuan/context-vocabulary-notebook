import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { DevicePairingPrompt } from '../../src/client/components/DevicePairingPrompt.js';
import { I18nProvider } from '../../src/client/i18n/I18nProvider.js';

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('shows a global pairing modal and approves the requesting phone', async () => {
  let approved = false;
  const approveRequest = vi.fn();
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url === '/api/settings') return Promise.resolve(json({ interface_language: '中文' }));
    if (url === '/api/device-sync/status') return Promise.resolve(json({
      config: {}, devices: [], wsl: {},
      pairing_requests: approved ? [] : [{
        session_id: 'pair-1', status: 'awaiting_approval', requested_device_id: 'phone-1',
        requested_name: '我的手机', created_at: '2026-07-17T00:00:00.000Z',
        expires_at: '2026-07-17T00:05:00.000Z', approved_at: null,
      }],
    }));
    if (url === '/api/device-sync/pairing-sessions/pair-1/approve' && init?.method === 'POST') {
      approved = true;
      approveRequest();
      return Promise.resolve(json({ device_id: 'phone-1' }));
    }
    return Promise.resolve(json({}));
  });

  render(<I18nProvider><DevicePairingPrompt /></I18nProvider>);

  const dialog = await screen.findByRole('dialog', { name: '确认手机配对' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByText(/我的手机/u)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '确认配对' }));

  await waitFor(() => expect(approveRequest).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
