import type { LocalRecognitionReadinessDto } from '../../shared/types';
import { apiRequest, buildQuery } from './client';

export function getLocalRecognitionReadiness(targetLanguage?: string): Promise<LocalRecognitionReadinessDto> {
  const query = buildQuery({ target_language: targetLanguage });
  return apiRequest<LocalRecognitionReadinessDto>(`/local-recognition/readiness${query ? `?${query}` : ''}`);
}
