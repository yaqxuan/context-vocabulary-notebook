import { Rating, fsrs, type Card, type CardInput } from 'ts-fsrs';
import type { ReviewRating } from './constants.js';

export const SCHEDULER_VERSION = 'ts-fsrs@5.4.1';
export const SCHEDULER_PARAMETER_VERSION = 'default-v2';
export const LEGACY_SCHEDULER_PARAMETER_VERSIONS = ['default-v1'] as const;
export const AGAIN_RETRY_COOLDOWN_MS = 10 * 60 * 1000;

export interface SchedulerResult {
  card: Card;
  sameDayRetryAt: string | null;
}

export function scheduleReview(
  card: CardInput,
  reviewedAt: Date,
  rating: ReviewRating,
): SchedulerResult {
  const grade = rating === 'again' ? Rating.Again : Rating.Good;
  return {
    card: fsrs().next(card, reviewedAt, grade).card,
    sameDayRetryAt: rating === 'again'
      ? new Date(reviewedAt.getTime() + AGAIN_RETRY_COOLDOWN_MS).toISOString()
      : null,
  };
}
