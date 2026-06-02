import type { CardStatus, PageSize } from '../../shared/constants';
import type { CardSummaryDto, TagDto } from '../../shared/types';
import { Pagination } from './Pagination';

export interface CardCatalogueFilters {
  search: string;
  tagId: string;
  status: '' | CardStatus;
  favorite: '' | 'true' | 'false';
  page: number;
  pageSize: PageSize;
}

interface CardCatalogueProps {
  title: string;
  subtitle: string;
  cards: CardSummaryDto[];
  total: number;
  loading: boolean;
  error: string | null;
  tags: TagDto[];
  filters: CardCatalogueFilters;
  emptyMessage: string;
  filteredEmptyMessage: string;
  hasUserFilters?: boolean;
  onFiltersChange: (filters: CardCatalogueFilters) => void;
  onRetry: () => void;
  onToggleStatus: (card: CardSummaryDto) => void;
  onToggleFavorite: (card: CardSummaryDto) => void;
}

function favoriteParam(value: CardCatalogueFilters['favorite']): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function hasActiveFilters(filters: CardCatalogueFilters): boolean {
  return Boolean(filters.search || filters.tagId || filters.status || filters.favorite);
}

export function toListParams(filters: CardCatalogueFilters) {
  return {
    search: filters.search || undefined,
    tag_id: filters.tagId || undefined,
    status: filters.status || undefined,
    favorite: favoriteParam(filters.favorite),
    page: filters.page,
    page_size: filters.pageSize,
  };
}

function sentenceFor(card: CardSummaryDto): string {
  return card.primary_sentence || '暂无语境';
}

function nextStatusLabel(card: CardSummaryDto): string {
  return card.status === 'reviewing' ? '标记熟记' : '恢复复习';
}

export function CardCatalogue(props: CardCatalogueProps) {
  const {
    title,
    cards,
    total,
    loading,
    error,
    tags,
    filters,
    emptyMessage,
    filteredEmptyMessage,
    hasUserFilters,
    onFiltersChange,
    onRetry,
    onToggleStatus,
    onToggleFavorite,
  } = props;
  const activeFilters = hasUserFilters ?? hasActiveFilters(filters);

  const updateFilters = (patch: Partial<CardCatalogueFilters>) => {
    onFiltersChange({ ...filters, ...patch, page: patch.page ?? 1 });
  };

  return (
    <section className="phase6-catalogue" aria-label={title}>
      <div className="phase6-filter-desk">
        <label>
          <span>搜索</span>
          <input
            aria-label="搜索词义条目"
            value={filters.search}
            placeholder="搜索单词、释义、原句、标签或备注"
            onChange={(event) => updateFilters({ search: event.target.value })}
          />
        </label>
        <label>
          <span>标签</span>
          <select aria-label="标签筛选" value={filters.tagId} onChange={(event) => updateFilters({ tagId: event.target.value })}>
            <option value="">全部标签</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
        <label>
          <span>状态</span>
          <select aria-label="状态筛选" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value as CardCatalogueFilters['status'] })}>
            <option value="">全部状态</option>
            <option value="reviewing">复习中</option>
            <option value="mastered">已熟记</option>
          </select>
        </label>
        <label>
          <span>收藏</span>
          <select aria-label="收藏筛选" value={filters.favorite} onChange={(event) => updateFilters({ favorite: event.target.value as CardCatalogueFilters['favorite'] })}>
            <option value="">全部</option>
            <option value="true">仅收藏</option>
            <option value="false">未收藏</option>
          </select>
        </label>
        <button type="button" onClick={() => onFiltersChange({ search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: filters.pageSize })}>清除筛选</button>
      </div>

      {error ? (
        <div className="phase6-alert" role="alert">
          <strong>加载失败</strong>
          <p>{error}</p>
          <button type="button" onClick={onRetry}>重试</button>
        </div>
      ) : null}
      {loading ? <div className="phase6-skeleton" role="status">正在加载词义条目……</div> : null}

      {!loading && !error && cards.length === 0 ? (
        <div className="phase6-empty">
          <p>{activeFilters ? filteredEmptyMessage : emptyMessage}</p>
          <div>
            <button type="button" onClick={() => onFiltersChange({ search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: filters.pageSize })}>清除筛选</button>
            <a href="#/create">去制卡</a>
          </div>
        </div>
      ) : null}

      {!loading && !error && cards.length > 0 ? (
        <div className="phase6-list-shell">
          <div className="phase6-list-head"><strong>{total}</strong><span> 个词义条目</span></div>
          <div className="phase6-card-list">
            {cards.map((card) => (
              <article className="phase6-word-card" key={card.id}>
                <div className="phase6-word"><strong>{card.target_word}</strong><span>{card.target_language} → {card.definition_language}</span></div>
                <div className="phase6-card-main">
                  <h3>{card.context_meaning}</h3>
                  <p>{sentenceFor(card)}</p>
                  <div>{card.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
                </div>
                <div className="phase6-card-actions">
                  <span>{card.status === 'reviewing' ? '复习中' : '已熟记'}</span>
                  {card.is_favorite ? <span>★ 收藏</span> : <span>未收藏</span>}
                  <span>{card.context_count} 条语境</span>
                  <button type="button" onClick={() => onToggleStatus(card)}>{nextStatusLabel(card)}</button>
                  <button type="button" onClick={() => onToggleFavorite(card)}>{card.is_favorite ? '取消收藏' : '收藏'}</button>
                  <a href={`#/cards/${card.id}`}>查看详情</a>
                </div>
              </article>
            ))}
          </div>
          <Pagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            onPageChange={(page) => onFiltersChange({ ...filters, page })}
            onPageSizeChange={(pageSize) => onFiltersChange({ ...filters, page: 1, pageSize })}
          />
        </div>
      ) : null}
    </section>
  );
}
