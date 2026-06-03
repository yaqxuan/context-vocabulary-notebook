import type { AiSuggestionRequestDto, AiSuggestionResponseDto } from '../../shared/types';
import { apiRequest } from './client';

export function getAiSuggestion(body: AiSuggestionRequestDto): Promise<AiSuggestionResponseDto> {
  return apiRequest<AiSuggestionResponseDto>('/ai/suggestions', { method: 'POST', json: body });
}
