import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { SCHEDULER_PARAMETER_VERSION, SCHEDULER_VERSION } from '../../shared/scheduler.js';

export const DATABASE_SCHEMA_VERSION = 2;

interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
}

function tableColumns(db: Database, table: string): Set<string> {
  return new Set((db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name));
}

function addColumn(db: Database, table: string, column: string, definition: string): void {
  if (!tableColumns(db, table).has(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateReviewEvents(db: Database): void {
  addColumn(db, 'review_logs', 'device_id', 'TEXT');
  addColumn(db, 'review_logs', 'device_sequence', 'INTEGER');
  addColumn(db, 'review_logs', 'recorded_at', 'TEXT');
  addColumn(db, 'review_logs', 'received_at', 'TEXT');
  addColumn(db, 'review_logs', 'scheduler_version', 'TEXT');
  addColumn(db, 'review_logs', 'parameter_version', 'TEXT');
  addColumn(db, 'review_logs', 'state_before_json', 'TEXT');
  addColumn(db, 'review_logs', 'state_after_json', 'TEXT');
  addColumn(db, 'review_logs', 'replay_epoch', 'INTEGER NOT NULL DEFAULT 0');

  const legacyRows = db.prepare(`
    SELECT id, created_at
    FROM review_logs
    WHERE device_id IS NULL OR device_sequence IS NULL
    ORDER BY reviewed_at ASC, id ASC
  `).all() as Array<{ id: string; created_at: string }>;
  legacyRows.forEach((row, index) => {
    db.prepare(`
      UPDATE review_logs
      SET device_id = 'legacy-pc',
          device_sequence = ?,
          recorded_at = COALESCE(recorded_at, created_at),
          received_at = COALESCE(received_at, created_at),
          scheduler_version = COALESCE(scheduler_version, ?),
          parameter_version = COALESCE(parameter_version, ?),
          replay_epoch = 0
      WHERE id = ?
    `).run(index + 1, SCHEDULER_VERSION, SCHEDULER_PARAMETER_VERSION, row.id);
  });

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_review_logs_device_sequence
      ON review_logs (device_id, device_sequence)
      WHERE device_id IS NOT NULL AND device_sequence IS NOT NULL;

    CREATE TABLE IF NOT EXISTS scheduler_profiles (
      profile_id         TEXT PRIMARY KEY,
      scheduler_version  TEXT NOT NULL,
      parameters_json    TEXT NOT NULL,
      is_active          INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
      created_at         TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduler_profiles_active
      ON scheduler_profiles (is_active) WHERE is_active = 1;

    CREATE TABLE IF NOT EXISTS local_device_identity (
      id                   INTEGER PRIMARY KEY CHECK (id = 1),
      device_id            TEXT NOT NULL UNIQUE,
      next_review_sequence INTEGER NOT NULL DEFAULT 1,
      created_at           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_card_checkpoints (
      card_id       TEXT NOT NULL REFERENCES word_sense_cards (id),
      replay_epoch  INTEGER NOT NULL,
      state_json    TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      PRIMARY KEY (card_id, replay_epoch)
    );
  `);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO scheduler_profiles
      (profile_id, scheduler_version, parameters_json, is_active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(SCHEDULER_PARAMETER_VERSION, SCHEDULER_VERSION, JSON.stringify({ kind: 'library-default' }), now);
  db.prepare(`
    INSERT OR IGNORE INTO local_device_identity
      (id, device_id, next_review_sequence, created_at)
    VALUES (1, ?, 1, ?)
  `).run(randomUUID(), now);

  const states = db.prepare('SELECT * FROM fsrs_states').all() as Array<Record<string, unknown> & { card_id: string }>;
  const insertCheckpoint = db.prepare(`
    INSERT OR IGNORE INTO sync_card_checkpoints (card_id, replay_epoch, state_json, created_at)
    VALUES (?, 1, ?, ?)
  `);
  for (const state of states) insertCheckpoint.run(state.card_id, JSON.stringify(state), now);

  db.exec(`
    DROP VIEW IF EXISTS review_events;
    CREATE VIEW review_events AS
    SELECT
      id AS event_id,
      card_id,
      device_id,
      device_sequence,
      rating,
      reviewed_at,
      COALESCE(recorded_at, created_at) AS recorded_at,
      COALESCE(received_at, created_at) AS received_at,
      scheduler_version,
      parameter_version,
      state_before_json,
      state_after_json,
      replay_epoch,
      due_date_before,
      due_date_after
    FROM review_logs;
  `);
}

const migrations: Migration[] = [
  { version: 2, name: 'review-events-and-scheduler-profile', up: migrateReviewEvents },
];

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      applied_at  TEXT NOT NULL
    );
  `);

  const hasBaseline = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 1').get();
  if (!hasBaseline) {
    db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, ?, ?)')
      .run('baseline-schema', new Date().toISOString());
  }

  for (const migration of migrations) {
    const applied = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(migration.version);
    if (applied) continue;
    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, new Date().toISOString());
    })();
  }
}
