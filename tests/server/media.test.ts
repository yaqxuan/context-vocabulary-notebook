import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import { createContext } from '../../src/server/domain/contexts.js';
import { createApp } from '../../src/server/app.js';
import { MEDIA_SIZE_LIMIT_MESSAGES } from '../../src/shared/constants.js';

function smallOversizedBuffer(): Buffer { return Buffer.from('too-large'); }

let db: TestDb;
let app: ReturnType<typeof createApp>;
let uploadsDir: string;

beforeAll(() => {
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-test-uploads-'));
  db = createTestDb();
  app = createApp(db, { uploadsDir });
});

afterAll(() => {
  destroyTestDb(db);
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

afterEach(() => {
  db.prepare('DELETE FROM review_logs').run();
  db.prepare('DELETE FROM fsrs_states').run();
  db.prepare('DELETE FROM card_tags').run();
  db.prepare('DELETE FROM media_files').run();
  db.prepare('DELETE FROM context_examples').run();
  db.prepare('DELETE FROM word_sense_cards').run();
  // Remove all uploaded test files between tests
  for (const f of fs.readdirSync(uploadsDir)) {
    fs.unlinkSync(path.join(uploadsDir, f));
  }
});

describe('POST /api/media', () => {
  it('uploads an image file and returns media record', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    // Create a small valid-ish PNG buffer (minimal PNG magic bytes)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
    ]);

    const res = await request(app)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', pngBuffer, { filename: 'screenshot.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.media_type).toBe('image');
    expect(res.body.mime_type).toBe('image/png');
    expect(res.body.is_available).toBe(1);
    expect(res.body.context_example_id).toBe(ctx.id);

    // File must physically exist under uploadsDir
    const storedPath: string = res.body.file_path;
    expect(fs.existsSync(storedPath)).toBe(true);
  });

  it('uploads an mp4 video file', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const mp4Buffer = Buffer.from('fake-mp4-content');

    const res = await request(app)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', mp4Buffer, { filename: 'clip.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(201);
    expect(res.body.media_type).toBe('video');
    expect(res.body.mime_type).toBe('video/mp4');
  });

  it('uploads an mp3 audio file', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const mp3Buffer = Buffer.from('fake-mp3-content');

    const res = await request(app)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', mp3Buffer, { filename: 'audio.mp3', contentType: 'audio/mpeg' });

    expect(res.status).toBe(201);
    expect(res.body.media_type).toBe('audio');
    expect(res.body.mime_type).toBe('audio/mpeg');
  });

  it('rejects unsupported file extension with 400 and removes uploaded file', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const res = await request(app)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', Buffer.from('data'), { filename: 'document.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Unsupported file type');
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects image over 10MB with per-type limit message', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const limitedApp = createApp(db, { uploadsDir, uploadMaxBytes: 1024, mediaSizeLimitsBytes: { image: 4 } });

    const res = await request(limitedApp)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', smallOversizedBuffer(), { filename: 'huge.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(MEDIA_SIZE_LIMIT_MESSAGES.image);
    expect(db.prepare('SELECT COUNT(*) as n FROM media_files').get() as { n: number }).toMatchObject({ n: 0 });
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects audio over 50MB with per-type limit message', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const limitedApp = createApp(db, { uploadsDir, uploadMaxBytes: 1024, mediaSizeLimitsBytes: { audio: 4 } });

    const res = await request(limitedApp)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', smallOversizedBuffer(), { filename: 'huge.mp3', contentType: 'audio/mpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(MEDIA_SIZE_LIMIT_MESSAGES.audio);
    expect(db.prepare('SELECT COUNT(*) as n FROM media_files').get() as { n: number }).toMatchObject({ n: 0 });
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects video over 300MB with per-type limit message', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const limitedApp = createApp(db, { uploadsDir, uploadMaxBytes: 1024, mediaSizeLimitsBytes: { video: 4 } });

    const res = await request(limitedApp)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', smallOversizedBuffer(), { filename: 'huge.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(MEDIA_SIZE_LIMIT_MESSAGES.video);
    expect(db.prepare('SELECT COUNT(*) as n FROM media_files').get() as { n: number }).toMatchObject({ n: 0 });
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects uploads larger than the configured limit', async () => {
    const limitedApp = createApp(db, { uploadsDir, uploadMaxBytes: 4 });
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const res = await request(limitedApp)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', Buffer.from('too-large'), { filename: 'clip.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('File too large');
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects when context_example_id is missing with 400', async () => {
    const res = await request(app)
      .post('/api/media')
      .attach('file', Buffer.from('data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 404 when context_example_id references unknown context and removes uploaded file', async () => {
    const res = await request(app)
      .post('/api/media')
      .field('context_example_id', 'nonexistent-ctx-id')
      .attach('file', Buffer.from('data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(404);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('generates a safe file name (no path traversal characters)', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const res = await request(app)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', Buffer.from('data'), {
        filename: '../../../etc/passwd.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(201);
    // The stored file_name must not contain path separators or traversal sequences
    const fileName: string = res.body.file_name;
    expect(fileName).not.toContain('..');
    expect(fileName).not.toContain('/');
    expect(fileName).not.toContain('\\');
  });
});

describe('GET /uploads/:fileName', () => {
  it('serves an uploaded file', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const content = Buffer.from('test-image-content');
    const uploadRes = await request(app)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', content, { filename: 'serve-test.jpg', contentType: 'image/jpeg' });

    expect(uploadRes.status).toBe(201);
    const fileName: string = uploadRes.body.file_name;

    const serveRes = await request(app).get(`/uploads/${fileName}`);
    expect(serveRes.status).toBe(200);
  });

  it('returns 404 for a file that does not exist', async () => {
    const res = await request(app).get('/uploads/does-not-exist.jpg');
    expect(res.status).toBe(404);
  });

  it('rejects path traversal in file name with 400 or 404', async () => {
    const res = await request(app).get('/uploads/../../etc/passwd');
    expect([400, 404]).toContain(res.status);
  });
});

describe('DELETE /api/media/:id', () => {
  it('soft-deletes a media record', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at)
      VALUES ('mf-test', ?, 'image', 'test.jpg', '/uploads/test.jpg', 'image/jpeg', 100, 1, ?)
    `).run(ctx.id, now);

    const res = await request(app).delete('/api/media/mf-test');
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT deleted_at FROM media_files WHERE id = ?').get('mf-test') as { deleted_at: string | null };
    expect(row.deleted_at).toBeTruthy();
  });

  it('returns 404 for unknown media id', async () => {
    const res = await request(app).delete('/api/media/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('is_available flag', () => {
  it('media record has is_available=1 after successful upload', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

    const res = await request(app)
      .post('/api/media')
      .field('context_example_id', ctx.id)
      .attach('file', Buffer.from('content'), { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.is_available).toBe(1);

    const row = db.prepare('SELECT is_available FROM media_files WHERE id = ?').get(res.body.id) as { is_available: number };
    expect(row.is_available).toBe(1);
  });

  it('GET /api/cards/:id returns media with is_available field', async () => {
    const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
    const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at)
      VALUES ('mf-avail', ?, 'image', 'test.jpg', '/uploads/test.jpg', 'image/jpeg', 100, 0, ?)
    `).run(ctx.id, now);

    const res = await request(app).get(`/api/cards/${card.id}`);
    expect(res.status).toBe(200);
    const media = res.body.media as Array<{ is_available: number }>;
    expect(Array.isArray(media)).toBe(true);
    const unavail = media.find(m => m.is_available === 0);
    expect(unavail).toBeTruthy();
  });
});
