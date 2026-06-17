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

function response(items: ReviewBubbleWordDto[]): ReviewBubbleWordsResponseDto {
  return {
    items,
    total_due_count: items.length,
    limit: 20,
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
  it('caps at 20 words and splits evenly into left and right lanes', () => {
    const viewModels = splitBubbleWords(Array.from({ length: 25 }, (_, index) => bubbleWord(index)));

    expect(viewModels).toHaveLength(20);
    expect(viewModels.filter((item) => item.side === 'left')).toHaveLength(10);
    expect(viewModels.filter((item) => item.side === 'right')).toHaveLength(10);
    expect(viewModels[0]).toMatchObject({ id: 'card-0', side: 'left', slot: 0, xPercent: 4, topPercent: 7.4, tagWidthRem: 5.05, tiltDegrees: -18, swimDurationSeconds: 6.1, arriveDelaySeconds: 0, swimDelaySeconds: -0, glowDelaySeconds: -0, scale: 0.92, opacity: 0.60, blurPixels: 0 });
    expect(viewModels[1]).toMatchObject({ id: 'card-1', side: 'right', slot: 0, xPercent: 4, topPercent: 7.4, tagWidthRem: 5.05, tiltDegrees: 18, swimDurationSeconds: 6.1, arriveDelaySeconds: 0.054, swimDelaySeconds: -0, glowDelaySeconds: -0, scale: 0.92, opacity: 0.60, blurPixels: 0 });
    expect(viewModels[4]).toMatchObject({ id: 'card-4', side: 'left', slot: 2, xPercent: 7, topPercent: 26.2, tagWidthRem: 5.65, tiltDegrees: -11, swimDurationSeconds: 7, arriveDelaySeconds: 0.216, swimDelaySeconds: -0.48, glowDelaySeconds: -0.32, scale: 0.88, opacity: 0.56, blurPixels: 0 });
    expect(viewModels[18]).toMatchObject({ id: 'card-18', side: 'left', slot: 9, xPercent: 18, topPercent: 91.2, tagWidthRem: 5.25, tiltDegrees: 12 });
    expect(viewModels[19]).toMatchObject({ id: 'card-19', side: 'right', slot: 9, xPercent: 18, topPercent: 91.2, tagWidthRem: 5.25, tiltDegrees: -12 });
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
    expect(bubble?.style.getPropertyValue('--review-bubble-duration')).toBe('6.55s');
    expect(bubble?.style.getPropertyValue('--review-bubble-arrive-delay')).toBe('0.108s');
    expect(bubble?.style.getPropertyValue('--review-bubble-swim-delay')).toBe('-0.24s');
    expect(bubble?.style.getPropertyValue('--review-bubble-glow-delay')).toBe('-0.16s');
    expect(bubble?.style.getPropertyValue('--review-bubble-x')).toBe('16%');
    expect(bubble?.style.getPropertyValue('--review-bubble-width')).toBe('5.35rem');
    expect(bubble?.style.getPropertyValue('--review-bubble-tilt')).toBe('14deg');
    expect(bubble?.style.getPropertyValue('--review-bubble-scale')).toBe('1.04');
    expect(bubble?.style.getPropertyValue('--review-bubble-opacity')).toBe('0.5');
    expect(bubble?.style.getPropertyValue('--review-bubble-blur')).toBe('0.2px');
  });

  it('renders reference-like ambient ornaments only when there are no due items', async () => {
    await renderBackdrop('/', []);

    expect(document.querySelector('.global-review-backdrop__ambient')).toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__constellation')).toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__crystal-card')).toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__glow-orb')).toBeInTheDocument();
    expect(document.querySelector('.review-bubble')).not.toBeInTheDocument();
    expect(document.querySelector('.global-review-backdrop__lanes')).not.toBeInTheDocument();
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
