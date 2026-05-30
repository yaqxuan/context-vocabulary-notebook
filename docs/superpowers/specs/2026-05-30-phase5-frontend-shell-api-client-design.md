# Phase 5 Frontend Shell and Shared API Client Design

## Source of truth

- `require.md` remains authoritative for V1 product behavior and scope.
- `PROJECT_MEMORY.md` confirms V1 scope guard, technical stack, domain invariants, review rules, and import/export rules.
- Phase 5 follows `docs/superpowers/plans/2026-05-30-v1-phased-development-plan.md` and does not implement Phase 6/7 business flows.

## Goal

Build the React frontend foundation for Context Vocabulary Notebook: a stable Chinese-first application shell, nine V1 page routes, shared API client modules, reusable UI components, loading/empty/error states, and a home page backed by the existing home statistics API.

Phase 5 prepares later feature pages without implementing their full workflows.

## Scope

### In scope

- Side navigation layout for V1 pages.
- Lightweight hash routing using `location.hash`.
- Nine V1 routes:
  - 首页: `#/`
  - 制卡页: `#/create`
  - 词义条目列表页: `#/cards`
  - 词义条目详情页 route support: `#/cards/:id`
  - 复习页: `#/review`
  - 标签管理页: `#/tags`
  - 收藏页: `#/favorites`
  - 统计页: `#/statistics`
  - 设置页: `#/settings`
- Shared typed API client with endpoint modules for existing backend APIs.
- Shared UI components:
  - `Layout`
  - `Button`
  - `FormField`
  - `Pagination`
  - `StatusBadge`
  - `MediaPreview`
  - `ConfirmDialog`
  - `LoadingState`
  - `EmptyState`
  - `ErrorState`
- Homepage shell backed by `GET /api/statistics/home`.
- Tests for routing/layout, API client error handling, shared components, and homepage loading/success/error behavior.

### Out of scope

- Real card creation workflow.
- Real card list/search/filter UI.
- Real card detail editing, context reorder, media upload, tag assignment, favorite toggles, or delete flows.
- Real review submit flow.
- Real statistics charts.
- Real settings update/import/export UI.
- Any future-scope UI for local API, CLI, AI, sync, OCR, ASR, browser extension, mobile packaging, or Anki export.

## Architecture

The frontend stays dependency-light. Hash routing is enough for this local-first V1 shell and avoids adding `react-router` before needed.

```text
src/client/App.tsx
  route registry and route selection

src/client/components/
  Layout.tsx
  Button.tsx
  FormField.tsx
  Pagination.tsx
  StatusBadge.tsx
  MediaPreview.tsx
  ConfirmDialog.tsx
  UiStates.tsx

src/client/pages/
  HomePage.tsx
  CreatePage.tsx
  CardListPage.tsx
  CardDetailPage.tsx
  ReviewPage.tsx
  TagsPage.tsx
  FavoritesPage.tsx
  StatisticsPage.tsx
  SettingsPage.tsx

src/client/api/
  client.ts
  cards.ts
  tags.ts
  review.ts
  settings.ts
  statistics.ts
  importExport.ts
```

`App.tsx` owns route detection and passes current route metadata into `Layout`. Page components own their own page data loading. Shared components do not fetch business data.

## Routing and navigation

Routes use hash URLs:

```text
#/              首页
#/create        制卡
#/cards         词义条目
#/cards/<id>    词义详情
#/review        复习
#/tags          标签
#/favorites     收藏
#/statistics    统计
#/settings      设置
```

`Layout` renders:

- Product name: `语境单词本`.
- Subtitle: `Context Vocabulary Notebook`.
- Side navigation with Chinese labels and short descriptions.
- Current page highlight.
- Main content panel with page title/subtitle.

Desktop and tablet use a sidebar plus content layout. Small widths stack sidebar above content naturally; no drawer is needed in Phase 5.

## Homepage behavior

`HomePage` calls `getHomeStatistics()` from the statistics API module.

It shows:

- 今日待复习数量.
- 今日已复习数量.
- 今日 Again 数量.
- 今日 Good 数量.
- Daily target state:
  - `今日复习目标已完成` when `is_daily_target_reached` is true.
  - Otherwise show remaining/goal-oriented state text.
- Primary action: `开始复习` linking to `#/review`.
- Secondary action: `快速制卡` linking to `#/create`.

Loading uses `LoadingState`. API failure uses `ErrorState` and does not render fake counts.

## Placeholder page behavior

Phase 5 placeholder pages should be explicit, not fake-functional.

Each placeholder page shows:

- Page title.
- One sentence describing the future V1 workflow.
- Scope note such as `此功能将在 Phase 6 实现` or `此功能将在 Phase 7 实现`.
- Relevant navigation actions where safe, such as returning home.

Placeholders must not show future-scope features.

## API client design

`apiRequest<T>(path, options)` handles JSON APIs.

Behavior:

- Prefix `/api` for relative API paths.
- Preserve absolute URLs when provided.
- Default `Accept: application/json`.
- Add `Content-Type: application/json` only when JSON body is sent.
- Serialize JSON body from a `json` option.
- Parse JSON responses when content type is JSON.
- Return `undefined` for 204 responses.
- On non-2xx response, parse `{ error }` when available and throw `ApiError`.
- `ApiError` includes `status`, `message`, and optional `details`.

Separate helpers handle binary and multipart boundaries:

- `apiBlob(path, options)` for export zip downloads.
- `apiFormData<T>(path, formData, options)` for import/media style uploads.

Endpoint modules wrap backend routes:

- `cards.ts`: list, detail, suggestions, create, patch, delete.
- `tags.ts`: list, create, patch, delete, cards by tag.
- `review.ts`: due review, progress, submit.
- `settings.ts`: get and patch settings.
- `statistics.ts`: home statistics and statistics page data.
- `importExport.ts`: marked/pure export, scan import, execute import.

## Shared components

### Layout

Only handles app frame and navigation. No business data loading.

### Button

Variants: `primary`, `secondary`, `danger`, `ghost`. Supports `disabled`, `type`, and normal button props.

### FormField

Reusable label/help/error wrapper for Phase 6/7 forms.

### Pagination

Accepts `page`, `pageSize`, `total`, and callbacks. Page size options are `20`, `50`, `100`, matching V1 pagination rules.

### StatusBadge

Displays card status and favorite state:

- `reviewing` → `复习中`.
- `mastered` → `已熟记`.
- favorite → `已收藏`.

### MediaPreview

Handles supported local media display states:

- video.
- image.
- audio.
- unavailable with exact text `文件不可用`.

Phase 5 tests the component with props. Real detail-page media wiring waits for Phase 6.

### ConfirmDialog

Reusable confirmation dialog for later delete flows. Phase 5 verifies rendering and confirm/cancel callbacks.

### UI states

- `LoadingState`: `加载中…`.
- `EmptyState`: caller-provided message and optional action.
- `ErrorState`: error message and optional retry action.

## Error handling

- API boundary failures throw `ApiError`.
- Pages catch API errors and render `ErrorState`.
- Homepage does not substitute zero counts when API fails.
- Component-level validation display is supported through `FormField`, but real form validation rules remain in Phase 6/7.

## Styling

Use Tailwind classes in components, matching existing minimal app style:

- Slate background.
- White content cards.
- Blue primary action.
- Rounded panels and subtle borders.
- Readable Chinese-first UI.
- Desktop/tablet friendly minimum layout.

No design-system package is introduced.

## Tests

Client tests should cover:

- App renders side navigation and current page content.
- Navigation changes route and highlights current page.
- All nine V1 routes render without crashing.
- HomePage loading, success, and error states.
- API client JSON success, JSON error, text error, query string behavior, blob download, and form-data upload header behavior.
- Button variants and disabled behavior.
- Pagination callbacks and page-size options.
- MediaPreview unavailable state shows `文件不可用`.
- ErrorState retry callback.

Verification commands:

```bash
npm run test -- tests/client
npm run typecheck
npm run build
```

Manual browser check after implementation:

- Start dev app.
- Open local frontend.
- Click all visible navigation items.
- Confirm all nine page routes render.
- Confirm no local API, CLI, AI, sync, OCR, ASR, browser extension, mobile packaging, or Anki UI appears.

## Acceptance criteria

- Phase 5 stays within foundation scope.
- Sidebar navigation works and highlights current page.
- All V1 page routes render.
- Homepage uses real `/api/statistics/home` data.
- API errors display clearly.
- Shared API modules exist for current backend endpoints.
- Shared UI components are reusable by Phase 6/7.
- Tests, typecheck, and build pass.
- No future-scope UI is exposed.
