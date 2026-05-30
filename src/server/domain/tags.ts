import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';

export interface TagRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  name: string;
}

export function getTag(db: Database, tagId: string): TagRow | undefined {
  return db.prepare(
    'SELECT * FROM tags WHERE id = ? AND deleted_at IS NULL',
  ).get(tagId) as TagRow | undefined;
}

export function listTags(db: Database): TagRow[] {
  return db.prepare(`
    SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY name ASC
  `).all() as TagRow[];
}

export function createTag(db: Database, input: CreateTagInput): TagRow {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Uniqueness among non-deleted tags is enforced by the partial unique index.
  // The insert will throw a SQLITE_CONSTRAINT error if name already exists in active tags.
  db.prepare(`
    INSERT INTO tags (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, input.name, now, now);

  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow;
}

export function updateTag(db: Database, tagId: string, input: UpdateTagInput): TagRow {
  const now = new Date().toISOString();

  // Will throw if the new name conflicts with another active tag.
  // AND deleted_at IS NULL ensures soft-deleted tags cannot be updated.
  const result = db.prepare(`
    UPDATE tags SET name = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL
  `).run(input.name, now, tagId);

  if (result.changes === 0) {
    throw new Error(`Tag not found or is deleted: ${tagId}`);
  }

  return db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId) as TagRow;
}

export function deleteTag(db: Database, tagId: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?
  `).run(now, now, tagId);
}

export function addTagToCard(db: Database, cardId: string, tagId: string): void {
  const now = new Date().toISOString();
  // PRIMARY KEY (card_id, tag_id) enforces uniqueness; will throw on duplicate
  db.prepare(`
    INSERT INTO card_tags (card_id, tag_id, created_at) VALUES (?, ?, ?)
  `).run(cardId, tagId, now);
}

export function removeTagFromCard(db: Database, cardId: string, tagId: string): void {
  db.prepare(`
    DELETE FROM card_tags WHERE card_id = ? AND tag_id = ?
  `).run(cardId, tagId);
}

export function getCardTags(db: Database, cardId: string): TagRow[] {
  return db.prepare(`
    SELECT t.*
    FROM tags t
    JOIN card_tags ct ON ct.tag_id = t.id
    JOIN word_sense_cards wsc ON wsc.id = ct.card_id
    WHERE ct.card_id = ?
    AND t.deleted_at IS NULL
    AND wsc.deleted_at IS NULL
    ORDER BY t.name ASC
  `).all(cardId) as TagRow[];
}
