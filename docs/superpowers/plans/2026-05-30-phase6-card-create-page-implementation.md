# Phase 6 Card Create Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved `#/create` page with polished notebook-studio visuals, existing-sense suggestions, optional/recommended mp4 video upload, optional screenshot/audio upload, and tested save flows.

**Architecture:** Add a focused page component that owns form state and visual composition, plus a small media API wrapper for `POST /api/media`. Saving creates or appends the card context first through existing card API, then uploads any selected video/screenshot/audio to the returned `context.id`. Routing swaps the Phase 6 placeholder for the real page.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Vitest, React Testing Library, existing Express JSON/media APIs.

---

## Source Documents

- `PROJECT_MEMORY.md`: UI review gate says each page needs independent draft approval before implementation. User approved card create page draft and later changed video to optional/recommended.
- `require.md`: sections 5.1, 5.2, 5.3, 5.6, 5.7, 7, 8, 11.2.
- Spec: `docs/superpowers/specs/2026-05-30-phase6-card-create-page-design.md`.

## File Structure

- Create `src/client/api/media.ts`: focused wrapper for uploading a `File` to `POST /api/media` with `context_example_id`.
- Create `src/client/pages/CardCreatePage.tsx`: complete card create UI, form state, suggestion loading, validation, save orchestration, polished layout.
- Modify `src/client/App.tsx`: import and route `#/create` to `CardCreatePage`.
- Modify `src/client/styles.css`: replace generic body font/background with notebook-studio foundation and add a subtle page texture.
- Create `tests/client/cardCreatePage.test.tsx`: component tests for render, suggestions, validation, file validation, and save flows.
- Modify `tests/client/app.test.tsx`: keep route test stable by mocking `/api/tags` and card suggestions where needed.

## Implementation Notes

- Do not add website video URL input.
- Do not implement dictionaries, phonetics, AI card creation, OCR, ASR, sync, CLI, or local API settings.
- Use existing `createCard()` for both modes. Existing backend returns `{ card, context }`, and media upload requires `context.id`.
- `tag_ids` can be sent from selected existing tags. New tag creation UI is not required for this page slice because tag management page comes later in Phase 6.
- Use exact accepted MIME/extension pairs in frontend validation when a file is selected:
  - optional video: `.mp4`, `video/mp4` preferred.
  - optional screenshot: `.jpg`, `.jpeg`, `.png`, `.webp`.
  - optional audio: `.mp3`, `audio/mpeg` or file extension `.mp3`.
- Same target word plus same meaning should be represented as one word sense card with multiple context examples.
- Exact-match suggestion behavior overrides any older snippet in this plan:
  - Normalize target word by trimming and comparing case-insensitively.
  - Normalize meaning by trimming and comparing exactly.
  - If an exact target+meaning match exists, hide `创建新的词义条目`, automatically use append-to-existing mode, and show only that matching card with `添加为新语境`.
  - Same-word but different-meaning suggestions stay visible as reference only with `不同语义，仅供参考`; they are not selectable for append in that form state.
  - If no exact target+meaning match exists, show `创建新的词义条目` and keep same-word suggestions informational.

---

## Task 1: Add Media API Wrapper

**Files:**
- Create: `src/client/api/media.ts`
- Test: `tests/client/cardCreatePage.test.tsx` will cover calls through page save flow in later tasks.

- [ ] **Step 1: Create media API wrapper**

Create `src/client/api/media.ts`:

```ts
import type { MediaDto } from '../../shared/types';
import { apiFormData } from './client';

export function uploadMedia(contextExampleId: string, file: File): Promise<MediaDto> {
  const formData = new FormData();
  formData.set('context_example_id', contextExampleId);
  formData.set('file', file);
  return apiFormData<MediaDto>('/media', formData);
}
```

- [ ] **Step 2: Run typecheck for new API file**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit API wrapper**

```bash
git add src/client/api/media.ts
git commit -m "feat(client): add media upload api"
```

---

## Task 2: Write Card Create Page Render and Validation Tests

**Files:**
- Create: `tests/client/cardCreatePage.test.tsx`

- [ ] **Step 1: Write failing tests for initial render and required field validation**

Create `tests/client/cardCreatePage.test.tsx` with this starting content:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardCreatePage } from '../../src/client/pages/CardCreatePage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function file(name: string, type: string): File {
  return new File(['sample'], name, { type });
}

describe('CardCreatePage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders a polished create workspace with default languages and recommended optional video', async () => {
    render(<CardCreatePage />);

    expect(screen.getByRole('heading', { name: '捕捉一个真实语境' })).toBeInTheDocument();
    expect(screen.getByLabelText('目标单词')).toHaveAttribute('placeholder', '例如：charge');
    expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
    expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
    expect(screen.getByText('本地视频 mp4')).toBeInTheDocument();
    expect(screen.getByText('推荐')).toBeInTheDocument();
    expect(screen.queryByLabelText(/视频网址/)).not.toBeInTheDocument();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags', expect.any(Object)));
  });

  it('requires target word, meaning, and sentence for new card mode while video stays optional', async () => {
    render(<CardCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: '保存词义条目' }));

    expect(await screen.findByText('目标单词必填')).toBeInTheDocument();
    expect(screen.getByText('当前语境释义必填')).toBeInTheDocument();
    expect(screen.getByText('原句必填')).toBeInTheDocument();
    expect(screen.queryByText('请上传本地 mp4 视频')).not.toBeInTheDocument();
  });

  it('rejects unsupported media file types before saving', async () => {
    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('上传本地视频'), {
      target: { files: [file('clip.mov', 'video/quicktime')] },
    });
    fireEvent.change(screen.getByLabelText('上传截图'), {
      target: { files: [file('poster.gif', 'image/gif')] },
    });
    fireEvent.change(screen.getByLabelText('上传音频'), {
      target: { files: [file('line.wav', 'audio/wav')] },
    });

    expect(await screen.findByText('仅支持 mp4 本地视频文件')).toBeInTheDocument();
    expect(screen.getByText('仅支持 jpg、png 或 webp 截图')).toBeInTheDocument();
    expect(screen.getByText('仅支持 mp3 音频文件')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test -- tests/client/cardCreatePage.test.tsx
```

Expected: FAIL because `src/client/pages/CardCreatePage.tsx` does not exist.

- [ ] **Step 3: Commit failing tests only if project convention allows red commits**

Do not commit failing tests in this project unless user explicitly asks for red commits. Continue to Task 3.

---

## Task 3: Implement Card Create Page Render, Layout, and Validation

**Files:**
- Create: `src/client/pages/CardCreatePage.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client/cardCreatePage.test.tsx`

- [ ] **Step 1: Create `CardCreatePage.tsx` with initial UI and validation**

Create `src/client/pages/CardCreatePage.tsx`:

```tsx
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { createCard } from '../api/cards';
import { uploadMedia } from '../api/media';
import { listTags } from '../api/tags';
import type { SuggestionDto, TagDto } from '../../shared/types';
import { getCardSuggestions } from '../api/cards';

type SaveMode = { kind: 'new' } | { kind: 'existing'; cardId: string; meaning: string };
type FieldErrors = Partial<Record<'targetWord' | 'meaning' | 'sentence' | 'video' | 'screenshot' | 'audio' | 'submit', string>>;

const DEFAULT_TARGET_LANGUAGE = '英语';
const DEFAULT_DEFINITION_LANGUAGE = '中文';

function hasExtension(file: File, extensions: string[]): boolean {
  const lower = file.name.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

function isMp4(file: File): boolean {
  return file.type === 'video/mp4' || hasExtension(file, ['.mp4']);
}

function isScreenshot(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || hasExtension(file, ['.jpg', '.jpeg', '.png', '.webp']);
}

function isMp3(file: File): boolean {
  return file.type === 'audio/mpeg' || hasExtension(file, ['.mp3']);
}

function fileLabel(file: File | null): string {
  if (!file) return '尚未选择文件';
  const kb = Math.max(1, Math.round(file.size / 1024));
  return `${file.name} · ${kb} KB`;
}

export function CardCreatePage() {
  const [targetWord, setTargetWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [sentence, setSentence] = useState('');
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE);
  const [definitionLanguage, setDefinitionLanguage] = useState(DEFAULT_DEFINITION_LANGUAGE);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<TagDto[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionDto[]>([]);
  const [suggestionState, setSuggestionState] = useState<'idle' | 'loading' | 'empty' | 'success' | 'error'>('idle');
  const [mode, setMode] = useState<SaveMode>({ kind: 'new' });
  const [video, setVideo] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;
    listTags()
      .then((items) => { if (active) setTags(items); })
      .catch(() => { if (active) setTags([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const trimmed = targetWord.trim();
    setMode({ kind: 'new' });
    if (!trimmed) {
      setSuggestions([]);
      setSuggestionState('idle');
      return;
    }

    let active = true;
    setSuggestionState('loading');
    const timer = window.setTimeout(() => {
      getCardSuggestions(trimmed)
        .then((items) => {
          if (!active) return;
          setSuggestions(items);
          setSuggestionState(items.length ? 'success' : 'empty');
        })
        .catch(() => {
          if (!active) return;
          setSuggestions([]);
          setSuggestionState('error');
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [targetWord]);

  const selectedExistingMeaning = useMemo(() => {
    if (mode.kind !== 'existing') return '';
    return mode.meaning;
  }, [mode]);

  function setMedia(kind: 'video' | 'screenshot' | 'audio', fileList: FileList | null) {
    const nextFile = fileList?.[0] ?? null;
    setSuccessMessage('');
    setErrors((current) => ({ ...current, [kind]: undefined }));

    if (!nextFile) {
      if (kind === 'video') setVideo(null);
      if (kind === 'screenshot') setScreenshot(null);
      if (kind === 'audio') setAudio(null);
      return;
    }

    if (kind === 'video' && !isMp4(nextFile)) {
      setVideo(null);
      setErrors((current) => ({ ...current, video: '仅支持 mp4 本地视频文件' }));
      return;
    }
    if (kind === 'screenshot' && !isScreenshot(nextFile)) {
      setScreenshot(null);
      setErrors((current) => ({ ...current, screenshot: '仅支持 jpg、png 或 webp 截图' }));
      return;
    }
    if (kind === 'audio' && !isMp3(nextFile)) {
      setAudio(null);
      setErrors((current) => ({ ...current, audio: '仅支持 mp3 音频文件' }));
      return;
    }

    if (kind === 'video') setVideo(nextFile);
    if (kind === 'screenshot') setScreenshot(nextFile);
    if (kind === 'audio') setAudio(nextFile);
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    if (!targetWord.trim()) nextErrors.targetWord = '目标单词必填';
    if (mode.kind === 'new' && !meaning.trim()) nextErrors.meaning = '当前语境释义必填';
    if (!sentence.trim()) nextErrors.sentence = '原句必填';
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage('');
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const result = await createCard(mode.kind === 'existing'
        ? { card_id: mode.cardId, sentence: sentence.trim(), note: note.trim() || undefined }
        : {
            target_word: targetWord.trim(),
            context_meaning: meaning.trim(),
            target_language: targetLanguage.trim() || DEFAULT_TARGET_LANGUAGE,
            definition_language: definitionLanguage.trim() || DEFAULT_DEFINITION_LANGUAGE,
            sentence: sentence.trim(),
            note: note.trim() || undefined,
            tag_ids: selectedTagIds,
          });

      if (video) await uploadMedia(result.context.id, video);
      if (screenshot) await uploadMedia(result.context.id, screenshot);
      if (audio) await uploadMedia(result.context.id, audio);

      setSuccessMessage(mode.kind === 'existing' ? '已添加新语境' : '已创建词义条目');
      window.location.hash = `#/cards/${result.card.id}`;
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setIsSaving(false);
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) => current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]);
  }

  return (
    <form className="card-create-studio" onSubmit={handleSubmit} noValidate>
      <div className="card-create-hero">
        <div>
          <p className="card-create-kicker">Context capture</p>
          <h2>捕捉一个真实语境</h2>
          <p>把视频里遇到的词、当下意思、原句和证据材料钉成一张可复习的词义卡。</p>
        </div>
        <button className="card-create-save" type="submit" disabled={isSaving}>{isSaving ? '保存中…' : mode.kind === 'existing' ? '添加为新语境' : '保存词义条目'}</button>
      </div>

      {errors.submit ? <div className="card-create-alert" role="alert">{errors.submit}</div> : null}
      {successMessage ? <div className="card-create-success" role="status">{successMessage}</div> : null}

      <div className="card-create-grid">
        <section className="card-create-panel card-create-panel-main" aria-label="制卡表单">
          <label className="card-create-field">
            <span>目标单词</span>
            <input value={targetWord} onChange={(event) => setTargetWord(event.target.value)} placeholder="例如：charge" />
            {errors.targetWord ? <em>{errors.targetWord}</em> : null}
          </label>

          <label className="card-create-field">
            <span>当前语境释义</span>
            <input value={mode.kind === 'existing' ? selectedExistingMeaning : meaning} onChange={(event) => setMeaning(event.target.value)} disabled={mode.kind === 'existing'} placeholder="例如：收费" />
            <small>只写这个语境下的意思，不写完整词典释义。</small>
            {errors.meaning ? <em>{errors.meaning}</em> : null}
          </label>

          <label className="card-create-field card-create-field-wide">
            <span>原句</span>
            <textarea value={sentence} onChange={(event) => setSentence(event.target.value)} placeholder="The hotel charges $100 per night." rows={4} />
            <small>复习时会显示完整原句，并高亮目标单词。</small>
            {errors.sentence ? <em>{errors.sentence}</em> : null}
          </label>

          <div className="card-create-language-row">
            <label className="card-create-field">
              <span>学习语言</span>
              <input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} />
            </label>
            <label className="card-create-field">
              <span>释义语言</span>
              <input value={definitionLanguage} onChange={(event) => setDefinitionLanguage(event.target.value)} />
            </label>
          </div>

          <fieldset className="card-create-tags">
            <legend>标签</legend>
            <div>
              {tags.length ? tags.map((tag) => (
                <button key={tag.id} type="button" className={selectedTagIds.includes(tag.id) ? 'selected' : ''} onClick={() => toggleTag(tag.id)}>{tag.name}</button>
              )) : <p>暂无标签，可先保存词义，稍后在标签页管理。</p>}
            </div>
          </fieldset>

          <label className="card-create-field card-create-field-wide">
            <span>备注</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="视频名称、时间点、场景说明……" rows={3} />
          </label>

          <section className="card-create-media" aria-label="语境附件">
            <div className="card-create-section-heading">
              <p>语境附件</p>
              <span>本地视频强烈推荐但不强制，截图和音频可补充当时语境。</span>
            </div>
            <MediaPicker title="本地视频 mp4" badge="推荐" label="上传本地视频" accept="video/mp4,.mp4" file={video} error={errors.video} onChange={(event) => setMedia('video', event.target.files)} />
            <MediaPicker title="截图 jpg / png / webp" badge="可选" label="上传截图" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" file={screenshot} error={errors.screenshot} onChange={(event) => setMedia('screenshot', event.target.files)} />
            <MediaPicker title="音频 mp3" badge="可选" label="上传音频" accept="audio/mpeg,.mp3" file={audio} error={errors.audio} onChange={(event) => setMedia('audio', event.target.files)} />
          </section>
        </section>

        <aside className="card-create-panel card-create-suggestions" aria-label="已有词义">
          <p className="card-create-side-title">已有词义</p>
          <SuggestionState state={suggestionState} targetWord={targetWord} suggestions={suggestions} mode={mode} onSelect={setMode} />
        </aside>
      </div>
    </form>
  );
}

interface MediaPickerProps {
  title: string;
  badge: string;
  label: string;
  accept: string;
  file: File | null;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function MediaPicker({ title, badge, label, accept, file, error, onChange }: MediaPickerProps) {
  return (
    <label className="card-create-media-picker">
      <span className="card-create-media-title">{title}<strong>{badge}</strong></span>
      <span className="card-create-media-file">{fileLabel(file)}</span>
      <input aria-label={label} type="file" accept={accept} onChange={onChange} />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

interface SuggestionStateProps {
  state: 'idle' | 'loading' | 'empty' | 'success' | 'error';
  targetWord: string;
  suggestions: SuggestionDto[];
  mode: SaveMode;
  onSelect: (mode: SaveMode) => void;
}

function SuggestionState({ state, targetWord, suggestions, mode, onSelect }: SuggestionStateProps) {
  if (!targetWord.trim()) return <p className="card-create-side-copy">输入目标单词后，我会查找已有词义，帮你避免重复建卡。</p>;
  if (state === 'loading') return <p className="card-create-side-copy">正在查找已有词义……</p>;
  if (state === 'error') return <p className="card-create-side-copy">已有词义加载失败，可以继续创建新条目</p>;

  return (
    <div className="card-create-suggestion-list">
      {state === 'empty' ? <p className="card-create-side-copy">还没有这个单词的词义条目</p> : null}
      {suggestions.map((suggestion) => (
        <button key={suggestion.id} type="button" className={mode.kind === 'existing' && mode.cardId === suggestion.id ? 'selected' : ''} onClick={() => onSelect({ kind: 'existing', cardId: suggestion.id, meaning: suggestion.context_meaning })}>
          <span>{suggestion.target_word}</span>
          <strong>{suggestion.context_meaning}</strong>
          <small>添加为新的语境实例</small>
        </button>
      ))}
      <button type="button" className={mode.kind === 'new' ? 'selected' : ''} onClick={() => onSelect({ kind: 'new' })}>
        <span>创建新的词义条目</span>
        <strong>{targetWord.trim() || '新单词'}</strong>
        <small>当前语境会成为第一条主语境</small>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add studio visual CSS**

Append these styles to `src/client/styles.css` after existing body rule:

```css
body {
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 34rem),
    linear-gradient(135deg, #f8f1e7 0%, #edf3ee 45%, #f7f4ec 100%);
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, ui-serif, serif;
}

.card-create-studio {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(71, 85, 105, 0.18);
  background:
    linear-gradient(135deg, rgba(255, 251, 242, 0.95), rgba(241, 245, 249, 0.88)),
    repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.03) 0 1px, transparent 1px 18px);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.18);
  padding: clamp(1rem, 2vw, 2rem);
}

.card-create-studio::before {
  content: "";
  position: absolute;
  inset: 1rem auto auto 52%;
  width: 19rem;
  height: 19rem;
  border-radius: 999px;
  background: rgba(217, 119, 6, 0.12);
  filter: blur(18px);
  z-index: -1;
}

.card-create-hero {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.card-create-kicker {
  margin: 0 0 0.5rem;
  color: #0f766e;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.card-create-hero h2 {
  margin: 0;
  color: #172033;
  font-size: clamp(2rem, 4vw, 4.5rem);
  line-height: 0.92;
  letter-spacing: -0.08em;
}

.card-create-hero p:not(.card-create-kicker) {
  max-width: 40rem;
  margin: 1rem 0 0;
  color: #475569;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 1rem;
}

.card-create-save {
  border: 0;
  border-radius: 999px;
  background: #172033;
  color: #fff7ed;
  box-shadow: 0 18px 40px rgba(23, 32, 51, 0.28);
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  padding: 0.9rem 1.3rem;
  white-space: nowrap;
}

.card-create-save:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.card-create-alert,
.card-create-success {
  border-radius: 18px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
}

.card-create-alert {
  background: #fff1f2;
  color: #be123c;
}

.card-create-success {
  background: #ecfdf5;
  color: #047857;
}

.card-create-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.42fr);
}

.card-create-panel {
  border: 1px solid rgba(71, 85, 105, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.8);
  padding: clamp(1rem, 2vw, 1.5rem);
}

.card-create-panel-main {
  display: grid;
  gap: 1rem;
}

.card-create-field {
  display: grid;
  gap: 0.45rem;
  color: #172033;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 750;
}

.card-create-field input,
.card-create-field textarea {
  width: 100%;
  border: 1px solid rgba(71, 85, 105, 0.24);
  border-radius: 18px;
  background: rgba(255, 251, 242, 0.8);
  color: #0f172a;
  font: inherit;
  font-weight: 520;
  outline: none;
  padding: 0.85rem 1rem;
}

.card-create-field textarea {
  min-height: 7rem;
  resize: vertical;
}

.card-create-field input:focus,
.card-create-field textarea:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.card-create-field input:disabled {
  color: #475569;
  background: rgba(226, 232, 240, 0.66);
}

.card-create-field small,
.card-create-side-copy,
.card-create-media-file,
.card-create-section-heading span {
  color: #64748b;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.86rem;
  font-weight: 500;
}

.card-create-field em,
.card-create-media-picker em {
  color: #be123c;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.85rem;
  font-style: normal;
  font-weight: 700;
}

.card-create-language-row {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card-create-tags {
  border: 1px dashed rgba(71, 85, 105, 0.28);
  border-radius: 20px;
  margin: 0;
  padding: 1rem;
}

.card-create-tags legend,
.card-create-section-heading p,
.card-create-side-title {
  color: #172033;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 850;
}

.card-create-tags div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card-create-tags button,
.card-create-suggestion-list button {
  cursor: pointer;
}

.card-create-tags button {
  border: 1px solid rgba(15, 118, 110, 0.22);
  border-radius: 999px;
  background: rgba(240, 253, 250, 0.7);
  color: #0f766e;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 750;
  padding: 0.35rem 0.7rem;
}

.card-create-tags button.selected {
  background: #0f766e;
  color: white;
}

.card-create-media {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.card-create-section-heading p,
.card-create-side-title {
  margin: 0 0 0.2rem;
}

.card-create-media-picker {
  display: grid;
  gap: 0.5rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.92), rgba(236, 253, 245, 0.52));
  padding: 1rem;
}

.card-create-media-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #172033;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 850;
}

.card-create-media-title strong {
  border-radius: 999px;
  background: #172033;
  color: #fff7ed;
  font-size: 0.72rem;
  padding: 0.2rem 0.55rem;
}

.card-create-media-picker input {
  color: #475569;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.card-create-suggestions {
  align-self: start;
  position: sticky;
  top: 1rem;
}

.card-create-suggestion-list {
  display: grid;
  gap: 0.75rem;
}

.card-create-suggestion-list button {
  display: grid;
  gap: 0.25rem;
  width: 100%;
  border: 1px solid rgba(71, 85, 105, 0.16);
  border-radius: 20px;
  background: rgba(255, 251, 242, 0.7);
  color: #172033;
  font-family: ui-sans-serif, system-ui, sans-serif;
  padding: 1rem;
  text-align: left;
}

.card-create-suggestion-list button.selected {
  border-color: #0f766e;
  background: rgba(204, 251, 241, 0.58);
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.12);
}

.card-create-suggestion-list button span {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.card-create-suggestion-list button strong {
  font-size: 1.05rem;
}

.card-create-suggestion-list button small {
  color: #64748b;
}

@media (max-width: 920px) {
  .card-create-hero,
  .card-create-grid {
    grid-template-columns: 1fr;
  }

  .card-create-hero {
    display: grid;
  }

  .card-create-save {
    width: 100%;
  }

  .card-create-suggestions {
    position: static;
  }
}

@media (max-width: 620px) {
  .card-create-language-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run initial tests**

Run:

```bash
npm run test -- tests/client/cardCreatePage.test.tsx
```

Expected: PASS for the first three tests.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit render and validation slice**

```bash
git add src/client/pages/CardCreatePage.tsx src/client/styles.css tests/client/cardCreatePage.test.tsx
git commit -m "feat(client): add polished card create form"
```

---

## Task 4: Add Suggestion and Mode Tests

**Files:**
- Modify: `tests/client/cardCreatePage.test.tsx`
- Modify: `src/client/pages/CardCreatePage.tsx` only if tests expose bugs.

- [ ] **Step 1: Add tests for suggestion states and mode switch**

Append these tests inside the existing `describe('CardCreatePage', () => { ... })` block:

```tsx
  it('uses exact target and meaning match to force append-to-existing mode', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) {
        return Promise.resolve(jsonResponse([
          { id: 'card-1', target_word: 'charge', context_meaning: '收费' },
          { id: 'card-2', target_word: 'charge', context_meaning: '指控' },
        ]));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'Charge ' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: ' 收费 ' } });

    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加为新语境' })).toBeInTheDocument();
    expect(screen.queryByText('创建新的词义条目')).not.toBeInTheDocument();
    expect(screen.getByText('不同语义，仅供参考')).toBeInTheDocument();
  });

  it('keeps create-new available when same word exists but meaning does not match', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) {
        return Promise.resolve(jsonResponse([
          { id: 'card-1', target_word: 'charge', context_meaning: '收费' },
          { id: 'card-2', target_word: 'charge', context_meaning: '指控' },
        ]));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '租赁' } });

    expect(await screen.findByText('未找到相同词义')).toBeInTheDocument();
    expect(screen.getByText('创建新的词义条目')).toBeInTheDocument();
    expect(screen.getAllByText('不同语义，仅供参考')).toHaveLength(2);
  });

  it('shows suggestion error while still allowing new card creation', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.reject(new Error('network'));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByText('已有词义加载失败，可以继续创建新条目')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存词义条目' })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm run test -- tests/client/cardCreatePage.test.tsx
```

Expected: PASS. If accessible button names do not match because nested text is concatenated differently, update test matchers to use regex against visible text while preserving user-visible labels.

- [ ] **Step 3: Commit suggestion behavior tests**

```bash
git add tests/client/cardCreatePage.test.tsx src/client/pages/CardCreatePage.tsx
git commit -m "test(client): cover card create suggestions"
```

---

## Task 5: Add Save Flow Tests

**Files:**
- Modify: `tests/client/cardCreatePage.test.tsx`
- Modify: `src/client/pages/CardCreatePage.tsx` only if tests expose bugs.

- [ ] **Step 1: Add new-card save test**

Append this test inside the `describe` block:

```tsx
  it('creates a new card then uploads selected optional media', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧', created_at: 'now', updated_at: 'now' }]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/cards') {
        return Promise.resolve(jsonResponse({
          card: { id: 'card-1', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now' },
          context: { id: 'ctx-1', card_id: 'card-1', sentence: 'The hotel charges $100 per night.', note: null, is_primary: 1, sort_order: 10, created_at: 'now', updated_at: 'now' },
        }), 201);
      }
      if (url === '/api/media') return Promise.resolve(jsonResponse({ id: 'media-1' }, 201));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('上传本地视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.change(screen.getByLabelText('上传截图'), { target: { files: [file('shot.png', 'image/png')] } });
    fireEvent.change(screen.getByLabelText('上传音频'), { target: { files: [file('line.mp3', 'audio/mpeg')] } });
    fireEvent.click(await screen.findByRole('button', { name: '美剧' }));
    fireEvent.click(screen.getByRole('button', { name: '保存词义条目' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-1'));
    const cardRequest = requests.find((request) => request.url === '/api/cards' && request.method === 'POST');
    expect(cardRequest?.body).toBe(JSON.stringify({
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      sentence: 'The hotel charges $100 per night.',
      tag_ids: ['tag-1'],
    }));
    expect(requests.filter((request) => request.url === '/api/media' && request.method === 'POST')).toHaveLength(3);
  });
```

- [ ] **Step 2: Add new-card save-without-media test**

Append this test inside the `describe` block:

```tsx
  it('creates a new card without requiring any media files', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/cards') {
        return Promise.resolve(jsonResponse({
          card: { id: 'card-2', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now' },
          context: { id: 'ctx-2', card_id: 'card-2', sentence: 'The hotel charges $100 per night.', note: null, is_primary: 1, sort_order: 10, created_at: 'now', updated_at: 'now' },
        }), 201);
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.click(screen.getByRole('button', { name: '保存词义条目' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-2'));
    expect(requests.filter((request) => request.url === '/api/media')).toHaveLength(0);
  });
```

- [ ] **Step 3: Add append-to-existing save test**

Append this test inside the `describe` block:

```tsx
  it('adds a new context to an existing card without requiring video', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([{ id: 'card-1', target_word: 'charge', context_meaning: '收费' }]));
      if (url === '/api/cards') {
        return Promise.resolve(jsonResponse({
          card: { id: 'card-1', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now' },
          context: { id: 'ctx-2', card_id: 'card-1', sentence: 'They charge extra for breakfast.', note: null, is_primary: 0, sort_order: 20, created_at: 'now', updated_at: 'now' },
        }), 201);
      }
      if (url === '/api/media') return Promise.resolve(jsonResponse({ id: 'media-1' }, 201));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });
    fireEvent.click(screen.getByRole('button', { name: '添加为新语境' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-1'));
    const cardRequest = requests.find((request) => request.url === '/api/cards' && request.method === 'POST');
    expect(cardRequest?.body).toBe(JSON.stringify({
      card_id: 'card-1',
      sentence: 'They charge extra for breakfast.',
    }));
    expect(requests.filter((request) => request.url === '/api/media' && request.method === 'POST')).toHaveLength(0);
  });
```

- [ ] **Step 4: Run save flow tests**

Run:

```bash
npm run test -- tests/client/cardCreatePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit save flow coverage**

```bash
git add tests/client/cardCreatePage.test.tsx src/client/pages/CardCreatePage.tsx
git commit -m "test(client): cover card create save flows"
```

---

## Task 6: Wire Route and Stabilize App Tests

**Files:**
- Modify: `src/client/App.tsx`
- Modify: `tests/client/app.test.tsx`

- [ ] **Step 1: Route `#/create` to the real page**

Modify `src/client/App.tsx` imports:

```tsx
import { Layout, type NavItem } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CardCreatePage } from './pages/CardCreatePage';
import { PlaceholderPage } from './pages/PlaceholderPage';
```

Replace the `/create` route body:

```tsx
  if (path === '/create') {
    return { title: '制卡', subtitle: '添加真实视频语境', element: <CardCreatePage /> };
  }
```

- [ ] **Step 2: Update app test fetch mock to cover create page side effects**

Modify the `beforeEach` in `tests/client/app.test.tsx` so fetch mock handles `/api/tags` and suggestions:

```tsx
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/statistics/home')) {
        return Promise.resolve(new Response(JSON.stringify({
          due_count: 0,
          reviewed_today_count: 0,
          again_today_count: 0,
          good_today_count: 0,
          daily_review_limit: 20,
          is_daily_target_reached: false,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      if (url.startsWith('/api/tags')) {
        return Promise.resolve(new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      if (url.startsWith('/api/cards/suggestions')) {
        return Promise.resolve(new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    });
  });
```

- [ ] **Step 3: Add app route assertion for real create page content**

In `tests/client/app.test.tsx`, add:

```tsx
  it('renders the real card create page on create route', () => {
    window.location.hash = '#/create';
    render(<App />);

    expect(screen.getByRole('heading', { name: '制卡' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '捕捉一个真实语境' })).toBeInTheDocument();
    expect(screen.getByText('本地视频 mp4')).toBeInTheDocument();
  });
```

- [ ] **Step 4: Run app and create page tests**

Run:

```bash
npm run test -- tests/client/app.test.tsx tests/client/cardCreatePage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit routing**

```bash
git add src/client/App.tsx tests/client/app.test.tsx
git commit -m "feat(client): route to card create page"
```

---

## Task 7: Full Verification and Review

**Files:**
- No planned code changes unless verification or review finds issues.

- [ ] **Step 1: Run client tests**

```bash
npm run test -- tests/client
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

```bash
npm test
```

Expected: PASS, 15+ test files including new card create tests.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Request code review**

Use code review skill/agent against current diff. Ask reviewer to focus on:

- Does the save flow create card/context before uploading media correctly?
- Does optional video validation reject bad files without requiring a video?
- Are future-scope features absent?
- Are tests meaningful and not brittle against harmless visual changes?
- Is the page accessible enough for labels/errors/keyboard use?

- [ ] **Step 6: Fix review findings**

If reviewer reports high/medium correctness issues, fix them and rerun:

```bash
npm run test -- tests/client
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit fixes if any**

```bash
git add src/client tests/client
 git commit -m "fix(client): address card create review feedback"
```

Only run commit if files changed after review.

---

## Self-Review

- Spec coverage: plan covers approved route, two-column studio layout, optional/recommended video, optional screenshot/audio, existing suggestions, same word+meaning append-to-existing flow, validation, save behavior, accessibility labels, tests, route wiring, and visual polish.
- Placeholder scan: no `TBD`, `TODO`, or vague edge-case steps remain.
- Type consistency: `CreateCardResponseDto.context.id`, `SuggestionDto.context_meaning`, `TagDto.id/name`, and `uploadMedia(contextExampleId, file)` are used consistently.
- Scope check: plan does not add dictionaries, phonetics, AI card creation, website video URLs, OCR/ASR, sync, CLI, or user-facing local API settings.
