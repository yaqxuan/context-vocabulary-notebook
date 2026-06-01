# V1 Gap Fixes Design — Detail Actions and Review Empty State

Date: 2026-06-01
Project: Context Vocabulary Notebook
Source: V1 closeout audit against `require.md`

## Scope

Fix direct first-version gaps found in the audit:

1. Detail page exposes required actions from `require.md §11.4`:
   - Add a new context example.
   - Edit contextual meaning.
   - Edit tags.
2. Review empty state exposes required navigation from `require.md §6.9` and `§11.5`:
   - Return home.
   - View all word sense cards.

Do not redesign the whole detail page. Do not add card history, rollback, dictionaries, AI, sync, or other future-scope features.

## Chosen approach

Use the light inline approach approved by the user.

### Detail page

Keep the current detail page structure:

- Top summary: target word, contextual meaning, favorite/status/delete actions.
- Main content: all context examples with ordering, primary, and delete actions.
- Side rail: review info and tags.

Add only missing V1 actions:

- `添加语境` button in the top action row.
- `编辑释义` button next to the contextual meaning.
- `编辑标签` button in the tag side rail.

### Add context flow

`添加语境` navigates to the create page with the existing card id:

```text
#/create?card_id=<card-id>
```

The create page loads that card and enters append-to-existing mode:

- Target word and contextual meaning display the existing card and are locked.
- User fills only new context data: sentence, note, video, screenshot, audio.
- Save uses the existing `createCard({ card_id, sentence, note })` path.
- Uploaded media attaches to the newly created context.
- On success, return to `#/cards/<card-id>`.

This reuses current media upload UI and validation instead of duplicating it inside the detail page.

### Edit meaning flow

`编辑释义` toggles a small inline form in the detail summary:

- Field: `当前语境释义`.
- Save calls `patchCard(card.id, { context_meaning })`.
- Empty value is blocked client-side with a clear message.
- Cancel restores the current saved value.
- Save success reloads the detail page.

Target word editing stays out of scope because `require.md §11.4` only names editing meaning and tags.

### Edit tags flow

`编辑标签` toggles a small inline form in the side rail:

- Load all tags with `listTags()` when entering edit mode or on page load.
- Show tag chips with selected state based on `card.tags`.
- Save calls `patchCard(card.id, { tag_ids })`.
- Empty tag selection is allowed and means no tags.
- Load failure shows local form error and leaves existing display intact.
- Save success reloads the detail page.

Tag creation/rename/delete remains on tag management page. Detail page only edits assignment.

### Review empty state

When no due cards exist, keep current message and progress:

```text
今天没有待复习内容
今日已复习 X / N
```

Add two links under the message:

- `返回首页` → `#/`
- `查看全部词义条目` → `#/cards`

Use existing `EmptyState` action slot and existing button/link styling patterns.

## Data flow

### Detail page load

1. Read card id from hash.
2. `getCard(cardId)` returns details, contexts, media, tags, FSRS.
3. Local state tracks active edit panel:
   - none
   - meaning
   - tags
   - delete card/context confirmation
4. Mutations call existing API helpers, then reload detail data.

### Create page append mode via query

1. Parse `card_id` from `#/create?card_id=<id>`.
2. If present, call `getCard(card_id)`.
3. Build save mode from loaded card instead of suggestions.
4. Disable target word and meaning fields.
5. On save, call `createCard({ card_id, sentence, note })`.
6. Upload selected media to returned context id.
7. Navigate back to detail page.

Existing suggestion-based exact-match behavior remains unchanged when no `card_id` query exists.

## Error handling

- Detail page mutation errors show the existing page error pattern or a local inline form error where more specific.
- Edit meaning rejects blank input before API call.
- Edit tags handles tag-list load failure without hiding existing assigned tags.
- Add-context mode handles missing/invalid `card_id` by showing create-page error state and a route back to cards.
- Review empty-state links require no async handling.

## Testing plan

Add or update client tests:

1. `CardDetailPage`
   - Renders `添加语境`, `编辑释义`, and `编辑标签` actions.
   - `添加语境` changes hash to `#/create?card_id=<id>`.
   - Editing meaning calls PATCH with `context_meaning`, then reloads.
   - Blank meaning shows validation error and does not PATCH.
   - Editing tags loads tag list, toggles selections, PATCHes `tag_ids`, then reloads.
2. `CardCreatePage`
   - With `card_id` query, loads card and locks target word/meaning.
   - Saves new context with `card_id`, sentence, note.
   - Uploads media to returned context and returns to detail page.
   - Existing no-query suggestion flow still works.
3. `ReviewPage`
   - Empty state contains `返回首页` and `查看全部词义条目` links.

Run verification:

```bash
npm test
npm run build
```

Browser smoke after Chrome is available:

- Open detail page.
- Edit meaning.
- Edit tags.
- Jump to add-context flow and save.
- Confirm review empty links navigate correctly.

## Out of scope

- Inline media editing for existing contexts.
- Editing target word.
- Creating tags from detail page.
- Full detail-page visual redesign.
- Browser E2E suite creation.
- Primary-context deletion invariant fix.
- Per-type upload size limits.
- Settings defaults on create page, except if touched incidentally by add-context mode.

## Implementation notes

- Use existing API helpers: `getCard`, `patchCard`, `createCard`, `uploadMedia`, `listTags`.
- Keep comment density low, matching current client code.
- Prefer small helper components inside page files only if they keep `CardDetailPage` and `CardCreatePage` readable.
- Add CSS only for new inline controls if existing classes are insufficient.
