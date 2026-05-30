import type { CardDetailDto, CardSummaryDto, ContextDto, CreateCardBody, PaginatedResult, PatchCardBody, SuggestionDto } from '../../shared/types';
import { apiRequest, buildQuery, type QueryValue } from './client';

export interface ListCardsParams extends Record<string, QueryValue> {
  search?: string;
  status?: string;
  favorite?: boolean;
  tag_id?: string;
  page?: number;
  page_size?: number;
}

export function listCards(params: ListCardsParams = {}): Promise<PaginatedResult<CardSummaryDto>> {
  const query = buildQuery(params);
  return apiRequest<PaginatedResult<CardSummaryDto>>(`/cards${query ? `?${query}` : ''}`);
}

export function getCard(id: string): Promise<CardDetailDto> {
  return apiRequest<CardDetailDto>(`/cards/${encodeURIComponent(id)}`);
}

export function getCardSuggestions(targetWord: string): Promise<SuggestionDto[]> {
  const query = buildQuery({ target_word: targetWord });
  return apiRequest<SuggestionDto[]>(`/cards/suggestions?${query}`);
}

export interface CreateCardResponseDto {
  card: CardSummaryDto;
  context: ContextDto;
}

export function createCard(body: CreateCardBody): Promise<CreateCardResponseDto> {
  return apiRequest<CreateCardResponseDto>('/cards', { method: 'POST', json: body });
}

export function patchCard(id: string, body: PatchCardBody): Promise<CardSummaryDto> {
  return apiRequest<CardSummaryDto>(`/cards/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function deleteCard(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/cards/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
