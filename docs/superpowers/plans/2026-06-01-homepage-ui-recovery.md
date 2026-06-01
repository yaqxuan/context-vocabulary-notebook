# Homepage UI Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Phase 8A homepage visually match the approved Phase 6/7 shell while preserving existing greeting logic, API behavior, and review data.

**Architecture:** Upgrade the shared app shell classes in `Layout.tsx` and `styles.css` so every page uses the same dark angled background, grain overlay, dark sidebar, and warm main canvas. Then replace the homepage content layout with the approved welcome/greeting hierarchy and metric cards. Keep data fetching inside `HomePage.tsx`; do not move greeting/statistics logic into `Layout`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest, Testing Library, CSS modules via global `src/client/styles.css` classes.

---

## File Structure

- Modify: `src/client/components/Layout.tsx`
  - Replace the light Tailwind shell with semantic CSS classes that implement the Phase 6/7 dark app shell.
  - Keep `navItems`, `currentPath`, `title`, `subtitle`, and `children` API unchanged.
  - Add a non-data local-first sidebar identity card so the sidebar feels substantial without duplicating homepage statistics fetches.

- Modify: `src/client/styles.css`
  - Update global body background to the Phase 6/7 dark angled background.
  - Add shared layout classes: `.app-shell`, `.app-grain`, `.app-frame`, `.app-sidebar`, `.app-brand`, `.app-nav`, `.app-main`, `.app-route-title`, `.app-content-shell`.
  - Add homepage classes: `.home-desk`, `.home-hero`, `.home-welcome`, `.home-greeting`, `.home-metrics`, `.home-metric`, `.home-focus-card`, `.home-state-card`.

- Modify: `src/client/pages/HomePage.tsx`
  - Keep `getHomeStatistics()` and `getHomeGreeting()` unchanged.
  - Render `欢迎回来` as the hero headline.
  - Render the selected greeting below it as smaller, airier text.
  - Keep existing action links, stats, loading, and error behavior.

- Modify: `tests/client/app.test.tsx`
  - Add assertions for the upgraded shell text that is not purely decorative: `Context Review Desk`, `本地优先`, and route subtitle behavior.
  - Keep navigation/route tests intact.

- Modify: `tests/client/homePage.test.tsx`
  - Update tests for the new welcome/greeting hierarchy and progress text.
  - Keep error-state assertions that no greeting/fake counts render.

---

### Task 1: Lock shared shell behavior

**Files:**
- Modify: `tests/client/app.test.tsx`

- [ ] **Step 1: Add shell assertions to existing sidebar test**

Replace the test named `renders the sidebar shell with navigation` in `tests/client/app.test.tsx` with:

```tsx
  it('renders the Phase 6/7 sidebar shell with navigation', () => {
    render(<App />);

    expect(screen.getByText('语境单词本')).toBeInTheDocument();
    expect(screen.getByText('Context Review Desk')).toBeInTheDocument();
    expect(screen.getByText('本地优先')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('首页');
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('制卡');
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('设置');
  });
```

- [ ] **Step 2: Run the targeted app test and verify it fails**

Run:

```bash
npm test -- tests/client/app.test.tsx
```

Expected: FAIL because `Context Review Desk` and `本地优先` are not rendered by current `Layout`.

- [ ] **Step 3: Replace `Layout.tsx` markup**

Replace `src/client/components/Layout.tsx` with:

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
    <div className="app-shell">
      <div className="app-grain" aria-hidden="true" />
      <div className="app-frame">
        <aside className="app-sidebar">
          <div className="app-brand">
            <div className="app-brand-mark" aria-hidden="true" />
            <div>
              <p>语境单词本</p>
              <span>Context Review Desk</span>
            </div>
          </div>

          <nav className="app-nav" aria-label="主导航">
            {navItems.map((item) => {
              const active = item.match(currentPath);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'active' : undefined}
                >
                  {item.label}
                  <small>{item.description}</small>
                </a>
              );
            })}
          </nav>

          <div className="app-side-card" aria-label="应用定位">
            <span>local-first</span>
            <strong>本地优先</strong>
            <p>手动制卡、真实语境、FSRS 复习。数据保存在本地，长期使用不依赖云端服务。</p>
          </div>
        </aside>

        <main className="app-main">
          <div className="app-route-title">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <span>local-first</span>
          </div>

          <section className="app-content-shell">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add shared shell CSS**

In `src/client/styles.css`, replace the current `body` block at the top with:

```css
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 0%, rgba(45, 212, 191, 0.20), transparent 26rem),
    radial-gradient(circle at 92% 12%, rgba(217, 119, 6, 0.23), transparent 25rem),
    linear-gradient(135deg, #101827 0%, #172033 21%, #f3ead8 21.2%, #edf3ee 100%);
  color: #172033;
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, ui-serif, serif;
}
```

Then add this block after the `body` block:

```css
.app-shell {
  min-height: 100vh;
  color: #172033;
}

.app-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
  mix-blend-mode: overlay;
}

.app-frame {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 19rem minmax(0, 1fr);
  gap: 1.75rem;
  width: min(90rem, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: 1.75rem;
}

.app-sidebar {
  position: sticky;
  top: 1.75rem;
  height: calc(100vh - 3.5rem);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 2.125rem;
  background:
    linear-gradient(180deg, rgba(23, 32, 51, 0.97), rgba(15, 23, 42, 0.98)),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 20px);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  color: #fff7e8;
  padding: 1.625rem;
}

.app-brand {
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.75rem;
  padding-bottom: 1.375rem;
  border-bottom: 1px solid rgba(255, 247, 232, 0.12);
}

.app-brand-mark {
  width: 4rem;
  height: 5.375rem;
  border-radius: 0.6rem 0.6rem 1rem 1rem;
  background: linear-gradient(160deg, #2dd4bf, #0f766e 52%, #052e2b);
  box-shadow: inset -8px 0 18px rgba(0, 0, 0, 0.2), 0 10px 30px rgba(45, 212, 191, 0.25);
  transform: rotate(-5deg);
}

.app-brand p {
  margin: 0;
  color: #fff7e8;
  font: 900 1.75rem/.95 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.07em;
}

.app-brand span {
  display: block;
  margin-top: 0.35rem;
  color: rgba(255, 247, 232, 0.62);
  font: 750 0.75rem ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.app-nav {
  display: grid;
  gap: 0.75rem;
}

.app-nav a {
  display: block;
  border-radius: 1.25rem;
  color: rgba(255, 247, 232, 0.72);
  font: 820 0.95rem ui-sans-serif, system-ui, sans-serif;
  padding: 0.95rem 1rem;
  text-decoration: none;
}

.app-nav a:hover {
  background: rgba(255, 255, 255, 0.06);
}

.app-nav a.active {
  color: #062d2a;
  background: linear-gradient(135deg, #2dd4bf, #ccfbf1);
  box-shadow: 0 14px 35px rgba(45, 212, 191, 0.24);
}

.app-nav small {
  display: block;
  margin-top: 0.2rem;
  color: rgba(255, 247, 232, 0.42);
  font-weight: 650;
}

.app-nav a.active small {
  color: rgba(6, 45, 42, 0.68);
}

.app-side-card {
  margin-top: auto;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1.75rem;
  background:
    radial-gradient(circle at 70% 0%, rgba(45, 212, 191, 0.18), transparent 9rem),
    rgba(255, 255, 255, 0.07);
  font-family: ui-sans-serif, system-ui, sans-serif;
  padding: 1.125rem;
}

.app-side-card span {
  color: rgba(255, 247, 232, 0.52);
  font: 850 0.7rem ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.app-side-card strong {
  display: block;
  margin-top: 0.65rem;
  color: #fff7e8;
  font: 950 2.4rem/.9 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.08em;
}

.app-side-card p {
  margin: 0.65rem 0 0;
  color: rgba(255, 247, 232, 0.68);
  font: 650 0.82rem/1.55 ui-sans-serif, system-ui, sans-serif;
}

.app-main {
  display: grid;
  align-content: start;
  gap: 1.375rem;
  padding-bottom: 3.75rem;
}

.app-route-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  color: #fff7e8;
}

.app-route-title h1 {
  margin: 0;
  font-size: 1.625rem;
  letter-spacing: -0.05em;
}

.app-route-title p {
  margin: 0.375rem 0 0;
  color: rgba(255, 247, 232, 0.66);
  font: 650 0.875rem ui-sans-serif, system-ui, sans-serif;
}

.app-route-title > span {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 247, 232, 0.78);
  font: 800 0.75rem ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.12em;
  padding: 0.55rem 0.75rem;
  text-transform: uppercase;
}

.app-content-shell {
  min-width: 0;
}

@media (max-width: 920px) {
  .app-frame {
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    position: static;
    height: auto;
  }
}
```

- [ ] **Step 5: Run the targeted app test and verify it passes**

Run:

```bash
npm test -- tests/client/app.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add src/client/components/Layout.tsx src/client/styles.css tests/client/app.test.tsx
git commit -m "style(client): align app shell with Phase 6"
```

---

### Task 2: Lock homepage hierarchy behavior

**Files:**
- Modify: `tests/client/homePage.test.tsx`

- [ ] **Step 1: Replace homepage tests with hierarchy-aware assertions**

Replace `tests/client/homePage.test.tsx` with:

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '../../src/client/pages/HomePage';

vi.mock('../../src/client/lib/homeGreetings', () => ({
  getHomeGreeting: vi.fn().mockReturnValue({
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

  it('shows loading then welcome, greeting, actions, and home statistics', async () => {
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
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument();
    expect(screen.getByText('早上好，今天刚刚开始。')).toBeInTheDocument();
    expect(screen.getByText('5/20')).toBeInTheDocument();
    expect(screen.getByText('今日待复习')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
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

  it('shows API errors without greeting or fake counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'database unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('database unavailable');
    await waitFor(() => expect(screen.queryByText('今日待复习')).not.toBeInTheDocument());
    expect(screen.queryByText('欢迎回来')).not.toBeInTheDocument();
    expect(screen.queryByText('早上好，今天刚刚开始。')).not.toBeInTheDocument();
    expect(screen.queryByText('5/20')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the homepage test and verify it fails**

Run:

```bash
npm test -- tests/client/homePage.test.tsx
```

Expected: FAIL because current homepage does not render `欢迎回来` or `5/20` without spaces.

---

### Task 3: Implement homepage recovery UI

**Files:**
- Modify: `src/client/pages/HomePage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/homePage.test.tsx`

- [ ] **Step 1: Replace `HomePage.tsx` with recovered structure**

Replace `src/client/pages/HomePage.tsx` with:

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
    <div className="home-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{help}</em>
    </div>
  );
}

function progressWidth(reviewed: number, limit: number): string {
  if (limit <= 0) return '0%';
  return `${Math.min(100, Math.round((reviewed / limit) * 100))}%`;
}

function HomeHero({ data, greeting }: { data: HomeStatisticsDto; greeting: string }) {
  const progressText = `${data.reviewed_today_count}/${data.daily_review_limit}`;
  return (
    <section className="home-hero" aria-label="今日问候和复习入口">
      <div>
        <p className="home-kicker">LOCAL GREETING</p>
        <h2 className="home-welcome">欢迎回来</h2>
        <p className="home-greeting">{greeting}</p>
        <p className="home-copy">
          问候语来自本地时间段，不显示调度细节。首页先给一个安静入口，再把今天真正要做的复习量摆清楚。
        </p>
        <div className="home-actions">
          <a className="home-btn home-btn-primary" href="#/review">开始复习</a>
          <a className="home-btn home-btn-secondary" href="#/create">快速制卡</a>
        </div>
      </div>

      <div className="home-progress-card" aria-label={`今日复习进度 ${progressText}`}>
        <span>today progress</span>
        <strong>{progressText}</strong>
        <div className="home-progress-track" aria-hidden="true">
          <i style={{ width: progressWidth(data.reviewed_today_count, data.daily_review_limit) }} />
        </div>
      </div>
    </section>
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
    <div className="home-desk">
      <HomeHero data={data} greeting={greeting.text} />

      <section className="home-metrics" aria-label="首页统计">
        <StatCard label="今日待复习" value={data.due_count} help="按 FSRS 到期排序" />
        <StatCard label="今日已复习" value={`${data.reviewed_today_count}/${data.daily_review_limit}`} help="每日目标是提醒，不是硬限制" />
        <StatCard label="Again" value={data.again_today_count} help="今天不熟或答错" />
        <StatCard label="Good" value={data.good_today_count} help="今天顺利想起" />
      </section>

      <div className="home-bottom-grid">
        <section className="home-focus-card" aria-label="复习节奏摘要">
          <h2>先处理到期，再继续积累。</h2>
          <p>首页不扩展新功能，只把现有数据组织成更清晰的复习桌面：待复习、今日进度、Again / Good 和两个主入口。</p>
          <div className="home-mini-queue" aria-hidden="true">
            <div className="home-queue-row"><span>待复习</span><span className="home-track"><i style={{ width: progressWidth(data.due_count, Math.max(data.due_count + data.reviewed_today_count, 1)) }} /></span><strong>{data.due_count}</strong></div>
            <div className="home-queue-row"><span>Good</span><span className="home-track"><i style={{ width: progressWidth(data.good_today_count, Math.max(data.reviewed_today_count, 1)) }} /></span><strong>{data.good_today_count}</strong></div>
            <div className="home-queue-row"><span>Again</span><span className="home-track"><i style={{ width: progressWidth(data.again_today_count, Math.max(data.reviewed_today_count, 1)) }} /></span><strong>{data.again_today_count}</strong></div>
          </div>
        </section>

        <section className="home-state-card" aria-label="今日目标提醒">
          <span>soft goal</span>
          <h2>{data.is_daily_target_reached ? '今日复习目标已完成' : '今天可以继续积累和复习'}</h2>
          <p>复习页会按到期时间展示词义条目，目标单词不会被隐藏。每日目标是提醒，不是硬限制。</p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add homepage CSS**

Append this block to `src/client/styles.css` after the shared shell CSS block and before existing Phase 6 styles:

```css
.home-desk {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(23, 32, 51, 0.18);
  border-radius: 2.625rem;
  background:
    linear-gradient(135deg, rgba(255, 247, 232, 0.96), rgba(239, 246, 240, 0.94)),
    repeating-linear-gradient(90deg, rgba(23, 32, 51, 0.035) 0 1px, transparent 1px 19px);
  box-shadow: 0 32px 90px rgba(15, 23, 42, 0.22);
  padding: clamp(1.25rem, 3vw, 2.125rem);
}

.home-desk::before {
  content: "";
  position: absolute;
  right: -2.75rem;
  top: -4.125rem;
  width: 20rem;
  height: 20rem;
  border-radius: 999px;
  background: rgba(217, 119, 6, 0.12);
  filter: blur(12px);
}

.home-desk::after {
  content: "";
  position: absolute;
  right: 3.875rem;
  top: 2.5rem;
  width: 14.375rem;
  height: 9.375rem;
  border: 1px solid rgba(23, 32, 51, 0.10);
  border-radius: 999px;
  transform: rotate(-12deg);
  background: rgba(45, 212, 191, 0.10);
}

.home-hero {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 13rem;
  gap: 1.75rem;
  align-items: end;
  margin-bottom: 1.375rem;
}

.home-kicker {
  margin: 0 0 0.625rem;
  color: #0f766e;
  font: 850 0.75rem ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.home-welcome {
  margin: 0;
  max-width: 48rem;
  color: #172033;
  font-size: clamp(3.2rem, 7vw, 5.375rem);
  line-height: 0.9;
  letter-spacing: -0.08em;
}

.home-greeting {
  max-width: 47.5rem;
  margin: 1.125rem 0 0;
  color: rgba(23, 32, 51, 0.72);
  font-family: "Songti SC", "Noto Serif SC", "STSong", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, ui-serif, serif;
  font-size: clamp(1.35rem, 2.5vw, 2rem);
  font-weight: 300;
  line-height: 1.55;
  letter-spacing: 0.10em;
}

.home-copy {
  max-width: 43.75rem;
  margin: 1.125rem 0 0;
  color: #475569;
  font: 560 1rem/1.7 ui-sans-serif, system-ui, sans-serif;
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-top: 1.375rem;
}

.home-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.875rem;
  border-radius: 999px;
  font: 900 0.875rem ui-sans-serif, system-ui, sans-serif;
  padding: 0 1.125rem;
  text-decoration: none;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
}

.home-btn-primary {
  background: #172033;
  color: #fff7e8;
}

.home-btn-secondary {
  border: 1px solid rgba(23, 32, 51, 0.16);
  background: rgba(255, 255, 255, 0.68);
  color: #172033;
}

.home-progress-card {
  border: 1px solid rgba(23, 32, 51, 0.13);
  border-radius: 1.75rem;
  background: rgba(255, 255, 255, 0.64);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.8);
  font-family: ui-sans-serif, system-ui, sans-serif;
  padding: 1.125rem;
}

.home-progress-card span,
.home-metric span {
  color: #64748b;
  font: 850 0.75rem ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-progress-card strong {
  display: block;
  margin-top: 0.625rem;
  color: #172033;
  font: 950 2.875rem/.9 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.08em;
}

.home-progress-track,
.home-track {
  overflow: hidden;
  border-radius: 999px;
  background: rgba(23, 32, 51, 0.08);
}

.home-progress-track {
  height: 0.625rem;
  margin-top: 1.125rem;
}

.home-progress-track i,
.home-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0f766e, #2dd4bf);
}

.home-metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.125rem;
}

.home-metric,
.home-focus-card,
.home-state-card {
  border: 1px solid rgba(23, 32, 51, 0.14);
  border-radius: 1.75rem;
  background: rgba(255, 253, 246, 0.96);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
}

.home-metric {
  font-family: ui-sans-serif, system-ui, sans-serif;
  padding: 1.25rem;
}

.home-metric strong {
  display: block;
  margin-top: 0.625rem;
  color: #172033;
  font: 950 3rem/.9 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.08em;
}

.home-metric em {
  display: block;
  margin-top: 0.625rem;
  color: #64748b;
  font: 650 0.82rem/1.45 ui-sans-serif, system-ui, sans-serif;
  font-style: normal;
}

.home-bottom-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.18fr 0.82fr;
  gap: 1.125rem;
}

.home-focus-card,
.home-state-card {
  padding: 1.5rem;
}

.home-focus-card h2,
.home-state-card h2 {
  margin: 0;
  color: #172033;
  font: 950 2rem/1 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.06em;
}

.home-focus-card p,
.home-state-card p {
  margin: 0.75rem 0 0;
  color: #475569;
  font: 650 0.875rem/1.65 ui-sans-serif, system-ui, sans-serif;
}

.home-mini-queue {
  display: grid;
  gap: 0.625rem;
  margin-top: 1.125rem;
}

.home-queue-row {
  display: grid;
  grid-template-columns: 5.75rem 1fr 2.75rem;
  gap: 0.625rem;
  align-items: center;
  color: #64748b;
  font: 800 0.82rem ui-sans-serif, system-ui, sans-serif;
}

.home-track {
  height: 0.75rem;
}

.home-state-card {
  background: linear-gradient(135deg, rgba(204, 251, 241, 0.62), rgba(255, 247, 232, 0.86));
}

.home-state-card > span {
  display: inline-flex;
  border-radius: 999px;
  background: #ccfbf1;
  color: #0f766e;
  font: 850 0.75rem ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.12em;
  margin-bottom: 0.875rem;
  padding: 0.5rem 0.7rem;
  text-transform: uppercase;
}

@media (max-width: 1100px) {
  .home-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 760px) {
  .home-hero,
  .home-bottom-grid {
    grid-template-columns: 1fr;
  }

  .home-metrics {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run homepage test and verify it passes**

Run:

```bash
npm test -- tests/client/homePage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run app shell and homepage tests together**

Run:

```bash
npm test -- tests/client/app.test.tsx tests/client/homePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add src/client/pages/HomePage.tsx src/client/styles.css tests/client/homePage.test.tsx
git commit -m "style(homepage): recover Phase 8A visual shell"
```

---

### Task 4: Full verification

**Files:**
- Verify all changed files

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Check diff and tracked files**

Run:

```bash
git status --short
git diff --check
find docs/superpowers/mockups -maxdepth 1 -name 'phase8a*.html' -print
```

Expected:

- `git diff --check` prints no output.
- `find ... phase8a*.html` prints no output.
- Only intended files are modified or committed.

- [ ] **Step 4: Manual visual review gate**

Open:

```text
docs/superpowers/mockups/homepage-ui-recovery-mockup.html
```

Then run the app and compare the real homepage:

```bash
npm run dev
```

URL:

```text
http://localhost:5173/#/
```

Expected visual match:

- dark angled Phase 6/7 background,
- grain overlay,
- dark substantial sidebar,
- warm homepage studio panel,
- large `欢迎回来`,
- smaller airy greeting below,
- homepage statistics and actions unchanged in meaning.

---

## Self-Review

Spec coverage:

- Exact Phase 6/7 shell style: Task 1 shared Layout and CSS.
- Welcome/greeting hierarchy: Task 2 tests and Task 3 implementation.
- More substantial sidebar: Task 1 Layout/CSS.
- No greeting logic/API/backend changes: file scope excludes `homeGreetings`, backend, routes, and database.
- No `phase8a*.html` recreation: Task 4 verification.
- Loading/error behavior unchanged: Task 2 tests.

Placeholder scan:

- No TBD/TODO placeholders.
- All commands include expected outcomes.
- Code snippets define all referenced helpers and classes.

Type consistency:

- `progressWidth(reviewed: number, limit: number): string` returns CSS width strings and is used only in inline styles.
- `HomeHero` receives `HomeStatisticsDto` and `greeting: string`.
- `Layout` props stay unchanged, so `App.tsx` needs no API change.
