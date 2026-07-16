import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';

import {
  approvePairing,
  createPairingSession,
  denyPairing,
  getConnectionProfile,
  getDeviceSyncStatus,
  getTailscaleStatus,
  revokeSyncDevice,
  setLanEnabled,
  setTailscaleUrl,
  type DeviceSyncStatus,
  type TailscaleStatus,
} from '../api/deviceSync';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';

export function DeviceSyncSection() {
  const { t } = useI18n();
  const [status, setStatus] = useState<DeviceSyncStatus | null>(null);
  const [tailscale, setTailscale] = useState<TailscaleStatus | null>(null);
  const [tailscaleUrl, setTailscaleUrlValue] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [qrKind, setQrKind] = useState<'pair' | 'profile' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextTailscale] = await Promise.all([getDeviceSyncStatus(), getTailscaleStatus()]);
      if (!nextStatus?.config || !Array.isArray(nextStatus.devices) || !Array.isArray(nextStatus.pairing_requests) || typeof nextTailscale?.installed !== 'boolean') {
        throw new Error(t('settings.deviceSync.failed'));
      }
      setStatus(nextStatus);
      setTailscale(nextTailscale);
      setTailscaleUrlValue(nextTailscale.configured_url ?? (nextTailscale.dns_name ? `https://${nextTailscale.dns_name}` : ''));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('settings.deviceSync.failed'));
    }
  }, [t]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void getDeviceSyncStatus().then(setStatus).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function run(action: () => Promise<unknown>, success = '') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('settings.deviceSync.failed'));
    } finally {
      setBusy(false);
    }
  }

  async function makePairingQr() {
    await run(async () => {
      const payload = await createPairingSession();
      setQr(await QRCode.toDataURL(JSON.stringify(payload), { errorCorrectionLevel: 'M', width: 320, margin: 2 }));
      setQrKind('pair');
    });
  }

  async function makeProfileQr() {
    await run(async () => {
      const profile = await getConnectionProfile();
      setQr(await QRCode.toDataURL(JSON.stringify(profile), { errorCorrectionLevel: 'M', width: 320, margin: 2 }));
      setQrKind('profile');
    });
  }

  if (!status || !tailscale) {
    return (
      <section className="phase7-settings-section">
        <h2 className="phase7-settings-section-title">{t('settings.deviceSync.title')}</h2>
        <p className="phase7-settings-export-desc">{error || t('common.loading')}</p>
      </section>
    );
  }

  const activeDevice = status.devices.find((device) => !device.revoked_at);
  const pending = status.pairing_requests.filter((request) => request.status === 'awaiting_approval');

  return (
    <section className="phase7-settings-section device-sync-section">
      <h2 className="phase7-settings-section-title">{t('settings.deviceSync.title')}</h2>
      <p className="phase7-settings-export-desc">{t('settings.deviceSync.description')}</p>

      <div className="device-sync-grid">
        <div className="device-sync-card">
          <h3>{t('settings.deviceSync.lan')}</h3>
          <p>{status.config.lan_enabled ? t('settings.deviceSync.enabled') : t('settings.deviceSync.disabled')}</p>
          <p><code>{status.config.lan_service_name}</code> · HTTPS {status.config.lan_port}</p>
          {status.config.lan_fingerprint ? <p className="device-sync-break">SPKI: <code>{status.config.lan_fingerprint}</code></p> : null}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => run(
              () => setLanEnabled(!Boolean(status.config.lan_enabled)),
              t('settings.deviceSync.restartRequired'),
            )}
          >
            {status.config.lan_enabled ? t('settings.deviceSync.disableLan') : t('settings.deviceSync.enableLan')}
          </Button>
        </div>

        <div className="device-sync-card">
          <h3>{t('settings.deviceSync.tailscale')}</h3>
          <p>{tailscale.installed ? (tailscale.online ? t('settings.deviceSync.online') : t('settings.deviceSync.offline')) : t('settings.deviceSync.notInstalled')}</p>
          <p><code>{tailscale.serve_command}</code></p>
          <label className="phase7-settings-label" htmlFor="tailscale-sync-url">{t('settings.deviceSync.tailscaleUrl')}</label>
          <input id="tailscale-sync-url" className="phase7-settings-input" value={tailscaleUrl} onChange={(event) => setTailscaleUrlValue(event.target.value)} placeholder="https://host.tailnet.ts.net" />
          <Button variant="secondary" disabled={busy} onClick={() => run(() => setTailscaleUrl(tailscaleUrl.trim() || null), t('settings.deviceSync.saved'))}>{t('common.save')}</Button>
        </div>
      </div>

      {status.wsl.is_wsl ? (
        <div className="device-sync-diagnostic">
          <strong>WSL: {status.wsl.networking_mode ?? 'unknown'}</strong>
          <p>{status.wsl.note}</p>
          {status.wsl.firewall_command ? <pre>{status.wsl.firewall_command}</pre> : null}
          {status.wsl.verify_command ? <pre>{status.wsl.verify_command}</pre> : null}
        </div>
      ) : null}

      <div className="phase7-settings-actions">
        <Button disabled={busy || Boolean(activeDevice)} onClick={makePairingQr}>{t('settings.deviceSync.createPairing')}</Button>
        <Button variant="secondary" disabled={busy || !activeDevice} onClick={makeProfileQr}>{t('settings.deviceSync.updateProfile')}</Button>
      </div>

      {qr ? (
        <div className="device-sync-qr">
          <strong>{qrKind === 'pair' ? t('settings.deviceSync.pairQr') : t('settings.deviceSync.profileQr')}</strong>
          <img src={qr} alt={qrKind === 'pair' ? t('settings.deviceSync.pairQr') : t('settings.deviceSync.profileQr')} />
        </div>
      ) : null}

      {pending.map((request) => (
        <div className="device-sync-request" key={request.session_id}>
          <span>{t('settings.deviceSync.requestFrom', { name: request.requested_name ?? 'Android' })}</span>
          <Button disabled={busy} onClick={() => run(() => approvePairing(request.session_id), t('settings.deviceSync.approved'))}>{t('settings.deviceSync.approve')}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(() => denyPairing(request.session_id))}>{t('settings.deviceSync.deny')}</Button>
        </div>
      ))}

      {activeDevice ? (
        <div className="device-sync-device">
          <div><strong>{activeDevice.device_name}</strong><small>{activeDevice.last_seen_at ? `${t('settings.deviceSync.lastSeen')}: ${new Date(activeDevice.last_seen_at).toLocaleString()}` : t('settings.deviceSync.neverSynced')}</small></div>
          <Button variant="secondary" disabled={busy} onClick={() => run(() => revokeSyncDevice(activeDevice.device_id), t('settings.deviceSync.revoked'))}>{t('settings.deviceSync.revoke')}</Button>
        </div>
      ) : <p>{t('settings.deviceSync.noDevice')}</p>}

      {notice ? <p className="phase7-settings-saved-msg">{notice}</p> : null}
      {error ? <p className="phase7-settings-save-error" role="alert">{error}</p> : null}
    </section>
  );
}
