import type { ExportType, ImportExecuteDecisionDto, ImportExecuteResponseDto, ImportScanResponseDto } from '../../shared/types';
import type { SupportedLanguage } from '../../shared/constants';
import { apiBlob, apiFormData } from './client';

export function exportCards(type: ExportType, language?: SupportedLanguage): Promise<Blob> {
  const query = new URLSearchParams({ type });
  if (language) query.set('language', language);
  return apiBlob(`/export?${query.toString()}`);
}

export function scanImport(file: File): Promise<ImportScanResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFormData<ImportScanResponseDto>('/import/scan', formData);
}

export function executeImport(
  file: File,
  decision: ImportExecuteDecisionDto,
  selectedLanguages?: string[],
): Promise<ImportExecuteResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('decisions', JSON.stringify(decision));
  if (selectedLanguages) formData.append('languages', JSON.stringify(selectedLanguages));
  return apiFormData<ImportExecuteResponseDto>('/import/execute', formData);
}
