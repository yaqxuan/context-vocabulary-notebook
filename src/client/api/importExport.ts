import type { ExportType, ImportExecuteDecisionDto, ImportExecuteResponseDto, ImportScanResponseDto } from '../../shared/types';
import { apiBlob, apiFormData } from './client';

export function exportCards(type: ExportType): Promise<Blob> {
  return apiBlob(`/export?type=${encodeURIComponent(type)}`);
}

export function scanImport(file: File): Promise<ImportScanResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFormData<ImportScanResponseDto>('/import/scan', formData);
}

export function executeImport(file: File, decision: ImportExecuteDecisionDto): Promise<ImportExecuteResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('decisions', JSON.stringify(decision));
  return apiFormData<ImportExecuteResponseDto>('/import/execute', formData);
}
