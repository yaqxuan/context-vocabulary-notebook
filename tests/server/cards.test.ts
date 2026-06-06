import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import { createCard, deleteCard, listCards } from '../../src/server/domain/cards.js';
import { createContext } from '../../src/server/domain/contexts.js';
import { addTagToCard, createTag, getCardTags } from '../../src/server/domain/tags.js';
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
  // Clean all cards between tests for isolation
  db.prepare('DELETE FROM review_logs').run();
  db.prepare('DELETE FROM fsrs_states').run();
  db.prepare('DELETE FROM card_tags').run();
  db.prepare('DELETE FROM media_files').run();
  db.prepare('DELETE FROM context_examples').run();
  db.prepare('DELETE FROM word_sense_cards').run();
  db.prepare('DELETE FROM tags').run();
  db.prepare("UPDATE user_settings SET interface_language = 'zh-CN', default_target_language = '英语', default_definition_language = '中文', daily_review_limit = 20 WHERE id = 1").run();
});

describe('createCard (domain)', () => {
  it('creates a card with required fields', () => {
    const card = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });

    expect(card.id).toBeTruthy();
    expect(card.target_word).toBe('charge');
    expect(card.context_meaning).toBe('收费');
    expect(card.status).toBe('reviewing');
    expect(card.is_favorite).toBe(0);
  });

  it('sets status to reviewing on creation', () => {
    const card = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const row = db.prepare('SELECT status FROM word_sense_cards WHERE id = ?').get(card.id) as { status: string };
    expect(row.status).toBe('reviewing');
  });

  it('creates an FSRS state row immediately', () => {
    const card = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const fsrs = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(card.id) as Record<string, unknown>;
    expect(fsrs).toBeTruthy();
  });

  it('initializes FSRS state=0, reps=0, lapses=0, last_reviewed_at=NULL', () => {
    const card = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const fsrs = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(card.id) as Record<string, unknown>;
    expect(fsrs.state).toBe(0);
    expect(fsrs.reps).toBe(0);
    expect(fsrs.lapses).toBe(0);
    expect(fsrs.last_reviewed_at).toBeNull();
  });

  it('sets due_date equal to created_at', () => {
    const card = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const fsrs = db.prepare('SELECT due_date FROM fsrs_states WHERE card_id = ?').get(card.id) as { due_date: string };
    const cardRow = db.prepare('SELECT created_at FROM word_sense_cards WHERE id = ?').get(card.id) as { created_at: string };
    expect(fsrs.due_date).toBe(cardRow.created_at);
  });

  it('generates a unique card id', () => {
    const card1 = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const card2 = createCard(db, {
      target_word: 'charge',
      context_meaning: '指控',
      target_language: '英语',
      definition_language: '中文',
    });
    expect(card1.id).not.toBe(card2.id);
  });
});

describe('listCards (domain)', () => {
  it('returns cards in updated_at DESC order by default', () => {
    const card1 = createCard(db, { target_word: 'alpha', context_meaning: '第一', target_language: '英语', definition_language: '中文' });
    const card2 = createCard(db, { target_word: 'beta', context_meaning: '第二', target_language: '英语', definition_language: '中文' });

    // Ensure distinct updated_at timestamps so ordering is deterministic
    const earlier = new Date(Date.now() - 5000).toISOString();
    const later = new Date(Date.now()).toISOString();
    db.prepare('UPDATE word_sense_cards SET updated_at = ? WHERE id = ?').run(earlier, card1.id);
    db.prepare('UPDATE word_sense_cards SET updated_at = ? WHERE id = ?').run(later, card2.id);

    const result = listCards(db, {});
    expect(result.items.length).toBe(2);
    // beta has later updated_at so should come first in updated_at DESC
    expect(result.items[0]!.target_word).toBe('beta');
    expect(result.items[1]!.target_word).toBe('alpha');
  });

  it('excludes soft-deleted cards', () => {
    const card = createCard(db, { target_word: 'deleted', context_meaning: '已删', target_language: '英语', definition_language: '中文' });
    deleteCard(db, card.id);

    const result = listCards(db, {});
    const ids = result.items.map(c => c.id);
    expect(ids).not.toContain(card.id);
  });

  it('filters by status', () => {
    const card1 = createCard(db, { target_word: 'alpha', context_meaning: '第一', target_language: '英语', definition_language: '中文' });
    db.prepare("UPDATE word_sense_cards SET status='mastered' WHERE id=?").run(card1.id);

    createCard(db, { target_word: 'beta', context_meaning: '第二', target_language: '英语', definition_language: '中文' });

    const reviewingResult = listCards(db, { status: 'reviewing' });
    const masteredResult = listCards(db, { status: 'mastered' });

    expect(reviewingResult.items.length).toBe(1);
    expect(reviewingResult.items[0]!.target_word).toBe('beta');
    expect(masteredResult.items.length).toBe(1);
    expect(masteredResult.items[0]!.target_word).toBe('alpha');
  });

  it('filters by is_favorite', () => {
    createCard(db, { target_word: 'alpha', context_meaning: '第一', target_language: '英语', definition_language: '中文' });
    const card2 = createCard(db, { target_word: 'beta', context_meaning: '第二', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE word_sense_cards SET is_favorite=1 WHERE id=?').run(card2.id);

    const result = listCards(db, { is_favorite: true });
    expect(result.items.length).toBe(1);
    expect(result.items[0]!.target_word).toBe('beta');
  });

  it('filters by target_language', () => {
    const english = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const result = listCards(db, { target_language: '英语' });

    expect(result.total).toBe(1);
    expect(result.items.map((card) => card.id)).toEqual([english.id]);
  });

  it('searches by target_word', () => {
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });

    const result = listCards(db, { search: 'char' });
    expect(result.items.length).toBe(1);
    expect(result.items[0]!.target_word).toBe('charge');
  });

  it('searches by context_meaning', () => {
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });

    const result = listCards(db, { search: '收费' });
    expect(result.items.length).toBe(1);
    expect(result.items[0]!.target_word).toBe('charge');
  });

  it('searches by context sentence', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: card.id, sentence: 'The hotel charges $100 per night.' });
    createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });

    const result = listCards(db, { search: 'hotel' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe(card.id);
  });

  it('searches by context note', () => {
    const card = createCard(db, { target_word: 'awkward', context_meaning: '尴尬', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: card.id, sentence: 'That was awkward.', note: 'Friends scene note' });
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const result = listCards(db, { search: 'Friends' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe(card.id);
  });

  it('searches by tag name without duplicating cards', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tag = createTag(db, { name: '美剧' });
    addTagToCard(db, card.id, tag.id);
    createContext(db, { card_id: card.id, sentence: 'The hotel charges $100.' });
    createContext(db, { card_id: card.id, sentence: 'They charge extra.' });

    const result = listCards(db, { search: '美剧' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe(card.id);
  });

  it('paginates correctly', () => {
    for (let i = 0; i < 5; i++) {
      createCard(db, { target_word: `word${i}`, context_meaning: `意思${i}`, target_language: '英语', definition_language: '中文' });
    }

    const page1 = listCards(db, { page: 1, pageSize: 2 });
    const page2 = listCards(db, { page: 2, pageSize: 2 });
    const page3 = listCards(db, { page: 3, pageSize: 2 });

    expect(page1.items.length).toBe(2);
    expect(page2.items.length).toBe(2);
    expect(page3.items.length).toBe(1);
    expect(page1.total).toBe(5);
  });
});

describe('deleteCard (domain)', () => {
  it('soft-deletes the card', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    deleteCard(db, card.id);

    const row = db.prepare('SELECT deleted_at FROM word_sense_cards WHERE id = ?').get(card.id) as { deleted_at: string | null };
    expect(row.deleted_at).toBeTruthy();
  });

  it('soft-deletes associated context_examples', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    db.prepare('INSERT INTO context_examples (id, card_id, sentence, is_primary, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'ctx1', card.id, 'The hotel charges $100.', 1, 10, new Date().toISOString(), new Date().toISOString(),
    );

    deleteCard(db, card.id);

    const ctx = db.prepare('SELECT deleted_at FROM context_examples WHERE card_id = ?').get(card.id) as { deleted_at: string | null };
    expect(ctx.deleted_at).toBeTruthy();
  });

  it('soft-deletes associated media_files via context cascade', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    db.prepare('INSERT INTO context_examples (id, card_id, sentence, is_primary, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'ctx1', card.id, 'The hotel charges $100.', 1, 10, new Date().toISOString(), new Date().toISOString(),
    );
    db.prepare('INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      'mf1', 'ctx1', 'video', 'test.mp4', '/uploads/test.mp4', 'video/mp4', 1024, 1, new Date().toISOString(),
    );

    deleteCard(db, card.id);

    const media = db.prepare('SELECT deleted_at FROM media_files WHERE id = ?').get('mf1') as { deleted_at: string | null };
    expect(media.deleted_at).toBeTruthy();
  });

  it('does not delete review_logs when card is soft-deleted', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const now = new Date().toISOString();
    db.prepare('INSERT INTO review_logs (id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'log1', card.id, 'good', now, now, now, now,
    );

    deleteCard(db, card.id);

    const log = db.prepare('SELECT * FROM review_logs WHERE id = ?').get('log1');
    expect(log).toBeTruthy();
  });
});

// ---- HTTP API tests ----

describe('GET /api/cards', () => {
  it('returns 200 with empty items when no cards', async () => {
    const res = await request(app).get('/api/cards');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('returns paginated cards', async () => {
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const res = await request(app).get('/api/cards');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].target_word).toBe('charge');
  });

  it('defaults to the configured default target language', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const japanese = createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/cards');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items.map((card: { id: string }) => card.id)).toEqual([japanese.id]);
  });

  it('allows target_language to override the settings default', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    const english = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: '猫', context_meaning: 'cat', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/cards').query({ target_language: '英语' });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items.map((card: { id: string }) => card.id)).toEqual([english.id]);
  });

  it('rejects unsupported target_language values', async () => {
    const res = await request(app).get('/api/cards').query({ target_language: 'Klingon' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('target_language must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语');
  });

  it('rejects invalid page_size with 400', async () => {
    const res = await request(app).get('/api/cards?page_size=99');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('accepts valid page_size values 20, 50, 100', async () => {
    for (const size of [20, 50, 100]) {
      const res = await request(app).get(`/api/cards?page_size=${size}`);
      expect(res.status).toBe(200);
    }
  });

  it('filters by status', async () => {
    const card1 = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    db.prepare("UPDATE word_sense_cards SET status='mastered' WHERE id=?").run(card1.id);
    createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });

    const res = await request(app).get('/api/cards?status=mastered');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].target_word).toBe('charge');
  });

  it('filters by favorite', async () => {
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const card2 = createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });
    db.prepare('UPDATE word_sense_cards SET is_favorite=1 WHERE id=?').run(card2.id);

    const res = await request(app).get('/api/cards?favorite=true');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].target_word).toBe('exhaust');
  });

  it('searches across target_word and context_meaning', async () => {
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });

    const res = await request(app).get('/api/cards?search=收费');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].target_word).toBe('charge');
  });

  it('searches sentence, note, and tag name via API', async () => {
    const sentenceCard = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: sentenceCard.id, sentence: 'The hotel charges $100 per night.' });
    const noteCard = createCard(db, { target_word: 'awkward', context_meaning: '尴尬', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: noteCard.id, sentence: 'That was awkward.', note: 'Friends scene note' });
    const tagCard = createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });
    addTagToCard(db, tagCard.id, createTag(db, { name: '课堂视频' }).id);

    const sentenceRes = await request(app).get('/api/cards?search=hotel');
    const noteRes = await request(app).get('/api/cards?search=Friends');
    const tagRes = await request(app).get('/api/cards?search=%E8%AF%BE%E5%A0%82');

    expect(sentenceRes.body.items.map((item: { id: string }) => item.id)).toEqual([sentenceCard.id]);
    expect(noteRes.body.items.map((item: { id: string }) => item.id)).toEqual([noteCard.id]);
    expect(tagRes.body.items.map((item: { id: string }) => item.id)).toEqual([tagCard.id]);
  });
});

describe('GET /api/cards/suggestions', () => {
  it('returns existing card senses for target_word', async () => {
    createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: 'charge', context_meaning: '指控', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });

    const res = await request(app).get('/api/cards/suggestions?target_word=charge');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    const meanings = res.body.map((c: { context_meaning: string }) => c.context_meaning);
    expect(meanings).toContain('收费');
    expect(meanings).toContain('指控');
  });

  it('scopes suggestions to the configured default target language', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    createCard(db, { target_word: 'charge', context_meaning: 'fee', target_language: '英语', definition_language: '中文' });
    const japanese = createCard(db, { target_word: 'charge', context_meaning: '担当', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/cards/suggestions').query({ target_word: 'charge' });

    expect(res.status).toBe(200);
    expect(res.body.map((item: { id: string }) => item.id)).toEqual([japanese.id]);
  });

  it('allows suggestions target_language to override the settings default', async () => {
    db.prepare("UPDATE user_settings SET default_target_language = '日语' WHERE id = 1").run();
    const english = createCard(db, { target_word: 'charge', context_meaning: 'fee', target_language: '英语', definition_language: '中文' });
    createCard(db, { target_word: 'charge', context_meaning: '担当', target_language: '日语', definition_language: '中文' });

    const res = await request(app).get('/api/cards/suggestions').query({ target_word: 'charge', target_language: '英语' });

    expect(res.status).toBe(200);
    expect(res.body.map((item: { id: string }) => item.id)).toEqual([english.id]);
  });

  it('rejects unsupported suggestions target_language values', async () => {
    const res = await request(app).get('/api/cards/suggestions').query({ target_word: 'charge', target_language: 'Klingon' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('target_language must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语');
  });

  it('returns 400 when target_word is missing', async () => {
    const res = await request(app).get('/api/cards/suggestions');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('excludes deleted cards from suggestions', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '删除', target_language: '英语', definition_language: '中文' });
    deleteCard(db, card.id);

    const res = await request(app).get('/api/cards/suggestions?target_word=charge');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it('includes mastered cards in suggestions', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    db.prepare("UPDATE word_sense_cards SET status='mastered' WHERE id=?").run(card.id);

    const res = await request(app).get('/api/cards/suggestions?target_word=charge');
    expect(res.status).toBe(200);
    expect(res.body.map((item: { id: string }) => item.id)).toContain(card.id);
  });
});

describe('POST /api/cards', () => {
  it('creates a new card with first context', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({
        target_word: 'charge',
        context_meaning: '收费',
        sentence: 'The hotel charges $100.',
      });
    expect(res.status).toBe(201);
    expect(res.body.card).toBeTruthy();
    expect(res.body.card.target_word).toBe('charge');
    expect(res.body.card.target_language).toBe('英语');
    expect(res.body.card.definition_language).toBe('中文');
    expect(res.body.context).toBeTruthy();
    expect(res.body.context.sentence).toBe('The hotel charges $100.');
  });

  it('creates a new card with supported language fields', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({
        target_word: '走る',
        context_meaning: 'run',
        sentence: '彼は駅まで走った。',
        target_language: '日语',
        definition_language: '英语',
      });

    expect(res.status).toBe(201);
    expect(res.body.card.target_language).toBe('日语');
    expect(res.body.card.definition_language).toBe('英语');
  });

  it('returns 400 for unsupported card languages', async () => {
    for (const field of ['target_language', 'definition_language']) {
      const res = await request(app)
        .post('/api/cards')
        .send({
          target_word: 'charge',
          context_meaning: '收费',
          sentence: 'The hotel charges $100.',
          [field]: '意大利语',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(`${field} must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语`);
    }
  });

  it('returns 400 when target_word is missing', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({ context_meaning: '收费', sentence: 'Test.' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(res.body.message).toBeTruthy();
  });

  it('returns 400 when context_meaning is missing', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({ target_word: 'charge', sentence: 'Test.' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when sentence is missing', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({ target_word: 'charge', context_meaning: '收费' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('appends context to existing card when card_id is provided', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app)
      .post('/api/cards')
      .send({
        card_id: card.id,
        sentence: 'They charge extra for breakfast.',
      });
    expect(res.status).toBe(201);
    expect(res.body.card.id).toBe(card.id);
    expect(res.body.context.sentence).toBe('They charge extra for breakfast.');
  });

  it('creates card with tags', async () => {
    const tag = db.prepare("INSERT INTO tags (id, name, created_at, updated_at) VALUES ('tag1', '美剧', ?, ?) RETURNING *")
      .get(new Date().toISOString(), new Date().toISOString()) as { id: string };

    const res = await request(app)
      .post('/api/cards')
      .send({
        target_word: 'charge',
        context_meaning: '收费',
        sentence: 'Test sentence.',
        tag_ids: [tag.id],
      });
    expect(res.status).toBe(201);
    const cardId = res.body.card.id;
    const cardTags = db.prepare('SELECT * FROM card_tags WHERE card_id = ?').all(cardId);
    expect(cardTags.length).toBe(1);
  });
});

describe('GET /api/cards/:id', () => {
  it('returns card detail with contexts and tags', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    db.prepare('INSERT INTO context_examples (id, card_id, sentence, is_primary, sort_order, created_at, updated_at) VALUES (?, ?, ?, 1, 10, ?, ?)').run(
      'ctx1', card.id, 'Test.', new Date().toISOString(), new Date().toISOString()
    );

    const res = await request(app).get(`/api/cards/${card.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(card.id);
    expect(res.body.contexts).toBeTruthy();
    expect(res.body.tags).toBeTruthy();
    expect(res.body.fsrs).toBeTruthy();
  });

  it('returns 404 for unknown card id', async () => {
    const res = await request(app).get('/api/cards/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for deleted card', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    deleteCard(db, card.id);
    const res = await request(app).get(`/api/cards/${card.id}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/cards/:id', () => {
  it('updates context_meaning', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ context_meaning: '指控' });
    expect(res.status).toBe(200);
    expect(res.body.context_meaning).toBe('指控');
  });

  it('updates is_favorite', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ is_favorite: true });
    expect(res.status).toBe(200);
    expect(res.body.is_favorite).toBe(1);
  });

  it('updates status to mastered', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ status: 'mastered' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('mastered');
  });

  it('replaces card tags', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const oldTag = createTag(db, { name: '美剧' });
    const newTag = createTag(db, { name: '课堂视频' });
    addTagToCard(db, card.id, oldTag.id);

    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ tag_ids: [newTag.id] });

    expect(res.status).toBe(200);
    expect(getCardTags(db, card.id).map(tag => tag.id)).toEqual([newTag.id]);
  });

  it('returns 400 for unknown tag_ids and leaves card unchanged', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const existingTag = createTag(db, { name: '美剧' });
    addTagToCard(db, card.id, existingTag.id);

    const res = await request(app)
      .patch(`/api/cards/${card.id}`)
      .send({ context_meaning: '指控', tag_ids: ['missing-tag'] });

    const row = db.prepare('SELECT context_meaning FROM word_sense_cards WHERE id = ?').get(card.id) as { context_meaning: string };
    expect(res.status).toBe(400);
    expect(row.context_meaning).toBe('收费');
    expect(getCardTags(db, card.id).map(tag => tag.id)).toEqual([existingTag.id]);
  });

  it('returns 404 for unknown card', async () => {
    const res = await request(app)
      .patch('/api/cards/nonexistent')
      .send({ context_meaning: '指控' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/cards/:id', () => {
  it('soft-deletes a card and returns 200', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });

    const res = await request(app).delete(`/api/cards/${card.id}`);
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT deleted_at FROM word_sense_cards WHERE id = ?').get(card.id) as { deleted_at: string | null };
    expect(row.deleted_at).toBeTruthy();
  });

  it('returns 404 for unknown card', async () => {
    const res = await request(app).delete('/api/cards/nonexistent');
    expect(res.status).toBe(404);
  });
});
