import type { ReviewRating } from './constants.js';

export const SYNC_PROTOCOL_VERSION = 1;
export const MAX_SYNC_EVENT_BATCH = 500;

export interface SyncReviewEventInput {
  event_id: string;
  card_id: string;
  device_sequence: number;
  rating: ReviewRating;
  reviewed_at: string;
  recorded_at: string;
  scheduler_version: string;
  parameter_version: string;
  due_date_before: string;
  due_date_after: string;
  state_before_json: string | null;
  state_after_json: string | null;
}

export interface SyncEventBatchResult {
  accepted_through: number;
  canonical_revision: number;
  affected_card_ids: string[];
}

export interface SyncMediaManifestItem {
  id: string;
  context_example_id: string;
  media_type: 'video' | 'image' | 'audio';
  file_name: string;
  mime_type: string;
  file_size: number;
  sha256: string | null;
  offline_available: boolean;
  created_at: string;
}

export interface SyncSnapshot {
  protocol_version: 1;
  revision: number;
  generated_at: string;
  cards: Array<Record<string, unknown>>;
  contexts: Array<Record<string, unknown>>;
  tags: Array<Record<string, unknown>>;
  card_tags: Array<Record<string, unknown>>;
  fsrs_states: Array<Record<string, unknown>>;
  scheduler_profile: Record<string, unknown>;
  settings: {
    default_target_language: string;
    default_definition_language: string;
    daily_review_limit: number;
  };
  media: SyncMediaManifestItem[];
}
