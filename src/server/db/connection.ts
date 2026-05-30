import BetterSqlite3 from 'better-sqlite3';
import type { Database } from 'better-sqlite3';

export type Db = Database;

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  throw new Error('Database not initialized. Call initConnection() first.');
}

export function initConnection(dbPath: string): Database {
  if (_db) return _db;
  _db = new BetterSqlite3(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

export function closeConnection(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
