import { EmptyState } from '../components/UiStates';
import { useI18n } from '../i18n/I18nProvider';

interface PlaceholderPageProps {
  message: string;
  phase: 'Phase 6' | 'Phase 7';
}

export function PlaceholderPage({ message, phase }: PlaceholderPageProps) {
  const { t } = useI18n();
  return (
    <EmptyState
      message={t('placeholder.message', { message, phase })}
      action={<a className="text-sm font-medium text-blue-700 hover:text-blue-800" href="#/">{t('placeholder.backHome')}</a>}
    />
  );
}
