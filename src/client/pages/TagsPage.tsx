import { useCallback, useEffect, useState } from 'react';

import type { TagDto } from '../../shared/types';
import { createTag, deleteTag, listTags, patchTag } from '../api/tags';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState, LoadingState } from '../components/UiStates';
import { useI18n } from '../i18n/I18nProvider';

export function TagsPage() {
  const [tags, setTags] = useState<TagDto[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<TagDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listTags()
      .then(setTags)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('tags.loadFailed')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!name.trim()) {
      setError(t('tags.nameRequired'));
      return;
    }
    try {
      if (editing) await patchTag(editing.id, { name: name.trim() });
      else await createTag({ name: name.trim() });
      setName('');
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tags.saveFailed'));
    }
  };

  if (loading) return <LoadingState message={t('tags.loading')} />;

  return (
    <section className="phase6-tags">
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className="phase6-tags-board">
        <div className="phase6-tag-editor">
          <div className="phase6-tag-editor-copy">
            <strong>{editing ? t('tags.editTag') : t('tags.newTag')}</strong>
            <span>{editing ? t('tags.editingDesc', { name: editing.name }) : t('tags.newDesc')}</span>
          </div>
          <label>
            <span>{t('tags.nameLabel')}</span>
            <input
              aria-label={t('tags.nameAria')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('tags.namePlaceholder')}
            />
          </label>
          <div className="phase6-tag-editor-actions">
            <button type="button" onClick={save}>{editing ? t('tags.saveTag') : t('tags.newTag')}</button>
            {editing ? <button type="button" onClick={() => { setEditing(null); setName(''); }}>{t('tags.cancelEdit')}</button> : null}
          </div>
        </div>

        <div className="phase6-tag-grid">
          {tags.length === 0 ? <p className="phase6-tag-empty">{t('tags.empty')}</p> : null}
          {tags.map((tag) => (
            <article key={tag.id} className="phase6-tag-card">
              <strong>{tag.name}</strong>
              <div>
                <a href={`#/cards?tag_id=${tag.id}`}>{t('tags.viewCards')}</a>
                <button type="button" onClick={() => { setEditing(tag); setName(tag.name); }}>{t('common.edit')}</button>
                <button type="button" onClick={() => setDeleteTarget(tag)}>{t('common.delete')}</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {deleteTarget ? <ConfirmDialog title={t('tags.deleteTitle')} message={t('tags.deleteMessage', { name: deleteTarget.name })} confirmLabel={t('common.delete')} onCancel={() => setDeleteTarget(null)} onConfirm={async () => {
        try {
          await deleteTag(deleteTarget.id);
          setDeleteTarget(null);
          load();
        } catch (err) {
          setDeleteTarget(null);
          setError(err instanceof Error ? err.message : t('tags.deleteFailed'));
        }
      }} /> : null}
    </section>
  );
}
