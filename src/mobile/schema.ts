export const MOBILE_SCHEMA_MIGRATION_VERSION = 3;

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
