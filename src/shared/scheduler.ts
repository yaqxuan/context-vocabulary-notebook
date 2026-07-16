import { Rating, fsrs, type Card, type CardInput } from 'ts-fsrs';
import type { ReviewRating } from './constants.js';

export const SCHEDULER_VERSION = 'ts-fsrs@5.4.1';
export const SCHEDULER_PARAMETER_VERSION = 'default-v1';

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
    sameDayRetryAt: rating === 'again' ? reviewedAt.toISOString() : null,
  };
}
