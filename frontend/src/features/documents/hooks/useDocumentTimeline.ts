import { useCallback, useEffect, useState } from 'react';
import { documentsService, DocumentsApiError } from '@/features/documents/services/documents.service';
import type { DocumentTimelineEntry } from '@/features/documents/types/document';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentTimelineReturn {
  timeline: DocumentTimelineEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDocumentTimeline(id: string | undefined): UseDocumentTimelineReturn {
  const [timeline, setTimeline] = useState<DocumentTimelineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setTimeline([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTimeline(await documentsService.getTimeline(id));
    } catch (err) {
      setError(toMessage(err, 'Could not load timeline.'));
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { timeline, loading, error, refresh };
}