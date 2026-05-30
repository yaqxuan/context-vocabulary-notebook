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

async function readExportJson(responseBody: Buffer): Promise<ExportJson> {
  const zip = await JSZip.loadAsync(responseBody);
  const file = zip.file('export.json');
  expect(file).toBeTruthy();
  return JSON.parse(await file!.async('string')) as ExportJson;
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
});
