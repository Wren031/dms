import { useCallback, useEffect, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type { DocumentHistoryEntry } from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentHistoryReturn {
  history: DocumentHistoryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDocumentHistory(id: string | undefined): UseDocumentHistoryReturn {
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setHistory([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setHistory(await documentsService.getHistory(id));
    } catch (err) {
      setError(toMessage(err, 'Could not load history.'));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { history, loading, error, refresh };
}