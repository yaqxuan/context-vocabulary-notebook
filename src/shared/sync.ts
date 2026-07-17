import type { ReviewRating } from './constants.js';

export const SYNC_PROTOCOL_VERSION = 1;
export const MAX_SYNC_EVENT_BATCH = 500;
export const MAX_SYNC_CARD_ACTION_BATCH = 500;
export const PAIRING_SESSION_TTL_MS = 5 * 60 * 1000;

export interface SyncCapabilities {
  protocol_version: 1;
  server_id: string;
  server_time: string;
  minimum_client_version: string;
}

export interface PairingPayload {
  protocol_version: 1;
  server_id: string;
  session_id: string;
  secret: string;
  expires_at: string;
  tailscale_url: string | null;
  lan: {
    service_name: string;
    urls: string[];
    spki_sha256: string;
    public_key_spki: string;
  } | null;
}

export type CompactPairingPayload = [
  'cvn-pair-v1',
  string,
  string,
  string,
  string,
  string | null,
  string | null,
  string[] | null,
  string | null,
  string | null,
];

export function encodeCompactPairingPayload(payload: PairingPayload): string {
  return JSON.stringify([
    'cvn-pair-v1',
    payload.server_id,
    payload.session_id,
    payload.secret,
    payload.expires_at,
    payload.tailscale_url,
    payload.lan?.service_name ?? null,
    payload.lan?.urls ?? null,
    payload.lan?.spki_sha256 ?? null,
    payload.lan?.public_key_spki ?? null,
  ] satisfies CompactPairingPayload);
}

export function decodePairingPayloadText(text: string): unknown {
  const value = JSON.parse(text) as unknown;
  if (!Array.isArray(value) || value[0] !== 'cvn-pair-v1') return value;
  if (value.length !== 10) throw new Error('Compact pairing payload is invalid');
  const [, serverId, sessionId, secret, expiresAt, tailscaleUrl, serviceName, urls, pin, publicKey] = value;
  const hasLan = serviceName !== null || urls !== null || pin !== null || publicKey !== null;
  return {
    protocol_version: SYNC_PROTOCOL_VERSION,
    server_id: serverId,
    session_id: sessionId,
    secret,
    expires_at: expiresAt,
    tailscale_url: tailscaleUrl,
    lan: hasLan ? {
      service_name: serviceName,
      urls,
      spki_sha256: pin,
      public_key_spki: publicKey,
    } : null,
  };
}

export interface SignedConnectionProfile {
  profile: {
    protocol_version: 1;
    server_id: string;
    tailscale_url: string | null;
    lan_service_name: string;
    lan_urls: string[];
    lan_spki_sha256: string;
    issued_at: string;
  };
  signature: string;
}

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

export type SyncCardActionInput =
  | {
      action_id: string;
      card_id: string;
      action_sequence: number;
      action: 'set_favorite';
      value: boolean;
      recorded_at: string;
    }
  | {
      action_id: string;
      card_id: string;
      action_sequence: number;
      action: 'mark_mastered';
      value: true;
      recorded_at: string;
    };

export interface SyncCardActionBatchResult {
  accepted_through: number;
  canonical_revision: number;
  affected_card_ids: string[];
  ignored_deleted_card_ids: string[];
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
