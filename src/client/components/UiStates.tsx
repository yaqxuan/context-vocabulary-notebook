import type { ReactNode } from 'react';
import { Button } from './Button';
import { useI18n } from '../i18n/I18nProvider';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <div className="vn-state vn-state--loading rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
      <p className="vn-state__message">{message ?? t('common.loading')}</p>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="vn-state vn-state--empty rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
      <p className="vn-state__message">{message}</p>
      {action ? <div className="vn-state__action mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="vn-state vn-state--error rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
      <p className="vn-state__title font-medium">{t('common.loadFailed')}</p>
      <p className="vn-state__message mt-1">{message}</p>
      {onRetry ? <Button className="vn-state__action mt-4" variant="secondary" onClick={onRetry}>{t('common.retry')}</Button> : null}
    </div>
  );
}
