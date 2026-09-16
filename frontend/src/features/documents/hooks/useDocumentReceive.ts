import { useCallback, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type {
  DocumentReceiveInput,
  DocumentReceiveResult,
} from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentReceiveReturn {
  receive: (id: string, payload: DocumentReceiveInput) => Promise<DocumentReceiveResult | null>;
  saving: boolean;
  error: string | null;
  reset: () => void;
}

export function useDocumentReceive(): UseDocumentReceiveReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receive = useCallback<UseDocumentReceiveReturn['receive']>(async (id, payload) => {
    setSaving(true);
    setError(null);
    try {
      const result = await documentsService.receive(id, payload);
      window.dispatchEvent(new Event('documents:invalidate'));
      return result;
    } catch (err) {
      setError(toMessage(err, 'Could not receive this document.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { receive, saving, error, reset };
}