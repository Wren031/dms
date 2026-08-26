import { useCallback, useEffect, useState } from 'react';
import { DocumentsApiError, routingService } from '@/features/documents/services/documents.service';

interface RoutingStep {
  id: string;
  documentId: string;
  sequence: number;
  fromOfficeId: string;
  fromUserId: string | null;
  toOfficeId: string;
  toUserId: string | null;
  instructions: string | null;
  status: 'pending' | 'received' | 'in_progress' | 'completed' | 'returned';
  receivedAt: string | null;
  completedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof DocumentsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseDocumentRoutingReturn {
  steps: RoutingStep[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDocumentRouting(documentId: string | undefined): UseDocumentRoutingReturn {
  const [steps, setSteps] = useState<RoutingStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // No documentId => load all routing steps (used by the Routing page).
      const data = (await routingService.listSteps(documentId)) as RoutingStep[];
      setSteps([...data].sort((a, b) => a.sequence - b.sequence));
    } catch (err) {
      setError(toMessage(err, 'Could not load routing steps.'));
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { steps, loading, error, refresh };
}

export type { RoutingStep };