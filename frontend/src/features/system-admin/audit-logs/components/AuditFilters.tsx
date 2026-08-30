import { Filter as FilterIcon } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';

interface AuditFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  actionFilter: string;
  onActionChange: (value: string) => void;
  moduleFilter: string;
  onModuleChange: (value: string) => void;
  actions: string[];
  modules: string[];
  resultCount: number;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function AuditFilters({
  search,
  onSearchChange,
  actionFilter,
  onActionChange,
  moduleFilter,
  onModuleChange,
  actions,
  modules,
  resultCount,
  onClear,
  hasActiveFilters,
}: AuditFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-background border border-border text-muted-foreground flex items-center justify-center shrink-0">
            <FilterIcon className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          {hasActiveFilters && (
            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
              ACTIVE
            </span>
          )}
          <Separator orientation="vertical" className="h-4 ml-1" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{resultCount}</span>{' '}
            {resultCount === 1 ? 'event' : 'events'}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="h-10 shrink-0"
        >
          Clear
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search by actor, description, IP address…"
          className="flex-1 min-w-0"
          aria-label="Search audit logs"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            aria-label="Filter by action"
            value={actionFilter}
            onChange={e => onActionChange(e.target.value)}
            className="w-full sm:w-44"
            options={[
              { value: 'all', label: 'All actions' },
              ...actions.map(a => ({ value: a, label: a })),
            ]}
          />
          <Select
            aria-label="Filter by module"
            value={moduleFilter}
            onChange={e => onModuleChange(e.target.value)}
            className="w-full sm:w-44"
            options={[
              { value: 'all', label: 'All modules' },
              ...modules.map(m => ({ value: m, label: m })),
            ]}
          />
        </div>
      </div>
    </div>
  );
}
