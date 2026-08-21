import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Select } from './Select';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  start,
  end,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showEllipsis = totalPages > 7;

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3', className)}>
      <div className="text-xs text-slate-600">
        Showing <span className="font-semibold text-slate-900">{totalItems === 0 ? 0 : start + 1}</span>–
        <span className="font-semibold text-slate-900">{end}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Rows per page</span>
          <Select
            value={String(pageSize)}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            options={PAGE_SIZE_OPTIONS.map(n => ({ value: String(n), label: String(n) }))}
            className="!h-8 !w-auto !pr-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            className="!px-2"
            aria-label="Previous page"
          >
          </Button>

          {showEllipsis ? (
            <>
              {pages.slice(0, 3).map(p => (
                <PageBtn key={p} page={p} active={page === p} onClick={() => onPageChange(p)} />
              ))}
              {page > 4 && <span className="px-1 text-slate-400 text-xs">…</span>}
              {page > 3 && page < totalPages - 2 && (
                <PageBtn page={page} active onClick={() => onPageChange(page)} />
              )}
              {page < totalPages - 3 && <span className="px-1 text-slate-400 text-xs">…</span>}
              {pages.slice(-3).map(p => (
                <PageBtn key={p} page={p} active={page === p} onClick={() => onPageChange(p)} />
              ))}
            </>
          ) : (
            pages.map(p => (
              <PageBtn key={p} page={p} active={page === p} onClick={() => onPageChange(p)} />
            ))
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            rightIcon={<ChevronRight className="w-4 h-4" />}
            className="!px-2"
            aria-label="Next page"
          >
          </Button>
        </div>
      </div>
    </div>
  );
}

function PageBtn({ page, active, onClick }: { page: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 min-w-[32px] px-2 text-xs rounded-md border transition-colors',
        active
          ? 'bg-brand-600 text-white border-brand-600'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {page}
    </button>
  );
}
