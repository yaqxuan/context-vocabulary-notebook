# AI Suggestions Design

Date: 2026-06-12

## Goal

Improve card creation and batch clip import AI suggestions so users get sentence translation, context meaning, and learning notes that track the current target word immediately. When the target word is an inflected form, AI should recommend the dictionary form without silently changing the user's input.

## Scope

In scope:

- Add sentence translation to AI suggestion responses.
- Keep AI context meaning and usage note tied to the latest target word, sentence, and language settings.
- Replace automatic lemma substitution with an explicit "use dictionary form" action next to the target word.
- Remove the manual "AI 建议释义" button from batch clip import.
- Refresh batch item AI meaning and note immediately after target word changes.

Out of scope:

- Changing card storage schema.
- Enforcing dictionary-form target words at save time.
- Adding a separate translation-only feature outside card creation/import flows.
- Changing AI provider configuration or model selection.

## User behavior

### Card creation

1. User enters a sentence and a target word.
2. The app requests AI suggestion data for the current target word, sentence, target language, and definition language.
3. AI returns:
   - `meaning_suggestion`: short context meaning for the target word.
   - `usage_note`: learning note.
   - `sentence_translation`: translation of the full sentence into the definition language.
4. If AI detects that the target word is not the dictionary form, the target word field shows an inline action such as `使用原型：charge`.
5. Clicking the action replaces the current target word with the lemma and triggers normal suggestion refresh. Not clicking leaves the user's input unchanged; save uses the current field value.
6. Existing AI meaning ghost behavior remains: users can accept suggested meaning, ignore it, or type their own meaning.
7. AI usage note remains editable and auto-filled while untouched.
8. Sentence translation is displayed near the AI suggestion area as read-only helper content.

### Batch clip import

1. User analyzes clips and gets sentence/candidate target words.
2. Selecting a candidate immediately updates the target word and requests AI suggestions.
3. Editing the target word field clears old AI-derived meaning/note/translation immediately, marks the item as refreshing, and requests AI suggestions for the new target word after the existing short debounce.
4. The old manual `AI 建议释义` button is removed.
5. AI results replace the item's meaning, note, and sentence translation for the current target word.
6. Stale AI responses are ignored if the item sentence, target word, or language settings have changed since request start.
7. Users can still edit meaning and note after AI fills them. A later target word change refreshes them because the suggestion must match the new word.

## API design

Extend `AiSuggestionResponseDto`:

```ts
export type AiSuggestionResponseDto =
  | {
      status: 'success';
      meaning_suggestion: string;
      usage_note: string;
      sentence_translation: string;
    }
  | {
      status: 'none';
      meaning_suggestion: '';
      usage_note: '';
      sentence_translation: '';
      message: string;
    };
```

The existing `/api/ai/suggestions` endpoint remains the only suggestion endpoint. It returns all three pieces together. No new endpoint is added.

## Server design

Update `src/server/domain/aiSuggestions.ts`:

- `buildPrompt()` instructs AI to translate the full sentence into the definition language.
- JSON shape becomes:

```json
{
  "meaning_suggestion": "short context meaning",
  "usage_note": "learning note",
  "sentence_translation": "full sentence translation"
}
```

- `parseSuggestionContent()` reads and trims all three fields.
- If all three are empty, return `none('AI suggestion empty')`.
- If any field has content, return `success` with empty strings for missing fields. This preserves resilience with imperfect providers.
- `none()` includes `sentence_translation: ''`.

No provider transport changes. Existing OpenAI-compatible chat-completion request remains.

## Client design

### CardCreatePage

Add state:

- `aiSentenceTranslation`
- `lemmaSuggestion` or equivalent `{ original, lemma } | null`

Change lemma effect:

- Keep debounce and stale-response guard.
- On success where lemma differs from current target word, store lemma suggestion instead of calling `setTargetWord(lemma)`.
- On success where lemma equals current word, clear lemma suggestion.
- On target word or sentence changes, clear lemma suggestion if it no longer matches current input.

Add action:

- Button beside target word input: `使用原型：${lemma}`.
- On click, set target word to lemma, clear lemma suggestion, and let existing effects refresh suggestions.

Change AI suggestion effect:

- Clear `aiSentenceTranslation` when inputs are incomplete or request starts.
- Set translation from successful response.
- Keep existing meaning ghost and usage note auto-fill behavior.

Display:

- Show sentence translation as read-only helper text near the AI suggestion textarea, only when non-empty.
- Keep exact-match and save-mode logic unchanged.

### BatchClipImportPage

Add per item:

- `sentenceTranslation: string`
- `suggestionState: 'idle' | 'loading' | 'none' | 'success' | 'error'` for visible refresh state and tests.

Replace manual request path:

- Remove `suggestMeaning()` and its button.
- Keep a helper that requests suggestions for `(item id, sentence, targetWord, targetLanguage, definitionLanguage)`.
- Apply result only if current item still has same sentence and target word.
- On success, patch meaning, note, sentence translation, and clear error.
- On failure, show retryable error text through existing `error`.

Automatic refresh triggers:

- Candidate selection calls suggestion request immediately after patching target word.
- Target word input change updates target word, clears old AI-derived fields immediately, sets suggestion state to `loading`, and triggers a debounced suggestion request when sentence is present.
- Sentence edits follow the same path when both sentence and target word are present.
- Language changes refresh every ready item that has both sentence and target word, using the same stale-response guard.

## Error handling

- AI suggestion failures never block manual card creation or saving.
- Missing AI config returns `none` and clears AI-only fields.
- Malformed AI JSON returns `none`.
- Stale client responses are ignored rather than overwriting newer input.
- Lemma failures do not block user input or save.
- Users may save non-lemma target words by ignoring the lemma action.

## Testing

Server tests:

- `AiSuggestionResponseDto` none response includes empty `sentence_translation`.
- Successful suggestion parses `sentence_translation`.
- Prompt includes full-sentence translation requirement and selected definition language.
- Malformed/empty upstream still returns `none` with all empty fields.

Card create tests:

- Inflected target word shows dictionary-form action but does not auto-replace.
- Clicking dictionary-form action replaces target word and saves lemma if unchanged afterward.
- Ignoring dictionary-form action preserves typed word on save.
- AI suggestion displays sentence translation.
- Changing target word/sentence clears stale translation while new request is pending.

Batch import tests:

- Manual `AI 建议释义` button is absent.
- Selecting candidate auto-fills meaning, note, and sentence translation.
- Editing target word auto-refreshes meaning/note/translation.
- Stale suggestion response for old target word does not overwrite current item.

## Migration notes

No database migration is needed. Existing cards keep their current target words and notes. Existing API clients that consume `/api/ai/suggestions` should tolerate the added `sentence_translation` field; tests in this repo will be updated to expect it.
