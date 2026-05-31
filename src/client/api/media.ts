import type { MediaDto } from '../../shared/types';
import { apiFormData } from './client';

export function uploadMedia(contextExampleId: string, file: File): Promise<MediaDto> {
  const formData = new FormData();
  formData.set('context_example_id', contextExampleId);
  formData.set('file', file);
  return apiFormData<MediaDto>('/media', formData);
}
