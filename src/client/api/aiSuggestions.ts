import type {
  AiSpellingCheckRequestDto,
  AiSpellingCheckResponseDto,
  AiSuggestionRequestDto,
  AiSuggestionResponseDto,
  AiTargetWordLemmaRequestDto,
  AiTargetWordLemmaResponseDto,
} from '../../shared/types';
import { apiRequest } from './client';

export function getAiSuggestion(body: AiSuggestionRequestDto): Promise<AiSuggestionResponseDto> {
  return apiRequest<AiSuggestionResponseDto>('/ai/suggestions', { method: 'POST', json: body });
}

export function getAiTargetWordLemma(body: AiTargetWordLemmaRequestDto): Promise<AiTargetWordLemmaResponseDto> {
  return apiRequest<AiTargetWordLemmaResponseDto>('/ai/target-word-lemma', { method: 'POST', json: body });
}

export function checkAiSpelling(body: AiSpellingCheckRequestDto): Promise<AiSpellingCheckResponseDto> {
  return apiRequest<AiSpellingCheckResponseDto>('/ai/spelling-check', { method: 'POST', json: body });
}
