import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CardSummaryDto, TagDto } from '../../shared/types';
import { listCards, patchCard } from '../api/cards';
import { listTags } from '../api/tags';
import { useI18n } from '../i18n/I18nProvider';
import { CardCatalogue, toListParams, type CardCatalogueFilters } from '../components/CardCatalogue';

const DEFAULT_FILTERS: CardCatalogueFilters = { search: '', tagId: '', status: '', favorite: 'true', page: 1, pageSize: 20 };

export function FavoritesPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<CardCatalogueFilters>(DEFAULT_FILTERS);
  const [cards, setCards] = useState<CardSummaryDto[]>([]);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveFilters = useMemo<CardCatalogueFilters>(() => ({ ...filters, favorite: 'true' }), [filters]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listCards(toListParams(effectiveFilters)), listTags()])
      .then(([cardResult, tagResult]) => {
        setCards(cardResult.items);
        setTotal(cardResult.total);
        setTags(tagResult);
      })
      .catch((err: unknown) => {
        setCards([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : t('favorites.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [effectiveFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFavoriteFilters = (next: CardCatalogueFilters) => setFilters({ ...next, favorite: 'true' });

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

  const hasUserFilters = Boolean(filters.search || filters.tagId || filters.status);

  return <CardCatalogue title={t('favorites.title')} subtitle={t('favorites.subtitle')} cards={cards} total={total} loading={loading} error={error} tags={tags} filters={effectiveFilters} emptyMessage={t('favorites.empty')} filteredEmptyMessage={t('favorites.filteredEmpty')} hasUserFilters={hasUserFilters} onFiltersChange={setFavoriteFilters} onRetry={load} onToggleStatus={toggleStatus} onToggleFavorite={toggleFavorite} />;
}
