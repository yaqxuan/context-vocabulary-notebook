import type { ClipAnalysisResponseDto } from '../../shared/types';
import { apiFormData } from './client';

export function analyzeClip(
  file: File,
  targetLanguage?: string,
  definitionLanguage?: string,
): Promise<ClipAnalysisResponseDto> {
  const formData = new FormData();
  formData.set('file', file);
  if (targetLanguage) formData.set('target_language', targetLanguage);
  if (definitionLanguage) formData.set('definition_language', definitionLanguage);
  return apiFormData<ClipAnalysisResponseDto>('/clip-analysis', formData);
}
