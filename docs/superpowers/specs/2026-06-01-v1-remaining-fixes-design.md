# V1 Remaining Fixes Design

Date: 2026-06-01
Project: Context Vocabulary Notebook
Source: V1 closeout audit against `require.md`

## Scope

Fix the remaining small V1 requirement risks before browser smoke and final push:

1. Preserve the primary-context write-back invariant when deleting a primary context.
2. Enforce first-version media size limits as hard limits.
3. Make the create page read default languages from settings.

Do not add a total uploads capacity limit, uploads usage dashboard, cleanup workflow, import/export size policy, simulated-card cleanup, or remote push in this change.

## Primary-context deletion write-back

`require.md §5.4` says that if the primary context is deleted, the system automatically chooses the earliest remaining context as the new primary context.

Change `src/server/domain/contexts.ts`:

- Before soft-deleting a context, read its active row.
- In the same transaction:
  1. Soft-delete media files for that context.
  2. Soft-delete the context and set `is_primary = 0`.
  3. If the deleted context had `is_primary = 1`, query remaining active contexts for the same card ordered by `created_at ASC, id ASC`.
  4. If a remaining context exists, set that context to `is_primary = 1` and update `updated_at`.
- If no remaining context exists, leave the card with no primary row; UI/query fallback remains `暂无语境`.

This keeps the display fallback and also preserves the database invariant for future direct `is_primary = 1` queries.

## Media size hard limits

The user chose hard limits for the V1 media size guidance in `require.md §7`.

Limits:

- image: 10 MiB
- audio: 50 MiB
- video: 300 MiB

Add shared constants near media type constants:

```ts
MEDIA_SIZE_LIMITS_BYTES = {
  image: 10 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 300 * 1024 * 1024,
}
```

Add a shared helper or message map so client and server use the same Chinese messages:

- `图片不能超过 10MB`
- `音频不能超过 50MB`
- `视频不能超过 300MB`

### Server behavior

Change `src/server/routes/media.ts`:

- Set multer's coarse max file size to the video limit by default, not 500MB.
- Keep MIME/extension validation in `fileFilter`.
- After upload and media type resolution, check `req.file.size` against the per-type limit.
- If over limit:
  - delete the uploaded file if it exists,
  - return 400 with the matching Chinese message,
  - do not create a `media_files` row.

### Client behavior

Change `src/client/pages/CardCreatePage.tsx`:

- In `handleMediaChange`, after type validation and before setting file state, check size by chosen media type.
- If file is too large:
  - clear that file state,
  - set the matching field error,
  - do not retain the selected file.
- Existing optional-media behavior remains unchanged.

No total media capacity limit is added in this change. Total storage remains bounded by disk capacity.

## Create page settings defaults

`require.md §5.1` defines default languages, and `§11.9` allows settings changes. The create page should use saved settings for new-card defaults.

Change `src/client/pages/CardCreatePage.tsx`:

- Import and call `getSettings()` on mount.
- If there is no explicit append card id:
  - set `targetLanguage` to `settings.default_target_language`, falling back to `英语`,
  - set `definitionLanguage` to `settings.default_definition_language`, falling back to `中文`.
- If settings load fails:
  - keep existing fallback defaults,
  - do not block card creation.
- If explicit append mode is active (`#/create?card_id=...`):
  - keep using the loaded card's `target_language` and `definition_language`,
  - do not let settings overwrite those values after card load.

This keeps append-to-existing context language consistent with the existing word sense card.

## Tests

Add or update tests:

1. Server context tests:
   - deleting a primary context promotes the earliest remaining context to `is_primary = 1`,
   - deleting the only context leaves no active primary and does not throw.
2. Server media tests:
   - image over 10 MiB returns 400 with `图片不能超过 10MB` and creates no media row,
   - audio over 50 MiB returns 400 with `音频不能超过 50MB`,
   - video over 300 MiB returns 400 with `视频不能超过 300MB`.
3. Client create-page tests:
   - settings defaults are applied for new-card mode,
   - settings load failure keeps `英语` / `中文`,
   - explicit append mode uses the card's languages and is not overwritten by settings,
   - oversized video/image/audio selections show the matching error and are not accepted.

Verification commands:

```bash
npm test
npm run build
```

## Out of scope

- Total uploads directory limit.
- Uploads usage display in settings.
- Automatic media cleanup.
- Import/export file-size or total-size policy changes.
- Browser smoke execution.
- Simulated verification-card deletion.
- Remote push.
