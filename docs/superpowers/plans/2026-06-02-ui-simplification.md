# UI Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify V1 UI copy/modules, add review completion card-entry actions, add card-detail back navigation, and improve statistics freshness/chart clarity.

**Architecture:** This is a client-only pass. Keep API/data models unchanged; update React pages/components, CSS classes, and tests. Preserve `词义条目` naming and current restore-review semantics (`mastered` → `reviewing`, no due-date override).

**Tech Stack:** React 19, Vite, Vitest + Testing Library, Playwright, Tailwind CSS plus project CSS in `src/client/styles.css`.

---

## File Structure

- Modify `src/client/components/Layout.tsx` — remove nav descriptions from sidebar rendering while keeping names/routes.
- Modify `src/client/App.tsx` — keep nav item names, shorten descriptions to empty strings or remove rendered descriptions by `Layout` only.
- Modify `src/client/pages/HomePage.tsx` — remove greeting/decorative modules, keep actions and four metrics.
- Modify `src/client/pages/CardCreatePage.tsx` — remove decorative header and annotated suggestion helper sentence.
- Modify `src/client/components/CardCatalogue.tsx` — drop unused `subtitle` prop from render contract or keep prop unused; avoid broad restructuring.
- Modify `src/client/pages/CardListPage.tsx` / `FavoritesPage.tsx` only if tests require removing subtitle copy passed to `CardCatalogue`.
- Modify `src/client/pages/CardDetailPage.tsx` — add `返回` button with history/fallback behavior.
- Modify `src/client/pages/ReviewPage.tsx` — shorten rating messages, add `查看词义条目` actions to empty and daily-limit states.
- Modify `src/client/pages/StatisticsPage.tsx` — refresh on window focus when route is statistics; render fixed-width recent bars and grouped Again/Good trend bars.
- Modify `src/client/pages/SettingsPage.tsx` only for decorative copy if present in rendered output; current tests already verify no hero header, so likely no code change.
- Modify `src/client/styles.css` — remove/hide deleted home modules styles as needed, add simplified layout/chart styles.
- Modify tests:
  - `tests/client/homePage.test.tsx`
  - `tests/client/cardCreatePage.test.tsx`
  - `tests/client/phase6Pages.test.tsx`
  - `tests/client/reviewPage.test.tsx`
  - `tests/client/statisticsPage.test.tsx`
  - `tests/client/app.test.tsx`
  - `tests/e2e/v1-smoke.spec.ts`

---

### Task 1: Simplify navigation and home page

**Files:**
- Modify: `src/client/components/Layout.tsx`
- Modify: `src/client/pages/HomePage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/app.test.tsx`
- Test: `tests/client/homePage.test.tsx`

- [ ] **Step 1: Update tests for simplified nav and home**

In `tests/client/app.test.tsx`, update navigation assertions so link accessible names are plain labels:

```tsx
expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('aria-current', 'page');
expect(screen.getByRole('link', { name: '词义条目' })).toBeInTheDocument();
expect(screen.queryByText('今日复习与快速入口')).not.toBeInTheDocument();
expect(screen.queryByText('搜索、筛选、管理')).not.toBeInTheDocument();
```

Replace regex nav lookups like `name: /^复习/` with exact labels:

```tsx
fireEvent.click(screen.getByRole('link', { name: '复习' }));
expect(screen.getByRole('link', { name: '复习' })).toHaveAttribute('aria-current', 'page');
```

In `tests/client/homePage.test.tsx`, replace the first test with simplified expectations:

```tsx
it('shows core actions and four home metrics without decorative greeting copy', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({
      due_count: 3,
      reviewed_today_count: 5,
      again_today_count: 1,
      good_today_count: 4,
      daily_review_limit: 20,
      is_daily_target_reached: false,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );

  render(<HomePage />);

  expect(screen.getByText('加载中…')).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: '开始复习' })).toHaveAttribute('href', '#/review');
  expect(screen.getByRole('link', { name: '快速制卡' })).toHaveAttribute('href', '#/create');
  expect(screen.getByText('今日待复习')).toBeInTheDocument();
  expect(screen.getByText('今日已复习')).toBeInTheDocument();
  expect(screen.getByText('Again')).toBeInTheDocument();
  expect(screen.getByText('Good')).toBeInTheDocument();
  expect(screen.queryByText('LOCAL GREETING')).not.toBeInTheDocument();
  expect(screen.queryByText('欢迎回来')).not.toBeInTheDocument();
  expect(screen.queryByText('早上好，今天刚刚开始。')).not.toBeInTheDocument();
  expect(screen.queryByText('SOFT GOAL')).not.toBeInTheDocument();
  expect(screen.queryByText(/先处理到期/)).not.toBeInTheDocument();
});
```

Delete/update the old `shows daily target reached message` test because the `SOFT GOAL` module is removed. Replace with:

```tsx
it('shows reached state through metrics without soft-goal module', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({
      due_count: 0,
      reviewed_today_count: 20,
      again_today_count: 2,
      good_today_count: 18,
      daily_review_limit: 20,
      is_daily_target_reached: true,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );

  render(<HomePage />);

  expect(await screen.findByText('今日已复习')).toBeInTheDocument();
  expect(screen.getByText('20/20')).toBeInTheDocument();
  expect(screen.queryByText('今日复习目标已完成')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/client/app.test.tsx tests/client/homePage.test.tsx
```

Expected: FAIL because old components still render nav descriptions and home greeting/modules.

- [ ] **Step 3: Remove nav descriptions from layout**

In `src/client/components/Layout.tsx`, remove the `<small>{item.description}</small>` render while leaving `NavItem.description` type intact to minimize churn:

```tsx
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
      </a>
    );
  })}
</nav>
```

- [ ] **Step 4: Simplify home page JSX**

In `src/client/pages/HomePage.tsx`, remove `getHomeGreeting` import and all greeting usage. Replace `HomeHero` with action-only header:

```tsx
function HomeActions() {
  return (
    <section className="home-actions-panel" aria-label="首页操作">
      <a className="home-btn home-btn-primary" href="#/review">开始复习</a>
      <a className="home-btn home-btn-secondary" href="#/create">快速制卡</a>
    </section>
  );
}
```

Replace `HomePage` ready return with:

```tsx
return (
  <div className="home-desk">
    <HomeActions />

    <section className="home-metrics" aria-label="首页统计">
      <StatCard label="今日待复习" value={data.due_count} help="" />
      <StatCard label="今日已复习" value={`${data.reviewed_today_count}/${data.daily_review_limit}`} help="" />
      <StatCard label="Again" value={data.again_today_count} help="" />
      <StatCard label="Good" value={data.good_today_count} help="" />
    </section>
  </div>
);
```

Keep `StatCard` but render `help` only when non-empty:

```tsx
function StatCard({ label, value, help }: StatCardProps) {
  return (
    <div className="home-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {help ? <em>{help}</em> : null}
    </div>
  );
}
```

Remove `progressWidth`, `HomeHero`, and greeting variable.

- [ ] **Step 5: Update CSS for simplified home/nav**

In `src/client/styles.css`:

1. Keep `.app-nav small` rules harmless or delete them. If deleting, remove blocks `.app-nav small` and `.app-nav a.active small`.
2. Add action panel style:

```css
.home-actions-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
```

3. Keep `.home-actions` styles only if still referenced elsewhere; otherwise remove them.
4. Remove unused home decorative blocks when safe: `.home-kicker`, `.home-welcome`, `.home-greeting`, `.home-copy`, `.home-progress-card`, `.home-bottom-grid`, `.home-focus-card`, `.home-state-card`, `.home-mini-queue`, `.home-queue-row`, `.home-track`.
5. Change `.home-metrics` to not require bottom modules:

```css
.home-metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 0;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/client/app.test.tsx tests/client/homePage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/client/components/Layout.tsx src/client/pages/HomePage.tsx src/client/styles.css tests/client/app.test.tsx tests/client/homePage.test.tsx
git commit -m "refactor(ui): simplify home page"
```

---

### Task 2: Simplify create page copy

**Files:**
- Modify: `src/client/pages/CardCreatePage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/cardCreatePage.test.tsx`

- [ ] **Step 1: Update tests for removed decorative copy**

In `tests/client/cardCreatePage.test.tsx`, update render test:

```tsx
it('renders create form controls without decorative helper copy', async () => {
  render(<CardCreatePage />);

  expect(screen.getByRole('heading', { name: '制卡' })).toBeInTheDocument();
  expect(screen.getByLabelText('目标单词')).toHaveAttribute('placeholder', '例如：charge');
  expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
  expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
  expect(screen.getByText('本地视频 mp4')).toBeInTheDocument();
  expect(screen.getByText('推荐')).toBeInTheDocument();
  expect(screen.queryByText('Context capture')).not.toBeInTheDocument();
  expect(screen.queryByText(/把视频里遇到的词/)).not.toBeInTheDocument();
  expect(screen.queryByText('输入目标单词后，我会查找已有词义，帮你避免重复建卡。')).not.toBeInTheDocument();

  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags', expect.any(Object)));
});
```

Because `CardCreatePage` itself does not render the route heading `制卡` when mounted outside `App`, choose one of these two test options:

- If keeping direct page render: assert save button instead of heading.
- If using `App`: set hash and render `App`.

Recommended direct page assertion:

```tsx
expect(screen.getByRole('button', { name: '保存词义条目' })).toBeInTheDocument();
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- tests/client/cardCreatePage.test.tsx
```

Expected: FAIL because old hero copy and suggestion helper still render.

- [ ] **Step 3: Remove create hero copy**

In `src/client/pages/CardCreatePage.tsx`, replace hero body:

```tsx
<div className="card-create-hero">
  <button className="card-create-save" type="submit" disabled={isSaving}>
    {saveLabel}
  </button>
</div>
```

Remove:

```tsx
<p className="card-create-kicker">Context capture</p>
<h2>捕捉一个真实语境</h2>
<p>把视频里遇到的词、当下意思、原句和证据材料钉成一张可复习的词义卡。</p>
```

Remove redundant field helper:

```tsx
<small>只写这个语境下的意思，不写完整词典释义。</small>
<small>复习时会显示完整原句，并高亮目标单词。</small>
```

Keep labels and validation errors.

- [ ] **Step 4: Remove annotated suggestion helper sentence**

In `SuggestionPanel`, replace idle state:

```tsx
if (!targetWord.trim()) {
  return <p className="card-create-side-copy">暂无输入</p>;
}
```

If even `暂无输入` feels decorative, use no paragraph and keep panel title only:

```tsx
if (!targetWord.trim()) {
  return null;
}
```

Use `null` to match spec.

- [ ] **Step 5: Trim CSS for removed create hero elements**

In `src/client/styles.css`, remove or leave unused these selectors:

```css
.card-create-kicker
.card-create-hero h2
.card-create-hero p:not(.card-create-kicker)
```

Update `.card-create-hero` to align button right:

```css
.card-create-hero {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/client/cardCreatePage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/client/pages/CardCreatePage.tsx src/client/styles.css tests/client/cardCreatePage.test.tsx
git commit -m "refactor(ui): simplify create copy"
```

---

### Task 3: Add card detail back button

**Files:**
- Modify: `src/client/pages/CardDetailPage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/phase6Pages.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `tests/client/phase6Pages.test.tsx` inside `describe('Phase 6 pages', ...)`:

```tsx
it('renders detail back button and falls back to card list when no history exists', async () => {
  window.location.hash = '#/cards/card-1';
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
    return Promise.resolve(jsonResponse({ ok: true }));
  });
  const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
  vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);

  render(<CardDetailPage />);

  expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '返回' }));

  expect(backSpy).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('#/cards');
});

it('uses browser history for detail back button when history exists', async () => {
  window.location.hash = '#/cards/card-1';
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
    return Promise.resolve(jsonResponse({ ok: true }));
  });
  const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
  vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);

  render(<CardDetailPage />);

  expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '返回' }));

  expect(backSpy).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/client/phase6Pages.test.tsx
```

Expected: FAIL because `返回` does not exist.

- [ ] **Step 3: Implement back button**

In `src/client/pages/CardDetailPage.tsx`, add helper inside component before `load` or before return:

```tsx
const goBack = () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.hash = '#/cards';
};
```

In detail summary header, render the button before title/actions:

```tsx
<div className="phase6-detail-summary">
  <button className="phase6-back-button" type="button" onClick={goBack}>返回</button>
  <div>
    <h2>{card.target_word}</h2>
    ...
  </div>
  <div className="phase6-detail-actions">
    ...
  </div>
</div>
```

Keep all existing actions unchanged.

- [ ] **Step 4: Add back button style**

In `src/client/styles.css`, include `.phase6-back-button` with existing button styles by adding it to selector list:

```css
.phase6-filter-desk button,
.phase6-card-actions button,
.phase6-detail-actions button,
.phase6-back-button,
.phase6-context-actions button,
...
```

Add fixed alignment:

```css
.phase6-back-button {
  align-self: flex-start;
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/client/phase6Pages.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/pages/CardDetailPage.tsx src/client/styles.css tests/client/phase6Pages.test.tsx
git commit -m "feat(ui): add card detail back button"
```

---

### Task 4: Improve review completion actions and shorten messages

**Files:**
- Modify: `src/client/pages/ReviewPage.tsx`
- Test: `tests/client/reviewPage.test.tsx`

- [ ] **Step 1: Update empty-state tests**

In `tests/client/reviewPage.test.tsx`, replace empty queue link expectations:

```tsx
const cardsLink = screen.getByRole('link', { name: '查看词义条目' });
expect(cardsLink).toBeInTheDocument();
expect(cardsLink).toHaveAttribute('href', '#/cards');
const createLink = screen.getByRole('link', { name: '快速制卡' });
expect(createLink).toBeInTheDocument();
expect(createLink).toHaveAttribute('href', '#/create');
expect(screen.queryByRole('link', { name: '返回首页' })).not.toBeInTheDocument();
```

Update daily limit test to expect `查看词义条目` link:

```tsx
expect(screen.getByText('今日复习目标已完成')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '继续复习' })).toBeInTheDocument();
expect(screen.getByRole('link', { name: '查看词义条目' })).toHaveAttribute('href', '#/cards');
expect(screen.queryByRole('button', { name: '结束复习' })).not.toBeInTheDocument();
```

Update Good message expectation in review submission test:

```tsx
expect(screen.getByText('Good 已选择')).toBeInTheDocument();
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/client/reviewPage.test.tsx
```

Expected: FAIL because old links/messages still render.

- [ ] **Step 3: Change daily limit banner props and markup**

In `ReviewPage.tsx`, change `LimitReminderProps`:

```tsx
interface LimitReminderProps {
  onContinue: () => void;
}
```

Replace `LimitReminder`:

```tsx
function LimitReminder({ onContinue }: LimitReminderProps) {
  return (
    <div className="phase7-review-limit-banner" role="status">
      <p className="phase7-review-limit-msg">今日复习目标已完成</p>
      <div className="phase7-review-limit-actions">
        <Button variant="ghost" onClick={onContinue}>继续复习</Button>
        <a className="phase7-review-link" href="#/cards">查看词义条目</a>
      </div>
    </div>
  );
}
```

Update usage:

```tsx
<LimitReminder onContinue={() => setLimitDismissed(true)} />
```

- [ ] **Step 4: Shorten rating messages**

In `ReviewCard`, replace pending message block with:

```tsx
{pendingRating && !lastRating ? (
  <p className="phase7-review-success">
    {pendingRating === 'good' ? 'Good 已选择' : 'Again 已选择'}
  </p>
) : null}
```

Keep `lastRating` recorded message unchanged or leave as short `Good 已记录` / `Again 已记录`.

- [ ] **Step 5: Change empty state actions**

In empty state return, replace action links:

```tsx
<EmptyState message="今天没有待复习内容" action={
  <>
    <a href="#/cards">查看词义条目</a>
    <a href="#/create">快速制卡</a>
  </>
} />
```

- [ ] **Step 6: Style review link like button**

In `src/client/styles.css`, add:

```css
.phase7-review-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(23, 32, 51, 0.14);
  color: #172033;
  font: 800 0.875rem ui-sans-serif, system-ui, sans-serif;
  padding: 0.55rem 0.85rem;
  text-decoration: none;
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
npm test -- tests/client/reviewPage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/client/pages/ReviewPage.tsx src/client/styles.css tests/client/reviewPage.test.tsx
git commit -m "refactor(review): add card entry actions"
```

---

### Task 5: Improve statistics freshness and chart shapes

**Files:**
- Modify: `src/client/pages/StatisticsPage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/statisticsPage.test.tsx`

- [ ] **Step 1: Add tests for focus refresh and single-point chart shape**

In `tests/client/statisticsPage.test.tsx`, add a single-day fixture:

```tsx
const singleDayStats: StatisticsPageDto = {
  totals: {
    total_cards: 1,
    reviewing_cards: 1,
    mastered_cards: 0,
    favorite_cards: 0,
  },
  daily_review_counts: [{ date: '2026-06-01', count: 7 }],
  daily_accuracy: [{ date: '2026-06-01', reviewed_count: 7, good_count: 5, accuracy: 0.714 }],
  monthly_review_counts: [{ month: '2026-06', count: 7 }],
  tag_distribution: [],
  rating_trend: [{ date: '2026-06-01', again_count: 2, good_count: 5 }],
};
```

Add tests:

```tsx
it('refreshes statistics on window focus while on statistics route', async () => {
  window.location.hash = '#/statistics';
  let callCount = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    callCount++;
    return Promise.resolve(jsonResponse(callCount === 1 ? fullStats : {
      ...fullStats,
      totals: { ...fullStats.totals, total_cards: 249 },
    }));
  });

  render(<StatisticsPage />);

  expect(await screen.findByText('248')).toBeInTheDocument();
  fireEvent.focus(window);
  expect(await screen.findByText('249')).toBeInTheDocument();
  expect(callCount).toBe(2);
});

it('does not refresh statistics on focus outside statistics route', async () => {
  window.location.hash = '#/cards';
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));

  render(<StatisticsPage />);

  await screen.findByText('248');
  fireEvent.focus(window);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

it('renders single-day recent chart as fixed-width bar', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(singleDayStats));

  render(<StatisticsPage />);

  await screen.findByText('1');
  const chartSection = screen.getByTestId('recent-14-chart');
  const bar = chartSection.querySelector('.phase7-statistics-bar');
  expect(bar).toBeInTheDocument();
  expect(bar).toHaveClass('phase7-statistics-bar--fixed');
});

it('renders grouped Again and Good trend bars for single-day data', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(singleDayStats));

  render(<StatisticsPage />);

  await screen.findByText('1');
  expect(screen.getByTestId('rating-trend-group-2026-06-01')).toBeInTheDocument();
  expect(screen.getByTestId('rating-trend-again-2026-06-01')).toBeInTheDocument();
  expect(screen.getByTestId('rating-trend-good-2026-06-01')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/client/statisticsPage.test.tsx
```

Expected: FAIL because focus refresh and new chart classes/test ids are absent.

- [ ] **Step 3: Update BarChart markup**

In `src/client/pages/StatisticsPage.tsx`, modify `BarChart`:

```tsx
function BarChart({ entries, summaryId }: { entries: BarEntry[]; summaryId?: string }) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e.count), 1);
  const summaryText = entries.map((e) => `${e.label}: ${e.count}`).join(', ');
  return (
    <>
      <p id={summaryId} className="phase7-statistics-sr-only">
        {summaryText}
      </p>
      <div className="phase7-statistics-bars" aria-hidden="true">
        {entries.map((e) => (
          <div key={e.label} className="phase7-statistics-bar-col">
            <span className="phase7-statistics-bar-value">{e.count}</span>
            <div
              className="phase7-statistics-bar phase7-statistics-bar--fixed"
              style={{ height: `${Math.max(8, Math.round((e.count / max) * 100))}%` }}
              title={`${e.label}: ${e.count}`}
            />
            <span className="phase7-statistics-bar-label">{e.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Replace RatingTrend with grouped bars**

In `StatisticsPage.tsx`, replace `RatingTrend`:

```tsx
function RatingTrend({ entries }: { entries: StatisticsPageDto['rating_trend'] }) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.flatMap((e) => [e.again_count, e.good_count]), 1);
  const againSummary = entries.map((e) => `${e.date}: ${e.again_count}`).join(', ');
  const goodSummary = entries.map((e) => `${e.date}: ${e.good_count}`).join(', ');
  return (
    <div className="phase7-statistics-rating-groups">
      <p className="phase7-statistics-sr-only" data-testid="again-trend-summary">{againSummary}</p>
      <p className="phase7-statistics-sr-only" data-testid="good-trend-summary">{goodSummary}</p>
      {entries.map((entry) => (
        <div key={entry.date} className="phase7-statistics-rating-group" data-testid={`rating-trend-group-${entry.date}`}>
          <div className="phase7-statistics-rating-bars" aria-hidden="true">
            <i
              className="phase7-statistics-rating-bar phase7-statistics-rating-bar--again"
              data-testid={`rating-trend-again-${entry.date}`}
              style={{ height: `${Math.max(8, Math.round((entry.again_count / max) * 100))}%` }}
              title={`${entry.date} Again: ${entry.again_count}`}
            />
            <i
              className="phase7-statistics-rating-bar phase7-statistics-rating-bar--good"
              data-testid={`rating-trend-good-${entry.date}`}
              style={{ height: `${Math.max(8, Math.round((entry.good_count / max) * 100))}%` }}
              title={`${entry.date} Good: ${entry.good_count}`}
            />
          </div>
          <span className="phase7-statistics-bar-label">{shortDate(entry.date)}</span>
        </div>
      ))}
    </div>
  );
}
```

Keep existing summary `data-testid`s to avoid breaking tests.

- [ ] **Step 5: Add focus refresh**

In `StatisticsPage`, add focus listener:

```tsx
useEffect(() => {
  const onFocus = () => {
    if (window.location.hash.split('?')[0] === '#/statistics') {
      load();
    }
  };
  window.addEventListener('focus', onFocus);
  return () => window.removeEventListener('focus', onFocus);
}, [load]);
```

`load` already sets loading and refetches. This preserves no-cache behavior.

- [ ] **Step 6: Update chart CSS**

In `src/client/styles.css`, update bars:

```css
.phase7-statistics-bars {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 0.75rem;
  height: 160px;
  padding: 1.25rem 0 1.5rem;
}

.phase7-statistics-bar-col {
  width: 2.25rem;
  flex: 0 0 2.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  position: relative;
}

.phase7-statistics-bar-value {
  color: #475569;
  font: 800 0.68rem ui-sans-serif, system-ui, sans-serif;
  margin-bottom: 0.25rem;
}

.phase7-statistics-bar--fixed {
  width: 1.25rem;
  min-height: 8px;
  border-radius: 0.45rem 0.45rem 0.2rem 0.2rem;
}
```

Add grouped trend CSS:

```css
.phase7-statistics-rating-groups {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  min-height: 120px;
  padding: 0.5rem 0 1.5rem;
}

.phase7-statistics-rating-group {
  width: 2.5rem;
  flex: 0 0 2.5rem;
  display: grid;
  justify-items: center;
  align-items: end;
  gap: 0.35rem;
  position: relative;
}

.phase7-statistics-rating-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  height: 88px;
}

.phase7-statistics-rating-bar {
  display: block;
  width: 0.75rem;
  min-height: 8px;
  border-radius: 0.35rem 0.35rem 0.15rem 0.15rem;
}

.phase7-statistics-rating-bar--again {
  background: #be123c;
}

.phase7-statistics-rating-bar--good {
  background: #0f766e;
}
```

Leave old `.phase7-statistics-trend-*` styles if no longer referenced, or delete them after confirming no references.

- [ ] **Step 7: Run tests**

Run:

```bash
npm test -- tests/client/statisticsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/client/pages/StatisticsPage.tsx src/client/styles.css tests/client/statisticsPage.test.tsx
git commit -m "refactor(stats): improve chart clarity"
```

---

### Task 6: Remove residual decorative copy in catalogue/settings/favorites if rendered

**Files:**
- Modify: `src/client/components/CardCatalogue.tsx`
- Modify: `src/client/pages/CardListPage.tsx`
- Modify: `src/client/pages/FavoritesPage.tsx`
- Modify: `src/client/pages/SettingsPage.tsx` if rendered decorative copy exists
- Test: `tests/client/phase6Pages.test.tsx`
- Test: `tests/client/settingsPage.test.tsx`

- [ ] **Step 1: Add tests for catalogue subtitle removal**

In `tests/client/phase6Pages.test.tsx`, in `renders catalogue cards...`, add:

```tsx
expect(screen.queryByText('管理所有词义')).not.toBeInTheDocument();
expect(screen.queryByText('搜索、筛选和管理所有词义卡。')).not.toBeInTheDocument();
```

In CardListPage test, add after load:

```tsx
expect(screen.queryByText('搜索、筛选和管理所有词义卡。')).not.toBeInTheDocument();
```

In FavoritesPage test, add:

```tsx
expect(screen.queryByText(/收藏/)).toBeInTheDocument();
expect(screen.queryByText('查看收藏词义')).not.toBeInTheDocument();
```

Do not remove functional labels like `收藏筛选` or status `★ 收藏`.

- [ ] **Step 2: Run tests**

Run:

```bash
npm test -- tests/client/phase6Pages.test.tsx tests/client/settingsPage.test.tsx
```

Expected: May PASS already for settings; catalogue may fail if subtitles render in future changes. Current `CardCatalogue` receives subtitle but does not render it, so tests likely PASS.

- [ ] **Step 3: Remove unused subtitle prop if safe**

If TypeScript allows changing callers, remove `subtitle` from `CardCatalogueProps`:

```tsx
interface CardCatalogueProps {
  title: string;
  cards: CardSummaryDto[];
  total: number;
  loading: boolean;
  error: string | null;
  tags: TagDto[];
  filters: CardCatalogueFilters;
  emptyMessage: string;
  filteredEmptyMessage: string;
  hasUserFilters?: boolean;
  onFiltersChange: (filters: CardCatalogueFilters) => void;
  onRetry: () => void;
  onToggleStatus: (card: CardSummaryDto) => void;
  onToggleFavorite: (card: CardSummaryDto) => void;
}
```

Then remove `subtitle="..."` from:

```tsx
<CardCatalogue title="词义条目" ... />
<CardCatalogue title="收藏" ... />
```

If this causes too much churn, keep prop unused. Either is acceptable because rendered UI is already clean.

- [ ] **Step 4: Run typecheck/test**

Run:

```bash
npm test -- tests/client/phase6Pages.test.tsx tests/client/settingsPage.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit only if files changed**

If no files changed, skip commit and record no-op in task handoff.

If files changed:

```bash
git add src/client/components/CardCatalogue.tsx src/client/pages/CardListPage.tsx src/client/pages/FavoritesPage.tsx tests/client/phase6Pages.test.tsx tests/client/settingsPage.test.tsx
git commit -m "refactor(ui): remove catalogue subtitles"
```

---

### Task 7: Update E2E smoke and run full verification

**Files:**
- Modify: `tests/e2e/v1-smoke.spec.ts`
- Maybe modify: any tests touched by changed visible text

- [ ] **Step 1: Update E2E text expectations**

In `tests/e2e/v1-smoke.spec.ts`, replace removed create heading expectation:

```tsx
await expect(page.getByRole('button', { name: '保存词义条目' })).toBeVisible();
```

Add simplified home smoke after settings or before create:

```tsx
await page.goto('/#/');
await expect(page.getByRole('link', { name: '开始复习' })).toBeVisible();
await expect(page.getByRole('link', { name: '快速制卡' })).toBeVisible();
await expect(page.getByText('今日待复习')).toBeVisible();
await expect(page.getByText('今日已复习')).toBeVisible();
await expect(page.getByText('Again')).toBeVisible();
await expect(page.getByText('Good')).toBeVisible();
await expect(page.getByText('LOCAL GREETING')).toHaveCount(0);
await expect(page.getByText('SOFT GOAL')).toHaveCount(0);
```

If Playwright strictness sees multiple `Again`/`Good`, scope to home metrics:

```tsx
await expect(page.locator('.home-metrics').getByText('Again')).toBeVisible();
await expect(page.locator('.home-metrics').getByText('Good')).toBeVisible();
```

Update review empty expectation if exact actions are checked:

```tsx
await expect(page.getByText('今天没有待复习内容')).toBeVisible();
await expect(page.getByRole('link', { name: '查看词义条目' })).toBeVisible();
```

- [ ] **Step 2: Run full unit tests**

Run:

```bash
npm test
```

Expected: 23+ test files pass. Count may change after added tests.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: typecheck and builds pass.

- [ ] **Step 4: Run E2E**

Run:

```bash
npm run test:e2e
```

Expected: Playwright smoke passes.

- [ ] **Step 5: Browser sweep**

Run app:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/#/
http://localhost:5173/#/create
http://localhost:5173/#/cards
http://localhost:5173/#/review
http://localhost:5173/#/statistics
http://localhost:5173/#/settings
```

Expected:

- Home shows only actions + four metrics.
- Create page has no `Context capture` or annotated helper sentence.
- Detail page has `返回`.
- Review empty/limit states have `查看词义条目`.
- Statistics charts use normal bars with small datasets.
- Console has no relevant runtime errors. Ignore favicon 404 if still present.

Stop dev server after sweep.

- [ ] **Step 6: Final commit**

If E2E/test files changed after prior task commits:

```bash
git add tests/e2e/v1-smoke.spec.ts
git commit -m "test(e2e): update V1 smoke for simplified UI"
```

If no changes remain, skip commit.

---

### Task 8: Final review and delivery

**Files:**
- No planned source changes unless reviewer finds issues.

- [ ] **Step 1: Check git status and log**

Run:

```bash
git status --short --branch
git log --oneline --decorate -5
```

Expected: clean working tree on `main` or feature branch chosen by executor.

- [ ] **Step 2: Run final review subagents**

Use code review and security review agents on current diff/branch.

Expected:

```text
REVIEW_OK
SECURITY_OK
```

If findings appear, fix, rerun targeted tests, rerun final verification.

- [ ] **Step 3: Report final state**

Report:

- Commits made.
- Tests/build/E2E status.
- Browser sweep status.
- Any known non-blockers.
- Whether remote push was done. Do not push without explicit user approval.

---

## Self-Review

### Spec coverage

- Global decorative copy removal: Tasks 1, 2, 6.
- Keep `词义条目` name: Task 1 and tests keep exact nav label.
- Home simplification: Task 1.
- Create annotated sentence removal: Task 2.
- Card detail back button: Task 3.
- Review empty/limit card-entry actions: Task 4.
- No due-date override: no server/API changes in plan; card list restore semantics unchanged.
- Statistics freshness: Task 5 focus/entry refresh.
- Statistics chart shape fixes: Task 5 fixed bars/grouped trend.
- E2E/build/unit verification: Task 7.

### Placeholder scan

All implementation steps include concrete file paths, commands, and expected outcomes.

### Type consistency

- `CardCatalogueFilters`, `StatisticsPageDto`, `ReviewDueResponseDto`, and existing DTO names match current code.
- New CSS classes are unique and referenced by planned JSX/tests.
- New review link label is consistently `查看词义条目`.
