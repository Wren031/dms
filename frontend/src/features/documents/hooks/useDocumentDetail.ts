import { useCallback, useEffect, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type { DocumentDetail } from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentDetailReturn {
  document: DocumentDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setDocument: (next: DocumentDetail | null) => void;
}

export function useDocumentDetail(id: string | undefined): UseDocumentDetailReturn {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setDocument(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDocument(await documentsService.getById(id));
    } catch (err) {
      setError(toMessage(err, 'Could not load document.'));
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { document, loading, error, refresh, setDocument };
}