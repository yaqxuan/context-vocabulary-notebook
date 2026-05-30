# Project instructions

Before starting any non-trivial task in this project, read `PROJECT_MEMORY.md`.

Treat `require.md` as the authoritative product requirements document. Before implementing product behavior, data models, UI flows, review logic, import/export, or media handling, read the relevant sections in `require.md` and align the work to the first-version scope.

If code, tests, or user requests conflict with `require.md`, flag the mismatch before changing behavior. Do not expand first-version scope beyond `require.md` unless the user explicitly approves it.

Use `/save-session` before ending a work session when future continuation matters.
Use `/resume-session` at the start of a new session when continuing prior work.

Keep `PROJECT_MEMORY.md` for durable project context only. Capture stable product decisions, constraints, and implementation priorities there; do not add noisy logs or temporary conversation details.
