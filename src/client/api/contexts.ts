import type { ContextDto, CreateContextBody, PatchContextBody } from '../../shared/types';
import { apiRequest } from './client';

export function createContext(cardId: string, body: CreateContextBody): Promise<ContextDto> {
  return apiRequest<ContextDto>(`/cards/${encodeURIComponent(cardId)}/contexts`, { method: 'POST', json: body });
}

export function patchContext(id: string, body: PatchContextBody): Promise<ContextDto> {
  return apiRequest<ContextDto>(`/contexts/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function deleteContext(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function setPrimaryContext(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}/primary`, { method: 'POST' });
}

export function moveContextUp(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}/move-up`, { method: 'POST' });
}

export function moveContextDown(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}/move-down`, { method: 'POST' });
}
