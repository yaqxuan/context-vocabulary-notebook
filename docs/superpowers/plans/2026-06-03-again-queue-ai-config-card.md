# Again Queue and AI Config Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Again keep a card in today's queue tail until Good, count daily reviewed cards by distinct card, and restyle saved AI config cards as light settings cards.

**Architecture:** Keep FSRS state as source of long-term scheduling. Add a small same-day retry marker on `fsrs_states` so Again cards can be surfaced after normal due cards without overwriting FSRS due dates. Restyle existing Settings page AI config markup with lightweight class additions and CSS aligned to current setting cards.

**Tech Stack:** React + Vite, Express, SQLite via better-sqlite3, Vitest, ts-fsrs.

---

## File Map

- Modify `src/server/db/schema.sql`: add `same_day_retry_at` nullable text column and index.
- Modify `src/server/db/init.ts`: idempotent migration for `same_day_retry_at`.
- Modify `src/server/domain/review.ts`: include same-day retries in due queue tail, clear retry on Good, set retry marker on Again, count distinct cards for daily progress.
- Modify `src/shared/types.ts`: expose optional FSRS retry marker if DTOs include FSRS state.
- Modify `src/server/domain/importExport.ts`: exclude transient retry marker from export/import so exported review state remains durable FSRS state only.
- Modify `src/client/pages/SettingsPage.tsx`: add semantic sub-elements for saved AI config cards.
- Modify `src/client/styles.css`: replace dark AI config card styling with light settings-card styling.
- Modify `tests/server/review.test.ts`: TDD coverage for distinct daily count, Again queue tail, Good clearing retry.
- Modify `tests/server/db.schema.test.ts`: schema coverage for retry marker column/index.
- Modify `tests/client/settingsPage.test.tsx`: structural regression for light config card class names.

---

### Task 1: Server Review Semantics

**Files:**
- Modify: `tests/server/review.test.ts`
- Modify: `src/server/domain/review.ts`
- Modify: `src/server/db/schema.sql`
- Modify: `src/server/db/init.ts`
- Modify: `src/shared/types.ts`
- Modify: `tests/server/db.schema.test.ts`

- [ ] **Step 1: Write failing tests for Again queue and daily distinct count**

Add tests in `tests/server/review.test.ts` under `describe('review API', ...)`:

```ts
  it('counts daily reviewed_count by distinct card instead of review attempts', async () => {
    db.prepare('UPDATE user_settings SET daily_review_limit = 2 WHERE id = 1').run();
    const card = createCard(db, { target_word: 'repeat', context_meaning: '重复', target_language: '英语', definition_language: '中文' });

    const first = await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });
    const second = await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.progress.reviewed_count).toBe(1);
    expect(second.body.progress.again_count).toBe(2);
    expect(second.body.progress.is_limit_reached).toBe(false);
  });

  it('places Again cards after normal due cards without overwriting FSRS due_date', async () => {
    const miss = createCard(db, { target_word: 'miss', context_meaning: '错过', target_language: '英语', definition_language: '中文' });
    const other = createCard(db, { target_word: 'other', context_meaning: '其他', target_language: '英语', definition_language: '中文' });

    const again = await request(app).post(`/api/review/${miss.id}`).send({ rating: 'again' });
    const fsrsAfterAgain = db.prepare('SELECT due_date, same_day_retry_at FROM fsrs_states WHERE card_id = ?').get(miss.id) as { due_date: string; same_day_retry_at: string | null };
    const due = await request(app).get('/api/review/due').expect(200);

    expect(again.status).toBe(200);
    expect(fsrsAfterAgain.due_date).toBe(again.body.fsrs.due_date);
    expect(fsrsAfterAgain.due_date).not.toBe(again.body.reviewed_at);
    expect(fsrsAfterAgain.same_day_retry_at).toBe(again.body.reviewed_at);
    expect(due.body.status).toBe('due');
    expect(due.body.card.id).toBe(other.id);
  });

  it('returns an Again card immediately when no normal due cards remain', async () => {
    const card = createCard(db, { target_word: 'miss', context_meaning: '错过', target_language: '英语', definition_language: '中文' });

    await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });
    const due = await request(app).get('/api/review/due').expect(200);

    expect(due.body.status).toBe('due');
    expect(due.body.card.id).toBe(card.id);
  });

  it('clears same-day retry marker after Good', async () => {
    const card = createCard(db, { target_word: 'resolve', context_meaning: '解决', target_language: '英语', definition_language: '中文' });

    await request(app).post(`/api/review/${card.id}`).send({ rating: 'again' });
    const good = await request(app).post(`/api/review/${card.id}`).send({ rating: 'good' });
    const fsrs = db.prepare('SELECT same_day_retry_at FROM fsrs_states WHERE card_id = ?').get(card.id) as { same_day_retry_at: string | null };

    expect(good.status).toBe(200);
    expect(fsrs.same_day_retry_at).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/server/review.test.ts tests/server/db.schema.test.ts`

Expected: FAIL because `same_day_retry_at` column does not exist and daily progress still counts attempts.

- [ ] **Step 3: Add schema and migration**

In `src/server/db/schema.sql`, add within `fsrs_states` after `last_reviewed_at TEXT,`:

```sql
  same_day_retry_at TEXT,
```

Add index near other FSRS indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_fsrs_same_day_retry_at ON fsrs_states (same_day_retry_at);
```

In `src/server/db/init.ts`, add:

```ts
  ensureColumn(db, 'fsrs_states', 'same_day_retry_at', 'TEXT');
```

In `tests/server/db.schema.test.ts`, assert column and index:

```ts
expect(names).toContain('same_day_retry_at');
```

```ts
expect(indexes.map((idx) => idx.name)).toContain('idx_fsrs_same_day_retry_at');
```

- [ ] **Step 4: Update review domain logic**

In `src/server/domain/review.ts`:

1. Add `same_day_retry_at: string | null` to `FsrsStateRow`.
2. Add helper:

```ts
function startOfLocalDayIso(now: Date): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}
```

3. Update `getDueQueue` to include same-day retries and sort normal due cards before retry cards:

```sql
WHERE wsc.status = 'reviewing'
  AND wsc.deleted_at IS NULL
  AND (
    fs.due_date <= ?
    OR (fs.same_day_retry_at IS NOT NULL AND fs.same_day_retry_at >= ?)
  )
ORDER BY
  CASE WHEN fs.same_day_retry_at IS NOT NULL AND fs.same_day_retry_at >= ? THEN 1 ELSE 0 END ASC,
  CASE WHEN fs.same_day_retry_at IS NOT NULL AND fs.same_day_retry_at >= ? THEN fs.same_day_retry_at ELSE fs.due_date END ASC,
  wsc.created_at ASC,
  wsc.id ASC
```

Pass `[nowIso, startIso, startIso, startIso]`.

4. Update `getDailyReviewProgress` query:

```sql
COUNT(DISTINCT rl.card_id) AS reviewed_count,
```

Keep `again_count` and `good_count` as attempt counts.

5. In `submitReview`, set retry marker:

```ts
const sameDayRetryAt = rating === 'again' ? reviewedAtIso : null;
```

and add to update statement:

```sql
same_day_retry_at = ?,
```

with value before `updated_at`.

- [ ] **Step 5: Run server tests**

Run: `npm test -- tests/server/review.test.ts tests/server/db.schema.test.ts`

Expected: PASS.

---

### Task 2: AI Config Card Light Styling

**Files:**
- Modify: `tests/client/settingsPage.test.tsx`
- Modify: `src/client/pages/SettingsPage.tsx`
- Modify: `src/client/styles.css`

- [ ] **Step 1: Write failing structural UI test**

In `tests/client/settingsPage.test.tsx`, add a test in AI config describe block:

```ts
it('renders saved AI configs as light settings cards with metadata grouping', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
    if (url === '/api/ai-configs' && method === 'GET') {
      return Promise.resolve(jsonResponse([{
        id: 'cfg-1',
        name: 'deepseek',
        base_url: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
        is_active: 1,
        has_api_key: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      }]));
    }
    return Promise.resolve(jsonResponse({}));
  });

  render(<SettingsPage />);

  const card = await screen.findByTestId('ai-config-card-cfg-1');
  expect(card).toHaveClass('ai-config-card--light');
  expect(card.querySelector('.ai-config-meta')).toHaveTextContent('deepseek-v4-flash');
  expect(card.querySelector('.ai-config-meta')).toHaveTextContent('https://api.deepseek.com');
  expect(screen.getByText('当前启用')).toHaveClass('ai-config-active');
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- tests/client/settingsPage.test.tsx`

Expected: FAIL because class/test id/meta wrapper do not exist.

- [ ] **Step 3: Update SettingsPage markup**

Change saved AI config card markup to:

```tsx
<div key={config.id} className="ai-config-card ai-config-card--light" data-testid={`ai-config-card-${config.id}`}>
  <div className="ai-config-main">
    <strong className="ai-config-name">{config.name}</strong>
    <div className="ai-config-meta" aria-label={`${config.name} 配置详情`}>
      <span>{config.model}</span>
      <small>{config.base_url}</small>
      <small>{config.has_api_key ? 'API Key 已保存' : 'API Key 未保存'}</small>
    </div>
  </div>
  <div className="ai-config-actions">
    ...existing buttons...
  </div>
</div>
```

Keep button behavior unchanged.

- [ ] **Step 4: Replace dark CSS with light settings-card styling**

In `src/client/styles.css`, replace `.ai-config-card` and related text color styles with:

```css
.ai-config-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(23, 32, 51, 0.12);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, .68);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
}

.ai-config-main {
  min-width: 0;
  display: grid;
  gap: .35rem;
}

.ai-config-name {
  color: #172033;
  font: 850 .98rem ui-sans-serif, system-ui, sans-serif;
}

.ai-config-meta {
  display: grid;
  gap: .15rem;
}

.ai-config-meta span {
  color: #334155;
  font: 700 .9rem ui-sans-serif, system-ui, sans-serif;
}

.ai-config-meta small {
  color: #64748b;
  font: 600 .82rem/1.35 ui-sans-serif, system-ui, sans-serif;
  overflow-wrap: anywhere;
}

.ai-config-active {
  padding: .35rem .65rem;
  border-radius: 999px;
  background: rgba(16, 185, 129, .14);
  color: #047857;
  font: 800 .78rem ui-sans-serif, system-ui, sans-serif;
}
```

Add mobile wrapping if needed:

```css
@media (max-width: 640px) {
  .ai-config-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .ai-config-actions {
    justify-content: flex-start;
  }
}
```

- [ ] **Step 5: Run client Settings tests**

Run: `npm test -- tests/client/settingsPage.test.tsx`

Expected: PASS.

---

### Task 3: Verification

**Files:**
- Verify changed tests and typecheck.

- [ ] **Step 1: Run targeted tests**

Run: `npm test -- tests/server/review.test.ts tests/server/db.schema.test.ts tests/client/settingsPage.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run code review**

Use `ecc-code-reviewer` on changed files. Fix correctness issues only.

---

## Self-Review

- Spec coverage: Again queue tail, distinct daily card count, Good clearing retry, FSRS due preservation, and light AI config card styling are covered.
- Placeholder scan: no TBD/TODO/fill-later instructions.
- Type consistency: `same_day_retry_at` is used consistently as `string | null` in DB row and SQL.
