import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UseTableSortOptions<T> {
  initialKey?: keyof T;
  initialDirection?: SortDirection;
}

export function useTableSort<T>({
  initialKey,
  initialDirection = 'asc',
}: UseTableSortOptions<T> = {}) {
  const [sortKey, setSortKey] = useState<keyof T | undefined>(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  function toggleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  const sortFn = useMemo(() => {
    return (items: T[]): T[] => {
      if (!sortKey) return items;
      const copy = [...items];
      copy.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDirection === 'asc' ? av - bv : bv - av;
        }
        const as = String(av).toLowerCase();
        const bs = String(bv).toLowerCase();
        const cmp = as < bs ? -1 : as > bs ? 1 : 0;
        return sortDirection === 'asc' ? cmp : -cmp;
      });
      return copy;
    };
  }, [sortKey, sortDirection]);

  return { sortKey, sortDirection, toggleSort, sortFn };
}
