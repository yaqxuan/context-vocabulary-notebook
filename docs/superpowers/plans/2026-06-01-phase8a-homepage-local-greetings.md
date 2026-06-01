# Phase 8A Homepage Local Greetings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight Chinese local greeting to the homepage, selected by local weekday/weekend and time bucket from the approved 130-line phrase bank.

**Architecture:** Keep the feature fully client-side. Add a focused pure module for greeting phrase data, time-bucket derivation, deterministic selection, localStorage persistence, and repeat avoidance; then render its output in `HomePage` above existing statistics.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind CSS v4.

---

## File Structure

- Create: `src/client/lib/homeGreetings.ts`
  - Owns all greeting phrase data and pure selection logic.
  - Exposes `getGreetingContext()` and `getHomeGreeting()`.
  - Handles `localStorage` safely with fallback.
- Create: `tests/client/homeGreetings.test.ts`
  - Unit tests for bucket boundaries, weekday/weekend/shared audience, stable selection, repeat avoidance, invalid storage, and storage fallback.
- Modify: `src/client/pages/HomePage.tsx`
  - Imports `getHomeGreeting()` and renders one greeting above statistics after data loads.
  - Leaves error/loading behavior unchanged.
- Modify: `tests/client/homePage.test.tsx`
  - Mocks `getHomeGreeting()` for deterministic UI tests.
  - Verifies greeting renders and existing stats/actions remain.
- Already created during design: `docs/superpowers/specs/2026-06-01-phase8a-homepage-local-greetings-design.md`
- Already created during design: `docs/superpowers/mockups/phase8a-homepage-local-greeting-mockup.html`
- Already modified during design: `PROJECT_MEMORY.md`, `.gitignore`

---

### Task 1: Greeting selection module

**Files:**
- Create: `src/client/lib/homeGreetings.ts`
- Test: `tests/client/homeGreetings.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/client/homeGreetings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  GREETING_PHRASES,
  getGreetingContext,
  getHomeGreeting,
  type GreetingSelection,
  type StorageLike,
} from '../../src/client/lib/homeGreetings';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class ThrowingStorage implements StorageLike {
  getItem() {
    throw new Error('storage disabled');
  }

  setItem() {
    throw new Error('storage disabled');
  }
}

function selection(text: string): string {
  const stored: GreetingSelection = {
    date: '2026-06-01',
    bucket: '07:00-11:00',
    audience: 'weekday',
    text,
  };
  return JSON.stringify(stored);
}

describe('getGreetingContext', () => {
  it('uses inclusive start and exclusive end bucket boundaries', () => {
    expect(getGreetingContext(new Date('2026-06-01T03:59:00')).bucket).toBe('23:00-04:00');
    expect(getGreetingContext(new Date('2026-06-01T04:00:00')).bucket).toBe('04:00-07:00');
    expect(getGreetingContext(new Date('2026-06-01T06:59:00')).bucket).toBe('04:00-07:00');
    expect(getGreetingContext(new Date('2026-06-01T07:00:00')).bucket).toBe('07:00-11:00');
    expect(getGreetingContext(new Date('2026-06-01T22:59:00')).bucket).toBe('21:00-23:00');
    expect(getGreetingContext(new Date('2026-06-01T23:00:00')).bucket).toBe('23:00-04:00');
  });

  it('uses weekday, weekend, and shared audiences', () => {
    expect(getGreetingContext(new Date('2026-06-01T07:30:00')).audience).toBe('weekday');
    expect(getGreetingContext(new Date('2026-06-06T07:30:00')).audience).toBe('weekend');
    expect(getGreetingContext(new Date('2026-06-07T07:30:00')).audience).toBe('weekend');
    expect(getGreetingContext(new Date('2026-06-01T23:30:00')).audience).toBe('shared');
  });

  it('formats local date as YYYY-MM-DD', () => {
    expect(getGreetingContext(new Date('2026-01-05T08:00:00')).date).toBe('2026-01-05');
  });
});

describe('getHomeGreeting', () => {
  it('returns a candidate from the active weekday bucket', () => {
    const result = getHomeGreeting({
      now: new Date('2026-06-01T07:30:00'),
      storage: new MemoryStorage(),
    });

    expect(result.bucket).toBe('07:00-11:00');
    expect(result.audience).toBe('weekday');
    expect(GREETING_PHRASES.weekday['07:00-11:00']).toContain(result.text);
  });

  it('keeps the same date and bucket stable via storage', () => {
    const storage = new MemoryStorage();
    const now = new Date('2026-06-01T07:30:00');

    const first = getHomeGreeting({ now, storage });
    const second = getHomeGreeting({ now, storage });

    expect(second).toEqual(first);
  });

  it('reselects if a stored greeting no longer exists in the active phrase bank', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'homeGreetingSelection:07:00-11:00:weekday',
      selection('旧文案'),
    );

    const result = getHomeGreeting({
      now: new Date('2026-06-01T07:30:00'),
      storage,
    });

    expect(result.text).not.toBe('旧文案');
    expect(GREETING_PHRASES.weekday['07:00-11:00']).toContain(result.text);
  });

  it('avoids immediately repeating the last greeting when the bucket has alternatives', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'homeGreetingLast:07:00-11:00:weekday',
      selection('早上好，今天刚刚开始。'),
    );

    const result = getHomeGreeting({
      now: new Date('2026-06-08T07:30:00'),
      storage,
    });

    expect(result.text).not.toBe('早上好，今天刚刚开始。');
    expect(GREETING_PHRASES.weekday['07:00-11:00']).toContain(result.text);
  });

  it('falls back to deterministic selection when storage throws', () => {
    const result = getHomeGreeting({
      now: new Date('2026-06-01T23:30:00'),
      storage: new ThrowingStorage(),
    });

    expect(result.bucket).toBe('23:00-04:00');
    expect(result.audience).toBe('shared');
    expect(GREETING_PHRASES.shared['23:00-04:00']).toContain(result.text);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/client/homeGreetings.test.ts
```

Expected: FAIL because `../../src/client/lib/homeGreetings` does not exist.

- [ ] **Step 3: Implement greeting module**

Create `src/client/lib/homeGreetings.ts`:

```ts
export type GreetingAudience = 'weekday' | 'weekend' | 'shared';

export type GreetingBucket =
  | '04:00-07:00'
  | '07:00-11:00'
  | '11:00-13:00'
  | '13:00-18:00'
  | '18:00-21:00'
  | '21:00-23:00'
  | '23:00-04:00';

export interface GreetingContext {
  date: string;
  bucket: GreetingBucket;
  audience: GreetingAudience;
}

export interface GreetingSelection extends GreetingContext {
  text: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type PhraseBank = Record<GreetingAudience, Partial<Record<GreetingBucket, string[]>>>;

export const GREETING_PHRASES = {
  weekday: {
    '04:00-07:00': [
      '天还没亮，你已经来了。',
      '清晨很轻，你也在。',
      '这个点，城市还安静。',
      '这么早，已经见到你了。',
      '晨光还没铺开，你先到了。',
      '早一点，也安静一点。',
      '天色还浅，这里已经亮了。',
      '清晨留了一点安静给你。',
      '一天还没开始，你已经在这里。',
      '这个时间，很少有人打扰。',
    ],
    '07:00-11:00': [
      '早上好，今天刚刚开始。',
      '早上好，慢慢展开。',
      '上午好，时间还宽。',
      '早上好，不用太赶。',
      '新的一天，先轻轻开始。',
      '上午的光还很干净。',
      '早上好，先从这里看看。',
      '今天还早，可以慢一点。',
      '上午好，风还轻。',
      '早上到了，一切才刚开始。',
    ],
    '11:00-13:00': [
      '中午了，可以停一停。',
      '快中午了，缓一缓。',
      '上午走到这里了。',
      '中午到了，歇一口气。',
      '日头高了，慢一点。',
      '午前的时间快过去了。',
      '中午好，先放松一下。',
      '上午差不多了，别太急。',
      '这个时候，适合停一会儿。',
      '中午了，给自己一点空隙。',
    ],
    '13:00-18:00': [
      '下午好，慢慢来。',
      '下午了，不必太赶。',
      '午后的时间，缓一点。',
      '下午好，先从这里开始。',
      '阳光往后移了一点。',
      '下午的节奏，可以轻一点。',
      '下午了，给自己一点耐心。',
      '这个时间，慢慢看就好。',
      '午后容易散，先待一会儿。',
      '下午好，不急着往前赶。',
    ],
    '18:00-21:00': [
      '晚上好，一天慢慢收尾了。',
      '晚上了，今天走到这里。',
      '傍晚好，天色慢下来了。',
      '晚上好，你又来了。',
      '天暗下来了，这里还在。',
      '晚上了，可以缓一缓。',
      '今天快过去了，先坐一会儿。',
      '晚上的时间，安静一点。',
      '灯亮起来了，你也到了。',
      '晚上好，今天也到这个时候了。',
    ],
    '21:00-23:00': [
      '夜里安静，慢慢来。',
      '晚了，不用急。',
      '夜深一点，也安静一点。',
      '这个时间，适合慢下来。',
      '夜色沉下来了。',
      '晚一点，也没关系。',
      '夜里了，这里还亮着。',
      '这个时候，不用赶。',
      '夜深了，声音都轻了。',
      '晚了，先陪你待一会儿。',
    ],
  },
  weekend: {
    '04:00-07:00': [
      '周末的清晨，你也来了。',
      '这么早，周末还很安静。',
      '周末天还没亮，你已经在。',
      '清晨很轻，连周末也是。',
      '周末的早风，还带着安静。',
      '这个点的周末，很少有人醒着。',
      '周末清晨，先在这里坐坐。',
      '天色还浅，周末也慢慢开始。',
      '周末这么早，已经见到你了。',
      '清晨还没展开，你先到了。',
    ],
    '07:00-11:00': [
      '周末早上，你也来了。',
      '周末早上，慢慢看。',
      '周末的早晨，很适合轻一点。',
      '周末还早，不用赶。',
      '早上的周末，时间很宽。',
      '周末醒来，先看看这里。',
      '周末早上，风也慢一点。',
      '这个早晨，适合随意一点。',
      '周末开始了，慢慢来。',
      '早上好，周末也见到你。',
    ],
    '11:00-13:00': [
      '中午了，来看看也好。',
      '周末中午，慢一点。',
      '午前的时间，还算宽。',
      '中午到了，先停一停。',
      '周末中午，不用太急。',
      '日头高了，周末也慢慢过。',
      '中午好，随便看看也好。',
      '周末走到中午了。',
      '午饭前，先来这里待一会儿。',
      '这个中午，很适合缓下来。',
    ],
    '13:00-18:00': [
      '周末下午，你还记得这里。',
      '下午了，周末也慢慢过。',
      '周末午后，适合轻轻翻一页。',
      '周末还长，慢慢来。',
      '午后的周末，时间松一点。',
      '下午好，周末也见到你。',
      '周末下午，阳光慢慢斜了。',
      '这个下午，可以轻一点。',
      '周末的下午，不用太满。',
      '下午了，先在这里歇一下。',
    ],
    '18:00-21:00': [
      '周末晚上，你也回来了。',
      '周末晚上，天色慢下来了。',
      '周末快收尾了，你还在。',
      '晚上好，周末也见到你。',
      '周末的灯亮起来了。',
      '晚上了，周末还剩一点安静。',
      '周末晚上，慢慢待一会儿。',
      '天暗下来了，周末也温和一点。',
      '周末到了晚上，先缓一缓。',
      '晚上好，今天也走到这里了。',
    ],
    '21:00-23:00': [
      '夜里安静，你还在。',
      '周末夜里，也慢慢来。',
      '深了，这里还亮着。',
      '夜安静下来，你也来了。',
      '周末的夜，声音轻了。',
      '晚了，周末也慢下来。',
      '夜里了，先陪你一会儿。',
      '周末快过去了，不用急。',
      '这个夜晚，很安静。',
      '深夜前，先在这里坐坐。',
    ],
  },
  shared: {
    '23:00-04:00': [
      '还没睡，陪你一会儿。',
      '这么晚了，你还在。',
      '深夜了，这里还亮着。',
      '夜很深了，在呢。',
      '这个时间，世界安静下来。',
      '夜已经很深，先陪你坐会儿。',
      '晚到这个点了，慢慢来。',
      '深夜里，这里还在。',
      '夜色很沉，你也还在。',
      '这么晚了，先不急。',
    ],
  },
} satisfies PhraseBank;

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBucket(date: Date): GreetingBucket {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes < 4 * 60 || totalMinutes >= 23 * 60) return '23:00-04:00';
  if (totalMinutes < 7 * 60) return '04:00-07:00';
  if (totalMinutes < 11 * 60) return '07:00-11:00';
  if (totalMinutes < 13 * 60) return '11:00-13:00';
  if (totalMinutes < 18 * 60) return '13:00-18:00';
  if (totalMinutes < 21 * 60) return '18:00-21:00';
  return '21:00-23:00';
}

function getAudience(date: Date, bucket: GreetingBucket): GreetingAudience {
  if (bucket === '23:00-04:00') return 'shared';
  const day = date.getDay();
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

function getPhrases(audience: GreetingAudience, bucket: GreetingBucket) {
  return GREETING_PHRASES[audience][bucket] ?? GREETING_PHRASES.shared['23:00-04:00'];
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function currentStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function readSelection(storage: StorageLike | undefined, key: string): GreetingSelection | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<GreetingSelection>;
    if (
      typeof value.date !== 'string'
      || typeof value.bucket !== 'string'
      || typeof value.audience !== 'string'
      || typeof value.text !== 'string'
    ) {
      return null;
    }
    return value as GreetingSelection;
  } catch {
    return null;
  }
}

function writeSelection(storage: StorageLike | undefined, key: string, selection: GreetingSelection) {
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(selection));
  } catch {
    // localStorage is optional for this UI detail.
  }
}

export function getGreetingContext(now = new Date()): GreetingContext {
  const bucket = getBucket(now);
  return {
    date: formatLocalDate(now),
    bucket,
    audience: getAudience(now, bucket),
  };
}

export function getHomeGreeting(options: { now?: Date; storage?: StorageLike } = {}): GreetingSelection {
  const context = getGreetingContext(options.now ?? new Date());
  const storage = options.storage ?? currentStorage();
  const phrases = getPhrases(context.audience, context.bucket);
  const selectionKey = `homeGreetingSelection:${context.bucket}:${context.audience}`;
  const lastKey = `homeGreetingLast:${context.bucket}:${context.audience}`;
  const stored = readSelection(storage, selectionKey);

  if (stored && phrases.includes(stored.text)) return stored;

  const last = readSelection(storage, lastKey);
  const available = last && phrases.length > 1
    ? phrases.filter((phrase) => phrase !== last.text)
    : phrases;
  const index = hashString(`${context.date}|${context.bucket}|${context.audience}`) % available.length;
  const selection: GreetingSelection = {
    ...context,
    text: available[index],
  };

  writeSelection(storage, selectionKey, selection);
  writeSelection(storage, lastKey, selection);

  return selection;
}
```

- [ ] **Step 4: Run module tests**

Run:

```bash
npm test -- tests/client/homeGreetings.test.ts
```

Expected: PASS for `tests/client/homeGreetings.test.ts`.

- [ ] **Step 5: Commit module**

Only commit if current execution mode allows commits.

```bash
git add src/client/lib/homeGreetings.ts tests/client/homeGreetings.test.ts
git commit -m "feat(client): add local homepage greetings"
```

---

### Task 2: Render greeting on homepage

**Files:**
- Modify: `src/client/pages/HomePage.tsx`
- Modify: `tests/client/homePage.test.tsx`

- [ ] **Step 1: Update failing HomePage test**

Replace `tests/client/homePage.test.tsx` with:

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '../../src/client/pages/HomePage';

vi.mock('../../src/client/lib/homeGreetings', () => ({
  getHomeGreeting: () => ({
    date: '2026-06-01',
    bucket: '07:00-11:00',
    audience: 'weekday',
    text: '早上好，今天刚刚开始。',
  }),
}));

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows loading then greeting and home statistics', async () => {
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
    expect(await screen.findByRole('heading', { name: '早上好，今天刚刚开始。' })).toBeInTheDocument();
    expect(screen.getByText('今日待复习')).toBeInTheDocument();
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
    expect(screen.queryByText('早上好，今天刚刚开始。')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run HomePage test to verify it fails**

Run:

```bash
npm test -- tests/client/homePage.test.tsx
```

Expected: FAIL because `HomePage` does not render the greeting heading yet.

- [ ] **Step 3: Render greeting in HomePage**

Modify `src/client/pages/HomePage.tsx` to include the import and greeting. Final file should be:

```tsx
import { useEffect, useState } from 'react';

import type { HomeStatisticsDto } from '../../shared/types';
import { ErrorState, LoadingState } from '../components/UiStates';
import { getHomeStatistics } from '../api/statistics';
import { getHomeGreeting } from '../lib/homeGreetings';

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

  const greeting = getHomeGreeting();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">首页</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{greeting.text}</h1>
      </div>

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

- [ ] **Step 4: Run HomePage test**

Run:

```bash
npm test -- tests/client/homePage.test.tsx
```

Expected: PASS for `tests/client/homePage.test.tsx`.

- [ ] **Step 5: Run targeted client tests**

Run:

```bash
npm test -- tests/client/homeGreetings.test.ts tests/client/homePage.test.tsx
```

Expected: PASS for both files.

- [ ] **Step 6: Commit homepage integration**

Only commit if current execution mode allows commits.

```bash
git add src/client/pages/HomePage.tsx tests/client/homePage.test.tsx
git commit -m "feat(client): show local greeting on homepage"
```

---

### Task 3: Verification and cleanup

**Files:**
- Verify: all changed files
- No new source files expected in this task

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS. Previous baseline after Phase 7 was `21 files / 337 tests`; Phase 8A adds one new test file and several tests, so count should increase.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS for TypeScript, Vite build, and node TypeScript build.

- [ ] **Step 3: Inspect changed files**

Run:

```bash
git diff --check
git status --short
```

Expected:

- `git diff --check` prints no output.
- `git status --short` shows only intended Phase 8A files:
  - `.gitignore`
  - `PROJECT_MEMORY.md`
  - `docs/superpowers/mockups/phase8a-homepage-local-greeting-mockup.html`
  - `docs/superpowers/plans/2026-06-01-phase8a-homepage-local-greetings.md`
  - `docs/superpowers/specs/2026-06-01-phase8a-homepage-local-greetings-design.md`
  - `src/client/lib/homeGreetings.ts`
  - `src/client/pages/HomePage.tsx`
  - `tests/client/homeGreetings.test.ts`
  - `tests/client/homePage.test.tsx`

- [ ] **Step 4: Optional browser smoke test**

If local browser verification is requested, use the known working Playwright Chromium path rather than Playwright MCP Chrome.

Run app:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/#/
```

Expected:

- Homepage loads.
- A Chinese greeting appears above the statistics cards.
- Existing statistic cards still appear.
- Existing `开始复习` and `快速制卡` links still appear.
- No poetic/playful bilingual copy line appears.

- [ ] **Step 5: Final commit**

Only commit if current execution mode allows commits and earlier task commits were not made.

```bash
git add .gitignore PROJECT_MEMORY.md docs/superpowers/mockups/phase8a-homepage-local-greeting-mockup.html docs/superpowers/plans/2026-06-01-phase8a-homepage-local-greetings.md docs/superpowers/specs/2026-06-01-phase8a-homepage-local-greetings-design.md src/client/lib/homeGreetings.ts src/client/pages/HomePage.tsx tests/client/homeGreetings.test.ts tests/client/homePage.test.tsx
git commit -m "feat(client): add phase 8a homepage greeting"
```

---

## Self-Review

Spec coverage:

- Homepage greeting above statistics: Task 2.
- 130 Chinese candidates: Task 1 implementation.
- Weekday/weekend/time bucket selection: Task 1 tests and implementation.
- Same date + bucket + audience stability: Task 1 storage test and implementation.
- Repeat avoidance: Task 1 repeat test and implementation.
- Client-only local logic: Task 1 and Task 2; no server files.
- No bilingual copy line display: Task 2 and Task 3 smoke expectations.
- No AI/API/backend/database/import-export/settings scope: task file list excludes those areas.
- Tests/build verification: Task 3.

Placeholder scan:

- No placeholder markers or unspecified edge handling remains.
- Code snippets define all referenced types and functions.

Type consistency:

- `GreetingAudience`, `GreetingBucket`, `GreetingContext`, `GreetingSelection`, `StorageLike`, `GREETING_PHRASES`, `getGreetingContext()`, and `getHomeGreeting()` names match across tests, implementation, and homepage integration.
