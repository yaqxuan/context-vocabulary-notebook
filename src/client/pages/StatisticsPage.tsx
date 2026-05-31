import { useCallback, useEffect, useState } from 'react';

import type { StatisticsPageDto } from '../../shared/types';
import { getStatisticsPage } from '../api/statistics';
import { EmptyState, ErrorState, LoadingState } from '../components/UiStates';

// --- Helpers ---

function pct(accuracy: number): string {
  return `${Math.round(accuracy * 100)}%`;
}

function shortDate(date: string): string {
  // date is YYYY-MM-DD; return MM-DD
  return date.slice(5);
}

// --- Metric cards ---

interface MetricProps {
  label: string;
  value: number;
}

function MetricCard({ label, value }: MetricProps) {
  return (
    <div className="phase7-statistics-metric">
      <span className="phase7-statistics-metric-label">{label}</span>
      <strong className="phase7-statistics-metric-value">{value}</strong>
    </div>
  );
}

// --- Bar chart (recent 14-day + monthly) ---

interface BarEntry {
  label: string;
  count: number;
}

function BarChart({ entries }: { entries: BarEntry[] }) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e.count), 1);
  return (
    <div className="phase7-statistics-bars" aria-hidden="true">
      {entries.map((e) => (
        <div key={e.label} className="phase7-statistics-bar-col">
          <div
            className="phase7-statistics-bar"
            style={{ height: `${Math.round((e.count / max) * 100)}%` }}
            title={`${e.label}: ${e.count}`}
          />
          <span className="phase7-statistics-bar-label">{e.label}</span>
        </div>
      ))}
    </div>
  );
}

// --- Accuracy list ---

function AccuracyList({ entries }: { entries: StatisticsPageDto['daily_accuracy'] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="phase7-statistics-accuracy-list">
      {entries.map((e) => (
        <li key={e.date} className="phase7-statistics-accuracy-row">
          <span className="phase7-statistics-accuracy-date">{shortDate(e.date)}</span>
          <span className="phase7-statistics-accuracy-pct">{pct(e.accuracy)}</span>
        </li>
      ))}
    </ul>
  );
}

// --- Monthly rows ---

function MonthlyList({ entries }: { entries: StatisticsPageDto['monthly_review_counts'] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="phase7-statistics-month-list">
      {entries.map((e) => (
        <li key={e.month} className="phase7-statistics-month-row">
          <span className="phase7-statistics-month-label">{e.month}</span>
          <strong className="phase7-statistics-month-count">{e.count}</strong>
        </li>
      ))}
    </ul>
  );
}

// --- Tag distribution ---

function TagDistribution({ entries }: { entries: StatisticsPageDto['tag_distribution'] }) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e.card_count), 1);
  return (
    <ul className="phase7-statistics-tag-list">
      {entries.map((e) => (
        <li key={e.tag_id} className="phase7-statistics-tag-row">
          <span className="phase7-statistics-tag-name">{e.name}</span>
          <div className="phase7-statistics-tag-track">
            <div
              className="phase7-statistics-tag-fill"
              style={{ width: `${Math.round((e.card_count / max) * 100)}%` }}
            />
          </div>
          <span className="phase7-statistics-tag-count">{e.card_count}</span>
        </li>
      ))}
    </ul>
  );
}

// --- Again / Good trend ---

function RatingTrend({ entries }: { entries: StatisticsPageDto['rating_trend'] }) {
  if (entries.length === 0) return null;
  const maxAgain = Math.max(...entries.map((e) => e.again_count), 1);
  const maxGood = Math.max(...entries.map((e) => e.good_count), 1);
  return (
    <div className="phase7-statistics-trend-grid">
      <div className="phase7-statistics-trend-box">
        <p className="phase7-statistics-trend-label">Again</p>
        <div className="phase7-statistics-spark" aria-hidden="true">
          {entries.map((e) => (
            <i
              key={e.date}
              className="phase7-statistics-spark-bar phase7-statistics-spark-again"
              style={{ height: `${Math.round((e.again_count / maxAgain) * 100)}%` }}
              title={`${e.date}: ${e.again_count}`}
            />
          ))}
        </div>
      </div>
      <div className="phase7-statistics-trend-box">
        <p className="phase7-statistics-trend-label">Good</p>
        <div className="phase7-statistics-spark" aria-hidden="true">
          {entries.map((e) => (
            <i
              key={e.date}
              className="phase7-statistics-spark-bar phase7-statistics-spark-good"
              style={{ height: `${Math.round((e.good_count / maxGood) * 100)}%` }}
              title={`${e.date}: ${e.good_count}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Ready page ---

function StatisticsReady({ data }: { data: StatisticsPageDto }) {
  const isEmpty =
    data.daily_review_counts.length === 0 &&
    data.daily_accuracy.length === 0 &&
    data.monthly_review_counts.length === 0 &&
    data.tag_distribution.length === 0 &&
    data.rating_trend.length === 0;

  // Latest 14 records from daily_review_counts
  const recent14 = data.daily_review_counts.slice(-14).map((e) => ({
    label: shortDate(e.date),
    count: e.count,
  }));

  return (
    <div className="phase7-statistics-shell">
      {/* Hero */}
      <section className="phase7-statistics-hero">
        <p className="phase7-statistics-kicker">REVIEW ANALYTICS</p>
        <h1 className="phase7-statistics-headline">看到复习节奏，而不是表格噪音。</h1>
        <p className="phase7-statistics-hero-copy">
          统计页聚焦词义总量、复习状态、收藏、最近 14 天复习量、历史月份数量、正确率、标签分布和 Again / Good 趋势。
        </p>
      </section>

      {/* Metrics */}
      <div className="phase7-statistics-metrics">
        <MetricCard label="总词义条目数量" value={data.totals.total_cards} />
        <MetricCard label="复习中数量" value={data.totals.reviewing_cards} />
        <MetricCard label="已熟记数量" value={data.totals.mastered_cards} />
        <MetricCard label="收藏数量" value={data.totals.favorite_cards} />
      </div>

      {isEmpty ? (
        <EmptyState message="还没有统计数据" />
      ) : (
        <>
          {/* Recent 14-day chart */}
          <section className="phase7-statistics-chart-card">
            <div className="phase7-statistics-card-head">
              <h2 className="phase7-statistics-card-title">最近 14 天数量图</h2>
              <p className="phase7-statistics-card-sub">每日复习量（最新 14 天）</p>
            </div>
            {recent14.length > 0 ? (
              <BarChart entries={recent14} />
            ) : (
              <p className="phase7-statistics-chart-empty">暂无数据</p>
            )}
          </section>

          {/* Monthly chart */}
          <section className="phase7-statistics-chart-card">
            <div className="phase7-statistics-card-head">
              <h2 className="phase7-statistics-card-title">历史月份数量图</h2>
              <p className="phase7-statistics-card-sub">按月汇总的复习总量</p>
            </div>
            <MonthlyList entries={data.monthly_review_counts} />
          </section>

          {/* Accuracy chart */}
          <section className="phase7-statistics-chart-card">
            <div className="phase7-statistics-card-head">
              <h2 className="phase7-statistics-card-title">每日正确率折线图</h2>
              <p className="phase7-statistics-card-sub">每天 Good 占总复习比</p>
            </div>
            <AccuracyList entries={data.daily_accuracy} />
          </section>

          {/* Tag distribution */}
          <section className="phase7-statistics-chart-card">
            <div className="phase7-statistics-card-head">
              <h2 className="phase7-statistics-card-title">标签分布</h2>
              <p className="phase7-statistics-card-sub">各标签下的词义条目数</p>
            </div>
            <TagDistribution entries={data.tag_distribution} />
          </section>

          {/* Again / Good trend */}
          <section className="phase7-statistics-chart-card">
            <div className="phase7-statistics-card-head">
              <h2 className="phase7-statistics-card-title">Again / Good 趋势</h2>
              <p className="phase7-statistics-card-sub">每日评分分布</p>
            </div>
            <RatingTrend entries={data.rating_trend} />
          </section>
        </>
      )}
    </div>
  );
}

// --- Main page ---

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: StatisticsPageDto };

export function StatisticsPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    getStatisticsPage()
      .then((data) => {
        setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        setState({ kind: 'error', message: err instanceof Error ? err.message : '无法加载统计数据' });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') return <LoadingState message="加载中…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;
  return <StatisticsReady data={state.data} />;
}
