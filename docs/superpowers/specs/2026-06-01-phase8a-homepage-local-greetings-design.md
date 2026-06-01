# Phase 8A Homepage Local Greetings Design

## Summary

Phase 8A adds a lightweight local greeting to the homepage only. The greeting is Chinese/user-language text selected from a curated local phrase bank by the current local time bucket and weekday/weekend state.

This phase does **not** display the separate poetic/playful bilingual copy line. That copy line remains a future UI/design/API area: it should be one bilingual line per local day, may later use AI/API generation, and is not motivational.

## Scope

In scope:

- Add one homepage greeting above the existing statistics cards.
- Use the user's 130 Chinese greeting candidates as the local curated source.
- Select greetings by local weekday/weekend and time bucket.
- Keep the same greeting stable for the same local date + bucket + audience.
- Avoid immediate repeats within the active bucket when practical.
- Keep all logic client-side and local.
- Add tests for bucket selection, weekday/weekend selection, stable selection, repeat avoidance, and storage fallback.

Out of scope:

- AI/API-generated copy.
- Displaying the poetic/playful bilingual copy line.
- Motivational copy.
- Holiday logic.
- Backend API changes.
- Database changes.
- Import/export changes.
- Settings UI for personalization.
- Multi-page greetings.

## Product Requirements Alignment

`require.md` says the homepage should stay action-oriented and show:

- 今日待复习数量
- 今日已复习数量
- 今日 Again / Good 数量
- 今日是否达到复习目标
- 开始复习按钮
- 快速制卡入口

The greeting is a small contextual header above these existing elements. It must not replace or visually overpower the review counts or action buttons.

## Concepts

### Greeting / 问候语

A greeting is a short Chinese/user-language sentence such as:

> 早上好，今天刚刚开始。

It is selected by:

- current local date,
- current local time bucket,
- weekday/weekend/shared audience.

The greeting is not bilingual.

### Copy line / 文案

A copy line is separate from the greeting. It is poetic or playful, bilingual, and should eventually be one line per local day. Phase 8A does not display it because placement is unresolved and future AI/API generation is still undecided.

## Time Buckets

Buckets use local time.

| Bucket | Audience |
| --- | --- |
| `04:00-07:00` | weekday or weekend |
| `07:00-11:00` | weekday or weekend |
| `11:00-13:00` | weekday or weekend |
| `13:00-18:00` | weekday or weekend |
| `18:00-21:00` | weekday or weekend |
| `21:00-23:00` | weekday or weekend |
| `23:00-04:00` | shared |

Boundary rules:

- Start is inclusive.
- End is exclusive.
- `23:00-04:00` covers `23:00 <= time < 24:00` and `00:00 <= time < 04:00`.
- Weekend is Saturday or Sunday from `Date.getDay()` values `6` and `0`.

## Data Model

Client-only types:

```ts
type GreetingAudience = 'weekday' | 'weekend' | 'shared';

type GreetingBucket =
  | '04:00-07:00'
  | '07:00-11:00'
  | '11:00-13:00'
  | '13:00-18:00'
  | '18:00-21:00'
  | '21:00-23:00'
  | '23:00-04:00';

interface GreetingSelection {
  date: string; // local YYYY-MM-DD
  bucket: GreetingBucket;
  audience: GreetingAudience;
  text: string;
}
```

Suggested module:

```text
src/client/lib/homeGreetings.ts
```

Responsibilities:

- store greeting phrase bank,
- derive local date,
- derive bucket and audience,
- choose greeting,
- read/write local storage safely,
- expose a small function for `HomePage`.

## Selection Algorithm

1. Compute local `YYYY-MM-DD` from the current date.
2. Compute active `bucket` from local time.
3. Compute `audience`:
   - `shared` for `23:00-04:00`,
   - otherwise `weekend` for Saturday/Sunday,
   - otherwise `weekday`.
4. Read current selection from key:
   - `homeGreetingSelection:${bucket}:${audience}`
5. If stored selection exists, its `date` matches the current local date, and its `text` is still in the active candidate list, return it.
6. If missing/invalid, choose a new candidate.
7. Read previous selection for this bucket/audience from key:
   - `homeGreetingLast:${bucket}:${audience}`
8. If candidate list length > 1, exclude previous `text` from candidates before choosing.
9. Choose index with deterministic pseudo-random hash based on `date + bucket + audience`.
10. Persist current selection and update previous selection.
11. Return selected text.

This gives stable behavior within a date + bucket, deterministic tests, repeat avoidance without backend state, and bounded storage growth because each bucket/audience overwrites its prior selection.

## Storage and Fallback

Use `localStorage` only. No backend persistence.

If `localStorage` read/write fails because of browser settings, test environment, or quota issues:

- do not throw,
- choose from deterministic hash,
- render greeting normally,
- skip repeat-avoidance persistence.

Clearing browser storage may change the selected greeting. That is acceptable for Phase 8A.

## Homepage UI

Placement:

- Add greeting above existing statistics grid in `HomePage`.
- Keep it visually light.
- Do not add a large hero area.
- Do not show a time label.
- Do not show the bilingual copy line.

Suggested visual hierarchy:

```text
[中文问候语]
[今日待复习] [今日已复习] [Again] [Good]
[今日目标提示]
[开始复习] [快速制卡]
```

Suggested styling:

- Greeting text: `text-2xl` or similar, strong but not huge.
- Optional subtle subtitle may be omitted to keep scope tight.
- Reuse existing spacing and Tailwind style.

## Phrase Bank

Source: `/home/aq/.claude/paste-cache/07cdb6fdea0b2371.txt`
Backup transcript: `/home/aq/.claude/projects/-home-aq-projects-vocabulary-notebook/6e777681-3ca4-47af-adf8-5056d66475b9.jsonl`, user message around `2026-05-31T15:33:41.451Z`.

The implementation should copy the phrase bank into the frontend module so the app does not depend on Claude-local files at runtime.

### 工作日 — 4:00 - 7:00

```txt
天还没亮，你已经来了。
清晨很轻，你也在。
这个点，城市还安静。
这么早，已经见到你了。
晨光还没铺开，你先到了。
早一点，也安静一点。
天色还浅，这里已经亮了。
清晨留了一点安静给你。
一天还没开始，你已经在这里。
这个时间，很少有人打扰。
```

### 工作日 — 7:00 - 11:00

```txt
早上好，今天刚刚开始。
早上好，慢慢展开。
上午好，时间还宽。
早上好，不用太赶。
新的一天，先轻轻开始。
上午的光还很干净。
早上好，先从这里看看。
今天还早，可以慢一点。
上午好，风还轻。
早上到了，一切才刚开始。
```

### 工作日 — 11:00 - 13:00

```txt
中午了，可以停一停。
快中午了，缓一缓。
上午走到这里了。
中午到了，歇一口气。
日头高了，慢一点。
午前的时间快过去了。
中午好，先放松一下。
上午差不多了，别太急。
这个时候，适合停一会儿。
中午了，给自己一点空隙。
```

### 工作日 — 13:00 - 18:00

```txt
下午好，慢慢来。
下午了，不必太赶。
午后的时间，缓一点。
下午好，先从这里开始。
阳光往后移了一点。
下午的节奏，可以轻一点。
下午了，给自己一点耐心。
这个时间，慢慢看就好。
午后容易散，先待一会儿。
下午好，不急着往前赶。
```

### 工作日 — 18:00 - 21:00

```txt
晚上好，一天慢慢收尾了。
晚上了，今天走到这里。
傍晚好，天色慢下来了。
晚上好，你又来了。
天暗下来了，这里还在。
晚上了，可以缓一缓。
今天快过去了，先坐一会儿。
晚上的时间，安静一点。
灯亮起来了，你也到了。
晚上好，今天也到这个时候了。
```

### 工作日 — 21:00 - 23:00

```txt
夜里安静，慢慢来。
晚了，不用急。
夜深一点，也安静一点。
这个时间，适合慢下来。
夜色沉下来了。
晚一点，也没关系。
夜里了，这里还亮着。
这个时候，不用赶。
夜深了，声音都轻了。
晚了，先陪你待一会儿。
```

### 周末 — 4:00 - 7:00

```txt
周末的清晨，你也来了。
这么早，周末还很安静。
周末天还没亮，你已经在。
清晨很轻，连周末也是。
周末的早风，还带着安静。
这个点的周末，很少有人醒着。
周末清晨，先在这里坐坐。
天色还浅，周末也慢慢开始。
周末这么早，已经见到你了。
清晨还没展开，你先到了。
```

### 周末 — 7:00 - 11:00

```txt
周末早上，你也来了。
周末早上，慢慢看。
周末的早晨，很适合轻一点。
周末还早，不用赶。
早上的周末，时间很宽。
周末醒来，先看看这里。
周末早上，风也慢一点。
这个早晨，适合随意一点。
周末开始了，慢慢来。
早上好，周末也见到你。
```

### 周末 — 11:00 - 13:00

```txt
中午了，来看看也好。
周末中午，慢一点。
午前的时间，还算宽。
中午到了，先停一停。
周末中午，不用太急。
日头高了，周末也慢慢过。
中午好，随便看看也好。
周末走到中午了。
午饭前，先来这里待一会儿。
这个中午，很适合缓下来。
```

### 周末 — 13:00 - 18:00

```txt
周末下午，你还记得这里。
下午了，周末也慢慢过。
周末午后，适合轻轻翻一页。
周末还长，慢慢来。
午后的周末，时间松一点。
下午好，周末也见到你。
周末下午，阳光慢慢斜了。
这个下午，可以轻一点。
周末的下午，不用太满。
下午了，先在这里歇一下。
```

### 周末 — 18:00 - 21:00

```txt
周末晚上，你也回来了。
周末晚上，天色慢下来了。
周末快收尾了，你还在。
晚上好，周末也见到你。
周末的灯亮起来了。
晚上了，周末还剩一点安静。
周末晚上，慢慢待一会儿。
天暗下来了，周末也温和一点。
周末到了晚上，先缓一缓。
晚上好，今天也走到这里了。
```

### 周末 — 21:00 - 23:00

```txt
夜里安静，你还在。
周末夜里，也慢慢来。
深了，这里还亮着。
夜安静下来，你也来了。
周末的夜，声音轻了。
晚了，周末也慢下来。
夜里了，先陪你一会儿。
周末快过去了，不用急。
这个夜晚，很安静。
深夜前，先在这里坐坐。
```

### 工作日与周末共用 — 23:00 - 4:00

```txt
还没睡，陪你一会儿。
这么晚了，你还在。
深夜了，这里还亮着。
夜很深了，在呢。
这个时间，世界安静下来。
夜已经很深，先陪你坐会儿。
晚到这个点了，慢慢来。
深夜里，这里还在。
夜色很沉，你也还在。
这么晚了，先不急。
```

## Testing

Add tests for the pure greeting module:

- bucket boundaries:
  - `03:59` -> `23:00-04:00`,
  - `04:00` -> `04:00-07:00`,
  - `06:59` -> `04:00-07:00`,
  - `07:00` -> `07:00-11:00`,
  - `23:00` -> `23:00-04:00`.
- weekday vs weekend audience:
  - Monday uses `weekday`,
  - Saturday/Sunday use `weekend`,
  - shared bucket uses `shared`.
- stable selection:
  - same date + bucket + audience returns stored text.
- repeat avoidance:
  - if last text exists and candidates length > 1, new selection differs.
- storage fallback:
  - when storage throws, greeting still returns a valid candidate.

Add/update HomePage tests:

- greeting renders above existing statistics.
- existing homepage stats/actions remain visible.
- API error state still does not show fake counts.

## Implementation Notes

- Keep the module framework-independent where practical.
- Inject `Date` and storage in tests instead of relying on real time.
- Do not use `Math.random()` in production logic; deterministic hash is easier to test and avoids same-page jumps.
- Use safe JSON parsing for stored selections.
- If stored text is not in the active phrase bank after copy changes, ignore it and reselect.

## Acceptance Criteria

- Homepage shows one Chinese greeting above statistics.
- Greeting matches current local bucket and weekday/weekend/shared rules.
- Same date + bucket + audience shows stable text across rerenders/page reloads.
- Switching bucket can show a bucket-appropriate greeting.
- Immediate repeat is avoided when candidate list has more than one item and previous selection is known.
- No poetic/playful bilingual copy line appears in Phase 8A UI.
- No backend, database, import/export, or settings changes are required.
- Tests and build pass.
