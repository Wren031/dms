import { useEffect, useMemo, useState } from 'react';

export interface UseSearchOptions {
  initialQuery?: string;
  debounceMs?: number;
}

export function useSearch({ initialQuery = '', debounceMs = 0 }: UseSearchOptions = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    if (debounceMs <= 0) {
      setDebouncedQuery(query);
      return;
    }
    const id = window.setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => window.clearTimeout(id);
  }, [query, debounceMs]);

  const normalized = useMemo(
    () => debouncedQuery.trim().toLowerCase(),
    [debouncedQuery],
  );

  const matches = useMemo(() => {
    return (value: unknown) => {
      if (!normalized) return true;
      if (value == null) return false;
      return String(value).toLowerCase().includes(normalized);
    };
  }, [normalized]);

  return { query, setQuery, debounced: normalized, matches };
}
