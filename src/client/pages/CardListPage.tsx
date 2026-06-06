import { useCallback, useEffect, useState } from 'react';

import type { CardSummaryDto, TagDto } from '../../shared/types';
import { listCards, patchCard } from '../api/cards';
import { listTags } from '../api/tags';
import { useI18n } from '../i18n/I18nProvider';
import { CardCatalogue, toListParams, type CardCatalogueFilters } from '../components/CardCatalogue';

const DEFAULT_FILTERS: CardCatalogueFilters = { search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: 20 };

function filtersFromHash(): CardCatalogueFilters {
  const query = window.location.hash.split('?')[1];
  if (!query) return DEFAULT_FILTERS;
  const params = new URLSearchParams(query);
  return {
    ...DEFAULT_FILTERS,
    search: params.get('search') ?? '',
    tagId: params.get('tag_id') ?? '',
    status: params.get('status') === 'reviewing' || params.get('status') === 'mastered' ? params.get('status') as CardCatalogueFilters['status'] : '',
    favorite: params.get('favorite') === 'true' || params.get('favorite') === 'false' ? params.get('favorite') as CardCatalogueFilters['favorite'] : '',
  };
}

export function CardListPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<CardCatalogueFilters>(filtersFromHash);
  const [cards, setCards] = useState<CardSummaryDto[]>([]);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listCards(toListParams(filters)), listTags()])
      .then(([cardResult, tagResult]) => {
        setCards(cardResult.items);
        setTotal(cardResult.total);
        setTags(tagResult);
      })
      .catch((err: unknown) => {
        setCards([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : t('cards.list.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (card: CardSummaryDto) => {
    try {
      await patchCard(card.id, { status: card.status === 'reviewing' ? 'mastered' : 'reviewing' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cards.list.statusFailed'));
    }
  };

  const toggleFavorite = async (card: CardSummaryDto) => {
    try {
      await patchCard(card.id, { is_favorite: !card.is_favorite });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cards.list.favoriteFailed'));
    }
  };

  return <CardCatalogue title={t('cards.list.title')} subtitle={t('cards.list.subtitle')} cards={cards} total={total} loading={loading} error={error} tags={tags} filters={filters} emptyMessage={t('cards.list.empty')} filteredEmptyMessage={t('cards.list.filteredEmpty')} onFiltersChange={setFilters} onRetry={load} onToggleStatus={toggleStatus} onToggleFavorite={toggleFavorite} />;
}
