import { useCallback, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type { DocumentListItem } from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function toDetails(err: unknown): unknown {
  if (err instanceof DocumentsApiError) return err.details;
  return (err as { details?: unknown } | null)?.details;
}

export interface UseRegisterDocumentReturn {
  register: (payload: Parameters<typeof documentsService.register>[0]) => Promise<DocumentListItem | null>;
  saving: boolean;
  error: string | null;
  status: number | null;
  details: unknown;
  reset: () => void;
}

export function useRegisterDocument(): UseRegisterDocumentReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [details, setDetails] = useState<unknown>(null);

  const register = useCallback<UseRegisterDocumentReturn['register']>(async payload => {
    setSaving(true);
    setError(null);
    setStatus(null);
    setDetails(null);
    try {
      const created = await documentsService.register(payload);
      window.dispatchEvent(new Event('documents:invalidate'));
      return created;
    } catch (err) {
      setStatus((err as { status?: number }).status ?? null);
      setError(toMessage(err, 'Could not register document.'));
      setDetails(toDetails(err) ?? null);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setStatus(null);
    setDetails(null);
  }, []);

  return { register, saving, error, status, details, reset };
}