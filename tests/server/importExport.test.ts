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
});
