import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { Rating, fsrs, type CardInput } from 'ts-fsrs';
import type { ReviewRating } from '../../shared/constants.js';
import { getSettings } from './settings.js';

export interface DueCardRow {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
  status: string;
  is_favorite: number;
  created_at: string;
  updated_at: string;
  due_date: string;
  primary_sentence: string;
}

export interface FsrsStateRow {
  id: string;
  card_id: string;
  due_date: string;
  stability: number | null;
  difficulty: number | null;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_reviewed_at: string | null;
  same_day_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReviewProgress {
  reviewed_count: number;
  again_count: number;
  good_count: number;
  daily_review_limit: number;
  is_limit_reached: boolean;
}

export interface SubmitReviewResult {
  card_id: string;
  rating: ReviewRating;
  reviewed_at: string;
  due_date_before: string;
  due_date_after: string;
  fsrs: FsrsStateRow;
  progress: DailyReviewProgress;
}

function startOfLocalDayIso(now: Date): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export function getDueQueue(db: Database): DueCardRow[] {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const todayStart = startOfLocalDayIso(nowDate);

  return db.prepare(`
    SELECT
      wsc.id,
      wsc.target_word,
      wsc.context_meaning,
      wsc.target_language,
      wsc.definition_language,
      wsc.status,
      wsc.is_favorite,
      wsc.created_at,
      wsc.updated_at,
      fs.due_date,
      COALESCE(
        (
          SELECT ce_p.sentence
          FROM context_examples ce_p
          WHERE ce_p.card_id = wsc.id
            AND ce_p.deleted_at IS NULL
            AND ce_p.is_primary = 1
          LIMIT 1
        ),
        (
          SELECT ce_f.sentence
          FROM context_examples ce_f
          WHERE ce_f.card_id = wsc.id
            AND ce_f.deleted_at IS NULL
          ORDER BY ce_f.created_at ASC
          LIMIT 1
        ),
        '暂无语境'
      ) AS primary_sentence
    FROM word_sense_cards wsc
    JOIN fsrs_states fs ON fs.card_id = wsc.id
    WHERE wsc.status = 'reviewing'
      AND wsc.deleted_at IS NULL
      AND (
        fs.due_date <= ?
        OR (fs.same_day_retry_at IS NOT NULL AND fs.same_day_retry_at >= ?)
      )
    ORDER BY
      CASE WHEN fs.same_day_retry_at IS NOT NULL AND fs.same_day_retry_at >= ? THEN 1 ELSE 0 END ASC,
      CASE WHEN fs.same_day_retry_at IS NOT NULL AND fs.same_day_retry_at >= ? THEN fs.same_day_retry_at ELSE fs.due_date END ASC,
      wsc.created_at ASC,
      wsc.id ASC
  `).all(now, todayStart, todayStart, todayStart) as DueCardRow[];
}

export function getNextDueCard(db: Database): DueCardRow | null {
  return getDueQueue(db)[0] ?? null;
}

export function getDailyReviewProgress(db: Database, now = new Date()): DailyReviewProgress {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const counts = db.prepare(`
    SELECT
      COUNT(DISTINCT rl.card_id) AS reviewed_count,
      SUM(CASE WHEN rl.rating = 'again' THEN 1 ELSE 0 END) AS again_count,
      SUM(CASE WHEN rl.rating = 'good' THEN 1 ELSE 0 END) AS good_count
    FROM review_logs rl
    JOIN word_sense_cards wsc ON wsc.id = rl.card_id
    WHERE wsc.deleted_at IS NULL
      AND rl.reviewed_at >= ?
      AND rl.reviewed_at < ?
  `).get(start.toISOString(), end.toISOString()) as { reviewed_count: number; again_count: number | null; good_count: number | null };

  const settings = getSettings(db);
  const reviewedCount = counts.reviewed_count;

  return {
    reviewed_count: reviewedCount,
    again_count: counts.again_count ?? 0,
    good_count: counts.good_count ?? 0,
    daily_review_limit: settings.daily_review_limit,
    is_limit_reached: reviewedCount >= settings.daily_review_limit,
  };
}

export function submitReview(db: Database, cardId: string, rating: ReviewRating, reviewedAt = new Date()): SubmitReviewResult | undefined {
  const reviewedAtIso = reviewedAt.toISOString();
  const grade = rating === 'again' ? Rating.Again : Rating.Good;

  const transaction = db.transaction(() => {
    const fsrsBefore = db.prepare(`
      SELECT fs.*
      FROM fsrs_states fs
      JOIN word_sense_cards wsc ON wsc.id = fs.card_id
      WHERE fs.card_id = ? AND wsc.deleted_at IS NULL AND wsc.status = 'reviewing'
    `).get(cardId) as FsrsStateRow | undefined;

    if (!fsrsBefore) return undefined;

    const cardInput: CardInput = {
      due: fsrsBefore.due_date,
      stability: fsrsBefore.stability ?? 0,
      difficulty: fsrsBefore.difficulty ?? 0,
      elapsed_days: fsrsBefore.elapsed_days,
      scheduled_days: fsrsBefore.scheduled_days,
      learning_steps: fsrsBefore.learning_steps,
      reps: fsrsBefore.reps,
      lapses: fsrsBefore.lapses,
      state: fsrsBefore.state,
      last_review: fsrsBefore.last_reviewed_at,
    };

    const next = fsrs().next(cardInput, reviewedAt, grade).card;
    const dueDateAfter = next.due.toISOString();
    const sameDayRetryAt = rating === 'again' ? reviewedAtIso : null;

    db.prepare(`
      UPDATE fsrs_states
      SET due_date = ?,
          stability = ?,
          difficulty = ?,
          elapsed_days = ?,
          scheduled_days = ?,
          learning_steps = ?,
          reps = ?,
          lapses = ?,
          state = ?,
          last_reviewed_at = ?,
          same_day_retry_at = ?,
          updated_at = ?
      WHERE card_id = ?
    `).run(
      dueDateAfter,
      next.stability,
      next.difficulty,
      next.elapsed_days,
      next.scheduled_days,
      next.learning_steps,
      next.reps,
      next.lapses,
      next.state,
      reviewedAtIso,
      sameDayRetryAt,
      reviewedAtIso,
      cardId,
    );

    db.prepare(`
      INSERT INTO review_logs (id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), cardId, rating, reviewedAtIso, fsrsBefore.due_date, dueDateAfter, reviewedAtIso);

    const fsrsAfter = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(cardId) as FsrsStateRow;

    return {
      card_id: cardId,
      rating,
      reviewed_at: reviewedAtIso,
      due_date_before: fsrsBefore.due_date,
      due_date_after: dueDateAfter,
      fsrs: fsrsAfter,
      progress: getDailyReviewProgress(db, reviewedAt),
    };
  });

  return transaction();
}
