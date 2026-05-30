import { useId } from 'react';

import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = '确认', cancelLabel = '取消', onConfirm, onCancel }: ConfirmDialogProps) {
  const headingId = useId();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  );
}
