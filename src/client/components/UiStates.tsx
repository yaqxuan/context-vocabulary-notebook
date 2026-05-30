import type { ReactNode } from 'react';
import { Button } from './Button';

export function LoadingState({ message = '加载中…' }: { message?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{message}</div>;
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
      <p>{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
      <p className="font-medium">加载失败</p>
      <p className="mt-1">{message}</p>
      {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>重试</Button> : null}
    </div>
  );
}
