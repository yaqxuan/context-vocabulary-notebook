import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';

export interface MediaRow {
  id: string;
  context_example_id: string;
  media_type: 'video' | 'image' | 'audio';
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  is_available: number;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateMediaInput {
  context_example_id: string;
  media_type: 'video' | 'image' | 'audio';
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
}

export function createMedia(db: Database, input: CreateMediaInput): MediaRow {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, input.context_example_id, input.media_type, input.file_name, input.file_path, input.mime_type, input.file_size, now);

  return db.prepare('SELECT * FROM media_files WHERE id = ?').get(id) as MediaRow;
}

export function getMedia(db: Database, mediaId: string): MediaRow | undefined {
  return db.prepare(
    'SELECT * FROM media_files WHERE id = ? AND deleted_at IS NULL',
  ).get(mediaId) as MediaRow | undefined;
}

export function getMediaForContext(db: Database, contextId: string): MediaRow[] {
  return db.prepare(`
    SELECT * FROM media_files
    WHERE context_example_id = ? AND deleted_at IS NULL
    ORDER BY created_at ASC
  `).all(contextId) as MediaRow[];
}

export function getMediaForCard(db: Database, cardId: string): MediaRow[] {
  return db.prepare(`
    SELECT mf.*
    FROM media_files mf
    JOIN context_examples ce ON ce.id = mf.context_example_id
    WHERE ce.card_id = ? AND mf.deleted_at IS NULL
    ORDER BY mf.created_at ASC
  `).all(cardId) as MediaRow[];
}

export function deleteMedia(db: Database, mediaId: string): boolean {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE media_files SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL
  `).run(now, mediaId);
  return result.changes > 0;
}
