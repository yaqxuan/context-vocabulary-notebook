import BetterSqlite3 from 'better-sqlite3';
import type { Database } from 'better-sqlite3';
import { initDb } from './init.js';

export type TestDb = Database;

export function createTestDb(): TestDb {
  // Use in-memory database for isolation
  const db = new BetterSqlite3(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initDb(db);
  return db;
}

export function destroyTestDb(db: TestDb): void {
  db.close();
}
