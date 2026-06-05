import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { TagDto } from '../../shared/types';
import { createTag, listTags } from '../api/tags';

export interface TagAssignmentEditorProps {
  selectedTagIds: string[];
  onSelectedTagIdsChange: Dispatch<SetStateAction<string[]>>;
}

export function TagAssignmentEditor({
  selectedTagIds,
  onSelectedTagIdsChange,
}: TagAssignmentEditorProps) {
  const [allTags, setAllTags] = useState<TagDto[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const newTagInputId = useId();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setTagsLoading(true);
    setTagsError(null);
    listTags()
      .then((tags) => {
        if (mountedRef.current) setAllTags(Array.isArray(tags) ? tags : []);
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setTagsError(err instanceof Error ? err.message : '标签列表加载失败');
      })
      .finally(() => {
        if (mountedRef.current) setTagsLoading(false);
      });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toggleTag = (tagId: string) => {
    onSelectedTagIdsChange((cur) =>
      cur.includes(tagId) ? cur.filter((id) => id !== tagId) : [...cur, tagId]
    );
  };

  const createAndSelectTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      setTagsError('标签名称必填');
      return;
    }
    try {
      setCreatingTag(true);
      setTagsError(null);
      const tag = await createTag({ name });
      setAllTags((cur) => (cur.some((item) => item.id === tag.id) ? cur : [...cur, tag]));
      onSelectedTagIdsChange((cur) => (cur.includes(tag.id) ? cur : [...cur, tag.id]));
      setNewTagName('');
    } catch (err) {
      setTagsError(err instanceof Error ? err.message : '新增标签失败');
    } finally {
      setCreatingTag(false);
    }
  };

  return (
    <div className="phase6-tag-editor">
      {tagsError ? <em>{tagsError}</em> : null}
      <div>
        {tagsLoading ? (
          <p>加载标签中…</p>
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
          <p>暂无可选标签</p>
        )}
      </div>
      <div className="phase6-tag-create-row">
        <label htmlFor={newTagInputId}>新增标签名称</label>
        <input
          id={newTagInputId}
          aria-label="新增标签名称"
          value={newTagName}
          onChange={(event) => {
            setNewTagName(event.target.value);
            setTagsError(null);
          }}
          placeholder="例如：电影"
          disabled={tagsLoading || creatingTag}
        />
        <button type="button" disabled={creatingTag || tagsLoading} onClick={createAndSelectTag}>
          新增并选中标签
        </button>
      </div>
    </div>
  );
}
