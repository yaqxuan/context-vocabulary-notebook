import { useCallback, useEffect, useState } from 'react';

import { approvePairing, denyPairing, getDeviceSyncStatus, type PairingRequest } from '../api/deviceSync';
import { useI18n } from '../i18n/I18nProvider';
import { ConfirmDialog } from './ConfirmDialog';

export function DevicePairingPrompt() {
  const { language, t } = useI18n();
  const [request, setRequest] = useState<PairingRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const status = await getDeviceSyncStatus();
      setRequest(status.pairing_requests.find((item) => item.status === 'awaiting_approval') ?? null);
    } catch {
      // Device sync may be disabled. Keep this global prompt silent until a
      // pairing request can actually be read from the local PC service.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function decide(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      setRequest(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('settings.deviceSync.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (!request) return null;
  const deviceName = request.requested_name?.trim() || 'Android';
  const separator = language === '中文' ? '。' : '. ';
  const message = `${t('settings.deviceSync.requestFrom', { name: deviceName })}${separator}${t('settings.deviceSync.requestHelp')}${error ? ` ${error}` : ''}`;

  return (
    <ConfirmDialog
      title={t('settings.deviceSync.requestTitle')}
      message={message}
      confirmLabel={busy ? t('common.saving') : t('settings.deviceSync.approve')}
      cancelLabel={t('settings.deviceSync.deny')}
      confirmVariant="primary"
      onConfirm={() => void decide(() => approvePairing(request.session_id))}
      onCancel={() => void decide(() => denyPairing(request.session_id))}
    />
  );
}
