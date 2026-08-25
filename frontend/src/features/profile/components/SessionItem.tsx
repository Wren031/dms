import { Monitor, Smartphone, Trash2 } from 'lucide-react';
import type { Session } from '@/features/authentication/api/authApi';
import { Button } from '@/components/ui/Button';
import { cn, formatDate, formatRelative } from '@/lib/utils';

interface SessionItemProps {
  session: Session;
  onRevoke: () => void;
}

export function SessionItem({ session, onRevoke }: SessionItemProps) {
  const Icon = session.current ? Monitor : Smartphone;
  const lastUsed = session.lastUsedAt ? formatRelative(session.lastUsedAt) : 'Never used';
  const created = formatDate(session.createdAt, true);

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5 transition-colors',
        session.current
          ? 'border-emerald-200 bg-emerald-50/40'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
          session.current
            ? 'border-emerald-200 bg-white text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {session.current ? 'This device' : 'Other device'}
          </p>
          {session.current && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Current
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Last used {lastUsed} · Created {created}
        </p>
      </div>
      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Revoke session"
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={onRevoke}
        >
          <span className="sr-only">Revoke</span>
        </Button>
      )}
    </div>
  );
}