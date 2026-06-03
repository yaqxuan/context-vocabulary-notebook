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

interface DailyQuantityEntry {
  date: string;
  label: string;
  reviewCount: number;
  goodCount: number;
}

function DailyQuantityChart({ entries, summaryId }: { entries: DailyQuantityEntry[]; summaryId?: string }) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.flatMap((e) => [e.reviewCount, e.goodCount]), 1);
  const barHeight = (count: number) => count === 0 ? 0 : Math.max(4, Math.round((count / max) * 100));
  const summaryText = entries.map((e) => `${e.label}: 净复习量 ${e.reviewCount}, Good ${e.goodCount}`).join(', ');
  return (
    <>
      <p id={summaryId} className="phase7-statistics-sr-only">
        {summaryText}
      </p>
      <div className="phase7-statistics-bars phase7-statistics-daily-bars" aria-hidden="true">
        {entries.map((e) => (
          <div key={e.date} className="phase7-statistics-bar-col phase7-statistics-daily-col">
            <div className="phase7-statistics-daily-bar-pair">
              <span className="phase7-statistics-daily-stack">
                <span className="phase7-statistics-bar-count">{e.reviewCount}</span>
                <i
                  className="phase7-statistics-daily-bar phase7-statistics-daily-bar--review"
                  data-testid={`daily-review-bar-${e.date}`}
                  style={{ height: `${barHeight(e.reviewCount)}%` }}
                  title={`${e.date} 净复习量: ${e.reviewCount}`}
                />
              </span>
              <span className="phase7-statistics-daily-stack">
                <span className="phase7-statistics-bar-count">{e.goodCount}</span>
                <i
                  className="phase7-statistics-daily-bar phase7-statistics-daily-bar--good"
                  data-testid={`daily-good-bar-${e.date}`}
                  style={{ height: `${barHeight(e.goodCount)}%` }}
                  title={`${e.date} Good: ${e.goodCount}`}
                />
              </span>
            </div>
            <span className="phase7-statistics-bar-label">{e.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// --- Accuracy line chart ---

function AccuracyLineChart({ entries }: { entries: StatisticsPageDto['daily_accuracy'] }) {
  if (entries.length === 0) return null;

  const width = 1000;
  const height = 190;
  const padX = 46;
  const padTop = 30;
  const padBottom = 42;
  const plotHeight = height - padTop - padBottom;
  const xFor = (index: number) => entries.length === 1
    ? width / 2
    : padX + (index * (width - padX * 2)) / (entries.length - 1);
  const yFor = (accuracy: number) => padTop + (1 - accuracy) * plotHeight;
  const points = entries.map((e, index) => `${xFor(index)},${yFor(e.accuracy)}`).join(' ');
  const summaryText = entries.map((e) => `${shortDate(e.date)}: ${pct(e.accuracy)}`).join(', ');
  const showInlineValues = entries.length <= 14;

  return (
    <div className="phase7-statistics-line-chart">
      <p className="phase7-statistics-sr-only">{summaryText}</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`每日正确率：${summaryText}`}>
        <line className="phase7-statistics-line-axis" x1={padX} y1={padTop} x2={padX} y2={height - padBottom} />
        <line className="phase7-statistics-line-axis" x1={padX} y1={height - padBottom} x2={width - padX} y2={height - padBottom} />
        <polyline className="phase7-statistics-line-path" points={points} />
        {entries.map((e, index) => {
          const x = xFor(index);
          const y = yFor(e.accuracy);
          const valueY = y < 58 ? y + 36 : y - 16;
          return (
            <g key={e.date}>
              <circle className="phase7-statistics-line-dot" cx={x} cy={y} r="7" />
              {showInlineValues ? <text className="phase7-statistics-line-value" x={x} y={valueY} textAnchor="middle">{pct(e.accuracy)}</text> : null}
              <text className="phase7-statistics-line-label" x={x} y={height - 14} textAnchor="middle">{shortDate(e.date)}</text>
            </g>
          );
        })}
      </svg>
    </div>
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
  const max = Math.max(...entries.flatMap((e) => [e.again_count, e.good_count]), 1);
  const barHeight = (count: number) => count === 0 ? 0 : Math.max(8, Math.round((count / max) * 88));
  const againSummary = entries.map((e) => `${e.date}: ${e.again_count}`).join(', ');
  const goodSummary = entries.map((e) => `${e.date}: ${e.good_count}`).join(', ');
  return (
    <div className="phase7-statistics-rating-trend">
      <p className="phase7-statistics-sr-only" data-testid="again-trend-summary">{againSummary}</p>
      <p className="phase7-statistics-sr-only" data-testid="good-trend-summary">{goodSummary}</p>
      <div className="phase7-statistics-rating-legend" aria-hidden="true">
        <span><i className="phase7-statistics-rating-dot phase7-statistics-rating-dot--again" />Again：没想起 / 记错</span>
        <span><i className="phase7-statistics-rating-dot phase7-statistics-rating-dot--good" />Good：顺利想起</span>
      </div>
      <div className="phase7-statistics-rating-groups" aria-hidden="true">
        {entries.map((entry) => (
          <div key={entry.date} className="phase7-statistics-rating-group" data-testid={`rating-trend-group-${entry.date}`}>
            <div className="phase7-statistics-rating-bars">
              <span className="phase7-statistics-rating-stack">
                <span className="phase7-statistics-rating-count">{entry.again_count}</span>
                <i
                  className="phase7-statistics-rating-bar phase7-statistics-rating-bar--again"
                  data-testid={`rating-trend-again-${entry.date}`}
                  style={{ height: `${barHeight(entry.again_count)}px` }}
                  title={`${entry.date} Again: ${entry.again_count}`}
                />
              </span>
              <span className="phase7-statistics-rating-stack">
                <span className="phase7-statistics-rating-count">{entry.good_count}</span>
                <i
                  className="phase7-statistics-rating-bar phase7-statistics-rating-bar--good"
                  data-testid={`rating-trend-good-${entry.date}`}
                  style={{ height: `${barHeight(entry.good_count)}px` }}
                  title={`${entry.date} Good: ${entry.good_count}`}
                />
              </span>
            </div>
            <span className="phase7-statistics-bar-label">{shortDate(entry.date)}</span>
          </div>
        ))}
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

  // Latest 14 records from daily_review_counts, paired with same-day Good counts.
  const goodCountsByDate = new Map(data.rating_trend.map((e) => [e.date, e.good_count]));
  const recent14 = data.daily_review_counts.slice(-14).map((e) => ({
    date: e.date,
    label: shortDate(e.date),
    reviewCount: e.count,
    goodCount: goodCountsByDate.get(e.date) ?? 0,
  }));

  return (
    <div className="phase7-statistics-shell">
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
          <section className="phase7-statistics-chart-card" data-testid="recent-14-chart">
            <div className="phase7-statistics-card-head">
              <h2 className="phase7-statistics-card-title">最近 14 天数量图</h2>
              <p className="phase7-statistics-card-sub">每日净复习量 / Good 数量（最新 14 天）</p>
            </div>
            {recent14.length > 0 ? (
              <DailyQuantityChart entries={recent14} summaryId="recent-14-summary" />
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
            <AccuracyLineChart entries={data.daily_accuracy} />
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
              <p className="phase7-statistics-card-sub">每一天的 Again / Good 次数对比</p>
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
