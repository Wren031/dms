import { useCallback, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentDeleteReturn {
  remove: (id: string) => Promise<boolean>;
  removeAll: () => Promise<number | null>;
  deleting: boolean;
  error: string | null;
  reset: () => void;
}

export function useDocumentDelete(): UseDocumentDeleteReturn {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setDeleting(true);
    setError(null);
    try {
      await documentsService.remove(id);
      window.dispatchEvent(new Event('documents:invalidate'));
      return true;
    } catch (err) {
      setError(toMessage(err, 'Could not delete document.'));
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  const removeAll = useCallback(async (): Promise<number | null> => {
    setDeleting(true);
    setError(null);
    try {
      const result = await documentsService.removeAll();
      window.dispatchEvent(new Event('documents:invalidate'));
      return result.deletedCount;
    } catch (err) {
      setError(toMessage(err, 'Could not delete documents.'));
      return null;
    } finally {
      setDeleting(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { remove, removeAll, deleting, error, reset };
}