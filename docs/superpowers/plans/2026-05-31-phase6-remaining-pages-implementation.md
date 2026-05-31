# Phase 6 Remaining Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining Phase 6 pages: word sense card list, word sense card detail, tag management, and favorites.

**Architecture:** Extend card list DTOs so list-like pages can render primary context, tags, and context count without per-card detail calls. Add small focused client API wrappers for context operations. Implement each page as a focused React route using existing hash routing, shared components, and one notebook-studio visual foundation.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Vitest, React Testing Library, Express, SQLite via better-sqlite3.

---

## Scope and Gate Notes

User explicitly approved batch design/implementation for Phase 6 remaining pages on 2026-05-31: build pages first, then tune UI together. This overrides the normal per-page draft gate for these Phase 6 pages only.

In scope:

- `#/cards` word sense card list.
- `#/cards/:id` word sense card detail.
- `#/tags` tag management.
- `#/favorites` favorites list.
- Shared list/card UI needed by these pages.
- Backend DTO expansion needed by list/favorites/tag-card views.

Out of scope:

- Review page.
- Statistics page.
- Settings page.
- Import/export UI except future settings entry.
- Dictionary, phonetics, AI, OCR, ASR, subtitle extraction, website video links, sync, CLI, MCP.
- Bulk list operations.
- Inline media preview editing beyond showing existing media on detail.

Do not commit unless the user explicitly asks. Use verification checkpoints instead of git commits.

## File Structure

Create:

- `src/client/api/contexts.ts` — context create/update/delete/reorder/primary wrappers.
- `src/client/components/CardCatalogue.tsx` — reusable list controls and card rows for `#/cards`, `#/favorites`, and tag-card panels.
- `src/client/pages/CardListPage.tsx` — all cards list page.
- `src/client/pages/CardDetailPage.tsx` — detail page with contexts, media, tags, and status/favorite edits.
- `src/client/pages/TagsPage.tsx` — tag CRUD and tag-card browsing entry.
- `src/client/pages/FavoritesPage.tsx` — favorites-only list page.
- `tests/client/phase6Pages.test.tsx` — client page coverage for list/detail/tags/favorites.
- `tests/server/cardListDto.test.ts` — server DTO coverage for primary sentence/tags/context count.

Modify:

- `src/shared/types.ts` — extend `CardSummaryDto`; add context operation request/response shapes if useful.
- `src/server/domain/cards.ts` — list query returns summary fields.
- `src/server/routes/cards.ts` — return expanded list DTO and fix detail response shape.
- `src/server/routes/tags.ts` — tag cards route returns expanded list DTO via shared listCards domain function.
- `src/client/api/cards.ts` — types continue to work after DTO expansion.
- `src/client/App.tsx` — route Phase 6 pages to real components.
- `src/client/styles.css` — add notebook-studio catalogue/detail/tag/favorites classes.
- `tests/client/app.test.tsx` — mock Phase 6 API calls and assert real routes.

---

## Task 1: Extend Card List DTO on Server

**Files:**

- Modify: `src/shared/types.ts`
- Modify: `src/server/domain/cards.ts`
- Modify: `src/server/routes/cards.ts`
- Modify: `src/server/routes/tags.ts`
- Test: `tests/server/cardListDto.test.ts`

- [ ] **Step 1: Update shared card summary type**

In `src/shared/types.ts`, replace `CardSummaryDto` with:

```ts
export interface CardSummaryDto {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
  status: CardStatus;
  is_favorite: number;
  created_at: string;
  updated_at: string;
  primary_sentence: string | null;
  context_count: number;
  tags: TagDto[];
}
```

Keep `CardDetailDto extends CardSummaryDto` unchanged.

- [ ] **Step 2: Add list row helper types**

In `src/server/domain/cards.ts`, add after `CardRow`:

```ts
export interface CardListRow extends CardRow {
  primary_sentence: string | null;
  context_count: number;
}

export interface CardSummaryRow extends CardListRow {
  tags: Array<{ id: string; name: string; created_at: string; updated_at: string }>;
}
```

Change `ListCardsResult` to:

```ts
export interface ListCardsResult {
  items: CardSummaryRow[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 3: Implement expanded list query**

In `src/server/domain/cards.ts`, replace the rows query inside `listCards()` with:

```ts
const rows = db.prepare(`
  SELECT
    wsc.*,
    COALESCE(primary_ctx.sentence, fallback_ctx.sentence) as primary_sentence,
    (
      SELECT COUNT(*)
      FROM context_examples ce_count
      WHERE ce_count.card_id = wsc.id AND ce_count.deleted_at IS NULL
    ) as context_count
  FROM word_sense_cards wsc
  LEFT JOIN context_examples primary_ctx
    ON primary_ctx.card_id = wsc.id
    AND primary_ctx.is_primary = 1
    AND primary_ctx.deleted_at IS NULL
  LEFT JOIN context_examples fallback_ctx
    ON fallback_ctx.id = (
      SELECT ce_fallback.id
      FROM context_examples ce_fallback
      WHERE ce_fallback.card_id = wsc.id AND ce_fallback.deleted_at IS NULL
      ORDER BY ce_fallback.created_at ASC
      LIMIT 1
    )
  ${where}
  ORDER BY wsc.updated_at DESC
  LIMIT ? OFFSET ?
`).all(...params, pageSize, offset) as CardListRow[];

const tagRows = rows.length === 0
  ? []
  : db.prepare(`
      SELECT ct.card_id, t.id, t.name, t.created_at, t.updated_at
      FROM card_tags ct
      JOIN tags t ON t.id = ct.tag_id
      WHERE ct.card_id IN (${rows.map(() => '?').join(',')})
        AND t.deleted_at IS NULL
      ORDER BY t.name ASC
    `).all(...rows.map((row) => row.id)) as Array<{ card_id: string; id: string; name: string; created_at: string; updated_at: string }>;

const tagsByCard = new Map<string, Array<{ id: string; name: string; created_at: string; updated_at: string }>>();
for (const tag of tagRows) {
  const current = tagsByCard.get(tag.card_id) ?? [];
  current.push({ id: tag.id, name: tag.name, created_at: tag.created_at, updated_at: tag.updated_at });
  tagsByCard.set(tag.card_id, current);
}

const items = rows.map((row) => ({
  ...row,
  context_count: Number(row.context_count),
  tags: tagsByCard.get(row.id) ?? [],
}));
```

Then return `items` instead of `rows`:

```ts
return {
  items,
  total: countRow.cnt,
  page,
  pageSize,
};
```

- [ ] **Step 4: Fix detail route response shape**

In `src/server/routes/cards.ts`, change detail response from:

```ts
res.json({ card, contexts, media, tags, fsrs });
```

to:

```ts
const primary_sentence = contexts.find((ctx) => ctx.is_primary === 1)?.sentence ?? contexts[0]?.sentence ?? null;
res.json({
  ...card,
  primary_sentence,
  context_count: contexts.length,
  contexts,
  media,
  tags,
  fsrs,
});
```

Reason: `getCard()` client is typed as `CardDetailDto`, not `{ card, contexts, media, tags, fsrs }`.

- [ ] **Step 5: Write server DTO tests**

Create `tests/server/cardListDto.test.ts`:

```ts
import Database from 'better-sqlite3';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { migrate } from '../../src/server/db/migrate';

function setup() {
  const db = new Database(':memory:');
  migrate(db);
  const app = createApp(db, { uploadsDir: '/tmp/vocabulary-notebook-test-uploads' });
  return { db, app };
}

describe('card list DTO', () => {
  it('includes primary sentence, tags, and context count', async () => {
    const { app } = setup();

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
    const { app } = setup();
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
```

- [ ] **Step 6: Run server DTO tests**

Run:

```bash
npm run test -- tests/server/cardListDto.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run typecheck checkpoint**

Run:

```bash
npm run typecheck
```

Expected: PASS.

---

## Task 2: Add Context Client API Wrapper

**Files:**

- Create: `src/client/api/contexts.ts`
- Test: covered through detail page tests in Task 5.

- [ ] **Step 1: Create context API wrapper**

Create `src/client/api/contexts.ts`:

```ts
import type { ContextDto, CreateContextBody, PatchContextBody } from '../../shared/types';
import { apiRequest } from './client';

export function createContext(cardId: string, body: CreateContextBody): Promise<ContextDto> {
  return apiRequest<ContextDto>(`/cards/${encodeURIComponent(cardId)}/contexts`, { method: 'POST', json: body });
}

export function patchContext(id: string, body: PatchContextBody): Promise<ContextDto> {
  return apiRequest<ContextDto>(`/contexts/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function deleteContext(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function setPrimaryContext(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}/primary`, { method: 'POST' });
}

export function moveContextUp(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}/move-up`, { method: 'POST' });
}

export function moveContextDown(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/contexts/${encodeURIComponent(id)}/move-down`, { method: 'POST' });
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

---

## Task 3: Build Reusable Catalogue Component

**Files:**

- Create: `src/client/components/CardCatalogue.tsx`
- Test: `tests/client/phase6Pages.test.tsx`

- [ ] **Step 1: Create catalogue component types and helpers**

Create `src/client/components/CardCatalogue.tsx` with:

```tsx
import type { CardSummaryDto, TagDto } from '../../shared/types';
import type { CardStatus, PageSize } from '../../shared/constants';
import { Pagination } from './Pagination';

export interface CardCatalogueFilters {
  search: string;
  tagId: string;
  status: '' | CardStatus;
  favorite: '' | 'true' | 'false';
  page: number;
  pageSize: PageSize;
}

interface CardCatalogueProps {
  title: string;
  subtitle: string;
  cards: CardSummaryDto[];
  total: number;
  loading: boolean;
  error: string | null;
  tags: TagDto[];
  filters: CardCatalogueFilters;
  emptyMessage: string;
  filteredEmptyMessage: string;
  onFiltersChange: (filters: CardCatalogueFilters) => void;
  onRetry: () => void;
  onToggleStatus: (card: CardSummaryDto) => void;
  onToggleFavorite: (card: CardSummaryDto) => void;
}

function favoriteParam(value: CardCatalogueFilters['favorite']): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function hasActiveFilters(filters: CardCatalogueFilters): boolean {
  return Boolean(filters.search || filters.tagId || filters.status || filters.favorite);
}

export function toListParams(filters: CardCatalogueFilters) {
  return {
    search: filters.search || undefined,
    tag_id: filters.tagId || undefined,
    status: filters.status || undefined,
    favorite: favoriteParam(filters.favorite),
    page: filters.page,
    page_size: filters.pageSize,
  };
}
```

- [ ] **Step 2: Add render implementation**

Append in same file:

```tsx
function sentenceFor(card: CardSummaryDto): string {
  return card.primary_sentence || '暂无语境';
}

function nextStatusLabel(card: CardSummaryDto): string {
  return card.status === 'reviewing' ? '标记熟记' : '恢复复习';
}

export function CardCatalogue(props: CardCatalogueProps) {
  const { title, subtitle, cards, total, loading, error, tags, filters, emptyMessage, filteredEmptyMessage, onFiltersChange, onRetry, onToggleStatus, onToggleFavorite } = props;
  const activeFilters = hasActiveFilters(filters);

  const updateFilters = (patch: Partial<CardCatalogueFilters>) => {
    onFiltersChange({ ...filters, ...patch, page: patch.page ?? 1 });
  };

  return (
    <section className="phase6-catalogue" aria-label={title}>
      <div className="phase6-hero">
        <div>
          <p className="phase6-kicker">Card catalogue</p>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <a className="phase6-primary-link" href="#/create">+ 快速制卡</a>
      </div>

      <div className="phase6-filter-desk">
        <label>
          <span>搜索</span>
          <input aria-label="搜索词义条目" value={filters.search} placeholder="搜索单词、释义、原句、标签或备注" onChange={(event) => updateFilters({ search: event.target.value })} />
        </label>
        <label>
          <span>标签</span>
          <select aria-label="标签筛选" value={filters.tagId} onChange={(event) => updateFilters({ tagId: event.target.value })}>
            <option value="">全部标签</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
        <label>
          <span>状态</span>
          <select aria-label="状态筛选" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value as CardCatalogueFilters['status'] })}>
            <option value="">全部状态</option>
            <option value="reviewing">复习中</option>
            <option value="mastered">已熟记</option>
          </select>
        </label>
        <label>
          <span>收藏</span>
          <select aria-label="收藏筛选" value={filters.favorite} onChange={(event) => updateFilters({ favorite: event.target.value as CardCatalogueFilters['favorite'] })}>
            <option value="">全部</option>
            <option value="true">仅收藏</option>
            <option value="false">未收藏</option>
          </select>
        </label>
        <button type="button" onClick={() => onFiltersChange({ search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: filters.pageSize })}>清除筛选</button>
      </div>

      {error ? <div className="phase6-alert" role="alert"><strong>加载失败</strong><p>{error}</p><button type="button" onClick={onRetry}>重试</button></div> : null}
      {loading ? <div className="phase6-skeleton" role="status">正在加载词义条目……</div> : null}

      {!loading && !error && cards.length === 0 ? (
        <div className="phase6-empty">
          <p>{activeFilters ? filteredEmptyMessage : emptyMessage}</p>
          <div><button type="button" onClick={() => onFiltersChange({ search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: filters.pageSize })}>清除筛选</button><a href="#/create">去制卡</a></div>
        </div>
      ) : null}

      {!loading && !error && cards.length > 0 ? (
        <div className="phase6-list-shell">
          <div className="phase6-list-head"><strong>{total}</strong><span> 个词义条目</span></div>
          <div className="phase6-card-list">
            {cards.map((card) => (
              <article className="phase6-word-card" key={card.id}>
                <div className="phase6-word"><strong>{card.target_word}</strong><span>{card.target_language} → {card.definition_language}</span></div>
                <div className="phase6-card-main">
                  <h3>{card.context_meaning}</h3>
                  <p>{sentenceFor(card)}</p>
                  <div>{card.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
                </div>
                <div className="phase6-card-actions">
                  <span>{card.status === 'reviewing' ? '复习中' : '已熟记'}</span>
                  {card.is_favorite ? <span>★ 收藏</span> : <span>未收藏</span>}
                  <span>{card.context_count} 条语境</span>
                  <button type="button" onClick={() => onToggleStatus(card)}>{nextStatusLabel(card)}</button>
                  <button type="button" onClick={() => onToggleFavorite(card)}>{card.is_favorite ? '取消收藏' : '收藏'}</button>
                  <a href={`#/cards/${card.id}`}>查看详情</a>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} onPageChange={(page) => onFiltersChange({ ...filters, page })} onPageSizeChange={(pageSize) => onFiltersChange({ ...filters, page: 1, pageSize })} />
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Write catalogue tests**

Create `tests/client/phase6Pages.test.tsx` with initial test:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardCatalogue, type CardCatalogueFilters } from '../../src/client/components/CardCatalogue';
import type { CardSummaryDto, TagDto } from '../../src/shared/types';

const tags: TagDto[] = [{ id: 'tag-1', name: '美剧', created_at: 'now', updated_at: 'now' }];
const filters: CardCatalogueFilters = { search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: 20 };
const cards: CardSummaryDto[] = [{
  id: 'card-1',
  target_word: 'charge',
  context_meaning: '收费',
  target_language: '英语',
  definition_language: '中文',
  status: 'reviewing',
  is_favorite: 1,
  created_at: 'now',
  updated_at: 'now',
  primary_sentence: 'The hotel charges $100 per night.',
  context_count: 2,
  tags,
}];

describe('Phase 6 pages', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders catalogue cards and emits filter/action changes', () => {
    const onFiltersChange = vi.fn();
    const onRetry = vi.fn();
    const onToggleStatus = vi.fn();
    const onToggleFavorite = vi.fn();

    render(<CardCatalogue title="词义条目" subtitle="管理所有词义" cards={cards} total={1} loading={false} error={null} tags={tags} filters={filters} emptyMessage="还没有词义条目" filteredEmptyMessage="没有匹配的词义条目" onFiltersChange={onFiltersChange} onRetry={onRetry} onToggleStatus={onToggleStatus} onToggleFavorite={onToggleFavorite} />);

    expect(screen.getByText('charge')).toBeInTheDocument();
    expect(screen.getByText('收费')).toBeInTheDocument();
    expect(screen.getByText('The hotel charges $100 per night.')).toBeInTheDocument();
    expect(screen.getByText('美剧')).toBeInTheDocument();
    expect(screen.getByText('2 条语境')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看详情' })).toHaveAttribute('href', '#/cards/card-1');

    fireEvent.change(screen.getByLabelText('搜索词义条目'), { target: { value: 'charge' } });
    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, search: 'charge', page: 1 });

    fireEvent.click(screen.getByRole('button', { name: '标记熟记' }));
    expect(onToggleStatus).toHaveBeenCalledWith(cards[0]);

    fireEvent.click(screen.getByRole('button', { name: '取消收藏' }));
    expect(onToggleFavorite).toHaveBeenCalledWith(cards[0]);
  });
});
```

- [ ] **Step 4: Run catalogue test**

Run:

```bash
npm run test -- tests/client/phase6Pages.test.tsx
```

Expected: PASS.

---

## Task 4: Implement Card List and Favorites Pages

**Files:**

- Create: `src/client/pages/CardListPage.tsx`
- Create: `src/client/pages/FavoritesPage.tsx`
- Modify: `tests/client/phase6Pages.test.tsx`

- [ ] **Step 1: Create shared page hook inside CardListPage file**

Create `src/client/pages/CardListPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';

import type { CardSummaryDto, TagDto } from '../../shared/types';
import { listCards, patchCard } from '../api/cards';
import { listTags } from '../api/tags';
import { CardCatalogue, toListParams, type CardCatalogueFilters } from '../components/CardCatalogue';

const DEFAULT_FILTERS: CardCatalogueFilters = { search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: 20 };

export function CardListPage() {
  const [filters, setFilters] = useState<CardCatalogueFilters>(DEFAULT_FILTERS);
  const [cards, setCards] = useState<CardSummaryDto[]>([]);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listCards(toListParams(filters)), listTags()])
      .then(([cardResult, tagResult]) => {
        setCards(cardResult.items);
        setTotal(cardResult.total);
        setTags(tagResult);
      })
      .catch((err: unknown) => {
        setCards([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : '无法加载词义条目');
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (card: CardSummaryDto) => {
    await patchCard(card.id, { status: card.status === 'reviewing' ? 'mastered' : 'reviewing' });
    load();
  };

  const toggleFavorite = async (card: CardSummaryDto) => {
    await patchCard(card.id, { is_favorite: !card.is_favorite });
    load();
  };

  return <CardCatalogue title="词义条目" subtitle="搜索、筛选和管理所有词义卡。" cards={cards} total={total} loading={loading} error={error} tags={tags} filters={filters} emptyMessage="还没有词义条目" filteredEmptyMessage="没有匹配的词义条目" onFiltersChange={setFilters} onRetry={load} onToggleStatus={toggleStatus} onToggleFavorite={toggleFavorite} />;
}
```

- [ ] **Step 2: Create favorites page**

Create `src/client/pages/FavoritesPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';

import type { CardSummaryDto, TagDto } from '../../shared/types';
import { listCards, patchCard } from '../api/cards';
import { listTags } from '../api/tags';
import { CardCatalogue, toListParams, type CardCatalogueFilters } from '../components/CardCatalogue';

const DEFAULT_FILTERS: CardCatalogueFilters = { search: '', tagId: '', status: '', favorite: 'true', page: 1, pageSize: 20 };

export function FavoritesPage() {
  const [filters, setFilters] = useState<CardCatalogueFilters>(DEFAULT_FILTERS);
  const [cards, setCards] = useState<CardSummaryDto[]>([]);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveFilters = { ...filters, favorite: 'true' as const };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listCards(toListParams(effectiveFilters)), listTags()])
      .then(([cardResult, tagResult]) => {
        setCards(cardResult.items);
        setTotal(cardResult.total);
        setTags(tagResult);
      })
      .catch((err: unknown) => {
        setCards([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : '无法加载收藏词义');
      })
      .finally(() => setLoading(false));
  }, [filters.search, filters.tagId, filters.status, filters.page, filters.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const setFavoriteFilters = (next: CardCatalogueFilters) => setFilters({ ...next, favorite: 'true' });
  const toggleStatus = async (card: CardSummaryDto) => {
    await patchCard(card.id, { status: card.status === 'reviewing' ? 'mastered' : 'reviewing' });
    load();
  };
  const toggleFavorite = async (card: CardSummaryDto) => {
    await patchCard(card.id, { is_favorite: !card.is_favorite });
    load();
  };

  return <CardCatalogue title="收藏" subtitle="集中查看你标记过的重点词义。" cards={cards} total={total} loading={loading} error={error} tags={tags} filters={effectiveFilters} emptyMessage="还没有收藏词义" filteredEmptyMessage="收藏里没有匹配的词义条目" onFiltersChange={setFavoriteFilters} onRetry={load} onToggleStatus={toggleStatus} onToggleFavorite={toggleFavorite} />;
}
```

- [ ] **Step 3: Add list/favorites page tests**

Append to `tests/client/phase6Pages.test.tsx`:

```tsx
import { CardListPage } from '../../src/client/pages/CardListPage';
import { FavoritesPage } from '../../src/client/pages/FavoritesPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse(tags));
    if (url.startsWith('/api/cards') && init?.method === 'PATCH') return Promise.resolve(jsonResponse(cards[0]));
    if (url.startsWith('/api/cards')) return Promise.resolve(jsonResponse({ items: cards, total: 1, page: 1, page_size: 20 }));
    return Promise.resolve(jsonResponse({}));
  });
});

it('loads card list page and toggles card status', async () => {
  render(<CardListPage />);
  expect(await screen.findByText('charge')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '标记熟记' }));
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards/card-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'mastered' }) })));
});

it('loads favorites page with favorite filter forced', async () => {
  render(<FavoritesPage />);
  expect(await screen.findByText('收藏')).toBeInTheDocument();
  await waitFor(() => expect(String(vi.mocked(globalThis.fetch).mock.calls.find(([input]) => String(input).startsWith('/api/cards'))?.[0])).toContain('favorite=true'));
});
```

- [ ] **Step 4: Run page tests**

Run:

```bash
npm run test -- tests/client/phase6Pages.test.tsx
```

Expected: PASS.

---

## Task 5: Implement Card Detail Page

**Files:**

- Create: `src/client/pages/CardDetailPage.tsx`
- Modify: `tests/client/phase6Pages.test.tsx`

- [ ] **Step 1: Create detail page helpers and loader**

Create `src/client/pages/CardDetailPage.tsx`:

```tsx
import { useCallback, useMemo, useState } from 'react';

import type { CardDetailDto, ContextDto } from '../../shared/types';
import { deleteCard, getCard, patchCard } from '../api/cards';
import { deleteContext, moveContextDown, moveContextUp, setPrimaryContext } from '../api/contexts';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState, LoadingState } from '../components/UiStates';

function currentCardId(): string {
  return window.location.hash.replace(/^#\/cards\//, '');
}

function mediaForContext(card: CardDetailDto, contextId: string) {
  return card.media.filter((media) => media.context_example_id === contextId);
}
```

- [ ] **Step 2: Add component implementation**

Append:

```tsx
export function CardDetailPage() {
  const [card, setCard] = useState<CardDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'card' | ContextDto | null>(null);
  const cardId = useMemo(currentCardId, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getCard(cardId)
      .then(setCard)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '无法加载词义详情'))
      .finally(() => setLoading(false));
  }, [cardId]);

  useState(() => {
    load();
  });

  const runAndReload = async (action: () => Promise<unknown>) => {
    await action();
    load();
  };

  if (loading) return <LoadingState message="正在加载词义详情……" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!card) return <ErrorState message="词义条目不存在" onRetry={load} />;

  return (
    <section className="phase6-detail">
      <div className="phase6-hero">
        <div>
          <p className="phase6-kicker">Card detail</p>
          <h2>{card.target_word}</h2>
          <p>{card.context_meaning}</p>
        </div>
        <div className="phase6-detail-actions">
          <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { is_favorite: !card.is_favorite }))}>{card.is_favorite ? '取消收藏' : '收藏'}</button>
          <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { status: card.status === 'reviewing' ? 'mastered' : 'reviewing' }))}>{card.status === 'reviewing' ? '标记熟记' : '恢复复习'}</button>
          <button type="button" onClick={() => setConfirmDelete('card')}>删除词义</button>
        </div>
      </div>

      <div className="phase6-detail-grid">
        <section className="phase6-contexts">
          <h3>全部语境</h3>
          {card.contexts.length === 0 ? <p>暂无语境</p> : null}
          {card.contexts.map((context, index) => (
            <article key={context.id} className="phase6-context-card">
              <div><strong>语境 {index + 1}</strong>{context.is_primary ? <span>主语境</span> : null}</div>
              <p>{context.sentence}</p>
              {context.note ? <small>{context.note}</small> : null}
              <div className="phase6-media-row">
                {mediaForContext(card, context.id).map((media) => <span key={media.id}>{media.file_name}{media.is_available ? '' : '（文件不可用）'}</span>)}
              </div>
              <div className="phase6-context-actions">
                <button type="button" disabled={index === 0} onClick={() => runAndReload(() => moveContextUp(context.id))}>上移</button>
                <button type="button" disabled={index === card.contexts.length - 1} onClick={() => runAndReload(() => moveContextDown(context.id))}>下移</button>
                <button type="button" disabled={Boolean(context.is_primary)} onClick={() => runAndReload(() => setPrimaryContext(context.id))}>设为主语境</button>
                <button type="button" onClick={() => setConfirmDelete(context)}>删除语境</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="phase6-detail-side">
          <h3>复习信息</h3>
          <p>状态：{card.status === 'reviewing' ? '复习中' : '已熟记'}</p>
          <p>Due：{card.fsrs.due_date}</p>
          <p>Reps：{card.fsrs.reps}</p>
          <p>Lapses：{card.fsrs.lapses}</p>
          <h3>标签</h3>
          <div>{card.tags.length ? card.tags.map((tag) => <span key={tag.id}>{tag.name}</span>) : '暂无标签'}</div>
        </aside>
      </div>

      {confirmDelete === 'card' ? <ConfirmDialog title="删除词义条目" message="会软删除这个词义条目、语境实例和媒体记录。确认删除？" confirmLabel="删除" onCancel={() => setConfirmDelete(null)} onConfirm={async () => { await deleteCard(card.id); window.location.hash = '#/cards'; }} /> : null}
      {confirmDelete && confirmDelete !== 'card' ? <ConfirmDialog title="删除语境实例" message="会软删除这个语境和它的媒体记录。确认删除？" confirmLabel="删除" onCancel={() => setConfirmDelete(null)} onConfirm={() => runAndReload(() => deleteContext(confirmDelete.id)).then(() => setConfirmDelete(null))} /> : null}
    </section>
  );
}
```

Implementation note: replace `useState(() => { load(); })` with `useEffect(() => { load(); }, [load])` during coding; import `useEffect`. This plan keeps code compact, but implementation must use `useEffect` for side effects.

- [ ] **Step 3: Add detail page test**

Append to `tests/client/phase6Pages.test.tsx`:

```tsx
import { CardDetailPage } from '../../src/client/pages/CardDetailPage';

const detail = {
  ...cards[0],
  contexts: [{ id: 'ctx-1', card_id: 'card-1', sentence: 'The hotel charges $100 per night.', note: 'S01E01 03:12', is_primary: 1, sort_order: 10, created_at: 'now', updated_at: 'now' }],
  media: [{ id: 'media-1', context_example_id: 'ctx-1', media_type: 'video', file_name: 'clip.mp4', file_path: '/uploads/clip.mp4', mime_type: 'video/mp4', file_size: 100, is_available: 1, created_at: 'now' }],
  fsrs: { due_date: 'now', stability: null, difficulty: null, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
};

it('loads card detail and exposes context actions', async () => {
  window.location.hash = '#/cards/card-1';
  vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
    const url = String(input);
    if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse(cards[0]));
    if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
    if (url === '/api/contexts/ctx-1/primary') return Promise.resolve(jsonResponse({ ok: true }));
    return Promise.resolve(jsonResponse({ ok: true }));
  });

  render(<CardDetailPage />);
  expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
  expect(screen.getByText('S01E01 03:12')).toBeInTheDocument();
  expect(screen.getByText('clip.mp4')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '标记熟记' }));
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards/card-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'mastered' }) })));
});
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test -- tests/client/phase6Pages.test.tsx
```

Expected: PASS after using `useEffect` correctly.

---

## Task 6: Implement Tags Page

**Files:**

- Create: `src/client/pages/TagsPage.tsx`
- Modify: `tests/client/phase6Pages.test.tsx`

- [ ] **Step 1: Create tags page**

Create `src/client/pages/TagsPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';

import type { TagDto } from '../../shared/types';
import { createTag, deleteTag, listTags, patchTag } from '../api/tags';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState, LoadingState } from '../components/UiStates';

export function TagsPage() {
  const [tags, setTags] = useState<TagDto[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<TagDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listTags()
      .then(setTags)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '无法加载标签'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim()) {
      setError('标签名称必填');
      return;
    }
    if (editing) await patchTag(editing.id, { name: name.trim() });
    else await createTag({ name: name.trim() });
    setName('');
    setEditing(null);
    load();
  };

  if (loading) return <LoadingState message="正在加载标签……" />;

  return (
    <section className="phase6-tags">
      <div className="phase6-hero"><div><p className="phase6-kicker">Tag index</p><h2>标签管理</h2><p>标签承担自由分类和来源标记，不影响复习算法。</p></div></div>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      <div className="phase6-tag-editor">
        <label><span>标签名称</span><input aria-label="标签名称" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：Friends" /></label>
        <button type="button" onClick={save}>{editing ? '保存标签' : '新增标签'}</button>
        {editing ? <button type="button" onClick={() => { setEditing(null); setName(''); }}>取消编辑</button> : null}
      </div>
      <div className="phase6-tag-grid">
        {tags.length === 0 ? <p>暂无标签</p> : null}
        {tags.map((tag) => (
          <article key={tag.id} className="phase6-tag-card">
            <strong>{tag.name}</strong>
            <div>
              <a href={`#/cards?tag_id=${tag.id}`}>查看词义</a>
              <button type="button" onClick={() => { setEditing(tag); setName(tag.name); }}>编辑</button>
              <button type="button" onClick={() => setDeleteTarget(tag)}>删除</button>
            </div>
          </article>
        ))}
      </div>
      {deleteTarget ? <ConfirmDialog title="删除标签" message={`确认删除标签“${deleteTarget.name}”？词义条目不会被删除。`} confirmLabel="删除" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await deleteTag(deleteTarget.id); setDeleteTarget(null); load(); }} /> : null}
    </section>
  );
}
```

- [ ] **Step 2: Add tags page test**

Append to `tests/client/phase6Pages.test.tsx`:

```tsx
import { TagsPage } from '../../src/client/pages/TagsPage';

it('creates edits and confirms tag deletion', async () => {
  vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
    const url = String(input);
    if (url === '/api/tags' && init?.method === 'POST') return Promise.resolve(jsonResponse({ id: 'tag-2', name: '电影', created_at: 'now', updated_at: 'now' }, 201));
    if (url === '/api/tags/tag-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ...tags[0], name: '美剧 updated' }));
    if (url === '/api/tags/tag-1' && init?.method === 'DELETE') return Promise.resolve(jsonResponse({ ok: true }));
    if (url === '/api/tags') return Promise.resolve(jsonResponse(tags));
    return Promise.resolve(jsonResponse({}));
  });

  render(<TagsPage />);
  expect(await screen.findByText('美剧')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('标签名称'), { target: { value: '电影' } });
  fireEvent.click(screen.getByRole('button', { name: '新增标签' }));
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: '电影' }) })));

  fireEvent.click(screen.getByRole('button', { name: '编辑' }));
  fireEvent.change(screen.getByLabelText('标签名称'), { target: { value: '美剧 updated' } });
  fireEvent.click(screen.getByRole('button', { name: '保存标签' }));
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags/tag-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: '美剧 updated' }) })));
});
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm run test -- tests/client/phase6Pages.test.tsx
```

Expected: PASS.

---

## Task 7: Wire Routes and Add Visual CSS

**Files:**

- Modify: `src/client/App.tsx`
- Modify: `src/client/styles.css`
- Modify: `tests/client/app.test.tsx`

- [ ] **Step 1: Import real Phase 6 pages**

In `src/client/App.tsx`, add imports:

```ts
import { CardDetailPage } from './pages/CardDetailPage';
import { CardListPage } from './pages/CardListPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { TagsPage } from './pages/TagsPage';
```

Replace routes:

```tsx
if (path === '/cards') {
  return { title: '词义条目', subtitle: '管理所有词义', element: <CardListPage /> };
}
if (path.startsWith('/cards/')) {
  return { title: '词义详情', subtitle: '查看和维护语境', element: <CardDetailPage /> };
}
if (path === '/tags') {
  return { title: '标签管理', subtitle: '自由分类和来源标记', element: <TagsPage /> };
}
if (path === '/favorites') {
  return { title: '收藏', subtitle: '重点词义', element: <FavoritesPage /> };
}
```

- [ ] **Step 2: Add notebook-studio CSS foundation**

Append to `src/client/styles.css`:

```css
.phase6-hero,
.phase6-filter-desk,
.phase6-list-shell,
.phase6-detail-grid,
.phase6-tag-editor,
.phase6-tag-card,
.phase6-empty,
.phase6-alert,
.phase6-skeleton {
  border: 1px solid rgba(23, 32, 51, 0.16);
  border-radius: 1.5rem;
  background: rgba(255, 247, 232, 0.82);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
}

.phase6-catalogue,
.phase6-detail,
.phase6-tags {
  display: grid;
  gap: 1rem;
}

.phase6-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: clamp(1rem, 2vw, 1.5rem);
  background: linear-gradient(135deg, rgba(255,247,232,.96), rgba(236,253,245,.84));
}

.phase6-kicker {
  margin: 0 0 .5rem;
  color: #0f766e;
  font: 800 .75rem ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.phase6-hero h2 {
  margin: 0;
  color: #172033;
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: .95;
  letter-spacing: -.07em;
}

.phase6-hero p:not(.phase6-kicker) {
  max-width: 44rem;
  color: #475569;
  font: 500 1rem/1.65 ui-sans-serif, system-ui, sans-serif;
}

.phase6-primary-link,
.phase6-card-actions a,
.phase6-tag-card a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #172033;
  color: #fff7e8;
  font: 800 .875rem ui-sans-serif, system-ui, sans-serif;
  padding: .75rem 1rem;
  text-decoration: none;
}

.phase6-filter-desk {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(3, minmax(8rem, .35fr)) auto;
  gap: .75rem;
  padding: 1rem;
}

.phase6-filter-desk label,
.phase6-tag-editor label {
  display: grid;
  gap: .35rem;
  color: #64748b;
  font: 800 .75rem ui-sans-serif, system-ui, sans-serif;
}

.phase6-filter-desk input,
.phase6-filter-desk select,
.phase6-tag-editor input {
  border: 1px solid rgba(23,32,51,.14);
  border-radius: 1rem;
  background: rgba(255,255,255,.72);
  color: #172033;
  font: 700 .875rem ui-sans-serif, system-ui, sans-serif;
  padding: .75rem .9rem;
}

.phase6-filter-desk button,
.phase6-card-actions button,
.phase6-detail-actions button,
.phase6-context-actions button,
.phase6-tag-editor button,
.phase6-tag-card button,
.phase6-empty button,
.phase6-alert button {
  border: 1px solid rgba(23,32,51,.14);
  border-radius: .9rem;
  background: rgba(255,255,255,.72);
  color: #172033;
  cursor: pointer;
  font: 800 .875rem ui-sans-serif, system-ui, sans-serif;
  padding: .7rem .9rem;
}

.phase6-card-list,
.phase6-contexts,
.phase6-tag-grid {
  display: grid;
  gap: .85rem;
}

.phase6-word-card,
.phase6-context-card {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr) 14rem;
  gap: 1rem;
  border: 1px solid rgba(23,32,51,.12);
  border-radius: 1.25rem;
  background: rgba(255,255,255,.66);
  padding: 1rem;
}

.phase6-word strong {
  display: block;
  color: #172033;
  font-size: 1.7rem;
  letter-spacing: -.04em;
}

.phase6-word span,
.phase6-card-main p,
.phase6-card-actions span,
.phase6-context-card small,
.phase6-detail-side p {
  color: #64748b;
  font: 600 .875rem/1.55 ui-sans-serif, system-ui, sans-serif;
}

.phase6-card-main h3 {
  margin: 0;
  color: #172033;
  font: 900 1.2rem ui-sans-serif, system-ui, sans-serif;
}

.phase6-card-main div,
.phase6-detail-side div,
.phase6-media-row {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}

.phase6-card-main div span,
.phase6-detail-side div span,
.phase6-media-row span {
  border-radius: 999px;
  background: #ccfbf1;
  color: #0f766e;
  font: 800 .75rem ui-sans-serif, system-ui, sans-serif;
  padding: .3rem .55rem;
}

.phase6-card-actions,
.phase6-detail-actions,
.phase6-context-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  justify-content: flex-end;
}

.phase6-list-shell,
.phase6-alert,
.phase6-skeleton,
.phase6-empty,
.phase6-tag-editor,
.phase6-tag-card,
.phase6-detail-grid {
  padding: 1rem;
}

.phase6-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
  gap: 1rem;
}

.phase6-tag-grid {
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
}

.phase6-tag-card {
  display: grid;
  gap: .75rem;
}

@media (max-width: 920px) {
  .phase6-hero,
  .phase6-filter-desk,
  .phase6-word-card,
  .phase6-context-card,
  .phase6-detail-grid {
    grid-template-columns: 1fr;
  }
  .phase6-hero { display: grid; }
  .phase6-card-actions { justify-content: flex-start; }
}
```

- [ ] **Step 3: Update app test fetch mock**

In `tests/client/app.test.tsx`, replace `beforeEach` fetch mock with route-aware mock:

```ts
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith('/api/statistics/home')) return Promise.resolve(new Response(JSON.stringify({ due_count: 0, reviewed_today_count: 0, again_today_count: 0, good_today_count: 0, daily_review_limit: 20, is_daily_target_reached: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    if (url.startsWith('/api/tags')) return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    if (url === '/api/cards/card-1') return Promise.resolve(new Response(JSON.stringify({ id: 'card-1', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now', primary_sentence: null, context_count: 0, tags: [], contexts: [], media: [], fsrs: { due_date: 'now', stability: null, difficulty: null, reps: 0, lapses: 0, state: 0, last_reviewed_at: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    if (url.startsWith('/api/cards')) return Promise.resolve(new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  });
});
```

- [ ] **Step 4: Add real route assertions**

Append to `tests/client/app.test.tsx`:

```tsx
it('renders real Phase 6 list-like routes', async () => {
  window.location.hash = '#/cards';
  render(<App />);
  expect(await screen.findByText('搜索、筛选和管理所有词义卡。')).toBeInTheDocument();

  cleanup();
  window.location.hash = '#/favorites';
  render(<App />);
  expect(await screen.findByText('集中查看你标记过的重点词义。')).toBeInTheDocument();
});

it('renders real Phase 6 detail and tags routes', async () => {
  window.location.hash = '#/cards/card-1';
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();

  cleanup();
  window.location.hash = '#/tags';
  render(<App />);
  expect(await screen.findByText('标签承担自由分类和来源标记，不影响复习算法。')).toBeInTheDocument();
});
```

- [ ] **Step 5: Run app and page tests**

Run:

```bash
npm run test -- tests/client/app.test.tsx tests/client/phase6Pages.test.tsx
```

Expected: PASS.

---

## Task 8: Verify Phase 6 Remaining Pages

**Files:** no planned edits unless tests expose issues.

- [ ] **Step 1: Run server DTO tests**

```bash
npm run test -- tests/server/cardListDto.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run client Phase 6 tests**

```bash
npm run test -- tests/client/phase6Pages.test.tsx tests/client/app.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Manual browser check**

Run app:

```bash
npm run dev
```

Open the local URL printed by Vite and check:

- `#/cards` loads and shows list filters.
- `#/cards/:id` loads when a seeded card exists.
- `#/tags` supports add/edit/delete tag flow.
- `#/favorites` loads favorite-only list.
- Narrow width stacks filters and cards.
- No V1 scope drift appears.

---

## Self-Review

Spec coverage:

- Card list page: covered by Tasks 1, 3, 4, 7.
- Detail page: covered by Tasks 2, 5, 7.
- Tags page: covered by Task 6.
- Favorites page: covered by Tasks 3, 4, 7.
- DTO gap for primary sentence/tags/context count: covered by Task 1.
- Search/filter/pagination/status/favorite: covered by Tasks 3 and 4.
- Context primary/reorder/delete: covered by Tasks 2 and 5.
- Visual direction: covered by Task 7 CSS.
- V1 scope exclusions: recorded in Scope and Gate Notes.

Placeholder scan:

- No TBD/TODO markers.
- One explicit coding correction is called out in Task 5: use `useEffect` instead of side-effectful `useState`. Implementer must apply that during coding.

Type consistency:

- `CardSummaryDto` fields match server list expansion.
- `CardDetailDto` shape matches fixed detail route.
- `CardCatalogueFilters.pageSize` uses `PageSize`.
- Context API wrapper matches existing Express routes.
