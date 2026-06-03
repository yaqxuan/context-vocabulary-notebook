import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Database } from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function ensureColumn(db: Database, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initDb(db: Database): void {
  const schemaSql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schemaSql);
  ensureColumn(db, 'fsrs_states', 'elapsed_days', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'fsrs_states', 'scheduled_days', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'fsrs_states', 'learning_steps', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'fsrs_states', 'same_day_retry_at', 'TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS idx_fsrs_same_day_retry_at ON fsrs_states (same_day_retry_at)');

  // Initialize singleton user_settings row (id=1) only if not already present
  const existing = db.prepare('SELECT id FROM user_settings WHERE id = 1').get();
  if (!existing) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_settings (id, interface_language, default_target_language, default_definition_language, daily_review_limit, created_at, updated_at)
      VALUES (1, 'zh-CN', '英语', '中文', 20, ?, ?)
    `).run(now, now);
  }
}
