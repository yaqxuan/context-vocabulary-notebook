import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import {
  createContext,
  deleteContext,
  getContextSummary,
  moveContextDown,
  moveContextUp,
  setPrimaryContext,
} from '../../src/server/domain/contexts.js';
import { createApp } from '../../src/server/app.js';

let db: TestDb;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  db = createTestDb();
  app = createApp(db);
});

afterAll(() => {
  destroyTestDb(db);
});

afterEach(() => {
  db.prepare('DELETE FROM review_logs').run();
  db.prepare('DELETE FROM fsrs_states').run();
  db.prepare('DELETE FROM card_tags').run();
  db.prepare('DELETE FROM media_files').run();
  db.prepare('DELETE FROM context_examples').run();
  db.prepare('DELETE FROM word_sense_cards').run();
});

// ---- Domain tests (preserved from Phase 1) ----

describe('createContext (domain)', () => {
  it('creates a context with sort_order=10 when first context', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'The hotel charges $100.' });

    expect(ctx.sort_order).toBe(10);
  });

  it('sets sort_order to MAX+10 for subsequent contexts', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First sentence.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second sentence.' });
    const ctx3 = createContext(db, { card_id: card.id, sentence: 'Third sentence.' });

    expect(ctx1.sort_order).toBe(10);
    expect(ctx2.sort_order).toBe(20);
    expect(ctx3.sort_order).toBe(30);
  });

  it('sets is_primary=true for the first context of a card', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'The hotel charges $100.' });

    expect(ctx.is_primary).toBe(1);
  });

  it('does not set is_primary=true for the second context', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: card.id, sentence: 'First sentence.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second sentence.' });

    expect(ctx2.is_primary).toBe(0);
  });

  it('stores sentence and optional note', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test sentence.', note: 'Some note' });

    expect(ctx.sentence).toBe('Test sentence.');
    expect(ctx.note).toBe('Some note');
  });
});

describe('setPrimaryContext (domain)', () => {
  it('sets the selected context as primary', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    setPrimaryContext(db, ctx2.id);

    const row2 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx2.id) as { is_primary: number };
    expect(row2.is_primary).toBe(1);
  });

  it('clears other contexts is_primary in same transaction', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });
    const ctx3 = createContext(db, { card_id: card.id, sentence: 'Third.' });

    setPrimaryContext(db, ctx2.id);

    const row1 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx1.id) as { is_primary: number };
    const row3 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx3.id) as { is_primary: number };
    expect(row1.is_primary).toBe(0);
    expect(row3.is_primary).toBe(0);
  });

  it('only clears non-deleted contexts for the same card', () => {
    const card1 = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const card2 = createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });

    const ctx1 = createContext(db, { card_id: card1.id, sentence: 'Charge sentence.' });
    const ctx2 = createContext(db, { card_id: card2.id, sentence: 'Exhaust sentence.' });

    setPrimaryContext(db, ctx1.id);

    const row2 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx2.id) as { is_primary: number };
    expect(row2.is_primary).toBe(1);
  });

  it('throws when target context is soft-deleted', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    deleteContext(db, ctx2.id);

    expect(() => setPrimaryContext(db, ctx2.id)).toThrow();
  });

  it('does not leave a deleted context as primary after setPrimaryContext', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    deleteContext(db, ctx2.id);

    try { setPrimaryContext(db, ctx2.id); } catch { /* expected */ }

    const row2 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx2.id) as { is_primary: number };
    expect(row2.is_primary).toBe(0);

    const row1 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx1.id) as { is_primary: number };
    expect(row1.is_primary).toBe(1);
  });
});

describe('deleteContext (domain)', () => {
  it('soft-deletes the context', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });
    deleteContext(db, ctx.id);

    const row = db.prepare('SELECT deleted_at FROM context_examples WHERE id = ?').get(ctx.id) as { deleted_at: string | null };
    expect(row.deleted_at).toBeTruthy();
  });

  it('soft-deletes associated media_files', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });
    db.prepare('INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      'mf1', ctx.id, 'video', 'test.mp4', '/uploads/test.mp4', 'video/mp4', 1024, 1, new Date().toISOString(),
    );

    deleteContext(db, ctx.id);

    const media = db.prepare('SELECT deleted_at FROM media_files WHERE id = ?').get('mf1') as { deleted_at: string | null };
    expect(media.deleted_at).toBeTruthy();
  });

  it('sets is_primary=0 on the deleted context when it was primary', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Primary context.' });
    expect(ctx.is_primary).toBe(1);

    deleteContext(db, ctx.id);

    const row = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx.id) as { is_primary: number };
    expect(row.is_primary).toBe(0);
  });

  it('does not affect is_primary of other contexts when deleting a non-primary context', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'Primary.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Non-primary.' });
    expect(ctx1.is_primary).toBe(1);
    expect(ctx2.is_primary).toBe(0);

    deleteContext(db, ctx2.id);

    const row1 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx1.id) as { is_primary: number };
    expect(row1.is_primary).toBe(1);
  });

  it('deleting primary promotes earliest remaining context by created_at ASC, id ASC', () => {
    const card = createCard(db, { target_word: 'promote', context_meaning: '晋升', target_language: '英语', definition_language: '中文' });
    const primary = createContext(db, { card_id: card.id, sentence: 'Primary to delete.' });
    expect(primary.is_primary).toBe(1);

    db.prepare(`
      INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
      VALUES ('ctx-earliest', ?, 'Earliest context.', NULL, 0, 20, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')
    `).run(card.id);
    db.prepare(`
      INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
      VALUES ('ctx-later', ?, 'Later context.', NULL, 0, 30, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z')
    `).run(card.id);

    deleteContext(db, primary.id);

    const earliest = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get('ctx-earliest') as { is_primary: number };
    const later = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get('ctx-later') as { is_primary: number };
    expect(earliest.is_primary).toBe(1);
    expect(later.is_primary).toBe(0);
  });

  it('deleting only context leaves no active primary', () => {
    const card = createCard(db, { target_word: 'solo', context_meaning: '独自', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Only context.' });
    expect(ctx.is_primary).toBe(1);

    deleteContext(db, ctx.id);

    const result = db.prepare(`
      SELECT COUNT(*) as cnt FROM context_examples WHERE card_id = ? AND deleted_at IS NULL AND is_primary = 1
    `).get(card.id) as { cnt: number };
    expect(result.cnt).toBe(0);
  });
});

describe('getContextSummary (domain)', () => {
  it('returns the primary context sentence when a primary exists', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: card.id, sentence: 'The hotel charges $100.' });
    createContext(db, { card_id: card.id, sentence: 'Second context.' });

    const summary = getContextSummary(db, card.id);
    expect(summary).toBe('The hotel charges $100.');
  });

  it('returns 暂无语境 when card has no active contexts', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const summary = getContextSummary(db, card.id);
    expect(summary).toBe('暂无语境');
  });

  it('falls back to earliest active context when primary is deleted', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First (primary).' });
    createContext(db, { card_id: card.id, sentence: 'Second.' });

    deleteContext(db, ctx1.id);

    const summary = getContextSummary(db, card.id);
    expect(summary).toBe('Second.');
  });

  it('fallback uses earliest created_at not sort_order when multiple contexts remain', () => {
    const card = createCard(db, { target_word: 'fallback', context_meaning: '测试', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'Primary to delete.' });

    const earlyCreatedAt = '2020-01-01T00:00:00.000Z';
    db.prepare(`
      INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
      VALUES ('ctx-early', ?, 'Earliest created_at, high sort_order.', NULL, 0, 30, ?, ?)
    `).run(card.id, earlyCreatedAt, earlyCreatedAt);

    const lateCreatedAt = '2025-01-01T00:00:00.000Z';
    db.prepare(`
      INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
      VALUES ('ctx-late', ?, 'Latest created_at, low sort_order.', NULL, 0, 20, ?, ?)
    `).run(card.id, lateCreatedAt, lateCreatedAt);

    deleteContext(db, ctx1.id);

    const summary = getContextSummary(db, card.id);
    expect(summary).toBe('Earliest created_at, high sort_order.');
  });

  it('returns 暂无语境 after all contexts are deleted', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'Only context.' });

    deleteContext(db, ctx1.id);

    const summary = getContextSummary(db, card.id);
    expect(summary).toBe('暂无语境');
  });
});

describe('context reordering (domain)', () => {
  it('moveContextUp swaps sort_order with the previous context', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    moveContextUp(db, ctx2.id);

    const row1 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx1.id) as { sort_order: number };
    const row2 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx2.id) as { sort_order: number };
    expect(row2.sort_order).toBe(10);
    expect(row1.sort_order).toBe(20);
  });

  it('moveContextDown swaps sort_order with the next context', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    moveContextDown(db, ctx1.id);

    const row1 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx1.id) as { sort_order: number };
    const row2 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx2.id) as { sort_order: number };
    expect(row1.sort_order).toBe(20);
    expect(row2.sort_order).toBe(10);
  });

  it('moveContextUp does nothing when context is already first', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });

    moveContextUp(db, ctx1.id);

    const row1 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx1.id) as { sort_order: number };
    expect(row1.sort_order).toBe(10);
  });

  it('moveContextDown does nothing when context is already last', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    moveContextDown(db, ctx2.id);

    const row2 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx2.id) as { sort_order: number };
    expect(row2.sort_order).toBe(20);
  });

  it('reorder ignores deleted contexts', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second (deleted).' });
    const ctx3 = createContext(db, { card_id: card.id, sentence: 'Third.' });

    deleteContext(db, ctx2.id);

    moveContextUp(db, ctx3.id);

    const row1 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx1.id) as { sort_order: number };
    const row3 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx3.id) as { sort_order: number };
    expect(row3.sort_order).toBe(10);
    expect(row1.sort_order).toBe(30);
  });
});

// ---- HTTP API tests ----

describe('POST /api/cards/:id/contexts', () => {
  it('adds a context to a card', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app)
      .post(`/api/cards/${card.id}/contexts`)
      .send({ sentence: 'They charge extra for breakfast.' });

    expect(res.status).toBe(201);
    expect(res.body.sentence).toBe('They charge extra for breakfast.');
    expect(res.body.card_id).toBe(card.id);
  });

  it('returns 400 when sentence is missing', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app)
      .post(`/api/cards/${card.id}/contexts`)
      .send({ note: 'no sentence here' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 404 for unknown card', async () => {
    const res = await request(app)
      .post('/api/cards/nonexistent/contexts')
      .send({ sentence: 'Test.' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/contexts/:id', () => {
  it('updates sentence and note', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Original.' });

    const res = await request(app)
      .patch(`/api/contexts/${ctx.id}`)
      .send({ sentence: 'Updated.', note: 'A note.' });

    expect(res.status).toBe(200);
    expect(res.body.sentence).toBe('Updated.');
    expect(res.body.note).toBe('A note.');
  });

  it('ignores non-string note values', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Original.' });

    const res = await request(app)
      .patch(`/api/contexts/${ctx.id}`)
      .send({ note: false });

    expect(res.status).toBe(200);
    expect(res.body.note).toBeNull();
  });

  it('returns 404 for unknown context', async () => {
    const res = await request(app)
      .patch('/api/contexts/nonexistent')
      .send({ sentence: 'Test.' });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/contexts/:id/primary', () => {
  it('sets context as primary', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    const res = await request(app).post(`/api/contexts/${ctx2.id}/primary`);
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx2.id) as { is_primary: number };
    expect(row.is_primary).toBe(1);
    const row1 = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get(ctx1.id) as { is_primary: number };
    expect(row1.is_primary).toBe(0);
  });

  it('returns 404 for deleted context', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'First.' });
    deleteContext(db, ctx.id);

    const res = await request(app).post(`/api/contexts/${ctx.id}/primary`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/contexts/:id/move-up and move-down', () => {
  it('moves context up', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    const res = await request(app).post(`/api/contexts/${ctx2.id}/move-up`);
    expect(res.status).toBe(200);

    const row2 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx2.id) as { sort_order: number };
    expect(row2.sort_order).toBe(10);
  });

  it('moves context down', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First.' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second.' });

    const res = await request(app).post(`/api/contexts/${ctx1.id}/move-down`);
    expect(res.status).toBe(200);

    const row1 = db.prepare('SELECT sort_order FROM context_examples WHERE id = ?').get(ctx1.id) as { sort_order: number };
    expect(row1.sort_order).toBe(20);
  });

  it('returns 404 for unknown context on move-up', async () => {
    const res = await request(app).post('/api/contexts/nonexistent/move-up');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/contexts/:id', () => {
  it('soft-deletes a context', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const res = await request(app).delete(`/api/contexts/${ctx.id}`);
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT deleted_at FROM context_examples WHERE id = ?').get(ctx.id) as { deleted_at: string | null };
    expect(row.deleted_at).toBeTruthy();
  });

  it('returns 404 for unknown context', async () => {
    const res = await request(app).delete('/api/contexts/nonexistent');
    expect(res.status).toBe(404);
  });
});
