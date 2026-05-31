import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app.js';
import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import { createCard, deleteCard } from '../../src/server/domain/cards.js';
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
  db.prepare('DELETE FROM tags').run();
  db.prepare("UPDATE user_settings SET interface_language = 'zh-CN', default_target_language = '英语', default_definition_language = '中文', daily_review_limit = 20 WHERE id = 1").run();
});

function insertReview(cardId: string, rating: 'again' | 'good', reviewedAt: string): void {
  db.prepare(`
    INSERT INTO review_logs (id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), cardId, rating, reviewedAt, reviewedAt, reviewedAt, reviewedAt);
}

describe('statistics API', () => {
  it('returns action-oriented home counters', async () => {
    db.prepare('UPDATE user_settings SET daily_review_limit = 2 WHERE id = 1').run();
    const due = createCard(db, { target_word: 'due', context_meaning: '到期', target_language: '英语', definition_language: '中文' });
    const future = createCard(db, { target_word: 'future', context_meaning: '未来', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE fsrs_states SET due_date = ? WHERE card_id = ?').run(new Date(Date.now() + 86400000).toISOString(), future.id);
    insertReview(due.id, 'again', new Date().toISOString());
    insertReview(due.id, 'good', new Date().toISOString());

    const res = await request(app).get('/api/statistics/home');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      due_count: 1,
      reviewed_today_count: 2,
      again_today_count: 1,
      good_today_count: 1,
      daily_review_limit: 2,
      is_daily_target_reached: true,
    });
  });

  it('returns statistics page totals, trends, tag distribution, and rating trend', async () => {
    const reviewing = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const mastered = createCard(db, { target_word: 'master', context_meaning: '掌握', target_language: '英语', definition_language: '中文' });
    const deleted = createCard(db, { target_word: 'deleted', context_meaning: '删除', target_language: '英语', definition_language: '中文' });
    db.prepare("UPDATE word_sense_cards SET status='mastered', is_favorite=1 WHERE id=?").run(mastered.id);
    const tag = createTag(db, { name: '美剧' });
    addTagToCard(db, reviewing.id, tag.id);
    addTagToCard(db, mastered.id, tag.id);
    insertReview(reviewing.id, 'good', '2026-04-29T10:00:00.000Z');
    insertReview(reviewing.id, 'good', '2026-05-29T10:00:00.000Z');
    insertReview(mastered.id, 'again', '2026-05-29T11:00:00.000Z');
    insertReview(deleted.id, 'again', '2026-05-29T12:00:00.000Z');
    deleteCard(db, deleted.id);

    const res = await request(app).get('/api/statistics');

    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({
      total_cards: 2,
      reviewing_cards: 1,
      mastered_cards: 1,
      favorite_cards: 1,
    });
    expect(res.body.daily_review_counts).toEqual([
      { date: '2026-04-29', count: 1 },
      { date: '2026-05-29', count: 2 },
    ]);
    expect(res.body.daily_accuracy).toEqual([
      { date: '2026-04-29', reviewed_count: 1, good_count: 1, accuracy: 1 },
      { date: '2026-05-29', reviewed_count: 2, good_count: 1, accuracy: 0.5 },
    ]);
    expect(res.body.tag_distribution).toEqual([{ tag_id: tag.id, name: '美剧', card_count: 2 }]);
    expect(res.body.rating_trend).toEqual([
      { date: '2026-04-29', again_count: 0, good_count: 1 },
      { date: '2026-05-29', again_count: 1, good_count: 1 },
    ]);
    expect(res.body.monthly_review_counts).toEqual([
      { month: '2026-04', count: 1 },
      { month: '2026-05', count: 2 },
    ]);
  });

  it('excludes soft-deleted card review logs from home counters', async () => {
    const active = createCard(db, { target_word: 'active', context_meaning: '有效', target_language: '英语', definition_language: '中文' });
    const deleted = createCard(db, { target_word: 'deleted', context_meaning: '删除', target_language: '英语', definition_language: '中文' });
    insertReview(active.id, 'good', new Date().toISOString());
    insertReview(deleted.id, 'again', new Date().toISOString());
    deleteCard(db, deleted.id);

    const res = await request(app).get('/api/statistics/home');

    expect(res.status).toBe(200);
    expect(res.body.reviewed_today_count).toBe(1);
    expect(res.body.again_today_count).toBe(0);
    expect(res.body.good_today_count).toBe(1);
  });
});
