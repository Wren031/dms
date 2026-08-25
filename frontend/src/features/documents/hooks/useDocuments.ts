import { useCallback, useEffect, useRef, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type {
  DocumentFilters,
  DocumentListItem,
  DocumentListResponse,
} from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentsReturn {
  items: DocumentListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;

  fetchList: (filters?: DocumentFilters) => Promise<DocumentListResponse | null>;
  refresh: () => Promise<void>;

  filters: DocumentFilters;
  setFilters: (filters: DocumentFilters) => void;
}

export function useDocuments(initial?: DocumentFilters): UseDocumentsReturn {
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initial?.pageSize ?? 25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<DocumentFilters>({
    pageSize: initial?.pageSize ?? 25,
    ...initial,
  });

  const initialRef = useRef<DocumentFilters | undefined>(initial);
  const didInitRef = useRef(false);
  const requestSequence = useRef(0);

  const fetchList = useCallback(async (next?: DocumentFilters): Promise<DocumentListResponse | null> => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const res = await documentsService.list(next);
      if (requestId === requestSequence.current) {
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
        setPageSize(res.pageSize);
      }
      return res;
    } catch (err) {
      if (requestId === requestSequence.current) setError(toMessage(err, 'Could not load documents.'));
      return null;
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    void fetchList(initialRef.current);
  }, [fetchList]);

  useEffect(() => {
    const handleInvalidation = () => {
      void fetchList(filters);
    };
    window.addEventListener('documents:invalidate', handleInvalidation);
    return () => window.removeEventListener('documents:invalidate', handleInvalidation);
  }, [fetchList, filters]);

  const refresh = useCallback(async () => {
    await fetchList(filters);
  }, [fetchList, filters]);

  const setFilters = useCallback((next: DocumentFilters) => {
    setFiltersState(next);
    void fetchList(next);
  }, [fetchList]);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    fetchList,
    refresh,
    filters,
    setFilters,
  };
}

export function useDocumentDirectory(filters?: DocumentFilters): UseDocumentsReturn {
  return useDocuments({ pageSize: 100, ...filters });
}
