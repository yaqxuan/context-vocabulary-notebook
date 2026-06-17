import type {
  ReviewBubbleWordsResponseDto,
  ReviewDueResponseDto,
  ReviewProgressDto,
  SubmitReviewBody,
  SubmitReviewResponseDto,
} from '../../shared/types';
import { apiRequest, buildQuery, type QueryValue } from './client';

export const REVIEW_COMPLETED_EVENT = 'vn:review-completed';

export interface ReviewCompletedEventDetail {
  cardId: string;
  rating: SubmitReviewResponseDto['rating'];
  reviewedAt: string;
}

export interface ReviewScopeParams extends Record<string, QueryValue> {
  target_language?: string;
}

export function getDueReview(params: ReviewScopeParams = {}): Promise<ReviewDueResponseDto> {
  const query = buildQuery(params);
  return apiRequest<ReviewDueResponseDto>(`/review/due${query ? `?${query}` : ''}`);
}

export function getDueReviewBubbles(params: ReviewScopeParams = {}): Promise<ReviewBubbleWordsResponseDto> {
  const query = buildQuery(params);
  return apiRequest<ReviewBubbleWordsResponseDto>(`/review/due-bubbles${query ? `?${query}` : ''}`);
}

export function getReviewProgress(params: ReviewScopeParams = {}): Promise<ReviewProgressDto> {
  const query = buildQuery(params);
  return apiRequest<ReviewProgressDto>(`/review/progress${query ? `?${query}` : ''}`);
}

export function emitReviewCompleted(result: SubmitReviewResponseDto): void {
  if (typeof window === 'undefined' || result.rating !== 'good') {
    return;
  }

  window.dispatchEvent(new CustomEvent<ReviewCompletedEventDetail>(REVIEW_COMPLETED_EVENT, {
    detail: {
      cardId: result.card_id,
      rating: result.rating,
      reviewedAt: result.reviewed_at,
    },
  }));
}

export async function submitReview(cardId: string, body: SubmitReviewBody): Promise<SubmitReviewResponseDto> {
  const result = await apiRequest<SubmitReviewResponseDto>(`/review/${encodeURIComponent(cardId)}`, { method: 'POST', json: body });
  emitReviewCompleted(result);
  return result;
}
