import { useCallback, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type {
  DocumentAssignHolderInput,
  DocumentListItem,
  DocumentTransitionInput,
} from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentTransitionReturn {
  transition: (id: string, payload: DocumentTransitionInput) => Promise<DocumentListItem | null>;
  assignHolder: (id: string, payload: DocumentAssignHolderInput) => Promise<DocumentListItem | null>;
  saving: boolean;
  error: string | null;
  reset: () => void;
}

export function useDocumentTransition(): UseDocumentTransitionReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transition = useCallback<UseDocumentTransitionReturn['transition']>(async (id, payload) => {
    setSaving(true);
    setError(null);
    try {
      return await documentsService.transition(id, payload);
    } catch (err) {
      setError(toMessage(err, 'Could not change document status.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const assignHolder = useCallback<UseDocumentTransitionReturn['assignHolder']>(async (id, payload) => {
    setSaving(true);
    setError(null);
    try {
      return await documentsService.assignHolder(id, payload);
    } catch (err) {
      setError(toMessage(err, 'Could not assign holder.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { transition, assignHolder, saving, error, reset };
}