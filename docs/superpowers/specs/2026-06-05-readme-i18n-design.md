# README i18n Design

## Goal

Make GitHub README content available in English, Japanese, Chinese, Spanish, Arabic, German, French, Italian, and Latin, while keeping Chinese as default GitHub landing page.

## Current State

- Root `README.md` is full Chinese documentation.
- No other README language variants exist.
- Project is user-facing: README and install commands are part of public GitHub onboarding.

## Scope

In scope:

- Keep `README.md` as Chinese default page.
- Add complete translations for:
  - English: `README.en.md`
  - Japanese: `README.ja.md`
  - Spanish: `README.es.md`
  - Arabic: `README.ar.md`
  - German: `README.de.md`
  - French: `README.fr.md`
  - Italian: `README.it.md`
  - Latin: `README.la.md`
- Add language switch links at top of every README file.
- Preserve code blocks, commands, URLs, env vars, file paths, package names, and project identifiers exactly unless surrounding prose requires grammar changes.
- Keep generated sections equivalent to current Chinese README content.

Out of scope:

- App UI localization.
- Installer localization.
- Automated translation pipeline.
- Changing project name, installation behavior, scripts, or generated docs markers.

## Architecture

Use root-level README variants so GitHub users can switch directly from default README without entering docs folders.

Files:

```text
README.md
README.en.md
README.ja.md
README.es.md
README.ar.md
README.de.md
README.fr.md
README.it.md
README.la.md
```

Each file starts with same language switch block:

```markdown
[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)
```

Chinese `README.md` remains default because GitHub renders root `README.md` automatically.

## Content Rules

- Translate complete README prose into each target language.
- Keep technical literals unchanged:
  - commands such as `npm ci`, `npm run build`, `git pull --ff-only`
  - paths such as `data/context-vocabulary-notebook.sqlite`, `uploads/`, `.env`
  - URLs and raw GitHub install URLs
  - env vars such as `PORT`, `DATABASE_PATH`, `UPLOADS_DIR`, `CLIENT_PORT`, `CVN_HOME`
  - product terms and package names such as React, Vite, Express, SQLite, better-sqlite3, FSRS
- Keep Markdown heading hierarchy and section order aligned across languages.
- Keep auto-generated marker comments in every file where translated tables are copied, so future updates remain recognizable:
  - `<!-- AUTO-GENERATED:ENV -->`
  - `<!-- /AUTO-GENERATED:ENV -->`
  - `<!-- AUTO-GENERATED:SCRIPTS -->`
  - `<!-- /AUTO-GENERATED:SCRIPTS -->`
- For Arabic, translate prose into Arabic but keep code blocks, inline code, URLs, and commands unchanged for LTR readability in GitHub Markdown.

## Data Flow

No runtime data flow changes. This is documentation-only.

User flow:

1. User opens GitHub repository.
2. GitHub shows Chinese `README.md` by default.
3. User clicks language switch link.
4. GitHub opens matching `README.<lang>.md` file.
5. User can switch back to Chinese or any other language from that page.

## Error Handling

Documentation has no runtime errors. Main risks are broken links, mistranslated commands, or missing files.

Mitigation:

- Verify all language switch targets exist.
- Verify every README has language switch links.
- Verify commands, URLs, file paths, and generated markers are preserved.
- Run project validation commands to confirm documentation changes did not break build or tests.

## Testing and Verification

Before PR:

- Check working tree only contains intended README/spec changes and pre-existing unrelated files remain untouched.
- Run a script or shell checks that every language file exists and contains links to all 9 README files.
- Compare key technical literals across files for preservation.
- Run `npm run build`.
- Run `npm test` if time/cost is acceptable; documentation-only changes should not need app code edits, but tests are useful before publishing.

After merge to `main`:

- Verify GitHub default README displays Chinese.
- Verify GitHub links for all language README files open on main.
- Verify raw URLs for language README files return content.

## Release Flow

Because this is GitHub-user-visible documentation:

1. Create changes on branch.
2. Commit changes.
3. Open PR.
4. Merge PR to `main`.
5. Verify GitHub main/default README and language links.
6. Report PR, merge status, and verification results.
