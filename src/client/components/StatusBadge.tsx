import type { CardStatus } from '../../shared/constants';

interface StatusBadgeProps {
  status?: CardStatus;
  favorite?: boolean;
}

export function StatusBadge({ status, favorite }: StatusBadgeProps) {
  if (favorite) {
    return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">已收藏</span>;
  }

  if (status === 'mastered') {
    return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">已熟记</span>;
  }

  return <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">复习中</span>;
}
