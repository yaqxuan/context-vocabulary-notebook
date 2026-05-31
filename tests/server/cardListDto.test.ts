import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/server/app.js';
import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';

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
});

describe('card list DTO', () => {
  it('includes primary sentence, tags, and context count', async () => {
    const tagResponse = await request(app).post('/api/tags').send({ name: '美剧' }).expect(201);
    const cardResponse = await request(app).post('/api/cards').send({
      target_word: 'charge',
      context_meaning: '收费',
      sentence: 'The hotel charges $100 per night.',
      tag_ids: [tagResponse.body.id],
    }).expect(201);

    await request(app).post(`/api/cards/${cardResponse.body.card.id}/contexts`).send({
      sentence: 'They charge extra for breakfast.',
    }).expect(201);

    const listResponse = await request(app).get('/api/cards').expect(200);
    expect(listResponse.body.items[0]).toMatchObject({
      target_word: 'charge',
      context_meaning: '收费',
      primary_sentence: 'The hotel charges $100 per night.',
      context_count: 2,
    });
    expect(listResponse.body.items[0].tags).toEqual([expect.objectContaining({ name: '美剧' })]);
  });

  it('returns detail DTO in the client shape', async () => {
    const cardResponse = await request(app).post('/api/cards').send({
      target_word: 'frame',
      context_meaning: '表述角度',
      sentence: 'He framed the problem as a question of trust.',
    }).expect(201);

    const detailResponse = await request(app).get(`/api/cards/${cardResponse.body.card.id}`).expect(200);
    expect(detailResponse.body.id).toBe(cardResponse.body.card.id);
    expect(detailResponse.body.contexts).toHaveLength(1);
    expect(detailResponse.body.primary_sentence).toBe('He framed the problem as a question of trust.');
    expect(detailResponse.body.context_count).toBe(1);
  });
});
