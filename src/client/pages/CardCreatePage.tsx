import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';

import { createCard, getCard, patchCard } from '../api/cards';
import { getCardSuggestions } from '../api/cards';
import { uploadMedia } from '../api/media';
import { getAiSuggestion } from '../api/aiSuggestions';
import { TagAssignmentEditor } from '../components/TagAssignmentEditor';
import { getSettings } from '../api/settings';
import type { CardDetailDto, SuggestionDto } from '../../shared/types';
import { MEDIA_SIZE_LIMIT_MESSAGES, MEDIA_SIZE_LIMITS_BYTES } from '../../shared/constants';

type SaveMode = { kind: 'new' } | { kind: 'existing'; cardId: string; meaning: string; targetWord: string };
type FieldErrors = Partial<Record<'targetWord' | 'meaning' | 'sentence' | 'video' | 'screenshot' | 'audio' | 'submit', string>>;

function parseExplicitCardId(): string | null {
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;
  return new URLSearchParams(hash.slice(qIndex + 1)).get('card_id');
}

const DEFAULT_TARGET_LANGUAGE = '英语';
const DEFAULT_DEFINITION_LANGUAGE = '中文';

function mediaSizeError(kind: 'video' | 'screenshot' | 'audio', file: File): string | null {
  const mediaKind = kind === 'screenshot' ? 'image' : kind;
  return file.size > MEDIA_SIZE_LIMITS_BYTES[mediaKind] ? MEDIA_SIZE_LIMIT_MESSAGES[mediaKind] : null;
}

function hasExtension(f: File, extensions: string[]): boolean {
  const lower = f.name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function isMp4(f: File): boolean {
  return f.type === 'video/mp4' || hasExtension(f, ['.mp4']);
}

function isScreenshot(f: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) ||
    hasExtension(f, ['.jpg', '.jpeg', '.png', '.webp']);
}

function isMp3(f: File): boolean {
  return f.type === 'audio/mpeg' || hasExtension(f, ['.mp3']);
}

function fileLabel(f: File | null): string {
  if (!f) return '尚未选择文件';
  const kb = Math.max(1, Math.round(f.size / 1024));
  return `${f.name} · ${kb} KB`;
}

function normalizeWord(w: string): string {
  return w.trim().toLowerCase();
}

function findExactMatch(suggestions: SuggestionDto[], targetWord: string, meaning: string): SuggestionDto | null {
  const normWord = normalizeWord(targetWord);
  const normMeaning = meaning.trim();
  if (!normWord || !normMeaning) return null;
  return suggestions.find(
    (s) => normalizeWord(s.target_word) === normWord && s.context_meaning.trim() === normMeaning
  ) ?? null;
}

export function CardCreatePage() {
  const [targetWord, setTargetWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [sentence, setSentence] = useState('');
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE);
  const [definitionLanguage, setDefinitionLanguage] = useState(DEFAULT_DEFINITION_LANGUAGE);
  const [note, setNote] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [originalTagIds, setOriginalTagIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionDto[]>([]);
  const [suggestionState, setSuggestionState] = useState<'idle' | 'loading' | 'empty' | 'success' | 'error'>('idle');
  const [aiMeaningSuggestion, setAiMeaningSuggestion] = useState('');
  const [aiUsageSuggestion, setAiUsageSuggestion] = useState('');
  const [aiSuggestionState, setAiSuggestionState] = useState<'idle' | 'loading' | 'none' | 'success' | 'error'>('idle');
  const [meaningTouched, setMeaningTouched] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [appendCard, setAppendCard] = useState<CardDetailDto | null>(null);
  const [appendLoadError, setAppendLoadError] = useState<string | null>(null);
  const aiAutoFilledNoteRef = useRef(false);
  const aiMeaningInputKeyRef = useRef('');
  const noteTouchedRef = useRef(false);

  const [explicitCardId] = useState(() => parseExplicitCardId());

  // Load settings defaults for new-card mode
  useEffect(() => {
    if (explicitCardId) return;
    let active = true;
    getSettings()
      .then((s) => {
        if (!active) return;
        setTargetLanguage(s.default_target_language ?? DEFAULT_TARGET_LANGUAGE);
        setDefinitionLanguage(s.default_definition_language ?? DEFAULT_DEFINITION_LANGUAGE);
      })
      .catch(() => {
        if (!active) return;
      });
    return () => { active = false; };
  }, [explicitCardId]);

  // Load explicit card when card_id present in hash query
  useEffect(() => {
    if (!explicitCardId) return;
    let active = true;
    getCard(explicitCardId)
      .then((card) => {
        if (!active) return;
        setAppendCard(card);
        setTargetWord(card.target_word);
        setMeaning(card.context_meaning);
        setTargetLanguage(card.target_language);
        setDefinitionLanguage(card.definition_language);
        const tIds = card.tags.map((t) => t.id);
        setSelectedTagIds(tIds);
        setOriginalTagIds(tIds);
      })
      .catch((err) => {
        if (!active) return;
        setAppendLoadError(err instanceof Error ? err.message : '加载词义失败');
      });
    return () => { active = false; };
  }, [explicitCardId]);

  useEffect(() => {
    if (explicitCardId) return;
    const inputKey = `${targetWord.trim()}\n${sentence.trim()}`;
    if (aiMeaningInputKeyRef.current !== inputKey) {
      aiMeaningInputKeyRef.current = inputKey;
      if (!meaning.trim()) setMeaningTouched(false);
    }
  }, [targetWord, sentence, meaning, explicitCardId]);

  // Load suggestions when target word changes
  useEffect(() => {
    if (explicitCardId) return;
    const trimmed = targetWord.trim();
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
  }, [targetWord, explicitCardId]);

  // Load AI suggestions when both target word and sentence are present
  useEffect(() => {
    if (explicitCardId) return;
    const trimmedWord = targetWord.trim();
    const trimmedSentence = sentence.trim();
    if (!trimmedWord || !trimmedSentence) {
      setAiMeaningSuggestion('');
      setAiUsageSuggestion('');
      setAiSuggestionState('idle');
      if (!noteTouchedRef.current && aiAutoFilledNoteRef.current) {
        setNote('');
        aiAutoFilledNoteRef.current = false;
      }
      return;
    }

    let active = true;
    setAiMeaningSuggestion('');
    setAiUsageSuggestion('');
    setAiSuggestionState('loading');
    if (!noteTouchedRef.current && aiAutoFilledNoteRef.current) {
      setNote('');
      aiAutoFilledNoteRef.current = false;
    }
    const timer = window.setTimeout(() => {
      getAiSuggestion({
        target_word: trimmedWord,
        sentence: trimmedSentence,
        target_language: targetLanguage.trim() || DEFAULT_TARGET_LANGUAGE,
        definition_language: definitionLanguage.trim() || DEFAULT_DEFINITION_LANGUAGE,
      })
        .then((result) => {
          if (!active) return;
          if (result.status === 'success') {
            setAiMeaningSuggestion(result.meaning_suggestion);
            setAiUsageSuggestion(result.usage_note);
            setAiSuggestionState('success');
            if (!noteTouchedRef.current && result.usage_note) {
              setNote(result.usage_note);
              aiAutoFilledNoteRef.current = true;
            }
          } else {
            setAiMeaningSuggestion('');
            setAiUsageSuggestion('');
            setAiSuggestionState('none');
          }
        })
        .catch(() => {
          if (!active) return;
          setAiMeaningSuggestion('');
          setAiUsageSuggestion('');
          setAiSuggestionState('error');
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [targetWord, sentence, targetLanguage, definitionLanguage, explicitCardId]);

  // Derive exact match and mode from suggestions + current field values
  const exactMatch = useMemo(
    () => findExactMatch(suggestions, targetWord, meaning),
    [suggestions, targetWord, meaning]
  );

  const mode: SaveMode = useMemo(() => {
    if (appendCard) {
      return { kind: 'existing', cardId: appendCard.id, meaning: appendCard.context_meaning, targetWord: appendCard.target_word };
    }
    if (exactMatch) {
      return { kind: 'existing', cardId: exactMatch.id, meaning: exactMatch.context_meaning, targetWord: exactMatch.target_word };
    }
    return { kind: 'new' };
  }, [exactMatch, appendCard]);

  function handleMediaChange(kind: 'video' | 'screenshot' | 'audio', fileList: FileList | null) {
    const next = fileList?.[0] ?? null;
    setSuccessMessage('');
    setErrors((cur) => ({ ...cur, [kind]: undefined }));

    if (!next) {
      if (kind === 'video') setVideo(null);
      if (kind === 'screenshot') setScreenshot(null);
      if (kind === 'audio') setAudio(null);
      return;
    }

    if (kind === 'video' && !isMp4(next)) {
      setVideo(null);
      setErrors((cur) => ({ ...cur, video: '仅支持 mp4 本地视频文件' }));
      return;
    }
    if (kind === 'screenshot' && !isScreenshot(next)) {
      setScreenshot(null);
      setErrors((cur) => ({ ...cur, screenshot: '仅支持 jpg、png 或 webp 截图' }));
      return;
    }
    if (kind === 'audio' && !isMp3(next)) {
      setAudio(null);
      setErrors((cur) => ({ ...cur, audio: '仅支持 mp3 音频文件' }));
      return;
    }

    const sizeError = mediaSizeError(kind, next);
    if (sizeError) {
      if (kind === 'video') setVideo(null);
      if (kind === 'screenshot') setScreenshot(null);
      if (kind === 'audio') setAudio(null);
      setErrors((cur) => ({ ...cur, [kind]: sizeError }));
      return;
    }

    if (kind === 'video') setVideo(next);
    if (kind === 'screenshot') setScreenshot(next);
    if (kind === 'audio') setAudio(next);
  }

  function handleMeaningChange(value: string) {
    setMeaningTouched(true);
    setMeaning(value);
  }

  function acceptAiMeaningSuggestion() {
    setMeaning(aiMeaningSuggestion);
    setMeaningTouched(true);
    setAiMeaningSuggestion('');
  }

  function handleMeaningKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!meaning.trim() && aiMeaningSuggestion) {
      if (event.key === 'Enter') {
        event.preventDefault();
        acceptAiMeaningSuggestion();
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        setAiMeaningSuggestion('');
        setMeaningTouched(true);
      }
    }
  }

  function handleNoteChange(value: string) {
    noteTouchedRef.current = true;
    aiAutoFilledNoteRef.current = false;
    setNote(value);
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!targetWord.trim()) errs.targetWord = '目标单词必填';
    if (mode.kind === 'new' && !meaning.trim()) errs.meaning = '当前语境释义必填';
    if (!sentence.trim()) errs.sentence = '原句必填';
    return errs;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage('');
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const body =
        mode.kind === 'existing'
          ? {
              card_id: mode.cardId,
              sentence: sentence.trim(),
              ...(note.trim() ? { note: note.trim() } : {}),
            }
          : {
              target_word: targetWord.trim(),
              context_meaning: meaning.trim(),
              target_language: targetLanguage.trim() || DEFAULT_TARGET_LANGUAGE,
              definition_language: definitionLanguage.trim() || DEFAULT_DEFINITION_LANGUAGE,
              sentence: sentence.trim(),
              ...(note.trim() ? { note: note.trim() } : {}),
              tag_ids: selectedTagIds,
            };

      const result = await createCard(body);

      // Only patch tags if this is append mode and tags actually changed
      if (mode.kind === 'existing' && explicitCardId) {
        const tagsChanged = selectedTagIds.length !== originalTagIds.length || !selectedTagIds.every((id) => originalTagIds.includes(id));
        if (tagsChanged) {
          await patchCard(mode.cardId, { tag_ids: selectedTagIds });
        }
      }

      if (video) await uploadMedia(result.context.id, video);
      if (screenshot) await uploadMedia(result.context.id, screenshot);
      if (audio) await uploadMedia(result.context.id, audio);

      setSuccessMessage(mode.kind === 'existing' ? '已添加新语境' : '已创建词义条目');
      window.location.hash = `#/cards/${result.card.id}`;
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : '保存失败' });
    } finally {
      setIsSaving(false);
    }
  }

  const saveLabel = isSaving ? '保存中…' : mode.kind === 'existing' ? '添加为新语境' : '保存词义条目';
  const currentMeaning = mode.kind === 'existing' ? mode.meaning : meaning;
  const showAiMeaningGhost = Boolean(!currentMeaning && aiMeaningSuggestion && !meaningTouched);
  const showSuggestionPanel = Boolean(targetWord.trim());
  const suggestionTitle = appendCard ? '添加到已有词义' : '查找已有词义，避免重复建卡';

  if (appendLoadError) {
    return (
      <div className="card-create-studio">
        <div className="card-create-alert" role="alert">{appendLoadError}</div>
        <a href="#/cards">查看全部词义条目</a>
      </div>
    );
  }

  return (
    <form className="card-create-studio" onSubmit={handleSubmit} noValidate>
      {errors.submit ? <div className="card-create-alert" role="alert">{errors.submit}</div> : null}
      {successMessage ? <div className="card-create-success" role="status">{successMessage}</div> : null}

      <div className={`card-create-grid${showSuggestionPanel ? '' : ' card-create-grid--single'}`}>
        {/* Main form panel */}
        <section className="card-create-panel card-create-panel-main" aria-label="制卡表单">
          {/* Sentence */}
          <label className="card-create-field card-create-field-wide" htmlFor="cc-sentence">
            <span>原句</span>
            <textarea
              id="cc-sentence"
              aria-label="原句"
              value={sentence}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSentence(e.target.value)}
              placeholder="The hotel charges $100 per night."
              rows={4}
            />
            <small>先写完整语境句子，再填写生词。</small>
            {errors.sentence ? <em>{errors.sentence}</em> : null}
          </label>

          {/* Target word */}
          <label className="card-create-field" htmlFor="cc-target-word">
            <span>目标单词</span>
            <input
              id="cc-target-word"
              aria-label="目标单词"
              value={targetWord}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetWord(e.target.value)}
              placeholder="例如：charge"
              disabled={Boolean(explicitCardId)}
            />
            {errors.targetWord ? <em>{errors.targetWord}</em> : null}
          </label>

          {/* Current context meaning */}
          <label className="card-create-field card-create-meaning-field" htmlFor="cc-meaning">
            <span>当前语境释义</span>
            <div className="card-create-ghost-wrap">
              <input
                id="cc-meaning"
                aria-label="当前语境释义"
                value={currentMeaning}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleMeaningChange(e.target.value)}
                onKeyDown={handleMeaningKeyDown}
                disabled={mode.kind === 'existing' || Boolean(explicitCardId)}
                placeholder={showAiMeaningGhost ? '' : '例如：收费'}
              />
              {showAiMeaningGhost ? (
                <button type="button" className="card-create-ghost-text" onClick={acceptAiMeaningSuggestion}>
                  AI 建议：{aiMeaningSuggestion}
                </button>
              ) : null}
            </div>
            <small>只写这个语境下的意思。Enter 或点击建议采纳，Backspace 删除建议。</small>
            {errors.meaning ? <em>{errors.meaning}</em> : null}
          </label>

          {/* Language row */}
          <div className="card-create-language-row">
            <label className="card-create-field" htmlFor="cc-target-lang">
              <span>学习语言</span>
              <input
                id="cc-target-lang"
                aria-label="学习语言"
                value={targetLanguage}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetLanguage(e.target.value)}
              />
            </label>
            <label className="card-create-field" htmlFor="cc-def-lang">
              <span>释义语言</span>
              <input
                id="cc-def-lang"
                aria-label="释义语言"
                value={definitionLanguage}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDefinitionLanguage(e.target.value)}
              />
            </label>
          </div>

          {/* Tags */}
          <fieldset className="card-create-tags">
            <legend>标签</legend>
            <TagAssignmentEditor
              selectedTagIds={selectedTagIds}
              onSelectedTagIdsChange={setSelectedTagIds}
            />
          </fieldset>

          {/* AI usage suggestion */}
          <label className="card-create-field card-create-field-wide" htmlFor="cc-note">
            <span>AI 建议</span>
            <textarea
              id="cc-note"
              aria-label="AI 建议"
              value={note}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleNoteChange(e.target.value)}
              placeholder={aiSuggestionState === 'loading' ? 'AI 建议生成中…' : 'none'}
              rows={3}
            />
            <small>{aiUsageSuggestion ? '可保留、修改或删除这条语境用法说明。' : 'none'}</small>
          </label>

          {/* Media section */}
          <section className="card-create-media" aria-label="语境附件">
            <div className="card-create-section-heading">
              <p>语境附件</p>
              <span>本地视频强烈推荐但不强制，截图和音频可补充当时语境。</span>
            </div>
            <MediaPicker
              title="本地视频 mp4"
              badge="推荐"
              label="上传本地视频"
              accept="video/mp4,.mp4"
              file={video}
              error={errors.video}
              onChange={(e) => handleMediaChange('video', e.target.files)}
            />
            <MediaPicker
              title="截图 jpg / png / webp"
              badge="可选"
              label="上传截图"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              file={screenshot}
              error={errors.screenshot}
              onChange={(e) => handleMediaChange('screenshot', e.target.files)}
            />
            <MediaPicker
              title="音频 mp3"
              badge="可选"
              label="上传音频"
              accept="audio/mpeg,.mp3"
              file={audio}
              error={errors.audio}
              onChange={(e) => handleMediaChange('audio', e.target.files)}
            />
          </section>
        </section>

        {showSuggestionPanel ? (
          <aside className="card-create-panel card-create-suggestions" aria-label={suggestionTitle}>
            <p className="card-create-side-title">{suggestionTitle}</p>
            <SuggestionPanel
              state={suggestionState}
              targetWord={targetWord}
              meaning={meaning}
              suggestions={suggestions}
              exactMatch={exactMatch}
              mode={mode}
              appendCard={appendCard}
            />
          </aside>
        ) : null}
      </div>

      {/* Save action: keep submit below media uploads so users do not scroll back up after attaching files. */}
      <div className="card-create-actions">
        <button className="card-create-save" type="submit" disabled={isSaving}>
          {saveLabel}
        </button>
      </div>
    </form>
  );
}

// ---- MediaPicker sub-component ----

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
  const inputId = `media-${label.replace(/\s+/g, '-')}`;
  return (
    <div className="card-create-media-picker">
      <span className="card-create-media-title">
        {title}<strong>{badge}</strong>
      </span>
      <span className="card-create-media-file">{fileLabel(file)}</span>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <input
        id={inputId}
        aria-label={label}
        type="file"
        accept={accept}
        onChange={onChange}
      />
      {error ? <em>{error}</em> : null}
    </div>
  );
}

// ---- SuggestionPanel sub-component ----

interface SuggestionPanelProps {
  state: 'idle' | 'loading' | 'empty' | 'success' | 'error';
  targetWord: string;
  meaning: string;
  suggestions: SuggestionDto[];
  exactMatch: SuggestionDto | null;
  mode: SaveMode;
  appendCard: CardDetailDto | null;
}

function SuggestionPanel({ state, targetWord, meaning, suggestions, exactMatch, mode, appendCard }: SuggestionPanelProps) {
  if (appendCard) {
    return (
      <p className="card-create-side-copy card-create-exact-notice">
        {`正在为已有词义添加语境：${appendCard.target_word} = ${appendCard.context_meaning}`}
      </p>
    );
  }
  if (!targetWord.trim()) {
    return null;
  }
  if (state === 'loading') {
    return <p className="card-create-side-copy">正在查找已有词义……</p>;
  }
  if (state === 'error') {
    return <p className="card-create-side-copy">已有词义加载失败，可以继续创建新条目</p>;
  }

  const hasMeaning = meaning.trim().length > 0;

  // Exact match found: force append mode, hide create-new, show matched card + informational others
  if (exactMatch && hasMeaning) {
    const others = suggestions.filter((s) => s.id !== exactMatch.id);
    return (
      <div className="card-create-suggestion-list">
        <p className="card-create-side-copy card-create-exact-notice">
          {`已找到相同词义：${exactMatch.target_word} = ${exactMatch.context_meaning}`}
        </p>
        <div className="card-create-suggestion-card card-create-suggestion-card--exact">
          <span>{exactMatch.target_word}</span>
          <strong>{exactMatch.context_meaning}</strong>
          <small>{mode.kind === 'existing' && mode.cardId === exactMatch.id ? '添加为新语境' : '添加为新语境'}</small>
        </div>
        {others.map((s) => (
          <div key={s.id} className="card-create-suggestion-card card-create-suggestion-card--info">
            <span>{s.target_word}</span>
            <strong>{s.context_meaning}</strong>
            <small>不同语义，仅供参考</small>
          </div>
        ))}
      </div>
    );
  }

  // No suggestions at all
  if (state === 'empty' || suggestions.length === 0) {
    return (
      <div className="card-create-suggestion-list">
        <p className="card-create-side-copy">还没有这个单词的词义条目</p>
        <div className="card-create-suggestion-card card-create-suggestion-card--new">
          <span>创建新的词义条目</span>
          <strong>{targetWord.trim() || '新单词'}</strong>
          <small>当前语境会成为第一条主语境</small>
        </div>
      </div>
    );
  }

  // Suggestions exist but no exact match on meaning
  // All shown as informational; create-new available
  const noMatch = hasMeaning;
  return (
    <div className="card-create-suggestion-list">
      {noMatch ? (
        <p className="card-create-side-copy">未找到相同词义</p>
      ) : (
        <p className="card-create-side-copy">已找到同名词义，请确认是否相同：</p>
      )}
      {suggestions.map((s) => (
        <div key={s.id} className="card-create-suggestion-card card-create-suggestion-card--info">
          <span>{s.target_word}</span>
          <strong>{s.context_meaning}</strong>
          <small>不同语义，仅供参考</small>
        </div>
      ))}
      <div className="card-create-suggestion-card card-create-suggestion-card--new">
        <span>创建新的词义条目</span>
        <strong>{targetWord.trim() || '新单词'}</strong>
        <small>当前语境会成为第一条主语境</small>
      </div>
    </div>
  );
}
