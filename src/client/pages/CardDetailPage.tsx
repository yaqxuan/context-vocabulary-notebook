import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CardDetailDto, ContextDto, TagDto } from '../../shared/types';
import { deleteCard, getCard, patchCard } from '../api/cards';
import { listTags } from '../api/tags';
import { deleteContext, moveContextDown, moveContextUp, setPrimaryContext } from '../api/contexts';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState, LoadingState } from '../components/UiStates';

function currentCardId(): string {
  return decodeURIComponent(window.location.hash.replace(/^#\/cards\//, '').split('?')[0] ?? '');
}

function mediaForContext(card: CardDetailDto, contextId: string) {
  return card.media.filter((media) => media.context_example_id === contextId);
}

export function CardDetailPage() {
  const [card, setCard] = useState<CardDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'card' | ContextDto | null>(null);
  const [editingMeaning, setEditingMeaning] = useState(false);
  const [meaningDraft, setMeaningDraft] = useState('');
  const [meaningError, setMeaningError] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [allTags, setAllTags] = useState<TagDto[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const cardId = useMemo(currentCardId, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getCard(cardId)
      .then(setCard)
      .catch((err: unknown) => {
        setCard(null);
        setError(err instanceof Error ? err.message : '无法加载词义详情');
      })
      .finally(() => setLoading(false));
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAndReload = async (action: () => Promise<unknown>) => {
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
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
      setMeaningError('当前语境释义必填');
      return;
    }
    try {
      await patchCard(card.id, { context_meaning: nextMeaning });
      setEditingMeaning(false);
      load();
    } catch (err) {
      setMeaningError(err instanceof Error ? err.message : '保存释义失败');
    }
  };

  const startTagEdit = async () => {
    if (!card) return;
    setEditingTags(true);
    setSelectedTagIds(card.tags.map((tag) => tag.id));
    setAllTags([]);
    setTagsError(null);
    try {
      setAllTags(await listTags());
    } catch (err) {
      setTagsError(err instanceof Error ? err.message : '标签列表加载失败');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((cur) => cur.includes(tagId) ? cur.filter((id) => id !== tagId) : [...cur, tagId]);
  };

  const saveTags = async () => {
    if (!card) return;
    try {
      await patchCard(card.id, { tag_ids: selectedTagIds });
      setEditingTags(false);
      load();
    } catch (err) {
      setTagsError(err instanceof Error ? err.message : '保存标签失败');
    }
  };

  if (loading) return <LoadingState message="正在加载词义详情……" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!card) return <ErrorState message="词义条目不存在" onRetry={load} />;

  return (
    <section className="phase6-detail">
      <div className="phase6-detail-summary">
        <div>
          <h2>{card.target_word}</h2>
          {editingMeaning ? (
            <div className="phase6-inline-editor">
              <label htmlFor="detail-meaning-edit">当前语境释义</label>
              <input
                id="detail-meaning-edit"
                aria-label="编辑当前语境释义"
                value={meaningDraft}
                onChange={(event) => {
                  setMeaningDraft(event.target.value);
                  setMeaningError(null);
                }}
              />
              {meaningError ? <em>{meaningError}</em> : null}
              <div>
                <button type="button" onClick={saveMeaning}>保存释义</button>
                <button type="button" onClick={() => setEditingMeaning(false)}>取消</button>
              </div>
            </div>
          ) : (
            <div className="phase6-meaning-row">
              <p>{card.context_meaning}</p>
              <button type="button" onClick={startMeaningEdit}>编辑释义</button>
            </div>
          )}
        </div>
        <div className="phase6-detail-actions">
          <button type="button" onClick={() => { window.location.hash = `#/create?card_id=${encodeURIComponent(card.id)}`; }}>添加语境</button>
          <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { is_favorite: !card.is_favorite }))}>{card.is_favorite ? '取消收藏' : '收藏'}</button>
          <button type="button" onClick={() => runAndReload(() => patchCard(card.id, { status: card.status === 'reviewing' ? 'mastered' : 'reviewing' }))}>{card.status === 'reviewing' ? '标记熟记' : '恢复复习'}</button>
          <button type="button" onClick={() => setConfirmDelete('card')}>删除词义</button>
        </div>
      </div>

      <div className="phase6-detail-grid">
        <section className="phase6-contexts">
          <h3>全部语境</h3>
          {card.contexts.length === 0 ? <p>暂无语境</p> : null}
          {card.contexts.map((context, index) => (
            <article key={context.id} className="phase6-context-card">
              <div><strong>语境 {index + 1}</strong>{context.is_primary ? <span>主语境</span> : null}</div>
              <p>{context.sentence}</p>
              {context.note ? <small>{context.note}</small> : null}
              <div className="phase6-media-row">
                {mediaForContext(card, context.id).map((media) => <span key={media.id}>{media.file_name}{media.is_available ? '' : '（文件不可用）'}</span>)}
              </div>
              <div className="phase6-context-actions">
                <button type="button" disabled={index === 0} onClick={() => runAndReload(() => moveContextUp(context.id))}>上移</button>
                <button type="button" disabled={index === card.contexts.length - 1} onClick={() => runAndReload(() => moveContextDown(context.id))}>下移</button>
                <button type="button" disabled={Boolean(context.is_primary)} onClick={() => runAndReload(() => setPrimaryContext(context.id))}>设为主语境</button>
                <button type="button" onClick={() => setConfirmDelete(context)}>删除语境</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="phase6-detail-side">
          <h3>复习信息</h3>
          <p>状态：{card.status === 'reviewing' ? '复习中' : '已熟记'}</p>
          <p>Due：{card.fsrs.due_date}</p>
          <p>Reps：{card.fsrs.reps}</p>
          <p>Lapses：{card.fsrs.lapses}</p>
          <h3>标签</h3>
          {editingTags ? (
            <div className="phase6-tag-editor">
              {tagsError ? <em>{tagsError}</em> : null}
              <div>
                {allTags.length ? allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={selectedTagIds.includes(tag.id) ? 'selected' : ''}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                )) : <p>暂无可选标签</p>}
              </div>
              <div>
                <button type="button" onClick={saveTags}>保存标签</button>
                <button type="button" onClick={() => setEditingTags(false)}>取消</button>
              </div>
            </div>
          ) : (
            <div className="phase6-tag-readonly">
              <div>{card.tags.length ? card.tags.map((tag) => <span key={tag.id}>{tag.name}</span>) : '暂无标签'}</div>
              <button type="button" onClick={startTagEdit}>编辑标签</button>
            </div>
          )}
        </aside>
      </div>

      {confirmDelete === 'card' ? <ConfirmDialog title="删除词义条目" message="会软删除这个词义条目、语境实例和媒体记录。确认删除？" confirmLabel="删除" onCancel={() => setConfirmDelete(null)} onConfirm={async () => {
        try {
          await deleteCard(card.id);
          window.location.hash = '#/cards';
        } catch (err) {
          setConfirmDelete(null);
          setError(err instanceof Error ? err.message : '删除词义失败');
        }
      }} /> : null}
      {confirmDelete && confirmDelete !== 'card' ? <ConfirmDialog title="删除语境实例" message="会软删除这个语境和它的媒体记录。确认删除？" confirmLabel="删除" onCancel={() => setConfirmDelete(null)} onConfirm={() => runAndReload(() => deleteContext(confirmDelete.id)).then(() => setConfirmDelete(null))} /> : null}
    </section>
  );
}
