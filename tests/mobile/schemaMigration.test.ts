import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import {
  MOBILE_SCHEMA_MIGRATION_VERSION,
  MOBILE_V3_BACKFILL_REVIEW_LANGUAGE,
  MOBILE_V3_CONFIG_COLUMNS,
  MOBILE_V3_REVIEW_COLUMNS,
} from '../../src/mobile/schema.js';

describe('alpha.5 Android database migration', () => {
  it('preserves pairing and outbox rows while adding language state', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE mobile_config (
        id INTEGER PRIMARY KEY, server_id TEXT, credential TEXT, snapshot_revision INTEGER,
        interface_language TEXT, next_card_action_sequence INTEGER
      );
      CREATE TABLE cards (id TEXT PRIMARY KEY, target_language TEXT NOT NULL);
      CREATE TABLE review_outbox (
        event_id TEXT PRIMARY KEY, card_id TEXT NOT NULL, device_sequence INTEGER NOT NULL,
        uploaded INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE mobile_schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO mobile_config VALUES (1, 'pc-1', 'credential-1', 26, '中文', 4);
      INSERT INTO cards VALUES ('known', '日语');
      INSERT INTO review_outbox VALUES ('event-known', 'known', 1, 0);
      INSERT INTO review_outbox VALUES ('event-deleted', 'deleted', 2, 0);
    `);

    for (const column of MOBILE_V3_CONFIG_COLUMNS) db.exec(`ALTER TABLE mobile_config ADD COLUMN ${column.definition}`);
    for (const column of MOBILE_V3_REVIEW_COLUMNS) db.exec(`ALTER TABLE review_outbox ADD COLUMN ${column.definition}`);
    db.exec(MOBILE_V3_BACKFILL_REVIEW_LANGUAGE);
    db.prepare('INSERT INTO mobile_schema_migrations VALUES (?, ?)').run(MOBILE_SCHEMA_MIGRATION_VERSION, new Date().toISOString());

    expect(db.prepare('SELECT server_id, credential, snapshot_revision, interface_language FROM mobile_config').get())
      .toEqual({ server_id: 'pc-1', credential: 'credential-1', snapshot_revision: 26, interface_language: '中文' });
    expect(db.prepare('SELECT event_id, target_language, uploaded FROM review_outbox ORDER BY device_sequence').all())
      .toEqual([
        { event_id: 'event-known', target_language: '日语', uploaded: 0 },
        { event_id: 'event-deleted', target_language: null, uploaded: 0 },
      ]);
    expect(db.prepare('SELECT version FROM mobile_schema_migrations').pluck().get()).toBe(3);
    db.close();
  });
});
