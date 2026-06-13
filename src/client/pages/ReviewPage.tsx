import { useCallback, useEffect, useRef, useState } from 'react';

import type { DueReviewCardDto, MediaDto, ReviewDueResponseDto, ReviewProgressDto } from '../../shared/types';
import { patchCard } from '../api/cards';
import { getDueReview, submitReview } from '../api/review';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/UiStates';
import { useI18n } from '../i18n/I18nProvider';

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

function MediaItem({ item, autoPlay = false }: { item: MediaDto; autoPlay?: boolean }) {
  const { t } = useI18n();
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const unavailable = item.is_available === 0;

  useEffect(() => {
    if (!autoPlay || !mediaRef.current) return;
    const playResult = mediaRef.current.play();
    if (playResult && typeof playResult.catch === 'function') {
      void playResult.catch(() => undefined);
    }
  }, [autoPlay, item.id]);
  if (unavailable) {
    return (
      <div className="phase7-review-media-item phase7-review-media-item--unavailable">
        <span className="phase7-review-media-name">{item.file_name}</span>
        <span className="phase7-review-media-unavailable">{t('common.fileUnavailable')}</span>
      </div>
    );
  }

  const src = mediaUrl(item);
  return (
    <div className="phase7-review-media-item">
      {item.media_type === 'video' ? (
        <video ref={(element) => { mediaRef.current = element; }} className="phase7-review-media-player" src={src} controls preload="metadata" autoPlay={autoPlay} />
      ) : null}
      {item.media_type === 'image' ? (
        <img className="phase7-review-media-image" src={src} alt={item.file_name} />
      ) : null}
      {item.media_type === 'audio' ? (
        <audio ref={(element) => { mediaRef.current = element; }} className="phase7-review-media-player" src={src} controls preload="metadata" autoPlay={autoPlay} />
      ) : null}
      <span className="phase7-review-media-name">{item.file_name}</span>
    </div>
  );
}

// --- Context panel ---

function ContextPanel({ card, revealDetails }: { card: DueReviewCardDto; revealDetails: boolean }) {
  const { t } = useI18n();
  const primaryCtx = card.contexts.find((c) => c.is_primary === 1) ?? card.contexts[0] ?? null;
  const otherContexts = [...card.contexts]
    .filter((c) => c.id !== primaryCtx?.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const tags = card.tags ?? [];

  const primaryMedia = card.media.filter((m) => m.context_example_id === primaryCtx?.id);
  const videos = primaryMedia.filter((m) => m.media_type === 'video').slice(0, 1);
  const images = primaryMedia.filter((m) => m.media_type === 'image');
  const audios = primaryMedia.filter((m) => m.media_type === 'audio');

  return (
    <div className="phase7-review-context-panel">
      {videos.length > 0 && (
        <div className="phase7-review-media-section">
          <p className="phase7-review-media-label">{t('review.media.video')}</p>
          {videos.map((m) => <MediaItem key={m.id} item={m} autoPlay={revealDetails} />)}
        </div>
      )}
      {images.length > 0 && (
        <div className="phase7-review-media-section">
          <p className="phase7-review-media-label">{t('review.media.screenshot')}</p>
          {images.map((m) => <MediaItem key={m.id} item={m} />)}
        </div>
      )}
      {audios.length > 0 && (
        <div className="phase7-review-media-section">
          <p className="phase7-review-media-label">{t('review.media.audio')}</p>
          {audios.map((m) => <MediaItem key={m.id} item={m} autoPlay={revealDetails} />)}
        </div>
      )}
      {revealDetails && primaryCtx?.note ? (
        <div className="phase7-review-context-note">
          <p className="phase7-review-media-label">{t('review.media.note')}</p>
          <p>{primaryCtx.note}</p>
        </div>
      ) : null}
      {revealDetails && tags.length > 0 ? (
        <div className="phase7-review-context-tags">
          <p className="phase7-review-media-label">{t('catalogue.tagLabel')}</p>
          <div className="phase7-review-tag-list">
            {tags.map((tag) => <span key={tag.id} className="phase7-review-tag">{tag.name}</span>)}
          </div>
        </div>
      ) : null}
      {otherContexts.length > 0 && (
        <div className="phase7-review-other-contexts">
          <p className="phase7-review-media-label">{t('review.media.otherContexts')}</p>
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
  const { t } = useI18n();
  return (
    <p className="phase7-review-progress">
      {t('review.progress', { reviewed: progress.reviewed_count, limit: progress.daily_review_limit })}
    </p>
  );
}

// --- Daily limit reminder ---

interface LimitReminderProps {
  onEnd: () => void;
  onContinue: () => void;
}

function LimitReminder({ onEnd, onContinue }: LimitReminderProps) {
  const { t } = useI18n();
  return (
    <div className="phase7-review-limit-banner" role="status">
      <p className="phase7-review-limit-msg">{t('review.doneToday')}</p>
      <div className="phase7-review-limit-actions">
        <Button variant="secondary" onClick={onEnd}>{t('review.endReview')}</Button>
        <Button variant="ghost" onClick={onContinue}>{t('review.continueReview')}</Button>
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
  onChooseRating: (rating: 'again' | 'good') => void;
  onConfirmRating: (advanceAfterSubmit?: boolean) => void;
  onToggleFavorite: () => void;
  onMarkMastered: () => void;
  onNext: () => void;
}

function ReviewCard({ card, progress, submitting, submitError, pendingRating, pendingRequiresConfirm, lastRating, onChooseRating, onConfirmRating, onToggleFavorite, onMarkMastered, onNext }: ReviewCardProps) {
  const { t } = useI18n();
  const [contextOpen, setContextOpen] = useState(false);
  const contextOpenRef = useRef(false);
  const answerRevealed = Boolean(pendingRating || lastRating);

  const setContextOpenNow = (open: boolean) => {
    contextOpenRef.current = open;
    setContextOpen(open);
  };

  const toggleContextOpen = () => {
    setContextOpenNow(!contextOpenRef.current);
  };

  // Reset context panel when a new card loads
  useEffect(() => {
    setContextOpenNow(false);
  }, [card.id]);

  // Reveal context after choosing or recording a rating so mistakes can be caught before advancing.
  useEffect(() => {
    setContextOpenNow(Boolean(pendingRating || lastRating));
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
              {card.is_favorite ? t('review.removeFavorite') : t('review.favorite')}
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={onMarkMastered}>{t('review.markMastered')}</Button>
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
          onClick={toggleContextOpen}
        >
          {contextOpen ? t('review.collapseContext') : t('review.viewContext')}
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
              ? t('review.pendingGood')
              : t('review.pendingRating', { rating: pendingRating === 'good' ? 'Good' : 'Again' })}
          </p>
        ) : null}

        {lastRating && !submitError ? (
          <p className="phase7-review-success">{t('review.recorded', { rating: lastRating === 'good' ? 'Good' : 'Again' })}</p>
        ) : null}

        {lastRating ? (
          <div className="phase7-review-rating-row">
            <Button variant="primary" disabled={submitting} onClick={onNext}>{t('review.next')}</Button>
          </div>
        ) : pendingRating === 'good' ? (
          <div className="phase7-review-rating-row">
            <Button variant="secondary" disabled={submitting} onClick={() => onChooseRating('again')}>{t('review.wrongAgain')}</Button>
            <Button variant="primary" disabled={submitting} onClick={pendingRequiresConfirm ? () => onConfirmRating() : onNext}>
              {pendingRequiresConfirm ? t('review.confirmGood') : t('review.next')}
            </Button>
          </div>
        ) : pendingRating === 'again' ? (
          <div className="phase7-review-rating-row">
            <Button variant="secondary" disabled={submitting} onClick={() => onConfirmRating(true)}>{t('review.confirmAgain')}</Button>
          </div>
        ) : (
          <div className="phase7-review-rating-row">
            <Button variant="secondary" disabled={submitting} onClick={() => onChooseRating('again')}>Again</Button>
            <Button variant="primary" disabled={submitting} onClick={() => onChooseRating('good')}>Good</Button>
          </div>
        )}
      </div>

      {contextOpen ? <ContextPanel card={card} revealDetails={answerRevealed} /> : null}
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
  const { t } = useI18n();
  const tRef = useRef(t);
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingRating, setPendingRating] = useState<'again' | 'good' | null>(null);
  const [pendingRequiresConfirm, setPendingRequiresConfirm] = useState(false);
  const [lastRating, setLastRating] = useState<'again' | 'good' | null>(null);
  const [limitDismissed, setLimitDismissed] = useState(false);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

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
        setState({ kind: 'error', message: err instanceof Error ? err.message : tRef.current('review.loadFailed') });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChooseRating = (rating: 'again' | 'good') => {
    setSubmitError(null);
    setLastRating(null);
    setPendingRating(rating);
    setPendingRequiresConfirm(rating === 'again');
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
        setState({ kind: 'error', message: err instanceof Error ? err.message : tRef.current('review.loadFailed') });
      } else {
        setSubmitError(err instanceof Error ? err.message : tRef.current('review.submitFailed'));
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
        setSubmitError(err instanceof Error ? err.message : tRef.current('review.submitFailed'));
      } else {
        setState({ kind: 'error', message: err instanceof Error ? err.message : tRef.current('review.loadFailed') });
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
      setSubmitError(err instanceof Error ? err.message : t('review.favoriteFailed'));
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
        setState({ kind: 'error', message: err instanceof Error ? err.message : tRef.current('review.loadFailed') });
      } else if (rating && !ratingSubmitted) {
        setSubmitError(err instanceof Error ? err.message : tRef.current('review.submitFailed'));
      } else {
        setSubmitError(err instanceof Error ? err.message : t('review.masteredFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.kind === 'empty') return (
    <div className="phase7-review-shell">
      {lastRating ? (
        <p className="phase7-review-success">{t('review.recorded', { rating: lastRating === 'good' ? 'Good' : 'Again' })}</p>
      ) : null}
      <EmptyState message={t('review.empty')} action={
        <>
          <a href="#/">{t('review.backHome')}</a>
          <a href="#/cards">{t('review.viewAllCards')}</a>
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
