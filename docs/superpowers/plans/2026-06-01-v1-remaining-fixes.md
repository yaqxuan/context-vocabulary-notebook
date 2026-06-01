# V1 Remaining Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining V1 risks for primary-context invariants, media size limits, and create-page language defaults.

**Architecture:** Keep fixes small and localized. Server domain logic preserves the primary context invariant in `deleteContext`; shared constants define media limits used by both server and client; `CardCreatePage` reads saved settings only for new-card defaults while explicit append mode keeps card languages.

**Tech Stack:** TypeScript, React, Express, multer, SQLite via better-sqlite3, Vitest, Testing Library, Supertest.

---

## File Structure

- Modify `src/server/domain/contexts.ts`
  - Promote earliest remaining context when deleting the current primary context.
- Modify `tests/server/contexts.test.ts`
  - Add domain tests for primary promotion and single-context deletion.
- Modify `src/shared/constants.ts`
  - Add `MEDIA_SIZE_LIMITS_BYTES` and `MEDIA_SIZE_LIMIT_MESSAGES`.
- Modify `src/server/routes/media.ts`
  - Use video limit as default multer coarse limit.
  - Enforce per-type limit after media type resolution.
- Modify `tests/server/media.test.ts`
  - Add over-limit image/audio/video tests.
- Modify `src/client/pages/CardCreatePage.tsx`
  - Use shared media limit constants for client validation.
  - Load settings defaults for new-card mode.
  - Keep explicit append mode languages from card details.
- Modify `tests/client/cardCreatePage.test.tsx`
  - Add settings defaults tests and oversize file validation tests.

---

### Task 1: Primary context promotion after delete

**Files:**
- Modify: `src/server/domain/contexts.ts:117-133`
- Test: `tests/server/contexts.test.ts:149-195`

- [ ] **Step 1: Write failing tests**

Add these tests inside `describe('deleteContext (domain)', ...)` in `tests/server/contexts.test.ts`:

```ts
it('promotes the earliest remaining context when deleting the primary context', () => {
  const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
  const primary = createContext(db, { card_id: card.id, sentence: 'Primary.' });

  const earliest = '2020-01-01T00:00:00.000Z';
  db.prepare(`
    INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
    VALUES ('ctx-earliest', ?, 'Earliest remaining.', NULL, 0, 30, ?, ?)
  `).run(card.id, earliest, earliest);

  const later = '2025-01-01T00:00:00.000Z';
  db.prepare(`
    INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
    VALUES ('ctx-later', ?, 'Later remaining.', NULL, 0, 20, ?, ?)
  `).run(card.id, later, later);

  deleteContext(db, primary.id);

  const promoted = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get('ctx-earliest') as { is_primary: number };
  const notPromoted = db.prepare('SELECT is_primary FROM context_examples WHERE id = ?').get('ctx-later') as { is_primary: number };
  expect(promoted.is_primary).toBe(1);
  expect(notPromoted.is_primary).toBe(0);
});

it('leaves no active primary when deleting the only context', () => {
  const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
  const only = createContext(db, { card_id: card.id, sentence: 'Only context.' });

  deleteContext(db, only.id);

  const activePrimary = db.prepare(`
    SELECT COUNT(*) as count FROM context_examples
    WHERE card_id = ? AND deleted_at IS NULL AND is_primary = 1
  `).get(card.id) as { count: number };
  expect(activePrimary.count).toBe(0);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/server/contexts.test.ts
```

Expected: first new test FAILS because no remaining context is promoted.

- [ ] **Step 3: Implement promotion in transaction**

Replace `deleteContext` in `src/server/domain/contexts.ts` with:

```ts
export function deleteContext(db: Database, contextId: string): void {
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    const current = db.prepare(`
      SELECT id, card_id, is_primary FROM context_examples
      WHERE id = ? AND deleted_at IS NULL
    `).get(contextId) as { id: string; card_id: string; is_primary: number } | undefined;

    if (!current) return;

    db.prepare(`
      UPDATE media_files SET deleted_at = ? WHERE context_example_id = ? AND deleted_at IS NULL
    `).run(now, contextId);

    db.prepare(`
      UPDATE context_examples SET is_primary = 0, deleted_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, contextId);

    if (current.is_primary !== 1) return;

    const nextPrimary = db.prepare(`
      SELECT id FROM context_examples
      WHERE card_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `).get(current.card_id) as { id: string } | undefined;

    if (!nextPrimary) return;

    db.prepare(`
      UPDATE context_examples SET is_primary = 1, updated_at = ? WHERE id = ?
    `).run(now, nextPrimary.id);
  });

  transaction();
}
```

- [ ] **Step 4: Run passing tests**

Run:

```bash
npm test -- tests/server/contexts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/contexts.ts tests/server/contexts.test.ts
git commit -m "fix(server): promote primary context after delete

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Shared media size constants

**Files:**
- Modify: `src/shared/constants.ts:1-21`

- [ ] **Step 1: Add shared constants**

In `src/shared/constants.ts`, after `MEDIA_TYPES`, add:

```ts
export const MEDIA_SIZE_LIMITS_BYTES: Record<MediaType, number> = {
  image: 10 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 300 * 1024 * 1024,
};

export const MEDIA_SIZE_LIMIT_MESSAGES: Record<MediaType, string> = {
  image: '图片不能超过 10MB',
  audio: '音频不能超过 50MB',
  video: '视频不能超过 300MB',
};
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shared/constants.ts
git commit -m "fix(shared): define media size limits

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Server media per-type hard limits

**Files:**
- Modify: `src/server/routes/media.ts:1-98`
- Test: `tests/server/media.test.ts:41-128`

- [ ] **Step 1: Write failing server tests**

Add import in `tests/server/media.test.ts`:

```ts
import { MEDIA_SIZE_LIMITS_BYTES, MEDIA_SIZE_LIMIT_MESSAGES } from '../../src/shared/constants.js';
```

Add helper near `file` setup section:

```ts
function oversizedBuffer(limit: number): Buffer {
  return Buffer.alloc(limit + 1, 0);
}
```

Add tests inside `describe('POST /api/media', ...)`:

```ts
it('rejects images larger than 10MB and creates no media row', async () => {
  const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
  const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

  const res = await request(app)
    .post('/api/media')
    .field('context_example_id', ctx.id)
    .attach('file', oversizedBuffer(MEDIA_SIZE_LIMITS_BYTES.image), { filename: 'huge.png', contentType: 'image/png' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe(MEDIA_SIZE_LIMIT_MESSAGES.image);
  const count = db.prepare('SELECT COUNT(*) as count FROM media_files').get() as { count: number };
  expect(count.count).toBe(0);
  expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
});

it('rejects audio larger than 50MB and creates no media row', async () => {
  const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
  const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

  const res = await request(app)
    .post('/api/media')
    .field('context_example_id', ctx.id)
    .attach('file', oversizedBuffer(MEDIA_SIZE_LIMITS_BYTES.audio), { filename: 'huge.mp3', contentType: 'audio/mpeg' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe(MEDIA_SIZE_LIMIT_MESSAGES.audio);
  const count = db.prepare('SELECT COUNT(*) as count FROM media_files').get() as { count: number };
  expect(count.count).toBe(0);
  expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
});

it('rejects videos larger than 300MB and creates no media row', async () => {
  const limitedApp = createApp(db, { uploadsDir, uploadMaxBytes: MEDIA_SIZE_LIMITS_BYTES.video + 1 });
  const card = createCard(db, { target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文' });
  const ctx = createContext(db, { card_id: card.id, sentence: 'Test.' });

  const res = await request(limitedApp)
    .post('/api/media')
    .field('context_example_id', ctx.id)
    .attach('file', oversizedBuffer(MEDIA_SIZE_LIMITS_BYTES.video), { filename: 'huge.mp4', contentType: 'video/mp4' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe(MEDIA_SIZE_LIMIT_MESSAGES.video);
  const count = db.prepare('SELECT COUNT(*) as count FROM media_files').get() as { count: number };
  expect(count.count).toBe(0);
  expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
});
```

Note: video test uses `uploadMaxBytes: video limit + 1` so multer accepts the file and per-type validation returns the Chinese message.

- [ ] **Step 2: Run failing media tests**

Run:

```bash
npm test -- tests/server/media.test.ts
```

Expected: new tests FAIL because per-type limit messages are not implemented.

- [ ] **Step 3: Implement server per-type limits**

In `src/server/routes/media.ts`, import constants:

```ts
import { MEDIA_SIZE_LIMIT_MESSAGES, MEDIA_SIZE_LIMITS_BYTES } from '../../shared/constants.js';
```

Replace default size:

```ts
const DEFAULT_MAX_FILE_SIZE_BYTES = MEDIA_SIZE_LIMITS_BYTES.video;
```

After `mediaType` resolution and before context lookup, add:

```ts
      if (req.file.size > MEDIA_SIZE_LIMITS_BYTES[mediaType]) {
        throw new BadRequestError(MEDIA_SIZE_LIMIT_MESSAGES[mediaType]);
      }
```

Keep the existing `catch` block; it deletes the uploaded file before rethrowing.

- [ ] **Step 4: Run passing media tests**

Run:

```bash
npm test -- tests/server/media.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/media.ts tests/server/media.test.ts
git commit -m "fix(server): enforce media size limits

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Client media size validation

**Files:**
- Modify: `src/client/pages/CardCreatePage.tsx:1-160`
- Test: `tests/client/cardCreatePage.test.tsx:60-77`

- [ ] **Step 1: Write failing client test**

Update `file()` helper in `tests/client/cardCreatePage.test.tsx` to accept optional size:

```ts
function file(name: string, type: string, size = 6): File {
  return new File([new Uint8Array(size)], name, { type });
}
```

Import constants:

```ts
import { MEDIA_SIZE_LIMITS_BYTES } from '../../src/shared/constants';
```

Add test after unsupported-media test:

```ts
it('rejects oversized media files before saving', async () => {
  render(<CardCreatePage />);

  fireEvent.change(screen.getByLabelText('上传本地视频'), {
    target: { files: [file('huge.mp4', 'video/mp4', MEDIA_SIZE_LIMITS_BYTES.video + 1)] },
  });
  fireEvent.change(screen.getByLabelText('上传截图'), {
    target: { files: [file('huge.png', 'image/png', MEDIA_SIZE_LIMITS_BYTES.image + 1)] },
  });
  fireEvent.change(screen.getByLabelText('上传音频'), {
    target: { files: [file('huge.mp3', 'audio/mpeg', MEDIA_SIZE_LIMITS_BYTES.audio + 1)] },
  });

  expect(await screen.findByText('视频不能超过 300MB')).toBeInTheDocument();
  expect(screen.getByText('图片不能超过 10MB')).toBeInTheDocument();
  expect(screen.getByText('音频不能超过 50MB')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing create-page tests**

Run:

```bash
npm test -- tests/client/cardCreatePage.test.tsx
```

Expected: new oversized test FAILS.

- [ ] **Step 3: Implement client validation**

In `src/client/pages/CardCreatePage.tsx`, import constants:

```ts
import { MEDIA_SIZE_LIMIT_MESSAGES, MEDIA_SIZE_LIMITS_BYTES } from '../../shared/constants';
```

Add helper near media type helpers:

```ts
function mediaSizeError(kind: 'video' | 'screenshot' | 'audio', file: File): string | null {
  const mediaType = kind === 'screenshot' ? 'image' : kind;
  return file.size > MEDIA_SIZE_LIMITS_BYTES[mediaType] ? MEDIA_SIZE_LIMIT_MESSAGES[mediaType] : null;
}
```

In `handleMediaChange`, after type validation blocks and before setting state, add:

```ts
    const sizeError = mediaSizeError(kind, next);
    if (sizeError) {
      if (kind === 'video') setVideo(null);
      if (kind === 'screenshot') setScreenshot(null);
      if (kind === 'audio') setAudio(null);
      setErrors((cur) => ({ ...cur, [kind]: sizeError }));
      return;
    }
```

- [ ] **Step 4: Run passing create-page tests**

Run:

```bash
npm test -- tests/client/cardCreatePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/CardCreatePage.tsx tests/client/cardCreatePage.test.tsx
git commit -m "fix(client): validate media size before upload

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Create page settings default languages

**Files:**
- Modify: `src/client/pages/CardCreatePage.tsx:1-110`
- Test: `tests/client/cardCreatePage.test.tsx`

- [ ] **Step 1: Write failing settings tests**

Add tests in `tests/client/cardCreatePage.test.tsx`:

```ts
it('uses settings default languages for new card mode', async () => {
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/settings') {
      return Promise.resolve(jsonResponse({
        id: 1,
        interface_language: '中文',
        default_target_language: '日语',
        default_definition_language: '英文',
        daily_review_limit: 20,
        created_at: 'now',
        updated_at: 'now',
      }));
    }
    if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
    if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  render(<CardCreatePage />);

  expect(await screen.findByLabelText('学习语言')).toHaveValue('日语');
  expect(screen.getByLabelText('释义语言')).toHaveValue('英文');
});

it('keeps fallback languages when settings fail to load', async () => {
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/settings') return Promise.resolve(jsonResponse({ error: 'settings unavailable' }, 500));
    if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
    if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  render(<CardCreatePage />);

  expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
  expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
});

it('keeps explicit append card languages instead of settings defaults', async () => {
  window.location.hash = '#/create?card_id=card-1';
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/settings') {
      return Promise.resolve(jsonResponse({
        id: 1,
        interface_language: '中文',
        default_target_language: '日语',
        default_definition_language: '英文',
        daily_review_limit: 20,
        created_at: 'now',
        updated_at: 'now',
      }));
    }
    if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
    if (url === '/api/cards/card-1') {
      return Promise.resolve(jsonResponse({
        id: 'card-1',
        target_word: 'charge',
        context_meaning: '收费',
        target_language: '英语',
        definition_language: '中文',
        status: 'reviewing',
        is_favorite: 0,
        created_at: 'now',
        updated_at: 'now',
        primary_sentence: null,
        context_count: 1,
        tags: [],
        contexts: [],
        media: [],
        fsrs: { due_date: 'now', stability: 1, difficulty: 5, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
      }));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  render(<CardCreatePage />);

  expect(await screen.findByDisplayValue('charge')).toBeDisabled();
  expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
  expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/client/cardCreatePage.test.tsx
```

Expected: settings-default test FAILS because create page does not call `/api/settings` yet.

- [ ] **Step 3: Implement settings load**

In `src/client/pages/CardCreatePage.tsx`, add import:

```ts
import { getSettings } from '../api/settings';
```

Add effect after tag-loading effect:

```ts
  useEffect(() => {
    if (explicitCardId) return;
    let active = true;
    getSettings()
      .then((settings) => {
        if (!active) return;
        setTargetLanguage(settings.default_target_language || DEFAULT_TARGET_LANGUAGE);
        setDefinitionLanguage(settings.default_definition_language || DEFAULT_DEFINITION_LANGUAGE);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [explicitCardId]);
```

Keep existing explicit-card effect unchanged; it sets languages from the loaded card.

- [ ] **Step 4: Run passing tests**

Run:

```bash
npm test -- tests/client/cardCreatePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/CardCreatePage.tsx tests/client/cardCreatePage.test.tsx
git commit -m "fix(client): use settings language defaults

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Final verification

**Files:**
- No planned source changes unless tests reveal issues.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- tests/server/contexts.test.ts tests/server/media.test.ts tests/client/cardCreatePage.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run:

```bash
npm test
```

Expected: 23 test files PASS, all tests PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: typecheck, Vite build, and server build PASS.

- [ ] **Step 4: Review branch status**

Run:

```bash
git status --short --branch
git log --oneline --decorate -12
```

Expected: clean working tree on `main`; branch ahead of `origin/main`; no push performed.

---

## Self-Review

Spec coverage:

- Primary-context write-back: Task 1.
- Shared media limits: Task 2.
- Server media hard limits: Task 3.
- Client media hard limits: Task 4.
- Create-page settings defaults: Task 5.
- Verification: Task 6.

Placeholder scan:

- No TBD/TODO/fill-in placeholders.
- Every implementation step includes exact code or exact behavior.

Type consistency:

- `MediaType`, `MEDIA_SIZE_LIMITS_BYTES`, `MEDIA_SIZE_LIMIT_MESSAGES` are defined in `src/shared/constants.ts` before use.
- `getSettings()` already exists in `src/client/api/settings.ts` and returns `SettingsDto`.
- `CardCreatePage` already has `explicitCardId` and explicit append mode from previous V1 gap work.
