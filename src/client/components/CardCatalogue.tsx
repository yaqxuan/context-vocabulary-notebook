import { getNativeLanguageLabel, normalizeSupportedLanguage, type CardStatus, type PageSize } from '../../shared/constants';
import type { CardSummaryDto, TagDto } from '../../shared/types';
import { Pagination } from './Pagination';
import { useI18n } from '../i18n/I18nProvider';

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

function languageLabel(value: string): string {
  const language = normalizeSupportedLanguage(value);
  return language ? getNativeLanguageLabel(language) : value;
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
  const { t } = useI18n();

  const updateFilters = (patch: Partial<CardCatalogueFilters>) => {
    onFiltersChange({ ...filters, ...patch, page: patch.page ?? 1 });
  };

  const sentenceFor = (card: CardSummaryDto): string => {
    return card.primary_sentence || t('catalogue.noContext');
  };

  const nextStatusLabel = (card: CardSummaryDto): string => {
    return card.status === 'reviewing' ? t('catalogue.markMastered') : t('catalogue.restoreReview');
  };

  return (
    <section className="phase6-catalogue" aria-label={title}>
        <div className="phase6-filter-desk">
        <label>
          <span>{t('catalogue.search')}</span>
          <input
            aria-label={t('catalogue.searchPlaceholder')}
            value={filters.search}
            placeholder={t('catalogue.searchPlaceholder')}
            onChange={(event) => updateFilters({ search: event.target.value })}
          />
        </label>
        <label>
          <span>{t('catalogue.tagLabel')}</span>
          <select aria-label={t('catalogue.tagLabel')} value={filters.tagId} onChange={(event) => updateFilters({ tagId: event.target.value })}>
            <option value="">{t('catalogue.allTags')}</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
        <label>
          <span>{t('catalogue.statusLabel')}</span>
          <select aria-label={t('catalogue.statusLabel')} value={filters.status} onChange={(event) => updateFilters({ status: event.target.value as CardCatalogueFilters['status'] })}>
            <option value="">{t('catalogue.allStatus')}</option>
            <option value="reviewing">{t('status.reviewing')}</option>
            <option value="mastered">{t('status.mastered')}</option>
          </select>
        </label>
        <label>
          <span>{t('catalogue.favoriteLabel')}</span>
          <select aria-label={t('catalogue.favoriteLabel')} value={filters.favorite} onChange={(event) => updateFilters({ favorite: event.target.value as CardCatalogueFilters['favorite'] })}>
            <option value="">{t('catalogue.allFavorite')}</option>
            <option value="true">{t('catalogue.onlyFavorite')}</option>
            <option value="false">{t('catalogue.notFavorite')}</option>
          </select>
        </label>
        <button type="button" onClick={() => onFiltersChange({ search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: filters.pageSize })}>{t('catalogue.clearFilters')}</button>
      </div>

      {error ? (
        <div className="phase6-alert" role="alert">
          <strong>{t('common.loadFailed')}</strong>
          <p>{error}</p>
          <button type="button" onClick={onRetry}>{t('common.retry')}</button>
        </div>
      ) : null}
      {loading ? <div className="phase6-skeleton" role="status">{t('catalogue.loading')}</div> : null}

      {!loading && !error && cards.length === 0 ? (
        <div className="phase6-empty">
          <p>{activeFilters ? filteredEmptyMessage : emptyMessage}</p>
          <div>
            <button type="button" onClick={() => onFiltersChange({ search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: filters.pageSize })}>{t('catalogue.clearFilters')}</button>
            <a href="#/create">{t('catalogue.createLink')}</a>
          </div>
        </div>
      ) : null}

      {!loading && !error && cards.length > 0 ? (
        <div className="phase6-list-shell">
          <div className="phase6-list-head"><strong>{total}</strong><span>{t('catalogue.itemUnit')}</span></div>
          <div className="phase6-card-list">
            {cards.map((card) => (
              <article className="phase6-word-card" key={card.id}>
                <div className="phase6-word"><strong>{card.target_word}</strong><span>{languageLabel(card.target_language)} → {languageLabel(card.definition_language)}</span></div>
                <div className="phase6-card-main">
                  <h3>{card.context_meaning}</h3>
                  <p>{sentenceFor(card)}</p>
                  <div>{card.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
                </div>
                <div className="phase6-card-actions">
                  <span>{card.status === 'reviewing' ? t('status.reviewing') : t('status.mastered')}</span>
                  {card.is_favorite ? <span>★ {t('catalogue.addFavorite')}</span> : <span>{t('catalogue.notFavorite')}</span>}
                  <span>{t('catalogue.contextCount', { count: card.context_count })}</span>
                  <button type="button" onClick={() => onToggleStatus(card)}>{nextStatusLabel(card)}</button>
                  <button type="button" onClick={() => onToggleFavorite(card)}>{card.is_favorite ? t('catalogue.removeFavorite') : t('catalogue.addFavorite')}</button>
                  <a href={`#/cards/${card.id}`}>{t('catalogue.viewDetail')}</a>
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
