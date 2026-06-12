import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { getAiSuggestion } from '../api/aiSuggestions';
import { createCard, getCardSuggestions } from '../api/cards';
import { analyzeClip } from '../api/clipAnalysis';
import { uploadMedia } from '../api/media';
import { getLocalRecognitionReadiness } from '../api/localRecognition';
import { getSettings } from '../api/settings';
import { TagAssignmentEditor } from '../components/TagAssignmentEditor';
import { useI18n } from '../i18n/I18nProvider';
import {
  DEFAULT_DEFINITION_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  MEDIA_SIZE_LIMIT_MESSAGES,
  MEDIA_SIZE_LIMITS_BYTES,
  SUPPORTED_LANGUAGES,
  getNativeLanguageLabel,
  normalizeSupportedLanguage,
  type SupportedLanguage,
} from '../../shared/constants';
import type { AiTargetWordCandidateDto, ClipSentenceCandidateDto, LocalRecognitionReadinessDto } from '../../shared/types';

type ItemStatus = 'queued' | 'analyzing' | 'ready' | 'error' | 'saving' | 'saved' | 'partialSaveError';

interface BatchItem {
  id: string;
  file: File;
  status: ItemStatus;
  sentence: string;
  targetWord: string;
  meaning: string;
  note: string;
  sentenceTranslation: string;
  suggestionState: 'idle' | 'loading' | 'none' | 'success' | 'error';
  suggestionRequestKey: string;
  candidates: AiTargetWordCandidateDto[];
  sentenceCandidate: ClipSentenceCandidateDto | null;
  comparisonNote: string;
  error: string;
  selectedTagIds: string[];
  savedContextId: string;
  savedCardId: string;
}

function isMp4(file: File): boolean {
  return file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
}

function newItem(file: File): BatchItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    status: 'queued',
    sentence: '',
    targetWord: '',
    meaning: '',
    note: '',
    sentenceTranslation: '',
    suggestionState: 'idle',
    suggestionRequestKey: '',
    candidates: [],
    sentenceCandidate: null,
    comparisonNote: '',
    error: '',
    selectedTagIds: [],
    savedContextId: '',
    savedCardId: '',
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function findExactMatch(suggestions: Array<{ id: string; target_word: string; context_meaning: string }>, targetWord: string, meaning: string) {
  const word = targetWord.trim().toLowerCase();
  const contextMeaning = meaning.trim();
  return suggestions.find((item) => item.target_word.trim().toLowerCase() === word && item.context_meaning.trim() === contextMeaning) ?? null;
}

type ReadinessCopy = {
  title: string;
  loading: string;
  unavailable: string;
  ready: string;
  missing: string;
  disabled: string;
  ffmpeg: string;
  stt: string;
  ocr: string;
  privacy: string;
};

function readinessCopy(language: SupportedLanguage): ReadinessCopy {
  if (language === '中文') {
    return {
      title: '本地识别状态',
      loading: '正在检查本地 OCR/STT 环境…',
      unavailable: '暂时无法读取本地识别状态',
      ready: '可用',
      missing: '缺失',
      disabled: '已关闭',
      ffmpeg: 'FFmpeg',
      stt: '本地 STT whisper.cpp',
      ocr: '本地 OCR Tesseract',
      privacy: 'OCR/STT 在本机运行；候选词来自本地分析，只有释义建议可能使用文本 AI。OCR、STT 或 ffmpeg 缺失时会分别降级，不会互相阻塞。',
    };
  }

  return {
    title: 'Local recognition status',
    loading: 'Checking local OCR/STT readiness…',
    unavailable: 'Local recognition readiness is unavailable right now',
    ready: 'Ready',
    missing: 'Missing',
    disabled: 'Disabled',
    ffmpeg: 'FFmpeg',
    stt: 'Local STT whisper.cpp',
    ocr: 'Local OCR Tesseract',
    privacy: 'OCR/STT run locally on this machine; candidate words come from local analysis, and only meaning suggestions may use text AI. Missing OCR, STT, or ffmpeg paths degrade independently.',
  };
}

function ReadinessItem({ label, ready, disabled, message }: { label: string; ready: boolean; disabled?: boolean; message: string }) {
  const statusClass = disabled ? 'disabled' : ready ? 'ready' : 'missing';
  return (
    <li className={`batch-import-readiness-item ${statusClass}`}>
      <span className="batch-import-readiness-dot" aria-hidden="true" />
      <strong>{label}</strong>
      <span>{message}</span>
    </li>
  );
}

export function BatchClipImportPage() {
  const { language: interfaceLanguage } = useI18n();
  const copy = useMemo(() => readinessCopy(interfaceLanguage), [interfaceLanguage]);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [fileError, setFileError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>(DEFAULT_TARGET_LANGUAGE);
  const [definitionLanguage, setDefinitionLanguage] = useState<SupportedLanguage>(DEFAULT_DEFINITION_LANGUAGE);
  const [readiness, setReadiness] = useState<LocalRecognitionReadinessDto | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessError, setReadinessError] = useState('');
  const suggestionRequestSeqRef = useRef(0);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((settings) => {
        if (!active) return;
        setTargetLanguage(normalizeSupportedLanguage(settings.default_target_language) ?? DEFAULT_TARGET_LANGUAGE);
        setDefinitionLanguage(normalizeSupportedLanguage(settings.default_definition_language) ?? DEFAULT_DEFINITION_LANGUAGE);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setReadinessLoading(true);
    setReadinessError('');
    getLocalRecognitionReadiness(targetLanguage)
      .then((result) => {
        if (!active) return;
        setReadiness(result);
      })
      .catch((err) => {
        if (!active) return;
        setReadiness(null);
        setReadinessError(errorMessage(err, copy.unavailable));
      })
      .finally(() => {
        if (active) setReadinessLoading(false);
      });
    return () => { active = false; };
  }, [copy.unavailable, targetLanguage]);

  const hasProcessableItems = useMemo(() => items.some((item) => item.status === 'queued' || item.status === 'error'), [items]);

  const clearReadyItemSuggestions = () => {
    setItems((current) => current.map((item) => {
      if (item.status !== 'ready' && item.status !== 'partialSaveError') return item;
      if (!item.meaning && !item.note && !item.sentenceTranslation && !item.suggestionRequestKey) return item;
      return {
        ...item,
        meaning: '',
        note: '',
        sentenceTranslation: '',
        suggestionState: 'idle',
        suggestionRequestKey: '',
        error: '',
      };
    }));
  };

  const handleTargetLanguageChange = (value: string) => {
    setTargetLanguage(normalizeSupportedLanguage(value) ?? DEFAULT_TARGET_LANGUAGE);
    clearReadyItemSuggestions();
  };

  const handleDefinitionLanguageChange = (value: string) => {
    setDefinitionLanguage(normalizeSupportedLanguage(value) ?? DEFAULT_DEFINITION_LANGUAGE);
    clearReadyItemSuggestions();
  };

  const patchItem = (id: string, patch: Partial<BatchItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const patchSuggestionIfCurrent = (id: string, requestKey: string, patch: Partial<BatchItem>) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.suggestionRequestKey !== requestKey) return item;
      return { ...item, ...patch };
    }));
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of selected) {
      if (!isMp4(file)) rejected.push(file.name);
      else if (file.size > MEDIA_SIZE_LIMITS_BYTES.video) rejected.push(`${file.name}（${MEDIA_SIZE_LIMIT_MESSAGES.video}）`);
      else accepted.push(file);
    }
    setFileError(rejected.length ? `仅支持 MP4 视频：${rejected.join('、')}` : '');
    if (accepted.length) setItems((current) => [...current, ...accepted.map(newItem)]);
    event.target.value = '';
  };

  const requestCandidateSuggestion = async (id: string, sentence: string, targetWord: string) => {
    const requestKey = `${++suggestionRequestSeqRef.current}`;
    patchItem(id, { meaning: '', note: '', sentenceTranslation: '', suggestionState: 'loading', suggestionRequestKey: requestKey, error: '' });
    try {
      const suggestion = await getAiSuggestion({
        target_word: targetWord,
        sentence,
        target_language: targetLanguage,
        definition_language: definitionLanguage,
      });
      if (suggestion.status === 'success') {
        patchSuggestionIfCurrent(id, requestKey, {
          meaning: suggestion.meaning_suggestion,
          note: suggestion.usage_note,
          sentenceTranslation: suggestion.sentence_translation,
          suggestionState: 'success',
          error: '',
        });
      } else {
        patchSuggestionIfCurrent(id, requestKey, { suggestionState: 'none', error: `AI 建议失败：${suggestion.message}` });
      }
    } catch (err) {
      patchSuggestionIfCurrent(id, requestKey, { suggestionState: 'error', error: `AI 建议失败：${errorMessage(err, '建议失败')}` });
    }
  };

  const processAll = async () => {
    setProcessing(true);
    try {
      const targets = items.filter((item) => item.status === 'queued' || item.status === 'error');
      for (const item of targets) {
        patchItem(item.id, { status: 'analyzing', error: '' });
        try {
          const result = await analyzeClip(item.file, targetLanguage, definitionLanguage);
          if (result.status === 'none') {
            patchItem(item.id, { status: 'error', error: result.message });
            continue;
          }
          const sentence = result.sentence.text;
          patchItem(item.id, {
            status: 'ready',
            sentence,
            sentenceCandidate: result.sentence,
            candidates: result.candidates,
            comparisonNote: result.note ?? '',
            targetWord: item.targetWord,
            error: '',
          });
        } catch (err) {
          patchItem(item.id, { status: 'error', error: errorMessage(err, '分析失败') });
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const updateItemTargetWord = (item: BatchItem, targetWord: string) => {
    const sentence = item.sentence.trim();
    patchItem(item.id, {
      targetWord,
      meaning: '',
      note: '',
      sentenceTranslation: '',
      suggestionState: sentence && targetWord.trim() ? 'loading' : 'idle',
      suggestionRequestKey: '',
      error: '',
    });
    if (sentence && targetWord.trim()) void requestCandidateSuggestion(item.id, sentence, targetWord.trim());
  };

  const updateItemSentence = (item: BatchItem, sentence: string) => {
    const targetWord = item.targetWord.trim();
    patchItem(item.id, {
      sentence,
      meaning: '',
      note: '',
      sentenceTranslation: '',
      suggestionState: sentence.trim() && targetWord ? 'loading' : 'idle',
      suggestionRequestKey: '',
      error: '',
    });
    if (sentence.trim() && targetWord) void requestCandidateSuggestion(item.id, sentence.trim(), targetWord);
  };

  const selectCandidate = (item: BatchItem, targetWord: string) => {
    const sentence = item.sentence.trim();
    if (!sentence) {
      patchItem(item.id, { targetWord, error: '请先填写原句' });
      return;
    }
    updateItemTargetWord(item, targetWord);
  };

  const saveItem = async (item: BatchItem) => {
    const sentence = item.sentence.trim();
    const targetWord = item.targetWord.trim();
    const meaning = item.meaning.trim();
    const note = item.note.trim();
    if (!sentence || !targetWord || !meaning) {
      patchItem(item.id, { error: '原句、目标单词和当前语境释义必填' });
      return;
    }
    patchItem(item.id, { status: 'saving', error: '' });
    try {
      const savedContextId = item.savedContextId;
      let contextId = savedContextId;
      let cardId = item.savedCardId;

      if (!contextId) {
        const suggestions = await getCardSuggestions(targetWord, targetLanguage);
        const exact = findExactMatch(suggestions, targetWord, meaning);
        const created = exact
          ? await createCard({ card_id: exact.id, sentence, ...(note ? { note } : {}) })
          : await createCard({
              target_word: targetWord,
              context_meaning: meaning,
              target_language: targetLanguage,
              definition_language: definitionLanguage,
              sentence,
              ...(note ? { note } : {}),
              tag_ids: item.selectedTagIds,
            });
        contextId = created.context.id;
        cardId = created.card.id;
        patchItem(item.id, { savedContextId: contextId, savedCardId: cardId });
      }

      try {
        await uploadMedia(contextId, item.file);
        patchItem(item.id, { status: 'saved', error: '', savedContextId: contextId, savedCardId: cardId });
      } catch (err) {
        patchItem(item.id, {
          status: 'partialSaveError',
          error: `卡片已保存，但媒体上传失败：${errorMessage(err, '上传失败')}`,
          savedContextId: contextId,
          savedCardId: cardId,
        });
      }
    } catch (err) {
      patchItem(item.id, { status: 'ready', error: errorMessage(err, '保存失败') });
    }
  };

  return (
    <section className="batch-import-page" aria-label="批量视频导入">
      <div className="batch-import-toolbar">
        <div>
          <h2>批量导入视频片段</h2>
          <p>选择多个 MP4，先分析例句和本地候选词；选中目标词后生成 AI 释义建议，再保存为卡片。</p>
          <p className="batch-import-privacy">{copy.privacy}</p>
        </div>
        <div className="batch-import-controls">
          <label>
            学习语言
            <select aria-label="学习语言" value={targetLanguage} onChange={(event) => handleTargetLanguageChange(event.target.value)}>
              {SUPPORTED_LANGUAGES.map((language) => <option key={language} value={language}>{getNativeLanguageLabel(language)}</option>)}
            </select>
          </label>
          <label>
            释义语言
            <select aria-label="释义语言" value={definitionLanguage} onChange={(event) => handleDefinitionLanguageChange(event.target.value)}>
              {SUPPORTED_LANGUAGES.map((language) => <option key={language} value={language}>{getNativeLanguageLabel(language)}</option>)}
            </select>
          </label>
          <label className="batch-import-file-label">
            批量选择 MP4 视频
            <input aria-label="批量选择 MP4 视频" type="file" accept="video/mp4" multiple onChange={handleFiles} />
          </label>
          <button type="button" onClick={processAll} disabled={processing || !hasProcessableItems}>{processing ? '分析中…' : '全部分析'}</button>
        </div>
      </div>

      <aside className="batch-import-readiness" aria-label={copy.title}>
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.privacy}</p>
        </div>
        {readinessLoading ? <p className="batch-import-readiness-loading">{copy.loading}</p> : null}
        {readinessError ? <p className="batch-import-error">{readinessError}</p> : null}
        {readiness ? (
          <ul>
            <ReadinessItem label={`${copy.ffmpeg} · ${readiness.ffmpeg.ready ? copy.ready : copy.missing}`} ready={readiness.ffmpeg.ready} message={readiness.ffmpeg.message} />
            <ReadinessItem label={`${copy.stt} · ${readiness.stt.provider === 'disabled' ? copy.disabled : readiness.stt.ready ? copy.ready : copy.missing}`} ready={readiness.stt.ready} disabled={readiness.stt.provider === 'disabled'} message={readiness.stt.message} />
            <ReadinessItem label={`${copy.ocr} · ${readiness.ocr.provider === 'disabled' ? copy.disabled : readiness.ocr.ready ? copy.ready : copy.missing}`} ready={readiness.ocr.ready} disabled={readiness.ocr.provider === 'disabled'} message={readiness.ocr.message} />
          </ul>
        ) : null}
      </aside>

      {fileError ? <p className="batch-import-error">{fileError}</p> : null}
      {items.length === 0 ? <p className="batch-import-empty">还没有待处理视频。</p> : null}

      <div className="batch-import-list">
        {items.map((item) => (
          <article key={item.id} className={`batch-import-item status-${item.status}`}>
            <header>
              <div>
                <h3>{item.file.name}</h3>
                <p>{item.status === 'queued' ? '待分析' : item.status === 'analyzing' ? '分析中…' : item.status === 'ready' ? '待保存' : item.status === 'saving' ? '保存中…' : item.status === 'saved' ? '已保存' : item.status === 'partialSaveError' ? '部分保存' : '分析失败'}</p>
              </div>
              {item.status === 'ready' || item.status === 'partialSaveError' ? <button type="button" onClick={() => saveItem(item)} title="保存会创建新卡片或追加到已有卡片，并上传媒体。">保存 {item.file.name}</button> : null}
            </header>

            {item.sentenceCandidate ? <p className="batch-import-meta">来源：{item.sentenceCandidate.source} · 置信度：{item.sentenceCandidate.confidence}</p> : null}
            {item.comparisonNote ? <p className="batch-import-note">{item.comparisonNote}</p> : null}
            {item.error ? <p className="batch-import-error">{item.error}</p> : null}
            {item.status === 'saved' ? <p className="batch-import-success">已保存</p> : null}

            {(item.status === 'ready' || item.status === 'saving' || item.status === 'saved' || item.status === 'partialSaveError') ? (
              <div className="batch-import-form">
                <label>
                  原句
                  <textarea aria-label={`原句 ${item.file.name}`} value={item.sentence} onChange={(event) => updateItemSentence(item, event.target.value)} />
                </label>
                <label>
                  目标单词
                  <input aria-label={`目标单词 ${item.file.name}`} value={item.targetWord} onChange={(event) => updateItemTargetWord(item, event.target.value)} />
                </label>
                {item.candidates.length ? (
                  <div className="batch-import-candidates" aria-label="候选目标词">
                    <p>候选词来自本地分析。选择目标词后会生成 AI 释义建议。</p>
                    {item.candidates.map((candidate) => (
                      <button key={`${item.id}-${candidate.target_word}`} type="button" onClick={() => selectCandidate(item, candidate.target_word)}>
                        {candidate.target_word} · {candidate.difficulty_hint}
                      </button>
                    ))}
                  </div>
                ) : null}
                <label>
                  当前语境释义
                  <input aria-label={`当前语境释义 ${item.file.name}`} value={item.meaning} onChange={(event) => patchItem(item.id, { meaning: event.target.value })} />
                </label>
                <label>
                  AI 建议
                  <textarea aria-label={`AI 建议 ${item.file.name}`} value={item.note} onChange={(event) => patchItem(item.id, { note: event.target.value })} />
                </label>
                {item.suggestionState === 'loading' ? <p className="batch-import-note">AI 建议生成中…</p> : null}
                {item.sentenceTranslation ? <p className="batch-import-note">{item.sentenceTranslation}</p> : null}
                <div>
                  <p>标签</p>
                  <TagAssignmentEditor
                    selectedTagIds={item.selectedTagIds}
                    onSelectedTagIdsChange={(updater) => {
                      setItems((current) => current.map((currentItem) => {
                        if (currentItem.id !== item.id) return currentItem;
                        const nextIds = typeof updater === 'function' ? updater(currentItem.selectedTagIds) : updater;
                        return { ...currentItem, selectedTagIds: nextIds };
                      }));
                    }}
                  />
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
