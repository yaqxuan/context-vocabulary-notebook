# Phase 7 Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real `#/review`, `#/statistics`, and `#/settings` React pages that match the approved Phase 7 spec and mockups.

**Architecture:** Keep Phase 7 as one feature branch with three independently testable page slices. Extend existing typed API DTOs first, then implement route-level React pages using existing API modules and the Phase 6 page/state patterns. No AI, no holiday greeting, no charting dependency, and no first-version-excluded settings.

**Tech Stack:** React 19 + Vite, TypeScript, Express, SQLite/better-sqlite3, Vitest + Testing Library, Tailwind CSS v4 plus scoped page CSS.

---

## File Structure

### Backend/shared API layer

- Modify: `src/shared/types.ts`
  - Add `media: MediaDto[]` to `DueReviewCardDto`.
  - Add `monthly_review_counts` to `StatisticsPageDto`.
- Modify: `src/server/routes/review.ts`
  - Include `getMediaForCard(db, card.id)` in `/api/review/due` response.
- Modify: `src/server/domain/statistics.ts`
  - Add `MonthlyReviewCount` type and query.
- Modify: `src/client/api/importExport.ts`
  - Send import execute form key `decisions` instead of `decision`.

### Client pages

- Create: `src/client/pages/ReviewPage.tsx`
  - Fetch due card, render review flow, submit Again/Good, show context/media.
- Create: `src/client/pages/StatisticsPage.tsx`
  - Fetch stats and render totals/charts/distributions.
- Create: `src/client/pages/SettingsPage.tsx`
  - Fetch/save settings, export zips, scan/import zips.
- Modify: `src/client/App.tsx`
  - Route Phase 7 paths to real pages.
- Modify: `src/client/styles.css`
  - Add scoped `.phase7-*` CSS only.

### Tests

- Modify: `tests/server/review.test.ts`
- Modify: `tests/server/statistics.test.ts`
- Modify: `tests/client/apiClient.test.ts`
- Create: `tests/client/reviewPage.test.tsx`
- Create: `tests/client/statisticsPage.test.tsx`
- Create: `tests/client/settingsPage.test.tsx`
- Modify: `tests/client/app.test.tsx`

---

## Task 1: API and DTO Extensions

**Files:**
- Modify: `src/shared/types.ts:144-205`
- Modify: `src/server/routes/review.ts:1-37`
- Modify: `src/server/domain/statistics.ts:1-133`
- Modify: `src/client/api/importExport.ts:14-18`
- Test: `tests/server/review.test.ts`
- Test: `tests/server/statistics.test.ts`
- Test: `tests/client/apiClient.test.ts`

- [ ] **Step 1: Add failing server test for review due media**

In `tests/server/review.test.ts`, add/extend a test that creates a due card with a context and media, then asserts `/api/review/due` includes `media`.

Use this assertion pattern:

```ts
const res = await request(app).get('/api/review/due');

expect(res.status).toBe(200);
expect(res.body.status).toBe('due');
expect(res.body.card.media).toEqual(expect.arrayContaining([
  expect.objectContaining({
    media_type: 'video',
    file_name: 'clip.mp4',
    mime_type: 'video/mp4',
    is_available: 1,
  }),
]));
```

If no helper exists to create media directly, insert it with SQL after creating the card/context:

```ts
db.prepare(`
  INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at)
  VALUES (?, ?, 'video', 'clip.mp4', 'uploads/clip.mp4', 'video/mp4', 128, 1, ?)
`).run(randomUUID(), contextId, new Date().toISOString());
```

- [ ] **Step 2: Run review API test and confirm it fails**

Run:

```bash
npm test -- tests/server/review.test.ts
```

Expected: FAIL because `res.body.card.media` is `undefined`.

- [ ] **Step 3: Implement due media DTO and route extension**

In `src/shared/types.ts`, change `DueReviewCardDto` to:

```ts
export interface DueReviewCardDto extends CardSummaryDto {
  due_date: string;
  primary_sentence: string;
  contexts: ContextDto[];
  media: MediaDto[];
}
```

In `src/server/routes/review.ts`, import `getMediaForCard`:

```ts
import { getMediaForCard } from '../domain/media.js';
```

Change `/due` response card object to:

```ts
card: {
  ...card,
  contexts: getContextsForCard(db, card.id),
  media: getMediaForCard(db, card.id),
},
```

- [ ] **Step 4: Run review API test and confirm it passes**

Run:

```bash
npm test -- tests/server/review.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add failing server test for monthly statistics**

In `tests/server/statistics.test.ts`, extend `returns statistics page totals, trends, tag distribution, and rating trend` with multi-month review logs:

```ts
insertReview(reviewing.id, 'good', '2026-04-29T10:00:00.000Z');
insertReview(reviewing.id, 'good', '2026-05-29T10:00:00.000Z');
insertReview(mastered.id, 'again', '2026-05-29T11:00:00.000Z');
insertReview(deleted.id, 'again', '2026-05-29T12:00:00.000Z');
deleteCard(db, deleted.id);

const res = await request(app).get('/api/statistics');

expect(res.body.monthly_review_counts).toEqual([
  { month: '2026-04', count: 1 },
  { month: '2026-05', count: 2 },
]);
```

Update existing daily expectations for the extra April row:

```ts
expect(res.body.daily_review_counts).toEqual([
  { date: '2026-04-29', count: 1 },
  { date: '2026-05-29', count: 2 },
]);
```

- [ ] **Step 6: Run statistics API test and confirm it fails**

Run:

```bash
npm test -- tests/server/statistics.test.ts
```

Expected: FAIL because `monthly_review_counts` is missing.

- [ ] **Step 7: Implement monthly statistics DTO and query**

In `src/shared/types.ts`, extend `StatisticsPageDto`:

```ts
export interface StatisticsPageDto {
  totals: {
    total_cards: number;
    reviewing_cards: number;
    mastered_cards: number;
    favorite_cards: number;
  };
  daily_review_counts: Array<{ date: string; count: number }>;
  daily_accuracy: Array<{ date: string; reviewed_count: number; good_count: number; accuracy: number }>;
  monthly_review_counts: Array<{ month: string; count: number }>;
  tag_distribution: Array<{ tag_id: string; name: string; card_count: number }>;
  rating_trend: Array<{ date: string; again_count: number; good_count: number }>;
}
```

In `src/server/domain/statistics.ts`, add:

```ts
export interface MonthlyReviewCount {
  month: string;
  count: number;
}
```

Change `StatisticsPageData` to include:

```ts
monthly_review_counts: MonthlyReviewCount[];
```

Inside `getStatisticsPageData()`, add:

```ts
const monthlyReviewCounts = db.prepare(`
  SELECT substr(rl.reviewed_at, 1, 7) AS month, COUNT(*) AS count
  FROM review_logs rl
  JOIN word_sense_cards wsc ON wsc.id = rl.card_id
  WHERE wsc.deleted_at IS NULL
  GROUP BY substr(rl.reviewed_at, 1, 7)
  ORDER BY month ASC
`).all() as MonthlyReviewCount[];
```

Return:

```ts
monthly_review_counts: monthlyReviewCounts,
```

- [ ] **Step 8: Run statistics API test and confirm it passes**

Run:

```bash
npm test -- tests/server/statistics.test.ts
```

Expected: PASS.

- [ ] **Step 9: Add failing client API test for import execute `decisions` key**

In `tests/client/apiClient.test.ts`, import `executeImport`:

```ts
import { executeImport, exportCards } from '../../src/client/api/importExport';
```

Add test:

```ts
it('posts import execute decisions using the server form key', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ imported_cards: 0, imported_contexts: 0, imported_media_files: 0, skipped_cards: 1, merged_cards: 0, missing_media_files: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  const file = new File(['zip'], 'cards.zip', { type: 'application/zip' });

  await executeImport(file, { mode: 'skip_all' });

  const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
  expect(body.get('file')).toBe(file);
  expect(body.get('decisions')).toBe(JSON.stringify({ mode: 'skip_all' }));
  expect(body.get('decision')).toBeNull();
});
```

- [ ] **Step 10: Run API client test and confirm it fails**

Run:

```bash
npm test -- tests/client/apiClient.test.ts
```

Expected: FAIL because `decision` is present and `decisions` is missing.

- [ ] **Step 11: Fix import execute form key**

In `src/client/api/importExport.ts`, change:

```ts
formData.append('decision', JSON.stringify(decision));
```

to:

```ts
formData.append('decisions', JSON.stringify(decision));
```

- [ ] **Step 12: Run API client test and confirm it passes**

Run:

```bash
npm test -- tests/client/apiClient.test.ts
```

Expected: PASS.

- [ ] **Step 13: Commit API foundation**

Run:

```bash
git add src/shared/types.ts src/server/routes/review.ts src/server/domain/statistics.ts src/client/api/importExport.ts tests/server/review.test.ts tests/server/statistics.test.ts tests/client/apiClient.test.ts
git commit -m "feat(client): extend phase 7 API data"
```

---

## Task 2: ReviewPage

**Files:**
- Create: `src/client/pages/ReviewPage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/reviewPage.test.tsx`

- [ ] **Step 1: Create failing ReviewPage tests**

Create `tests/client/reviewPage.test.tsx` with this base fixture and first tests:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewPage } from '../../src/client/pages/ReviewPage';
import type { ReviewDueResponseDto, SubmitReviewResponseDto } from '../../src/shared/types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const dueResponse: ReviewDueResponseDto = {
  status: 'due',
  progress: { reviewed_count: 18, again_count: 4, good_count: 14, daily_review_limit: 30, is_limit_reached: false },
  card: {
    id: 'card-1',
    target_word: 'charge',
    context_meaning: '收费',
    target_language: '英语',
    definition_language: '中文',
    status: 'reviewing',
    is_favorite: 0,
    created_at: '2026-05-29T09:00:00.000Z',
    updated_at: '2026-05-29T09:00:00.000Z',
    primary_sentence: 'The hotel charges $100 per night.',
    context_count: 2,
    tags: [],
    due_date: '2026-05-31T09:00:00.000Z',
    contexts: [
      { id: 'ctx-1', card_id: 'card-1', sentence: 'The hotel charges $100 per night.', note: '酒店前台解释房费。', is_primary: 1, sort_order: 10, created_at: 'now', updated_at: 'now' },
      { id: 'ctx-2', card_id: 'card-1', sentence: 'They charge extra for late checkout.', note: null, is_primary: 0, sort_order: 20, created_at: 'now', updated_at: 'now' },
    ],
    media: [
      { id: 'm1', context_example_id: 'ctx-1', media_type: 'video', file_name: 'clip.mp4', file_path: 'uploads/clip.mp4', mime_type: 'video/mp4', file_size: 100, is_available: 1, created_at: 'now' },
      { id: 'm2', context_example_id: 'ctx-1', media_type: 'image', file_name: 'shot.png', file_path: 'uploads/shot.png', mime_type: 'image/png', file_size: 100, is_available: 0, created_at: 'now' },
      { id: 'm3', context_example_id: 'ctx-1', media_type: 'audio', file_name: 'audio.mp3', file_path: 'uploads/audio.mp3', mime_type: 'audio/mpeg', file_size: 100, is_available: 1, created_at: 'now' },
    ],
  },
};

const submitResponse: SubmitReviewResponseDto = {
  card_id: 'card-1',
  rating: 'good',
  reviewed_at: '2026-05-31T09:01:00.000Z',
  due_date_before: '2026-05-31T09:00:00.000Z',
  due_date_after: '2026-06-01T09:00:00.000Z',
  fsrs: { due_date: '2026-06-01T09:00:00.000Z', stability: 1, difficulty: 1, reps: 1, lapses: 0, state: 1, last_reviewed_at: '2026-05-31T09:01:00.000Z' },
  progress: { reviewed_count: 19, again_count: 4, good_count: 15, daily_review_limit: 30, is_limit_reached: false },
};

describe('ReviewPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/review/due' && !init?.method) return Promise.resolve(jsonResponse(dueResponse));
      if (url === '/api/review/card-1' && init?.method === 'POST') return Promise.resolve(jsonResponse(submitResponse));
      return Promise.resolve(jsonResponse({ status: 'empty', message: '今天没有待复习内容', card: null, progress: submitResponse.progress }));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a due card and highlights the target word', async () => {
    render(<ReviewPage />);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    expect(screen.getByText('收费')).toBeInTheDocument();
    expect(screen.getByText(/The hotel/)).toBeInTheDocument();
    expect(screen.getByText(/charges/).tagName.toLowerCase()).toBe('mark');
    expect(screen.getByText('18 / 30')).toBeInTheDocument();
  });

  it('expands context media and notes', async () => {
    render(<ReviewPage />);

    await screen.findByRole('heading', { name: 'charge' });
    fireEvent.click(screen.getByRole('button', { name: '查看当时语境' }));

    expect(screen.getByText('clip.mp4')).toBeInTheDocument();
    expect(screen.getByText('shot.png')).toBeInTheDocument();
    expect(screen.getByText('文件不可用')).toBeInTheDocument();
    expect(screen.getByText('audio.mp3')).toBeInTheDocument();
    expect(screen.getByText('酒店前台解释房费。')).toBeInTheDocument();
    expect(screen.getByText('They charge extra for late checkout.')).toBeInTheDocument();
  });

  it('submits Good and refreshes the next due card', async () => {
    render(<ReviewPage />);

    await screen.findByRole('heading', { name: 'charge' });
    fireEvent.click(screen.getByRole('button', { name: 'Good' }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/review/card-1', expect.objectContaining({ method: 'POST', body: JSON.stringify({ rating: 'good' }) })));
    expect(await screen.findByText('Good 已记录')).toBeInTheDocument();
  });
});
```

Add separate tests for empty, limit reached, and error after implementation pattern is in place:

```tsx
it('shows empty queue state', async () => { /* mock /api/review/due empty and assert 今天没有待复习内容 */ });
it('shows daily target reminder but keeps review controls', async () => { /* use is_limit_reached true and assert 继续复习 + Again */ });
it('shows retryable error state', async () => { /* mock fetch reject and assert 加载失败 + 重试 */ });
```

- [ ] **Step 2: Run ReviewPage tests and confirm they fail**

Run:

```bash
npm test -- tests/client/reviewPage.test.tsx
```

Expected: FAIL because `ReviewPage` does not exist.

- [ ] **Step 3: Implement ReviewPage**

Create `src/client/pages/ReviewPage.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';

import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/UiStates';
import { getDueReview, submitReview } from '../api/review';
import type { DueReviewCardDto, MediaDto, ReviewDueResponseDto, SubmitReviewResponseDto } from '../../shared/types';

type LoadState = 'loading' | 'ready' | 'error';

function highlightSentence(sentence: string, target: string) {
  const index = sentence.toLowerCase().indexOf(target.toLowerCase());
  if (index < 0 || target.length === 0) return sentence;
  return <>{sentence.slice(0, index)}<mark>{sentence.slice(index, index + target.length)}</mark>{sentence.slice(index + target.length)}</>;
}

function mediaFor(card: DueReviewCardDto, type: MediaDto['media_type']) {
  return card.media.filter((item) => item.media_type === type);
}

export function ReviewPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<ReviewDueResponseDto | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [continueAfterLimit, setContinueAfterLimit] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoadState('loading');
    setError(null);
    try {
      setData(await getDueReview());
      setLoadState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setLoadState('error');
    }
  }

  useEffect(() => { void load(); }, []);

  const card = data?.status === 'due' ? data.card : null;
  const progress = data?.progress;
  const primaryContext = card?.contexts.find((context) => context.is_primary === 1) ?? card?.contexts[0];
  const otherContexts = useMemo(() => card ? card.contexts.filter((context) => context.id !== primaryContext?.id).sort((a, b) => a.sort_order - b.sort_order) : [], [card, primaryContext?.id]);

  async function rate(rating: 'again' | 'good') {
    if (!card) return;
    setSubmitting(true);
    setError(null);
    try {
      const result: SubmitReviewResponseDto = await submitReview(card.id, { rating });
      setMessage(`${rating === 'good' ? 'Good' : 'Again'} 已记录`);
      setExpanded(false);
      const next = await getDueReview();
      setData({ ...next, progress: result.progress });
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === 'loading') return <LoadingState message="正在加载复习队列..." />;
  if (loadState === 'error') return <ErrorState message={error ?? '加载失败'} onRetry={load} />;
  if (!data || data.status === 'empty') return <EmptyState title="今天没有待复习内容" description="返回首页，或查看全部词义条目。" actionHref="#/cards" actionLabel="查看全部词义条目" />;

  return (
    <div className="phase7-review">
      {progress?.is_limit_reached && !continueAfterLimit ? (
        <section className="phase7-review-limit">
          <h2>今日复习目标已完成</h2>
          <p>每日复习上限只是提醒，不强制停止。</p>
          <a href="#/">结束复习</a>
          <Button type="button" onClick={() => setContinueAfterLimit(true)}>继续复习</Button>
        </section>
      ) : null}

      <section className="phase7-review-card">
        <p className="phase7-kicker">Next due card · reviewing</p>
        <h2>{card.target_word}</h2>
        <p className="phase7-review-meaning">{card.context_meaning}</p>
        <p className="phase7-review-sentence">{highlightSentence(card.primary_sentence, card.target_word)}</p>
        <p>{progress ? `${progress.reviewed_count} / ${progress.daily_review_limit}` : '0 / 0'}</p>
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <Button type="button" onClick={() => setExpanded((value) => !value)}>查看当时语境</Button>
        <div className="phase7-review-actions">
          <Button type="button" disabled={submitting} onClick={() => void rate('again')}>Again</Button>
          <Button type="button" disabled={submitting} onClick={() => void rate('good')}>Good</Button>
        </div>
      </section>

      {expanded ? (
        <section className="phase7-review-context">
          <h3>查看当时语境</h3>
          {[...mediaFor(card, 'video'), ...mediaFor(card, 'image'), ...mediaFor(card, 'audio')].map((item) => (
            <div key={item.id}>{item.file_name}{item.is_available ? null : <span>文件不可用</span>}</div>
          ))}
          {primaryContext?.note ? <p>{primaryContext.note}</p> : null}
          {otherContexts.map((context) => <p key={context.id}>{context.sentence}</p>)}
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run ReviewPage tests and make them pass**

Run:

```bash
npm test -- tests/client/reviewPage.test.tsx
```

Expected: PASS after adjusting selectors/text only if needed.

- [ ] **Step 5: Add scoped review CSS**

Append to `src/client/styles.css`:

```css
.phase7-review { display: grid; gap: 1rem; }
.phase7-review-card,
.phase7-review-context,
.phase7-review-limit {
  border: 1px solid rgba(23, 32, 51, 0.16);
  border-radius: 1.5rem;
  background: rgba(255, 247, 232, 0.88);
  padding: clamp(1rem, 2vw, 1.5rem);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
}
.phase7-kicker { color: #0f766e; font: 800 .75rem ui-sans-serif, system-ui, sans-serif; letter-spacing: .18em; text-transform: uppercase; }
.phase7-review-card h2 { margin: 0; font-size: clamp(2.5rem, 7vw, 5rem); letter-spacing: -.08em; }
.phase7-review-meaning { color: #475569; font: 700 1.1rem ui-sans-serif, system-ui, sans-serif; }
.phase7-review-sentence { font-size: clamp(1.6rem, 4vw, 3rem); line-height: 1.18; }
.phase7-review-sentence mark { border-radius: .75rem; background: linear-gradient(180deg, transparent 42%, rgba(45, 212, 191, .45) 42%); color: #064e3b; }
.phase7-review-actions { display: flex; flex-wrap: wrap; gap: .75rem; }
```

- [ ] **Step 6: Commit ReviewPage**

Run:

```bash
git add src/client/pages/ReviewPage.tsx src/client/styles.css tests/client/reviewPage.test.tsx
git commit -m "feat(client): add phase 7 review page"
```

---

## Task 3: StatisticsPage

**Files:**
- Create: `src/client/pages/StatisticsPage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/statisticsPage.test.tsx`

- [ ] **Step 1: Create failing StatisticsPage tests**

Create `tests/client/statisticsPage.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StatisticsPage } from '../../src/client/pages/StatisticsPage';
import type { StatisticsPageDto } from '../../src/shared/types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const statistics: StatisticsPageDto = {
  totals: { total_cards: 248, reviewing_cards: 183, mastered_cards: 41, favorite_cards: 24 },
  daily_review_counts: Array.from({ length: 15 }, (_, index) => ({ date: `2026-05-${String(index + 10).padStart(2, '0')}`, count: index + 1 })),
  daily_accuracy: [{ date: '2026-05-24', reviewed_count: 10, good_count: 8, accuracy: 0.8 }],
  monthly_review_counts: [{ month: '2026-04', count: 486 }, { month: '2026-05', count: 531 }],
  tag_distribution: [{ tag_id: 'tag-1', name: '电影', card_count: 76 }],
  rating_trend: [{ date: '2026-05-24', again_count: 2, good_count: 8 }],
};

describe('StatisticsPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(statistics));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders totals and all required chart sections', async () => {
    render(<StatisticsPage />);

    expect(await screen.findByText('总词义条目数量')).toBeInTheDocument();
    expect(screen.getByText('248')).toBeInTheDocument();
    expect(screen.getByText('复习中数量')).toBeInTheDocument();
    expect(screen.getByText('183')).toBeInTheDocument();
    expect(screen.getByText('已熟记数量')).toBeInTheDocument();
    expect(screen.getByText('41')).toBeInTheDocument();
    expect(screen.getByText('收藏数量')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('最近 14 天数量图')).toBeInTheDocument();
    expect(screen.getByText('历史月份数量图')).toBeInTheDocument();
    expect(screen.getByText('2026-05')).toBeInTheDocument();
    expect(screen.getByText('531')).toBeInTheDocument();
    expect(screen.getByText('每日正确率折线图')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('标签分布')).toBeInTheDocument();
    expect(screen.getByText('电影')).toBeInTheDocument();
    expect(screen.getByText('Again / Good 趋势')).toBeInTheDocument();
  });

  it('renders an empty analysis state', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({
      totals: { total_cards: 0, reviewing_cards: 0, mastered_cards: 0, favorite_cards: 0 },
      daily_review_counts: [],
      daily_accuracy: [],
      monthly_review_counts: [],
      tag_distribution: [],
      rating_trend: [],
    } satisfies StatisticsPageDto));

    render(<StatisticsPage />);

    expect(await screen.findByText('还没有统计数据')).toBeInTheDocument();
  });

  it('renders a retryable error state', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('network down'));

    render(<StatisticsPage />);

    expect(await screen.findByText('network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run StatisticsPage tests and confirm they fail**

Run:

```bash
npm test -- tests/client/statisticsPage.test.tsx
```

Expected: FAIL because `StatisticsPage` does not exist.

- [ ] **Step 3: Implement StatisticsPage**

Create `src/client/pages/StatisticsPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';

import { getStatisticsPage } from '../api/statistics';
import { ErrorState, LoadingState } from '../components/UiStates';
import type { StatisticsPageDto } from '../../shared/types';

function maxCount(items: Array<{ count: number }>) {
  return Math.max(1, ...items.map((item) => item.count));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function StatisticsPage() {
  const [data, setData] = useState<StatisticsPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getStatisticsPage());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const recent14 = useMemo(() => (data?.daily_review_counts ?? []).slice(-14), [data]);
  const empty = data ? data.totals.total_cards === 0 && data.daily_review_counts.length === 0 && data.monthly_review_counts.length === 0 : false;

  if (loading) return <LoadingState message="正在加载统计..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const dayMax = maxCount(recent14);
  const monthMax = maxCount(data.monthly_review_counts);

  return (
    <div className="phase7-statistics">
      <section className="phase7-statistics-hero">
        <p className="phase7-kicker">Review analytics</p>
        <h2>看到复习节奏，而不是表格噪音。</h2>
      </section>

      <section className="phase7-statistics-metrics">
        <article><span>总词义条目数量</span><strong>{data.totals.total_cards}</strong></article>
        <article><span>复习中数量</span><strong>{data.totals.reviewing_cards}</strong></article>
        <article><span>已熟记数量</span><strong>{data.totals.mastered_cards}</strong></article>
        <article><span>收藏数量</span><strong>{data.totals.favorite_cards}</strong></article>
      </section>

      {empty ? <p className="phase7-empty-note">还没有统计数据</p> : null}

      <section className="phase7-chart-card">
        <h3>最近 14 天数量图</h3>
        <div className="phase7-bars">{recent14.map((item) => <span key={item.date} title={item.date} style={{ height: `${Math.max(8, (item.count / dayMax) * 100)}%` }}>{item.count}</span>)}</div>
      </section>

      <section className="phase7-chart-card">
        <h3>历史月份数量图</h3>
        <div className="phase7-months">{data.monthly_review_counts.map((item) => <article key={item.month}><span>{item.month}</span><strong>{item.count}</strong><i style={{ width: `${Math.max(8, (item.count / monthMax) * 100)}%` }} /></article>)}</div>
      </section>

      <section className="phase7-chart-card"><h3>每日正确率折线图</h3>{data.daily_accuracy.map((item) => <p key={item.date}>{item.date} · {percent(item.accuracy)}</p>)}</section>
      <section className="phase7-chart-card"><h3>标签分布</h3>{data.tag_distribution.map((item) => <p key={item.tag_id}>{item.name} · {item.card_count}</p>)}</section>
      <section className="phase7-chart-card"><h3>Again / Good 趋势</h3>{data.rating_trend.map((item) => <p key={item.date}>{item.date} · Again {item.again_count} / Good {item.good_count}</p>)}</section>
    </div>
  );
}
```

- [ ] **Step 4: Run StatisticsPage tests and make them pass**

Run:

```bash
npm test -- tests/client/statisticsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Add scoped statistics CSS**

Append to `src/client/styles.css`:

```css
.phase7-statistics { display: grid; gap: 1rem; }
.phase7-statistics-hero,
.phase7-chart-card,
.phase7-statistics-metrics article {
  border: 1px solid rgba(23, 32, 51, 0.16);
  border-radius: 1.5rem;
  background: rgba(255, 247, 232, 0.88);
  padding: clamp(1rem, 2vw, 1.5rem);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
}
.phase7-statistics-hero h2 { margin: 0; font-size: clamp(2.4rem, 6vw, 4.5rem); line-height: .95; letter-spacing: -.08em; }
.phase7-statistics-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
.phase7-statistics-metrics span { color: #64748b; font: 800 .75rem ui-sans-serif, system-ui, sans-serif; }
.phase7-statistics-metrics strong { display: block; margin-top: .5rem; font: 950 2.75rem/.9 ui-sans-serif, system-ui, sans-serif; letter-spacing: -.08em; }
.phase7-bars { display: flex; align-items: end; gap: .5rem; height: 12rem; }
.phase7-bars span { flex: 1; min-width: 1rem; border-radius: 999px 999px .5rem .5rem; background: linear-gradient(180deg, #2dd4bf, #0f766e); color: transparent; }
.phase7-months { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: .75rem; }
.phase7-months article { border-radius: 1rem; background: rgba(255,255,255,.62); padding: 1rem; }
.phase7-months i { display: block; height: .5rem; border-radius: 999px; background: linear-gradient(90deg, #1d4ed8, #2dd4bf); }
.phase7-empty-note { border-radius: 1rem; background: #ecfdf5; color: #0f766e; padding: 1rem; font-weight: 700; }
```

- [ ] **Step 6: Commit StatisticsPage**

Run:

```bash
git add src/client/pages/StatisticsPage.tsx src/client/styles.css tests/client/statisticsPage.test.tsx
git commit -m "feat(client): add phase 7 statistics page"
```

---

## Task 4: SettingsPage

**Files:**
- Create: `src/client/pages/SettingsPage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/settingsPage.test.tsx`

- [ ] **Step 1: Create failing SettingsPage tests**

Create `tests/client/settingsPage.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from '../../src/client/pages/SettingsPage';
import type { ImportScanResponseDto, SettingsDto } from '../../src/shared/types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const settings: SettingsDto = {
  id: 1,
  interface_language: 'zh-CN',
  default_target_language: '英语',
  default_definition_language: '中文',
  daily_review_limit: 30,
  created_at: 'now',
  updated_at: 'now',
};

const scan: ImportScanResponseDto = {
  schema_version: 1,
  export_type: 'marked',
  counts: { cards: 2, contexts: 3, media_files: 1, tags: 1 },
  conflicts: [{ import_card_id: 'import-1', existing_card_id: 'card-1', target_word: 'charge', context_meaning: '收费' }],
  missing_media: ['missing.mp4'],
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings' && !init?.method) return Promise.resolve(jsonResponse(settings));
      if (url === '/api/settings' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ...settings, daily_review_limit: 25 }));
      if (url === '/api/export?type=marked' || url === '/api/export?type=pure') return Promise.resolve(new Response('zip', { status: 200 }));
      if (url === '/api/import/scan') return Promise.resolve(jsonResponse(scan));
      if (url === '/api/import/execute') return Promise.resolve(jsonResponse({ imported_cards: 0, imported_contexts: 0, imported_media_files: 0, skipped_cards: 1, merged_cards: 0, missing_media_files: 1 }));
      return Promise.resolve(jsonResponse({}));
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads and saves settings', async () => {
    render(<SettingsPage />);

    expect(await screen.findByDisplayValue('30')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ interface_language: 'zh-CN', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: 25 }) })));
    expect(await screen.findByText('设置已保存')).toBeInTheDocument();
  });

  it('validates daily review limit', async () => {
    render(<SettingsPage />);

    await screen.findByDisplayValue('30');
    fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

    expect(screen.getByText('每日复习数量必须是正整数')).toBeInTheDocument();
  });

  it('triggers marked and pure exports', async () => {
    render(<SettingsPage />);

    await screen.findByText('导出含有标记的卡片');
    fireEvent.click(screen.getByRole('button', { name: '导出 marked 备份' }));
    fireEvent.click(screen.getByRole('button', { name: '导出 pure 卡片' }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/export?type=marked', expect.any(Object)));
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/export?type=pure', expect.any(Object));
  });

  it('scans and executes import decisions', async () => {
    render(<SettingsPage />);

    const file = new File(['zip'], 'cards.zip', { type: 'application/zip' });
    await screen.findByLabelText('选择导入 zip');
    fireEvent.change(screen.getByLabelText('选择导入 zip'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '扫描导入文件' }));

    expect(await screen.findByText('charge')).toBeInTheDocument();
    expect(screen.getByText('missing.mp4')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('全部跳过'));
    fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

    await waitFor(() => expect(String(globalThis.fetch)).not.toContain('decision'));
    const executeCall = vi.mocked(globalThis.fetch).mock.calls.find(([input]) => String(input) === '/api/import/execute');
    const body = executeCall?.[1]?.body as FormData;
    expect(body.get('decisions')).toBe(JSON.stringify({ mode: 'skip_all' }));
    expect(await screen.findByText('导入完成')).toBeInTheDocument();
  });

  it('does not render out-of-scope settings', async () => {
    render(<SettingsPage />);

    await screen.findByText('学习与界面设置');
    expect(screen.queryByText('本地 API')).not.toBeInTheDocument();
    expect(screen.queryByText('CLI')).not.toBeInTheDocument();
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
    expect(screen.queryByText('同步')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run SettingsPage tests and confirm they fail**

Run:

```bash
npm test -- tests/client/settingsPage.test.tsx
```

Expected: FAIL because `SettingsPage` does not exist.

- [ ] **Step 3: Implement SettingsPage**

Create `src/client/pages/SettingsPage.tsx` with these exports/imports and state shape:

```tsx
import { useEffect, useState } from 'react';

import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/UiStates';
import { executeImport, exportCards, scanImport } from '../api/importExport';
import { getSettings, patchSettings } from '../api/settings';
import type { ExportType, ImportExecuteDecisionDto, ImportScanResponseDto, SettingsDto } from '../../shared/types';

type ImportMode = ImportExecuteDecisionDto['mode'];

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [form, setForm] = useState({ interface_language: 'zh-CN', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: '20' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ImportScanResponseDto | null>(null);
  const [mode, setMode] = useState<ImportMode>('skip_all');
  const [perItem, setPerItem] = useState<Record<string, 'skip' | 'merge' | 'import_as_new'>>({});

  async function load() { /* fetch settings and set form */ }
  async function saveSettings() { /* validate daily limit then PATCH */ }
  async function download(type: ExportType) { /* export blob and anchor click */ }
  async function scanSelectedFile() { /* require file then scanImport */ }
  async function executeSelectedImport() { /* build decision and executeImport */ }

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingState message="正在加载设置..." />;
  if (error && !settings) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="phase7-settings">
      {/* sections described below */}
    </div>
  );
}
```

Fill helper bodies exactly:

```tsx
async function load() {
  setLoading(true);
  setError(null);
  try {
    const next = await getSettings();
    setSettings(next);
    setForm({
      interface_language: next.interface_language,
      default_target_language: next.default_target_language,
      default_definition_language: next.default_definition_language,
      daily_review_limit: String(next.daily_review_limit),
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : '加载失败');
  } finally {
    setLoading(false);
  }
}

async function saveSettings() {
  const dailyLimit = Number(form.daily_review_limit);
  if (!Number.isInteger(dailyLimit) || dailyLimit <= 0) {
    setError('每日复习数量必须是正整数');
    return;
  }
  setError(null);
  const next = await patchSettings({
    interface_language: form.interface_language.trim(),
    default_target_language: form.default_target_language.trim(),
    default_definition_language: form.default_definition_language.trim(),
    daily_review_limit: dailyLimit,
  });
  setSettings(next);
  setMessage('设置已保存');
}

async function download(type: ExportType) {
  const blob = await exportCards(type);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cvn-${type}-export.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

async function scanSelectedFile() {
  if (!file) {
    setError('请选择导入 zip');
    return;
  }
  setError(null);
  const result = await scanImport(file);
  setScan(result);
  setPerItem(Object.fromEntries(result.conflicts.map((conflict) => [conflict.import_card_id, 'skip'])));
}

function buildDecision(): ImportExecuteDecisionDto {
  if (mode === 'per_item') {
    return { mode: 'per_item', items: Object.entries(perItem).map(([import_card_id, decision]) => ({ import_card_id, decision })) };
  }
  return { mode } as ImportExecuteDecisionDto;
}

async function executeSelectedImport() {
  if (!file) {
    setError('请选择导入 zip');
    return;
  }
  setError(null);
  await executeImport(file, buildDecision());
  setMessage('导入完成');
}
```

Render labels/text that tests require:

```tsx
<h2>学习与界面设置</h2>
<label>界面语言<input aria-label="界面语言" value={form.interface_language} onChange={...} /></label>
<label>默认学习语言<input aria-label="默认学习语言" value={form.default_target_language} onChange={...} /></label>
<label>默认释义语言<input aria-label="默认释义语言" value={form.default_definition_language} onChange={...} /></label>
<label>每日复习数量<input aria-label="每日复习数量" value={form.daily_review_limit} onChange={...} /></label>
<Button type="button" onClick={() => void saveSettings()}>保存设置</Button>

<h2>导出含有标记的卡片</h2>
<Button type="button" onClick={() => void download('marked')}>导出 marked 备份</Button>
<h2>导出纯卡片</h2>
<Button type="button" onClick={() => void download('pure')}>导出 pure 卡片</Button>

<label>选择导入 zip<input aria-label="选择导入 zip" type="file" accept=".zip,application/zip" onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)} /></label>
<Button type="button" onClick={() => void scanSelectedFile()}>扫描导入文件</Button>

<label><input type="radio" checked={mode === 'skip_all'} onChange={() => setMode('skip_all')} />全部跳过</label>
<label><input type="radio" checked={mode === 'merge_all'} onChange={() => setMode('merge_all')} />全部合并为已有词义条目的新语境</label>
<label><input type="radio" checked={mode === 'import_all_as_new'} onChange={() => setMode('import_all_as_new')} />全部作为新词义条目导入</label>
<label><input type="radio" checked={mode === 'per_item'} onChange={() => setMode('per_item')} />逐项处理</label>
<Button type="button" onClick={() => void executeSelectedImport()}>执行导入</Button>
```

- [ ] **Step 4: Run SettingsPage tests and make them pass**

Run:

```bash
npm test -- tests/client/settingsPage.test.tsx
```

Expected: PASS after implementing full render.

- [ ] **Step 5: Add scoped settings CSS**

Append to `src/client/styles.css`:

```css
.phase7-settings { display: grid; gap: 1rem; }
.phase7-settings section {
  border: 1px solid rgba(23, 32, 51, 0.16);
  border-radius: 1.5rem;
  background: rgba(255, 247, 232, 0.88);
  padding: clamp(1rem, 2vw, 1.5rem);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
}
.phase7-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
.phase7-settings label { display: grid; gap: .4rem; color: #334155; font: 800 .85rem ui-sans-serif, system-ui, sans-serif; }
.phase7-settings input,
.phase7-settings select { border: 1px solid rgba(23,32,51,.16); border-radius: 1rem; padding: .75rem; }
.phase7-import-conflict { border-radius: 1rem; background: rgba(255,255,255,.62); padding: .75rem; }
```

- [ ] **Step 6: Commit SettingsPage**

Run:

```bash
git add src/client/pages/SettingsPage.tsx src/client/styles.css tests/client/settingsPage.test.tsx
git commit -m "feat(client): add phase 7 settings page"
```

---

## Task 5: App Routes and Route Tests

**Files:**
- Modify: `src/client/App.tsx`
- Test: `tests/client/app.test.tsx`

- [ ] **Step 1: Add failing route tests**

In `tests/client/app.test.tsx`, add tests:

```tsx
it('routes review to the real review page', async () => {
  window.location.hash = '#/review';
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'empty', message: '今天没有待复习内容', card: null, progress: { reviewed_count: 0, again_count: 0, good_count: 0, daily_review_limit: 20, is_limit_reached: false } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  render(<App />);

  expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
  expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
});

it('routes statistics to the real statistics page', async () => {
  window.location.hash = '#/statistics';
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ totals: { total_cards: 0, reviewing_cards: 0, mastered_cards: 0, favorite_cards: 0 }, daily_review_counts: [], daily_accuracy: [], monthly_review_counts: [], tag_distribution: [], rating_trend: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  render(<App />);

  expect(await screen.findByText('还没有统计数据')).toBeInTheDocument();
  expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
});

it('routes settings to the real settings page', async () => {
  window.location.hash = '#/settings';
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 1, interface_language: 'zh-CN', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: 20, created_at: 'now', updated_at: 'now' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  render(<App />);

  expect(await screen.findByText('学习与界面设置')).toBeInTheDocument();
  expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run app tests and confirm they fail**

Run:

```bash
npm test -- tests/client/app.test.tsx
```

Expected: FAIL because routes still render `PlaceholderPage`.

- [ ] **Step 3: Wire real pages in App**

In `src/client/App.tsx`, add imports:

```ts
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatisticsPage } from './pages/StatisticsPage';
```

Replace route elements:

```tsx
if (path === '/review') {
  return { title: '复习', subtitle: 'FSRS 调度', element: <ReviewPage /> };
}
...
if (path === '/statistics') {
  return { title: '统计', subtitle: '复习分析', element: <StatisticsPage /> };
}
if (path === '/settings') {
  return { title: '设置', subtitle: '本地 V1 设置', element: <SettingsPage /> };
}
```

Keep `PlaceholderPage` import for unknown route only if still used.

- [ ] **Step 4: Run app tests and confirm they pass**

Run:

```bash
npm test -- tests/client/app.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit route wiring**

Run:

```bash
git add src/client/App.tsx tests/client/app.test.tsx
git commit -m "feat(client): route phase 7 pages"
```

---

## Task 6: Full Verification and Review

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run targeted Phase 7 tests**

Run:

```bash
npm test -- tests/server/review.test.ts tests/server/statistics.test.ts tests/client/apiClient.test.ts tests/client/reviewPage.test.tsx tests/client/statisticsPage.test.tsx tests/client/settingsPage.test.tsx tests/client/app.test.tsx
```

Expected: all listed files pass.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: all test files pass.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript, Vite build, and node TypeScript build pass.

- [ ] **Step 4: Browser UI pass**

Run:

```bash
npm run dev
```

Open and capture:

```text
http://localhost:5173/#/review
http://localhost:5173/#/statistics
http://localhost:5173/#/settings
```

Expected observations:

- Review route is not a placeholder and shows due/empty state.
- Statistics route shows recent 14-day and monthly sections.
- Settings route shows learning/interface settings, export cards, import scan controls, and no local API/CLI/AI/sync settings.

- [ ] **Step 5: Code review**

Run review agent:

```text
Use ecc-code-reviewer on the current diff. Focus on correctness, state handling, API shape compatibility, and import/export UI safety.
```

Expected: no high/medium findings, or findings fixed before completion.

- [ ] **Step 6: Security review**

Run security reviewer because import/export and file handling UI are touched:

```text
Use ecc-security-reviewer on the current diff. Focus on import/export form handling, object URL cleanup, user-controlled filenames, media URL rendering, and unsafe HTML risks.
```

Expected: no material findings, or findings fixed before completion.

- [ ] **Step 7: Commit verification fixes if any**

If review/security fixes changed files:

```bash
git add <changed-files>
git commit -m "fix(client): address phase 7 review feedback"
```

If no fixes, skip commit.

---

## Spec Coverage Checklist

- Review route real page: Task 2 + Task 5.
- Review media in due response: Task 1.
- Review Again/Good only: Task 2.
- Review empty state and daily goal soft reminder: Task 2.
- Statistics monthly history: Task 1 + Task 3.
- Statistics recent 14-day chart: Task 3.
- Settings save/export/import: Task 4.
- Import `decisions` mismatch: Task 1 + Task 4.
- Settings exclusions local API/CLI/AI/sync: Task 4.
- App placeholder removal: Task 5.
- Full verification/build/review: Task 6.
