import type { CreateTagBody, PaginatedResult, PatchTagBody, TagDto, CardSummaryDto } from '../../shared/types';
import { apiRequest, buildQuery, type QueryValue } from './client';

export function listTags(): Promise<TagDto[]> {
  return apiRequest<TagDto[]>('/tags');
}

export function createTag(body: CreateTagBody): Promise<TagDto> {
  return apiRequest<TagDto>('/tags', { method: 'POST', json: body });
}

export function patchTag(id: string, body: PatchTagBody): Promise<TagDto> {
  return apiRequest<TagDto>(`/tags/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function deleteTag(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface TagCardsParams extends Record<string, QueryValue> {
  search?: string;
  status?: string;
  favorite?: boolean;
  page?: number;
  page_size?: number;
}

export function listCardsByTag(tagId: string, params: TagCardsParams = {}): Promise<PaginatedResult<CardSummaryDto>> {
  const query = buildQuery(params);
  return apiRequest<PaginatedResult<CardSummaryDto>>(`/tags/${encodeURIComponent(tagId)}/cards${query ? `?${query}` : ''}`);
}
