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
  primary_sentence: string | null;
  context_count: number;
  tags: TagDto[];
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
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
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
  media: MediaDto[];
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

export interface AiConfigDto {
  id: string;
  name: string;
  base_url: string;
  model: string;
  // Read DTO mirrors SQLite 0/1; write bodies accept booleans.
  is_active: number;
  has_api_key: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAiConfigBody {
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_active?: boolean;
}

export interface PatchAiConfigBody {
  name?: string;
  base_url?: string;
  api_key?: string;
  model?: string;
  is_active?: boolean;
}

export interface AiModelListRequestDto {
  base_url: string;
  api_key: string;
}

export interface AiModelListResponseDto {
  models: string[];
}

export interface AiSuggestionRequestDto {
  target_word: string;
  sentence: string;
  target_language?: string;
  definition_language?: string;
}

export type AiSuggestionResponseDto =
  | {
      status: 'success';
      meaning_suggestion: string;
      usage_note: string;
    }
  | {
      status: 'none';
      meaning_suggestion: '';
      usage_note: '';
      message: string;
    };

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
  monthly_review_counts: Array<{ month: string; count: number }>;
  tag_distribution: Array<{ tag_id: string; name: string; card_count: number }>;
  rating_trend: Array<{ date: string; again_count: number; good_count: number }>;
}

export type ExportType = 'marked' | 'pure';

export interface ExportCardRecord {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
  created_at: string;
  updated_at: string;
  is_favorite?: number;
  status?: CardStatus;
}

export interface ExportContextRecord {
  id: string;
  card_id: string;
  sentence: string;
  note: string | null;
  is_primary: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExportMediaRecord {
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

export interface ExportTagRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ExportCardTagRecord {
  card_id: string;
  tag_id: string;
  created_at: string;
}

export interface ExportFsrsRecord extends FsrsDto {
  id: string;
  card_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExportReviewLogRecord {
  id: string;
  card_id: string;
  rating: 'again' | 'good';
  reviewed_at: string;
  due_date_before: string;
  due_date_after: string;
  created_at: string;
}

export interface ExportJson {
  schema_version: 1;
  export_type: ExportType;
  exported_at: string;
  cards: ExportCardRecord[];
  contexts: ExportContextRecord[];
  media_files: ExportMediaRecord[];
  tags: ExportTagRecord[];
  card_tags: ExportCardTagRecord[];
  fsrs_states?: ExportFsrsRecord[];
  review_logs?: ExportReviewLogRecord[];
  settings?: SettingsDto;
}

export interface ImportConflictDto {
  import_card_id: string;
  existing_card_id: string;
  target_word: string;
  context_meaning: string;
}

export interface ImportScanResponseDto {
  schema_version: 1;
  export_type: ExportType;
  counts: {
    cards: number;
    contexts: number;
    media_files: number;
    tags: number;
  };
  conflicts: ImportConflictDto[];
  missing_media: string[];
}

export type ImportConflictDecision = 'skip' | 'merge' | 'import_as_new';

export type ImportExecuteDecisionDto =
  | { mode: 'skip_all' }
  | { mode: 'merge_all' }
  | { mode: 'import_all_as_new' }
  | { mode: 'per_item'; items: Array<{ import_card_id: string; decision: ImportConflictDecision }> };

export interface ImportExecuteResponseDto {
  imported_cards: number;
  imported_contexts: number;
  imported_media_files: number;
  skipped_cards: number;
  merged_cards: number;
  missing_media_files: number;
}
