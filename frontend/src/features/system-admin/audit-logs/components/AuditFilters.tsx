import { Filter as FilterIcon, Search, X as XIcon } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';

interface AuditFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  actionFilter: string;
  onActionChange: (value: string) => void;
  moduleFilter: string;
  onModuleChange: (value: string) => void;
  actions: string[];
  modules: string[];
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
  onClear,
  hasActiveFilters,
}: AuditFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search by actor, description, IP address…"
          className="flex-1"
          aria-label="Search audit logs"
        />
        <Select
          aria-label="Filter by action"
          value={actionFilter}
          onChange={e => onActionChange(e.target.value)}
          options={[
            { value: 'all', label: 'All actions' },
            ...actions.map(a => ({ value: a, label: a })),
          ]}
          className="lg:!w-44"
        />
        <Select
          aria-label="Filter by module"
          value={moduleFilter}
          onChange={e => onModuleChange(e.target.value)}
          options={[
            { value: 'all', label: 'All modules' },
            ...modules.map(m => ({ value: m, label: m })),
          ]}
          className="lg:!w-44"
        />
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <FilterIcon className="h-3 w-3" />
            Showing filtered results
          </span>
          <button
            type="button"
            onClick={onClear}
            className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            <XIcon className="h-3 w-3" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}