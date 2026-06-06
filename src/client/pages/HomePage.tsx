import { useEffect, useState } from 'react';

import type { HomeStatisticsDto, SettingsDto } from '../../shared/types';
import {
  DEFAULT_DEFINITION_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  getNativeLanguageLabel,
  normalizeSupportedLanguage,
  type SupportedLanguage,
} from '../../shared/constants';
import { ErrorState, LoadingState } from '../components/UiStates';
import { getHomeStatistics } from '../api/statistics';
import { getSettings } from '../api/settings';
import { getHomeGreeting, type GreetingSelection } from '../lib/homeGreetings';
import { useI18n } from '../i18n/I18nProvider';

interface StatCardProps {
  label: string;
  value: string | number;
}

interface HomeLanguageSettings {
  target: SupportedLanguage;
  definition: SupportedLanguage;
}

const DEFAULT_HOME_LANGUAGES: HomeLanguageSettings = {
  target: DEFAULT_TARGET_LANGUAGE,
  definition: DEFAULT_DEFINITION_LANGUAGE,
};

function getHomeLanguages(settings: SettingsDto | null): HomeLanguageSettings {
  return {
    target: normalizeSupportedLanguage(settings?.default_target_language) ?? DEFAULT_HOME_LANGUAGES.target,
    definition: normalizeSupportedLanguage(settings?.default_definition_language) ?? DEFAULT_HOME_LANGUAGES.definition,
  };
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="home-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function progressWidth(reviewed: number, limit: number): string {
  if (limit <= 0) return '0%';
  return `${Math.min(100, Math.round((reviewed / limit) * 100))}%`;
}

function HomeActions() {
  const { t } = useI18n();
  return (
    <div className="home-actions">
      <a className="home-btn home-btn-primary" href="#/review">{t('home.startReview')}</a>
      <a className="home-btn home-btn-secondary" href="#/create">{t('home.createCard')}</a>
    </div>
  );
}

function HomeLanguageBadge({ label, language }: { label: string; language: SupportedLanguage }) {
  return (
    <span className="home-greeting-language">
      <span>{label}</span>
      <strong>{getNativeLanguageLabel(language)}</strong>
    </span>
  );
}

function HomeHero({ greeting, languages }: { greeting: GreetingSelection; languages: HomeLanguageSettings }) {
  const { t } = useI18n();
  return (
    <section className="home-hero" aria-label={t('home.heroAria')}>
      <div>
        <h2 className="home-welcome">{t('home.welcome')}</h2>
        <div className="home-greeting-stack">
          <div className="home-greeting-languages" aria-label={`${t('create.targetLanguage')}: ${getNativeLanguageLabel(languages.target)}; ${t('create.definitionLanguage')}: ${getNativeLanguageLabel(languages.definition)}`}>
            <HomeLanguageBadge label={t('create.targetLanguage')} language={languages.target} />
            <HomeLanguageBadge label={t('create.definitionLanguage')} language={languages.definition} />
          </div>
          <p className="home-greeting">{greeting.text}</p>
          <p className="home-greeting" lang="en">{greeting.translation}</p>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const [data, setData] = useState<HomeStatisticsDto | null>(null);
  const [languages, setLanguages] = useState<HomeLanguageSettings>(DEFAULT_HOME_LANGUAGES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      getHomeStatistics(),
      getSettings().catch(() => null),
    ])
      .then(([statistics, settings]) => {
        setData(statistics);
        setLanguages(getHomeLanguages(settings));
      })
      .catch((err: unknown) => {
        setData(null);
        setLanguages(DEFAULT_HOME_LANGUAGES);
        setError(err instanceof Error ? err.message : t('home.loadFailed'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <ErrorState message={t('home.loadFailed')} onRetry={load} />;

  const greeting = getHomeGreeting();

  return (
    <div className="home-desk">
      <HomeHero greeting={greeting} languages={languages} />

      <div className="home-content-stack">
        <HomeActions />

        <section className="home-metrics" aria-label={t('home.metricsAria')}>
          <StatCard label={t('home.dueToday')} value={data.due_count} />
          <StatCard label={t('home.reviewedToday')} value={`${data.reviewed_today_count}/${data.daily_review_limit}`} />
          <StatCard label={t('home.again')} value={data.again_today_count} />
          <StatCard label={t('home.good')} value={data.good_today_count} />
        </section>

        <div className="home-bottom-grid">
          <section className="home-focus-card" aria-label={t('home.focusAria')}>
            <div className="home-mini-queue" aria-hidden="true">
              <div className="home-queue-row"><span>{t('home.dueToday')}</span><span className="home-track"><i style={{ width: progressWidth(data.due_count, Math.max(data.due_count + data.reviewed_today_count, 1)) }} /></span><strong>{data.due_count}</strong></div>
              <div className="home-queue-row"><span>{t('home.good')}</span><span className="home-track"><i style={{ width: progressWidth(data.good_today_count, Math.max(data.reviewed_today_count, 1)) }} /></span><strong>{data.good_today_count}</strong></div>
              <div className="home-queue-row"><span>{t('home.again')}</span><span className="home-track"><i style={{ width: progressWidth(data.again_today_count, Math.max(data.reviewed_today_count, 1)) }} /></span><strong>{data.again_today_count}</strong></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
