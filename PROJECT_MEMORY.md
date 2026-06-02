# Project Memory

## Product source of truth

`require.md` is the authoritative first-version requirements document. Use it before changing product behavior, data models, UI flows, review scheduling, import/export, search, tags, or media handling.

## First-version scope

Context Vocabulary Notebook is a local-first lightweight vocabulary review app for words collected from real video contexts. Version 1 focuses on manual card creation, local video context, optional screenshots/audio, tags, FSRS review, search, statistics, and zip import/export.

Do not add built-in dictionaries, pronunciation/phonetics, AI auto-card creation, card rollback, source tables, website video links, sync, local API/CLI, MCP, OCR, ASR, subtitle extraction, browser extensions, mobile packaging, Anki export, or other future extensions unless the user explicitly approves scope expansion.

## UI review gate

Each user-facing page must have its own independent draft before implementation. The draft should show page structure, main content, states, and visual direction clearly enough for user review. For visual page drafts, write a local HTML file under `docs/superpowers/mockups/` instead of trying to show images in the terminal. Do not implement or mark the page accepted until the user says the draft feels close enough. Apply this especially to Phase 6 and Phase 7 pages where functionality and visual polish are built together.

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

Version 1 supports local files only: video `mp4`, audio `mp3`, images `jpg/png/webp`. Database stores file metadata and local paths; real files live under `uploads`. Imported missing files keep media records with `is_available = false`. On the create page, video is optional but strongly recommended. If the user enters a target word and meaning that exactly match an existing card, hide the create-new option and save as another context example under that existing word sense card; same-word but different-meaning cards are informational only.

Marked exports include review state, FSRS state, logs, favorites, settings, and media. Pure-card exports exclude user-specific review/settings data and reinitialize FSRS on import.

## V1 closeout state

As of 2026-06-02, V1 closeout blockers are resolved locally on `main`: import merge preserves the one-primary-context invariant, unit/integration tests pass, production build passes, and Playwright browser smoke exists and passes for create + media upload + review + statistics + settings. The simulated verification card `phase6probe620034` in the local production DB was soft-deleted. Remote push still requires explicit user approval.

## Future personalization idea

The user wants Phase 8A homepage personalization to separate **问候语 / greeting** from **文案 / copy line**. Homepage greetings use the user's familiar/UI language only (Chinese in the current example), not bilingual display, and are selected from the user's 130 Chinese candidates by weekday/weekend plus time band: 04:00-07:00, 07:00-11:00, 11:00-13:00, 13:00-18:00, 18:00-21:00, 21:00-23:00, and shared 23:00-04:00. The full 130-line source lives at `/home/aq/.claude/paste-cache/07cdb6fdea0b2371.txt`; backup transcript is `/home/aq/.claude/projects/-home-aq-projects-vocabulary-notebook/6e777681-3ca4-47af-adf8-5056d66475b9.jsonl`, user message around `2026-05-31T15:33:41.451Z`. Time bands are for greetings, not for the bilingual copy line. Homepage greetings should use the current local time's weekday/weekend time-band bucket and avoid immediate repeats when practical (at minimum, do not select the same greeting as the previous selection when the active bucket has more than one option). Do not include holiday logic. Separate poetic/playful bilingual copy is still desired, but no longer motivational; it should be one copy line per local day, future versions may use AI/API generation, and Phase 8A may use one local placeholder sentence until placement/design is decided. Statistics page should show the recent 14-day review quantity chart and an additional historical monthly quantity view grouped by month.
