import { useCallback, useEffect, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type {
  DocumentFilters,
  DocumentListItem,
} from '@/features/documents/types/document';

export type ReleaseTab = 'ready' | 'released';

const TAB_FILTERS: Record<ReleaseTab, DocumentFilters> = {
  ready: { status: 'approved' },
  released: { statuses: ['released', 'archived'] },
};

export interface UseReleaseQueueReturn {
  rows: DocumentListItem[];
  counts: Record<ReleaseTab, number>;
  total: number;
  tab: ReleaseTab;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;

  setTab: (tab: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refresh: () => void;
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Drives the release view off two server-filtered document queries instead of
 * filtering one oversized page client-side, so tab counts and pagination stay
 * correct past the first page of results.
 */
export function useReleaseQueue(initialPageSize = 10): UseReleaseQueueReturn {
  const [tab, setTabState] = useState<ReleaseTab>('ready');
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [items, setItems] = useState<Record<ReleaseTab, DocumentListItem[]>>({
    ready: [],
    released: [],
  });
  const [totals, setTotals] = useState<Record<ReleaseTab, number>>({ ready: 0, released: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTab = useCallback(
    async (target: ReleaseTab, nextPage: number, nextPageSize: number) => {
      const res = await documentsService.list({
        ...TAB_FILTERS[target],
        page: nextPage,
        pageSize: nextPageSize,
      });
      return { target, items: res.items, total: res.total };
    },
    [],
  );

  const load = useCallback(
    async (nextTab: ReleaseTab, nextPage: number, nextPageSize: number) => {
      setLoading(true);
      setError(null);
      try {
        // Settled, not all: one failing tab must not blank the other tab's rows.
        const results = await Promise.allSettled([
          fetchTab('ready', nextPage, nextPageSize),
          fetchTab('released', nextPage, nextPageSize),
        ]);

        const succeeded = results.filter(
          (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchTab>>> =>
            result.status === 'fulfilled',
        );
        const failure = results.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        );

        if (succeeded.length > 0) {
          setItems(current => {
            const next = { ...current };
            for (const result of succeeded) next[result.value.target] = result.value.items;
            return next;
          });
          setTotals(current => {
            const next = { ...current };
            for (const result of succeeded) next[result.value.target] = result.value.total;
            return next;
          });
        }
        setError(failure ? toMessage(failure.reason, 'Could not load the release queue.') : null);
      } finally {
        setLoading(false);
      }
    },
    [fetchTab],
  );

  useEffect(() => {
    void load(tab, page, pageSize);
  }, [load, tab, page, pageSize]);

  useEffect(() => {
    const handleInvalidation = () => {
      void load(tab, page, pageSize);
    };
    window.addEventListener('documents:invalidate', handleInvalidation);
    return () => window.removeEventListener('documents:invalidate', handleInvalidation);
  }, [load, tab, page, pageSize]);

  const setTab = useCallback((next: string) => {
    if (next !== 'ready' && next !== 'released') return;
    setTabState(next);
    setPageState(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPageState(1);
  }, []);

  return {
    rows: items[tab],
    counts: totals,
    total: totals[tab],
    tab,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totals[tab] / pageSize)),
    loading,
    error,
    setTab,
    setPage: setPageState,
    setPageSize,
    refresh: () => void load(tab, page, pageSize),
  };
}
