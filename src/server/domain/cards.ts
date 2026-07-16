import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { ensureSyncCheckpoint } from './syncCheckpoints.js';

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

export interface CardListRow extends CardRow {
  primary_sentence: string | null;
  context_count: number;
}

export interface CardSummaryRow extends CardListRow {
  tags: Array<{ id: string; name: string; created_at: string; updated_at: string }>;
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
  target_language?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCardsResult {
  items: CardSummaryRow[];
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

  // INSERT has 5 ? placeholders (FSRS counters start at zero; last_reviewed_at is null)
  const insertFsrs = db.prepare(`
    INSERT INTO fsrs_states (id, card_id, due_date, elapsed_days, scheduled_days, learning_steps, state, reps, lapses, last_reviewed_at, created_at, updated_at)
    VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, NULL, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertCard.run(id, input.target_word, input.context_meaning, input.target_language, input.definition_language, now, now);
    insertFsrs.run(randomUUID(), id, now, now, now);
    ensureSyncCheckpoint(db, id);
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

  if (options.target_language) {
    conditions.push('wsc.target_language = ?');
    params.push(options.target_language);
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
    SELECT
      wsc.*,
      COALESCE(primary_ctx.sentence, fallback_ctx.sentence) as primary_sentence,
      (
        SELECT COUNT(*)
        FROM context_examples ce_count
        WHERE ce_count.card_id = wsc.id AND ce_count.deleted_at IS NULL
      ) as context_count
    FROM word_sense_cards wsc
    LEFT JOIN context_examples primary_ctx
      ON primary_ctx.id = (
        SELECT ce_primary.id
        FROM context_examples ce_primary
        WHERE ce_primary.card_id = wsc.id
          AND ce_primary.is_primary = 1
          AND ce_primary.deleted_at IS NULL
        ORDER BY ce_primary.created_at ASC
        LIMIT 1
      )
    LEFT JOIN context_examples fallback_ctx
      ON fallback_ctx.id = (
        SELECT ce_fallback.id
        FROM context_examples ce_fallback
        WHERE ce_fallback.card_id = wsc.id AND ce_fallback.deleted_at IS NULL
        ORDER BY ce_fallback.created_at ASC
        LIMIT 1
      )
    ${where}
    ORDER BY wsc.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as CardListRow[];

  const tagRows = rows.length === 0
    ? []
    : db.prepare(`
        SELECT ct.card_id, t.id, t.name, t.created_at, t.updated_at
        FROM card_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.card_id IN (${rows.map(() => '?').join(',')})
          AND t.deleted_at IS NULL
        ORDER BY t.name ASC
      `).all(...rows.map((row) => row.id)) as Array<{ card_id: string; id: string; name: string; created_at: string; updated_at: string }>;

  const tagsByCard = new Map<string, Array<{ id: string; name: string; created_at: string; updated_at: string }>>();
  for (const tag of tagRows) {
    const current = tagsByCard.get(tag.card_id) ?? [];
    current.push({ id: tag.id, name: tag.name, created_at: tag.created_at, updated_at: tag.updated_at });
    tagsByCard.set(tag.card_id, current);
  }

  const items = rows.map((row) => ({
    ...row,
    context_count: Number(row.context_count),
    tags: tagsByCard.get(row.id) ?? [],
  }));

  return {
    items,
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

export function getCardSuggestions(db: Database, targetWord: string, targetLanguage?: string): CardRow[] {
  const conditions = ['target_word = ?', 'deleted_at IS NULL'];
  const params: unknown[] = [targetWord];

  if (targetLanguage) {
    conditions.push('target_language = ?');
    params.push(targetLanguage);
  }

  return db.prepare(`
    SELECT * FROM word_sense_cards
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at ASC
  `).all(...params) as CardRow[];
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
