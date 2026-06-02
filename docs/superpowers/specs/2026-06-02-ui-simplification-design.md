# UI Simplification Design

**Date:** 2026-06-02
**Project:** Context Vocabulary Notebook
**Scope:** V1 page cleanup, review completion entry points, card detail back button, statistics freshness and chart clarity

---

## Goal

Make the app feel like a clean vocabulary tool instead of a decorative landing page. Remove decorative copy, repeated helper text, and modules that do not help the user create, find, review, or inspect cards.

Keep V1 functionality intact. Do not rename core navigation. In particular, keep `词义条目` as the page and navigation name.

---

## Source Inputs

User-provided screenshots and annotations from `~/tem_pic`:

- `PixPin_2026-06-02_16-11-00.png` — delete the suggestion helper sentence: `输入目标单词后，我会查找已有词义，帮你避免重复建卡。`
- `PixPin_2026-06-02_16-12-52.png` — keep the recent 14-day chart but fix its visual shape; current single-bar blob looks wrong.
- `PixPin_2026-06-02_16-14-24.png` — fix Again / Good trend chart; current shape looks wrong.

Conversation decisions:

- Remove decorative modifiers from all pages.
- Remove useless modules.
- Add a back button to the card detail page.
- When review is complete or no cards are due, give the user an obvious way to view created cards.
- `添加到复习队列` means restoring a mastered card to `reviewing`, not forcing immediate review or changing FSRS due date.
- Keep the `词义条目` name; do not rename it to `全部卡片`.
- Improve statistics freshness: data should update when the user enters or returns to the statistics page.

---

## Non-Goals

Do not implement these in this pass:

- No forced immediate-review queue.
- No due-date override for reviewing cards.
- No WebSocket, polling loop, or background live updates.
- No navigation rename from `词义条目` to `全部卡片`.
- No data model changes.
- No broad redesign of the card list page.
- No removal of required form validation, empty states, or error messages.

---

## Global Copy Rules

Remove decorative or explanatory text that does not carry state, validation, or actions.

Examples to remove:

- English decorative kickers like `LOCAL GREETING`, `Context capture`, `SOFT GOAL`, `today progress`.
- Long explanatory homepage copy.
- Repeated helper text under nav items or fields when the label already explains the control.
- Decorative section prose on settings, statistics, tags, favorites, and create page.

Keep required text:

- Page titles.
- Field labels.
- Validation errors.
- API/load errors.
- Empty state messages.
- Success/failure messages, shortened where possible.
- Import conflict and missing media information.
- Review status and card status.
- Buttons and links.

Shorten long success messages where they currently interrupt flow. Example: `Good 已选择，请查看语境；确认无误后进入下一张。` becomes `Good 已选择`.

---

## Navigation

Keep current navigation items and names:

```text
首页
制卡
词义条目
复习
标签
收藏
统计
设置
```

Remove or minimize nav descriptions. Active item behavior stays unchanged.

---

## Home Page

### Keep

- `开始复习`
- `快速制卡`
- 今日待复习
- 今日已复习
- Again
- Good

### Remove

- Greeting decoration and copy block.
- Right-side `TODAY PROGRESS` floating card.
- Bottom explanatory module beginning with `先处理到期，再继续积累。`
- Bottom `SOFT GOAL` module.
- Long explanatory copy about review rhythm or local time-band greetings.

### Target Structure

```text
首页

[开始复习] [快速制卡]

今日待复习   N
今日已复习   N / limit
Again        N
Good         N
```

The home page should remain visually pleasant, but layout must be data-and-action first.

---

## Create Page

### Keep

- Target word.
- Context meaning.
- Sentence.
- Target language.
- Definition language.
- Tags.
- Note.
- Video/image/audio upload controls.
- Existing-sense suggestions.
- Save button.
- Validation and upload errors.

### Remove

- Decorative header copy.
- English kicker text.
- Helper sentence from annotation: `输入目标单词后，我会查找已有词义，帮你避免重复建卡。`
- Redundant field helper text that repeats the field purpose.

Existing exact-match behavior stays: exact same word + meaning appends a new context to the existing word sense card.

---

## Card List / `词义条目` Page

Keep the page name `词义条目`.

Keep existing structure and core behavior:

- Search.
- Filters.
- Pagination.
- Card rows/cards.
- Favorite actions.
- Mark mastered / restore reviewing.
- View detail.

Only remove decorative copy and redundant helper text if present. Do not restructure the page in this pass.

Restoring a card means setting user-visible status from `mastered` to `reviewing`. It does not force the card to appear immediately if its FSRS due date is still in the future.

---

## Card Detail Page

Add a top-level `返回` button near the title/header.

Behavior:

1. If browser history can go back, call `history.back()`.
2. Otherwise set `window.location.hash = '#/cards'`.

Keep all existing detail actions:

- Add context.
- Favorite / unfavorite.
- Mark mastered / restore reviewing.
- Delete card.
- Edit meaning.
- Edit tags.
- Move context up/down.
- Set primary context.
- Delete context.

The back button should not replace sidebar navigation. It is a local page action for returning from detail to the previous list or source page.

---

## Review Page

### Due Card State

Keep:

- Target word.
- Context meaning.
- Primary sentence.
- `查看当时语境`.
- Again / Good.
- Today progress.
- Context media/note/other contexts after expansion.

Shorten status messages:

- `Good 已选择，请查看语境；确认无误后进入下一张。` → `Good 已选择`
- Similar long Again/confirm messages should become short action-state text.

### Empty / No Due State

When there are no due cards, show:

```text
今天没有待复习内容

[查看词义条目]
[快速制卡]
```

The first link goes to `#/cards`. The second goes to `#/create`.

### Daily Limit Reached State

When the daily goal is reached, keep the soft-limit behavior. Show concise actions:

```text
今日复习目标已完成

[继续复习]
[查看词义条目]
```

`继续复习` keeps current dismiss behavior. `查看词义条目` goes to `#/cards`.

Do not change FSRS scheduling or due-date logic.

---

## Statistics Page

### Freshness

Statistics should feel current after review, card creation, import, or status changes.

Implement without polling:

- Fetch statistics every time `StatisticsPage` mounts or route enters `#/statistics`.
- Refresh statistics on browser window focus when current route is `#/statistics`.
- Do not cache statistics in module-level state.
- Keep loading and error states.

This gives good local-app freshness without background traffic.

### Chart Clarity

Keep all required V1 statistics sections:

- Total cards.
- Reviewing cards.
- Mastered cards.
- Favorite cards.
- Recent 14-day review quantity.
- Daily accuracy.
- Historical monthly review counts.
- Tag distribution.
- Again / Good trend.

Fix chart shapes:

#### Recent 14-Day Quantity

Problem: single data point renders as a giant rounded blob.

Design:

- Render narrow bars with a fixed max width per day.
- Use stable spacing even when there are fewer than 14 data points.
- Show value labels or accessible summary.
- Empty data shows `暂无数据`.

#### Again / Good Trend

Problem: current horizontal blobs/lines do not read as a trend chart.

Design:

- Render per-day grouped bars for Again and Good, or a compact table-like mini chart.
- Single-day data must still look like a normal chart, not a stretched shape.
- Keep accessible summaries for screen readers/tests.

---

## Settings, Tags, Favorites

Keep all existing functional controls.

Remove decorative or repeated descriptions only. Keep:

- Settings fields.
- Save settings.
- Export marked/pure buttons.
- Import zip selection, scan, execute.
- Import conflict decisions.
- Missing media display.
- Tag CRUD.
- Favorite list/search/pagination/actions.
- Empty/error states.

---

## Testing Plan

Update or add tests for these behaviors:

- Home page no longer renders removed decorative text like `LOCAL GREETING` or `SOFT GOAL`.
- Review empty state renders `查看词义条目` and links to `#/cards`.
- Daily limit banner renders `查看词义条目` and keeps `继续复习` behavior.
- Detail page renders `返回`; fallback route goes to `#/cards` when history is unavailable or mocked.
- Create page no longer renders the annotated helper sentence.
- Statistics page refreshes on mount and window focus when on statistics route.
- Recent 14-day chart and Again/Good trend render fixed-width/structured chart elements for single-day data.
- E2E smoke test updates any changed text expectations.

Final verification commands:

```bash
npm test
npm run build
npm run test:e2e
```

---

## Acceptance Criteria

- All pages have less decorative copy and no removed annotated text.
- Home page contains only core actions and four core metrics.
- Card detail page has a working `返回` button.
- Review completion/no-due states provide `查看词义条目`.
- `词义条目` naming remains unchanged.
- Restoring mastered cards still means `mastered` → `reviewing`, with no FSRS due-date override.
- Statistics refresh on entry/focus and chart shapes no longer become giant blobs with small datasets.
- Unit tests, build, and E2E smoke all pass.
