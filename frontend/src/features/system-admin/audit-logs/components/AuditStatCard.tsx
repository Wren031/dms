import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuditStatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: 'slate' | 'brand' | 'indigo' | 'emerald' | 'amber';
}

const ACCENT: Record<NonNullable<AuditStatCardProps['accent']>, string> = {
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ACCENT_TEXT: Record<NonNullable<AuditStatCardProps['accent']>, string> = {
  slate: 'text-slate-900',
  brand: 'text-brand-700',
  indigo: 'text-indigo-700',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
};

export function AuditStatCard({ label, value, icon, accent = 'slate' }: AuditStatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
          ACCENT[accent],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={cn('text-2xl font-semibold tabular-nums leading-none', ACCENT_TEXT[accent])}>
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}