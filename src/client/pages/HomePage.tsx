import { useEffect, useState } from 'react';

import type { HomeStatisticsDto } from '../../shared/types';
import { ErrorState, LoadingState } from '../components/UiStates';
import { getHomeStatistics } from '../api/statistics';
import { getHomeGreeting } from '../lib/homeGreetings';

interface StatCardProps {
  label: string;
  value: string | number;
  help: string;
}

function StatCard({ label, value, help }: StatCardProps) {
  return (
    <div className="home-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{help}</em>
    </div>
  );
}

function progressWidth(reviewed: number, limit: number): string {
  if (limit <= 0) return '0%';
  return `${Math.min(100, Math.round((reviewed / limit) * 100))}%`;
}

function HomeHero({ data, greeting }: { data: HomeStatisticsDto; greeting: string }) {
  const progressText = `${data.reviewed_today_count}/${data.daily_review_limit}`;
  return (
    <section className="home-hero" aria-label="今日问候和复习入口">
      <div>
        <p className="home-kicker">LOCAL GREETING</p>
        <h2 className="home-welcome">欢迎回来</h2>
        <p className="home-greeting">{greeting}</p>
        <p className="home-copy">
          问候语来自本地时间段，不显示调度细节。首页先给一个安静入口，再把今天真正要做的复习量摆清楚。
        </p>
        <div className="home-actions">
          <a className="home-btn home-btn-primary" href="#/review">开始复习</a>
          <a className="home-btn home-btn-secondary" href="#/create">快速制卡</a>
        </div>
      </div>

      <div className="home-progress-card" aria-label={`今日复习进度 ${progressText}`}>
        <span>today progress</span>
        <strong>{progressText}</strong>
        <div className="home-progress-track" aria-hidden="true">
          <i style={{ width: progressWidth(data.reviewed_today_count, data.daily_review_limit) }} />
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const [data, setData] = useState<HomeStatisticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    getHomeStatistics()
      .then(setData)
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : '无法加载首页数据');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <ErrorState message="无法加载首页数据" onRetry={load} />;

  const greeting = getHomeGreeting();

  return (
    <div className="home-desk">
      <HomeHero data={data} greeting={greeting.text} />

      <section className="home-metrics" aria-label="首页统计">
        <StatCard label="今日待复习" value={data.due_count} help="按 FSRS 到期排序" />
        <StatCard label="今日已复习" value={`${data.reviewed_today_count}/${data.daily_review_limit}`} help="每日目标是提醒，不是硬限制" />
        <StatCard label="Again" value={data.again_today_count} help="今天不熟或答错" />
        <StatCard label="Good" value={data.good_today_count} help="今天顺利想起" />
      </section>

      <div className="home-bottom-grid">
        <section className="home-focus-card" aria-label="复习节奏摘要">
          <h2>先处理到期，再继续积累。</h2>
          <p>首页不扩展新功能，只把现有数据组织成更清晰的复习桌面：待复习、今日进度、Again / Good 和两个主入口。</p>
          <div className="home-mini-queue" aria-hidden="true">
            <div className="home-queue-row"><span>待复习</span><span className="home-track"><i style={{ width: progressWidth(data.due_count, Math.max(data.due_count + data.reviewed_today_count, 1)) }} /></span><strong>{data.due_count}</strong></div>
            <div className="home-queue-row"><span>Good</span><span className="home-track"><i style={{ width: progressWidth(data.good_today_count, Math.max(data.reviewed_today_count, 1)) }} /></span><strong>{data.good_today_count}</strong></div>
            <div className="home-queue-row"><span>Again</span><span className="home-track"><i style={{ width: progressWidth(data.again_today_count, Math.max(data.reviewed_today_count, 1)) }} /></span><strong>{data.again_today_count}</strong></div>
          </div>
        </section>

        <section className="home-state-card" aria-label="今日目标提醒">
          <span>soft goal</span>
          <h2>{data.is_daily_target_reached ? '今日复习目标已完成' : '今天可以继续积累和复习'}</h2>
          <p>复习页会按到期时间展示词义条目，目标单词不会被隐藏。每日目标是提醒，不是硬限制。</p>
        </section>
      </div>
    </div>
  );
}
