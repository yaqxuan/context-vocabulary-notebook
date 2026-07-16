import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app.js';
import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import { createContext } from '../../src/server/domain/contexts.js';
import { getDueBubbleWords, getDueQueue, getNextDueAt } from '../../src/server/domain/review.js';
import { addTagToCard, createTag } from '../../src/server/domain/tags.js';

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
  db.prepare("UPDATE user_settings SET interface_language = 'zh-CN', default_target_language = '英语', default_definition_language = '中文', daily_review_limit = 20 WHERE id = 1").run();
});

describe('getDueQueue', () => {
  it('returns cards with status=reviewing and due_date<=now', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    const future = new Date(Date.now() + 3600000).toISOString();

    const card1 = createCard(db, { target_word: 'due_now', context_meaning: '当前到期', target_language: '英语', definition_language: '中文' });
    const card2 = createCard(db, { target_word: 'future', context_meaning: '未来到期', target_language: '英语', definition_language: '中文' });

    // Override due_date for card2 to be in the future
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(future, card2.id);
    // Override due_date for card1 to be in the past
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(past, card1.id);

    const queue = getDueQueue(db);
    const ids = queue.map(c => c.id);
    expect(ids).toContain(card1.id);
    expect(ids).not.toContain(card2.id);
  });

  it('excludes soft-deleted cards', () => {
    const card = createCard(db, { target_word: 'deleted', context_meaning: '已删', target_language: '英语', definition_language: '中文' });
    // card is due (created_at = due_date which is past or now)
    db.prepare("UPDATE word_sense_cards SET deleted_at=? WHERE id=?").run(new Date().toISOString(), card.id);

    const queue = getDueQueue(db);
    const ids = queue.map(c => c.id);
    expect(ids).not.toContain(card.id);
  });

  it('excludes mastered cards from due queue', () => {
    const card = createCard(db, { target_word: 'mastered', context_meaning: '已熟记', target_language: '英语', definition_language: '中文' });
    db.prepare("UPDATE word_sense_cards SET status='mastered' WHERE id=?").run(card.id);

    const queue = getDueQueue(db);
    const ids = queue.map(c => c.id);
    expect(ids).not.toContain(card.id);
  });

  it('filters due cards by target_language', () => {
    const english = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const queue = getDueQueue(db, { target_language: '英语' });

    expect(queue.map((card) => card.id)).toEqual([english.id]);
  });

  it('sorts by due_date ASC, then created_at ASC, then id ASC', () => {
    const past1 = new Date(Date.now() - 3600000).toISOString();
    const past2 = new Date(Date.now() - 1800000).toISOString();
    const past3 = new Date(Date.now() - 900000).toISOString();

    const card1 = createCard(db, { target_word: 'c', context_meaning: '三', target_language: '英语', definition_language: '中文' });
    const card2 = createCard(db, { target_word: 'a', context_meaning: '一', target_language: '英语', definition_language: '中文' });
    const card3 = createCard(db, { target_word: 'b', context_meaning: '二', target_language: '英语', definition_language: '中文' });

    // Set due_dates
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(past2, card1.id);
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(past1, card2.id);
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(past3, card3.id);

    const queue = getDueQueue(db);
    expect(queue[0]!.id).toBe(card2.id); // earliest due_date
    expect(queue[1]!.id).toBe(card1.id);
    expect(queue[2]!.id).toBe(card3.id);
  });

  it('uses created_at as tiebreaker when due_dates are equal', () => {
    const sharedDue = new Date(Date.now() - 3600000).toISOString();

    const card1 = createCard(db, { target_word: 'first', context_meaning: '第一', target_language: '英语', definition_language: '中文' });
    const card2 = createCard(db, { target_word: 'second', context_meaning: '第二', target_language: '英语', definition_language: '中文' });

    // Ensure card1 has earlier created_at than card2
    const earlierCreated = new Date(Date.now() - 10000).toISOString();
    const laterCreated = new Date(Date.now() - 5000).toISOString();
    db.prepare('UPDATE word_sense_cards SET created_at = ? WHERE id = ?').run(earlierCreated, card1.id);
    db.prepare('UPDATE word_sense_cards SET created_at = ? WHERE id = ?').run(laterCreated, card2.id);

    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(sharedDue, card1.id);
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(sharedDue, card2.id);

    // card1 was created earlier, so it should come first in the queue
    const queue = getDueQueue(db);
    const ids = queue.map(c => c.id);
    expect(ids.indexOf(card1.id)).toBeLessThan(ids.indexOf(card2.id));
  });

  it('newly created cards are immediately in the due queue', () => {
    const card = createCard(db, { target_word: 'new', context_meaning: '新建', target_language: '英语', definition_language: '中文' });

    const queue = getDueQueue(db);
    const ids = queue.map(c => c.id);
    expect(ids).toContain(card.id);
  });

  it('reports the earliest future due time when no card is due yet', () => {
    const now = new Date();
    const firstFuture = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const secondFuture = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const first = createCard(db, { target_word: 'soon', context_meaning: '快到期', target_language: '英语', definition_language: '中文' });
    const second = createCard(db, { target_word: 'later', context_meaning: '稍后', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(firstFuture, first.id);
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(secondFuture, second.id);

    expect(getDueQueue(db, { target_language: '英语' })).toEqual([]);
    expect(getNextDueAt(db, { target_language: '英语' }, now)).toBe(firstFuture);
  });

  it('scopes next due time by target_language', () => {
    const now = new Date();
    const englishFuture = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const japaneseFuture = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const english = createCard(db, { target_word: 'soon', context_meaning: '快到期', target_language: '英语', definition_language: '中文' });
    const japanese = createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(englishFuture, english.id);
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(japaneseFuture, japanese.id);

    expect(getNextDueAt(db, { target_language: '日语' }, now)).toBe(japaneseFuture);
  });

  it('returns null when there is no future reviewing card', () => {
    const now = new Date();
    const card = createCard(db, { target_word: 'old', context_meaning: '旧', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(new Date(now.getTime() - 60 * 1000).toISOString(), card.id);

    expect(getNextDueAt(db, { target_language: '英语' }, now)).toBeNull();
  });

  it('returns context summary for due cards', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: card.id, sentence: 'The hotel charges $100 per night.' });

    const queue = getDueQueue(db);
    const found = queue.find(c => c.id === card.id);
    expect(found).toBeTruthy();
    expect(found!.primary_sentence).toBe('The hotel charges $100 per night.');
  });

  it('returns 暂无语境 in context summary when card has no contexts', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const queue = getDueQueue(db);
    const found = queue.find(c => c.id === card.id);
    expect(found).toBeTruthy();
    expect(found!.primary_sentence).toBe('暂无语境');
  });

  it('returns actual primary (is_primary=1) context when one is set', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx1 = createContext(db, { card_id: card.id, sentence: 'First context (primary).' });
    const ctx2 = createContext(db, { card_id: card.id, sentence: 'Second context.' });
    // ctx1 is primary by default; explicitly ensure ctx2 is not
    expect(ctx1.is_primary).toBe(1);
    expect(ctx2.is_primary).toBe(0);

    const queue = getDueQueue(db);
    const found = queue.find(c => c.id === card.id);
    expect(found!.primary_sentence).toBe('First context (primary).');
  });

  it('falls back to earliest-created active context when no is_primary=1 context exists', () => {
    const card = createCard(db, { target_word: 'fallback', context_meaning: '回退', target_language: '英语', definition_language: '中文' });

    // Insert two non-primary contexts with different created_at values (no is_primary=1 set)
    const earlierAt = '2020-01-01T00:00:00.000Z';
    const laterAt   = '2025-01-01T00:00:00.000Z';
    db.prepare(`
      INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
      VALUES ('ctx-early2', ?, 'Earliest created_at sentence.', NULL, 0, 20, ?, ?)
    `).run(card.id, earlierAt, earlierAt);
    db.prepare(`
      INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
      VALUES ('ctx-late2', ?, 'Later created_at sentence.', NULL, 0, 10, ?, ?)
    `).run(card.id, laterAt, laterAt);

    const queue = getDueQueue(db);
    const found = queue.find(c => c.id === card.id);
    expect(found!.primary_sentence).toBe('Earliest created_at sentence.');
  });

  it('uses due_date ASC sorting even when primary_sentence is fetched via single query', () => {
    const past1 = new Date(Date.now() - 7200000).toISOString();
    const past2 = new Date(Date.now() - 3600000).toISOString();

    const cardA = createCard(db, { target_word: 'alpha', context_meaning: '甲', target_language: '英语', definition_language: '中文' });
    const cardB = createCard(db, { target_word: 'beta', context_meaning: '乙', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: cardA.id, sentence: 'Alpha sentence.' });
    createContext(db, { card_id: cardB.id, sentence: 'Beta sentence.' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(past1, cardA.id);
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(past2, cardB.id);

    const queue = getDueQueue(db);
    const ids = queue.map(c => c.id);
    expect(ids.indexOf(cardA.id)).toBeLessThan(ids.indexOf(cardB.id));
    expect(queue.find(c => c.id === cardA.id)!.primary_sentence).toBe('Alpha sentence.');
    expect(queue.find(c => c.id === cardB.id)!.primary_sentence).toBe('Beta sentence.');
  });
});

describe('getDueBubbleWords', () => {
  it('returns at most 20 bubble words with total due count and lightweight fields', () => {
    for (let index = 0; index < 25; index += 1) {
      createCard(db, {
        target_word: `word-${index}`,
        context_meaning: `meaning-${index}`,
        target_language: '英语',
        definition_language: '中文',
      });
    }

    const result = getDueBubbleWords(db, { target_language: '英语' });

    expect(result.items).toHaveLength(20);
    expect(result.total_due_count).toBe(25);
    expect(result.limit).toBe(20);
    expect(result.items[0]).toEqual({
      id: expect.any(String),
      target_word: expect.stringMatching(/^word-\d+$/),
      context_meaning: expect.stringMatching(/^meaning-\d+$/),
      target_language: '英语',
      due_date: expect.any(String),
    });
    expect(result.items.map((item) => item.target_word)).toHaveLength(20);
    expect(Object.keys(result.items[0]!).sort()).toEqual([
      'context_meaning',
      'due_date',
      'id',
      'target_language',
      'target_word',
    ]);
  });

  it('clamps requested bubble word limits to the safe 0..20 range', () => {
    createCard(db, { target_word: 'zero', context_meaning: '零', target_language: '英语', definition_language: '中文' });

    expect(getDueBubbleWords(db, { target_language: '英语' }, -1).items).toHaveLength(0);
    expect(getDueBubbleWords(db, { target_language: '英语' }, Number.NaN).items).toHaveLength(0);
    expect(getDueBubbleWords(db, { target_language: '英语' }, Number.POSITIVE_INFINITY).items).toHaveLength(0);
    expect(getDueBubbleWords(db, { target_language: '英语' }, 99).items).toHaveLength(1);
    expect(getDueBubbleWords(db, { target_language: '英语' }, 99).limit).toBe(20);
  });

  it('scopes bubble words and total due count by target_language', () => {
    const english = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const result = getDueBubbleWords(db, { target_language: '英语' });

    expect(result.total_due_count).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({ id: english.id, target_language: '英语' }),
    ]);
  });

  it('matches due queue ordering for normal due cards before same-day retry cards', () => {
    const retry = createCard(db, { target_word: 'retry', context_meaning: '重试', target_language: '英语', definition_language: '中文' });
    const normal = createCard(db, { target_word: 'normal', context_meaning: '普通', target_language: '英语', definition_language: '中文' });
    const future = createCard(db, { target_word: 'future', context_meaning: '未来', target_language: '英语', definition_language: '中文' });
    const now = new Date();
    const past = new Date(now.getTime() - 3600000).toISOString();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();

    db.prepare('UPDATE fsrs_states SET due_date = ?, same_day_retry_at = ? WHERE card_id = ?').run(tomorrow, now.toISOString(), retry.id);
    db.prepare('UPDATE fsrs_states SET due_date = ?, same_day_retry_at = NULL WHERE card_id = ?').run(past, normal.id);
    db.prepare('UPDATE fsrs_states SET due_date = ?, same_day_retry_at = NULL WHERE card_id = ?').run(tomorrow, future.id);

    const queueIds = getDueQueue(db, { target_language: '英语' }).map((card) => card.id);
    const bubbleIds = getDueBubbleWords(db, { target_language: '英语' }, 20).items.map((card) => card.id);

    expect(queueIds).toEqual([normal.id, retry.id]);
    expect(bubbleIds).toEqual(queueIds);
  });
});

describe('review API', () => {
  it('returns next due card with full primary sentence and visible target word', async () => {
    const card = createCard(db, { target_word: 'charges', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const primary = createContext(db, { card_id: card.id, sentence: 'The hotel charges $100 per night.', note: 'hotel scene' });
    createContext(db, { card_id: card.id, sentence: 'They charge extra for breakfast.' });

    const res = await request(app).get('/api/review/due');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('due');
    expect(res.body.card.id).toBe(card.id);
    expect(res.body.card.target_word).toBe('charges');
    expect(res.body.card.primary_sentence).toBe('The hotel charges $100 per night.');
    expect(res.body.card.primary_sentence).toContain(res.body.card.target_word);
    expect(res.body.card.contexts.map((ctx: { id: string }) => ctx.id)).toContain(primary.id);
  });

  it('defaults due cards to the configured default target language', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const japanese = createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/review/due');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('due');
    expect(res.body.card.id).toBe(japanese.id);
  });

  it('allows due target_language to override the settings default', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    const english = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/review/due').query({ target_language: '英语' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('due');
    expect(res.body.card.id).toBe(english.id);
  });

  it('rejects unsupported due target_language values', async () => {
    const res = await request(app).get('/api/review/due').query({ target_language: 'Klingon' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('target_language must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语');
  });

  it('returns due bubble words DTO scoped to the configured default target language', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const japanese = createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/review/due-bubbles');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        {
          id: japanese.id,
          target_word: '猫',
          context_meaning: 'cat',
          target_language: '日语',
          due_date: expect.any(String),
        },
      ],
      total_due_count: 1,
      limit: 20,
      next_due_at: null,
    });
  });

  it('allows due bubble target_language to override the settings default', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    const english = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/review/due-bubbles').query({ target_language: '英语' });

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      expect.objectContaining({ id: english.id, target_language: '英语' }),
    ]);
    expect(res.body.total_due_count).toBe(1);
  });

  it('rejects unsupported due bubble target_language values', async () => {
    const res = await request(app).get('/api/review/due-bubbles').query({ target_language: 'Klingon' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('target_language must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语');
  });

  it('scopes review progress to the configured default target language', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语', daily_review_limit = 2 WHERE id = 1").run();
    const english = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const japanese = createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    await request(app).post(`/api/review/${english.id}`).send({ rating: 'good' });
    await request(app).post(`/api/review/${japanese.id}`).send({ rating: 'good' });
    const res = await request(app).get('/api/review/progress');

    expect(res.status).toBe(200);
    expect(res.body.reviewed_count).toBe(1);
    expect(res.body.good_count).toBe(1);
    expect(res.body.is_limit_reached).toBe(false);
  });

  it('rejects unsupported progress target_language values', async () => {
    const res = await request(app).get('/api/review/progress').query({ target_language: 'Klingon' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('target_language must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语');
  });

  it('includes card tags in the due response', async () => {
    const card = createCard(db, { target_word: 'tagged', context_meaning: '有标签', target_language: '英语', definition_language: '中文' });
    const tag = createTag(db, { name: 'important' });
    addTagToCard(db, card.id, tag.id);

    const res = await request(app).get('/api/review/due');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('due');
    expect(res.body.card.tags).toEqual([
      expect.objectContaining({ id: tag.id, name: 'important' }),
    ]);
  });

  it('includes card media in the due response', async () => {
    const card = createCard(db, { target_word: 'clip', context_meaning: '片段', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Watch the clip.' });
    db.prepare(`
      INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at)
      VALUES (?, ?, 'video', 'clip.mp4', 'uploads/clip.mp4', 'video/mp4', 128, 1, ?)
    `).run(randomUUID(), ctx.id, new Date().toISOString());

    const res = await request(app).get('/api/review/due');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('due');
    expect(res.body.card.media).toEqual(expect.arrayContaining([
      expect.objectContaining({
        media_type: 'video',
        file_name: 'clip.mp4',
        mime_type: 'video/mp4',
        is_available: 1,
      }),
    ]));
  });

  it('returns zero-task state when no card is due', async () => {
    const card = createCard(db, { target_word: 'future', context_meaning: '未来', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(new Date(Date.now() + 86400000).toISOString(), card.id);

    const res = await request(app).get('/api/review/due');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('empty');
    expect(res.body.message).toBe('今天没有待复习内容');
    expect(res.body.card).toBeNull();
  });

  it('includes next_due_at in empty due responses', async () => {
    const futureDue = new Date(Date.now() + 86400000).toISOString();
    const card = createCard(db, { target_word: 'future', context_meaning: '未来', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(futureDue, card.id);

    const res = await request(app).get('/api/review/due?target_language=英语');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'empty',
      card: null,
      next_due_at: futureDue,
    });
  });

  it('includes next_due_at in due bubble responses', async () => {
    const futureDue = new Date(Date.now() + 86400000).toISOString();
    const card = createCard(db, { target_word: 'future', context_meaning: '未来', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(futureDue, card.id);

    const res = await request(app).get('/api/review/due-bubbles?target_language=英语');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      items: [],
      total_due_count: 0,
      next_due_at: futureDue,
    });
  });

  it('rejects ratings other than Again and Good', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app).post(`/api/review/${card.id}`).send({ rating: 'hard' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('rating must be again or good');
  });

  it('submits Good review, writes log, and updates FSRS state', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const before = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(card.id) as { due_date: string; reps: number; last_reviewed_at: string | null };

    const res = await request(app).post(`/api/review/${card.id}`).send({ rating: 'good' });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe('good');
    expect(res.body.fsrs.reps).toBe(before.reps + 1);
    expect(res.body.fsrs.last_reviewed_at).toBeTruthy();
    expect(res.body.fsrs.due_date).not.toBe(before.due_date);

    const log = db.prepare('SELECT * FROM review_logs WHERE card_id = ?').get(card.id) as { rating: string; due_date_before: string; due_date_after: string; device_id: string; device_sequence: number; scheduler_version: string; state_before_json: string; state_after_json: string };
    expect(log.rating).toBe('good');
    expect(log.due_date_before).toBe(before.due_date);
    expect(log.due_date_after).toBe(res.body.fsrs.due_date);
    expect(log.device_id).toBeTruthy();
    expect(log.device_sequence).toBeGreaterThan(0);
    expect(log.scheduler_version).toBe('ts-fsrs@5.4.1');
    expect(JSON.parse(log.state_before_json)).toHaveProperty('due_date');
    expect(JSON.parse(log.state_after_json)).toHaveProperty('due');
  });

  it('stores FSRS learning step so two Good reviews can graduate a new card', async () => {
    const card = createCard(db, { target_word: 'learn', context_meaning: '学习', target_language: '英语', definition_language: '中文' });
    const first = await request(app).post(`/api/review/${card.id}`).send({ rating: 'good' });
    const firstDue = first.body.fsrs.due_date as string;

    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(new Date(Date.now() - 1000).toISOString(), card.id);
    const second = await request(app).post(`/api/review/${card.id}`).send({ rating: 'good' });

    expect(first.status).toBe(200);
    expect(first.body.fsrs.learning_steps).toBe(1);
    expect(firstDue).toBeTruthy();
    expect(second.status).toBe(200);
    expect(second.body.fsrs.state).toBe(2);
    expect(second.body.fsrs.scheduled_days).toBeGreaterThan(0);
    expect(second.body.fsrs.learning_steps).toBe(0);
  });

  it('does not count Again attempts as reviewed daily progress', async () => {
    db.prepare('UPDATE user_settings SET daily_review_limit = 2 WHERE id = 1').run();
    const card = createCard(db, { target_word: 'repeat', context_meaning: '重复', target_language: '英语', definition_language: '中文' });

    const first = await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });
    const second = await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });

    expect(first.status).toBe(200);
    expect(first.body.progress.reviewed_count).toBe(0);
    expect(second.status).toBe(200);
    expect(second.body.progress.reviewed_count).toBe(0);
    expect(second.body.progress.again_count).toBe(2);
    expect(second.body.progress.is_limit_reached).toBe(false);
  });

  it('places Again cards after normal due cards without overwriting FSRS due_date', async () => {
    const miss = createCard(db, { target_word: 'miss', context_meaning: '错过', target_language: '英语', definition_language: '中文' });
    const other = createCard(db, { target_word: 'other', context_meaning: '其他', target_language: '英语', definition_language: '中文' });

    const again = await request(app).post(`/api/review/${miss.id}`).send({ rating: 'again' });
    const fsrsAfterAgain = db.prepare('SELECT due_date, same_day_retry_at FROM fsrs_states WHERE card_id = ?').get(miss.id) as { due_date: string; same_day_retry_at: string | null };
    const due = await request(app).get('/api/review/due').expect(200);

    expect(again.status).toBe(200);
    expect(fsrsAfterAgain.due_date).toBe(again.body.fsrs.due_date);
    expect(fsrsAfterAgain.due_date).not.toBe(again.body.reviewed_at);
    expect(fsrsAfterAgain.same_day_retry_at).toBe(again.body.reviewed_at);
    expect(due.body.status).toBe('due');
    expect(due.body.card.id).toBe(other.id);
  });

  it('returns an Again card immediately when no normal due cards remain', async () => {
    const card = createCard(db, { target_word: 'miss', context_meaning: '错过', target_language: '英语', definition_language: '中文' });

    await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });
    const due = await request(app).get('/api/review/due').expect(200);

    expect(due.body.status).toBe('due');
    expect(due.body.card.id).toBe(card.id);
  });

  it('clears same-day retry marker after Good', async () => {
    const card = createCard(db, { target_word: 'resolve', context_meaning: '解决', target_language: '英语', definition_language: '中文' });

    await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });
    const good = await request(app).post(`/api/review/${card.id}`).send({ rating: 'good' });
    const fsrs = db.prepare('SELECT same_day_retry_at FROM fsrs_states WHERE card_id = ?').get(card.id) as { same_day_retry_at: string | null };

    expect(good.status).toBe(200);
    expect(fsrs.same_day_retry_at).toBeNull();
  });

  it('submits Again review and keeps new-card lapses from ts-fsrs', async () => {
    const card = createCard(db, { target_word: 'miss', context_meaning: '错过', target_language: '英语', definition_language: '中文' });

    const res = await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe('again');
    expect(res.body.fsrs.reps).toBe(1);
    expect(res.body.fsrs.lapses).toBe(0);
  });

  it('increments lapses for Review-state cards rated Again', async () => {
    const card = createCard(db, { target_word: 'forget', context_meaning: '忘记', target_language: '英语', definition_language: '中文' });
    const lastReviewed = new Date(Date.now() - 86400000).toISOString();
    db.prepare('UPDATE fsrs_states SET due_date = ?, stability = 3, difficulty = 5, reps = 5, lapses = 0, state = 2, last_reviewed_at = ? WHERE card_id = ?')
      .run(new Date(Date.now() - 3600000).toISOString(), lastReviewed, card.id);

    const res = await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });

    expect(res.status).toBe(200);
    expect(res.body.fsrs.reps).toBe(6);
    expect(res.body.fsrs.lapses).toBe(1);
  });

  it('does not submit reviews for mastered cards', async () => {
    const card = createCard(db, { target_word: 'frozen', context_meaning: '冻结', target_language: '英语', definition_language: '中文' });
    db.prepare("UPDATE word_sense_cards SET status='mastered' WHERE id=?").run(card.id);

    const res = await request(app).post(`/api/review/${card.id}`).send({ rating: 'good' });

    expect(res.status).toBe(404);
    expect(db.prepare('SELECT COUNT(*) AS count FROM review_logs WHERE card_id = ?').get(card.id)).toEqual({ count: 0 });
  });

  it('keeps daily limit soft when submitting reviews', async () => {
    db.prepare('UPDATE user_settings SET daily_review_limit = 1 WHERE id = 1').run();
    const first = createCard(db, { target_word: 'one', context_meaning: '一', target_language: '英语', definition_language: '中文' });
    const second = createCard(db, { target_word: 'two', context_meaning: '二', target_language: '英语', definition_language: '中文' });

    await request(app).post(`/api/review/${first.id}`).send({ rating: 'good' });
    const progress = await request(app).get('/api/review/progress');
    const secondReview = await request(app).post(`/api/review/${second.id}`).send({ rating: 'again' });

    expect(progress.body.is_limit_reached).toBe(true);
    expect(secondReview.status).toBe(200);
    expect(secondReview.body.progress.reviewed_count).toBe(1);
    expect(secondReview.body.progress.is_limit_reached).toBe(true);
  });

  it('restores overdue mastered cards to the due queue without resetting FSRS state', async () => {
    const card = createCard(db, { target_word: 'restore', context_meaning: '恢复', target_language: '英语', definition_language: '中文' });
    db.prepare("UPDATE word_sense_cards SET status='mastered' WHERE id=?").run(card.id);
    db.prepare('UPDATE fsrs_states SET due_date = ?, reps = 3 WHERE card_id = ?').run(new Date(Date.now() - 3600000).toISOString(), card.id);

    const masteredDue = await request(app).get('/api/review/due');
    const restore = await request(app).patch(`/api/cards/${card.id}`).send({ status: 'reviewing' });
    const restoredDue = await request(app).get('/api/review/due');
    const fsrs = db.prepare('SELECT reps FROM fsrs_states WHERE card_id = ?').get(card.id) as { reps: number };

    expect(masteredDue.body.status).toBe('empty');
    expect(restore.status).toBe(200);
    expect(restoredDue.body.status).toBe('due');
    expect(restoredDue.body.card.id).toBe(card.id);
    expect(fsrs.reps).toBe(3);
  });
});
