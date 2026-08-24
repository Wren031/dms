import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface OfficeStatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: 'slate' | 'brand' | 'indigo' | 'emerald';
}

const accentStyles: Record<NonNullable<OfficeStatCardProps['accent']>, string> = {
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function OfficeStatCard({
  label,
  value,
  icon,
  accent = 'slate',
}: OfficeStatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
      <div
        className={cn(
          'w-9 h-9 rounded-md border flex items-center justify-center',
          accentStyles[accent],
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
