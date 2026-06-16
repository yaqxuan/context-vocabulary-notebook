import { ALLOWED_PAGE_SIZES, type PageSize } from '../../shared/constants';
import { Button } from './Button';
import { useI18n } from '../i18n/I18nProvider';

interface PaginationProps {
  page: number;
  pageSize: PageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const summary = t('pagination.summary', { page, totalPages, total });

  return (
    <div className="vn-pagination flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
      <span>{summary}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span>{t('pagination.pageSize')}</span>
          <select
            aria-label={t('pagination.pageSize')}
            className="vn-pagination-select rounded-md px-2 py-1"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
          >
            {ALLOWED_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="ghost" disabled={!canGoPrevious} onClick={() => onPageChange(page - 1)}>{t('pagination.previous')}</Button>
        <Button variant="ghost" disabled={!canGoNext} onClick={() => onPageChange(page + 1)}>{t('pagination.next')}</Button>
      </div>
    </div>
  );
}
