import { useCallback, useState } from 'react';
import {
  documentsService,
  DocumentsApiError,
} from '@/features/documents/services/documents.service';
import type { DocumentRecipient } from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseRecipientNoteReturn {
  saving: boolean;
  error: string | null;
  setNote: (documentId: string, officeId: string, note: string) => Promise<DocumentRecipient | null>;
  deleteNote: (documentId: string, officeId: string) => Promise<boolean>;
  reset: () => void;
}

export function useRecipientNote(): UseRecipientNoteReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setNote = useCallback<UseRecipientNoteReturn['setNote']>(
    async (documentId, officeId, note) => {
      setSaving(true);
      setError(null);
      try {
        const updated = await documentsService.setRecipientNote(documentId, officeId, note.trim());
        window.dispatchEvent(new Event('documents:invalidate'));
        return updated;
      } catch (err) {
        setError(toMessage(err, 'Could not save the note.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const deleteNote = useCallback<UseRecipientNoteReturn['deleteNote']>(
    async (documentId, officeId) => {
      setSaving(true);
      setError(null);
      try {
        await documentsService.deleteRecipientNote(documentId, officeId);
        window.dispatchEvent(new Event('documents:invalidate'));
        return true;
      } catch (err) {
        setError(toMessage(err, 'Could not delete the note.'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const reset = useCallback(() => setError(null), []);

  return { saving, error, setNote, deleteNote, reset };
}