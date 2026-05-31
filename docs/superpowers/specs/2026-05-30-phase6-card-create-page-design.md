# Phase 6 Card Create Page Design

## Scope

Build the Phase 6 `#/create` page for creating a new word sense card or adding a new context example to an existing word sense card. This page must include functional UI and visual polish together. Do not implement future-scope features outside `require.md`.

This page is independently approved before implementation per `PROJECT_MEMORY.md` UI review gate.

## Approved User Decisions

- Video is optional but strongly recommended when saving from the create page.
- Screenshot and audio are supported optional attachments.
- The same target word plus same meaning is one word sense card; multiple video scenes are multiple context examples under that card.
- The page should feel visually striking, not like a generic admin form.
- Visual direction: quiet notebook studio / cinematic study desk.

## Requirements Source

- `require.md` sections 5.1, 5.2, 5.3, 5.6, 5.7, 7, 8, 11.2.
- `PROJECT_MEMORY.md` UI review gate and V1 scope boundaries.

## Page Goal

Let the user capture a real video-context vocabulary moment quickly and safely. The page must help the user decide whether the target word is a new contextual meaning or another context for an existing meaning.

## Route

`#/create`

## Information Architecture

Desktop layout uses a two-column studio workspace:

- Main panel: card drafting form and media attachments.
- Side panel: existing word sense suggestions for the current target word.

Narrow screens stack the main panel first and suggestion panel second. The primary save action remains easy to reach.

## Visual Direction

The page should feel like a carefully lit study desk where a video clip, sentence, and meaning are being pinned into a durable vocabulary card.

Design notes:

- Use warm paper, deep ink, muted slate, and one sharp accent color.
- Avoid generic purple gradients, SaaS dashboards, and plain admin tables.
- Form fields should feel deliberate and editorial, not dense.
- Media upload blocks should feel like evidence trays / attachment cards.
- Existing word senses should look like indexed reference cards.
- Subtle depth, borders, shadows, and texture are welcome if they stay readable.

## Main Form

Fields in order:

1. Target word.
2. Current context meaning.
3. Source sentence.
4. Study language.
5. Definition language.
6. Tags.
7. Note.
8. Recommended optional local video upload.
9. Optional screenshot upload.
10. Optional audio upload.

Default languages:

- Study language: English.
- Definition language: Chinese.

Target word placeholder:

`例如：charge`

Meaning helper text:

`只写这个语境下的意思，不写完整词典释义。`

Sentence helper text:

`复习时会显示完整原句，并高亮目标单词。`

Note placeholder:

`视频名称、时间点、场景说明……`

## Existing Word Sense Suggestions

When the user types a target word, the side panel fetches existing senses for that target word.

States:

- Empty target word: prompt user to type target word.
- Loading: `正在查找已有词义……`
- Empty result: `还没有这个单词的词义条目` and default to creating new card.
- Success: list existing senses with meaning, context count if available, and status.
- Error: `已有词义加载失败，可以继续创建新条目`.

Selection options:

- If no exact target+meaning match exists, `创建新的词义条目` is available and default.
- If an exact target+meaning match exists, `创建新的词义条目` is hidden to prevent duplicate cards.
- Only exact matching existing word sense options add the current sentence/media as a new context example to that card.
- Same-word but different-meaning suggestions remain visible for reference, but cannot be selected for append from this exact-meaning form state.

Save button text:

- New card mode: `保存词义条目`.
- Existing card mode: `添加为新语境`.

If an existing sense is selected, the page should make the selected meaning clear and prevent accidental duplicate creation.

Same word plus same meaning behavior:

- Do not create duplicate cards for the same target word and same contextual meaning.
- Exact matching uses normalized target word and meaning:
  - target word: trim whitespace and compare case-insensitively.
  - context meaning: trim whitespace and compare exactly.
- If an exact target+meaning match exists, hide the `创建新的词义条目` option.
- If an exact target+meaning match exists, only the matching card shows `添加为新语境`.
- Non-matching cards for the same target word are informational only and show `不同语义，仅供参考`.
- The save button changes to `添加为新语境` when an exact match exists.
- A second scene for the same meaning is saved as another context example under the existing word sense card.
- The UI must explain exact-match append mode: `已找到相同词义：charge = 收费。这次保存会添加一个新语境，不会创建重复词义条目。`

## Media Attachments

Video is optional but strongly recommended:

- Accept only local `mp4` files.
- No website video URL input.
- Missing video does not block save.
- Invalid video format shows `仅支持 mp4 本地视频文件`.

Screenshot is optional:

- Accept `jpg`, `jpeg`, `png`, `webp`.
- Invalid image format shows clear error.

Audio is optional:

- Accept `mp3`.
- Invalid audio format shows clear error.

After upload, show file name and removal action.

## Save Behavior

New card mode submits:

- target word.
- context meaning.
- sentence.
- study language.
- definition language.
- tags.
- note.
- optional video.
- optional screenshot.
- optional audio.

Existing card mode submits:

- existing card id.
- sentence.
- note.
- optional video.
- optional screenshot.
- optional audio.

Success behavior:

- Navigate to the created or updated card detail page when possible.
- Show success message if navigation target cannot be resolved in current implementation slice.

## Validation

Required:

- Target word.
- Source sentence.
- Current context meaning only when creating a new card.

Optional:

- Tags.
- Note.
- Video.
- Screenshot.
- Audio.

Validation appears close to fields and summary errors should not hide specific field errors.

## Accessibility

- Inputs have labels.
- Errors are associated with fields.
- Suggestion cards are keyboard reachable.
- Save button state is announced through text change.
- Optional video input is clearly marked as recommended, not required.

## Testing

Component tests should cover:

- Initial render with default languages.
- Existing sense lookup loading, empty, success, and error states.
- Exact target+meaning match hides create-new mode and switches to add-to-existing mode.
- Same-word but different-meaning suggestions are informational only.
- Required target word, sentence, and meaning validation.
- File type validation for video, screenshot, and audio.
- Save calls correct API path for new card mode.
- Save calls correct API path for existing card mode.

Manual/browser verification after implementation should check:

- Page looks distinct and polished.
- Video is shown as recommended and optional before save.
- No website video URL is offered.
- Form remains usable at narrow width.
