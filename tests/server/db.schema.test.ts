import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import { initDb } from '../../src/server/db/init.js';

let db: TestDb;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  destroyTestDb(db);
});

describe('schema: all required tables exist', () => {
  const requiredTables = [
    'word_sense_cards',
    'context_examples',
    'media_files',
    'tags',
    'card_tags',
    'fsrs_states',
    'review_logs',
    'schema_migrations',
    'scheduler_profiles',
    'local_device_identity',
    'sync_card_checkpoints',
    'sync_state',
    'sync_device_cursors',
    'sync_server_config',
    'sync_devices',
    'pairing_sessions',
    'user_settings',
    'ai_configs',
  ];

  for (const tableName of requiredTables) {
    it(`table ${tableName} exists`, () => {
      const row = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ).get(tableName);
      expect(row).toBeTruthy();
    });
  }
});

describe('schema: word_sense_cards columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('word_sense_cards')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('target_word');
    expect(names).toContain('context_meaning');
    expect(names).toContain('target_language');
    expect(names).toContain('definition_language');
    expect(names).toContain('status');
    expect(names).toContain('is_favorite');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
    expect(names).toContain('deleted_at');
  });
});

describe('schema: context_examples columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('context_examples')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('card_id');
    expect(names).toContain('sentence');
    expect(names).toContain('note');
    expect(names).toContain('is_primary');
    expect(names).toContain('sort_order');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
    expect(names).toContain('deleted_at');
  });
});

describe('schema: media_files columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('media_files')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('context_example_id');
    expect(names).toContain('media_type');
    expect(names).toContain('file_name');
    expect(names).toContain('file_path');
    expect(names).toContain('mime_type');
    expect(names).toContain('file_size');
    expect(names).toContain('is_available');
    expect(names).toContain('created_at');
    expect(names).toContain('deleted_at');
  });
});

describe('schema: tags columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('tags')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
    expect(names).toContain('deleted_at');
  });
});

describe('schema: card_tags columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('card_tags')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('card_id');
    expect(names).toContain('tag_id');
    expect(names).toContain('created_at');
  });
});

describe('schema: fsrs_states columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('fsrs_states')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('card_id');
    expect(names).toContain('due_date');
    expect(names).toContain('stability');
    expect(names).toContain('difficulty');
    expect(names).toContain('elapsed_days');
    expect(names).toContain('scheduled_days');
    expect(names).toContain('learning_steps');
    expect(names).toContain('reps');
    expect(names).toContain('lapses');
    expect(names).toContain('state');
    expect(names).toContain('last_reviewed_at');
    expect(names).toContain('same_day_retry_at');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
  });
});

describe('schema: review_logs columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('review_logs')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('card_id');
    expect(names).toContain('rating');
    expect(names).toContain('reviewed_at');
    expect(names).toContain('due_date_before');
    expect(names).toContain('due_date_after');
    expect(names).toContain('created_at');
    expect(names).toContain('device_id');
    expect(names).toContain('device_sequence');
    expect(names).toContain('scheduler_version');
    expect(names).toContain('parameter_version');
    expect(names).toContain('state_before_json');
    expect(names).toContain('state_after_json');
    expect(names).toContain('replay_epoch');
  });

  it('exposes enriched records through the review_events view', () => {
    const view = db.prepare("SELECT name FROM sqlite_master WHERE type='view' AND name='review_events'").get();
    expect(view).toBeTruthy();
  });
});

describe('schema: migrations', () => {
  it('records each migration once', () => {
    initDb(db);
    const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
    expect(rows).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }, { version: 4 }, { version: 5 }]);
  });

  it('creates one active scheduler profile and one local device identity', () => {
    expect(db.prepare('SELECT COUNT(*) AS count FROM scheduler_profiles WHERE is_active = 1').get()).toEqual({ count: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM local_device_identity').get()).toEqual({ count: 1 });
  });
});

describe('schema: user_settings columns', () => {
  it('has expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('user_settings')").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('interface_language');
    expect(names).toContain('default_target_language');
    expect(names).toContain('default_definition_language');
    expect(names).toContain('daily_review_limit');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
  });
});

describe('schema: ai_configs columns', () => {
  it('creates ai_configs table for OpenAI-compatible settings', () => {
    const columns = db.prepare('PRAGMA table_info(ai_configs)').all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('base_url');
    expect(names).toContain('api_key');
    expect(names).toContain('model');
    expect(names).toContain('is_active');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
    expect(names).toContain('deleted_at');

    const indexes = db.prepare('PRAGMA index_list(ai_configs)').all() as Array<{ name: string }>;
    expect(indexes.some((idx) => idx.name === 'idx_ai_configs_active')).toBe(true);
  });
});

describe('schema: singleton user_settings row', () => {
  it('has exactly one settings row with id=1', () => {
    const row = db.prepare('SELECT * FROM user_settings WHERE id = 1').get() as Record<string, unknown> | undefined;
    expect(row).toBeTruthy();
    expect(row!.id).toBe(1);
  });

  it('has correct default interface_language', () => {
    const row = db.prepare('SELECT interface_language FROM user_settings WHERE id = 1').get() as Record<string, unknown>;
    expect(row.interface_language).toBe('英语');
  });

  it('has correct default default_target_language', () => {
    const row = db.prepare('SELECT default_target_language FROM user_settings WHERE id = 1').get() as Record<string, unknown>;
    expect(row.default_target_language).toBe('英语');
  });

  it('has correct default default_definition_language', () => {
    const row = db.prepare('SELECT default_definition_language FROM user_settings WHERE id = 1').get() as Record<string, unknown>;
    expect(row.default_definition_language).toBe('中文');
  });

  it('has a numeric daily_review_limit', () => {
    const row = db.prepare('SELECT daily_review_limit FROM user_settings WHERE id = 1').get() as Record<string, unknown>;
    expect(typeof row.daily_review_limit).toBe('number');
    expect(row.daily_review_limit as number).toBeGreaterThan(0);
  });

  it('settings row is created only once across multiple init calls', () => {
    // Re-running init should not duplicate the row
    initDb(db);
    initDb(db);
    const count = db.prepare('SELECT COUNT(*) as cnt FROM user_settings').get() as { cnt: number };
    expect(count.cnt).toBe(1);
  });
});

describe('schema: required indexes exist', () => {
  it('has fsrs queue indexes on fsrs_states', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='fsrs_states'",
    ).all() as Array<{ name: string }>;
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_fsrs_due_date');
    expect(names).toContain('idx_fsrs_same_day_retry_at');
  });

  it('has idx_tags_name_active unique partial index on tags', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tags'",
    ).all() as Array<{ name: string }>;
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_tags_name_active');
  });

  it('has idx_ctx_card_sort index on context_examples', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='context_examples'",
    ).all() as Array<{ name: string }>;
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_ctx_card_sort');
  });

  it('has card status/favorite indexes on word_sense_cards', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='word_sense_cards'",
    ).all() as Array<{ name: string }>;
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_cards_status');
    expect(names).toContain('idx_cards_is_favorite');
  });

  it('has review_logs indexes for card_id and reviewed_at', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='review_logs'",
    ).all() as Array<{ name: string }>;
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_review_logs_card_id');
    expect(names).toContain('idx_review_logs_reviewed_at');
  });
});
