# Phase 4 Import Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build backend-only marked and pure-card zip import/export with conflict scanning, import decisions, media preservation, and FSRS rules.

**Architecture:** Add a focused import/export domain module that serializes SQLite rows into a versioned `export.json`, packages media with JSZip, scans imports without side effects, and executes imports inside one DB transaction. Add one Express router for zip download, scan, and execute; keep HTTP multipart parsing in route layer and database rules in domain layer.

**Tech Stack:** TypeScript, Express, better-sqlite3, JSZip, multer, Vitest, supertest.

---

## File Structure

- Modify `src/shared/types.ts`: export payload, scan response, and import decision DTOs.
- Modify `src/shared/validators.ts`: import/export type and decision validation helpers.
- Create `src/server/domain/importExport.ts`: zip serialization, scan, conflict detection, import execution, id remapping, media copy rules.
- Create `src/server/routes/importExport.ts`: `GET /api/export`, `POST /api/import/scan`, `POST /api/import/execute`.
- Modify `src/server/app.ts`: register import/export router with `uploadsDir`.
- Create `tests/server/importExport.test.ts`: end-to-end API tests over isolated DB/uploads.

---

### Task 1: Shared DTOs and validators

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/validators.ts`
- Test: `tests/server/importExport.test.ts`

- [ ] **Step 1: Add initial failing test for pure export omissions**

Add imports and first test skeleton in `tests/server/importExport.test.ts`:

```ts
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
import { createTag, addTagToCard } from '../../src/server/domain/tags.js';
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
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
```

Expected: fail because `ExportJson` and `/api/export` do not exist.

- [ ] **Step 3: Add shared types**

Append to `src/shared/types.ts`:

```ts
export type ExportType = 'marked' | 'pure';

export interface ExportCardRecord {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
  created_at: string;
  updated_at: string;
  is_favorite?: number;
  status?: CardStatus;
}

export interface ExportContextRecord {
  id: string;
  card_id: string;
  sentence: string;
  note: string | null;
  is_primary: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExportMediaRecord {
  id: string;
  context_example_id: string;
  media_type: MediaType;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  is_available: number;
  created_at: string;
}

export interface ExportTagRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ExportCardTagRecord {
  card_id: string;
  tag_id: string;
  created_at: string;
}

export interface ExportFsrsRecord extends FsrsDto {
  id: string;
  card_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExportReviewLogRecord {
  id: string;
  card_id: string;
  rating: 'again' | 'good';
  reviewed_at: string;
  due_date_before: string;
  due_date_after: string;
  created_at: string;
}

export interface ExportJson {
  schema_version: 1;
  export_type: ExportType;
  exported_at: string;
  cards: ExportCardRecord[];
  contexts: ExportContextRecord[];
  media_files: ExportMediaRecord[];
  tags: ExportTagRecord[];
  card_tags: ExportCardTagRecord[];
  fsrs_states?: ExportFsrsRecord[];
  review_logs?: ExportReviewLogRecord[];
  settings?: SettingsDto;
}

export interface ImportConflictDto {
  import_card_id: string;
  existing_card_id: string;
  target_word: string;
  context_meaning: string;
}

export interface ImportScanResponseDto {
  schema_version: 1;
  export_type: ExportType;
  counts: {
    cards: number;
    contexts: number;
    media_files: number;
    tags: number;
  };
  conflicts: ImportConflictDto[];
  missing_media: string[];
}

export type ImportConflictDecision = 'skip' | 'merge' | 'import_as_new';

export type ImportExecuteDecisionDto =
  | { mode: 'skip_all' }
  | { mode: 'merge_all' }
  | { mode: 'import_all_as_new' }
  | { mode: 'per_item'; items: Array<{ import_card_id: string; decision: ImportConflictDecision }> };

export interface ImportExecuteResponseDto {
  imported_cards: number;
  imported_contexts: number;
  imported_media_files: number;
  skipped_cards: number;
  merged_cards: number;
  missing_media_files: number;
}
```

- [ ] **Step 4: Add validators**

Append to `src/shared/validators.ts`:

```ts
export function isExportType(value: unknown): value is 'marked' | 'pure' {
  return value === 'marked' || value === 'pure';
}

export function isImportExecuteDecision(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const mode = (value as { mode?: unknown }).mode;
  if (mode === 'skip_all' || mode === 'merge_all' || mode === 'import_all_as_new') return true;
  if (mode !== 'per_item') return false;
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return false;
  return items.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as { import_card_id?: unknown; decision?: unknown };
    return typeof record.import_card_id === 'string'
      && (record.decision === 'skip' || record.decision === 'merge' || record.decision === 'import_as_new');
  });
}
```

- [ ] **Step 5: Commit after passing typecheck for shared types**

Run:

```bash
npm run typecheck
```

Expected: pass.

Commit:

```bash
git add src/shared/types.ts src/shared/validators.ts tests/server/importExport.test.ts
git commit -m "test(import-export): cover pure export shape"
```

---

### Task 2: Pure and marked export

**Files:**
- Create: `src/server/domain/importExport.ts`
- Create: `src/server/routes/importExport.ts`
- Modify: `src/server/app.ts`
- Test: `tests/server/importExport.test.ts`

- [ ] **Step 1: Add tests for marked export and media zip entries**

Add tests after pure export test:

```ts
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
      .expect(200);

    const zip = await JSZip.loadAsync(response.body as Buffer);
    expect(zip.file('export.json')).toBeTruthy();
    expect(zip.file('uploads/sample.png')).toBeTruthy();
  });
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
```

Expected: fail because export route/domain missing.

- [ ] **Step 3: Implement export domain**

Create `src/server/domain/importExport.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import type { Database } from 'better-sqlite3';
import type { ExportJson, ExportType } from '../../shared/types.js';
import { resolveUploadPath } from '../storage/uploads.js';

export async function buildExportZip(db: Database, uploadsDir: string, type: ExportType): Promise<Buffer> {
  const marked = type === 'marked';
  const cards = db.prepare(`
    SELECT id, target_word, context_meaning, target_language, definition_language,
           ${marked ? 'is_favorite, status,' : ''} created_at, updated_at
    FROM word_sense_cards
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC, id ASC
  `).all() as ExportJson['cards'];

  const contexts = db.prepare(`
    SELECT ce.id, ce.card_id, ce.sentence, ce.note, ce.is_primary, ce.sort_order, ce.created_at, ce.updated_at
    FROM context_examples ce
    JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE ce.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY ce.card_id ASC, ce.sort_order ASC, ce.created_at ASC, ce.id ASC
  `).all() as ExportJson['contexts'];

  const mediaFiles = db.prepare(`
    SELECT mf.id, mf.context_example_id, mf.media_type, mf.file_name, mf.file_path, mf.mime_type,
           mf.file_size, mf.is_available, mf.created_at
    FROM media_files mf
    JOIN context_examples ce ON ce.id = mf.context_example_id
    JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE mf.deleted_at IS NULL AND ce.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY mf.created_at ASC, mf.id ASC
  `).all() as ExportJson['media_files'];

  const tags = db.prepare(`
    SELECT DISTINCT t.id, t.name, t.created_at, t.updated_at
    FROM tags t
    JOIN card_tags ct ON ct.tag_id = t.id
    JOIN word_sense_cards wsc ON wsc.id = ct.card_id
    WHERE t.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY t.name ASC, t.id ASC
  `).all() as ExportJson['tags'];

  const cardTags = db.prepare(`
    SELECT ct.card_id, ct.tag_id, ct.created_at
    FROM card_tags ct
    JOIN tags t ON t.id = ct.tag_id
    JOIN word_sense_cards wsc ON wsc.id = ct.card_id
    WHERE t.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY ct.created_at ASC
  `).all() as ExportJson['card_tags'];

  const exportJson: ExportJson = {
    schema_version: 1,
    export_type: type,
    exported_at: new Date().toISOString(),
    cards,
    contexts,
    media_files: mediaFiles,
    tags,
    card_tags: cardTags,
  };

  if (marked) {
    exportJson.fsrs_states = db.prepare(`
      SELECT fs.* FROM fsrs_states fs
      JOIN word_sense_cards wsc ON wsc.id = fs.card_id
      WHERE wsc.deleted_at IS NULL
      ORDER BY fs.created_at ASC, fs.id ASC
    `).all() as ExportJson['fsrs_states'];
    exportJson.review_logs = db.prepare(`
      SELECT rl.* FROM review_logs rl
      JOIN word_sense_cards wsc ON wsc.id = rl.card_id
      WHERE wsc.deleted_at IS NULL
      ORDER BY rl.reviewed_at ASC, rl.id ASC
    `).all() as ExportJson['review_logs'];
    exportJson.settings = db.prepare('SELECT * FROM user_settings WHERE id = 1').get() as ExportJson['settings'];
  }

  const zip = new JSZip();
  zip.file('export.json', JSON.stringify(exportJson, null, 2));
  const uploadFolder = zip.folder('uploads');
  for (const media of mediaFiles) {
    if (!media.is_available) continue;
    const safePath = resolveUploadPath(uploadsDir, media.file_name);
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      uploadFolder?.file(media.file_name, fs.readFileSync(safePath));
    }
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}
```

- [ ] **Step 4: Implement route and app wiring**

Create `src/server/routes/importExport.ts`:

```ts
import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';
import { buildExportZip } from '../domain/importExport.js';
import { isExportType } from '../../shared/validators.js';

export function importExportRouter(db: Database, uploadsDir: string): Router {
  const router = Router();

  router.get('/export', asyncRoute(async (req, res) => {
    const type = req.query.type;
    if (!isExportType(type)) throw new BadRequestError('type must be marked or pure');
    const zip = await buildExportZip(db, uploadsDir, type);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="cvn-${type}-export.zip"`);
    res.send(zip);
  }));

  return router;
}
```

Modify `src/server/app.ts` imports and route registration:

```ts
import { importExportRouter } from './routes/importExport.js';
```

```ts
  application.use('/api', importExportRouter(db, uploadsDir));
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
npm run typecheck
```

Expected: import/export tests pass for export cases and typecheck passes.

Commit:

```bash
git add src/server/domain/importExport.ts src/server/routes/importExport.ts src/server/app.ts tests/server/importExport.test.ts
git commit -m "feat(import-export): add zip export"
```

---

### Task 3: Import scan

**Files:**
- Modify: `src/server/domain/importExport.ts`
- Modify: `src/server/routes/importExport.ts`
- Test: `tests/server/importExport.test.ts`

- [ ] **Step 1: Add tests for scan conflicts and unsafe paths**

Add helpers and tests:

```ts
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
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
```

Expected: fail because scan route/domain missing.

- [ ] **Step 3: Implement import scan domain**

Append to `src/server/domain/importExport.ts`:

```ts
import type { ImportScanResponseDto } from '../../shared/types.js';
import { BadRequestError } from '../http/errors.js';

function assertSafeUploadEntry(fileName: string): void {
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || path.basename(fileName) !== fileName) {
    throw new BadRequestError('Unsafe media file path');
  }
}

async function readExportJsonFromZip(buffer: Buffer): Promise<{ zip: JSZip; data: ExportJson }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new BadRequestError('Invalid zip file');
  }
  const exportFile = zip.file('export.json');
  if (!exportFile) throw new BadRequestError('export.json is required');
  let data: ExportJson;
  try {
    data = JSON.parse(await exportFile.async('string')) as ExportJson;
  } catch {
    throw new BadRequestError('export.json must be valid JSON');
  }
  if (data.schema_version !== 1) throw new BadRequestError('Unsupported export schema_version');
  if (data.export_type !== 'marked' && data.export_type !== 'pure') throw new BadRequestError('Invalid export_type');
  if (!Array.isArray(data.cards) || !Array.isArray(data.contexts) || !Array.isArray(data.media_files) || !Array.isArray(data.tags) || !Array.isArray(data.card_tags)) {
    throw new BadRequestError('Invalid export.json shape');
  }
  for (const media of data.media_files) assertSafeUploadEntry(media.file_name);
  return { zip, data };
}

export async function scanImportZip(db: Database, buffer: Buffer): Promise<ImportScanResponseDto> {
  const { zip, data } = await readExportJsonFromZip(buffer);
  const conflicts = data.cards.flatMap((card) => {
    const existing = db.prepare(`
      SELECT id FROM word_sense_cards
      WHERE target_word = ? AND context_meaning = ? AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1
    `).get(card.target_word, card.context_meaning) as { id: string } | undefined;
    return existing ? [{
      import_card_id: card.id,
      existing_card_id: existing.id,
      target_word: card.target_word,
      context_meaning: card.context_meaning,
    }] : [];
  });
  const missing_media = data.media_files
    .filter((media) => media.is_available && !zip.file(`uploads/${media.file_name}`))
    .map((media) => media.file_name);

  return {
    schema_version: 1,
    export_type: data.export_type,
    counts: {
      cards: data.cards.length,
      contexts: data.contexts.length,
      media_files: data.media_files.length,
      tags: data.tags.length,
    },
    conflicts,
    missing_media,
  };
}
```

- [ ] **Step 4: Implement scan route**

Modify `src/server/routes/importExport.ts`:

```ts
import multer from 'multer';
import { scanImportZip } from '../domain/importExport.js';
```

Inside router factory:

```ts
  const upload = multer({ storage: multer.memoryStorage() });

  router.post('/import/scan', upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) throw new BadRequestError('file is required');
    const result = await scanImportZip(db, req.file.buffer);
    res.json(result);
  }));
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
npm run typecheck
```

Expected: pass existing export and scan tests.

Commit:

```bash
git add src/server/domain/importExport.ts src/server/routes/importExport.ts tests/server/importExport.test.ts
git commit -m "feat(import-export): scan import conflicts"
```

---

### Task 4: Import execute modes

**Files:**
- Modify: `src/server/domain/importExport.ts`
- Modify: `src/server/routes/importExport.ts`
- Test: `tests/server/importExport.test.ts`

- [ ] **Step 1: Add tests for pure import, conflict modes, missing media, marked preservation**

Add tests:

```ts
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

    await request(createApp(db, { uploadsDir }))
      .post('/api/import/execute')
      .field('decisions', JSON.stringify({ mode: 'import_all_as_new' }))
      .attach('file', zip, 'import.zip')
      .expect(200);
    expect((db.prepare('SELECT COUNT(*) as count FROM word_sense_cards WHERE target_word = ? AND context_meaning = ?').get('charge', '收费') as { count: number }).count).toBe(2);
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
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
```

Expected: fail because execute route/domain missing.

- [ ] **Step 3: Implement execute domain**

Append to `src/server/domain/importExport.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { ImportExecuteDecisionDto, ImportExecuteResponseDto, ImportConflictDecision } from '../../shared/types.js';

function decisionForCard(cardId: string, hasConflict: boolean, decisions: ImportExecuteDecisionDto): ImportConflictDecision {
  if (!hasConflict) return 'import_as_new';
  if (decisions.mode === 'skip_all') return 'skip';
  if (decisions.mode === 'merge_all') return 'merge';
  if (decisions.mode === 'import_all_as_new') return 'import_as_new';
  return decisions.items.find((item) => item.import_card_id === cardId)?.decision ?? 'skip';
}

function normalizeContexts(contexts: ExportJson['contexts']): ExportJson['contexts'] {
  return [...contexts]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .map((context, index) => ({ ...context, sort_order: (index + 1) * 10, is_primary: index === 0 ? 1 : context.is_primary }));
}

export async function executeImportZip(db: Database, uploadsDir: string, buffer: Buffer, decisions: ImportExecuteDecisionDto): Promise<ImportExecuteResponseDto> {
  const { zip, data } = await readExportJsonFromZip(buffer);
  const now = new Date().toISOString();
  const response: ImportExecuteResponseDto = {
    imported_cards: 0,
    imported_contexts: 0,
    imported_media_files: 0,
    skipped_cards: 0,
    merged_cards: 0,
    missing_media_files: 0,
  };

  const transaction = db.transaction(() => {
    const cardMap = new Map<string, string>();
    const contextMap = new Map<string, string>();
    const importedCardIds = new Set<string>();
    const mergedCardIds = new Set<string>();

    for (const card of data.cards) {
      const existing = db.prepare(`
        SELECT id FROM word_sense_cards
        WHERE target_word = ? AND context_meaning = ? AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1
      `).get(card.target_word, card.context_meaning) as { id: string } | undefined;
      const decision = decisionForCard(card.id, Boolean(existing), decisions);
      if (decision === 'skip') {
        response.skipped_cards += 1;
        continue;
      }
      if (decision === 'merge' && existing) {
        cardMap.set(card.id, existing.id);
        mergedCardIds.add(card.id);
        response.merged_cards += 1;
        continue;
      }

      const newCardId = randomUUID();
      cardMap.set(card.id, newCardId);
      importedCardIds.add(card.id);
      db.prepare(`
        INSERT INTO word_sense_cards (id, target_word, context_meaning, target_language, definition_language, status, is_favorite, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newCardId,
        card.target_word,
        card.context_meaning,
        card.target_language,
        card.definition_language,
        data.export_type === 'marked' ? (card.status ?? 'reviewing') : 'reviewing',
        data.export_type === 'marked' ? (card.is_favorite ?? 0) : 0,
        card.created_at,
        now,
      );
      response.imported_cards += 1;
    }

    const contextsByCard = new Map<string, ExportJson['contexts']>();
    for (const context of data.contexts) {
      const group = contextsByCard.get(context.card_id) ?? [];
      group.push(context);
      contextsByCard.set(context.card_id, group);
    }

    for (const [importCardId, contexts] of contextsByCard) {
      const localCardId = cardMap.get(importCardId);
      if (!localCardId) continue;
      for (const context of normalizeContexts(contexts)) {
        const newContextId = randomUUID();
        contextMap.set(context.id, newContextId);
        db.prepare(`
          INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newContextId, localCardId, context.sentence, context.note, context.is_primary, context.sort_order, context.created_at, now);
        response.imported_contexts += 1;
      }
    }

    const tagMap = new Map<string, string>();
    for (const tag of data.tags) {
      const existing = db.prepare('SELECT id FROM tags WHERE name = ? AND deleted_at IS NULL').get(tag.name) as { id: string } | undefined;
      if (existing) {
        tagMap.set(tag.id, existing.id);
      } else {
        const newTagId = randomUUID();
        tagMap.set(tag.id, newTagId);
        db.prepare('INSERT INTO tags (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newTagId, tag.name, tag.created_at, now);
      }
    }

    for (const cardTag of data.card_tags) {
      const localCardId = cardMap.get(cardTag.card_id);
      const localTagId = tagMap.get(cardTag.tag_id);
      if (!localCardId || !localTagId) continue;
      db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id, created_at) VALUES (?, ?, ?)').run(localCardId, localTagId, now);
    }

    for (const media of data.media_files) {
      const localContextId = contextMap.get(media.context_example_id);
      if (!localContextId) continue;
      const zipEntry = media.is_available ? zip.file(`uploads/${media.file_name}`) : null;
      const hasFile = Boolean(zipEntry);
      const storedName = hasFile ? `${randomUUID()}${path.extname(media.file_name).toLowerCase()}` : media.file_name;
      const storedPath = resolveUploadPath(uploadsDir, storedName);
      if (zipEntry) {
        fs.writeFileSync(storedPath, zipEntry.async('nodebuffer') as unknown as Buffer);
      }
      db.prepare(`
        INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), localContextId, media.media_type, storedName, storedPath, media.mime_type, media.file_size, hasFile ? 1 : 0, media.created_at);
      response.imported_media_files += 1;
      if (!hasFile) response.missing_media_files += 1;
    }

    for (const card of data.cards) {
      const localCardId = cardMap.get(card.id);
      if (!localCardId || mergedCardIds.has(card.id)) continue;
      const fsrs = data.export_type === 'marked' ? data.fsrs_states?.find((state) => state.card_id === card.id) : undefined;
      db.prepare(`
        INSERT INTO fsrs_states (id, card_id, due_date, stability, difficulty, reps, lapses, state, last_reviewed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        localCardId,
        fsrs?.due_date ?? now,
        fsrs?.stability ?? null,
        fsrs?.difficulty ?? null,
        fsrs?.reps ?? 0,
        fsrs?.lapses ?? 0,
        fsrs?.state ?? 0,
        fsrs?.last_reviewed_at ?? null,
        fsrs?.created_at ?? now,
        now,
      );
    }

    if (data.export_type === 'marked') {
      for (const log of data.review_logs ?? []) {
        const localCardId = cardMap.get(log.card_id);
        if (!localCardId || mergedCardIds.has(log.card_id)) continue;
        db.prepare(`
          INSERT INTO review_logs (id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), localCardId, log.rating, log.reviewed_at, log.due_date_before, log.due_date_after, log.created_at);
      }
      if (data.settings) {
        db.prepare(`
          UPDATE user_settings
          SET interface_language = ?, default_target_language = ?, default_definition_language = ?, daily_review_limit = ?, updated_at = ?
          WHERE id = 1
        `).run(data.settings.interface_language, data.settings.default_target_language, data.settings.default_definition_language, data.settings.daily_review_limit, now);
      }
    }
  });

  transaction();
  return response;
}
```

Important fix before running: `zipEntry.async()` is async and cannot run inside synchronous SQLite transaction. Replace media file write loop with pre-read map before transaction:

```ts
  const mediaBuffers = new Map<string, Buffer>();
  for (const media of data.media_files) {
    const entry = media.is_available ? zip.file(`uploads/${media.file_name}`) : null;
    if (entry) mediaBuffers.set(media.id, await entry.async('nodebuffer'));
  }
```

Then in transaction use:

```ts
      const mediaBuffer = mediaBuffers.get(media.id);
      const hasFile = Boolean(mediaBuffer);
      const storedName = hasFile ? `${randomUUID()}${path.extname(media.file_name).toLowerCase()}` : media.file_name;
      const storedPath = resolveUploadPath(uploadsDir, storedName);
      if (mediaBuffer) fs.writeFileSync(storedPath, mediaBuffer);
```

- [ ] **Step 4: Implement execute route**

Modify `src/server/routes/importExport.ts` imports:

```ts
import { executeImportZip, scanImportZip } from '../domain/importExport.js';
import { isExportType, isImportExecuteDecision } from '../../shared/validators.js';
import type { ImportExecuteDecisionDto } from '../../shared/types.js';
```

Add route:

```ts
  router.post('/import/execute', upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) throw new BadRequestError('file is required');
    if (typeof req.body.decisions !== 'string') throw new BadRequestError('decisions is required');
    let decisions: unknown;
    try {
      decisions = JSON.parse(req.body.decisions);
    } catch {
      throw new BadRequestError('decisions must be valid JSON');
    }
    if (!isImportExecuteDecision(decisions)) throw new BadRequestError('Invalid import decisions');
    const result = await executeImportZip(db, uploadsDir, req.file.buffer, decisions as ImportExecuteDecisionDto);
    res.json(result);
  }));
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
npm run typecheck
```

Expected: pass all import/export tests and typecheck.

Commit:

```bash
git add src/server/domain/importExport.ts src/server/routes/importExport.ts tests/server/importExport.test.ts
git commit -m "feat(import-export): add zip import"
```

---

### Task 5: Full verification and review

**Files:**
- Modify only if verification finds defects.

- [ ] **Step 1: Run focused verification**

```bash
npm run test -- tests/server/importExport.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 2: Run backend and full verification**

```bash
npm run test -- tests/server
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 3: Request code review**

Use code reviewer for changed files:

```text
Review Phase 4 import/export backend changes in src/server/domain/importExport.ts, src/server/routes/importExport.ts, src/server/app.ts, src/shared/types.ts, src/shared/validators.ts, and tests/server/importExport.test.ts. Focus on data loss, zip path traversal, import transaction safety, marked/pure scope, and V1 requirement mismatches.
```

- [ ] **Step 4: Fix review findings and rerun verification**

Run same commands after any fixes:

```bash
npm run test -- tests/server/importExport.test.ts
npm run typecheck
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit final fixes**

```bash
git status --short
git add src/server/domain/importExport.ts src/server/routes/importExport.ts src/server/app.ts src/shared/types.ts src/shared/validators.ts tests/server/importExport.test.ts
git commit -m "fix(import-export): harden import execution"
```

Only make final fix commit if review found issues after Task 4 commit.

---

## Self-Review

- Spec coverage: covered zip export, scan, execute, marked/pure data rules, conflict modes, media availability, path safety, sort normalization, tests.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: DTO names and route paths are consistent across tasks.
