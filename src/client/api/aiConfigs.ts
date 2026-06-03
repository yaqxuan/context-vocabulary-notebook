import type {
  AiConfigDto,
  AiModelListRequestDto,
  AiModelListResponseDto,
  CreateAiConfigBody,
  PatchAiConfigBody,
} from '../../shared/types';
import { apiRequest } from './client';

export function listAiConfigs(): Promise<AiConfigDto[]> {
  return apiRequest<AiConfigDto[]>('/ai-configs');
}

export function listAiModels(body: AiModelListRequestDto): Promise<AiModelListResponseDto> {
  return apiRequest<AiModelListResponseDto>('/ai-configs/models', { method: 'POST', json: body });
}

export function listSavedAiConfigModels(id: string): Promise<AiModelListResponseDto> {
  return apiRequest<AiModelListResponseDto>(`/ai-configs/${encodeURIComponent(id)}/models`);
}

export function createAiConfig(body: CreateAiConfigBody): Promise<AiConfigDto> {
  return apiRequest<AiConfigDto>('/ai-configs', { method: 'POST', json: body });
}

export function patchAiConfig(id: string, body: PatchAiConfigBody): Promise<AiConfigDto> {
  return apiRequest<AiConfigDto>(`/ai-configs/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function setActiveAiConfig(id: string): Promise<AiConfigDto> {
  return apiRequest<AiConfigDto>(`/ai-configs/${encodeURIComponent(id)}/activate`, { method: 'POST' });
}

export function deleteAiConfig(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/ai-configs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
