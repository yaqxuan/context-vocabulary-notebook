import type { TranscribeMediaResponseDto } from '../../shared/types';
import { apiFormData } from './client';

export function transcribeUpload(file: File, targetLanguage?: string): Promise<TranscribeMediaResponseDto> {
  const formData = new FormData();
  formData.set('file', file);
  if (targetLanguage) formData.set('target_language', targetLanguage);
  return apiFormData<TranscribeMediaResponseDto>('/transcriptions', formData);
}
