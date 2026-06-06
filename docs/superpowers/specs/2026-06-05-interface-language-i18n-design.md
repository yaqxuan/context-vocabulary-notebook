# Interface Language i18n Design

## Goal

Make `interface_language` control all user-visible UI copy in the client.
When a user selects any supported interface language, the whole app should
render that language without page reload.

Supported languages are the current eight values:

- 中文
- 英语
- 日语
- 韩语
- 法语
- 德语
- 西班牙语
- 俄语

## Scope

Translate all user-visible client UI text:

- Global shell: brand, navigation labels, navigation descriptions, page titles,
  page subtitles, accessibility labels.
- Pages: home, card creation, card list, card detail, review, tags, favorites,
  statistics, settings, and placeholder states.
- Shared states and controls: buttons, loading messages, empty states, errors,
  validation messages, success messages, pagination, filters, placeholders.
- Settings subfeatures: learning/interface settings, AI API configuration,
  import, export, scan results, conflict handling, execute results.

Do not translate user-owned data:

- Card words, meanings, sentences, notes.
- Tag names created by users.
- Uploaded file names and media paths.
- Raw server/API error details when preserving exact error text helps debugging.

## Recommended Approach

Use a lightweight in-repo i18n layer rather than adding a dependency.

New client module:

```text
src/client/i18n/
  I18nProvider.tsx
  translations.ts
  types.ts
```

### `translations.ts`

Owns the translation dictionaries. Chinese is the source language and fallback.
All eight languages must expose the same key set.

Keys should describe intent, not current wording:

```ts
settings.learning.title
settings.learning.interfaceLanguage
settings.learning.save
nav.home.label
nav.home.description
```

Support simple interpolation for dynamic strings:

```ts
t('cards.list.total', { count: total })
```

### `types.ts`

Defines shared i18n types:

- `UiLanguage = SupportedLanguage`
- `TranslationKey`
- interpolation params type
- translator function type

`TranslationKey` should be derived from the Chinese dictionary so TypeScript
catches unknown keys.

### `I18nProvider.tsx`

Responsibilities:

1. Fetch `/api/settings` on app startup.
2. Normalize `interface_language` with `normalizeSupportedLanguage`.
3. Fall back to `DEFAULT_INTERFACE_LANGUAGE` when missing or legacy value is
   unsupported.
4. Expose:
   - `language`
   - `setLanguage(language)`
   - `t(key, params?)`
   - loading/error state if needed by the app shell
5. Translate missing keys from Chinese fallback.

The provider should live at the app root so all pages share one language state.

## Data Flow

1. App mounts.
2. `I18nProvider` fetches settings.
3. Provider normalizes `interface_language`.
4. Components call `useI18n().t(key, params)` for UI copy.
5. User opens Settings and changes interface language.
6. Settings page sends existing `PATCH /api/settings` payload.
7. On success, Settings page calls provider `setLanguage(updated.interface_language)`.
8. React re-renders the whole app in the new language without refresh.

The server remains the persistence layer only. Translation stays in the client.

## Component Changes

### `App.tsx`

- Wrap route rendering in `I18nProvider`.
- Move `navItems` and route metadata into functions that receive `t`.
- Keep route matching unchanged.

### `Layout.tsx`

- Receive translated nav items, title, and subtitle.
- Replace hard-coded brand and accessibility copy with translation keys.

### Pages

Each page replaces hard-coded user-visible strings with `t(...)`.

Pages should keep domain data unchanged. For example, card status may be
translated when used as UI chrome, but card content itself remains as stored.

### Settings Page

Settings page has one extra integration point: after successful save, update
provider language from the response.

If `PATCH /api/settings` fails, provider language must not change. The select
may keep the user's pending value locally, but the app shell remains on the last
saved language.

## Error Handling

- Settings fetch failure: keep Chinese fallback and let pages render.
- Unsupported persisted language: normalize or fall back to Chinese.
- Missing translation key in selected language: use Chinese fallback.
- Missing key in Chinese source dictionary: fail fast in development/tests.
- Failed language save: show translated save error and keep provider language
  unchanged.

## Tests

Add or update tests for these behaviors:

1. Translation completeness: all eight dictionaries have the same key set as
   Chinese.
2. Fallback: missing selected-language key uses Chinese copy.
3. Startup language: when `/api/settings` returns `法语`, nav and settings page
   render French UI copy.
4. Runtime switch: changing interface language and saving updates visible UI
   without reload.
5. Failed save: visible app language does not change after failed PATCH.
6. Legacy values: `zh-CN`, `en-US`, and existing aliases normalize correctly.
7. Existing page tests: assertions use translated text for the mocked language.

## Migration Notes

Existing persisted values may include legacy aliases such as `zh-CN` or `en-US`.
The client already normalizes aliases; keep this behavior. No database migration
is needed.

## Acceptance Criteria

- Selecting any of the eight interface languages changes all app UI chrome and
  page copy to that language after save.
- Language switch happens without full page reload.
- All eight translation dictionaries pass key-completeness tests.
- User data remains untranslated.
- Existing settings API contract remains unchanged.
- Existing app tests pass after updating expected UI text.
