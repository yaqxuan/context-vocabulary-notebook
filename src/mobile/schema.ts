export const MOBILE_SCHEMA_MIGRATION_VERSION = 4;

export const MOBILE_V3_CONFIG_COLUMNS = [
  { name: 'target_language_override', definition: 'target_language_override TEXT' },
  { name: 'override_base_pc_target_language', definition: 'override_base_pc_target_language TEXT' },
] as const;

export const MOBILE_V3_REVIEW_COLUMNS = [
  { name: 'target_language', definition: 'target_language TEXT' },
] as const;

export const MOBILE_V3_BACKFILL_REVIEW_LANGUAGE = `
  UPDATE review_outbox
  SET target_language = (SELECT target_language FROM cards WHERE cards.id = review_outbox.card_id)
  WHERE target_language IS NULL
`;

export const MOBILE_V4_CONFIG_COLUMNS = [
  { name: 'connection_mode', definition: 'connection_mode TEXT' },
  { name: 'last_successful_transport', definition: 'last_successful_transport TEXT' },
] as const;

export const MOBILE_V4_BACKFILL_AGAIN_COOLDOWN = `
  UPDATE fsrs_states
  SET same_day_retry_at = strftime('%Y-%m-%dT%H:%M:%fZ', same_day_retry_at, '+10 minutes')
  WHERE same_day_retry_at IS NOT NULL
    AND last_reviewed_at IS NOT NULL
    AND same_day_retry_at = last_reviewed_at
`;
