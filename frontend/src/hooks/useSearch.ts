import { useMemo, useState } from 'react';

export interface UseSearchOptions {
  initialQuery?: string;
  debounceMs?: number;
}

export function useSearch({ initialQuery = '' }: UseSearchOptions = {}) {
  const [query, setQuery] = useState(initialQuery);
  const debounced = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return (value: unknown) => {
      if (!debounced) return true;
      if (value == null) return false;
      return String(value).toLowerCase().includes(debounced);
    };
  }, [debounced]);

  return { query, setQuery, debounced, matches };
}
