import { useCallback, useEffect, useState } from 'react';

import type { TagDto } from '../../shared/types';
import { createTag, deleteTag, listTags, patchTag } from '../api/tags';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState, LoadingState } from '../components/UiStates';

export function TagsPage() {
  const [tags, setTags] = useState<TagDto[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<TagDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listTags()
      .then(setTags)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '无法加载标签'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!name.trim()) {
      setError('标签名称必填');
      return;
    }
    try {
      if (editing) await patchTag(editing.id, { name: name.trim() });
      else await createTag({ name: name.trim() });
      setName('');
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存标签失败');
    }
  };

  if (loading) return <LoadingState message="正在加载标签……" />;

  return (
    <section className="phase6-tags">
      <div className="phase6-hero">
        <div>
          <p className="phase6-kicker">Tag index</p>
          <h2>标签管理</h2>
          <p>标签承担自由分类和来源标记，不影响复习算法。</p>
        </div>
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      <div className="phase6-tag-editor">
        <label><span>标签名称</span><input aria-label="标签名称" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：Friends" /></label>
        <button type="button" onClick={save}>{editing ? '保存标签' : '新增标签'}</button>
        {editing ? <button type="button" onClick={() => { setEditing(null); setName(''); }}>取消编辑</button> : null}
      </div>
      <div className="phase6-tag-grid">
        {tags.length === 0 ? <p>暂无标签</p> : null}
        {tags.map((tag) => (
          <article key={tag.id} className="phase6-tag-card">
            <strong>{tag.name}</strong>
            <div>
              <a href={`#/cards?tag_id=${tag.id}`}>查看词义</a>
              <button type="button" onClick={() => { setEditing(tag); setName(tag.name); }}>编辑</button>
              <button type="button" onClick={() => setDeleteTarget(tag)}>删除</button>
            </div>
          </article>
        ))}
      </div>
      {deleteTarget ? <ConfirmDialog title="删除标签" message={`确认删除标签“${deleteTarget.name}”？词义条目不会被删除。`} confirmLabel="删除" onCancel={() => setDeleteTarget(null)} onConfirm={async () => {
        try {
          await deleteTag(deleteTarget.id);
          setDeleteTarget(null);
          load();
        } catch (err) {
          setDeleteTarget(null);
          setError(err instanceof Error ? err.message : '删除标签失败');
        }
      }} /> : null}
    </section>
  );
}
