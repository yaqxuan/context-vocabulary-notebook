# AI Spelling Check Design

## Goal

Add a minimal AI spelling check to card creation. The user writes a sentence, clicks a dedicated button, sees misspelled words highlighted, and sees the correct spelling next to each issue. The original sentence is never changed until the user accepts an individual suggestion.

## Scope

In scope:

- Add an `AI 检查拼写` button near the sentence field on the card creation/edit page.
- Call AI only when the user clicks that button.
- Check spelling using the card's learning language.
- Return only misspelled words and suggested spellings.
- Highlight misspelled words in the displayed sentence.
- Let the user accept a suggestion, replacing only that one misspelled word.
- Protect the target word from replacement.

Out of scope:

- Grammar checks.
- Style rewrites.
- Full-sentence rewrites.
- Automatic checks while typing.
- Automatic replacement before user acceptance.

## User Experience

The sentence field keeps current editing behavior. Below or beside it, the page shows a button:

```text
AI 检查拼写
```

When clicked:

1. Button enters loading state.
2. Current sentence, target word, and learning language are sent to the spelling check API.
3. Input text stays unchanged.
4. If issues exist, the UI shows highlighted misspellings and a compact list:

```text
hte → the    接受
recieve → receive    接受
```

5. If no issues exist, the UI shows:

```text
未发现拼写错误
```

6. If request fails, the UI shows:

```text
拼写检查失败，请重试
```

Accepting a suggestion replaces the matching misspelled word in the sentence field. It does not call AI again. The accepted issue disappears from the list and highlight view updates locally.

## API Shape

Add a dedicated spelling check API instead of mixing it into existing contextual AI suggestions.

Request:

```ts
{
  sentence: string;
  targetWord: string;
  learningLanguage: string;
}
```

Response:

```ts
{
  issues: Array<{
    original: string;
    suggestion: string;
  }>;
}
```

The response intentionally omits explanations and full corrected sentences.

## AI Prompt Constraints

The AI prompt must require:

- Check spelling only.
- Do not check grammar, phrasing, tone, or style.
- Do not rewrite the sentence.
- Do not suggest changes to the target word.
- Return only pairs of misspelled word and corrected spelling.
- Use the provided learning language as the spelling context.

## Frontend Components and State

The existing card creation page owns this feature because it already owns the sentence, target word, learning language, and AI-related UI state.

Add local state for:

- `spellingCheckState`: idle/loading/success/error.
- `spellingIssues`: list of `{ original, suggestion }`.
- Optional user-visible status message.

Add handlers for:

- `handleSpellingCheck`: validates input, calls API, stores issues.
- `acceptSpellingSuggestion(issue)`: replaces only the accepted misspelled word and removes accepted issue.

Replacement must avoid changing the target word. If an issue matches the target word, it should not be shown or accepted.

## Data Flow

```text
User clicks button
  → frontend validates non-empty sentence
  → frontend calls spelling check API
  → server calls AI with constrained prompt
  → server returns minimal issues
  → frontend highlights original words and lists suggestions
  → user accepts one suggestion
  → frontend replaces only that word locally
```

No background/debounced request is added.

## Error Handling

- Empty sentence: button disabled or no-op.
- Missing learning language: use existing card language default behavior.
- AI/API failure: show retryable error message and preserve sentence.
- Empty AI result: show `未发现拼写错误`.
- Target word returned as issue: ignore it before display.

## Testing

Add or update tests for:

- Clicking `AI 检查拼写` calls the spelling check API.
- Typing in sentence field does not call the spelling check API.
- Returned misspelled words render with highlight and compact suggestions.
- Accepting a suggestion replaces only that misspelled word.
- Suggestions for the target word are ignored.
- API failure displays `拼写检查失败，请重试`.
- No issues displays `未发现拼写错误`.

## Open Decisions Resolved

- Trigger: manual button only.
- Result style: minimal wrong-word-to-correct-word pairs.
- Acceptance: user clicks an individual suggestion; UI then replaces that one word.
- Language: card learning language.
- Target word: protected from replacement.
