import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CardDetailDto, ContextDto } from '../../shared/types';
import { deleteCard, getCard, patchCard } from '../api/cards';
import { deleteContext, moveContextDown, moveContextUp, setPrimaryContext } from '../api/contexts';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPreview } from '../components/MediaPreview';
import { TagAssignmentEditor } from '../components/TagAssignmentEditor';
import { ErrorState, LoadingState } from '../components/UiStates';
import { useI18n } from '../i18n/I18nProvider';
import type { Translator } from '../i18n/types';

function currentCardId(): string {
  return decodeURIComponent(window.location.hash.replace(/^#\/cards\//, '').split('?')[0] ?? '');
}

function mediaForContext(card: CardDetailDto, contextId: string) {
  return card.media.filter((media) => media.context_example_id === contextId);
}

function formatReviewTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function statusSummary(card: CardDetailDto, t: Translator): string {
  if (card.status === 'mastered') return t('detail.statusMastered');
  if (!card.fsrs.due_date) return t('detail.statusReviewingNoDue');
  const due = new Date(card.fsrs.due_date).getTime();
  if (!Number.isNaN(due) && due <= Date.now()) {
    return t('detail.statusReviewingNow');
  }
  return t('detail.statusReviewingDue', { date: formatReviewTime(card.fsrs.due_date) });
}

export function CardDetailPage() {
  const { t } = useI18n();
  const [card, setCard] = useState<CardDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'card' | ContextDto | null>(null);
  const [editingMeaning, setEditingMeaning] = useState(false);
  const [meaningDraft, setMeaningDraft] = useState('');
  const [meaningError, setMeaningError] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const mountedRef = useRef(true);
  const cardId = useMemo(currentCardId, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getCard(cardId)
      .then(setCard)
      .catch((err: unknown) => {
        setCard(null);
        setError(err instanceof Error ? err.message : t('detail.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const runAndReload = async (action: () => Promise<unknown>) => {
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.actionFailed'));
    }
  };

  const startMeaningEdit = () => {
    if (!card) return;
    setMeaningDraft(card.context_meaning);
    setMeaningError(null);
    setEditingMeaning(true);
  };

  const saveMeaning = async () => {
    if (!card) return;
    const nextMeaning = meaningDraft.trim();
    if (!nextMeaning) {
      setMeaningError(t('create.meaningRequired'));
      return;
    }
    try {
      await patchCard(card.id, { context_meaning: nextMeaning });
      setEditingMeaning(false);
      load();
    } catch (err) {
      setMeaningError(err instanceof Error ? err.message : t('detail.saveMeaningFailed'));
    }
  };

  const startTagEdit = async () => {
    if (!card) return;
    setEditingTags(true);
    setSelectedTagIds(card.tags.map((tag) => tag.id));
  };

  const cancelTagEdit = () => {
    setEditingTags(false);
  };

  const saveTags = async () => {
    if (!card) return;
    try {
      await patchCard(card.id, { tag_ids: selectedTagIds });
      cancelTagEdit();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.saveTagsFailed'));
    }
  };

  if (loading) return <LoadingState message={t('detail.loading')} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!card) return <ErrorState message={t('detail.notFound')} onRetry={load} />;

  return (
    <section className="phase6-detail">
      <div className="phase6-detail-summary">
        <div className="phase6-detail-title-stack" data-testid="detail-title-stack">
          <h2>{card.target_word}</h2>
          {editingMeaning ? (
            <div className="phase6-inline-editor">
              <label htmlFor="detail-meaning-edit">{t('create.meaning')}</label>
              <input
                id="detail-meaning-edit"
                aria-label={t('detail.editMeaningAria')}
                value={meaningDraft}
                onChange={(event) => {
                  setMeaningDraft(event.target.value);
                  setMeaningError(null);
                }}
              />
              {meaningError ? <em>{meaningError}</em> : null}
              <div>
                <button type="button" onClick={saveMeaning}>{t('detail.saveMeaning')}</button>
                <button type="button" onClick={() => setEditingMeaning(false)}>{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <p className="phase6-detail-meaning">{card.context_meaning}</p>
              <div className="phase6-detail-meaning-actions" data-testid="detail-meaning-actions">
                <button type="button" onClick={startMeaningEdit}>{t('detail.editMeaning')}</button>
              </div>
            </>
          )}
        </div>
        <div className="phase6-detail-actions">
          <button type="button" onClick={() => { window.location.hash = `#/create?card_id=${encodeURIComponent(card.id)}`; }}>{t('detail.addContext')}</button>
          <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { is_favorite: !card.is_favorite }))}>{card.is_favorite ? t('catalogue.removeFavorite') : t('catalogue.addFavorite')}</button>
          <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { status: card.status === 'reviewing' ? 'mastered' : 'reviewing' }))}>{card.status === 'reviewing' ? t('catalogue.markMastered') : t('catalogue.restoreReview')}</button>
          <button type="button" onClick={() => setConfirmDelete('card')}>{t('detail.deleteCard')}</button>
        </div>
      </div>

      <div className="phase6-detail-grid">
        <section className="phase6-contexts">
          <h3>{t('detail.allContexts')}</h3>
          {card.contexts.length === 0 ? <p>{t('catalogue.noContext')}</p> : null}
          {card.contexts.map((context, index) => (
            <article key={context.id} className="phase6-context-card">
              <div><strong>{t('detail.contextNumber', { number: index + 1 })}</strong>{context.is_primary ? <span>{t('detail.primaryContext')}</span> : null}</div>
              <p>{context.sentence}</p>
              {context.note ? <small>{context.note}</small> : null}
              <div className="phase6-media-row">
                {mediaForContext(card, context.id).map((media) => (
                  <MediaPreview
                    key={media.id}
                    mediaType={media.media_type}
                    src={`/uploads/${encodeURIComponent(media.file_name)}`}
                    fileName={media.file_name}
                    isAvailable={Boolean(media.is_available)}
                  />
                ))}
              </div>
              <div className="phase6-context-actions">
                <button type="button" disabled={index === 0} onClick={() => runAndReload(() => moveContextUp(context.id))}>{t('detail.moveUp')}</button>
                <button type="button" disabled={index === card.contexts.length - 1} onClick={() => runAndReload(() => moveContextDown(context.id))}>{t('detail.moveDown')}</button>
                <button type="button" disabled={Boolean(context.is_primary)} onClick={() => runAndReload(() => setPrimaryContext(context.id))}>{t('detail.setPrimary')}</button>
                <button type="button" onClick={() => setConfirmDelete(context)}>{t('detail.deleteContext')}</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="phase6-detail-side">
          <h3>{t('detail.reviewInfo')}</h3>
          <p>{t('catalogue.statusLabel')}：{card.status === 'reviewing' ? t('status.reviewing') : t('status.mastered')}</p>
          <p>{statusSummary(card, t)}</p>
          <p>{t('detail.repsCount', { count: card.fsrs.reps })}</p>
          <p>{t('detail.lapsesCount', { count: card.fsrs.lapses })}</p>
          <h3>{t('detail.tagsTitle')}</h3>
          {editingTags ? (
            <div className="phase6-tag-editor-container">
              <TagAssignmentEditor
                selectedTagIds={selectedTagIds}
                onSelectedTagIdsChange={setSelectedTagIds}
              />
              <div>
                <button type="button" onClick={saveTags}>{t('detail.saveTags')}</button>
                <button type="button" onClick={cancelTagEdit}>{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <div className="phase6-tag-readonly">
              <div>{card.tags.length ? card.tags.map((tag) => <span key={tag.id}>{tag.name}</span>) : t('detail.noTagsHint')}</div>
              <button type="button" className="phase6-tag-edit-button" onClick={startTagEdit}>{t('detail.editTags')}</button>
            </div>
          )}
        </aside>
      </div>

      {confirmDelete === 'card' ? <ConfirmDialog title={t('detail.deleteCardTitle')} message={t('detail.deleteCardMessage')} confirmLabel={t('common.delete')} onCancel={() => setConfirmDelete(null)} onConfirm={async () => {
        try {
          await deleteCard(card.id);
          window.location.hash = '#/cards';
        } catch (err) {
          setConfirmDelete(null);
          setError(err instanceof Error ? err.message : t('detail.deleteCardFailed'));
        }
      }} /> : null}
      {confirmDelete && confirmDelete !== 'card' ? <ConfirmDialog title={t('detail.deleteContextTitle')} message={t('detail.deleteContextMessage')} confirmLabel={t('common.delete')} onCancel={() => setConfirmDelete(null)} onConfirm={() => runAndReload(() => deleteContext(confirmDelete.id)).then(() => setConfirmDelete(null))} /> : null}
    </section>
  );
}
