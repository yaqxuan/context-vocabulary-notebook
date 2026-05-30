import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, help, error, children }: FormFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
      {help ? <span className="block text-sm text-slate-500">{help}</span> : null}
      {error ? <span className="block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
