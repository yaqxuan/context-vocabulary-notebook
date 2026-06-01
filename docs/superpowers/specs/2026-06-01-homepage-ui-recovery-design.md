# Homepage UI Recovery Design

## Status

Draft for user review. No React implementation yet.

Mockup:

`docs/superpowers/mockups/homepage-ui-recovery-mockup.html`

## Problem

Phase 8A greeting logic is functional, pushed, and should remain intact. The homepage visual integration failed because the greeting was treated as a small text patch instead of a page-level design. The first recovery mockup also failed because it kept the current light runtime background and did not fully match the Phase 6/7 page shell. This spec makes exact Phase 6/7 shell alignment a hard requirement.

## Hard visual requirement

Homepage must use the same visual shell as Phase 6/7 mockups, not just similar cards inside the old light Layout.

Required shell traits:

- dark angled page background:
  `linear-gradient(135deg, #101827 0%, #172033 21%, #f3ead8 21.2%, #edf3ee 100%)`
- teal and amber radial glows,
- fixed grain/grid overlay,
- dark sticky sidebar with a larger, more substantial book-mark brand,
- jade active navigation item,
- filled sidebar rhythm: navigation plus a today summary card so the left column does not feel empty,
- warm paper main studio panel,
- large rounded panels, around 34-42px in mockup language,
- serif display text with tight negative tracking,
- heavy sans-serif kicker labels and controls,
- large ambient shadows and translucent paper surfaces.

This means the later implementation is expected to affect shared app shell styling, not only `HomePage.tsx`, unless the user explicitly narrows scope.

## Product constraints

Source of truth remains `require.md` and `PROJECT_MEMORY.md`:

- Version 1 is a local-first vocabulary review app.
- Homepage should support manual card creation and FSRS review workflows.
- No AI/API copy generation, holiday logic, dictionary, pronunciation, sync, OCR, ASR, subtitle extraction, or other future-scope expansion.
- Greeting text is Chinese/user-language only and selected by existing local Phase 8A logic.
- Bilingual poetic/playful copy remains future scope and is not shown here.
- Daily review target is a soft reminder, not a hard stop.

## Phase 6/7 visual language extracted

Relevant references:

- `src/client/styles.css`
- `docs/superpowers/mockups/phase6-card-create-page-mockup.html`
- `docs/superpowers/mockups/phase6-card-list-page-mockup.html`
- `docs/superpowers/mockups/phase7-review-page-mockup.html`
- `docs/superpowers/mockups/phase7-statistics-page-mockup.html`
- `docs/superpowers/mockups/phase7-settings-page-mockup.html`

Reusable language:

- Dark editorial shell: ink/navy left wedge, warm paper right field.
- Warm paper surfaces: `#fff7e8`, `#fffdf6`, translucent panels.
- Ink primary text: `#172033` with tight display letter spacing.
- Teal/jade accents: `#0f766e`, `#2dd4bf` for active, progress, and positive states.
- Amber glow as atmosphere, not primary UI action color.
- Large rounded containers, 34px+ in mockups.
- Serif display titles paired with sans-serif labels, helpers, controls.
- Homepage welcome hierarchy: large `欢迎回来` display line, then smaller airy greeting text below.
- Soft but large ambient shadows for page-level panels, lighter shadows for metric cards.
- Kicker labels: small uppercase sans-serif, heavy weight, wide tracking.
- Data panels are calm and readable; no dense dashboard noise.

## Approaches considered

### A. Upgrade shared Layout shell to Phase 6/7 style (recommended)

Make the real app shell match Phase 6/7 mockups: dark angled background, grain, dark sidebar, warm main canvas. Then implement homepage within that shell.

Pros:

- Only option that satisfies “style must be exactly the same.”
- Avoids fake standalone mockup that cannot exist in the real app.
- Makes homepage, review, statistics, settings, and future pages share one visual system.

Cons:

- Broader than a single `HomePage.tsx` edit.
- Requires cross-page visual regression review.

### B. Homepage-only shell imitation

Make homepage render its own Phase 6/7 shell while other pages keep current Layout.

Pros:

- Smaller code diff.

Cons:

- Creates two app shells.
- Repeats prior failure mode: mockup looks strong but does not honestly represent shared app structure.
- Not recommended.

### C. Card-only recovery inside old Layout

Keep current light Layout and restyle homepage content only.

Pros:

- Lowest implementation risk.

Cons:

- Already rejected because page background/shell does not match other Phase 6/7 pages.
- Does not satisfy exact-style requirement.

Recommendation: Approach A.

## Proposed homepage structure

The revised mockup uses the Phase 6/7 shell:

```text
[Dark angled page background + grain]
[Dark sticky sidebar]
  brand: 语境单词本 / Review Desk
  active nav: 首页
[Main]
  route title: 首页
  route subtitle: 今日概览 · 本地问候 · 复习入口
  [Warm paper home studio]
    [Hero]
      kicker: LOCAL GREETING
      large display line: 欢迎回来
      smaller airy Chinese greeting from getHomeGreeting()
      short local helper line
      actions: 开始复习 / 快速制卡
      progress card: reviewed_today_count / daily_review_limit
    [Metric cards]
      今日待复习
      今日已复习
      Again
      Good
    [Lower row]
      review rhythm summary
      daily target reminder
```

## Content rules

- Greeting remains Chinese/user-language only.
- `欢迎回来` is a stable UI welcome label shown above the greeting.
- Greeting text should be visually lighter and more airy than the welcome label; use a Songti/Noto Serif SC/STSong-style fallback stack when practical, wider letter spacing, and lower visual weight.
- Kicker may be English uppercase because Phase 6/7 mockups already use English system labels such as `REVIEW ANALYTICS`; it is a UI label, not the personalized greeting.
- No bilingual poetic copy line.
- No motivational copy system.
- Helper sentence must be stable local text, not AI-generated.
- Do not show time bucket, weekday/weekend, storage key, or selection internals.

## Behavior rules

Unchanged:

- `getHomeGreeting()` remains source of greeting text.
- `getHomeStatistics()` remains source of counts.
- Loading state renders `LoadingState` only.
- Error state renders `ErrorState` only; no greeting or fake stats.
- Success state renders greeting, stats, target reminder, and action links.
- `开始复习` links to `#/review`.
- `快速制卡` links to `#/create`.

Daily target reminder:

- If `is_daily_target_reached` is false, show `今天可以继续积累和复习`.
- If true, show `今日复习目标已完成`.
- Reminder stays secondary. It should not block review.

Progress card:

- Uses existing `reviewed_today_count` and `daily_review_limit`.
- Visual progress percentage is decorative; accessible text remains count-based.
- If implemented, cap visual width at 100% when reviewed count exceeds limit.

## Implementation boundaries for later

Likely file scope after user approval:

- `src/client/components/Layout.tsx`
- `src/client/styles.css`
- `src/client/pages/HomePage.tsx`
- `tests/client/homePage.test.tsx`
- possible layout/navigation tests if present or needed

Do not change:

- `src/client/lib/homeGreetings.ts`
- greeting phrase bank
- localStorage behavior
- backend/API/database
- routing
- review scheduling logic

## Testing and review plan for later implementation

Automated checks:

- homepage loading state still appears first.
- success state shows greeting and stats from API response.
- action links still point to `#/review` and `#/create`.
- daily target reached message renders when true.
- API error state hides greeting and fake counts.
- existing page tests still pass after shared Layout styling changes.

Manual visual review:

- homepage shell matches Phase 6/7 mockups at page-background level.
- sidebar, active nav, route title, and warm panels align with Phase 6/7 visual language.
- sidebar feels substantial, not like a narrow nav strip with unused dark space.
- welcome/greeting hierarchy reads as: large `欢迎回来`, smaller airy time-based greeting below.
- review/statistics/settings pages do not visually regress after shared Layout upgrade.

Avoid tests that assert decorative class names.

## Acceptance criteria

- Homepage background, grain, sidebar, and warm panel style match Phase 6/7 shell, not old light Layout.
- Mockup includes full app shell/sidebar and route title context.
- Greeting no longer appears as a bare patch above stats.
- `欢迎回来` is the hero headline; the selected time-based greeting sits below it, smaller and lighter.
- Sidebar uses stronger brand scale and a today summary card to reduce awkward empty space.
- Homepage remains a calm review desk, not a busy analytics dashboard.
- No Phase 8A mockup files starting with `phase8a` are recreated.
- No new product scope is introduced.
- Implementation does not begin until user approves this design direction.

## Self-review

Placeholder scan: no incomplete placeholder markers.

Consistency check: recommended approach now explicitly requires shared shell alignment and acknowledges larger implementation scope.

Scope check: focused on homepage UI recovery plus necessary shared shell styling. Product behavior remains unchanged.

Ambiguity check: exact background, shell traits, behavior, file scope, and acceptance criteria are explicit.
