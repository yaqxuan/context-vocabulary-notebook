# V2 AI Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add V2 card-creation AI suggestions plus Settings-page OpenAI-compatible AI API configuration.

**Architecture:** Store AI configs locally in SQLite, keep API keys server-side, and expose masked config DTOs to the browser. CardCreatePage requests a server-side AI suggestion after sentence + target word are entered; the server calls the active OpenAI-compatible chat-completions endpoint and returns editable suggestions. Existing manual card creation, duplicate detection, and import/export remain primary and must keep working if AI is unavailable.

**Tech Stack:** React 19 + Vite, Express 5, better-sqlite3, Vitest, Testing Library, supertest, JSZip, TypeScript.

---

## File map

- Modify: `src/server/db/schema.sql` — add `ai_configs` table and indexes.
- Modify: `src/shared/types.ts` — add AI config DTOs and AI suggestion request/response types.
- Modify: `src/shared/validators.ts` — add URL/model/key string validators for AI config input.
- Create: `src/server/domain/aiConfigs.ts` — server CRUD, active switching, masked DTO mapper.
- Create: `src/server/routes/aiConfigs.ts` — `/api/ai-configs` CRUD routes.
- Create: `src/server/domain/aiSuggestions.ts` — OpenAI-compatible request/prompt/parser.
- Create: `src/server/routes/aiSuggestions.ts` — `/api/ai/suggestions` route.
- Modify: `src/server/app.ts` — mount new routers.
- Create: `src/client/api/aiConfigs.ts` — client calls for Settings page.
- Create: `src/client/api/aiSuggestions.ts` — client call for CardCreatePage.
- Modify: `src/client/pages/SettingsPage.tsx` — add AI API config manager.
- Modify: `src/client/pages/CardCreatePage.tsx` — reorder fields and add ghost meaning + usage note suggestions.
- Modify: `src/client/styles.css` — style AI config manager and ghost suggestions.
- Modify: `src/server/domain/importExport.ts` — keep exports free of AI API keys and add regression assertion target.
- Test: `tests/server/db.schema.test.ts` — table existence/defaults.
- Test: `tests/server/settings.test.ts` or new `tests/server/aiConfigs.test.ts` — CRUD/validation/masking.
- Test: `tests/server/importExport.test.ts` — AI keys absent from marked export.
- Test: `tests/server/cards.test.ts` or new `tests/server/aiSuggestions.test.ts` — suggestion route and external fetch behavior.
- Test: `tests/client/settingsPage.test.tsx` — AI config UI.
- Test: `tests/client/cardCreatePage.test.tsx` — field order, ghost accept/clear, note suggestion.

---

## Task 1: Add shared AI types

**Files:**
- Modify: `src/shared/types.ts:169-184`

- [ ] **Step 1: Write failing type-usage test**

Add compile-time DTO use to `tests/server/settings.test.ts` near imports:

```ts
import type { AiConfigDto, CreateAiConfigBody, AiSuggestionResponseDto } from '../../src/shared/types.js';

const typeSmokeAiConfig: AiConfigDto = {
  id: 'cfg-1',
  name: 'DeepSeek',
  base_url: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  is_active: 1,
  has_api_key: true,
  created_at: '2026-06-03T00:00:00.000Z',
  updated_at: '2026-06-03T00:00:00.000Z',
};
const typeSmokeCreateAiConfig: CreateAiConfigBody = {
  name: 'DeepSeek',
  base_url: 'https://api.deepseek.com/v1',
  api_key: 'sk-local',
  model: 'deepseek-chat',
};
const typeSmokeAiSuggestion: AiSuggestionResponseDto = {
  status: 'success',
  meaning_suggestion: '收费',
  usage_note: '在句中表示收取费用。',
};
void typeSmokeAiConfig;
void typeSmokeCreateAiConfig;
void typeSmokeAiSuggestion;
```

- [ ] **Step 2: Run typecheck and verify fail**

Run:

```bash
npm run typecheck
```

Expected: FAIL with missing exported members `AiConfigDto`, `CreateAiConfigBody`, or `AiSuggestionResponseDto`.

- [ ] **Step 3: Add shared types**

In `src/shared/types.ts`, after `PatchSettingsBody`, add:

```ts
export interface AiConfigDto {
  id: string;
  name: string;
  base_url: string;
  model: string;
  is_active: number;
  has_api_key: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAiConfigBody {
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_active?: boolean;
}

export interface PatchAiConfigBody {
  name?: string;
  base_url?: string;
  api_key?: string;
  model?: string;
  is_active?: boolean;
}

export interface AiSuggestionRequestDto {
  target_word: string;
  sentence: string;
  target_language?: string;
  definition_language?: string;
}

export type AiSuggestionResponseDto =
  | {
      status: 'success';
      meaning_suggestion: string;
      usage_note: string;
    }
  | {
      status: 'none';
      meaning_suggestion: '';
      usage_note: '';
      message: string;
    };
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS or only failures from later unimplemented tests if tasks have been batched.

- [ ] **Step 5: Commit if user allowed commits**

If user explicitly approved commits, run:

```bash
git add src/shared/types.ts tests/server/settings.test.ts
git commit -m "feat(ai): add shared AI suggestion types"
```

If no commit approval exists, skip commit and note skip in handoff.

---

## Task 2: Add AI config schema

**Files:**
- Modify: `src/server/db/schema.sql:111-120`
- Modify: `tests/server/db.schema.test.ts`

- [ ] **Step 1: Write failing schema test**

In `tests/server/db.schema.test.ts`, add:

```ts
it('creates ai_configs table for OpenAI-compatible settings', () => {
  const columns = db.prepare('PRAGMA table_info(ai_configs)').all() as Array<{ name: string }>;
  expect(columns.map((c) => c.name)).toEqual([
    'id',
    'name',
    'base_url',
    'api_key',
    'model',
    'is_active',
    'created_at',
    'updated_at',
    'deleted_at',
  ]);

  const indexes = db.prepare('PRAGMA index_list(ai_configs)').all() as Array<{ name: string }>;
  expect(indexes.some((idx) => idx.name === 'idx_ai_configs_active')).toBe(true);
});
```

If `db` is named differently in that file, use the existing test database variable name.

- [ ] **Step 2: Run schema test and verify fail**

Run:

```bash
npm run test -- tests/server/db.schema.test.ts
```

Expected: FAIL because `ai_configs` table does not exist.

- [ ] **Step 3: Add schema**

Append to `src/server/db/schema.sql` after `user_settings` table:

```sql
-- AI configs: OpenAI-compatible local API settings for V2 card suggestions
CREATE TABLE IF NOT EXISTS ai_configs (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  base_url   TEXT NOT NULL,
  api_key    TEXT NOT NULL,
  model      TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_configs_active ON ai_configs (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_configs_deleted_at ON ai_configs (deleted_at);
```

- [ ] **Step 4: Run schema test**

Run:

```bash
npm run test -- tests/server/db.schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit if user allowed commits**

```bash
git add src/server/db/schema.sql tests/server/db.schema.test.ts
git commit -m "feat(ai): add AI config schema"
```

Skip if no commit approval.

---

## Task 3: Add AI config domain CRUD

**Files:**
- Create: `src/server/domain/aiConfigs.ts`
- Test: `tests/server/aiConfigs.test.ts`

- [ ] **Step 1: Write failing domain tests**

Create `tests/server/aiConfigs.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

import { createTestDb } from '../../src/server/db/testDb.js';
import {
  createAiConfig,
  deleteAiConfig,
  getActiveAiConfigWithKey,
  listAiConfigs,
  setActiveAiConfig,
  updateAiConfig,
} from '../../src/server/domain/aiConfigs.js';

let db: Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

describe('AI config domain', () => {
  it('creates masked config DTOs without exposing API keys', () => {
    const config = createAiConfig(db, {
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      api_key: 'sk-secret',
      model: 'deepseek-chat',
      is_active: true,
    });

    expect(config).toMatchObject({
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      is_active: 1,
      has_api_key: true,
    });
    expect(config).not.toHaveProperty('api_key');
    expect(listAiConfigs(db)).toHaveLength(1);
  });

  it('keeps exactly one active config', () => {
    const first = createAiConfig(db, {
      name: 'First',
      base_url: 'https://example.com/v1',
      api_key: 'key-1',
      model: 'model-1',
      is_active: true,
    });
    const second = createAiConfig(db, {
      name: 'Second',
      base_url: 'https://example.org/v1',
      api_key: 'key-2',
      model: 'model-2',
      is_active: true,
    });

    const configs = listAiConfigs(db);
    expect(configs.find((cfg) => cfg.id === first.id)?.is_active).toBe(0);
    expect(configs.find((cfg) => cfg.id === second.id)?.is_active).toBe(1);
    expect(getActiveAiConfigWithKey(db)?.api_key).toBe('key-2');
  });

  it('updates metadata without clearing API key when api_key is omitted', () => {
    const config = createAiConfig(db, {
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      api_key: 'sk-secret',
      model: 'deepseek-chat',
    });

    const updated = updateAiConfig(db, config.id, { name: 'DeepSeek Chat', model: 'deepseek-chat-v2' });

    expect(updated).toMatchObject({ name: 'DeepSeek Chat', model: 'deepseek-chat-v2', has_api_key: true });
    expect(getActiveAiConfigWithKey(db)).toBeUndefined();
    const row = db.prepare('SELECT api_key FROM ai_configs WHERE id = ?').get(config.id) as { api_key: string };
    expect(row.api_key).toBe('sk-secret');
  });

  it('can activate and soft-delete configs', () => {
    const first = createAiConfig(db, {
      name: 'First',
      base_url: 'https://example.com/v1',
      api_key: 'key-1',
      model: 'model-1',
    });
    const second = createAiConfig(db, {
      name: 'Second',
      base_url: 'https://example.org/v1',
      api_key: 'key-2',
      model: 'model-2',
    });

    setActiveAiConfig(db, first.id);
    expect(getActiveAiConfigWithKey(db)?.id).toBe(first.id);
    deleteAiConfig(db, first.id);
    expect(getActiveAiConfigWithKey(db)).toBeUndefined();
    expect(listAiConfigs(db).map((cfg) => cfg.id)).toEqual([second.id]);
  });
});
```

- [ ] **Step 2: Run test and verify fail**

Run:

```bash
npm run test -- tests/server/aiConfigs.test.ts
```

Expected: FAIL because `src/server/domain/aiConfigs.ts` does not exist.

- [ ] **Step 3: Create domain module**

Create `src/server/domain/aiConfigs.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { AiConfigDto, CreateAiConfigBody, PatchAiConfigBody } from '../../shared/types.js';

export interface AiConfigRow {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toDto(row: AiConfigRow): AiConfigDto {
  return {
    id: row.id,
    name: row.name,
    base_url: row.base_url,
    model: row.model,
    is_active: row.is_active,
    has_api_key: row.api_key.length > 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function deactivateAll(db: Database): void {
  db.prepare('UPDATE ai_configs SET is_active = 0 WHERE deleted_at IS NULL').run();
}

export function listAiConfigs(db: Database): AiConfigDto[] {
  const rows = db.prepare(`
    SELECT * FROM ai_configs
    WHERE deleted_at IS NULL
    ORDER BY is_active DESC, updated_at DESC, created_at ASC, id ASC
  `).all() as AiConfigRow[];
  return rows.map(toDto);
}

export function getAiConfig(db: Database, id: string): AiConfigRow | undefined {
  return db.prepare('SELECT * FROM ai_configs WHERE id = ? AND deleted_at IS NULL').get(id) as AiConfigRow | undefined;
}

export function getActiveAiConfigWithKey(db: Database): AiConfigRow | undefined {
  return db.prepare(`
    SELECT * FROM ai_configs
    WHERE is_active = 1 AND deleted_at IS NULL
    ORDER BY updated_at DESC, created_at ASC
    LIMIT 1
  `).get() as AiConfigRow | undefined;
}

export function createAiConfig(db: Database, input: CreateAiConfigBody): AiConfigDto {
  const id = randomUUID();
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    if (input.is_active) deactivateAll(db);
    db.prepare(`
      INSERT INTO ai_configs (id, name, base_url, api_key, model, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name.trim(),
      input.base_url.trim().replace(/\/+$/, ''),
      input.api_key.trim(),
      input.model.trim(),
      input.is_active ? 1 : 0,
      now,
      now,
    );
  });
  transaction();
  return toDto(getAiConfig(db, id)!);
}

export function updateAiConfig(db: Database, id: string, input: PatchAiConfigBody): AiConfigDto | undefined {
  const current = getAiConfig(db, id);
  if (!current) return undefined;
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    if (input.is_active === true) deactivateAll(db);
    db.prepare(`
      UPDATE ai_configs
      SET name = ?, base_url = ?, api_key = ?, model = ?, is_active = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      input.name?.trim() ?? current.name,
      input.base_url?.trim().replace(/\/+$/, '') ?? current.base_url,
      input.api_key !== undefined ? input.api_key.trim() : current.api_key,
      input.model?.trim() ?? current.model,
      input.is_active === undefined ? current.is_active : input.is_active ? 1 : 0,
      now,
      id,
    );
  });
  transaction();
  return toDto(getAiConfig(db, id)!);
}

export function setActiveAiConfig(db: Database, id: string): AiConfigDto | undefined {
  const current = getAiConfig(db, id);
  if (!current) return undefined;
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    deactivateAll(db);
    db.prepare('UPDATE ai_configs SET is_active = 1, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, id);
  });
  transaction();
  return toDto(getAiConfig(db, id)!);
}

export function deleteAiConfig(db: Database, id: string): boolean {
  const current = getAiConfig(db, id);
  if (!current) return false;
  const now = new Date().toISOString();
  db.prepare('UPDATE ai_configs SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, now, id);
  return true;
}
```

- [ ] **Step 4: Run domain test**

Run:

```bash
npm run test -- tests/server/aiConfigs.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit if user allowed commits**

```bash
git add src/server/domain/aiConfigs.ts tests/server/aiConfigs.test.ts
git commit -m "feat(ai): manage local AI configs"
```

Skip if no commit approval.

---

## Task 4: Add AI config routes

**Files:**
- Create: `src/server/routes/aiConfigs.ts`
- Modify: `src/server/app.ts:5-66`
- Test: `tests/server/aiConfigs.test.ts`

- [ ] **Step 1: Add failing route tests**

Append to `tests/server/aiConfigs.test.ts`:

```ts
import request from 'supertest';
import { createApp } from '../../src/server/app.js';

describe('AI config API', () => {
  it('creates, lists, activates, patches, and deletes masked configs', async () => {
    const app = createApp(db);

    const created = await request(app).post('/api/ai-configs').send({
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      api_key: 'sk-secret',
      model: 'deepseek-chat',
      is_active: true,
    }).expect(201);

    expect(created.body).toMatchObject({
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      is_active: 1,
      has_api_key: true,
    });
    expect(created.body).not.toHaveProperty('api_key');

    const listed = await request(app).get('/api/ai-configs').expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0]).not.toHaveProperty('api_key');

    const patched = await request(app).patch(`/api/ai-configs/${created.body.id}`).send({
      name: 'DeepSeek Chat',
      model: 'deepseek-chat-v2',
    }).expect(200);
    expect(patched.body).toMatchObject({ name: 'DeepSeek Chat', model: 'deepseek-chat-v2', has_api_key: true });

    await request(app).post(`/api/ai-configs/${created.body.id}/activate`).expect(200);
    await request(app).delete(`/api/ai-configs/${created.body.id}`).expect(200);
    await request(app).get('/api/ai-configs').expect(200).expect([]);
  });

  it('rejects invalid AI config inputs', async () => {
    const app = createApp(db);

    await request(app).post('/api/ai-configs').send({
      name: '',
      base_url: 'ftp://invalid.example',
      api_key: '',
      model: '',
    }).expect(400);

    await request(app).post('/api/ai-configs').send({
      name: 'Bad',
      base_url: 'https://example.com/v1',
      api_key: 'sk-secret',
      model: 'model',
      is_active: 'yes',
    }).expect(400);
  });
});
```

- [ ] **Step 2: Run route tests and verify fail**

Run:

```bash
npm run test -- tests/server/aiConfigs.test.ts
```

Expected: FAIL with 404 for `/api/ai-configs`.

- [ ] **Step 3: Create route module**

Create `src/server/routes/aiConfigs.ts`:

```ts
import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import type { CreateAiConfigBody, PatchAiConfigBody } from '../../shared/types.js';
import { isNonEmptyString } from '../../shared/validators.js';
import { BadRequestError, NotFoundError } from '../http/errors.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { createAiConfig, deleteAiConfig, listAiConfigs, setActiveAiConfig, updateAiConfig } from '../domain/aiConfigs.js';

function requireString(field: string, value: unknown): string {
  if (!isNonEmptyString(value)) throw new BadRequestError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalString(field: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (!isNonEmptyString(value)) throw new BadRequestError(`${field} must be a non-empty string`);
  return value.trim();
}

function parseBoolean(field: string, value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new BadRequestError(`${field} must be a boolean`);
  return value;
}

function assertHttpBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestError('base_url must be a valid http(s) URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('base_url must be a valid http(s) URL');
  }
  return value.replace(/\/+$/, '');
}

export function aiConfigsRouter(db: Database): Router {
  const router = Router();

  router.get('/', asyncRoute(async (_req, res) => {
    res.json(listAiConfigs(db));
  }));

  router.post('/', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const input: CreateAiConfigBody = {
      name: requireString('name', body.name),
      base_url: assertHttpBaseUrl(requireString('base_url', body.base_url)),
      api_key: requireString('api_key', body.api_key),
      model: requireString('model', body.model),
      is_active: parseBoolean('is_active', body.is_active),
    };
    res.status(201).json(createAiConfig(db, input));
  }));

  router.patch('/:id', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const baseUrl = optionalString('base_url', body.base_url);
    const input: PatchAiConfigBody = {
      name: optionalString('name', body.name),
      base_url: baseUrl === undefined ? undefined : assertHttpBaseUrl(baseUrl),
      api_key: optionalString('api_key', body.api_key),
      model: optionalString('model', body.model),
      is_active: parseBoolean('is_active', body.is_active),
    };
    const updated = updateAiConfig(db, req.params.id, input);
    if (!updated) throw new NotFoundError(`AI config not found: ${req.params.id}`);
    res.json(updated);
  }));

  router.post('/:id/activate', asyncRoute(async (req, res) => {
    const updated = setActiveAiConfig(db, req.params.id);
    if (!updated) throw new NotFoundError(`AI config not found: ${req.params.id}`);
    res.json(updated);
  }));

  router.delete('/:id', asyncRoute(async (req, res) => {
    if (!deleteAiConfig(db, req.params.id)) throw new NotFoundError(`AI config not found: ${req.params.id}`);
    res.json({ ok: true });
  }));

  return router;
}
```

- [ ] **Step 4: Mount router**

Modify `src/server/app.ts` imports:

```ts
import { aiConfigsRouter } from './routes/aiConfigs.js';
```

Add before statistics route:

```ts
application.use('/api/ai-configs', aiConfigsRouter(db));
```

- [ ] **Step 5: Run route tests**

Run:

```bash
npm run test -- tests/server/aiConfigs.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit if user allowed commits**

```bash
git add src/server/routes/aiConfigs.ts src/server/app.ts tests/server/aiConfigs.test.ts
git commit -m "feat(ai): expose AI config API"
```

Skip if no commit approval.

---

## Task 5: Add AI suggestion backend

**Files:**
- Create: `src/server/domain/aiSuggestions.ts`
- Create: `src/server/routes/aiSuggestions.ts`
- Modify: `src/server/app.ts`
- Test: `tests/server/aiSuggestions.test.ts`

- [ ] **Step 1: Write failing suggestion route tests**

Create `tests/server/aiSuggestions.test.ts`:

```ts
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from 'better-sqlite3';

import { createApp } from '../../src/server/app.js';
import { createTestDb } from '../../src/server/db/testDb.js';
import { createAiConfig } from '../../src/server/domain/aiConfigs.js';

let db: Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

function aiResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('AI suggestions API', () => {
  it('returns none when no active AI config exists', async () => {
    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
      target_language: '英语',
      definition_language: '中文',
    }).expect(200);

    expect(res.body).toEqual({
      status: 'none',
      meaning_suggestion: '',
      usage_note: '',
      message: 'No active AI config',
    });
  });

  it('calls active OpenAI-compatible endpoint and parses JSON suggestions', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{
        message: {
          content: JSON.stringify({
            meaning_suggestion: '收费',
            usage_note: '在句中表示酒店按每晚收取费用。',
          }),
        },
      }],
    }));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body).toEqual({
      status: 'success',
      meaning_suggestion: '收费',
      usage_note: '在句中表示酒店按每晚收取费用。',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://ai.example/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-secret' }),
    }));
  });

  it('returns none for upstream failure without blocking manual creation', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({ error: 'bad' }, 500));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
  });

  it('rejects missing target word or sentence', async () => {
    await request(createApp(db)).post('/api/ai/suggestions').send({ target_word: '', sentence: '' }).expect(400);
  });
});
```

- [ ] **Step 2: Run tests and verify fail**

Run:

```bash
npm run test -- tests/server/aiSuggestions.test.ts
```

Expected: FAIL because route does not exist.

- [ ] **Step 3: Create domain module**

Create `src/server/domain/aiSuggestions.ts`:

```ts
import type { AiSuggestionRequestDto, AiSuggestionResponseDto } from '../../shared/types.js';
import type { AiConfigRow } from './aiConfigs.js';

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function none(message: string): AiSuggestionResponseDto {
  return { status: 'none', meaning_suggestion: '', usage_note: '', message };
}

function buildPrompt(input: AiSuggestionRequestDto): string {
  return [
    '你是语境单词本的制卡助手。',
    '只根据给定句子解释目标词在当前语境中的意思，不要给词典全义。',
    '输出严格 JSON，不要 Markdown，不要额外文字。',
    'JSON shape: {"meaning_suggestion":"一个中文词或很短中文释义","usage_note":"一句中文说明这个词在本句如何使用"}',
    `学习语言：${input.target_language ?? '英语'}`,
    `释义语言：${input.definition_language ?? '中文'}`,
    `目标词：${input.target_word}`,
    `句子：${input.sentence}`,
  ].join('\n');
}

function parseSuggestionContent(content: string): AiSuggestionResponseDto {
  try {
    const parsed = JSON.parse(content) as { meaning_suggestion?: unknown; usage_note?: unknown };
    const meaning = typeof parsed.meaning_suggestion === 'string' ? parsed.meaning_suggestion.trim() : '';
    const note = typeof parsed.usage_note === 'string' ? parsed.usage_note.trim() : '';
    if (!meaning && !note) return none('AI suggestion empty');
    return { status: 'success', meaning_suggestion: meaning, usage_note: note };
  } catch {
    return none('AI suggestion unavailable');
  }
}

export async function requestAiSuggestion(config: AiConfigRow | undefined, input: AiSuggestionRequestDto): Promise<AiSuggestionResponseDto> {
  if (!config) return none('No active AI config');

  try {
    const response = await fetch(`${config.base_url.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Return strict JSON only.' },
          { role: 'user', content: buildPrompt(input) },
        ],
      }),
    });

    if (!response.ok) return none('AI suggestion unavailable');
    const data = await response.json() as OpenAiChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return none('AI suggestion empty');
    return parseSuggestionContent(content);
  } catch {
    return none('AI suggestion unavailable');
  }
}
```

- [ ] **Step 4: Create route module**

Create `src/server/routes/aiSuggestions.ts`:

```ts
import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import type { AiSuggestionRequestDto } from '../../shared/types.js';
import { isNonEmptyString } from '../../shared/validators.js';
import { BadRequestError } from '../http/errors.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { getActiveAiConfigWithKey } from '../domain/aiConfigs.js';
import { requestAiSuggestion } from '../domain/aiSuggestions.js';

export function aiSuggestionsRouter(db: Database): Router {
  const router = Router();

  router.post('/suggestions', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    if (!isNonEmptyString(body.target_word)) throw new BadRequestError('target_word is required');
    if (!isNonEmptyString(body.sentence)) throw new BadRequestError('sentence is required');

    const input: AiSuggestionRequestDto = {
      target_word: body.target_word.trim(),
      sentence: body.sentence.trim(),
      target_language: isNonEmptyString(body.target_language) ? body.target_language.trim() : undefined,
      definition_language: isNonEmptyString(body.definition_language) ? body.definition_language.trim() : undefined,
    };

    res.json(await requestAiSuggestion(getActiveAiConfigWithKey(db), input));
  }));

  return router;
}
```

- [ ] **Step 5: Mount suggestion route**

Modify `src/server/app.ts` imports:

```ts
import { aiSuggestionsRouter } from './routes/aiSuggestions.js';
```

Add before statistics route:

```ts
application.use('/api/ai', aiSuggestionsRouter(db));
```

- [ ] **Step 6: Run suggestion tests**

Run:

```bash
npm run test -- tests/server/aiSuggestions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit if user allowed commits**

```bash
git add src/server/domain/aiSuggestions.ts src/server/routes/aiSuggestions.ts src/server/app.ts tests/server/aiSuggestions.test.ts
git commit -m "feat(ai): add card suggestion API"
```

Skip if no commit approval.

---

## Task 6: Ensure import/export never includes AI API keys

**Files:**
- Modify: `tests/server/importExport.test.ts`
- Inspect/keep: `src/server/domain/importExport.ts`

- [ ] **Step 1: Add failing/passing regression test**

In `tests/server/importExport.test.ts`, inside `exports marked cards with user-specific state and settings`, after settings assertions, add:

```ts
db.prepare(`
  INSERT INTO ai_configs (id, name, base_url, api_key, model, is_active, created_at, updated_at)
  VALUES ('ai-config-1', 'DeepSeek', 'https://api.deepseek.com/v1', 'sk-secret', 'deepseek-chat', 1, '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z')
`).run();
```

Move this insert before export request in same test. After `const exported = await readExportJson(...)`, add:

```ts
expect(JSON.stringify(exported)).not.toContain('sk-secret');
expect(exported).not.toHaveProperty('ai_configs');
```

- [ ] **Step 2: Run import/export test**

Run:

```bash
npm run test -- tests/server/importExport.test.ts
```

Expected: PASS because current export code only exports `user_settings`; if FAIL because future code accidentally exports AI keys, remove AI configs from export JSON.

- [ ] **Step 3: If needed, keep export JSON unchanged**

Confirm `src/server/domain/importExport.ts` marked export only includes:

```ts
exportJson.settings = db.prepare('SELECT * FROM user_settings WHERE id = 1').get() as ExportJson['settings'];
```

Do not add `ai_configs` to `ExportJson`.

- [ ] **Step 4: Commit if user allowed commits**

```bash
git add tests/server/importExport.test.ts src/server/domain/importExport.ts
git commit -m "test(ai): keep API keys out of exports"
```

Skip if no commit approval.

---

## Task 7: Add client AI API modules

**Files:**
- Create: `src/client/api/aiConfigs.ts`
- Create: `src/client/api/aiSuggestions.ts`
- Test: `tests/client/apiClient.test.ts`

- [ ] **Step 1: Add failing client API test**

In `tests/client/apiClient.test.ts`, add imports:

```ts
import { createAiConfig, deleteAiConfig, listAiConfigs, patchAiConfig, setActiveAiConfig } from '../../src/client/api/aiConfigs';
import { getAiSuggestion } from '../../src/client/api/aiSuggestions';
```

Add test:

```ts
it('calls AI config and suggestion endpoints', async () => {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body ?? null });
    return Promise.resolve(new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } }));
  });

  await listAiConfigs();
  await createAiConfig({ name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', api_key: 'sk-secret', model: 'deepseek-chat' });
  await patchAiConfig('cfg-1', { model: 'deepseek-chat-v2' });
  await setActiveAiConfig('cfg-1');
  await deleteAiConfig('cfg-1');
  await getAiSuggestion({ target_word: 'charge', sentence: 'They charge extra.' });

  expect(calls.map((call) => [call.url, call.method])).toEqual([
    ['/api/ai-configs', 'GET'],
    ['/api/ai-configs', 'POST'],
    ['/api/ai-configs/cfg-1', 'PATCH'],
    ['/api/ai-configs/cfg-1/activate', 'POST'],
    ['/api/ai-configs/cfg-1', 'DELETE'],
    ['/api/ai/suggestions', 'POST'],
  ]);
});
```

- [ ] **Step 2: Run client API test and verify fail**

Run:

```bash
npm run test -- tests/client/apiClient.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Create `aiConfigs` client module**

Create `src/client/api/aiConfigs.ts`:

```ts
import type { AiConfigDto, CreateAiConfigBody, PatchAiConfigBody } from '../../shared/types';
import { apiRequest } from './client';

export function listAiConfigs(): Promise<AiConfigDto[]> {
  return apiRequest<AiConfigDto[]>('/ai-configs');
}

export function createAiConfig(body: CreateAiConfigBody): Promise<AiConfigDto> {
  return apiRequest<AiConfigDto>('/ai-configs', { method: 'POST', json: body });
}

export function patchAiConfig(id: string, body: PatchAiConfigBody): Promise<AiConfigDto> {
  return apiRequest<AiConfigDto>(`/ai-configs/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function setActiveAiConfig(id: string): Promise<AiConfigDto> {
  return apiRequest<AiConfigDto>(`/ai-configs/${encodeURIComponent(id)}/activate`, { method: 'POST' });
}

export function deleteAiConfig(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/ai-configs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
```

- [ ] **Step 4: Create `aiSuggestions` client module**

Create `src/client/api/aiSuggestions.ts`:

```ts
import type { AiSuggestionRequestDto, AiSuggestionResponseDto } from '../../shared/types';
import { apiRequest } from './client';

export function getAiSuggestion(body: AiSuggestionRequestDto): Promise<AiSuggestionResponseDto> {
  return apiRequest<AiSuggestionResponseDto>('/ai/suggestions', { method: 'POST', json: body });
}
```

- [ ] **Step 5: Run client API test**

Run:

```bash
npm run test -- tests/client/apiClient.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit if user allowed commits**

```bash
git add src/client/api/aiConfigs.ts src/client/api/aiSuggestions.ts tests/client/apiClient.test.ts
git commit -m "feat(ai): add client AI APIs"
```

Skip if no commit approval.

---

## Task 8: Add Settings page AI config manager

**Files:**
- Modify: `src/client/pages/SettingsPage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/settingsPage.test.tsx`

- [ ] **Step 1: Add failing Settings page tests**

In `tests/client/settingsPage.test.tsx`, update the default fetch mocks so `/api/ai-configs` returns `[]`. Example in `beforeEach` blocks:

```ts
vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
  const url = String(input);
  if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
  return Promise.resolve(jsonResponse(settings));
});
```

Add test:

```ts
it('manages OpenAI-compatible AI configs without exposing API keys', async () => {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
    if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
    if (url === '/api/ai-configs' && (init?.method ?? 'GET') === 'GET') {
      return Promise.resolve(jsonResponse([{ id: 'cfg-1', name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat', is_active: 1, has_api_key: true, created_at: 'now', updated_at: 'now' }]));
    }
    if (url === '/api/ai-configs' && init?.method === 'POST') {
      return Promise.resolve(jsonResponse({ id: 'cfg-2', name: 'Local', base_url: 'http://localhost:11434/v1', model: 'qwen', is_active: 0, has_api_key: true, created_at: 'now', updated_at: 'now' }, 201));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  render(<SettingsPage />);

  expect(await screen.findByText('AI API 配置')).toBeInTheDocument();
  expect(screen.getByText('DeepSeek')).toBeInTheDocument();
  expect(screen.getByText('当前启用')).toBeInTheDocument();
  expect(screen.getByText('API Key 已保存')).toBeInTheDocument();
  expect(screen.queryByText('sk-secret')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('配置名称'), { target: { value: 'Local' } });
  fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'http://localhost:11434/v1' } });
  fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'ollama' } });
  fireEvent.change(screen.getByLabelText('模型'), { target: { value: 'qwen' } });
  fireEvent.click(screen.getByRole('button', { name: '保存 AI 配置' }));

  await waitFor(() => expect(calls.some((call) => call.url === '/api/ai-configs' && call.method === 'POST')).toBe(true));
  const post = calls.find((call) => call.url === '/api/ai-configs' && call.method === 'POST');
  expect(post?.body).toBe(JSON.stringify({
    name: 'Local',
    base_url: 'http://localhost:11434/v1',
    api_key: 'ollama',
    model: 'qwen',
    is_active: false,
  }));
});
```

- [ ] **Step 2: Run Settings page test and verify fail**

Run:

```bash
npm run test -- tests/client/settingsPage.test.tsx
```

Expected: FAIL because AI API section is missing.

- [ ] **Step 3: Add imports**

In `src/client/pages/SettingsPage.tsx`, add type imports:

```ts
  AiConfigDto,
```

Add API imports:

```ts
import { createAiConfig, deleteAiConfig, listAiConfigs, setActiveAiConfig } from '../api/aiConfigs';
```

- [ ] **Step 4: Add AI config section component**

Add below `SettingsForm` component:

```tsx
function AiConfigSection() {
  const [configs, setConfigs] = useState<AiConfigDto[]>([]);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [makeActive, setMakeActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfigs(await listAiConfigs());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 配置加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  async function handleCreate() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await createAiConfig({
        name: name.trim(),
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        model: model.trim(),
        is_active: makeActive,
      });
      setName('');
      setBaseUrl('');
      setApiKey('');
      setModel('');
      setMakeActive(false);
      setSaved(true);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 配置保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setError(null);
    try {
      await setActiveAiConfig(id);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 配置启用失败');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteAiConfig(id);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 配置删除失败');
    }
  }

  return (
    <section className="phase7-settings-section ai-settings-section">
      <h2 className="phase7-settings-section-title">AI API 配置</h2>
      <p className="phase7-settings-export-desc">
        使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。
      </p>

      {loading ? <p className="phase7-settings-export-desc">AI 配置加载中…</p> : null}
      {!loading && configs.length === 0 ? <p className="phase7-settings-export-desc">暂无 AI 配置</p> : null}
      <div className="ai-config-list">
        {configs.map((config) => (
          <div key={config.id} className="ai-config-card">
            <div>
              <strong>{config.name}</strong>
              <span>{config.model}</span>
              <small>{config.base_url}</small>
              <small>{config.has_api_key ? 'API Key 已保存' : 'API Key 未保存'}</small>
            </div>
            <div className="ai-config-actions">
              {config.is_active ? <span className="ai-config-active">当前启用</span> : (
                <Button onClick={() => handleActivate(config.id)}>启用</Button>
              )}
              <Button variant="secondary" onClick={() => handleDelete(config.id)}>删除</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="phase7-settings-form ai-config-form">
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-name" className="phase7-settings-label">配置名称</label>
          <input id="ai-config-name" className="phase7-settings-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-base-url" className="phase7-settings-label">Base URL</label>
          <input id="ai-config-base-url" className="phase7-settings-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" />
        </div>
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-api-key" className="phase7-settings-label">API Key</label>
          <input id="ai-config-api-key" className="phase7-settings-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </div>
        <div className="phase7-settings-field">
          <label htmlFor="ai-config-model" className="phase7-settings-label">模型</label>
          <input id="ai-config-model" className="phase7-settings-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
        </div>
        <label className="phase7-settings-radio-label">
          <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} />
          保存后立即启用
        </label>
      </div>
      <div className="phase7-settings-actions">
        <Button onClick={handleCreate} disabled={saving}>保存 AI 配置</Button>
        {saved && <span className="phase7-settings-saved-msg">AI 配置已保存</span>}
        {error && <span className="phase7-settings-save-error">{error}</span>}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Render section**

In `SettingsPage` final render, place below `<SettingsForm ... />` and above `<ExportSection />`:

```tsx
<AiConfigSection />
```

- [ ] **Step 6: Add styles**

Append to `src/client/styles.css`:

```css
.ai-settings-section {
  gap: 1rem;
}

.ai-config-list {
  display: grid;
  gap: 0.75rem;
}

.ai-config-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.32);
}

.ai-config-card strong,
.ai-config-card span,
.ai-config-card small {
  display: block;
}

.ai-config-card small {
  color: var(--muted-text);
}

.ai-config-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ai-config-active {
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
  font-size: 0.85rem;
}

.ai-config-form {
  margin-top: 0.5rem;
}
```

- [ ] **Step 7: Run Settings tests**

Run:

```bash
npm run test -- tests/client/settingsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit if user allowed commits**

```bash
git add src/client/pages/SettingsPage.tsx src/client/styles.css tests/client/settingsPage.test.tsx
git commit -m "feat(ai): add settings AI config manager"
```

Skip if no commit approval.

---

## Task 9: Add create-page AI suggestion behavior

**Files:**
- Modify: `src/client/pages/CardCreatePage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/cardCreatePage.test.tsx`

- [ ] **Step 1: Add failing CardCreatePage tests**

In `tests/client/cardCreatePage.test.tsx`, update default fetch mock to handle `/api/ai/suggestions`:

```ts
if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: 'No active AI config' }));
```

Add tests:

```ts
it('orders create fields as sentence, target word, then meaning', async () => {
  render(<CardCreatePage />);

  const labels = screen.getAllByLabelText(/原句|目标单词|当前语境释义/);
  expect(labels.map((el) => el.getAttribute('aria-label'))).toEqual(['原句', '目标单词', '当前语境释义']);
});

it('shows ghost AI meaning suggestion and accepts it with Enter', async () => {
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
    if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
    if (url === '/api/ai/suggestions') {
      return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '在句中表示收取费用。' }));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  render(<CardCreatePage />);

  fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
  fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

  expect(await screen.findByText('AI 建议：收费')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByLabelText('当前语境释义'), { key: 'Enter' });
  expect(screen.getByLabelText('当前语境释义')).toHaveValue('收费');
  expect(screen.getByLabelText('AI 建议')).toHaveValue('在句中表示收取费用。');
});

it('clears ghost AI meaning suggestion with Backspace and shows none when empty', async () => {
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
    if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
    if (url === '/api/ai/suggestions') {
      return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '' }));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  render(<CardCreatePage />);

  fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
  fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

  expect(await screen.findByText('AI 建议：收费')).toBeInTheDocument();
  expect(screen.getByText('none')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByLabelText('当前语境释义'), { key: 'Backspace' });
  expect(screen.queryByText('AI 建议：收费')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run CardCreatePage tests and verify fail**

Run:

```bash
npm run test -- tests/client/cardCreatePage.test.tsx
```

Expected: FAIL because order and AI behavior not implemented.

- [ ] **Step 3: Add import and state**

In `src/client/pages/CardCreatePage.tsx`, add import:

```ts
import { getAiSuggestion } from '../api/aiSuggestions';
```

Add state after existing suggestion state:

```ts
const [aiMeaningSuggestion, setAiMeaningSuggestion] = useState('');
const [aiUsageSuggestion, setAiUsageSuggestion] = useState('');
const [aiSuggestionState, setAiSuggestionState] = useState<'idle' | 'loading' | 'none' | 'success' | 'error'>('idle');
const [meaningTouched, setMeaningTouched] = useState(false);
const [noteTouched, setNoteTouched] = useState(false);
```

- [ ] **Step 4: Add AI suggestion effect**

After existing card suggestions effect, add:

```ts
useEffect(() => {
  if (explicitCardId) return;
  const trimmedWord = targetWord.trim();
  const trimmedSentence = sentence.trim();
  if (!trimmedWord || !trimmedSentence) {
    setAiMeaningSuggestion('');
    setAiUsageSuggestion('');
    setAiSuggestionState('idle');
    return;
  }

  let active = true;
  setAiSuggestionState('loading');
  const timer = window.setTimeout(() => {
    getAiSuggestion({
      target_word: trimmedWord,
      sentence: trimmedSentence,
      target_language: targetLanguage.trim() || DEFAULT_TARGET_LANGUAGE,
      definition_language: definitionLanguage.trim() || DEFAULT_DEFINITION_LANGUAGE,
    })
      .then((result) => {
        if (!active) return;
        if (result.status === 'success') {
          setAiMeaningSuggestion(result.meaning_suggestion);
          setAiUsageSuggestion(result.usage_note);
          setAiSuggestionState('success');
          if (!noteTouched && !note.trim() && result.usage_note) setNote(result.usage_note);
        } else {
          setAiMeaningSuggestion('');
          setAiUsageSuggestion('');
          setAiSuggestionState('none');
        }
      })
      .catch(() => {
        if (!active) return;
        setAiMeaningSuggestion('');
        setAiUsageSuggestion('');
        setAiSuggestionState('error');
      });
  }, 400);

  return () => {
    active = false;
    window.clearTimeout(timer);
  };
}, [targetWord, sentence, targetLanguage, definitionLanguage, explicitCardId, noteTouched, note]);
```

- [ ] **Step 5: Add handlers**

Before `handleSubmit`, add:

```ts
function handleMeaningChange(value: string) {
  setMeaningTouched(true);
  setMeaning(value);
}

function handleMeaningKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
  if (!meaning.trim() && aiMeaningSuggestion) {
    if (event.key === 'Enter') {
      event.preventDefault();
      setMeaning(aiMeaningSuggestion);
      setMeaningTouched(true);
      setAiMeaningSuggestion('');
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      setAiMeaningSuggestion('');
      setMeaningTouched(true);
    }
  }
}

function handleNoteChange(value: string) {
  setNoteTouched(true);
  setNote(value);
}
```

Update React import type list:

```ts
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
```

Then use `KeyboardEvent<HTMLInputElement>` instead of `React.KeyboardEvent<HTMLInputElement>` if desired.

- [ ] **Step 6: Reorder fields in JSX**

Move Sentence label block before Target word. Use exact order:

```tsx
<label className="card-create-field card-create-field-wide" htmlFor="cc-sentence">
  <span>原句</span>
  <textarea
    id="cc-sentence"
    aria-label="原句"
    value={sentence}
    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSentence(e.target.value)}
    placeholder="The hotel charges $100 per night."
    rows={4}
  />
  <small>先写完整语境句子，再填写生词。</small>
  {errors.sentence ? <em>{errors.sentence}</em> : null}
</label>

<label className="card-create-field" htmlFor="cc-target-word">
  <span>目标单词</span>
  <input
    id="cc-target-word"
    aria-label="目标单词"
    value={targetWord}
    onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetWord(e.target.value)}
    placeholder="例如：charge"
    disabled={Boolean(explicitCardId)}
  />
  {errors.targetWord ? <em>{errors.targetWord}</em> : null}
</label>
```

- [ ] **Step 7: Update meaning field with ghost suggestion**

Replace meaning field input block with:

```tsx
<label className="card-create-field card-create-meaning-field" htmlFor="cc-meaning">
  <span>当前语境释义</span>
  <div className="card-create-ghost-wrap">
    <input
      id="cc-meaning"
      aria-label="当前语境释义"
      value={currentMeaning}
      onChange={(e: ChangeEvent<HTMLInputElement>) => handleMeaningChange(e.target.value)}
      onKeyDown={handleMeaningKeyDown}
      disabled={mode.kind === 'existing' || Boolean(explicitCardId)}
      placeholder={aiMeaningSuggestion && !meaningTouched ? '' : '例如：收费'}
    />
    {!currentMeaning && aiMeaningSuggestion ? (
      <span className="card-create-ghost-text">AI 建议：{aiMeaningSuggestion}</span>
    ) : null}
  </div>
  <small>只写这个语境下的意思。Enter 采纳 AI 建议，Backspace 删除建议。</small>
  {errors.meaning ? <em>{errors.meaning}</em> : null}
</label>
```

- [ ] **Step 8: Replace note label with AI suggestion label**

Replace Note block with:

```tsx
<label className="card-create-field card-create-field-wide" htmlFor="cc-note">
  <span>AI 建议</span>
  <textarea
    id="cc-note"
    aria-label="AI 建议"
    value={note}
    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleNoteChange(e.target.value)}
    placeholder={aiSuggestionState === 'loading' ? 'AI 建议生成中…' : 'none'}
    rows={3}
  />
  <small>{aiUsageSuggestion ? '可保留、修改或删除这条语境用法说明。' : 'none'}</small>
</label>
```

- [ ] **Step 9: Add styles**

Append to `src/client/styles.css`:

```css
.card-create-ghost-wrap {
  position: relative;
}

.card-create-ghost-wrap input {
  position: relative;
  z-index: 1;
  background: transparent;
}

.card-create-ghost-text {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(148, 163, 184, 0.72);
  pointer-events: none;
  z-index: 0;
  font-size: 0.95rem;
}
```

- [ ] **Step 10: Run CardCreatePage tests**

Run:

```bash
npm run test -- tests/client/cardCreatePage.test.tsx
```

Expected: PASS. Update existing tests that query `当前语境释义` and `原句` only if field order changed expectations.

- [ ] **Step 11: Commit if user allowed commits**

```bash
git add src/client/pages/CardCreatePage.tsx src/client/styles.css tests/client/cardCreatePage.test.tsx
git commit -m "feat(ai): show card creation suggestions"
```

Skip if no commit approval.

---

## Task 10: Run focused integration tests and typecheck

**Files:**
- No new files. Fix files from prior tasks if failures surface.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test -- tests/server/aiConfigs.test.ts tests/server/aiSuggestions.test.ts tests/server/importExport.test.ts tests/client/settingsPage.test.tsx tests/client/cardCreatePage.test.tsx tests/client/apiClient.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run full tests**

Run:

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit if user allowed commits**

```bash
git add src tests
git commit -m "test(ai): verify V2 AI suggestions"
```

Skip if no commit approval.

---

## Task 11: Manual verification

**Files:**
- No code changes unless manual verification finds issues.

- [ ] **Step 1: Start app**

Run:

```bash
npm run dev
```

Expected: Vite and Express dev servers start.

- [ ] **Step 2: Configure AI in Settings**

Open app in browser. Navigate to `#/settings`.

Add config:

```text
配置名称: Local Test
Base URL: http://localhost:11434/v1
API Key: local-test-key
模型: qwen
保存后立即启用: checked
```

Expected: config appears, shows `当前启用`, shows `API Key 已保存`, does not show raw key.

- [ ] **Step 3: Verify create page field order and fallback**

Navigate to `#/create`.

Expected top fields:

```text
原句
目标单词
当前语境释义
AI 建议
```

If local AI endpoint is unavailable, expected AI note area shows `none`; card can still be saved manually.

- [ ] **Step 4: Verify AI accept/clear behavior with available endpoint**

With active compatible endpoint available, enter:

```text
原句: The hotel charges $100 per night.
目标单词: charge
```

Expected: ghost meaning appears as `AI 建议：收费` or similar. Press Enter in 释义 field. Expected: field becomes suggested text. Clear field and repeat; press Backspace. Expected: ghost suggestion disappears.

- [ ] **Step 5: Verify export excludes keys**

Export marked backup from Settings. Inspect `export.json` inside zip.

Expected: no `api_key`, no raw key string, no `ai_configs` field.

---

## Self-review

1. **Spec coverage:** Covered create-page field order, ghost meaning suggestion, Enter accept, Backspace clear, editable/deletable usage note, `none` fallback, OpenAI-compatible settings, config switching, no hard config cap, local key storage, masked UI, export exclusion.
2. **Placeholder scan:** No `TBD`, `TODO`, or vague “handle edge cases” tasks. Each implementation task has files, tests, code, commands, expected result.
3. **Type consistency:** Shared DTO names match planned server/client imports: `AiConfigDto`, `CreateAiConfigBody`, `PatchAiConfigBody`, `AiSuggestionRequestDto`, `AiSuggestionResponseDto`. Endpoints match client modules: `/api/ai-configs`, `/api/ai/suggestions`.
