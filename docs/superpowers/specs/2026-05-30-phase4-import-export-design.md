# Phase 4 Import and Export Backend Design

## Scope

Implement backend-only V1 zip import/export from `require.md` section 10. The feature supports marked exports for personal backup/migration and pure-card exports for sharing. It does not add sync, CLI, external storage, Anki export, or frontend UI.

## API

- `GET /api/export?type=marked|pure`
  - Returns a zip file containing `export.json` and `uploads/` entries for available media.
- `POST /api/import/scan`
  - Multipart form field `file` contains a zip.
  - Reads and validates `export.json`, scans conflicts, and returns counts, conflicts, and missing media.
  - Writes nothing to the database or uploads folder.
- `POST /api/import/execute`
  - Multipart form fields `file` and `decisions`.
  - `decisions` supports `skip_all`, `merge_all`, `import_all_as_new`, or `per_item` decisions.
  - Applies import in one database transaction.

## Export data model

`export.json` uses `schema_version: 1`, `export_type: marked | pure`, `exported_at`, cards, contexts, media files, tags, and card-tag relationships.

Marked exports also include card favorite/status fields, FSRS states, review logs, and singleton user settings. Pure-card exports omit user-specific review/progress/settings data.

## Import data model

All imported ids are remapped to new local ids. Conflict detection uses exact active local `target_word + context_meaning` matches.

Pure-card import initializes each imported card with `status = reviewing` and a new FSRS state at import time: `state=0`, `reps=0`, `lapses=0`, `last_reviewed_at=NULL`, and `due_date=import time`.

Marked import preserves favorite/status, FSRS state, review logs, and settings for newly imported cards. If a marked conflict is merged into an existing card, imported contexts/media/tags attach to the existing card and imported card-level FSRS/review logs are ignored because the existing local card owns review history.

Duplicate imported context `sort_order` values are normalized per card to `10, 20, 30...`. If a card has no primary context after import normalization, the earliest context becomes primary.

## Media handling

Zip media entries must stay under `uploads/` and may not contain traversal paths. Existing media files are copied into the app uploads directory with generated safe filenames. Missing zip media keeps a database media record with `is_available = 0` so the UI can show `文件不可用`.

## Error handling

Invalid zip files, missing `export.json`, unsupported schema versions, invalid export types, malformed decision payloads, and unsafe zip paths return `400`. File system writes are path-guarded. Import execution uses a database transaction so partial database imports do not persist.

## Tests

Add `tests/server/importExport.test.ts` covering zip structure, marked export payload, pure export omissions, conflict scan, all four conflict decision modes, pure FSRS reset, marked preservation for new cards, merge behavior, missing media, path traversal rejection, and sort-order normalization. Verification must pass `npm run test -- tests/server/importExport.test.ts` and `npm run typecheck`.
