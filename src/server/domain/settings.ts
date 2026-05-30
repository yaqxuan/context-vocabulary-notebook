import type { Database } from 'better-sqlite3';

export interface UserSettingsRow {
  id: number;
  interface_language: string;
  default_target_language: string;
  default_definition_language: string;
  daily_review_limit: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsInput {
  interface_language?: string;
  default_target_language?: string;
  default_definition_language?: string;
  daily_review_limit?: number;
}

export function getSettings(db: Database): UserSettingsRow {
  return db.prepare('SELECT * FROM user_settings WHERE id = 1').get() as UserSettingsRow;
}

export function updateSettings(db: Database, input: UpdateSettingsInput): UserSettingsRow {
  const now = new Date().toISOString();
  const current = getSettings(db);

  db.prepare(`
    UPDATE user_settings
    SET
      interface_language = ?,
      default_target_language = ?,
      default_definition_language = ?,
      daily_review_limit = ?,
      updated_at = ?
    WHERE id = 1
  `).run(
    input.interface_language ?? current.interface_language,
    input.default_target_language ?? current.default_target_language,
    input.default_definition_language ?? current.default_definition_language,
    input.daily_review_limit ?? current.daily_review_limit,
    now,
  );

  return getSettings(db);
}
