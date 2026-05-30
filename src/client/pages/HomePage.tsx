import { useEffect, useState } from 'react';

import type { HomeStatisticsDto } from '../../shared/types';
import { ErrorState, LoadingState } from '../components/UiStates';
import { getHomeStatistics } from '../api/statistics';

interface StatCardProps {
  label: string;
  value: string | number;
  help: string;
}

function StatCard({ label, value, help }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{help}</p>
    </div>
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="今日待复习" value={data.due_count} help="按 FSRS 到期排序" />
        <StatCard label="今日已复习" value={`${data.reviewed_today_count} / ${data.daily_review_limit}`} help="每日目标是提醒，不是硬限制" />
        <StatCard label="Again" value={data.again_today_count} help="今天不熟或答错" />
        <StatCard label="Good" value={data.good_today_count} help="今天顺利想起" />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-medium text-blue-800">
          {data.is_daily_target_reached ? '今日复习目标已完成' : '今天可以继续积累和复习'}
        </p>
        <p className="mt-1 text-sm text-blue-700">
          复习页会按到期时间展示词义条目，目标单词不会被隐藏。
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700" href="#/review">开始复习</a>
        <a className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 transition hover:bg-slate-50" href="#/create">快速制卡</a>
      </div>
    </div>
  );
}
