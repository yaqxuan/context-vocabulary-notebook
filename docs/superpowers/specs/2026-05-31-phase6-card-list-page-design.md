# Phase 6 Card List Page Design

## Scope

Build the Phase 6 `#/cards` page for browsing and managing word sense cards. This page must support search, pagination, tag/status/favorite filters, favorite visibility, review status actions, and detail navigation. It should keep the same cinematic notebook-studio visual language established by the card create page.

This page is independently approved before implementation per `PROJECT_MEMORY.md` UI review gate. Approved local HTML draft: `docs/superpowers/mockups/phase6-card-list-page-mockup.html`.

## Requirements Source

- `require.md` sections 5.4, 5.6, 5.7, 8, 11.3.
- `PROJECT_MEMORY.md` UI review gate and V1 scope boundaries.
- Existing API wrapper: `src/client/api/cards.ts` exposes `listCards()` and `patchCard()`.

## Approved User Decisions

- Next page after card create is the word sense card list page.
- Information density should use the recommended **search desk / catalogue workspace** direction.
- User approved the local HTML mockup direction on 2026-05-31.

## Page Goal

Let the user quickly find, filter, scan, and manage accumulated word sense cards. The page is an index and control surface, not a deep editor. Deep context/media editing belongs on the card detail page.

## Route

`#/cards`

## Information Architecture

Desktop layout uses a catalogue workspace:

- Hero/search desk: page title, short explanation, quick create entry, search input, tag/status/favorite filters, clear filters.
- Main list panel: paginated cards sorted by `updated_at DESC`.
- Right inspector: summary metrics and quick tag filters when data is available.
- State strip or inline states: loading, empty results, error.

Narrow screens stack the hero, filters, list, and inspector in one column.

## Visual Direction

Continue the card create page's quiet notebook-studio language, but shift the metaphor from drafting desk to catalogue/index desk.

Design notes:

- Warm paper surface, deep ink shell, jade accent, amber highlight.
- Cards should feel like indexed reference slips, not generic SaaS list rows.
- Search/filter controls should feel like a desk console, visible before the list.
- Preserve readability and scan speed over decorative complexity.
- Avoid table-first admin UI, generic purple gradients, and dictionary-like feature creep.

## Data and API Behavior

Initial load calls:

- `GET /api/cards?page=1&page_size=20`
- `GET /api/tags` for tag filter choices.

List requests use existing `listCards()` parameters:

- `search`: fuzzy search over target word, context meaning, sentence, tags, note.
- `status`: `reviewing` or `mastered`.
- `favorite`: `true` or `false` when selected.
- `tag_id`: selected tag id.
- `page`: current page.
- `page_size`: `20`, `50`, or `100`.

Default sorting is server-defined `updated_at DESC` per `require.md`.

Changing search, filters, or page size resets `page` to `1`. Pagination controls change only `page`.

## Visible Card Fields

Each list item shows:

- Target word.
- Context meaning.
- Primary context sentence summary.
- Tags.
- Review status: `复习中` or `已熟记`.
- Favorite state.
- Detail navigation.

If current API summaries do not yet include primary sentence, tags, or context count, implementation should either:

1. Extend the list API/DTO to include list-safe display fields; or
2. Temporarily render unavailable fields as subdued placeholders only if backend expansion is deferred.

Preferred implementation is extending the list API/DTO because `require.md` requires list page to show primary context sentence and tags.

Recommended list DTO additions:

- `primary_sentence: string | null`
- `tags: TagDto[]`
- `context_count: number`

Fallback display for missing primary context: `暂无语境`.

## Search and Filters

Controls:

1. Search input with placeholder `搜索单词、释义、原句、标签或备注`.
2. Tag filter select; default `全部标签`.
3. Status filter select; options `全部状态`, `复习中`, `已熟记`.
4. Favorite filter select; options `全部`, `仅收藏`, `未收藏`.
5. Page size select; options `20`, `50`, `100`.
6. Clear filters button.

Search should debounce before refetching to avoid request spam. A 250-300ms debounce is enough.

## Actions

Per-card actions:

- `查看详情`: navigate to `#/cards/:id`.
- If status is `reviewing`, show `标记熟记` and call `PATCH /api/cards/:id` with `{ status: 'mastered' }`.
- If status is `mastered`, show `恢复复习` and call `PATCH /api/cards/:id` with `{ status: 'reviewing' }`.
- Favorite toggle may be shown as a star control if implementation uses existing `patchCard()` with `{ is_favorite: boolean }`.

Action success updates the list in place or refetches the current page. Refetch is simpler and acceptable for V1.

Deletion does not belong on the list page unless user explicitly approves it. Delete flow belongs better on detail page because `require.md` requires confirmation and cascade soft delete affects contexts/media.

## Pagination

Pagination uses `PaginatedResult<CardSummaryDto>`:

- Show total count.
- Show current page and total pages.
- Previous/next buttons.
- Keep page size choices `20 / 50 / 100`.
- Disable previous on page 1.
- Disable next on final page.

If current page becomes empty after filters or status changes, reset to page 1 and refetch.

## States

Loading:

- Show skeleton reference cards while preserving visible filter controls.

Empty unfiltered:

- Message: `还没有词义条目`.
- Primary action: `去制卡` linking to `#/create`.

Empty filtered:

- Message: `没有匹配的词义条目`.
- Actions: `清除筛选`, `去制卡`.

Error:

- Show error message.
- Preserve current search/filter controls.
- Provide retry button that refetches current query.

## Accessibility

- Search input and filters have labels.
- Status/favorite buttons use clear text, not icon-only state.
- Loading and error states use accessible status/alert semantics.
- Detail links are keyboard reachable.
- Pagination buttons expose page direction and disabled state.
- Favorite star, if used, has text or `aria-label` with current state.

## Testing

Component tests should cover:

- Initial load requests cards and tags with default pagination.
- Render of card list fields: word, meaning, primary sentence, tags, status, favorite state.
- Search/filter changes call `listCards()` with expected query params and reset page.
- Empty unfiltered state shows create entry.
- Empty filtered state shows clear filters action.
- Error state shows retry and preserves controls.
- Pagination next/previous and page size behavior.
- `标记熟记` calls `patchCard(id, { status: 'mastered' })` and refreshes list.
- `恢复复习` calls `patchCard(id, { status: 'reviewing' })` and refreshes list.
- Detail action points to `#/cards/:id`.

Manual/browser verification after implementation should check:

- Page matches approved catalogue-desk direction.
- Search/filter controls remain usable on narrow width.
- Empty, loading, and error states are readable.
- No future-scope features appear: no dictionary, AI search, OCR/ASR, subtitle extraction, sync, or website video links.

## Out of Scope

- Editing card meaning/tags inline.
- Editing or reordering contexts.
- Showing full media previews.
- Hard delete or restore from trash.
- AI semantic search.
- Dictionary, phonetics, pronunciation, OCR, ASR, subtitle extraction.
- Bulk operations.
- Export from list page.

## Open Implementation Note

Existing `CardSummaryDto` currently lacks primary sentence, tags, and context count. Because `require.md` says the list default display includes primary context sentence and tags, implementation should extend backend list query and shared DTO rather than silently dropping those fields.
