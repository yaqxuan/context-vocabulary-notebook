import { useCallback, useEffect, useState } from 'react';

import type { DueReviewCardDto, MediaDto, ReviewDueResponseDto, ReviewProgressDto } from '../../shared/types';
import { getDueReview, submitReview } from '../api/review';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/UiStates';

// --- Sentence highlighter ---

function highlightWord(sentence: string, word: string): React.ReactNode {
  if (!word) return sentence;
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = sentence.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part,
  );
}

// --- Media item ---

function MediaItem({ item }: { item: MediaDto }) {
  const unavailable = item.is_available === 0;
  return (
    <div className="phase7-review-media-item">
      <span className="phase7-review-media-name">{item.file_name}</span>
      {unavailable ? (
        <span className="phase7-review-media-unavailable">文件不可用</span>
      ) : null}
    </div>
  );
}

// --- Context panel ---

function ContextPanel({ card }: { card: DueReviewCardDto }) {
  const primaryCtx = card.contexts.find((c) => c.is_primary === 1) ?? card.contexts[0] ?? null;
  const otherContexts = [...card.contexts]
    .filter((c) => c.id !== primaryCtx?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const videos = card.media.filter((m) => m.media_type === 'video');
  const images = card.media.filter((m) => m.media_type === 'image');
  const audios = card.media.filter((m) => m.media_type === 'audio');

  return (
    <div className="phase7-review-context-panel">
      {videos.length > 0 && (
        <div className="phase7-review-media-section">
          <p className="phase7-review-media-label">视频</p>
          {videos.map((m) => <MediaItem key={m.id} item={m} />)}
        </div>
      )}
      {images.length > 0 && (
        <div className="phase7-review-media-section">
          <p className="phase7-review-media-label">截图</p>
          {images.map((m) => <MediaItem key={m.id} item={m} />)}
        </div>
      )}
      {audios.length > 0 && (
        <div className="phase7-review-media-section">
          <p className="phase7-review-media-label">音频</p>
          {audios.map((m) => <MediaItem key={m.id} item={m} />)}
        </div>
      )}
      {primaryCtx?.note ? (
        <div className="phase7-review-context-note">
          <p className="phase7-review-media-label">语境笔记</p>
          <p>{primaryCtx.note}</p>
        </div>
      ) : null}
      {otherContexts.length > 0 && (
        <div className="phase7-review-other-contexts">
          <p className="phase7-review-media-label">其他语境</p>
          {otherContexts.map((c) => (
            <p key={c.id} className="phase7-review-other-sentence">{c.sentence}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Progress bar label ---

function ProgressLabel({ progress }: { progress: ReviewProgressDto }) {
  return (
    <p className="phase7-review-progress">
      今日已复习 {progress.reviewed_count} / {progress.daily_review_limit}
    </p>
  );
}

// --- Daily limit reminder ---

interface LimitReminderProps {
  onEnd: () => void;
  onContinue: () => void;
}

function LimitReminder({ onEnd, onContinue }: LimitReminderProps) {
  return (
    <div className="phase7-review-limit-banner" role="status">
      <p className="phase7-review-limit-msg">今日目标已完成，休息一下也没关系。</p>
      <div className="phase7-review-limit-actions">
        <Button variant="secondary" onClick={onEnd}>结束复习</Button>
        <Button variant="ghost" onClick={onContinue}>继续复习</Button>
      </div>
    </div>
  );
}

// --- Review card ---

interface ReviewCardProps {
  card: DueReviewCardDto;
  progress: ReviewProgressDto;
  submitting: boolean;
  submitError: string | null;
  lastRating: 'again' | 'good' | null;
  onAgain: () => void;
  onGood: () => void;
}

function ReviewCard({ card, progress, submitting, submitError, lastRating, onAgain, onGood }: ReviewCardProps) {
  const [contextOpen, setContextOpen] = useState(false);

  // Reset context panel when a new card loads
  useEffect(() => {
    setContextOpen(false);
  }, [card.id]);

  return (
    <div className="phase7-review-card">
      <div className="phase7-review-card-header">
        <p className="phase7-review-kicker">复习</p>
        <h2 className="phase7-review-word">{card.target_word}</h2>
        <p className="phase7-review-meaning">{card.context_meaning}</p>
      </div>

      <div className="phase7-review-sentence-block">
        <p className="phase7-review-sentence">
          {highlightWord(card.primary_sentence, card.target_word)}
        </p>
      </div>

      <div className="phase7-review-controls">
        <button
          type="button"
          className="phase7-review-toggle"
          aria-expanded={contextOpen}
          onClick={() => setContextOpen((v) => !v)}
        >
          {contextOpen ? '收起语境' : '查看当时语境'}
        </button>
      </div>

      {contextOpen ? <ContextPanel card={card} /> : null}

      <div className="phase7-review-footer">
        <ProgressLabel progress={progress} />

        {submitError ? (
          <div role="alert" className="phase7-review-submit-error">{submitError}</div>
        ) : null}

        {lastRating && !submitError ? (
          <p className="phase7-review-success">{lastRating === 'good' ? 'Good' : 'Again'} 已记录</p>
        ) : null}

        <div className="phase7-review-rating-row">
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={onAgain}
          >
            Again
          </Button>
          <Button
            variant="primary"
            disabled={submitting}
            onClick={onGood}
          >
            Good
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Main page ---

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty'; progress: ReviewProgressDto }
  | { kind: 'due'; card: DueReviewCardDto; progress: ReviewProgressDto };

export function ReviewPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastRating, setLastRating] = useState<'again' | 'good' | null>(null);
  const [limitDismissed, setLimitDismissed] = useState(false);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    setSubmitError(null);
    setLastRating(null);
    getDueReview()
      .then((res: ReviewDueResponseDto) => {
        if (res.status === 'due') {
          setState({ kind: 'due', card: res.card, progress: res.progress });
          // Reset limit banner when a new card loads and limit wasn't already dismissed
          if (!res.progress.is_limit_reached) {
            setLimitDismissed(false);
          }
        } else {
          setState({ kind: 'empty', progress: res.progress });
        }
      })
      .catch((err: unknown) => {
        setState({ kind: 'error', message: err instanceof Error ? err.message : '无法加载复习内容' });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (rating: 'again' | 'good') => {
    if (state.kind !== 'due') return;
    const cardId = state.card.id;

    setSubmitting(true);
    setSubmitError(null);
    setLastRating(null);

    try {
      await submitReview(cardId, { rating });
      setLastRating(rating);
      // Fetch next card without going through full loading state
      const res = await getDueReview();
      if (res.status === 'due') {
        setState({ kind: 'due', card: res.card, progress: res.progress });
        if (!res.progress.is_limit_reached) {
          setLimitDismissed(false);
        }
      } else {
        setState({ kind: 'empty', progress: res.progress });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === 'loading') return <LoadingState message="加载中…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.kind === 'empty') return (
    <div className="phase7-review-shell">
      {lastRating ? (
        <p className="phase7-review-success">{lastRating === 'good' ? 'Good' : 'Again'} 已记录</p>
      ) : null}
      <EmptyState message="今天没有待复习内容" />
      <ProgressLabel progress={state.progress} />
    </div>
  );

  const showLimitBanner = state.progress.is_limit_reached && !limitDismissed;

  return (
    <div className="phase7-review-shell">
      {showLimitBanner ? (
        <LimitReminder
          onEnd={() => setLimitDismissed(true)}
          onContinue={() => setLimitDismissed(true)}
        />
      ) : null}
      <ReviewCard
        card={state.card}
        progress={state.progress}
        submitting={submitting}
        submitError={submitError}
        lastRating={lastRating}
        onAgain={() => handleSubmit('again')}
        onGood={() => handleSubmit('good')}
      />
    </div>
  );
}
