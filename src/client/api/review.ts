import type { ReviewDueResponseDto, ReviewProgressDto, SubmitReviewBody, SubmitReviewResponseDto } from '../../shared/types';
import { apiRequest, buildQuery, type QueryValue } from './client';

export interface ReviewScopeParams extends Record<string, QueryValue> {
  target_language?: string;
}

export function getDueReview(params: ReviewScopeParams = {}): Promise<ReviewDueResponseDto> {
  const query = buildQuery(params);
  return apiRequest<ReviewDueResponseDto>(`/review/due${query ? `?${query}` : ''}`);
}

export function getReviewProgress(params: ReviewScopeParams = {}): Promise<ReviewProgressDto> {
  const query = buildQuery(params);
  return apiRequest<ReviewProgressDto>(`/review/progress${query ? `?${query}` : ''}`);
}

export function submitReview(cardId: string, body: SubmitReviewBody): Promise<SubmitReviewResponseDto> {
  return apiRequest<SubmitReviewResponseDto>(`/review/${encodeURIComponent(cardId)}`, { method: 'POST', json: body });
}
