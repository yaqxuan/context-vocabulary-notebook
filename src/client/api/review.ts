import type { ReviewDueResponseDto, ReviewProgressDto, SubmitReviewBody, SubmitReviewResponseDto } from '../../shared/types';
import { apiRequest } from './client';

export function getDueReview(): Promise<ReviewDueResponseDto> {
  return apiRequest<ReviewDueResponseDto>('/review/due');
}

export function getReviewProgress(): Promise<ReviewProgressDto> {
  return apiRequest<ReviewProgressDto>('/review/progress');
}

export function submitReview(cardId: string, body: SubmitReviewBody): Promise<SubmitReviewResponseDto> {
  return apiRequest<SubmitReviewResponseDto>(`/review/${encodeURIComponent(cardId)}`, { method: 'POST', json: body });
}
