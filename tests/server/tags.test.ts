import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import {
  addTagToCard,
  createTag,
  deleteTag,
  getCardTags,
  removeTagFromCard,
  updateTag,
} from '../../src/server/domain/tags.js';
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
  db.prepare('DELETE FROM tags').run();
});

// ---- Domain tests (preserved from Phase 1) ----

describe('createTag (domain)', () => {
  it('creates a tag with the given name', () => {
    const tag = createTag(db, { name: '美剧' });
    expect(tag.name).toBe('美剧');
    expect(tag.id).toBeTruthy();
  });

  it('throws when creating a duplicate active tag name', () => {
    createTag(db, { name: '美剧' });
    expect(() => createTag(db, { name: '美剧' })).toThrow();
  });

  it('allows reusing a soft-deleted tag name', () => {
    const tag1 = createTag(db, { name: '美剧' });
    deleteTag(db, tag1.id);

    const tag2 = createTag(db, { name: '美剧' });
    expect(tag2.name).toBe('美剧');
    expect(tag2.id).not.toBe(tag1.id);
  });
});

describe('updateTag (domain)', () => {
  it('updates the tag name', () => {
    const tag = createTag(db, { name: '美剧' });
    const updated = updateTag(db, tag.id, { name: '电影' });
    expect(updated.name).toBe('电影');
  });

  it('throws when updating to a duplicate active tag name', () => {
    createTag(db, { name: '美剧' });
    const tag2 = createTag(db, { name: '电影' });
    expect(() => updateTag(db, tag2.id, { name: '美剧' })).toThrow();
  });

  it('throws when attempting to update a soft-deleted tag', () => {
    const tag = createTag(db, { name: '美剧' });
    deleteTag(db, tag.id);
    expect(() => updateTag(db, tag.id, { name: '新名字' })).toThrow();
  });
});

describe('deleteTag (domain)', () => {
  it('soft-deletes the tag', () => {
    const tag = createTag(db, { name: '美剧' });
    deleteTag(db, tag.id);

    const row = db.prepare('SELECT deleted_at FROM tags WHERE id = ?').get(tag.id) as { deleted_at: string | null };
    expect(row.deleted_at).toBeTruthy();
  });
});

describe('addTagToCard and card-tag uniqueness (domain)', () => {
  it('adds a tag to a card', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tag = createTag(db, { name: '美剧' });

    addTagToCard(db, card.id, tag.id);

    const row = db.prepare('SELECT * FROM card_tags WHERE card_id = ? AND tag_id = ?').get(card.id, tag.id);
    expect(row).toBeTruthy();
  });

  it('throws on duplicate card-tag assignment', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tag = createTag(db, { name: '美剧' });

    addTagToCard(db, card.id, tag.id);
    expect(() => addTagToCard(db, card.id, tag.id)).toThrow();
  });
});

describe('removeTagFromCard (domain)', () => {
  it('removes the card-tag relationship', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tag = createTag(db, { name: '美剧' });
    addTagToCard(db, card.id, tag.id);

    removeTagFromCard(db, card.id, tag.id);

    const row = db.prepare('SELECT * FROM card_tags WHERE card_id = ? AND tag_id = ?').get(card.id, tag.id);
    expect(row).toBeFalsy();
  });
});

describe('getCardTags (domain)', () => {
  it('returns active tags for a card', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tag1 = createTag(db, { name: '美剧' });
    const tag2 = createTag(db, { name: '电影' });
    addTagToCard(db, card.id, tag1.id);
    addTagToCard(db, card.id, tag2.id);

    const tags = getCardTags(db, card.id);
    const names = tags.map(t => t.name);
    expect(names).toContain('美剧');
    expect(names).toContain('电影');
    expect(tags.length).toBe(2);
  });

  it('does not return deleted tags in card tag queries', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tag1 = createTag(db, { name: '美剧' });
    const tag2 = createTag(db, { name: '电影' });
    addTagToCard(db, card.id, tag1.id);
    addTagToCard(db, card.id, tag2.id);

    deleteTag(db, tag2.id);

    const tags = getCardTags(db, card.id);
    const names = tags.map(t => t.name);
    expect(names).toContain('美剧');
    expect(names).not.toContain('电影');
    expect(tags.length).toBe(1);
  });

  it('does not return tags for deleted cards', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tag = createTag(db, { name: '美剧' });
    addTagToCard(db, card.id, tag.id);

    db.prepare("UPDATE word_sense_cards SET deleted_at=? WHERE id=?").run(new Date().toISOString(), card.id);

    const tags = getCardTags(db, card.id);
    expect(tags).toHaveLength(0);
  });

  it('returns empty array for card with no tags', () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const tags = getCardTags(db, card.id);
    expect(tags).toEqual([]);
  });
});

// ---- HTTP API tests ----

describe('GET /api/tags', () => {
  it('returns all active tags', async () => {
    createTag(db, { name: '美剧' });
    createTag(db, { name: '电影' });

    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((t: { name: string }) => t.name);
    expect(names).toContain('美剧');
    expect(names).toContain('电影');
  });

  it('excludes soft-deleted tags', async () => {
    const tag = createTag(db, { name: '美剧' });
    createTag(db, { name: '电影' });
    deleteTag(db, tag.id);

    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    const names = res.body.map((t: { name: string }) => t.name);
    expect(names).not.toContain('美剧');
    expect(names).toContain('电影');
  });

  it('returns empty array when no tags exist', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/tags', () => {
  it('creates a new tag', async () => {
    const res = await request(app)
      .post('/api/tags')
      .send({ name: '美剧' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('美剧');
    expect(res.body.id).toBeTruthy();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/tags')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when name is empty string', async () => {
    const res = await request(app)
      .post('/api/tags')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 409 when tag name already exists', async () => {
    createTag(db, { name: '美剧' });

    const res = await request(app)
      .post('/api/tags')
      .send({ name: '美剧' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });
});

describe('PATCH /api/tags/:id', () => {
  it('updates the tag name', async () => {
    const tag = createTag(db, { name: '美剧' });

    const res = await request(app)
      .patch(`/api/tags/${tag.id}`)
      .send({ name: '电影' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('电影');
  });

  it('returns 404 for unknown tag', async () => {
    const res = await request(app)
      .patch('/api/tags/nonexistent')
      .send({ name: '新名字' });

    expect(res.status).toBe(404);
  });

  it('returns 409 when renaming to an existing active tag name', async () => {
    createTag(db, { name: '美剧' });
    const tag2 = createTag(db, { name: '电影' });

    const res = await request(app)
      .patch(`/api/tags/${tag2.id}`)
      .send({ name: '美剧' });

    expect(res.status).toBe(409);
  });

  it('returns 400 when name is missing', async () => {
    const tag = createTag(db, { name: '美剧' });

    const res = await request(app)
      .patch(`/api/tags/${tag.id}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/tags/:id', () => {
  it('soft-deletes a tag', async () => {
    const tag = createTag(db, { name: '美剧' });

    const res = await request(app).delete(`/api/tags/${tag.id}`);
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT deleted_at FROM tags WHERE id = ?').get(tag.id) as { deleted_at: string | null };
    expect(row.deleted_at).toBeTruthy();
  });

  it('returns 404 for unknown tag', async () => {
    const res = await request(app).delete('/api/tags/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tags/:id/cards', () => {
  it('returns cards for a tag', async () => {
    const tag = createTag(db, { name: '美剧' });
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    addTagToCard(db, card.id, tag.id);

    const res = await request(app).get(`/api/tags/${tag.id}/cards`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeTruthy();
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].target_word).toBe('charge');
  });

  it('supports pagination and search for tag cards', async () => {
    const tag = createTag(db, { name: '美剧' });
    const match = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const other = createCard(db, { target_word: 'exhaust', context_meaning: '筋疲力尽', target_language: '英语', definition_language: '中文' });
    addTagToCard(db, match.id, tag.id);
    addTagToCard(db, other.id, tag.id);

    const res = await request(app).get(`/api/tags/${tag.id}/cards?page=1&page_size=20&search=charge`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.page_size).toBe(20);
    expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([match.id]);
  });

  it('excludes deleted cards from tag card listing', async () => {
    const tag = createTag(db, { name: '美剧' });
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    addTagToCard(db, card.id, tag.id);
    db.prepare('UPDATE word_sense_cards SET deleted_at=? WHERE id=?').run(new Date().toISOString(), card.id);

    const res = await request(app).get(`/api/tags/${tag.id}/cards`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(0);
  });

  it('returns 404 for unknown tag', async () => {
    const res = await request(app).get('/api/tags/nonexistent/cards');
    expect(res.status).toBe(404);
  });
});
