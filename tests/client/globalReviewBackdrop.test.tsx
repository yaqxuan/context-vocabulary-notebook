import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalReviewBackdrop, splitBubbleWords } from '../../src/client/components/GlobalReviewBackdrop';
import { REVIEW_COMPLETED_EVENT, getDueReviewBubbles } from '../../src/client/api/review';
import type { ReviewBubbleWordDto, ReviewBubbleWordsResponseDto } from '../../src/shared/types';

vi.mock('../../src/client/api/review', async () => {
  const actual = await vi.importActual<typeof import('../../src/client/api/review')>('../../src/client/api/review');
  return {
    ...actual,
    getDueReviewBubbles: vi.fn(),
  };
});

function bubbleWord(index: number): ReviewBubbleWordDto {
  return {
    id: `card-${index}`,
    target_word: `word-${index}`,
    context_meaning: `meaning-${index}`,
    target_language: '英语',
    due_date: '2026-01-01T00:00:00Z',
  };
}

function response(items: ReviewBubbleWordDto[], nextDueAt: string | null = null): ReviewBubbleWordsResponseDto {
  return {
    items,
    total_due_count: items.length,
    limit: 20,
    next_due_at: nextDueAt,
  };
}

function mockBubbles(items: ReviewBubbleWordDto[]): void {
  vi.mocked(getDueReviewBubbles).mockResolvedValue(response(items));
}

function deferredResponse() {
  let resolve!: (value: ReviewBubbleWordsResponseDto) => void;
  const promise = new Promise<ReviewBubbleWordsResponseDto>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function renderBackdrop(currentPath: string, items: ReviewBubbleWordDto[] = [bubbleWord(0)]): Promise<void> {
  mockBubbles(items);
  render(<GlobalReviewBackdrop currentPath={currentPath} />);
  await waitFor(() => expect(getDueReviewBubbles).toHaveBeenCalled());
}

function dispatchCompleted(cardId: string, rating: 'again' | 'good' = 'good'): void {
  window.dispatchEvent(new CustomEvent(REVIEW_COMPLETED_EVENT, {
    detail: { cardId, rating, reviewedAt: '2026-01-01T01:00:00Z' },
  }));
}

describe('splitBubbleWords', () => {
  it('caps at 16 words and splits evenly into left and right lanes', () => {
    const viewModels = splitBubbleWords(Array.from({ length: 25 }, (_, index) => bubbleWord(index)));

    expect(viewModels).toHaveLength(16);
    expect(viewModels.filter((item) => item.side === 'left')).toHaveLength(8);
    expect(viewModels.filter((item) => item.side === 'right')).toHaveLength(8);
    expect(viewModels[0]).toMatchObject({ id: 'card-0', side: 'left', slot: 0, xPercent: 4, topPercent: 7.4, tagWidthRem: 5.05, tiltDegrees: -18, swimDurationSeconds: 15.4, arriveDelaySeconds: 0, swimDelaySeconds: -0, glowDelaySeconds: -0, scale: 0.92, opacity: 0.60, blurPixels: 0, wanderX1Rem: -1.7, wanderY2Rem: -3.8 });
    expect(viewModels[1]).toMatchObject({ id: 'card-1', side: 'right', slot: 0, xPercent: 4, topPercent: 7.4, tagWidthRem: 5.05, tiltDegrees: 18, swimDurationSeconds: 16.1, arriveDelaySeconds: 0.054, swimDelaySeconds: -0, glowDelaySeconds: -0, scale: 0.92, opacity: 0.60, blurPixels: 0, wanderX1Rem: 1.7, wanderY2Rem: -3.8 });
    expect(viewModels[4]).toMatchObject({ id: 'card-4', side: 'left', slot: 2, xPercent: 7, topPercent: 26.2, tagWidthRem: 5.65, tiltDegrees: -11, swimDurationSeconds: 17.9, arriveDelaySeconds: 0.216, swimDelaySeconds: -0.48, glowDelaySeconds: -0.32, scale: 0.88, opacity: 0.56, blurPixels: 0 });
    expect(viewModels[14]).toMatchObject({ id: 'card-14', side: 'left', slot: 7, xPercent: 22, topPercent: 76.6, tagWidthRem: 5, tiltDegrees: 9 });
    expect(viewModels[15]).toMatchObject({ id: 'card-15', side: 'right', slot: 7, xPercent: 22, topPercent: 76.6, tagWidthRem: 5, tiltDegrees: -9 });
  });
});

describe('GlobalReviewBackdrop', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders bubbles when due items exist', async () => {
    await renderBackdrop('/', [bubbleWord(0), bubbleWord(1)]);

    expect(screen.getByText('word-0')).toHaveClass('review-bubble__word');
    expect(screen.getByText('word-1')).toHaveClass('review-bubble__word');
    expect(document.querySelectorAll('.review-bubble')).toHaveLength(2);
  });

  it('sets final slot-derived CSS custom property values on bubbles', async () => {
    await renderBackdrop('/', [bubbleWord(0), bubbleWord(1), bubbleWord(2)]);

    const bubble = screen.getByText('word-2').closest<HTMLElement>('.review-bubble');
    expect(bubble).not.toBeNull();
    expect(bubble?.style.getPropertyValue('--review-bubble-top')).toBe('16.3%');
    expect(bubble?.style.getPropertyValue('--review-bubble-duration')).toBe('16.65s');
    expect(bubble?.style.getPropertyValue('--review-bubble-arrive-delay')).toBe('0.108s');
    expect(bubble?.style.getPropertyValue('--review-bubble-swim-delay')).toBe('-0.24s');
    expect(bubble?.style.getPropertyValue('--review-bubble-glow-delay')).toBe('-0.16s');
    expect(bubble?.style.getPropertyValue('--review-bubble-x')).toBe('16%');
    expect(bubble?.style.getPropertyValue('--review-bubble-width')).toBe('5.35rem');
    expect(bubble?.style.getPropertyValue('--review-bubble-tilt')).toBe('14deg');
    expect(bubble?.style.getPropertyValue('--review-bubble-scale')).toBe('1.04');
    expect(bubble?.style.getPropertyValue('--review-bubble-opacity')).toBe('0.5');
    expect(bubble?.style.getPropertyValue('--review-bubble-blur')).toBe('0.2px');
    expect(bubble?.style.getPropertyValue('--review-bubble-wander-x1')).toBe('2.1rem');
    expect(bubble?.style.getPropertyValue('--review-bubble-wander-y3')).toBe('-3.5rem');
  });

  it('renders reference-like ambient ornaments only when there are no due items', async () => {
    await renderBackdrop('/', []);

    expect(document.querySelector('.global-review-backdrop__ambient')).toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__constellation')).toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__crystal-card')).toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__glow-orb')).toBeInTheDocument();
    expect(document.querySelector('.review-bubble')).not.toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__lanes')).toBeInTheDocument();
  });

  it('refreshes bubbles automatically when next_due_at arrives', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    let calls = 0;
    vi.mocked(getDueReviewBubbles).mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(response([], '2026-01-01T12:05:00.000Z'));
      return Promise.resolve(response([{ ...bubbleWord(0), target_word: 'disoriented', context_meaning: '迷失方向的' }], null));
    });

    render(<GlobalReviewBackdrop currentPath="/" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getDueReviewBubbles).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('disoriented')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('disoriented')).toBeInTheDocument();
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(2);
  });

  it('pops and removes a matching completed card on the review path', async () => {
    await renderBackdrop('/review', [bubbleWord(0), bubbleWord(1)]);
    vi.useFakeTimers();

    act(() => dispatchCompleted('card-0'));

    const bubble = screen.getByText('word-0').closest('.review-bubble');
    expect(bubble).toHaveClass('review-bubble--popping');

    act(() => {
      vi.advanceTimersByTime(620);
    });

    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
    expect(screen.getByText('word-1')).toBeInTheDocument();
  });

  it('keeps an Again card visible on the review path', async () => {
    await renderBackdrop('/review', [bubbleWord(0), bubbleWord(1)]);

    act(() => dispatchCompleted('card-0', 'again'));

    expect(screen.getByText('word-0')).toBeInTheDocument();
    expect(document.querySelector('.review-bubble--popping')).not.toBeInTheDocument();
    expect(screen.getByText('word-1')).toBeInTheDocument();
  });

  it('ignores stale initial bubble responses after a card is completed before render', async () => {
    const staleInitialRefresh = deferredResponse();
    vi.mocked(getDueReviewBubbles)
      .mockReturnValueOnce(staleInitialRefresh.promise)
      .mockResolvedValueOnce(response([], null));

    render(<GlobalReviewBackdrop currentPath="/" />);
    await waitFor(() => expect(getDueReviewBubbles).toHaveBeenCalledTimes(1));

    act(() => dispatchCompleted('card-0', 'good'));
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(2);

    await act(async () => {
      staleInitialRefresh.resolve(response([bubbleWord(0)], null));
      await Promise.resolve();
    });

    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
  });

  it('ignores stale bubble refresh responses after a newer refresh completes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    const staleTimerRefresh = deferredResponse();
    const freshCompletionRefresh = deferredResponse();
    vi.mocked(getDueReviewBubbles)
      .mockResolvedValueOnce(response([bubbleWord(0)], '2026-01-01T12:05:00.000Z'))
      .mockReturnValueOnce(staleTimerRefresh.promise)
      .mockReturnValueOnce(freshCompletionRefresh.promise);

    render(<GlobalReviewBackdrop currentPath="/" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('word-0')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(2);

    act(() => dispatchCompleted('card-0', 'good'));
    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(3);

    await act(async () => {
      freshCompletionRefresh.resolve(response([], null));
      await Promise.resolve();
    });

    await act(async () => {
      staleTimerRefresh.resolve(response([bubbleWord(0)], null));
      await Promise.resolve();
    });

    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
  });

  it('suppresses scheduled refreshes while a review bubble is popping', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    vi.mocked(getDueReviewBubbles)
      .mockResolvedValueOnce(response([bubbleWord(0)], '2026-01-01T12:00:00.300Z'))
      .mockResolvedValueOnce(response([], null));

    render(<GlobalReviewBackdrop currentPath="/review" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('word-0')).toBeInTheDocument();

    act(() => dispatchCompleted('card-0', 'good'));
    const poppingBubble = screen.getByText('word-0').closest('.review-bubble');
    expect(poppingBubble).toHaveClass('review-bubble--popping');

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getDueReviewBubbles).toHaveBeenCalledTimes(1);
    expect(poppingBubble).toHaveClass('review-bubble--popping');

    await act(async () => {
      vi.advanceTimersByTime(320);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(2);
  });

  it('ignores stale refresh responses while a review bubble is popping', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    const staleTimerRefresh = deferredResponse();
    vi.mocked(getDueReviewBubbles)
      .mockResolvedValueOnce(response([bubbleWord(0)], '2026-01-01T12:05:00.000Z'))
      .mockReturnValueOnce(staleTimerRefresh.promise)
      .mockResolvedValueOnce(response([], null));

    render(<GlobalReviewBackdrop currentPath="/review" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('word-0')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(2);

    act(() => dispatchCompleted('card-0', 'good'));
    const poppingBubble = screen.getByText('word-0').closest('.review-bubble');
    expect(poppingBubble).toHaveClass('review-bubble--popping');

    await act(async () => {
      staleTimerRefresh.resolve(response([bubbleWord(0)], null));
      await Promise.resolve();
    });

    expect(poppingBubble).toHaveClass('review-bubble--popping');

    await act(async () => {
      vi.advanceTimersByTime(620);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(3);
  });

  it('refreshes next_due_at after the last visible bubble is completed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    let calls = 0;
    vi.mocked(getDueReviewBubbles).mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(response([bubbleWord(0)], null));
      if (calls === 2) return Promise.resolve(response([], '2026-01-01T12:05:00.000Z'));
      return Promise.resolve(response([{ ...bubbleWord(0), target_word: 'word-returned' }], null));
    });

    render(<GlobalReviewBackdrop currentPath="/review" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('word-0')).toBeInTheDocument();
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(1);

    act(() => dispatchCompleted('card-0', 'good'));

    await act(async () => {
      vi.advanceTimersByTime(620);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000 - 620);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('word-returned')).toBeInTheDocument();
    expect(getDueReviewBubbles).toHaveBeenCalledTimes(3);
  });

  it('removes a matching completed Good card without popping outside the review path', async () => {
    await renderBackdrop('/', [bubbleWord(0), bubbleWord(1)]);

    act(() => dispatchCompleted('card-0', 'good'));

    expect(screen.queryByText('word-0')).not.toBeInTheDocument();
    expect(document.querySelector('.review-bubble--popping')).not.toBeInTheDocument();
    expect(screen.getByText('word-1')).toBeInTheDocument();
  });

  it('ignores unrelated completed cards', async () => {
    await renderBackdrop('/review', [bubbleWord(0)]);

    act(() => dispatchCompleted('card-other'));

    expect(screen.getByText('word-0')).toBeInTheDocument();
    expect(document.querySelector('.review-bubble--popping')).not.toBeInTheDocument();
  });

  it('keeps global bubble data stable across route changes without refetching', async () => {
    const firstRequest = deferredResponse();
    vi.mocked(getDueReviewBubbles).mockReturnValueOnce(firstRequest.promise);

    const { rerender } = render(<GlobalReviewBackdrop currentPath="/" />);
    await waitFor(() => expect(getDueReviewBubbles).toHaveBeenCalledTimes(1));

    await act(async () => {
      firstRequest.resolve(response([bubbleWord(0)]));
    });
    expect(screen.getByText('word-0')).toBeInTheDocument();

    rerender(<GlobalReviewBackdrop currentPath="/cards" />);

    expect(getDueReviewBubbles).toHaveBeenCalledTimes(1);
    expect(screen.getByText('word-0')).toBeInTheDocument();
  });

  it('swallows API failures and renders without bubbles', async () => {
    vi.mocked(getDueReviewBubbles).mockRejectedValue(new Error('network down'));

    render(<GlobalReviewBackdrop currentPath="/" />);

    await waitFor(() => expect(getDueReviewBubbles).toHaveBeenCalled());
    expect(document.querySelector('.global-review-backdrop__ambient')).toBeInTheDocument();
    expect(document.querySelector('.review-bubble')).not.toBeInTheDocument();
  });
});
