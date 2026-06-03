import { useCallback, useEffect, useState } from 'react';

import type { DueReviewCardDto, MediaDto, ReviewDueResponseDto, ReviewProgressDto } from '../../shared/types';
import { patchCard } from '../api/cards';
import { getDueReview, submitReview } from '../api/review';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/UiStates';

// --- Sentence highlighter ---

function highlightWord(sentence: string, word: string): React.ReactNode {
  if (!word) return sentence;
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = sentence.split(regex);
  return parts.map((part, i) => {
    regex.lastIndex = 0;
    return regex.test(part) ? <mark key={i}>{part}</mark> : part;
  });
}

// --- Media item ---

function mediaUrl(item: MediaDto): string {
  return `/uploads/${encodeURIComponent(item.file_name)}`;
}

function MediaItem({ item }: { item: MediaDto }) {
  const unavailable = item.is_available === 0;
  if (unavailable) {
    return (
      <div className="phase7-review-media-item phase7-review-media-item--unavailable">
        <span className="phase7-review-media-name">{item.file_name}</span>
        <span className="phase7-review-media-unavailable">文件不可用</span>
      </div>
    );
  }

  const src = mediaUrl(item);
  return (
    <div className="phase7-review-media-item">
      {item.media_type === 'video' ? (
        <video className="phase7-review-media-player" src={src} controls preload="metadata" />
      ) : null}
      {item.media_type === 'image' ? (
        <img className="phase7-review-media-image" src={src} alt={item.file_name} />
      ) : null}
      {item.media_type === 'audio' ? (
        <audio className="phase7-review-media-player" src={src} controls preload="metadata" />
      ) : null}
      <span className="phase7-review-media-name">{item.file_name}</span>
    </div>
  );
}

// --- Context panel ---

function ContextPanel({ card }: { card: DueReviewCardDto }) {
  const primaryCtx = card.contexts.find((c) => c.is_primary === 1) ?? card.contexts[0] ?? null;
  const otherContexts = [...card.contexts]
    .filter((c) => c.id !== primaryCtx?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const primaryMedia = card.media.filter((m) => m.context_example_id === primaryCtx?.id);
  const videos = primaryMedia.filter((m) => m.media_type === 'video').slice(0, 1);
  const images = primaryMedia.filter((m) => m.media_type === 'image');
  const audios = primaryMedia.filter((m) => m.media_type === 'audio');

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
  pendingRating: 'again' | 'good' | null;
  pendingRequiresConfirm: boolean;
  lastRating: 'again' | 'good' | null;
  onChooseRating: (rating: 'again' | 'good', contextWasOpen: boolean) => void;
  onConfirmRating: (advanceAfterSubmit?: boolean) => void;
  onToggleFavorite: () => void;
  onMarkMastered: () => void;
  onNext: () => void;
}

function ReviewCard({ card, progress, submitting, submitError, pendingRating, pendingRequiresConfirm, lastRating, onChooseRating, onConfirmRating, onToggleFavorite, onMarkMastered, onNext }: ReviewCardProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const answerRevealed = Boolean(pendingRating || lastRating);

  // Reset context panel when a new card loads
  useEffect(() => {
    setContextOpen(false);
  }, [card.id]);

  // Reveal context after choosing or recording a rating so mistakes can be caught before advancing.
  useEffect(() => {
    if (pendingRating || lastRating) {
      setContextOpen(true);
    } else {
      setContextOpen(false);
    }
  }, [pendingRating, lastRating]);

  return (
    <div className="phase7-review-card">
      <div className="phase7-review-card-header">
        <div className="phase7-review-card-title-block">
          <h2 className="phase7-review-word">{card.target_word}</h2>
          {answerRevealed ? <p className="phase7-review-meaning">{card.context_meaning}</p> : null}
        </div>
        {answerRevealed ? (
          <div className="phase7-review-card-header-actions">
            <Button variant="secondary" disabled={submitting} onClick={onToggleFavorite}>
              {card.is_favorite ? '取消收藏' : '收藏'}
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={onMarkMastered}>标记熟记</Button>
          </div>
        ) : null}
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

      <div className="phase7-review-footer">
        <ProgressLabel progress={progress} />

        {submitError ? (
          <div role="alert" className="phase7-review-submit-error">{submitError}</div>
        ) : null}

        {pendingRating && !lastRating ? (
          <p className="phase7-review-success">
            {pendingRating === 'good' && !pendingRequiresConfirm
              ? 'Good 已选择，请查看语境；确认无误后进入下一张。'
              : `已选择 ${pendingRating === 'good' ? 'Good' : 'Again'}，请查看语境后确认。`}
          </p>
        ) : null}

        {lastRating && !submitError ? (
          <p className="phase7-review-success">{lastRating === 'good' ? 'Good' : 'Again'} 已记录</p>
        ) : null}

        {lastRating ? (
          <div className="phase7-review-rating-row">
            <Button variant="primary" disabled={submitting} onClick={onNext}>下一张</Button>
          </div>
        ) : pendingRating === 'good' ? (
          <div className="phase7-review-rating-row">
            <Button variant="secondary" disabled={submitting} onClick={() => onChooseRating('again', true)}>记错了，Again</Button>
            <Button variant="primary" disabled={submitting} onClick={pendingRequiresConfirm ? () => onConfirmRating() : onNext}>
              {pendingRequiresConfirm ? '确认 Good' : '下一张'}
            </Button>
          </div>
        ) : pendingRating === 'again' ? (
          <div className="phase7-review-rating-row">
            <Button variant="secondary" disabled={submitting} onClick={() => onConfirmRating(true)}>确认</Button>
          </div>
        ) : (
          <div className="phase7-review-rating-row">
            <Button variant="secondary" disabled={submitting} onClick={() => onChooseRating('again', contextOpen)}>Again</Button>
            <Button variant="primary" disabled={submitting} onClick={() => onChooseRating('good', contextOpen)}>Good</Button>
          </div>
        )}
      </div>

      {contextOpen ? <ContextPanel card={card} /> : null}
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
  const [pendingRating, setPendingRating] = useState<'again' | 'good' | null>(null);
  const [pendingRequiresConfirm, setPendingRequiresConfirm] = useState(false);
  const [lastRating, setLastRating] = useState<'again' | 'good' | null>(null);
  const [limitDismissed, setLimitDismissed] = useState(false);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    setSubmitError(null);
    setPendingRating(null);
    setPendingRequiresConfirm(false);
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

  const handleChooseRating = (rating: 'again' | 'good', contextWasOpen: boolean) => {
    setSubmitError(null);
    setLastRating(null);
    setPendingRating(rating);
    setPendingRequiresConfirm(rating === 'again' || contextWasOpen);
  };

  const handleConfirmRating = async (advanceAfterSubmit = false) => {
    if (state.kind !== 'due') return;
    const rating = pendingRating;
    if (!rating) return;

    let ratingSubmitted = false;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitReview(state.card.id, { rating });
      ratingSubmitted = true;
      if (!result.progress.is_limit_reached) {
        setLimitDismissed(false);
      }

      if (advanceAfterSubmit) {
        const res = await getDueReview();
        setPendingRating(null);
        setPendingRequiresConfirm(false);
        setLastRating(null);
        if (res.status === 'due') {
          setState({ kind: 'due', card: res.card, progress: res.progress });
          if (!res.progress.is_limit_reached) {
            setLimitDismissed(false);
          }
        } else {
          setState({ kind: 'empty', progress: res.progress });
        }
        return;
      }

      setState({ kind: 'due', card: state.card, progress: result.progress });
      setPendingRating(null);
      setPendingRequiresConfirm(false);
      setLastRating(rating);
    } catch (err) {
      if (advanceAfterSubmit && ratingSubmitted) {
        setState({ kind: 'error', message: err instanceof Error ? err.message : '无法加载复习内容' });
      } else {
        setSubmitError(err instanceof Error ? err.message : '提交失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (state.kind !== 'due') return;

    const rating = pendingRating;
    let ratingSubmitted = false;
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (rating) {
        const result = await submitReview(state.card.id, { rating });
        ratingSubmitted = true;
        if (!result.progress.is_limit_reached) {
          setLimitDismissed(false);
        }
      }

      const res = await getDueReview();
      setPendingRating(null);
      setPendingRequiresConfirm(false);
      setLastRating(null);
      if (res.status === 'due') {
        setState({ kind: 'due', card: res.card, progress: res.progress });
        if (!res.progress.is_limit_reached) {
          setLimitDismissed(false);
        }
      } else {
        setState({ kind: 'empty', progress: res.progress });
      }
    } catch (err) {
      if (rating && !ratingSubmitted) {
        setSubmitError(err instanceof Error ? err.message : '提交失败，请重试');
      } else {
        setState({ kind: 'error', message: err instanceof Error ? err.message : '无法加载复习内容' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (state.kind !== 'due') return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await patchCard(state.card.id, { is_favorite: !state.card.is_favorite });
      setState({ kind: 'due', card: { ...state.card, is_favorite: updated.is_favorite, updated_at: updated.updated_at }, progress: state.progress });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '收藏状态更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkMastered = async () => {
    if (state.kind !== 'due') return;

    const rating = pendingRating;
    let ratingSubmitted = false;
    let mastered = false;
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (rating) {
        const result = await submitReview(state.card.id, { rating });
        ratingSubmitted = true;
        if (!result.progress.is_limit_reached) {
          setLimitDismissed(false);
        }
      }

      await patchCard(state.card.id, { status: 'mastered' });
      mastered = true;

      const res = await getDueReview();
      setPendingRating(null);
      setPendingRequiresConfirm(false);
      setLastRating(null);
      if (res.status === 'due') {
        setState({ kind: 'due', card: res.card, progress: res.progress });
        if (!res.progress.is_limit_reached) {
          setLimitDismissed(false);
        }
      } else {
        setState({ kind: 'empty', progress: res.progress });
      }
    } catch (err) {
      if (mastered) {
        setState({ kind: 'error', message: err instanceof Error ? err.message : '无法加载复习内容' });
      } else if (rating && !ratingSubmitted) {
        setSubmitError(err instanceof Error ? err.message : '提交失败，请重试');
      } else {
        setSubmitError(err instanceof Error ? err.message : '标记熟记失败，请重试');
      }
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
      <EmptyState message="今天没有待复习内容" action={
        <>
          <a href="#/">返回首页</a>
          <a href="#/cards">查看全部词义条目</a>
        </>
      } />
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
        pendingRating={pendingRating}
        pendingRequiresConfirm={pendingRequiresConfirm}
        lastRating={lastRating}
        onChooseRating={handleChooseRating}
        onConfirmRating={handleConfirmRating}
        onToggleFavorite={handleToggleFavorite}
        onMarkMastered={handleMarkMastered}
        onNext={handleNext}
      />
    </div>
  );
}
