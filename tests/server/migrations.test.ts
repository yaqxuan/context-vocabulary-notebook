import fs from 'node:fs';
import path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { initDb } from '../../src/server/db/init.js';

let db: Database | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
});

describe('database migrations', () => {
  it('upgrades a legacy database without changing its current FSRS state', () => {
    db = new BetterSqlite3(':memory:');
    const schema = fs.readFileSync(path.resolve('src/server/db/schema.sql'), 'utf8');
    db.exec(schema);
    const createdAt = '2026-01-01T00:00:00.000Z';
    const reviewedAt = '2026-02-01T00:00:00.000Z';
    const dueAfter = '2026-02-08T00:00:00.000Z';
    db.prepare(`
      INSERT INTO word_sense_cards
        (id, target_word, context_meaning, target_language, definition_language, created_at, updated_at)
      VALUES ('card-1', 'legacy', '旧记录', '英语', '中文', ?, ?)
    `).run(createdAt, createdAt);
    db.prepare(`
      INSERT INTO fsrs_states
        (id, card_id, due_date, stability, difficulty, reps, state, last_reviewed_at, created_at, updated_at)
      VALUES ('state-1', 'card-1', ?, 4.5, 5.5, 3, 2, ?, ?, ?)
    `).run(dueAfter, reviewedAt, createdAt, reviewedAt);
    db.prepare(`
      INSERT INTO review_logs
        (id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at)
      VALUES ('review-1', 'card-1', 'good', ?, ?, ?, ?)
    `).run(reviewedAt, reviewedAt, dueAfter, reviewedAt);

    initDb(db);
    initDb(db);

    const state = db.prepare('SELECT due_date, stability, reps FROM fsrs_states WHERE card_id = ?').get('card-1');
    expect(state).toEqual({ due_date: dueAfter, stability: 4.5, reps: 3 });
    const event = db.prepare('SELECT * FROM review_events WHERE event_id = ?').get('review-1') as Record<string, unknown>;
    expect(event.device_id).toBe('legacy-pc');
    expect(event.device_sequence).toBe(1);
    expect(event.replay_epoch).toBe(0);
    const checkpoint = db.prepare('SELECT state_json FROM sync_card_checkpoints WHERE card_id = ? AND replay_epoch = 1').get('card-1') as { state_json: string };
    expect(JSON.parse(checkpoint.state_json)).toMatchObject({ due_date: dueAfter, reps: 3 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({ count: 6 });
    const cursorColumns = db.prepare(`PRAGMA table_info('sync_device_cursors')`)
      .all() as Array<{ name: string }>;
    expect(cursorColumns.map((column) => column.name)).toContain('accepted_card_action_sequence');
  });
});
