import { useCallback, useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { TagDto } from '../../shared/types';
import { createTag, listTags } from '../api/tags';
import { useI18n } from '../i18n/I18nProvider';

export const TAG_LOAD_TIMEOUT_MS = 8000;

export interface TagAssignmentEditorProps {
  selectedTagIds: string[];
  onSelectedTagIdsChange: Dispatch<SetStateAction<string[]>>;
}

export function TagAssignmentEditor({
  selectedTagIds,
  onSelectedTagIdsChange,
}: TagAssignmentEditorProps) {
  const { t } = useI18n();
  const [allTags, setAllTags] = useState<TagDto[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [canRetryTags, setCanRetryTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const newTagInputId = useId();
  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);
  const loadTimeoutRef = useRef<number | null>(null);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current === null) return;
    window.clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = null;
  }, []);

  const loadTagOptions = useCallback(() => {
    const seq = loadSeqRef.current + 1;
    loadSeqRef.current = seq;
    clearLoadTimeout();
    setTagsLoading(true);
    setTagsError(null);
    setCanRetryTags(false);

    loadTimeoutRef.current = window.setTimeout(() => {
      if (!mountedRef.current || loadSeqRef.current !== seq) return;
      loadSeqRef.current += 1;
      loadTimeoutRef.current = null;
      setTagsLoading(false);
      setTagsError(t('tags.loadTimeout'));
      setCanRetryTags(true);
    }, TAG_LOAD_TIMEOUT_MS);

    listTags()
      .then((tags) => {
        if (mountedRef.current && loadSeqRef.current === seq) setAllTags(Array.isArray(tags) ? tags : []);
      })
      .catch((err: unknown) => {
        if (mountedRef.current && loadSeqRef.current === seq) {
          setTagsError(err instanceof Error ? err.message : t('tags.loadFailed'));
          setCanRetryTags(true);
        }
      })
      .finally(() => {
        if (loadSeqRef.current === seq) clearLoadTimeout();
        if (mountedRef.current && loadSeqRef.current === seq) setTagsLoading(false);
      });
  }, [clearLoadTimeout, t('tags.loadTimeout'), t('tags.loadFailed')]);

  useEffect(() => {
    mountedRef.current = true;
    loadTagOptions();
    return () => {
      mountedRef.current = false;
      loadSeqRef.current += 1;
      clearLoadTimeout();
    };
  }, [clearLoadTimeout, loadTagOptions]);

  const toggleTag = (tagId: string) => {
    onSelectedTagIdsChange((cur) =>
      cur.includes(tagId) ? cur.filter((id) => id !== tagId) : [...cur, tagId]
    );
  };

  const createAndSelectTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      setTagsError(t('tags.nameRequired'));
      setCanRetryTags(false);
      return;
    }
    try {
      setCreatingTag(true);
      setTagsError(null);
      setCanRetryTags(false);
      const tag = await createTag({ name });
      setAllTags((cur) => (cur.some((item) => item.id === tag.id) ? cur : [...cur, tag]));
      onSelectedTagIdsChange((cur) => (cur.includes(tag.id) ? cur : [...cur, tag.id]));
      setNewTagName('');
    } catch (err) {
      setTagsError(err instanceof Error ? err.message : t('tags.createFailed'));
      setCanRetryTags(false);
    } finally {
      setCreatingTag(false);
    }
  };

  return (
    <div className="phase6-tag-editor">
      {tagsError ? (
        <div>
          <em>{tagsError}</em>
          {canRetryTags ? <button type="button" onClick={loadTagOptions}>{t('tags.reload')}</button> : null}
        </div>
      ) : null}
      <div>
        {tagsLoading ? (
          <p>{t('tags.loading')}</p>
        ) : allTags.length ? (
          allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={selectedTagIds.includes(tag.id) ? 'selected' : ''}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </button>
          ))
        ) : (
          <p>{t('tags.empty')}</p>
        )}
      </div>
      <div className="phase6-tag-create-row">
        <label htmlFor={newTagInputId}>{t('tags.newLabel')}</label>
        <input
          id={newTagInputId}
          aria-label={t('tags.newLabel')}
          value={newTagName}
          onChange={(event) => {
            setNewTagName(event.target.value);
            setTagsError(null);
            setCanRetryTags(false);
          }}
          placeholder={t('tags.newPlaceholder')}
          disabled={tagsLoading || creatingTag}
        />
        <button type="button" disabled={creatingTag || tagsLoading} onClick={createAndSelectTag}>
          {t('tags.createAction')}
        </button>
      </div>
    </div>
  );
}
