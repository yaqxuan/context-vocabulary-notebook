import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { CardInput } from 'ts-fsrs';
import type { ReviewRating } from '../../shared/constants.js';
import { SCHEDULER_PARAMETER_VERSION, SCHEDULER_VERSION, scheduleReview } from '../../shared/scheduler.js';
import { getSettings } from './settings.js';

export const REVIEW_BUBBLE_WORD_LIMIT = 20;

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

export interface ReviewBubbleWord {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  due_date: string;
}

export interface ReviewBubbleWordsResult {
  items: ReviewBubbleWord[];
  total_due_count: number;
  limit: number;
}

export interface ReviewScopeOptions {
  target_language?: string;
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

interface DueQueryParts {
  whereClause: string;
  whereParams: unknown[];
  orderByClause: string;
  orderByParams: unknown[];
}

function buildDueQueryParts(options: ReviewScopeOptions = {}): DueQueryParts {
  const now = new Date().toISOString();
  const conditions: string[] = [
    "wsc.status = 'reviewing'",
    'wsc.deleted_at IS NULL',
    `(
        (fs.same_day_retry_at IS NULL AND fs.due_date <= ?)
        OR (fs.same_day_retry_at IS NOT NULL AND fs.same_day_retry_at <= ?)
      )`,
  ];
  const whereParams: unknown[] = [now, now];

  if (options.target_language) {
    conditions.push('wsc.target_language = ?');
    whereParams.push(options.target_language);
  }

  return {
    whereClause: conditions.join(' AND '),
    whereParams,
    orderByClause: `
      CASE WHEN fs.same_day_retry_at IS NOT NULL THEN fs.same_day_retry_at ELSE fs.due_date END ASC,
      wsc.created_at ASC,
      wsc.id ASC
    `,
    orderByParams: [],
  };
}

export function getDueQueue(db: Database, options: ReviewScopeOptions = {}): DueCardRow[] {
  const dueQuery = buildDueQueryParts(options);

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
    WHERE ${dueQuery.whereClause}
    ORDER BY ${dueQuery.orderByClause}
  `).all(...dueQuery.whereParams, ...dueQuery.orderByParams) as DueCardRow[];
}

export function getDueBubbleWords(
  db: Database,
  options: ReviewScopeOptions = {},
  limit = REVIEW_BUBBLE_WORD_LIMIT,
): ReviewBubbleWordsResult {
  const normalizedLimit = Number.isFinite(limit) ? limit : 0;
  const safeLimit = Math.max(0, Math.min(REVIEW_BUBBLE_WORD_LIMIT, Math.floor(normalizedLimit)));
  const dueQuery = buildDueQueryParts(options);
  const countRow = db.prepare(`
    SELECT COUNT(*) AS total_due_count
    FROM word_sense_cards wsc
    JOIN fsrs_states fs ON fs.card_id = wsc.id
    WHERE ${dueQuery.whereClause}
  `).get(...dueQuery.whereParams) as { total_due_count: number };
  const items = db.prepare(`
    SELECT
      wsc.id,
      wsc.target_word,
      wsc.context_meaning,
      wsc.target_language,
      fs.due_date
    FROM word_sense_cards wsc
    JOIN fsrs_states fs ON fs.card_id = wsc.id
    WHERE ${dueQuery.whereClause}
    ORDER BY ${dueQuery.orderByClause}
    LIMIT ?
  `).all(...dueQuery.whereParams, ...dueQuery.orderByParams, safeLimit) as ReviewBubbleWord[];

  return {
    items,
    total_due_count: countRow.total_due_count,
    limit: safeLimit,
  };
}

export function getNextDueCard(db: Database, options: ReviewScopeOptions = {}): DueCardRow | null {
  return getDueQueue(db, options)[0] ?? null;
}

export function getNextDueAt(db: Database, options: ReviewScopeOptions = {}, now = new Date()): string | null {
  const conditions = [
    "wsc.status = 'reviewing'",
    'wsc.deleted_at IS NULL',
    `CASE
      WHEN fs.same_day_retry_at IS NOT NULL THEN fs.same_day_retry_at
      ELSE fs.due_date
    END > ?`,
  ];
  const params: unknown[] = [now.toISOString()];

  if (options.target_language) {
    conditions.push('wsc.target_language = ?');
    params.push(options.target_language);
  }

  const row = db.prepare(`
    SELECT CASE
      WHEN fs.same_day_retry_at IS NOT NULL THEN fs.same_day_retry_at
      ELSE fs.due_date
    END AS next_due_at
    FROM word_sense_cards wsc
    JOIN fsrs_states fs ON fs.card_id = wsc.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY next_due_at ASC, wsc.created_at ASC, wsc.id ASC
    LIMIT 1
  `).get(...params) as { next_due_at: string } | undefined;

  return row?.next_due_at ?? null;
}

export function getDailyReviewProgress(db: Database, now = new Date(), options: ReviewScopeOptions = {}): DailyReviewProgress {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const conditions: string[] = [
    'wsc.deleted_at IS NULL',
    'rl.reviewed_at >= ?',
    'rl.reviewed_at < ?',
  ];
  const params: unknown[] = [start.toISOString(), end.toISOString()];

  if (options.target_language) {
    conditions.push('wsc.target_language = ?');
    params.push(options.target_language);
  }

  const counts = db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN rl.rating = 'good' THEN rl.card_id END) AS reviewed_count,
      SUM(CASE WHEN rl.rating = 'again' THEN 1 ELSE 0 END) AS again_count,
      SUM(CASE WHEN rl.rating = 'good' THEN 1 ELSE 0 END) AS good_count
    FROM review_logs rl
    JOIN word_sense_cards wsc ON wsc.id = rl.card_id
    WHERE ${conditions.join(' AND ')}
  `).get(...params) as { reviewed_count: number; again_count: number | null; good_count: number | null };

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

export function submitReview(db: Database, cardId: string, rating: ReviewRating, reviewedAt = new Date(), options: ReviewScopeOptions = {}): SubmitReviewResult | undefined {
  const reviewedAtIso = reviewedAt.toISOString();

  const transaction = db.transaction(() => {
    const fsrsBefore = db.prepare(`
      SELECT fs.*, wsc.target_language
      FROM fsrs_states fs
      JOIN word_sense_cards wsc ON wsc.id = fs.card_id
      WHERE fs.card_id = ? AND wsc.deleted_at IS NULL AND wsc.status = 'reviewing'
    `).get(cardId) as (FsrsStateRow & { target_language: string }) | undefined;

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

    const scheduled = scheduleReview(cardInput, reviewedAt, rating);
    const next = scheduled.card;
    const dueDateAfter = next.due.toISOString();
    const sameDayRetryAt = scheduled.sameDayRetryAt;

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

    const localDevice = db.prepare(`
      SELECT device_id, next_review_sequence
      FROM local_device_identity
      WHERE id = 1
    `).get() as { device_id: string; next_review_sequence: number };
    db.prepare('UPDATE local_device_identity SET next_review_sequence = next_review_sequence + 1 WHERE id = 1').run();
    db.prepare(`
      INSERT INTO review_logs (
        id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at,
        device_id, device_sequence, recorded_at, received_at, scheduler_version,
        parameter_version, state_before_json, state_after_json, replay_epoch
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      randomUUID(), cardId, rating, reviewedAtIso, fsrsBefore.due_date, dueDateAfter, reviewedAtIso,
      localDevice.device_id, localDevice.next_review_sequence, reviewedAtIso, reviewedAtIso,
      SCHEDULER_VERSION, SCHEDULER_PARAMETER_VERSION, JSON.stringify(fsrsBefore),
      JSON.stringify({ ...next, due: dueDateAfter, last_review: reviewedAtIso, same_day_retry_at: sameDayRetryAt }),
    );

    const fsrsAfter = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(cardId) as FsrsStateRow;

    return {
      card_id: cardId,
      rating,
      reviewed_at: reviewedAtIso,
      due_date_before: fsrsBefore.due_date,
      due_date_after: dueDateAfter,
      fsrs: fsrsAfter,
      progress: getDailyReviewProgress(db, reviewedAt, { target_language: options.target_language ?? fsrsBefore.target_language }),
    };
  });

  return transaction();
}
