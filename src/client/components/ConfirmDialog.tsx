import { useId } from 'react';
import { createPortal } from 'react-dom';

import { Button } from './Button';
import { useI18n } from '../i18n/I18nProvider';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const headingId = useId();
  const { t } = useI18n();

  const dialogMarkup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <h2 id={headingId} className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>{cancelLabel ?? t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel ?? t('common.confirm')}</Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialogMarkup;

  return createPortal(dialogMarkup, document.body);
}
