import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createApp } from '../../src/server/app.js';
import { createTestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import { createContext } from '../../src/server/domain/contexts.js';
import { createMedia } from '../../src/server/domain/media.js';
import type { ExportJson } from '../../src/shared/types.js';

let db: Database;
let uploadsDir: string;

beforeEach(() => {
  db = createTestDb();
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-import-export-'));
});

afterEach(() => {
  db.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

function binaryParser(res: NodeJS.ReadableStream, callback: (error: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
  res.on('error', (error: Error) => callback(error, Buffer.alloc(0)));
}

const zipParser = binaryParser as unknown as (res: Parameters<Parameters<request.Test['parse']>[0]>[0], callback: (error: Error | null, body: Buffer) => void) => void;

async function readExportJson(responseBody: Buffer): Promise<ExportJson> {
  const zip = await JSZip.loadAsync(responseBody);
  const file = zip.file('export.json');
  expect(file).toBeTruthy();
  return JSON.parse(await file!.async('string')) as ExportJson;
}

async function makeZip(exportJson: ExportJson, files: Record<string, Buffer | string> = {}): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('export.json', JSON.stringify(exportJson));
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generateAsync({ type: 'nodebuffer' });
}

function baseExportJson(overrides: Partial<ExportJson> = {}): ExportJson {
  const now = '2026-05-30T00:00:00.000Z';
  return {
    schema_version: 1,
    export_type: 'pure',
    exported_at: now,
    cards: [{
      id: 'import-card-1',
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      created_at: now,
      updated_at: now,
    }],
    contexts: [{
      id: 'import-context-1',
      card_id: 'import-card-1',
      sentence: 'They charge extra.',
      note: null,
      is_primary: 1,
      sort_order: 10,
      created_at: now,
      updated_at: now,
    }],
    media_files: [],
    tags: [],
    card_tags: [],
    ...overrides,
  };
}

describe('import/export API', () => {
  it('exports pure cards without user-specific state', async () => {
    const card = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    createContext(db, { card_id: card.id, sentence: 'The hotel charges $100.' });
    db.prepare('UPDATE word_sense_cards SET is_favorite = 1, status = ? WHERE id = ?').run('mastered', card.id);

    const response = await request(createApp(db, { uploadsDir }))
      .get('/api/export?type=pure')
      .buffer(true)
      .parse(zipParser)
      .expect(200)
      .expect('Content-Type', /zip/);

    const exported = await readExportJson(response.body as Buffer);
    expect(exported.export_type).toBe('pure');
    expect(exported.cards).toHaveLength(1);
    expect(exported.cards[0]).not.toHaveProperty('is_favorite');
    expect(exported.cards[0]).not.toHaveProperty('status');
    expect(exported.fsrs_states).toBeUndefined();
    expect(exported.review_logs).toBeUndefined();
    expect(exported.settings).toBeUndefined();
  });

  it('exports marked cards with user-specific state and settings', async () => {
    const card = createCard(db, {
      target_word: 'awkward',
      context_meaning: '尴尬的',
      target_language: '英语',
      definition_language: '中文',
    });
    createContext(db, { card_id: card.id, sentence: 'That was awkward.' });
    db.prepare('UPDATE word_sense_cards SET is_favorite = 1, status = ? WHERE id = ?').run('mastered', card.id);
    db.prepare(`
      INSERT INTO review_logs (id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at)
      VALUES ('log-1', ?, 'good', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z', '2026-06-01T00:00:00.000Z', '2026-05-30T00:00:00.000Z')
    `).run(card.id);
    db.prepare(`
      INSERT INTO ai_configs (id, name, base_url, api_key, model, is_active, created_at, updated_at)
      VALUES ('ai-config-1', 'DeepSeek', 'https://api.deepseek.com/v1', 'sk-secret', 'deepseek-chat', 1, '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z')
    `).run();

    const response = await request(createApp(db, { uploadsDir }))
      .get('/api/export?type=marked')
      .buffer(true)
      .parse(zipParser)
      .expect(200)
      .expect('Content-Type', /zip/);

    const exported = await readExportJson(response.body as Buffer);
    expect(exported.export_type).toBe('marked');
    expect(exported.cards[0].is_favorite).toBe(1);
    expect(exported.cards[0].status).toBe('mastered');
    expect(exported.fsrs_states).toHaveLength(1);
    expect(exported.review_logs).toHaveLength(1);
    expect(exported.settings?.id).toBe(1);
    expect(JSON.stringify(exported)).not.toContain('sk-secret');
    expect(exported).not.toHaveProperty('ai_configs');
  });

  it('includes available media files under uploads in zip', async () => {
    const card = createCard(db, {
      target_word: 'scene',
      context_meaning: '场景',
      target_language: '英语',
      definition_language: '中文',
    });
    const context = createContext(db, { card_id: card.id, sentence: 'This scene matters.' });
    const storedName = 'sample.png';
    fs.writeFileSync(path.join(uploadsDir, storedName), Buffer.from('png'));
    createMedia(db, {
      context_example_id: context.id,
      media_type: 'image',
      file_name: storedName,
      file_path: path.join(uploadsDir, storedName),
      mime_type: 'image/png',
      file_size: 3,
    });

    const response = await request(createApp(db, { uploadsDir }))
      .get('/api/export?type=marked')
      .buffer(true)
      .parse(zipParser)
      .expect(200);

    const zip = await JSZip.loadAsync(response.body as Buffer);
    expect(zip.file('export.json')).toBeTruthy();
    expect(zip.file('uploads/sample.png')).toBeTruthy();
  });

  it('scans conflicts without writing data', async () => {
    createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const zip = await makeZip(baseExportJson());

    const response = await request(createApp(db, { uploadsDir }))
      .post('/api/import/scan')
      .attach('file', zip, 'import.zip')
      .expect(200);

    expect(response.body.conflicts).toMatchObject([{ target_word: 'charge', context_meaning: '收费' }]);
    expect(response.body.counts.cards).toBe(1);
    const count = db.prepare('SELECT COUNT(*) as count FROM context_examples').get() as { count: number };
    expect(count.count).toBe(0);
  });

  it('rejects unsafe media paths during scan', async () => {
    const zip = await makeZip(baseExportJson({
      media_files: [{
        id: 'media-1',
        context_example_id: 'import-context-1',
        media_type: 'image',
        file_name: '../evil.png',
        file_path: '../evil.png',
        mime_type: 'image/png',
        file_size: 1,
        is_available: 1,
        created_at: '2026-05-30T00:00:00.000Z',
      }],
    }));

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/scan')
      .attach('file', zip, 'import.zip')
      .expect(400);
  });

  it('rejects unsafe media metadata during execute', async () => {
    const zip = await makeZip(baseExportJson({
      media_files: [{
        id: 'media-1',
        context_example_id: 'import-context-1',
        media_type: 'script' as 'image',
        file_name: 'evil.php',
        file_path: 'uploads/evil.php',
        mime_type: 'text/html',
        file_size: 1,
        is_available: 1,
        created_at: '2026-05-30T00:00:00.000Z',
      }],
    }), { 'uploads/evil.php': 'x' });

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'import_all_as_new' }))
      .attach('file', zip, 'import.zip')
      .expect(400);
  });

  it('imports pure cards with fresh FSRS state', async () => {
    const zip = await makeZip(baseExportJson());

    const response = await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'import_all_as_new' }))
      .attach('file', zip, 'import.zip')
      .expect(200);

    expect(response.body.imported_cards).toBe(1);
    const card = db.prepare('SELECT * FROM word_sense_cards WHERE target_word = ?').get('charge') as { id: string; status: string; is_favorite: number };
    const fsrs = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(card.id) as { state: number; reps: number; lapses: number; last_reviewed_at: string | null };
    expect(card.status).toBe('reviewing');
    expect(card.is_favorite).toBe(0);
    expect(fsrs).toMatchObject({ state: 0, reps: 0, lapses: 0, last_reviewed_at: null });
  });

  it('skips, merges, or imports conflicts according to mode', async () => {
    const existing = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const zip = await makeZip(baseExportJson());

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'skip_all' }))
      .attach('file', zip, 'import.zip')
      .expect(200);
    expect((db.prepare('SELECT COUNT(*) as count FROM context_examples').get() as { count: number }).count).toBe(0);

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'merge_all' }))
      .attach('file', zip, 'import.zip')
      .expect(200);
    expect((db.prepare('SELECT COUNT(*) as count FROM context_examples WHERE card_id = ?').get(existing.id) as { count: number }).count).toBe(1);
    expect((db.prepare('SELECT COUNT(*) as count FROM fsrs_states WHERE card_id = ?').get(existing.id) as { count: number }).count).toBe(1);

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'import_all_as_new' }))
      .attach('file', zip, 'import.zip')
      .expect(200);
    expect((db.prepare('SELECT COUNT(*) as count FROM word_sense_cards WHERE target_word = ? AND context_meaning = ?').get('charge', '收费') as { count: number }).count).toBe(2);
  });

  it.each([
    ['merge_all', { mode: 'merge_all' }],
    ['per_item merge', { mode: 'per_item', items: [{ import_card_id: 'import-card-1', decision: 'merge' }] }],
  ])('preserves existing primary when importing merged contexts via %s', async (_label, decisions) => {
    const existing = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    createContext(db, { card_id: existing.id, sentence: 'The hotel charges $100.' });
    const zip = await makeZip(baseExportJson());

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify(decisions))
      .attach('file', zip, 'import.zip')
      .expect(200);

    const contexts = db.prepare('SELECT sentence, is_primary FROM context_examples WHERE card_id = ? AND deleted_at IS NULL ORDER BY created_at ASC').all(existing.id) as Array<{ sentence: string; is_primary: number }>;
    expect(contexts).toHaveLength(2);
    expect(contexts.filter((context) => context.is_primary === 1)).toHaveLength(1);
    expect(contexts.find((context) => context.sentence === 'The hotel charges $100.')?.is_primary).toBe(1);
    expect(contexts.find((context) => context.sentence === 'They charge extra.')?.is_primary).toBe(0);
  });

  it.each([
    ['merge_all', { mode: 'merge_all' }],
    ['per_item merge', { mode: 'per_item', items: [{ import_card_id: 'import-card-1', decision: 'merge' }] }],
  ])('uses imported primary when merged card has no active contexts via %s', async (_label, decisions) => {
    const existing = createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const zip = await makeZip(baseExportJson());

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify(decisions))
      .attach('file', zip, 'import.zip')
      .expect(200);

    const contexts = db.prepare('SELECT sentence, is_primary FROM context_examples WHERE card_id = ? AND deleted_at IS NULL').all(existing.id) as Array<{ sentence: string; is_primary: number }>;
    expect(contexts).toHaveLength(1);
    expect(contexts.filter((context) => context.is_primary === 1)).toHaveLength(1);
    expect(contexts[0]).toMatchObject({ sentence: 'They charge extra.', is_primary: 1 });
  });

  it('supports per-item conflict decisions', async () => {
    createCard(db, {
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
    });
    const zip = await makeZip(baseExportJson());

    const response = await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'per_item', items: [{ import_card_id: 'import-card-1', decision: 'skip' }] }))
      .attach('file', zip, 'import.zip')
      .expect(200);

    expect(response.body.skipped_cards).toBe(1);
  });

  it('keeps missing media records unavailable and normalizes sort order', async () => {
    const zip = await makeZip(baseExportJson({
      contexts: [
        { id: 'ctx-1', card_id: 'import-card-1', sentence: 'A', note: null, is_primary: 0, sort_order: 10, created_at: '2026-05-30T00:00:00.000Z', updated_at: '2026-05-30T00:00:00.000Z' },
        { id: 'ctx-2', card_id: 'import-card-1', sentence: 'B', note: null, is_primary: 0, sort_order: 10, created_at: '2026-05-30T00:00:01.000Z', updated_at: '2026-05-30T00:00:01.000Z' },
      ],
      media_files: [{
        id: 'media-1',
        context_example_id: 'ctx-1',
        media_type: 'image',
        file_name: 'missing.png',
        file_path: 'uploads/missing.png',
        mime_type: 'image/png',
        file_size: 1,
        is_available: 1,
        created_at: '2026-05-30T00:00:00.000Z',
      }],
    }));

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'import_all_as_new' }))
      .attach('file', zip, 'import.zip')
      .expect(200);

    const contexts = db.prepare('SELECT sort_order, is_primary FROM context_examples ORDER BY sort_order ASC').all() as Array<{ sort_order: number; is_primary: number }>;
    expect(contexts.map((context) => context.sort_order)).toEqual([10, 20]);
    expect(contexts.some((context) => context.is_primary === 1)).toBe(true);
    const media = db.prepare('SELECT is_available FROM media_files WHERE file_name = ?').get('missing.png') as { is_available: number };
    expect(media.is_available).toBe(0);
  });

  it('preserves marked state for newly imported cards', async () => {
    const marked = baseExportJson({
      export_type: 'marked',
      cards: [{
        id: 'marked-card-1',
        target_word: 'preserve',
        context_meaning: '保留',
        target_language: '英语',
        definition_language: '中文',
        is_favorite: 1,
        status: 'mastered',
        created_at: '2026-05-30T00:00:00.000Z',
        updated_at: '2026-05-30T00:00:00.000Z',
      }],
      contexts: [],
      fsrs_states: [{
        id: 'fsrs-1',
        card_id: 'marked-card-1',
        due_date: '2026-06-01T00:00:00.000Z',
        stability: 2,
        difficulty: 3,
        elapsed_days: 0,
        scheduled_days: 2,
        learning_steps: 0,
        reps: 4,
        lapses: 1,
        state: 2,
        last_reviewed_at: '2026-05-30T00:00:00.000Z',
        created_at: '2026-05-30T00:00:00.000Z',
        updated_at: '2026-05-30T00:00:00.000Z',
      }],
      review_logs: [{
        id: 'log-1',
        card_id: 'marked-card-1',
        rating: 'good',
        reviewed_at: '2026-05-30T00:00:00.000Z',
        due_date_before: '2026-05-30T00:00:00.000Z',
        due_date_after: '2026-06-01T00:00:00.000Z',
        created_at: '2026-05-30T00:00:00.000Z',
      }],
    });

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'import_all_as_new' }))
      .attach('file', await makeZip(marked), 'import.zip')
      .expect(200);

    const card = db.prepare('SELECT * FROM word_sense_cards WHERE target_word = ?').get('preserve') as { id: string; status: string; is_favorite: number };
    const fsrs = db.prepare('SELECT reps, lapses, state FROM fsrs_states WHERE card_id = ?').get(card.id) as { reps: number; lapses: number; state: number };
    const logs = db.prepare('SELECT COUNT(*) as count FROM review_logs WHERE card_id = ?').get(card.id) as { count: number };
    expect(card.status).toBe('mastered');
    expect(card.is_favorite).toBe(1);
    expect(fsrs).toMatchObject({ reps: 4, lapses: 1, state: 2 });
    expect(logs.count).toBe(1);
  });
});
