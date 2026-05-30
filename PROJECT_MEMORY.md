# Project Memory

## Product source of truth

`require.md` is the authoritative first-version requirements document. Use it before changing product behavior, data models, UI flows, review scheduling, import/export, search, tags, or media handling.

## First-version scope

Context Vocabulary Notebook is a local-first lightweight vocabulary review app for words collected from real video contexts. Version 1 focuses on manual card creation, local video context, optional screenshots/audio, tags, FSRS review, search, statistics, and zip import/export.

Do not add built-in dictionaries, pronunciation/phonetics, AI auto-card creation, card rollback, source tables, website video links, sync, local API/CLI, MCP, OCR, ASR, subtitle extraction, browser extensions, mobile packaging, Anki export, or other future extensions unless the user explicitly approves scope expansion.

## Technical stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite via better-sqlite3
- Spaced repetition: ts-fsrs
- Styling: Tailwind CSS

## Domain model invariants

- Review unit is `word_sense_cards`: one target word plus one concrete contextual meaning.
- A word sense card can have many `context_examples`; review, status, favorite, tags, and FSRS state belong to the card.
- Each card should have one primary context example. If none is manually set, use the earliest non-deleted context; if no contexts remain, UI shows `暂无语境`.
- Context example order uses `sort_order` increments of 10; version 1 reorders with up/down swaps.
- Tags handle free classification and source marking. No separate source table.
- Soft delete is default for cards, contexts, media, and tags; review logs are not cascade-deleted.

## Review rules

- Review page shows the full primary-context sentence and highlights the target word; target word is not hidden.
- User recalls the contextual Chinese meaning, then rates only `Again` or `Good`.
- User-visible status is `reviewing` or `mastered`; mastered cards stay out of the review queue while preserving FSRS state.
- New cards immediately get FSRS state `New` with `due_date = created_at`.
- Due queue filters `reviewing`, non-deleted cards with `due_date <= now`, sorted by `due_date ASC`, `created_at ASC`, `id ASC`.
- Daily review limit is a soft goal/reminder, not a hard stop.

## Media and data handling

Version 1 supports local files only: video `mp4`, audio `mp3`, images `jpg/png/webp`. Database stores file metadata and local paths; real files live under `uploads`. Imported missing files keep media records with `is_available = false`.

Marked exports include review state, FSRS state, logs, favorites, settings, and media. Pure-card exports exclude user-specific review/settings data and reinitialize FSRS on import.
