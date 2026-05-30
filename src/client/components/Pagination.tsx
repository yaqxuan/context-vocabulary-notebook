import { ALLOWED_PAGE_SIZES, type PageSize } from '../../shared/constants';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: PageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <span>第 {page} / {totalPages} 页，共 {total} 条</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span>每页数量</span>
          <select
            aria-label="每页数量"
            className="rounded-md border border-slate-300 bg-white px-2 py-1"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
          >
            {ALLOWED_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="ghost" disabled={!canGoPrevious} onClick={() => onPageChange(page - 1)}>上一页</Button>
        <Button variant="ghost" disabled={!canGoNext} onClick={() => onPageChange(page + 1)}>下一页</Button>
      </div>
    </div>
  );
}
