import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';

export interface CardRow {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
  status: 'reviewing' | 'mastered';
  is_favorite: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateCardInput {
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
}

export interface ListCardsOptions {
  search?: string;
  status?: 'reviewing' | 'mastered';
  is_favorite?: boolean;
  tag_id?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCardsResult {
  items: CardRow[];
  total: number;
  page: number;
  pageSize: number;
}

export function createCard(db: Database, input: CreateCardInput): CardRow {
  const id = randomUUID();
  const now = new Date().toISOString();

  // INSERT has 7 ? placeholders (status is literal 'reviewing')
  const insertCard = db.prepare(`
    INSERT INTO word_sense_cards (id, target_word, context_meaning, target_language, definition_language, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'reviewing', ?, ?)
  `);

  // INSERT has 5 ? placeholders (state/reps/lapses/last_reviewed_at are literals)
  const insertFsrs = db.prepare(`
    INSERT INTO fsrs_states (id, card_id, due_date, state, reps, lapses, last_reviewed_at, created_at, updated_at)
    VALUES (?, ?, ?, 0, 0, 0, NULL, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertCard.run(id, input.target_word, input.context_meaning, input.target_language, input.definition_language, now, now);
    insertFsrs.run(randomUUID(), id, now, now, now);
  });

  transaction();

  return db.prepare('SELECT * FROM word_sense_cards WHERE id = ?').get(id) as CardRow;
}

export function listCards(db: Database, options: ListCardsOptions): ListCardsResult {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['wsc.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (options.status) {
    conditions.push('wsc.status = ?');
    params.push(options.status);
  }

  if (options.is_favorite !== undefined) {
    conditions.push('wsc.is_favorite = ?');
    params.push(options.is_favorite ? 1 : 0);
  }

  if (options.search) {
    const like = `%${options.search}%`;
    conditions.push(`(
      wsc.target_word LIKE ?
      OR wsc.context_meaning LIKE ?
      OR EXISTS (
        SELECT 1 FROM context_examples ce
        WHERE ce.card_id = wsc.id
          AND ce.deleted_at IS NULL
          AND (ce.sentence LIKE ? OR ce.note LIKE ?)
      )
      OR EXISTS (
        SELECT 1 FROM card_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.card_id = wsc.id
          AND t.deleted_at IS NULL
          AND t.name LIKE ?
      )
    )`);
    params.push(like, like, like, like, like);
  }

  if (options.tag_id) {
    conditions.push('EXISTS (SELECT 1 FROM card_tags ct WHERE ct.card_id = wsc.id AND ct.tag_id = ?)');
    params.push(options.tag_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM word_sense_cards wsc ${where}
  `).get(...params) as { cnt: number };

  const rows = db.prepare(`
    SELECT wsc.* FROM word_sense_cards wsc ${where}
    ORDER BY wsc.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as CardRow[];

  return {
    items: rows,
    total: countRow.cnt,
    page,
    pageSize,
  };
}

export interface UpdateCardInput {
  context_meaning?: string;
  is_favorite?: boolean;
  status?: 'reviewing' | 'mastered';
}

export function getCard(db: Database, cardId: string): CardRow | undefined {
  return db.prepare(
    'SELECT * FROM word_sense_cards WHERE id = ? AND deleted_at IS NULL',
  ).get(cardId) as CardRow | undefined;
}

export function updateCard(db: Database, cardId: string, input: UpdateCardInput): CardRow | undefined {
  const now = new Date().toISOString();
  const current = getCard(db, cardId);
  if (!current) return undefined;

  db.prepare(`
    UPDATE word_sense_cards
    SET context_meaning = ?,
        is_favorite = ?,
        status = ?,
        updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(
    input.context_meaning ?? current.context_meaning,
    input.is_favorite !== undefined ? (input.is_favorite ? 1 : 0) : current.is_favorite,
    input.status ?? current.status,
    now,
    cardId,
  );

  return getCard(db, cardId);
}

export function getCardSuggestions(db: Database, targetWord: string): CardRow[] {
  return db.prepare(`
    SELECT * FROM word_sense_cards
    WHERE target_word = ? AND deleted_at IS NULL
    ORDER BY created_at ASC
  `).all(targetWord) as CardRow[];
}

export function deleteCard(db: Database, cardId: string): void {
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // Soft-delete media_files belonging to contexts of this card
    db.prepare(`
      UPDATE media_files
      SET deleted_at = ?
      WHERE context_example_id IN (
        SELECT id FROM context_examples WHERE card_id = ?
      )
      AND deleted_at IS NULL
    `).run(now, cardId);

    // Soft-delete context_examples
    db.prepare(`
      UPDATE context_examples SET deleted_at = ? WHERE card_id = ? AND deleted_at IS NULL
    `).run(now, cardId);

    // Soft-delete the card itself
    db.prepare(`
      UPDATE word_sense_cards SET deleted_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, cardId);
  });

  transaction();
}
