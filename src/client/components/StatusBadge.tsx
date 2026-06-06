import type { CardStatus } from '../../shared/constants';
import { useI18n } from '../i18n/I18nProvider';

interface StatusBadgeProps {
  status?: CardStatus;
  favorite?: boolean;
}

export function StatusBadge({ status, favorite }: StatusBadgeProps) {
  const { t } = useI18n();

  if (favorite) {
    return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">{t('status.favorite')}</span>;
  }

  if (status === 'mastered') {
    return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">{t('status.mastered')}</span>;
  }

  return <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">{t('status.reviewing')}</span>;
}
