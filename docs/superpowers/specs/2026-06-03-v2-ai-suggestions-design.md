# V2 AI Suggestions Design

## Scope

Version 2 adds one product feature: AI suggestions during card creation. It also adds Settings-page AI API configuration required to power that feature. No dictionary lookup, pronunciation, OCR/ASR, subtitle extraction, AI auto-card creation, sync, or other AI workflows are in scope.

## User flow

On the create page, field order becomes:

1. 原句 / 语境句子
2. 目标单词 / 生词
3. 当前语境释义
4. AI 建议 / context usage note
5. Existing language, tag, media, and save controls

After sentence and target word are present, the app asks the active AI config for two suggestions:

- `meaning_suggestion`: one short Chinese contextual meaning for the word in the sentence.
- `usage_note`: one short explanation of how the word is used in that sentence.

The meaning suggestion is ghost text in the 释义 input while the user has not typed a meaning. Pressing Enter accepts it. Pressing Backspace clears it. Typing any other value overrides it.

The AI usage note uses the existing context `note` storage. If AI returns a note, the textarea is filled with that suggestion only while the user has not typed there; the user may keep, modify, or delete it. If no AI note exists, the section displays `none`.

Existing same-word/same-meaning duplicate detection remains. Exact match still forces append-to-existing mode.

## Settings flow

Settings adds an AI API section. It manages OpenAI-compatible generic configs. Each config has:

- display name
- Base URL
- model name
- API Key
- active flag

There is no product-level maximum number of configs. One config is active at a time. API Keys are stored locally, masked in UI, never returned in list responses, and never included in exports. Importing a marked export restores normal V1 settings only; AI API keys are not imported.

## Backend architecture

Add an `ai_configs` SQLite table and focused backend modules:

- `src/server/domain/aiConfigs.ts`: CRUD, active switching, masked DTO mapping.
- `src/server/domain/aiSuggestions.ts`: prompt building, OpenAI-compatible chat-completions request, JSON response parsing.
- `src/server/routes/aiConfigs.ts`: REST routes for config management.
- `src/server/routes/aiSuggestions.ts`: route used by create page.

The server calls the external AI endpoint so API Keys never reach the browser. The OpenAI-compatible request uses `POST {base_url}/chat/completions` with `Authorization: Bearer <api_key>`, selected model, low temperature, and JSON-only instruction. Invalid/missing config returns a controlled empty suggestion rather than blocking manual card creation.

## Frontend architecture

Add client API modules for AI configs and AI suggestions. SettingsPage gets a compact AI config manager below learning settings and above import/export. CardCreatePage keeps existing local state and adds suggestion state with debounce and stale-request guard.

## Error handling

- No active config: create page shows AI suggestion as `none`; manual creation continues.
- AI request failure: show non-blocking message; manual creation continues.
- Invalid config save: server returns 400 and settings UI shows error.
- Deleting active config activates none; create page falls back to `none`.
- Export/import excludes AI API keys by design.

## Testing

Use TDD for each layer:

- Schema tests for `ai_configs` table.
- Server tests for AI config CRUD, active switching, masked responses, validation, key non-export.
- Server tests for AI suggestion route using mocked `globalThis.fetch`.
- Client tests for Settings AI config UI and CardCreatePage ghost/accept/clear behavior.
- Existing card create, settings, import/export tests remain passing.

## Self-review

- No placeholders remain.
- Scope stays limited to card-creation AI suggestions and needed settings.
- API keys are never exported or returned in list DTOs.
- Existing V1 duplicate-card and import/export behavior is preserved.
