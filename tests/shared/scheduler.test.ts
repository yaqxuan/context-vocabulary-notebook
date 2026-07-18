import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';

import {
  AGAIN_RETRY_COOLDOWN_MS,
  SCHEDULER_PARAMETER_VERSION,
  scheduleReview,
} from '../../src/shared/scheduler.js';

describe('shared review scheduler', () => {
  it('uses the default-v2 ten-minute Again retry policy', () => {
    const reviewedAt = new Date('2026-07-18T12:34:56.789Z');
    const result = scheduleReview(createEmptyCard(reviewedAt), reviewedAt, 'again');

    expect(SCHEDULER_PARAMETER_VERSION).toBe('default-v2');
    expect(result.sameDayRetryAt).toBe(
      new Date(reviewedAt.getTime() + AGAIN_RETRY_COOLDOWN_MS).toISOString(),
    );
  });

  it('clears the retry marker after Good', () => {
    const reviewedAt = new Date('2026-07-18T12:34:56.789Z');
    expect(scheduleReview(createEmptyCard(reviewedAt), reviewedAt, 'good').sameDayRetryAt).toBeNull();
  });
});
