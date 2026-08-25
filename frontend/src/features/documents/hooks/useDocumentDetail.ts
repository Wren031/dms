import { useCallback, useEffect, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import { attachmentsService } from '@/features/documents/services/documents.service';
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
  uploadAttachments: (files: File[]) => Promise<boolean>;
  downloadAttachment: (id: string) => Promise<void>;
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

  const uploadAttachments = useCallback(async (files: File[]) => {
    if (!id || files.length === 0) return true;
    try {
      const uploaded = await Promise.all(files.map(file => attachmentsService.upload(id, file)));
      setDocument(current => current ? { ...current, attachments: [...uploaded, ...current.attachments] } : current);
      return true;
    } catch (err) {
      setError(toMessage(err, 'Could not upload attachments.'));
      return false;
    }
  }, [id]);

  const downloadAttachment = useCallback(async (attachmentId: string) => {
    try {
      const { url } = await attachmentsService.downloadUrl(attachmentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(toMessage(err, 'Could not download attachment.'));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { document, loading, error, refresh, setDocument, uploadAttachments, downloadAttachment };
}
