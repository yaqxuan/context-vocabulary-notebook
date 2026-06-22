const MIN_REVIEW_REFRESH_DELAY_MS = 250;
const MAX_REVIEW_REFRESH_DELAY_MS = 2_147_483_647;

export function scheduleReviewRefreshAt(nextDueAt: string | null, callback: () => void): (() => void) | undefined {
  if (!nextDueAt) return undefined;

  const dueTime = Date.parse(nextDueAt);
  if (!Number.isFinite(dueTime)) return undefined;

  const delay = Math.min(
    Math.max(dueTime - Date.now(), MIN_REVIEW_REFRESH_DELAY_MS),
    MAX_REVIEW_REFRESH_DELAY_MS,
  );

  const timeoutId = window.setTimeout(callback, delay);
  return () => window.clearTimeout(timeoutId);
}
