import type { Database } from 'better-sqlite3';

export function ensureSyncCheckpoint(db: Database, cardId: string, replayEpoch = 1): void {
  const state = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(cardId) as Record<string, unknown> | undefined;
  if (!state) throw new Error(`Cannot create sync checkpoint without FSRS state: ${cardId}`);
  db.prepare(`
    INSERT OR IGNORE INTO sync_card_checkpoints (card_id, replay_epoch, state_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(cardId, replayEpoch, JSON.stringify(state), new Date().toISOString());
}
