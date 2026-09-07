import { useCallback, useEffect, useRef, useState } from 'react';
import { formDraftsApi, FormDraftResponse } from '@/lib/formDraftsApi';

const CLIENT_SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'temporaryPassword',
  'token',
  'refreshToken',
]);

function sanitizePayload(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (CLIENT_SENSITIVE_KEYS.has(k)) continue;
    clone[k] = v;
  }
  return clone;
}

export type DraftSaveState = 'idle' | 'pending' | 'saved' | 'error';

export interface UseFormDraftOptions {
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (payload: Record<string, unknown>) => void;
}

export interface UseFormDraftReturn {
  draft: FormDraftResponse | null;
  loading: boolean;
  saving: DraftSaveState;
  lastSavedAt: Date | null;
  error: string | null;
  /** Debounced save — call from onChange. */
  saveDraft: (payload: Record<string, unknown>) => void;
  /** Immediate save — call before navigating away or on demand. */
  saveDraftNow: (payload: Record<string, unknown>) => Promise<void>;
  /** Delete the draft (after submit or on Discard). */
  clearDraft: () => Promise<void>;
}

export function useFormDraft(
  formKey: string,
  options: UseFormDraftOptions = {},
): UseFormDraftReturn {
  const { enabled = true, debounceMs = 800, onRestore } = options;

  const [draft, setDraft] = useState<FormDraftResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [saving, setSaving] = useState<DraftSaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRestoreRef = useRef(onRestore);
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  const inflightRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredOnceRef = useRef(false);

  // Load on mount / when enabled becomes true.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    formDraftsApi
      .get(formKey)
      .then(row => {
        if (cancelled) return;
        setDraft(row);
        if (row && !restoredOnceRef.current) {
          restoredOnceRef.current = true;
          onRestoreRef.current?.(row.payload);
          setLastSavedAt(new Date(row.updatedAt));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load draft.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formKey, enabled]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (inflightRef.current) inflightRef.current.abort();
    };
  }, []);

  const saveNow = useCallback(
    async (payload: Record<string, unknown>): Promise<void> => {
      if (!enabled) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (inflightRef.current) inflightRef.current.abort();
      const controller = new AbortController();
      inflightRef.current = controller;
      setSaving('pending');
      setError(null);
      try {
        const safe = sanitizePayload(payload);
        const saved = await formDraftsApi.upsert(formKey, safe);
        if (!controller.signal.aborted) {
          setDraft(saved);
          setLastSavedAt(new Date(saved.updatedAt));
          setSaving('saved');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to save draft.');
          setSaving('error');
        }
      }
    },
    [enabled, formKey],
  );

  const saveDraft = useCallback(
    (payload: Record<string, unknown>) => {
      if (!enabled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void saveNow(payload);
      }, debounceMs);
    },
    [enabled, debounceMs, saveNow],
  );

  const clearDraft = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (inflightRef.current) inflightRef.current.abort();
    try {
      await formDraftsApi.clear(formKey);
    } catch {
      // Already cleared or missing — treat as success.
    }
    setDraft(null);
    setLastSavedAt(null);
    setSaving('idle');
    setError(null);
    restoredOnceRef.current = false;
  }, [formKey]);

  return {
    draft,
    loading,
    saving,
    lastSavedAt,
    error,
    saveDraft,
    saveDraftNow: saveNow,
    clearDraft,
  };
}
