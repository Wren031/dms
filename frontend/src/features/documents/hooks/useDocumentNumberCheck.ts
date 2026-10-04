import { useEffect, useRef, useState } from 'react';
import { documentsService } from '@/features/documents/services/documents.service';
import type { DocumentNumberAvailabilityExisting } from '@/features/documents/types/document';

export type DocumentNumberCheckStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error';

export interface DocumentNumberCheckState {
  status: DocumentNumberCheckStatus;
  message: string | null;
  existing: DocumentNumberAvailabilityExisting | null;
}

export interface UseDocumentNumberCheckOptions {
  documentNumber: string;
  enabled: boolean;
  /**
   * Numbers are unique per originating office, so the check must be scoped to
   * the selected office. Empty means the manual-origin (`MAN-YYYY-NNNN`) pool.
   */
  originatingOfficeId?: string;
  debounceMs?: number;
}

const IDLE: DocumentNumberCheckState = {
  status: 'idle',
  message: null,
  existing: null,
};

/**
 * Debounced availability check for a typed document number against the
 * backend. Skips when `enabled` is false or the number is blank (blank means
 * the server auto-generates one).
 */
export function useDocumentNumberCheck({
  documentNumber,
  enabled,
  originatingOfficeId,
  debounceMs = 400,
}: UseDocumentNumberCheckOptions): DocumentNumberCheckState {
  const [state, setState] = useState<DocumentNumberCheckState>(IDLE);

  useEffect(() => {
    const number = documentNumber.trim();
    if (!enabled || !number) {
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    setState(prev =>
      prev.status === 'taken' || prev.status === 'available'
        ? { status: 'checking', message: null, existing: prev.existing }
        : { status: 'checking', message: null, existing: null },
    );

    const timer = setTimeout(() => {
      documentsService
        .checkDocumentNumberAvailability(number, originatingOfficeId || undefined, {
          signal: controller.signal,
        })
        .then(result => {
          if (controller.signal.aborted) return;
          if (result.available) {
            setState({ status: 'available', message: null, existing: null });
          } else {
            setState({
              status: 'taken',
              message: 'This number is already in use. Leave it blank to auto-generate a unique number.',
              existing: result.existing,
            });
          }
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState({
            status: 'error',
            message: 'Could not verify this number. You can still submit.',
            existing: null,
          });
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [documentNumber, enabled, originatingOfficeId, debounceMs]);

  return state;
}