import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';

export interface ContextRow {
  id: string;
  card_id: string;
  sentence: string;
  note: string | null;
  is_primary: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateContextInput {
  card_id: string;
  sentence: string;
  note?: string;
}

export interface UpdateContextInput {
  sentence?: string;
  note?: string;
}

export function getContext(db: Database, contextId: string): ContextRow | undefined {
  return db.prepare(
    'SELECT * FROM context_examples WHERE id = ? AND deleted_at IS NULL',
  ).get(contextId) as ContextRow | undefined;
}

export function updateContext(db: Database, contextId: string, input: UpdateContextInput): ContextRow | undefined {
  const current = getContext(db, contextId);
  if (!current) return undefined;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE context_examples
    SET sentence = ?, note = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(
    input.sentence ?? current.sentence,
    input.note !== undefined ? input.note : current.note,
    now,
    contextId,
  );

  return getContext(db, contextId);
}

export function getContextsForCard(db: Database, cardId: string): ContextRow[] {
  return db.prepare(`
    SELECT * FROM context_examples
    WHERE card_id = ? AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `).all(cardId) as ContextRow[];
}

export function createContext(db: Database, input: CreateContextInput): ContextRow {
  const id = randomUUID();
  const now = new Date().toISOString();

  const contextRow = db.transaction((): ContextRow => {
    // Calculate sort_order: MAX(sort_order) + 10 among non-deleted, or 10
    const maxRow = db.prepare(`
      SELECT MAX(sort_order) as max_order
      FROM context_examples
      WHERE card_id = ? AND deleted_at IS NULL
    `).get(input.card_id) as { max_order: number | null };

    const sortOrder = maxRow.max_order !== null ? maxRow.max_order + 10 : 10;

    // First non-deleted context for this card becomes primary
    const existingCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM context_examples WHERE card_id = ? AND deleted_at IS NULL
    `).get(input.card_id) as { cnt: number };

    const isPrimary = existingCount.cnt === 0 ? 1 : 0;

    db.prepare(`
      INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.card_id, input.sentence, input.note ?? null, isPrimary, sortOrder, now, now);

    return db.prepare('SELECT * FROM context_examples WHERE id = ?').get(id) as ContextRow;
  })();

  return contextRow;
}

export function setPrimaryContext(db: Database, contextId: string): void {
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // Get the card_id for this context, but only if it is NOT soft-deleted
    const ctx = db.prepare(
      'SELECT card_id FROM context_examples WHERE id = ? AND deleted_at IS NULL',
    ).get(contextId) as { card_id: string } | undefined;
    if (!ctx) throw new Error(`Context not found or is deleted: ${contextId}`);

    // Clear is_primary for all non-deleted contexts of the same card
    db.prepare(`
      UPDATE context_examples SET is_primary = 0, updated_at = ?
      WHERE card_id = ? AND deleted_at IS NULL
    `).run(now, ctx.card_id);

    // Set the target context as primary (it is already known to be non-deleted)
    db.prepare(`
      UPDATE context_examples SET is_primary = 1, updated_at = ? WHERE id = ? AND deleted_at IS NULL
    `).run(now, contextId);
  });

  transaction();
}

export function deleteContext(db: Database, contextId: string): void {
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // Soft-delete media_files for this context
    db.prepare(`
      UPDATE media_files SET deleted_at = ? WHERE context_example_id = ? AND deleted_at IS NULL
    `).run(now, contextId);

    // Demote is_primary on the context being deleted so no deleted context remains primary
    db.prepare(`
      UPDATE context_examples SET is_primary = 0, deleted_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, contextId);
  });

  transaction();
}

export function getContextSummary(db: Database, cardId: string): string {
  // First, try to get the primary context
  const primaryCtx = db.prepare(`
    SELECT sentence FROM context_examples
    WHERE card_id = ? AND deleted_at IS NULL AND is_primary = 1
    LIMIT 1
  `).get(cardId) as { sentence: string } | undefined;

  if (primaryCtx) return primaryCtx.sentence;

  // Fall back to the earliest active context by created_at
  const fallbackCtx = db.prepare(`
    SELECT sentence FROM context_examples
    WHERE card_id = ? AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  `).get(cardId) as { sentence: string } | undefined;

  if (fallbackCtx) return fallbackCtx.sentence;

  return '暂无语境';
}

export function moveContextUp(db: Database, contextId: string): void {
  const transaction = db.transaction(() => {
    const now = new Date().toISOString();

    const ctx = db.prepare(`
      SELECT id, card_id, sort_order FROM context_examples WHERE id = ? AND deleted_at IS NULL
    `).get(contextId) as { id: string; card_id: string; sort_order: number } | undefined;

    if (!ctx) return;

    // Find the previous active context (closest smaller sort_order)
    const prev = db.prepare(`
      SELECT id, sort_order FROM context_examples
      WHERE card_id = ? AND deleted_at IS NULL AND sort_order < ?
      ORDER BY sort_order DESC
      LIMIT 1
    `).get(ctx.card_id, ctx.sort_order) as { id: string; sort_order: number } | undefined;

    if (!prev) return; // Already first

    // Swap sort_orders
    db.prepare(`
      UPDATE context_examples SET sort_order = ?, updated_at = ? WHERE id = ?
    `).run(prev.sort_order, now, ctx.id);
    db.prepare(`
      UPDATE context_examples SET sort_order = ?, updated_at = ? WHERE id = ?
    `).run(ctx.sort_order, now, prev.id);
  });

  transaction();
}

export function moveContextDown(db: Database, contextId: string): void {
  const transaction = db.transaction(() => {
    const now = new Date().toISOString();

    const ctx = db.prepare(`
      SELECT id, card_id, sort_order FROM context_examples WHERE id = ? AND deleted_at IS NULL
    `).get(contextId) as { id: string; card_id: string; sort_order: number } | undefined;

    if (!ctx) return;

    // Find the next active context (closest larger sort_order)
    const next = db.prepare(`
      SELECT id, sort_order FROM context_examples
      WHERE card_id = ? AND deleted_at IS NULL AND sort_order > ?
      ORDER BY sort_order ASC
      LIMIT 1
    `).get(ctx.card_id, ctx.sort_order) as { id: string; sort_order: number } | undefined;

    if (!next) return; // Already last

    // Swap sort_orders
    db.prepare(`
      UPDATE context_examples SET sort_order = ?, updated_at = ? WHERE id = ?
    `).run(next.sort_order, now, ctx.id);
    db.prepare(`
      UPDATE context_examples SET sort_order = ?, updated_at = ? WHERE id = ?
    `).run(ctx.sort_order, now, next.id);
  });

  transaction();
}
