import type { Database } from 'better-sqlite3';
import { getDailyReviewProgress, getDueQueue } from './review.js';

export interface HomeStatistics {
  due_count: number;
  reviewed_today_count: number;
  again_today_count: number;
  good_today_count: number;
  daily_review_limit: number;
  is_daily_target_reached: boolean;
}

export interface StatisticsTotals {
  total_cards: number;
  reviewing_cards: number;
  mastered_cards: number;
  favorite_cards: number;
}

export interface DailyReviewCount {
  date: string;
  count: number;
}

export interface DailyAccuracy {
  date: string;
  reviewed_count: number;
  good_count: number;
  accuracy: number;
}

export interface TagDistribution {
  tag_id: string;
  name: string;
  card_count: number;
}

export interface RatingTrend {
  date: string;
  again_count: number;
  good_count: number;
}

export interface StatisticsPageData {
  totals: StatisticsTotals;
  daily_review_counts: DailyReviewCount[];
  daily_accuracy: DailyAccuracy[];
  tag_distribution: TagDistribution[];
  rating_trend: RatingTrend[];
}

export function getHomeStatistics(db: Database): HomeStatistics {
  const progress = getDailyReviewProgress(db);

  return {
    due_count: getDueQueue(db).length,
    reviewed_today_count: progress.reviewed_count,
    again_today_count: progress.again_count,
    good_today_count: progress.good_count,
    daily_review_limit: progress.daily_review_limit,
    is_daily_target_reached: progress.is_limit_reached,
  };
}

export function getStatisticsPageData(db: Database): StatisticsPageData {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total_cards,
      SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing_cards,
      SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) AS mastered_cards,
      SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) AS favorite_cards
    FROM word_sense_cards
    WHERE deleted_at IS NULL
  `).get() as StatisticsTotals;

  const dailyReviewCounts = db.prepare(`
    SELECT substr(rl.reviewed_at, 1, 10) AS date, COUNT(*) AS count
    FROM review_logs rl
    JOIN word_sense_cards wsc ON wsc.id = rl.card_id
    WHERE wsc.deleted_at IS NULL
    GROUP BY substr(rl.reviewed_at, 1, 10)
    ORDER BY date ASC
  `).all() as DailyReviewCount[];

  const dailyAccuracy = db.prepare(`
    SELECT
      substr(rl.reviewed_at, 1, 10) AS date,
      COUNT(*) AS reviewed_count,
      SUM(CASE WHEN rl.rating = 'good' THEN 1 ELSE 0 END) AS good_count,
      CAST(SUM(CASE WHEN rl.rating = 'good' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) AS accuracy
    FROM review_logs rl
    JOIN word_sense_cards wsc ON wsc.id = rl.card_id
    WHERE wsc.deleted_at IS NULL
    GROUP BY substr(rl.reviewed_at, 1, 10)
    ORDER BY date ASC
  `).all() as DailyAccuracy[];

  const tagDistribution = db.prepare(`
    SELECT t.id AS tag_id, t.name, COUNT(DISTINCT wsc.id) AS card_count
    FROM tags t
    JOIN card_tags ct ON ct.tag_id = t.id
    JOIN word_sense_cards wsc ON wsc.id = ct.card_id
    WHERE t.deleted_at IS NULL
      AND wsc.deleted_at IS NULL
    GROUP BY t.id, t.name
    ORDER BY card_count DESC, t.name ASC
  `).all() as TagDistribution[];

  const ratingTrend = db.prepare(`
    SELECT
      substr(rl.reviewed_at, 1, 10) AS date,
      SUM(CASE WHEN rl.rating = 'again' THEN 1 ELSE 0 END) AS again_count,
      SUM(CASE WHEN rl.rating = 'good' THEN 1 ELSE 0 END) AS good_count
    FROM review_logs rl
    JOIN word_sense_cards wsc ON wsc.id = rl.card_id
    WHERE wsc.deleted_at IS NULL
    GROUP BY substr(rl.reviewed_at, 1, 10)
    ORDER BY date ASC
  `).all() as RatingTrend[];

  return {
    totals: {
      total_cards: totals.total_cards ?? 0,
      reviewing_cards: totals.reviewing_cards ?? 0,
      mastered_cards: totals.mastered_cards ?? 0,
      favorite_cards: totals.favorite_cards ?? 0,
    },
    daily_review_counts: dailyReviewCounts,
    daily_accuracy: dailyAccuracy,
    tag_distribution: tagDistribution,
    rating_trend: ratingTrend,
  };
}
