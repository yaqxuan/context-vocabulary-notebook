# Non-Home Header Cleanup and Review Again Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove non-home page function header/hero blocks and update the review Again confirmation flow so confirmed Again submits and advances directly.

**Architecture:** Keep the global `Layout` as the only source of the shared shell/background/large triangle. Remove page-level hero/header blocks everywhere except `HomePage`, preserving core content and accessibility. Keep review state machine local to `ReviewPage` and update tests with red-green coverage for the changed Again flow.

**Tech Stack:** React + TypeScript + Vite, Vitest + Testing Library, CSS in `src/client/styles.css`.

---

## File Structure

- Modify `src/client/pages/StatisticsPage.tsx`: remove `phase7-statistics-hero` block so statistics starts at metrics/charts.
- Modify `src/client/pages/SettingsPage.tsx`: remove `phase7-settings-hero` block so settings starts at form sections.
- Modify `src/client/pages/TagsPage.tsx`: remove `phase6-hero` block so tags starts at editor/grid.
- Modify `src/client/pages/CardDetailPage.tsx`: remove `phase6-hero` wrapper but keep card title/meaning and action buttons in a compact detail summary block.
- Modify `src/client/components/CardCatalogue.tsx`: remove/disable catalogue top title/subtitle rendering for card list and favorites while retaining screen-reader labels if needed.
- Modify `src/client/pages/ReviewPage.tsx`: remove review card kicker; change Again confirmation label to `确认`; make confirmed Again submit then load next card directly.
- Modify `src/client/styles.css`: remove unused non-home hero styles or leave harmless only if shared with surviving elements; add compact detail summary styles if needed.
- Modify tests:
  - `tests/client/reviewPage.test.tsx`
  - `tests/client/statisticsPage.test.tsx`
  - `tests/client/settingsPage.test.tsx`
  - `tests/client/app.test.tsx`
  - existing catalogue/page tests if assertions expect deleted subtitles.

---

### Task 1: Add failing tests for non-home header removal

**Files:**
- Modify: `tests/client/statisticsPage.test.tsx`
- Modify: `tests/client/settingsPage.test.tsx`
- Modify: `tests/client/app.test.tsx`

- [ ] **Step 1: Add statistics header removal test**

Add inside `describe('StatisticsPage')`, in ready-state area:

```ts
it('does not render the top statistics hero header', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));

  render(<StatisticsPage />);

  await screen.findByText('248');
  expect(screen.queryByText('REVIEW ANALYTICS')).not.toBeInTheDocument();
  expect(screen.queryByText('看到复习节奏，而不是表格噪音。')).not.toBeInTheDocument();
  expect(screen.queryByText(/统计页聚焦词义总量/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add settings header removal test**

Add inside `describe('SettingsPage')`, in loading/ready area:

```ts
it('does not render the top settings hero header', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(settings));

  render(<SettingsPage />);

  await screen.findByLabelText('界面语言');
  expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument();
  expect(screen.queryByText('设置与数据管理')).not.toBeInTheDocument();
  expect(screen.queryByText(/调整界面语言/)).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Update app route expectations for removed visible route headings**

In `tests/client/app.test.tsx`, change route smoke tests so non-home routes assert stable content instead of page header headings. Example expectations:

```ts
it.each([
  ['#/', '欢迎回来'],
  ['#/create', '捕捉一个真实语境'],
  ['#/cards', '还没有词义条目'],
  ['#/review', '今天没有待复习内容'],
  ['#/tags', '标签名称'],
  ['#/favorites', '还没有收藏词义'],
  ['#/statistics', '还没有统计数据'],
  ['#/settings', '学习与界面设置'],
])('renders route %s', async (hash, text) => {
  window.location.hash = hash;
  render(<App />);

  expect(await screen.findByText(text)).toBeInTheDocument();
});
```

For `#/cards/card-1`, keep existing detail-specific test using mocked card heading `charge`, because card target word remains legitimate content, not page-function header.

- [ ] **Step 4: Run header tests and verify failure**

Run:

```bash
npm test -- tests/client/statisticsPage.test.tsx tests/client/settingsPage.test.tsx tests/client/app.test.tsx
```

Expected: FAIL because deleted header text is still rendered and/or route heading expectations still assume old headers.

---

### Task 2: Remove non-home visible top headers

**Files:**
- Modify: `src/client/pages/StatisticsPage.tsx`
- Modify: `src/client/pages/SettingsPage.tsx`
- Modify: `src/client/pages/TagsPage.tsx`
- Modify: `src/client/pages/CardDetailPage.tsx`
- Modify: `src/client/components/CardCatalogue.tsx`
- Modify: `src/client/pages/ReviewPage.tsx`

- [ ] **Step 1: Remove statistics hero JSX**

In `StatisticsReady`, delete this block:

```tsx
<section className="phase7-statistics-hero">
  <p className="phase7-statistics-kicker">REVIEW ANALYTICS</p>
  <h1 className="phase7-statistics-headline">看到复习节奏，而不是表格噪音。</h1>
  <p className="phase7-statistics-hero-copy">
    统计页聚焦词义总量、复习状态、收藏、最近 14 天复习量、历史月份数量、正确率、标签分布和 Again / Good 趋势。
  </p>
</section>
```

Keep surrounding `<div className="phase7-statistics-shell">`.

- [ ] **Step 2: Remove settings hero JSX**

In `SettingsReady`, delete this block:

```tsx
<section className="phase7-settings-hero">
  <p className="phase7-settings-kicker">SETTINGS</p>
  <h1 className="phase7-settings-headline">设置与数据管理</h1>
  <p className="phase7-settings-hero-copy">
    调整界面语言、学习语言和每日复习目标，或导出 / 导入卡片数据。
  </p>
</section>
```

Keep settings form, export, and import sections.

- [ ] **Step 3: Remove tags page hero JSX**

In `TagsPage`, delete:

```tsx
<div className="phase6-hero">
  <div>
    <p className="phase6-kicker">Tag index</p>
    <h2>标签管理</h2>
    <p>标签承担自由分类和来源标记，不影响复习算法。</p>
  </div>
</div>
```

Start the section with error state and tag editor.

- [ ] **Step 4: Compact card detail top content**

In `CardDetailPage`, replace the `phase6-hero` block with compact summary/actions that are actual card content, not page-function header:

```tsx
<div className="phase6-detail-summary">
  <div>
    <h2>{card.target_word}</h2>
    <p>{card.context_meaning}</p>
  </div>
  <div className="phase6-detail-actions">
    <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { is_favorite: !card.is_favorite }))}>{card.is_favorite ? '取消收藏' : '收藏'}</button>
    <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { status: card.status === 'reviewing' ? 'mastered' : 'reviewing' }))}>{card.status === 'reviewing' ? '标记熟记' : '恢复复习'}</button>
    <button type="button" onClick={() => setConfirmDelete('card')}>删除词义</button>
  </div>
</div>
```

- [ ] **Step 5: Remove catalogue visible title/subtitle**

Open `src/client/components/CardCatalogue.tsx`. Find header/title rendering that uses props `title` and `subtitle`. Remove visible header block or convert to screen-reader only:

```tsx
<h1 className="sr-only">{title}</h1>
<p className="sr-only">{subtitle}</p>
```

Do not remove filter controls, pagination, card list, or empty states.

- [ ] **Step 6: Remove review card kicker**

In `ReviewCard`, remove:

```tsx
<p className="phase7-review-kicker">复习</p>
```

Keep target word, meaning, sentence, controls, and context panel.

- [ ] **Step 7: Run header tests and verify pass**

Run:

```bash
npm test -- tests/client/statisticsPage.test.tsx tests/client/settingsPage.test.tsx tests/client/app.test.tsx
```

Expected: PASS.

---

### Task 3: Add failing tests for Again confirmation label and direct advance

**Files:**
- Modify: `tests/client/reviewPage.test.tsx`

- [ ] **Step 1: Update existing Again test expectations**

Change the test named `reveals context after choosing Again, offers no Good correction, and advances only after confirmation` so it expects label `确认`, not `确认 Again`, and direct advancement after clicking `确认`:

```ts
fireEvent.click(screen.getByRole('button', { name: 'Again' }));

expect(screen.getByText('S01E03 12:45')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
expect(screen.queryByRole('button', { name: '确认 Again' })).not.toBeInTheDocument();
expect(screen.queryByRole('button', { name: '改为 Good' })).not.toBeInTheDocument();
expect(screen.queryByText('今天没有待复习内容')).not.toBeInTheDocument();

fireEvent.click(screen.getByRole('button', { name: '确认' }));

expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
expect(screen.queryByText(/Again 已记录/)).not.toBeInTheDocument();
```

- [ ] **Step 2: Update Good-to-Again correction test**

Where the test changes Good to Again, use `确认` and expect direct next/empty queue if the mocked due response after submit is empty. If the fixture currently returns the same due card, update the mock so first `/api/review/due` returns `dueResponse` and second returns `emptyResponse`.

- [ ] **Step 3: Run review tests and verify failure**

Run:

```bash
npm test -- tests/client/reviewPage.test.tsx
```

Expected: FAIL because UI still renders `确认 Again` and stays on recorded state before next card.

---

### Task 4: Implement Again direct-advance flow

**Files:**
- Modify: `src/client/pages/ReviewPage.tsx`

- [ ] **Step 1: Replace Again button label**

Change:

```tsx
<Button variant="secondary" disabled={submitting} onClick={() => onConfirmRating()}>确认 Again</Button>
```

To:

```tsx
<Button variant="secondary" disabled={submitting} onClick={() => onConfirmRating()}>确认</Button>
```

- [ ] **Step 2: Add direct-advance confirm handler**

Either reuse `handleNext` for pending Again or update `handleConfirmRating` to accept an option:

```tsx
const handleConfirmRating = async (advanceAfterSubmit = false) => {
  if (state.kind !== 'due') return;
  const rating = pendingRating;
  if (!rating) return;

  setSubmitting(true);
  setSubmitError(null);

  try {
    const result = await submitReview(state.card.id, { rating });
    if (!result.progress.is_limit_reached) {
      setLimitDismissed(false);
    }

    if (advanceAfterSubmit) {
      const res = await getDueReview();
      setPendingRating(null);
      setPendingRequiresConfirm(false);
      setLastRating(null);
      if (res.status === 'due') {
        setState({ kind: 'due', card: res.card, progress: res.progress });
        if (!res.progress.is_limit_reached) {
          setLimitDismissed(false);
        }
      } else {
        setState({ kind: 'empty', progress: res.progress });
      }
      return;
    }

    setState({ kind: 'due', card: state.card, progress: result.progress });
    setPendingRating(null);
    setPendingRequiresConfirm(false);
    setLastRating(rating);
  } catch (err) {
    setSubmitError(err instanceof Error ? err.message : '提交失败，请重试');
  } finally {
    setSubmitting(false);
  }
};
```

Then wire pending Again button as:

```tsx
<Button variant="secondary" disabled={submitting} onClick={() => onConfirmRating(true)}>确认</Button>
```

Update prop type:

```tsx
onConfirmRating: (advanceAfterSubmit?: boolean) => void;
```

- [ ] **Step 3: Keep Good-confirmation behavior unchanged**

`pendingRating === 'good' && pendingRequiresConfirm` should still call `onConfirmRating()` and then show `Good 已记录` plus `下一张`.

- [ ] **Step 4: Run review tests and verify pass**

Run:

```bash
npm test -- tests/client/reviewPage.test.tsx
```

Expected: PASS.

---

### Task 5: Clean styles and run full verification

**Files:**
- Modify: `src/client/styles.css`

- [ ] **Step 1: Add compact detail summary style**

If `CardDetailPage` uses `phase6-detail-summary`, add styles near existing Phase 6 detail styles:

```css
.phase6-detail-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.phase6-detail-summary h2 {
  margin: 0;
  color: #172033;
  font: 900 clamp(1.8rem, 4vw, 3rem)/0.95 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.06em;
  overflow-wrap: anywhere;
}

.phase6-detail-summary p {
  margin: 0.35rem 0 0;
  color: #475569;
  font: 650 1rem/1.5 ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 2: Leave unused hero CSS unless lint/build flags it**

Do not remove broad `.phase6-hero` CSS in same task unless tests or review show it causes remaining visual issues. Removing unused CSS can be separate cleanup.

- [ ] **Step 3: Run targeted tests**

Run:

```bash
npm test -- tests/client/reviewPage.test.tsx tests/client/statisticsPage.test.tsx tests/client/settingsPage.test.tsx tests/client/app.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run full test suite**

Run:

```bash
npm test
```

Expected: all test files pass.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: typecheck and Vite build pass.

- [ ] **Step 6: Code review**

Run a code-review skill or reviewer agent on the diff. Fix confirmed issues only, then rerun targeted tests.

---

## Self-Review

- Spec coverage: non-home visible top headers removed; home remains untouched; review Again label becomes `确认`; confirmed Again advances directly; mock cards/data are not deleted.
- Placeholder scan: no TBD/TODO placeholders; commands and expected results specified.
- Type consistency: `onConfirmRating` optional boolean signature is defined before usage; `pendingRequiresConfirm` state remains unchanged from current review flow.
