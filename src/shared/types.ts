import type { MediaType, CardStatus } from './constants.js';

// --- Pagination ---

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- Card DTOs ---

export interface CardSummaryDto {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
  status: CardStatus;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

export interface CardDetailDto extends CardSummaryDto {
  contexts: ContextDto[];
  media: MediaDto[];
  tags: TagDto[];
  fsrs: FsrsDto;
}

export interface SuggestionDto {
  id: string;
  target_word: string;
  context_meaning: string;
}

// --- Context DTOs ---

export interface ContextDto {
  id: string;
  card_id: string;
  sentence: string;
  note: string | null;
  is_primary: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// --- Media DTOs ---

export interface MediaDto {
  id: string;
  context_example_id: string;
  media_type: MediaType;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  is_available: number;
  created_at: string;
}

// --- Tag DTOs ---

export interface TagDto {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// --- FSRS DTO ---

export interface FsrsDto {
  due_date: string;
  stability: number | null;
  difficulty: number | null;
  reps: number;
  lapses: number;
  state: number;
  last_reviewed_at: string | null;
}

// --- Request body shapes ---

export interface CreateCardBody {
  // New card mode
  target_word?: string;
  context_meaning?: string;
  target_language?: string;
  definition_language?: string;
  // Append-to-existing mode
  card_id?: string;
  // Shared
  sentence?: string;
  note?: string;
  tag_ids?: string[];
}

export interface PatchCardBody {
  context_meaning?: string;
  is_favorite?: boolean;
  status?: CardStatus;
  tag_ids?: string[];
}

export interface CreateContextBody {
  sentence: string;
  note?: string;
}

export interface PatchContextBody {
  sentence?: string;
  note?: string;
}

export interface CreateTagBody {
  name: string;
}

export interface PatchTagBody {
  name: string;
}

export interface ReviewProgressDto {
  reviewed_count: number;
  again_count: number;
  good_count: number;
  daily_review_limit: number;
  is_limit_reached: boolean;
}

export interface DueReviewCardDto extends CardSummaryDto {
  due_date: string;
  primary_sentence: string;
  contexts: ContextDto[];
}

export type ReviewDueResponseDto =
  | { status: 'due'; card: DueReviewCardDto; progress: ReviewProgressDto }
  | { status: 'empty'; message: string; card: null; progress: ReviewProgressDto };

export interface SubmitReviewBody {
  rating: 'again' | 'good';
}

export interface SubmitReviewResponseDto {
  card_id: string;
  rating: 'again' | 'good';
  reviewed_at: string;
  due_date_before: string;
  due_date_after: string;
  fsrs: FsrsDto;
  progress: ReviewProgressDto;
}

export interface SettingsDto {
  id: 1;
  interface_language: string;
  default_target_language: string;
  default_definition_language: string;
  daily_review_limit: number;
  created_at: string;
  updated_at: string;
}

export interface PatchSettingsBody {
  interface_language?: string;
  default_target_language?: string;
  default_definition_language?: string;
  daily_review_limit?: number;
}

export interface HomeStatisticsDto {
  due_count: number;
  reviewed_today_count: number;
  again_today_count: number;
  good_today_count: number;
  daily_review_limit: number;
  is_daily_target_reached: boolean;
}

export interface StatisticsPageDto {
  totals: {
    total_cards: number;
    reviewing_cards: number;
    mastered_cards: number;
    favorite_cards: number;
  };
  daily_review_counts: Array<{ date: string; count: number }>;
  daily_accuracy: Array<{ date: string; reviewed_count: number; good_count: number; accuracy: number }>;
  tag_distribution: Array<{ tag_id: string; name: string; card_count: number }>;
  rating_trend: Array<{ date: string; again_count: number; good_count: number }>;
}
