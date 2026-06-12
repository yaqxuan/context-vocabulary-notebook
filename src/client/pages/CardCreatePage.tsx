import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';

import { createCard, getCard, patchCard } from '../api/cards';
import { getCardSuggestions } from '../api/cards';
import { uploadMedia } from '../api/media';
import { transcribeUpload } from '../api/transcriptions';
import { checkAiSpelling, getAiSuggestion, getAiTargetWordLemma } from '../api/aiSuggestions';
import { TagAssignmentEditor } from '../components/TagAssignmentEditor';
import { getSettings } from '../api/settings';
import { useI18n } from '../i18n/I18nProvider';
import type { Translator } from '../i18n/types';
import type { AiSpellingIssueDto, CardDetailDto, SuggestionDto } from '../../shared/types';
import {
  DEFAULT_DEFINITION_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  MEDIA_SIZE_LIMIT_MESSAGES,
  MEDIA_SIZE_LIMITS_BYTES,
  TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES,
  TRANSCRIPTION_MESSAGES,
  SUPPORTED_LANGUAGES,
  getLanguageIso6391Code,
  getNativeLanguageLabel,
  normalizeSupportedLanguage,
  type SupportedLanguage,
} from '../../shared/constants';

type SaveMode = { kind: 'new' } | { kind: 'existing'; cardId: string; meaning: string; targetWord: string };
type FieldErrors = Partial<Record<'targetWord' | 'meaning' | 'sentence' | 'video' | 'screenshot' | 'audio' | 'submit', string>>;

function parseExplicitCardId(): string | null {
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;
  return new URLSearchParams(hash.slice(qIndex + 1)).get('card_id');
}

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

function fileLabel(f: File | null, t: Translator): string {
  if (!f) return t('create.noFile');
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

function wordsEqual(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

function filterProtectedSpellingIssues(issues: AiSpellingIssueDto[], targetWord: string): AiSpellingIssueDto[] {
  return issues.filter((issue) => !wordsEqual(issue.original, targetWord));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceFirstWord(sentence: string, original: string, suggestion: string): string {
  return sentence.replace(new RegExp(`\\b${escapeRegExp(original)}\\b`, 'i'), suggestion);
}

function sameTagSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  return a.every((id) => bSet.has(id));
}

export function CardCreatePage() {
  const { t } = useI18n();
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
  const [aiSentenceTranslation, setAiSentenceTranslation] = useState('');
  const [aiSuggestionState, setAiSuggestionState] = useState<'idle' | 'loading' | 'none' | 'success' | 'error'>('idle');
  const [lemmaSuggestion, setLemmaSuggestion] = useState<{ original: string; lemma: string } | null>(null);
  const [spellingCheckState, setSpellingCheckState] = useState<'idle' | 'loading' | 'empty' | 'success' | 'error'>('idle');
  const [spellingIssues, setSpellingIssues] = useState<AiSpellingIssueDto[]>([]);
  const [meaningTouched, setMeaningTouched] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [transcriptState, setTranscriptState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptError, setTranscriptError] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [appendCard, setAppendCard] = useState<CardDetailDto | null>(null);
  const [appendLoadError, setAppendLoadError] = useState<string | null>(null);
  const [exactMatchTagLoadError, setExactMatchTagLoadError] = useState<string | null>(null);
  const [tagSourceCardId, setTagSourceCardId] = useState<string | null>(null);
  const aiAutoFilledNoteRef = useRef(false);
  const aiMeaningInputKeyRef = useRef('');
  const lemmaCheckedKeysRef = useRef(new Set<string>());
  const noteTouchedRef = useRef(false);
  const originalTagIdsRef = useRef<string[]>([]);
  const currentVideoRef = useRef<File | null>(null);

  const [explicitCardId] = useState(() => parseExplicitCardId());

  // Load settings defaults for new-card mode
  useEffect(() => {
    if (explicitCardId) return;
    let active = true;
    getSettings()
      .then((s) => {
        if (!active) return;
        setTargetLanguage(normalizeSupportedLanguage(s.default_target_language) ?? DEFAULT_TARGET_LANGUAGE);
        setDefinitionLanguage(normalizeSupportedLanguage(s.default_definition_language) ?? DEFAULT_DEFINITION_LANGUAGE);
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
        setTargetLanguage(normalizeSupportedLanguage(card.target_language) ?? DEFAULT_TARGET_LANGUAGE);
        setDefinitionLanguage(normalizeSupportedLanguage(card.definition_language) ?? DEFAULT_DEFINITION_LANGUAGE);
        const tIds = card.tags.map((t) => t.id);
        setSelectedTagIds(tIds);
        setOriginalTagIds(tIds);
        originalTagIdsRef.current = tIds;
        setTagSourceCardId(card.id);
      })
      .catch((err) => {
        if (!active) return;
        setAppendLoadError(err instanceof Error ? err.message : t('create.loadFailed'));
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
      getCardSuggestions(trimmed, targetLanguage)
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
  }, [targetWord, targetLanguage, explicitCardId]);

  useEffect(() => {
    if (explicitCardId) return;
    const word = targetWord.trim();
    const currentSentence = sentence.trim();
    if (!word || !currentSentence) return;

    const key = `${targetLanguage}\n${word}\n${currentSentence}`;
    if (lemmaCheckedKeysRef.current.has(key)) return;

    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      getAiTargetWordLemma({
        target_word: word,
        sentence: currentSentence,
        target_language: targetLanguage,
      })
        .then((result) => {
          if (!active) return;
          if (result.status !== 'success') {
            lemmaCheckedKeysRef.current.add(key);
            return;
          }
          const lemma = result.lemma.trim();
          lemmaCheckedKeysRef.current.add(key);
          if (!lemma || wordsEqual(lemma, word)) {
            setLemmaSuggestion(null);
            return;
          }
          lemmaCheckedKeysRef.current.add(`${targetLanguage}\n${lemma}\n${currentSentence}`);
          setLemmaSuggestion({ original: word, lemma });
        })
        .catch(() => undefined);
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [targetWord, sentence, targetLanguage, explicitCardId]);

  useEffect(() => {
    if (!lemmaSuggestion) return;
    if (!wordsEqual(lemmaSuggestion.original, targetWord) || !sentence.trim()) setLemmaSuggestion(null);
  }, [lemmaSuggestion, targetWord, sentence]);

  // Load AI suggestions when both target word and sentence are present
  useEffect(() => {
    if (explicitCardId) return;
    const trimmedWord = targetWord.trim();
    const trimmedSentence = sentence.trim();
    if (!trimmedWord || !trimmedSentence) {
      setAiMeaningSuggestion('');
      setAiUsageSuggestion('');
      setAiSentenceTranslation('');
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
        target_language: targetLanguage,
        definition_language: definitionLanguage,
      })
        .then((result) => {
          if (!active) return;
          if (result.status === 'success') {
            setAiMeaningSuggestion(result.meaning_suggestion);
            setAiUsageSuggestion(result.usage_note);
            setAiSentenceTranslation(result.sentence_translation);
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

  const exactMatchId = exactMatch?.id ?? null;

  useEffect(() => {
    if (explicitCardId) return;
    if (!exactMatchId) {
      setExactMatchTagLoadError(null);
      setSelectedTagIds((cur) => sameTagSet(cur, originalTagIdsRef.current) ? [] : cur);
      setOriginalTagIds([]);
      originalTagIdsRef.current = [];
      setTagSourceCardId(null);
      return;
    }

    let active = true;
    setExactMatchTagLoadError(null);
    getCard(exactMatchId)
      .then((card) => {
        if (!active) return;
        const tIds = card.tags.map((tag) => tag.id);
        setSelectedTagIds(tIds);
        setOriginalTagIds(tIds);
        originalTagIdsRef.current = tIds;
        setTagSourceCardId(card.id);
        setTargetLanguage(normalizeSupportedLanguage(card.target_language) ?? DEFAULT_TARGET_LANGUAGE);
        setDefinitionLanguage(normalizeSupportedLanguage(card.definition_language) ?? DEFAULT_DEFINITION_LANGUAGE);
      })
      .catch((err) => {
        if (!active) return;
        setExactMatchTagLoadError(err instanceof Error ? err.message : t('create.loadTagsFailed'));
        setSelectedTagIds((cur) => sameTagSet(cur, originalTagIdsRef.current) ? [] : cur);
        setOriginalTagIds([]);
        originalTagIdsRef.current = [];
        setTagSourceCardId(null);
      });

    return () => { active = false; };
  }, [exactMatchId, explicitCardId]);

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
      if (kind === 'video') {
        currentVideoRef.current = null;
        setVideo(null);
        setTranscriptState('idle');
        setTranscriptText('');
        setTranscriptError('');
      }
      if (kind === 'screenshot') setScreenshot(null);
      if (kind === 'audio') setAudio(null);
      return;
    }

    if (kind === 'video' && !isMp4(next)) {
      currentVideoRef.current = null;
      setVideo(null);
      setTranscriptState('idle');
      setTranscriptText('');
      setTranscriptError('');
      setErrors((cur) => ({ ...cur, video: t('create.videoTypeError') }));
      return;
    }
    if (kind === 'screenshot' && !isScreenshot(next)) {
      setScreenshot(null);
      setErrors((cur) => ({ ...cur, screenshot: t('create.screenshotTypeError') }));
      return;
    }
    if (kind === 'audio' && !isMp3(next)) {
      setAudio(null);
      setErrors((cur) => ({ ...cur, audio: t('create.audioTypeError') }));
      return;
    }

    const sizeError = mediaSizeError(kind, next);
    if (sizeError) {
      if (kind === 'video') {
        currentVideoRef.current = null;
        setVideo(null);
        setTranscriptState('idle');
        setTranscriptText('');
        setTranscriptError('');
      }
      if (kind === 'screenshot') setScreenshot(null);
      if (kind === 'audio') setAudio(null);
      setErrors((cur) => ({ ...cur, [kind]: sizeError }));
      return;
    }

    if (kind === 'video') {
      currentVideoRef.current = next;
      setVideo(next);
      setTranscriptState('idle');
      setTranscriptText('');
      setTranscriptError('');
    }
    if (kind === 'screenshot') setScreenshot(next);
    if (kind === 'audio') setAudio(next);
  }

  function handleSentenceChange(value: string) {
    setSentence(value);
    setSpellingIssues([]);
    setSpellingCheckState('idle');
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

  function acceptLemmaSuggestion() {
    if (!lemmaSuggestion) return;
    setTargetWord(lemmaSuggestion.lemma);
    setLemmaSuggestion(null);
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

  async function handleTranscribeVideo() {
    if (!video || video.size > TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES || transcriptState === 'loading') return;

    const requestVideo = video;
    setTranscriptState('loading');
    setTranscriptError('');
    try {
      const result = await transcribeUpload(requestVideo, getLanguageIso6391Code(targetLanguage));
      if (currentVideoRef.current !== requestVideo) return;
      if (result.status === 'success') {
        setTranscriptText(result.text);
        setTranscriptState('success');
      } else {
        setTranscriptError(result.message || t('create.transcriptFailed'));
        setTranscriptState('error');
      }
    } catch (err) {
      if (currentVideoRef.current !== requestVideo) return;
      setTranscriptError(err instanceof Error ? err.message : t('create.transcriptFailed'));
      setTranscriptState('error');
    }
  }

  function useTranscriptAsSentence() {
    if (!transcriptText.trim()) return;
    handleSentenceChange(transcriptText);
  }

  async function handleSpellingCheck() {
    const trimmedSentence = sentence.trim();
    const trimmedWord = targetWord.trim();
    if (!trimmedSentence || !trimmedWord) return;

    setSpellingCheckState('loading');
    setSpellingIssues([]);
    try {
      const result = await checkAiSpelling({
        target_word: trimmedWord,
        sentence: trimmedSentence,
        target_language: targetLanguage,
      });
      const issues = result.status === 'success'
        ? filterProtectedSpellingIssues(result.issues, trimmedWord)
        : [];
      setSpellingIssues(issues);
      setSpellingCheckState(issues.length > 0 ? 'success' : 'empty');
    } catch {
      setSpellingIssues([]);
      setSpellingCheckState('error');
    }
  }

  function acceptSpellingSuggestion(issue: AiSpellingIssueDto) {
    setSentence((current) => replaceFirstWord(current, issue.original, issue.suggestion));
    setSpellingIssues((current) => {
      const index = current.findIndex(
        (item) => item.original === issue.original && item.suggestion === issue.suggestion,
      );
      const next = index === -1 ? current : [...current.slice(0, index), ...current.slice(index + 1)];
      setSpellingCheckState(next.length > 0 ? 'success' : 'idle');
      return next;
    });
  }

  function validate(t: Translator): FieldErrors {
    const errs: FieldErrors = {};
    if (!targetWord.trim()) errs.targetWord = t('create.targetWordRequired');
    if (mode.kind === 'new' && !meaning.trim()) errs.meaning = t('create.meaningRequired');
    if (!sentence.trim()) errs.sentence = t('create.sentenceRequired');
    return errs;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage('');
    const nextErrors = validate(t);
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
              target_language: targetLanguage,
              definition_language: definitionLanguage,
              sentence: sentence.trim(),
              ...(note.trim() ? { note: note.trim() } : {}),
              tag_ids: selectedTagIds,
            };

      const result = await createCard(body);

      // Only patch tags when append mode has loaded the existing card tags and the selection changed.
      if (mode.kind === 'existing' && tagSourceCardId === mode.cardId && !sameTagSet(selectedTagIds, originalTagIds)) {
        await patchCard(mode.cardId, { tag_ids: selectedTagIds });
      }

      if (video) await uploadMedia(result.context.id, video);
      if (screenshot) await uploadMedia(result.context.id, screenshot);
      if (audio) await uploadMedia(result.context.id, audio);

      setSuccessMessage(mode.kind === 'existing' ? t('create.appendSuccess') : t('create.createSuccess'));
      window.location.hash = `#/cards/${result.card.id}`;
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : t('create.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  }

  const saveLabel = isSaving ? t('create.saving') : mode.kind === 'existing' ? t('create.addToExisting') : t('create.createCard');
  const currentMeaning = explicitCardId && mode.kind === 'existing' ? mode.meaning : meaning;
  const showAiMeaningGhost = Boolean(!currentMeaning && aiMeaningSuggestion && !meaningTouched);
  const showSuggestionPanel = Boolean(targetWord.trim());
  const suggestionTitle = appendCard ? t('create.findExistingTitle') : t('create.findExisting');
  const isVideoTooLargeForTranscription = Boolean(video && video.size > TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES);
  const isTranscribeDisabled = !video || transcriptState === 'loading' || isVideoTooLargeForTranscription;

  if (appendLoadError) {
    return (
      <div className="card-create-studio">
        <div className="card-create-alert" role="alert">{appendLoadError}</div>
        <a href="#/cards">{t('create.viewAllCards')}</a>
      </div>
    );
  }

  return (
    <form className="card-create-studio" onSubmit={handleSubmit} noValidate>
      {errors.submit ? <div className="card-create-alert" role="alert">{errors.submit}</div> : null}
      {successMessage ? <div className="card-create-success" role="status">{successMessage}</div> : null}

      <div className="card-create-batch-import-entry">
        <a href="#/batch-import">{t('create.batchImportEntry.action')}</a>
      </div>

      <div className={`card-create-grid${showSuggestionPanel ? '' : ' card-create-grid--single'}`}>
        {/* Main form panel */}
        <section className="card-create-panel card-create-panel-main" aria-label={t('create.formAria')}>
          {/* Sentence */}
          <label className="card-create-field card-create-field-wide" htmlFor="cc-sentence">
            <span>{t('create.sentence')}</span>
            <textarea
              id="cc-sentence"
              aria-label={t('create.sentence')}
              value={sentence}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleSentenceChange(e.target.value)}
              placeholder="The hotel charges $100 per night."
              rows={4}
            />
            <small>{t('create.sentenceHelp')}</small>
            {errors.sentence ? <em>{errors.sentence}</em> : null}
            <div className="card-create-spelling-tools">
              <button
                type="button"
                className="card-create-spelling-button"
                onClick={handleSpellingCheck}
                disabled={spellingCheckState === 'loading' || !sentence.trim() || !targetWord.trim()}
              >
                {spellingCheckState === 'loading' ? t('create.spellingChecking') : t('create.spellingCheck')}
              </button>
              <SpellingCheckResult
                state={spellingCheckState}
                sentence={sentence}
                issues={spellingIssues}
                onAccept={acceptSpellingSuggestion}
                t={t}
              />
            </div>
          </label>

          {/* Target word */}
          <label className="card-create-field" htmlFor="cc-target-word">
            <span>{t('create.targetWord')}</span>
            <input
              id="cc-target-word"
              aria-label={t('create.targetWord')}
              value={targetWord}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetWord(e.target.value)}
              placeholder={t('create.targetWordPlaceholder')}
              disabled={Boolean(explicitCardId)}
            />
            {lemmaSuggestion ? (
              <button type="button" className="card-create-lemma-button" onClick={acceptLemmaSuggestion}>
                使用原型：{lemmaSuggestion.lemma}
              </button>
            ) : null}
            {errors.targetWord ? <em>{errors.targetWord}</em> : null}
          </label>

          {/* Current context meaning */}
          <label className="card-create-field card-create-meaning-field" htmlFor="cc-meaning">
            <span>{t('create.meaning')}</span>
            <div className="card-create-ghost-wrap">
              <input
                id="cc-meaning"
                aria-label={t('create.meaning')}
                value={currentMeaning}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleMeaningChange(e.target.value)}
                onKeyDown={handleMeaningKeyDown}
                disabled={Boolean(explicitCardId)}
                placeholder={showAiMeaningGhost ? '' : t('create.meaningPlaceholder')}
              />
              {showAiMeaningGhost ? (
                <button type="button" className="card-create-ghost-text" onClick={acceptAiMeaningSuggestion}>
                  {t('create.aiSuggestionPrefix')}{aiMeaningSuggestion}
                </button>
              ) : null}
            </div>
            <small>{t('create.meaningHelp')}</small>
            {errors.meaning ? <em>{errors.meaning}</em> : null}
          </label>

          {/* Language row */}
          <div className="card-create-language-row">
            <label className="card-create-field" htmlFor="cc-target-lang">
              <span>{t('create.targetLanguage')}</span>
              <select
                id="cc-target-lang"
                aria-label={t('create.targetLanguage')}
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
              >
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option key={language} value={language}>{getNativeLanguageLabel(language)}</option>
                ))}
              </select>
            </label>
            <label className="card-create-field" htmlFor="cc-def-lang">
              <span>{t('create.definitionLanguage')}</span>
              <select
                id="cc-def-lang"
                aria-label={t('create.definitionLanguage')}
                value={definitionLanguage}
                onChange={(e) => setDefinitionLanguage(e.target.value as SupportedLanguage)}
              >
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option key={language} value={language}>{getNativeLanguageLabel(language)}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Tags */}
          <fieldset className="card-create-tags">
            <legend>{t('create.tags')}</legend>
            <TagAssignmentEditor
              selectedTagIds={selectedTagIds}
              onSelectedTagIdsChange={setSelectedTagIds}
            />
            {exactMatchTagLoadError ? <em>{exactMatchTagLoadError}</em> : null}
          </fieldset>

          {/* AI usage suggestion */}
          <label className="card-create-field card-create-field-wide" htmlFor="cc-note">
            <span>{t('create.aiSuggestion')}</span>
            <textarea
              id="cc-note"
              aria-label={t('create.aiSuggestion')}
              value={note}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleNoteChange(e.target.value)}
              placeholder={aiSuggestionState === 'loading' ? t('create.aiGenerating') : 'none'}
              rows={7}
            />
            {aiSentenceTranslation ? <p className="card-create-translation">{aiSentenceTranslation}</p> : null}
            <small>{aiUsageSuggestion ? t('create.aiNoteHelp') : 'none'}</small>
          </label>

          {/* Media section */}
          <section className="card-create-media" aria-label={t('create.mediaSectionAria')}>
            <div className="card-create-section-heading">
              <p>{t('create.mediaSectionTitle')}</p>
              <span>{t('create.mediaSectionHelp')}</span>
            </div>
            <MediaPicker
              title={t('create.media.video')}
              badge={t('create.media.badgeRecommended')}
              label={t('create.media.uploadVideo')}
              accept="video/mp4,.mp4"
              file={video}
              error={errors.video}
              onChange={(e) => handleMediaChange('video', e.target.files)}
              t={t}
            >
              <div className="card-create-transcription">
                <p className="card-create-transcription-notice">{t('create.transcriptNotice')}</p>
                {isVideoTooLargeForTranscription ? (
                  <em>{TRANSCRIPTION_MESSAGES.sizeLimit}</em>
                ) : null}
                <button
                  type="button"
                  className="card-create-transcribe-button"
                  onClick={handleTranscribeVideo}
                  disabled={isTranscribeDisabled}
                >
                  {transcriptState === 'loading' ? t('create.transcribing') : t('create.transcribe')}
                </button>
                <TranscriptPanel
                  state={transcriptState}
                  text={transcriptText}
                  error={transcriptError}
                  onTextChange={setTranscriptText}
                  onUseAsSentence={useTranscriptAsSentence}
                  t={t}
                />
              </div>
            </MediaPicker>
            <MediaPicker
              title={t('create.media.screenshot')}
              badge={t('create.media.badgeOptional')}
              label={t('create.media.uploadScreenshot')}
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              file={screenshot}
              error={errors.screenshot}
              onChange={(e) => handleMediaChange('screenshot', e.target.files)}
              t={t}
            />
            <MediaPicker
              title={t('create.media.audio')}
              badge={t('create.media.badgeOptional')}
              label={t('create.media.uploadAudio')}
              accept="audio/mpeg,.mp3"
              file={audio}
              error={errors.audio}
              onChange={(e) => handleMediaChange('audio', e.target.files)}
              t={t}
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
              t={t}
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

// ---- SpellingCheckResult sub-component ----

interface SpellingCheckResultProps {
  state: 'idle' | 'loading' | 'empty' | 'success' | 'error';
  sentence: string;
  issues: AiSpellingIssueDto[];
  onAccept: (issue: AiSpellingIssueDto) => void;
  t: Translator;
}

function SpellingCheckResult({ state, sentence, issues, onAccept, t }: SpellingCheckResultProps) {
  if (state === 'idle' || state === 'loading') return null;
  if (state === 'error') return <p className="card-create-spelling-status">{t('create.spellingFailed')}</p>;
  if (state === 'empty' || issues.length === 0) return <p className="card-create-spelling-status">{t('create.spellingNoIssues')}</p>;

  return (
    <div className="card-create-spelling-result">
      <p className="card-create-spelling-preview">
        {renderSpellingPreview(sentence, issues)}
      </p>
      <div className="card-create-spelling-list">
        {issues.map((issue) => (
          <div key={`${issue.original}-${issue.suggestion}`} className="card-create-spelling-issue">
            <span><strong>{issue.original}</strong> → <strong>{issue.suggestion}</strong></span>
            <button
              type="button"
              onClick={() => onAccept(issue)}
              aria-label={t('create.spellingAcceptLabel', { original: issue.original, suggestion: issue.suggestion })}
            >
              {t('create.spellingAccept')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderSpellingPreview(sentence: string, issues: AiSpellingIssueDto[]) {
  const originals = new Set(issues.map((issue) => issue.original.toLocaleLowerCase()));
  const parts = sentence.split(/(\s+)/);
  return parts.map((part, index) => {
    const bare = part.replace(/^\W+|\W+$/g, '');
    if (originals.has(bare.toLocaleLowerCase())) {
      return <mark key={`${part}-${index}`} className="card-create-spelling-highlight">{part}</mark>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
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
  t: Translator;
  children?: ReactNode;
}

function MediaPicker({ title, badge, label, accept, file, error, onChange, t, children }: MediaPickerProps) {
  const inputId = `media-${label.replace(/\s+/g, '-')}`;
  return (
    <div className="card-create-media-picker">
      <span className="card-create-media-title">
        {title}<strong>{badge}</strong>
      </span>
      <span className="card-create-media-file">{fileLabel(file, t)}</span>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <input
        id={inputId}
        aria-label={label}
        type="file"
        accept={accept}
        onChange={onChange}
      />
      {error ? <em>{error}</em> : null}
      {children}
    </div>
  );
}

interface TranscriptPanelProps {
  state: 'idle' | 'loading' | 'success' | 'error';
  text: string;
  error: string;
  onTextChange: (value: string) => void;
  onUseAsSentence: () => void;
  t: Translator;
}

function TranscriptPanel({ state, text, error, onTextChange, onUseAsSentence, t }: TranscriptPanelProps) {
  if (state === 'idle' || state === 'loading') return null;
  if (state === 'error') return <p className="card-create-transcription-error" role="alert">{error || t('create.transcriptFailed')}</p>;

  return (
    <div className="card-create-transcription-result">
      <label htmlFor="cc-transcript">{t('create.transcript')}</label>
      <textarea
        id="cc-transcript"
        aria-label={t('create.transcript')}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        rows={5}
      />
      <button type="button" onClick={onUseAsSentence} disabled={!text.trim()}>
        {t('create.useTranscriptAsSentence')}
      </button>
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
  t: Translator;
}

function SuggestionPanel({ state, targetWord, meaning, suggestions, exactMatch, mode, appendCard, t }: SuggestionPanelProps) {
  if (appendCard) {
    return (
      <p className="card-create-side-copy card-create-exact-notice">
        {t('create.appendContext', { word: appendCard.target_word, meaning: appendCard.context_meaning })}
      </p>
    );
  }
  if (!targetWord.trim()) {
    return null;
  }
  if (state === 'loading') {
    return <p className="card-create-side-copy">{t('create.findingExisting')}</p>;
  }
  if (state === 'error') {
    return <p className="card-create-side-copy">{t('create.findExistingError')}</p>;
  }

  const hasMeaning = meaning.trim().length > 0;

  // Exact match found: force append mode, hide create-new, show matched card + informational others
  if (exactMatch && hasMeaning) {
    const others = suggestions.filter((s) => s.id !== exactMatch.id);
    return (
      <div className="card-create-suggestion-list">
        <p className="card-create-side-copy card-create-exact-notice">
          {t('create.exactMatchFound', { word: exactMatch.target_word, meaning: exactMatch.context_meaning })}
        </p>
        <div className="card-create-suggestion-card card-create-suggestion-card--exact">
          <span>{exactMatch.target_word}</span>
          <strong>{exactMatch.context_meaning}</strong>
          <small>{t('create.addToExisting')}</small>
        </div>
        {others.map((s) => (
          <div key={s.id} className="card-create-suggestion-card card-create-suggestion-card--info">
            <span>{s.target_word}</span>
            <strong>{s.context_meaning}</strong>
            <small>{t('create.otherMeaningNotice')}</small>
          </div>
        ))}
      </div>
    );
  }

  // No suggestions at all
  if (state === 'empty' || suggestions.length === 0) {
    return (
      <div className="card-create-suggestion-list">
        <p className="card-create-side-copy">{t('create.noCardsYet')}</p>
        <div className="card-create-suggestion-card card-create-suggestion-card--new">
          <span>{t('create.createNewCard')}</span>
          <strong>{targetWord.trim() || t('create.newWordFallback')}</strong>
          <small>{t('create.firstContextNotice')}</small>
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
        <p className="card-create-side-copy">{t('create.noSameMeaning')}</p>
      ) : (
        <p className="card-create-side-copy">{t('create.foundSameWord')}</p>
      )}
      {suggestions.map((s) => (
        <div key={s.id} className="card-create-suggestion-card card-create-suggestion-card--info">
          <span>{s.target_word}</span>
          <strong>{s.context_meaning}</strong>
          <small>{t('create.otherMeaningNotice')}</small>
        </div>
      ))}
      <div className="card-create-suggestion-card card-create-suggestion-card--new">
        <span>{t('create.createNewCard')}</span>
        <strong>{targetWord.trim() || t('create.newWordFallback')}</strong>
        <small>{t('create.firstContextNotice')}</small>
      </div>
    </div>
  );
}
