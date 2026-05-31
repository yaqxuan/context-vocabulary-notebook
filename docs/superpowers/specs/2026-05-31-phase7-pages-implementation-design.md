# Phase 7 Pages Implementation Design

## Goal

Implement the three approved Phase 7 pages as real React routes:

- `#/review`
- `#/statistics`
- `#/settings`

These pages replace the current Phase 7 placeholders and complete the first-version user loop: create cards, review due cards, inspect progress, change settings, and import/export data.

## Sources of Truth

- Product requirements: `require.md`
  - Review behavior: sections 6 and 11.5
  - Statistics behavior: sections 9.2 and 11.8
  - Settings/import/export behavior: sections 10 and 11.9
- Project constraints: `PROJECT_MEMORY.md`
  - V1 local-first scope
  - Review rules
  - Import/export rules
  - UI review gate
- Approved visual drafts:
  - `docs/superpowers/mockups/phase7-review-page-mockup.html`
  - `docs/superpowers/mockups/phase7-statistics-page-mockup.html`
  - `docs/superpowers/mockups/phase7-settings-page-mockup.html`

## Explicit Non-Goals

Phase 7 will not implement:

- Homepage daily greeting copy
- AI/API-generated copy
- Holiday logic
- Local API, CLI, AI, or sync settings
- New charting library dependency
- Dictionary, pronunciation, OCR, ASR, subtitle extraction, or other future extensions

The user-approved future greeting/personalization idea remains recorded in `PROJECT_MEMORY.md` for Phase 8A/8B.

## Architecture Overview

Phase 7 uses existing server routes and client API modules wherever possible. Small API extensions are allowed only where current DTOs cannot support the approved UI and requirements.

Implementation order:

1. Extend backend/shared DTOs where needed.
2. Implement client pages with tests.
3. Replace placeholders in `src/client/App.tsx`.
4. Verify with tests, build, and browser UI pass.

The pages should match existing Phase 6 style conventions: route-level page components, local page state with `useEffect`, typed API wrappers, loading/error/empty states, and CSS in `src/client/styles.css` using Tailwind utilities plus page-specific classes where useful.

## Review Page

### Route

`#/review` renders `ReviewPage` instead of `PlaceholderPage`.

### Data Sources

Use existing client API functions:

- `getDueReview()` → `GET /api/review/due`
- `getReviewProgress()` → `GET /api/review/progress`
- `submitReview(cardId, { rating })` → `POST /api/review/:id`

### API Extension

Current `ReviewDueResponseDto` includes due card contexts but not media. The approved review page needs to show video, screenshot, and audio in the context expansion.

Extend `DueReviewCardDto` in `src/shared/types.ts`:

```ts
export interface DueReviewCardDto extends CardSummaryDto {
  due_date: string;
  primary_sentence: string;
  contexts: ContextDto[];
  media: MediaDto[];
}
```

Update `src/server/routes/review.ts` so `/review/due` adds:

```ts
media: getMediaForCard(db, card.id)
```

This uses existing `getMediaForCard()` from `src/server/domain/media.ts`.

### Page States

`ReviewPage` must handle:

1. Loading: initial request in progress.
2. Due card: `status: 'due'` with one card.
3. Empty queue: `status: 'empty'` with message `今天没有待复习内容`.
4. Daily target reached: `progress.is_limit_reached === true` and due card still exists. Show reminder with actions `结束复习` and `继续复习`; do not block review.
5. Submit loading: disable Again/Good while request is in flight.
6. Error: show a retryable error state.

### Review Card UI

The card front shows:

- Target word
- Context meaning hidden or visually secondary until answer area is shown
- Full primary sentence
- Highlighted target word inside the sentence
- Due/order metadata
- Daily progress counts

Target word must not be hidden from the sentence. Highlighting is a visual aid only.

Highlighting should be deterministic and local:

- Find case-insensitive occurrences of `target_word` in `primary_sentence`.
- Wrap matches in a `<mark>`.
- If no match is found, render the sentence unchanged.

### Context Expansion

A `查看当时语境` control toggles a panel showing:

- Local video files from `media` where `media_type === 'video'`
- Screenshots from `media` where `media_type === 'image'`
- Audio from `media` where `media_type === 'audio'`
- Primary context note
- Other context examples ordered by `sort_order`

Media preview should use existing media download URL conventions from the media route. If an item has `is_available = 0`, show an unavailable badge instead of trying to render it.

### Review Submission

Again/Good buttons call `submitReview()` with `again` or `good`.

On success:

1. Update progress from response.
2. Fetch the next due card with `getDueReview()`.
3. Reset answer/context expanded UI state.
4. Show a small success message including the selected rating and next due date if useful.

On failure:

- Keep current card visible.
- Re-enable buttons.
- Show error message.

## Statistics Page

### Route

`#/statistics` renders `StatisticsPage` instead of `PlaceholderPage`.

### Data Source

Use existing client API function:

- `getStatisticsPage()` → `GET /api/statistics`

### API Extension: Monthly Counts

The user requested statistics include recent 14-day quantity and a separate historical monthly quantity view grouped by month.

Extend `StatisticsPageDto` in `src/shared/types.ts`:

```ts
monthly_review_counts: Array<{ month: string; count: number }>;
```

Extend server statistics domain types in `src/server/domain/statistics.ts`:

```ts
export interface MonthlyReviewCount {
  month: string;
  count: number;
}
```

Add monthly query:

```sql
SELECT substr(rl.reviewed_at, 1, 7) AS month, COUNT(*) AS count
FROM review_logs rl
JOIN word_sense_cards wsc ON wsc.id = rl.card_id
WHERE wsc.deleted_at IS NULL
GROUP BY substr(rl.reviewed_at, 1, 7)
ORDER BY month ASC
```

Statistics must continue excluding review logs for soft-deleted cards.

### UI Sections

StatisticsPage renders:

- Total word sense card count
- Reviewing count
- Mastered count
- Favorite count
- Recent 14-day quantity chart
- Daily accuracy chart
- Historical monthly quantity chart（历史月份数量图）
- Tag distribution
- Again / Good trend

Charts should be lightweight CSS/SVG components, not a charting dependency.

### Chart Rules

- Recent 14-day chart uses the latest 14 records by date from `daily_review_counts`; if fewer than 14 records exist, render available records and an empty-state hint.
- Monthly chart uses `monthly_review_counts`, grouped by `YYYY-MM`.
- Accuracy chart displays `accuracy` as a percentage, rounded for display.
- Rating trend displays `again_count` and `good_count` per date.
- Tag distribution sorts by backend order and renders count bars.

### Empty/Error States

- If all statistics arrays are empty, show metric cards with zeros plus a friendly empty analysis state.
- If API request fails, show a retryable error state.

## Settings Page

### Route

`#/settings` renders `SettingsPage` instead of `PlaceholderPage`.

### Data Sources

Use existing client API functions:

- `getSettings()` → `GET /api/settings`
- `patchSettings(body)` → `PATCH /api/settings`
- `exportCards(type)` → `GET /api/export?type=marked|pure`
- `scanImport(file)` → `POST /api/import/scan`
- `executeImport(file, decision)` → `POST /api/import/execute`

### Existing Client/Server Mismatch

Current client sends import execute decision under form key `decision`:

```ts
formData.append('decision', JSON.stringify(decision));
```

Server expects `decisions`:

```ts
req.body.decisions
```

Phase 7 will fix the client to send `decisions`. Tests must cover this key so import execution works through the real route.

### Settings Form

Settings form fields:

- `interface_language`
- `default_target_language`
- `default_definition_language`
- `daily_review_limit`

Validation:

- Text fields must be non-empty after trimming.
- Daily review limit must be a positive integer.
- Server errors are shown inline.

On save success:

- Show saved state.
- Keep the updated values in form state.

### Export UI

Two export cards:

1. Marked export
   - For backup/migration.
   - Includes cards, contexts, media, tags, card-tag relations, favorites, status, FSRS state, review logs, and settings.
2. Pure-card export
   - For sharing.
   - Excludes favorites, status, FSRS state, review logs, and settings.

Button behavior:

- Calls `exportCards('marked')` or `exportCards('pure')`.
- Creates an object URL for the returned Blob.
- Downloads as `cvn-marked-export.zip` or `cvn-pure-export.zip`.
- Revokes object URL after triggering download.

### Import UI

Import flow:

1. User selects a `.zip` file.
2. User clicks scan.
3. Page calls `scanImport(file)`.
4. Show counts: cards, contexts, media files, tags.
5. Show conflicts by `target_word + context_meaning`.
6. Show missing media list.
7. User chooses one conflict decision mode:
   - `skip_all`
   - `merge_all`
   - `import_all_as_new`
   - `per_item`
8. For `per_item`, render one selector per conflict with values:
   - `skip`
   - `merge`
   - `import_as_new`
9. User executes import.
10. Page calls `executeImport(file, decision)`.
11. Show result summary: imported cards, imported contexts, imported media files, skipped cards, merged cards, missing media files.

### Settings Page Non-Goals

The page must not show first-version-excluded configuration:

- Local API
- CLI
- AI
- Sync

This is a testable UI requirement.

## App Routing

Update `src/client/App.tsx`:

- Import `ReviewPage`, `StatisticsPage`, and `SettingsPage`.
- Replace Phase 7 placeholders with real pages.
- Keep route title/subtitle strings aligned with current nav.

## Styling

Use existing visual language from Phase 6 and approved Phase 7 mockups:

- Warm paper background
- Dark/jade accent navigation style
- Rounded cards
- Dense but legible dashboard sections
- Serif display headings and sans-serif controls

CSS lives in `src/client/styles.css`. Keep class naming scoped, e.g.:

- `.phase7-review-*`
- `.phase7-statistics-*`
- `.phase7-settings-*`

Avoid broad selectors that could regress Phase 6 pages.

## Testing Strategy

### Client Tests

Add:

- `tests/client/reviewPage.test.tsx`
- `tests/client/statisticsPage.test.tsx`
- `tests/client/settingsPage.test.tsx`

Update:

- `tests/client/app.test.tsx`
- client API tests for import execute form key if needed

ReviewPage tests:

- Renders due card from mocked API.
- Highlights target word in sentence.
- Toggles context panel.
- Shows video/image/audio/media unavailable states.
- Submits Again and refreshes next due card.
- Submits Good and refreshes next due card.
- Shows daily target reached reminder but still allows continue.
- Shows empty queue state.
- Shows retryable API error.

StatisticsPage tests:

- Renders totals.
- Renders recent 14-day quantity chart.
- Renders monthly review counts.
- Renders accuracy, tag distribution, and Again/Good trend.
- Renders empty state.
- Renders retryable API error.

SettingsPage tests:

- Loads settings.
- Saves settings with `PATCH` payload.
- Validates positive integer daily review limit.
- Triggers marked export download.
- Triggers pure-card export download.
- Scans import zip and displays counts/conflicts/missing media.
- Executes `skip_all`, `merge_all`, `import_all_as_new`, and `per_item` import decisions.
- Sends form field `decisions` for import execute.
- Does not render `本地 API`, `CLI`, `AI`, or `同步`.

App tests:

- `#/review` renders real review page.
- `#/statistics` renders real statistics page.
- `#/settings` renders real settings page.

### Server Tests

Update:

- `tests/server/review.test.ts`
- `tests/server/statistics.test.ts`
- `tests/server/importExport.test.ts` if needed for execute key path coverage through route.

Server tests:

- `/api/review/due` includes `media` array.
- `/api/statistics` includes `monthly_review_counts` and excludes soft-deleted cards.
- `/api/import/execute` accepts `decisions` form key and rejects missing decisions.

## Verification Plan

Before claiming Phase 7 complete:

1. Run targeted tests for each page while implementing.
2. Run full test suite:

```bash
npm test
```

3. Run production build:

```bash
npm run build
```

4. Run browser UI pass:

```bash
npm run dev
```

Open:

- `http://localhost:5173/#/review`
- `http://localhost:5173/#/statistics`
- `http://localhost:5173/#/settings`

Verify:

- Review card loads and Again/Good can submit.
- Statistics shows recent 14-day and monthly charts.
- Settings save/export/import UI renders and handles mocked/manual flows where safe.

## Risks and Mitigations

### Import/export UI complexity

Risk: import conflict flows have multiple decision modes.

Mitigation: implement one mode at a time with client tests; keep decision state explicit and typed.

### Review submit state

Risk: user can double-submit Again/Good.

Mitigation: disable buttons while submit is in flight and keep current card visible on error.

### Statistics API shape change

Risk: adding `monthly_review_counts` breaks type assumptions.

Mitigation: extend DTOs and tests together; keep existing fields unchanged.

### Media in review page

Risk: media route URLs or unavailable files can break preview.

Mitigation: render unavailable badges for `is_available = 0`; never assume all media can render.

## Acceptance Criteria

Phase 7 is accepted when:

- `#/review`, `#/statistics`, and `#/settings` are real pages.
- No Phase 7 route renders `PlaceholderPage`.
- Review page follows `require.md`: full primary sentence, highlighted target word, context expansion, Again/Good only, empty state, daily goal reminder.
- Statistics page shows totals, recent 14-day quantity, monthly historical quantity, daily accuracy, tags, and Again/Good trend.
- Settings page supports settings save, marked/pure export, import scan, and import execute decisions.
- Settings page does not expose local API/CLI/AI/sync configuration.
- `npm test` passes.
- `npm run build` passes.
- Browser UI pass confirms the three routes render and basic flows work.
