import { EmptyState } from '../components/UiStates';

interface PlaceholderPageProps {
  message: string;
  phase: 'Phase 6' | 'Phase 7';
}

export function PlaceholderPage({ message, phase }: PlaceholderPageProps) {
  return (
    <EmptyState
      message={`${message}。此功能将在 ${phase} 实现。`}
      action={<a className="text-sm font-medium text-blue-700 hover:text-blue-800" href="#/">返回首页</a>}
    />
  );
}
