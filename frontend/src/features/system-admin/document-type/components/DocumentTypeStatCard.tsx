import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DocumentTypeStatCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  accent?: 'slate' | 'brand' | 'indigo' | 'emerald' | 'amber';
}

const accentStyles: Record<NonNullable<DocumentTypeStatCardProps['accent']>, string> = {
  slate: 'text-slate-900',
  brand: 'text-brand-700',
  indigo: 'text-indigo-700',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
};

export function DocumentTypeStatCard({
  label,
  value,
  icon,
  accent = 'slate',
}: DocumentTypeStatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          'text-2xl font-semibold mt-1 flex items-center gap-2',
          accentStyles[accent],
        )}
      >
        {icon}
        <span>{value}</span>
      </p>
    </div>
  );
}
