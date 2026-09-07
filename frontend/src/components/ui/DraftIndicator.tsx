import { Cloud, CloudOff, Loader2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DraftSaveState } from '@/hooks/useFormDraft';

interface DraftIndicatorProps {
  state: DraftSaveState;
  lastSavedAt: Date | null;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function DraftIndicator({
  state,
  lastSavedAt,
  error,
  onRetry,
  className,
}: DraftIndicatorProps) {
  if (state === 'idle' && !lastSavedAt) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs select-none',
        state === 'error' ? 'text-rose-600' : 'text-slate-500',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {state === 'pending' && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Saving draft…</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <Cloud className="h-3.5 w-3.5 text-emerald-600" />
          <span>
            Saved{lastSavedAt ? ` at ${formatTime(lastSavedAt)}` : ''}
          </span>
        </>
      )}
      {state === 'error' && (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Save failed{error ? ` — ${error}` : ''}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 inline-flex items-center gap-1 underline underline-offset-2 hover:text-rose-700"
            >
              <RotateCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </>
      )}
      {state === 'idle' && lastSavedAt && (
        <>
          <Cloud className="h-3.5 w-3.5 text-emerald-600" />
          <span>Saved at {formatTime(lastSavedAt)}</span>
        </>
      )}
    </div>
  );
}
