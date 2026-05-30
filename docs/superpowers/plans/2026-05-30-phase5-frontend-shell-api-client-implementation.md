# Phase 5 Frontend Shell and Shared API Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 5 frontend foundation: hash-routed app shell, side navigation, shared API client modules, reusable UI components, UI states, and homepage backed by real home statistics API.

**Architecture:** Keep frontend dependency-light by using hash routing instead of adding React Router. `App.tsx` owns route selection, `Layout` owns frame/navigation, pages own data loading, and `src/client/api/*` wraps existing backend endpoints with typed functions and shared error behavior.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS, Vitest, React Testing Library, Fetch API.

---

## Scope guard

Read before coding:

- `PROJECT_MEMORY.md`
- `require.md` sections 9, 10, 11
- `docs/superpowers/specs/2026-05-30-phase5-frontend-shell-api-client-design.md`

Do not implement real Phase 6/7 flows in this phase. Placeholders are acceptable for pages whose workflows belong to later phases.

## File structure

### Create

- `src/client/api/client.ts` — shared fetch helpers and `ApiError`.
- `src/client/api/cards.ts` — card/context API wrappers.
- `src/client/api/tags.ts` — tag API wrappers.
- `src/client/api/review.ts` — review API wrappers.
- `src/client/api/settings.ts` — settings API wrappers.
- `src/client/api/statistics.ts` — home/statistics API wrappers.
- `src/client/api/importExport.ts` — export/import API wrappers.
- `src/client/components/Button.tsx` — shared button.
- `src/client/components/FormField.tsx` — label/help/error wrapper.
- `src/client/components/Pagination.tsx` — pagination controls.
- `src/client/components/StatusBadge.tsx` — status/favorite badge.
- `src/client/components/MediaPreview.tsx` — media preview/unavailable display.
- `src/client/components/ConfirmDialog.tsx` — reusable confirmation dialog.
- `src/client/components/UiStates.tsx` — loading/empty/error state components.
- `src/client/components/Layout.tsx` — sidebar app shell.
- `src/client/pages/HomePage.tsx` — real home stats page.
- `src/client/pages/PlaceholderPage.tsx` — reusable explicit placeholder page.
- `tests/client/apiClient.test.ts` — shared API client tests.
- `tests/client/components.test.tsx` — shared component tests.
- `tests/client/homePage.test.tsx` — homepage data-state tests.

### Modify

- `src/client/App.tsx` — replace static shell with hash router and routed pages.
- `src/client/styles.css` — keep Tailwind directives, add base element styles only if needed.
- `tests/client/app.test.tsx` — update shell/routing tests.

---

## Task 1: Shared API client

**Files:**

- Create: `src/client/api/client.ts`
- Test: `tests/client/apiClient.test.ts`

- [ ] **Step 1: Write failing API client tests**

Create `tests/client/apiClient.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiBlob, apiFormData, apiRequest, buildQuery } from '../../src/client/api/client';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns typed JSON for successful API requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await apiRequest<{ ok: boolean }>('/health');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      headers: expect.objectContaining({ Accept: 'application/json' }),
    }));
  });

  it('serializes JSON bodies and sets content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'card-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiRequest('/cards', { method: 'POST', json: { target_word: 'charge' } });

    expect(fetchMock).toHaveBeenCalledWith('/api/cards', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ target_word: 'charge' }),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('throws ApiError with JSON error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'target_word is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiRequest('/cards')).rejects.toMatchObject({
      status: 400,
      message: 'target_word is required',
    });
  });

  it('throws ApiError with text fallback', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Server exploded', { status: 500 }));

    await expect(apiRequest('/cards')).rejects.toBeInstanceOf(ApiError);
    await expect(apiRequest('/cards')).rejects.toMatchObject({ status: 500, message: 'Server exploded' });
  });

  it('returns undefined for 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiRequest('/cards/card-1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('builds query strings without empty values', () => {
    expect(buildQuery({ search: 'charge', page: 2, favorite: undefined, empty: '' })).toBe('search=charge&page=2');
  });

  it('downloads blobs without forcing JSON parsing', async () => {
    const blob = new Blob(['zip']);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(blob, { status: 200 }));

    const result = await apiBlob('/export?type=pure');

    expect(await result.text()).toBe('zip');
  });

  it('posts form data without JSON content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ imported_cards: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const formData = new FormData();
    formData.append('file', new Blob(['x']), 'cards.zip');

    await apiFormData('/import/scan', formData);

    expect(fetchMock).toHaveBeenCalledWith('/api/import/scan', expect.objectContaining({
      method: 'POST',
      body: formData,
      headers: expect.not.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/client/apiClient.test.ts
```

Expected: fail because `src/client/api/client.ts` does not exist.

- [ ] **Step 3: Implement API client**

Create `src/client/api/client.ts`:

```ts
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  body?: BodyInit | null;
}

function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/api/')) return path;
  if (path === '/api') return path;
  return `/api${path.startsWith('/') ? path : `/${path}`}`;
}

function isJsonResponse(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('application/json') ?? false;
}

async function parseError(response: Response): Promise<ApiError> {
  if (isJsonResponse(response)) {
    const payload = await response.json().catch(() => null) as { error?: unknown; message?: unknown; details?: unknown } | null;
    const message = typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : response.statusText || 'Request failed';
    return new ApiError(response.status, message, payload?.details);
  }

  const text = await response.text().catch(() => '');
  return new ApiError(response.status, text || response.statusText || 'Request failed');
}

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  let body = options.body;
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), { ...options, headers, body });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  if (isJsonResponse(response)) return await response.json() as T;
  return await response.text() as T;
}

export async function apiBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/zip, application/octet-stream');
  const response = await fetch(apiUrl(path), { ...options, headers });
  if (!response.ok) throw await parseError(response);
  return await response.blob();
}

export async function apiFormData<T = unknown>(path: string, formData: FormData, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const response = await fetch(apiUrl(path), {
    ...options,
    method: options.method ?? 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  if (isJsonResponse(response)) return await response.json() as T;
  return await response.text() as T;
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm run test -- tests/client/apiClient.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/client/api/client.ts tests/client/apiClient.test.ts
git commit -m "feat(client): add shared api client"
```

---

## Task 2: Endpoint API modules

**Files:**

- Create: `src/client/api/cards.ts`
- Create: `src/client/api/tags.ts`
- Create: `src/client/api/review.ts`
- Create: `src/client/api/settings.ts`
- Create: `src/client/api/statistics.ts`
- Create: `src/client/api/importExport.ts`
- Modify: `tests/client/apiClient.test.ts`

- [ ] **Step 1: Add endpoint wrapper tests to API test file**

Modify `tests/client/apiClient.test.ts` by adding these imports at the top with existing imports:

```ts
import { listCards } from '../../src/client/api/cards';
import { exportCards } from '../../src/client/api/importExport';
import { getHomeStatistics } from '../../src/client/api/statistics';
```

Then append this describe block to the end of the file:

```ts
describe('endpoint modules', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests card lists with query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listCards({ search: 'charge', page: 1, page_size: 20, favorite: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/cards?search=charge&page=1&page_size=20&favorite=true', expect.any(Object));
  });

  it('requests home statistics', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ due_count: 0, reviewed_today_count: 0, again_today_count: 0, good_today_count: 0, daily_review_limit: 20, is_daily_target_reached: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getHomeStatistics();

    expect(fetchMock).toHaveBeenCalledWith('/api/statistics/home', expect.any(Object));
  });

  it('downloads pure-card exports', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['zip']), { status: 200 }));

    await exportCards('pure');

    expect(fetchMock).toHaveBeenCalledWith('/api/export?type=pure', expect.any(Object));
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/client/apiClient.test.ts
```

Expected: fail because endpoint modules do not exist.

- [ ] **Step 3: Implement endpoint modules**

Create `src/client/api/cards.ts`:

```ts
import type { CardDetailDto, CardSummaryDto, CreateCardBody, PaginatedResult, PatchCardBody, SuggestionDto } from '../../shared/types';
import { apiRequest, buildQuery, type QueryValue } from './client';

export interface ListCardsParams extends Record<string, QueryValue> {
  search?: string;
  status?: string;
  favorite?: boolean;
  tag_id?: string;
  page?: number;
  page_size?: number;
}

export function listCards(params: ListCardsParams = {}): Promise<PaginatedResult<CardSummaryDto>> {
  const query = buildQuery(params);
  return apiRequest<PaginatedResult<CardSummaryDto>>(`/cards${query ? `?${query}` : ''}`);
}

export function getCard(id: string): Promise<CardDetailDto> {
  return apiRequest<CardDetailDto>(`/cards/${encodeURIComponent(id)}`);
}

export function getCardSuggestions(targetWord: string): Promise<SuggestionDto[]> {
  const query = buildQuery({ target_word: targetWord });
  return apiRequest<SuggestionDto[]>(`/cards/suggestions?${query}`);
}

export function createCard(body: CreateCardBody): Promise<unknown> {
  return apiRequest('/cards', { method: 'POST', json: body });
}

export function patchCard(id: string, body: PatchCardBody): Promise<CardSummaryDto> {
  return apiRequest<CardSummaryDto>(`/cards/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function deleteCard(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/cards/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
```

Create `src/client/api/tags.ts`:

```ts
import type { CreateTagBody, PaginatedResult, PatchTagBody, TagDto, CardSummaryDto } from '../../shared/types';
import { apiRequest, buildQuery, type QueryValue } from './client';

export function listTags(): Promise<TagDto[]> {
  return apiRequest<TagDto[]>('/tags');
}

export function createTag(body: CreateTagBody): Promise<TagDto> {
  return apiRequest<TagDto>('/tags', { method: 'POST', json: body });
}

export function patchTag(id: string, body: PatchTagBody): Promise<TagDto> {
  return apiRequest<TagDto>(`/tags/${encodeURIComponent(id)}`, { method: 'PATCH', json: body });
}

export function deleteTag(id: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface TagCardsParams extends Record<string, QueryValue> {
  search?: string;
  status?: string;
  favorite?: boolean;
  page?: number;
  page_size?: number;
}

export function listCardsByTag(tagId: string, params: TagCardsParams = {}): Promise<PaginatedResult<CardSummaryDto>> {
  const query = buildQuery(params);
  return apiRequest<PaginatedResult<CardSummaryDto>>(`/tags/${encodeURIComponent(tagId)}/cards${query ? `?${query}` : ''}`);
}
```

Create `src/client/api/review.ts`:

```ts
import type { ReviewDueResponseDto, ReviewProgressDto, SubmitReviewBody, SubmitReviewResponseDto } from '../../shared/types';
import { apiRequest } from './client';

export function getDueReview(): Promise<ReviewDueResponseDto> {
  return apiRequest<ReviewDueResponseDto>('/review/due');
}

export function getReviewProgress(): Promise<ReviewProgressDto> {
  return apiRequest<ReviewProgressDto>('/review/progress');
}

export function submitReview(cardId: string, body: SubmitReviewBody): Promise<SubmitReviewResponseDto> {
  return apiRequest<SubmitReviewResponseDto>(`/review/${encodeURIComponent(cardId)}`, { method: 'POST', json: body });
}
```

Create `src/client/api/settings.ts`:

```ts
import type { PatchSettingsBody, SettingsDto } from '../../shared/types';
import { apiRequest } from './client';

export function getSettings(): Promise<SettingsDto> {
  return apiRequest<SettingsDto>('/settings');
}

export function patchSettings(body: PatchSettingsBody): Promise<SettingsDto> {
  return apiRequest<SettingsDto>('/settings', { method: 'PATCH', json: body });
}
```

Create `src/client/api/statistics.ts`:

```ts
import type { HomeStatisticsDto, StatisticsPageDto } from '../../shared/types';
import { apiRequest } from './client';

export function getHomeStatistics(): Promise<HomeStatisticsDto> {
  return apiRequest<HomeStatisticsDto>('/statistics/home');
}

export function getStatisticsPage(): Promise<StatisticsPageDto> {
  return apiRequest<StatisticsPageDto>('/statistics');
}
```

Create `src/client/api/importExport.ts`:

```ts
import type { ExportType, ImportExecuteDecisionDto, ImportExecuteResponseDto, ImportScanResponseDto } from '../../shared/types';
import { apiBlob, apiFormData } from './client';

export function exportCards(type: ExportType): Promise<Blob> {
  return apiBlob(`/export?type=${encodeURIComponent(type)}`);
}

export function scanImport(file: File): Promise<ImportScanResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFormData<ImportScanResponseDto>('/import/scan', formData);
}

export function executeImport(file: File, decision: ImportExecuteDecisionDto): Promise<ImportExecuteResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('decision', JSON.stringify(decision));
  return apiFormData<ImportExecuteResponseDto>('/import/execute', formData);
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm run test -- tests/client/apiClient.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/client/api tests/client/apiClient.test.ts
git commit -m "feat(client): add typed endpoint modules"
```

---

## Task 3: Shared UI components

**Files:**

- Create: `src/client/components/Button.tsx`
- Create: `src/client/components/FormField.tsx`
- Create: `src/client/components/Pagination.tsx`
- Create: `src/client/components/StatusBadge.tsx`
- Create: `src/client/components/MediaPreview.tsx`
- Create: `src/client/components/ConfirmDialog.tsx`
- Create: `src/client/components/UiStates.tsx`
- Test: `tests/client/components.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `tests/client/components.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../src/client/components/Button';
import { ConfirmDialog } from '../../src/client/components/ConfirmDialog';
import { FormField } from '../../src/client/components/FormField';
import { MediaPreview } from '../../src/client/components/MediaPreview';
import { Pagination } from '../../src/client/components/Pagination';
import { StatusBadge } from '../../src/client/components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../../src/client/components/UiStates';

describe('shared components', () => {
  it('renders button variants and disabled state', () => {
    render(<Button variant="primary" disabled>保存</Button>);
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('renders form field help and error text', () => {
    render(
      <FormField label="目标单词" help="输入视频里看到的词" error="必填">
        <input aria-label="目标单词" />
      </FormField>,
    );
    expect(screen.getByText('输入视频里看到的词')).toBeInTheDocument();
    expect(screen.getByText('必填')).toBeInTheDocument();
  });

  it('calls pagination callbacks', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(<Pagination page={2} pageSize={20} total={75} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);

    fireEvent.click(screen.getByRole('button', { name: '上一页' }));
    fireEvent.change(screen.getByLabelText('每页数量'), { target: { value: '50' } });

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('renders status and favorite badges', () => {
    render(<><StatusBadge status="reviewing" /><StatusBadge favorite /></>);
    expect(screen.getByText('复习中')).toBeInTheDocument();
    expect(screen.getByText('已收藏')).toBeInTheDocument();
  });

  it('renders unavailable media state', () => {
    render(<MediaPreview mediaType="image" src="/uploads/missing.png" fileName="missing.png" isAvailable={false} />);
    expect(screen.getByText('文件不可用')).toBeInTheDocument();
  });

  it('runs confirm and cancel callbacks', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="删除词义条目" message="确认删除？" onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders loading empty and error states', () => {
    const retry = vi.fn();
    render(<><LoadingState /><EmptyState message="暂无内容" /><ErrorState message="加载失败" onRetry={retry} /></>);

    expect(screen.getByText('加载中…')).toBeInTheDocument();
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/client/components.test.tsx
```

Expected: fail because component files do not exist.

- [ ] **Step 3: Implement shared components**

Create `src/client/components/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:ring-blue-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-blue-500',
};

export function Button({ variant = 'secondary', className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

Create `src/client/components/FormField.tsx`:

```tsx
import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, help, error, children }: FormFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
      {help ? <span className="block text-sm text-slate-500">{help}</span> : null}
      {error ? <span className="block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
```

Create `src/client/components/Pagination.tsx`:

```tsx
import { ALLOWED_PAGE_SIZES, type PageSize } from '../../shared/constants';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: PageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <span>第 {page} / {totalPages} 页，共 {total} 条</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span>每页数量</span>
          <select
            aria-label="每页数量"
            className="rounded-md border border-slate-300 bg-white px-2 py-1"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
          >
            {ALLOWED_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="ghost" disabled={!canGoPrevious} onClick={() => onPageChange(page - 1)}>上一页</Button>
        <Button variant="ghost" disabled={!canGoNext} onClick={() => onPageChange(page + 1)}>下一页</Button>
      </div>
    </div>
  );
}
```

Create `src/client/components/StatusBadge.tsx`:

```tsx
import type { CardStatus } from '../../shared/constants';

interface StatusBadgeProps {
  status?: CardStatus;
  favorite?: boolean;
}

export function StatusBadge({ status, favorite }: StatusBadgeProps) {
  if (favorite) {
    return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">已收藏</span>;
  }

  if (status === 'mastered') {
    return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">已熟记</span>;
  }

  return <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">复习中</span>;
}
```

Create `src/client/components/MediaPreview.tsx`:

```tsx
import type { MediaType } from '../../shared/constants';

interface MediaPreviewProps {
  mediaType: MediaType;
  src: string;
  fileName: string;
  isAvailable: boolean;
}

export function MediaPreview({ mediaType, src, fileName, isAvailable }: MediaPreviewProps) {
  if (!isAvailable) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">{fileName}</p>
        <p>文件不可用</p>
      </div>
    );
  }

  if (mediaType === 'video') {
    return <video className="max-h-80 w-full rounded-xl bg-black" src={src} controls aria-label={fileName} />;
  }

  if (mediaType === 'audio') {
    return <audio className="w-full" src={src} controls aria-label={fileName} />;
  }

  return <img className="max-h-80 rounded-xl border border-slate-200 object-contain" src={src} alt={fileName} />;
}
```

Create `src/client/components/ConfirmDialog.tsx`:

```tsx
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = '确认', cancelLabel = '取消', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  );
}
```

Create `src/client/components/UiStates.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Button } from './Button';

export function LoadingState({ message = '加载中…' }: { message?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{message}</div>;
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
      <p>{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
      <p className="font-medium">加载失败</p>
      <p className="mt-1">{message}</p>
      {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>重试</Button> : null}
    </div>
  );
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm run test -- tests/client/components.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/client/components tests/client/components.test.tsx
git commit -m "feat(client): add shared ui components"
```

---

## Task 4: Layout, hash routing, and placeholder pages

**Files:**

- Create: `src/client/components/Layout.tsx`
- Create: `src/client/pages/PlaceholderPage.tsx`
- Modify: `src/client/App.tsx`
- Modify: `tests/client/app.test.tsx`

- [ ] **Step 1: Write failing routing tests**

Replace `tests/client/app.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '../../src/client/App';

describe('App', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('renders the sidebar shell with navigation', () => {
    render(<App />);

    expect(screen.getByText('语境单词本')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('首页');
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('制卡');
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('设置');
  });

  it('navigates with hash links and highlights current page', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: /复习/ }));

    expect(window.location.hash).toBe('#/review');
    expect(screen.getByRole('heading', { name: '复习' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /复习/ })).toHaveAttribute('aria-current', 'page');
  });

  it.each([
    ['#/', '首页'],
    ['#/create', '制卡'],
    ['#/cards', '词义条目'],
    ['#/cards/card-1', '词义详情'],
    ['#/review', '复习'],
    ['#/tags', '标签管理'],
    ['#/favorites', '收藏'],
    ['#/statistics', '统计'],
    ['#/settings', '设置'],
  ])('renders route %s', (hash, heading) => {
    window.location.hash = hash;
    render(<App />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/client/app.test.tsx
```

Expected: fail because current app has no hash routing/layout.

- [ ] **Step 3: Implement layout and routing**

Create `src/client/components/Layout.tsx`:

```tsx
import type { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  match: (hashPath: string) => boolean;
}

interface LayoutProps {
  navItems: NavItem[];
  currentPath: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function Layout({ navItems, currentPath, title, subtitle, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6 lg:px-8">
        <aside className="md:w-72 md:shrink-0">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:sticky md:top-6">
            <p className="text-lg font-bold text-slate-950">语境单词本</p>
            <p className="mt-1 text-sm text-slate-500">Context Vocabulary Notebook</p>
            <nav className="mt-6 space-y-1" aria-label="主导航">
              {navItems.map((item) => {
                const active = item.match(currentPath);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-xl px-3 py-2 transition ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.description}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
            <p className="text-sm font-medium text-blue-700">{subtitle}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
            <div className="mt-6">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
```

Create `src/client/pages/PlaceholderPage.tsx`:

```tsx
import { EmptyState } from '../components/UiStates';

interface PlaceholderPageProps {
  message: string;
  phase: 'Phase 6' | 'Phase 7';
}

export function PlaceholderPage({ message, phase }: PlaceholderPageProps) {
  return (
    <EmptyState
      message={`${message}。此功能将在 ${phase} 实现。`}
      action={<a className="text-sm font-medium text-blue-700 hover:text-blue-800" href="#/">返回首页</a>}
    />
  );
}
```

Replace `src/client/App.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';

import { Layout, type NavItem } from './components/Layout';
import { PlaceholderPage } from './pages/PlaceholderPage';

function currentHashPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

const navItems: NavItem[] = [
  { href: '#/', label: '首页', description: '今日复习与快速入口', match: (path) => path === '/' },
  { href: '#/create', label: '制卡', description: '创建词义和语境', match: (path) => path === '/create' },
  { href: '#/cards', label: '词义条目', description: '搜索、筛选、管理', match: (path) => path === '/cards' || path.startsWith('/cards/') },
  { href: '#/review', label: '复习', description: 'Again / Good 复习', match: (path) => path === '/review' },
  { href: '#/tags', label: '标签', description: '分类和来源标记', match: (path) => path === '/tags' },
  { href: '#/favorites', label: '收藏', description: '查看收藏词义', match: (path) => path === '/favorites' },
  { href: '#/statistics', label: '统计', description: '复习和标签分析', match: (path) => path === '/statistics' },
  { href: '#/settings', label: '设置', description: '语言、目标和导入导出', match: (path) => path === '/settings' },
];

interface RouteResult {
  title: string;
  subtitle: string;
  element: JSX.Element;
}

function routeFor(path: string): RouteResult {
  if (path === '/') {
    return { title: '首页', subtitle: '今日概览', element: <PlaceholderPage message="首页会展示真实今日复习数据" phase="Phase 7" /> };
  }
  if (path === '/create') {
    return { title: '制卡', subtitle: '添加真实视频语境', element: <PlaceholderPage message="制卡页会支持新建词义和添加到已有词义" phase="Phase 6" /> };
  }
  if (path === '/cards') {
    return { title: '词义条目', subtitle: '管理所有词义', element: <PlaceholderPage message="词义条目页会支持搜索、筛选、分页和状态操作" phase="Phase 6" /> };
  }
  if (path.startsWith('/cards/')) {
    return { title: '词义详情', subtitle: '查看和维护语境', element: <PlaceholderPage message="词义详情页会展示语境、媒体、标签和复习信息" phase="Phase 6" /> };
  }
  if (path === '/review') {
    return { title: '复习', subtitle: 'FSRS 调度', element: <PlaceholderPage message="复习页会显示主语境原句并提供 Again / Good" phase="Phase 7" /> };
  }
  if (path === '/tags') {
    return { title: '标签管理', subtitle: '自由分类和来源标记', element: <PlaceholderPage message="标签页会支持新增、编辑、删除和查看标签下词义" phase="Phase 6" /> };
  }
  if (path === '/favorites') {
    return { title: '收藏', subtitle: '重点词义', element: <PlaceholderPage message="收藏页会展示和管理已收藏词义" phase="Phase 6" /> };
  }
  if (path === '/statistics') {
    return { title: '统计', subtitle: '复习分析', element: <PlaceholderPage message="统计页会展示复习趋势、正确率和标签分布" phase="Phase 7" /> };
  }
  if (path === '/settings') {
    return { title: '设置', subtitle: '本地 V1 设置', element: <PlaceholderPage message="设置页会支持语言、每日目标和数据导入导出" phase="Phase 7" /> };
  }
  return { title: '页面不存在', subtitle: '未知路由', element: <PlaceholderPage message="未找到对应页面" phase="Phase 6" /> };
}

export function App() {
  const [path, setPath] = useState(currentHashPath);

  useEffect(() => {
    const onHashChange = () => setPath(currentHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const route = useMemo(() => routeFor(path), [path]);

  return (
    <Layout navItems={navItems} currentPath={path} title={route.title} subtitle={route.subtitle}>
      {route.element}
    </Layout>
  );
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm run test -- tests/client/app.test.tsx
```

Expected: pass after routing state updates on hash change. If React test does not emit `hashchange` from anchor click in jsdom, add `fireEvent(window, new HashChangeEvent('hashchange'))` after click in test.

- [ ] **Step 5: Commit**

```bash
git add src/client/App.tsx src/client/components/Layout.tsx src/client/pages/PlaceholderPage.tsx tests/client/app.test.tsx
git commit -m "feat(client): add routed app shell"
```

---

## Task 5: Home page with real statistics API

**Files:**

- Create: `src/client/pages/HomePage.tsx`
- Modify: `src/client/App.tsx`
- Test: `tests/client/homePage.test.tsx`

- [ ] **Step 1: Write failing HomePage tests**

Create `tests/client/homePage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '../../src/client/pages/HomePage';

describe('HomePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading then home statistics', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        due_count: 3,
        reviewed_today_count: 5,
        again_today_count: 1,
        good_today_count: 4,
        daily_review_limit: 20,
        is_daily_target_reached: false,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<HomePage />);

    expect(screen.getByText('加载中…')).toBeInTheDocument();
    expect(await screen.findByText('今日待复习')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5 / 20')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '开始复习' })).toHaveAttribute('href', '#/review');
    expect(screen.getByRole('link', { name: '快速制卡' })).toHaveAttribute('href', '#/create');
  });

  it('shows daily target reached message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        due_count: 0,
        reviewed_today_count: 20,
        again_today_count: 2,
        good_today_count: 18,
        daily_review_limit: 20,
        is_daily_target_reached: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<HomePage />);

    expect(await screen.findByText('今日复习目标已完成')).toBeInTheDocument();
  });

  it('shows API errors without fake counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'database unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('database unavailable');
    await waitFor(() => expect(screen.queryByText('今日待复习')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- tests/client/homePage.test.tsx
```

Expected: fail because `HomePage.tsx` does not exist.

- [ ] **Step 3: Implement HomePage and route integration**

Create `src/client/pages/HomePage.tsx`:

```tsx
import { useEffect, useState } from 'react';

import type { HomeStatisticsDto } from '../../shared/types';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/UiStates';
import { getHomeStatistics } from '../api/statistics';

interface StatCardProps {
  label: string;
  value: string | number;
  help: string;
}

function StatCard({ label, value, help }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{help}</p>
    </div>
  );
}

export function HomePage() {
  const [data, setData] = useState<HomeStatisticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    getHomeStatistics()
      .then(setData)
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : '无法加载首页数据');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <ErrorState message="无法加载首页数据" onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="今日待复习" value={data.due_count} help="按 FSRS 到期排序" />
        <StatCard label="今日已复习" value={`${data.reviewed_today_count} / ${data.daily_review_limit}`} help="每日目标是提醒，不是硬限制" />
        <StatCard label="Again" value={data.again_today_count} help="今天不熟或答错" />
        <StatCard label="Good" value={data.good_today_count} help="今天顺利想起" />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-medium text-blue-800">
          {data.is_daily_target_reached ? '今日复习目标已完成' : '今天可以继续积累和复习'}
        </p>
        <p className="mt-1 text-sm text-blue-700">
          复习页会按到期时间展示词义条目，目标单词不会被隐藏。
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700" href="#/review">开始复习</a>
        <a className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 transition hover:bg-slate-50" href="#/create">快速制卡</a>
      </div>
    </div>
  );
}
```

Then modify `src/client/App.tsx`:

- Add import:

```ts
import { HomePage } from './pages/HomePage';
```

- Replace home route element with:

```tsx
return { title: '首页', subtitle: '今日概览', element: <HomePage /> };
```

- [ ] **Step 4: Verify HomePage tests pass**

Run:

```bash
npm run test -- tests/client/homePage.test.tsx tests/client/app.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/client/App.tsx src/client/pages/HomePage.tsx tests/client/homePage.test.tsx
git commit -m "feat(client): show home statistics"
```

---

## Task 6: Styling cleanup and full verification

**Files:**

- Modify: `src/client/styles.css` if needed.
- No new source files expected.

- [ ] **Step 1: Run client test suite**

Run:

```bash
npm run test -- tests/client
```

Expected: all client tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: pass.

- [ ] **Step 5: Browser/manual route check**

Run app:

```bash
npm run dev
```

Open Vite frontend and check routes:

```text
#/
#/create
#/cards
#/cards/manual-check
#/review
#/tags
#/favorites
#/statistics
#/settings
```

Confirm:

- Sidebar renders.
- Current page highlights.
- Homepage calls real `/api/statistics/home` when server is running.
- Placeholder pages clearly say Phase 6 or Phase 7.
- No UI exposes local API, CLI, AI, sync, OCR, ASR, browser extension, mobile packaging, or Anki export.

Stop dev server after check.

- [ ] **Step 6: Commit verification-only fixes if any**

If code changes were needed:

```bash
git add src/client tests/client
git commit -m "fix(client): stabilize phase 5 frontend foundation"
```

If no code changes were needed, do not create an empty commit.

---

## Plan self-review

### Spec coverage

- Hash routing and side navigation: Task 4.
- Nine V1 routes: Task 4.
- Shared API client and endpoint modules: Tasks 1 and 2.
- Reusable UI components and UI states: Task 3.
- Homepage real statistics data: Task 5.
- Tests/typecheck/build/manual route check: Task 6.
- Scope guard and no future-scope UI: Scope guard plus Task 6 manual check.

### Placeholder scan

No `TBD`, incomplete placeholder instructions, or vague implementation steps remain. Placeholder pages are intentional product UI for deferred Phase 6/7 workflows.

### Type consistency

- API DTO imports match `src/shared/types.ts`.
- `PageSize` and `CardStatus` imports match `src/shared/constants.ts`.
- `apiRequest`, `apiBlob`, `apiFormData`, and `buildQuery` are defined in Task 1 and used in Task 2.
- Component props used in tests are defined in Task 3.
