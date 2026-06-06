import { useEffect, useState } from 'react';

import type { HomeStatisticsDto } from '../../shared/types';
import { ErrorState, LoadingState } from '../components/UiStates';
import { getHomeStatistics } from '../api/statistics';
import { getHomeGreeting, type GreetingSelection } from '../lib/homeGreetings';
import { useI18n } from '../i18n/I18nProvider';

interface StatCardProps {
  label: string;
  value: string | number;
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

function HomeHero({ greeting }: { greeting: GreetingSelection }) {
  const { t } = useI18n();
  return (
    <section className="home-hero" aria-label={t('home.heroAria')}>
      <div>
        <h2 className="home-welcome">{t('home.welcome')}</h2>
        <div className="home-greeting-stack">
          <p className="home-greeting">{greeting.text}</p>
          <p className="home-greeting" lang="en">{greeting.translation}</p>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const [data, setData] = useState<HomeStatisticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  const load = () => {
    setLoading(true);
    setError(null);
    getHomeStatistics()
      .then(setData)
      .catch((err: unknown) => {
        setData(null);
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
      <HomeHero greeting={greeting} />

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
