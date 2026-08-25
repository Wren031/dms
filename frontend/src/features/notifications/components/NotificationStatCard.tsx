import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NotificationStatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: 'slate' | 'brand' | 'indigo' | 'amber' | 'blue';
}

const ACCENT_STYLES: Record<NonNullable<NotificationStatCardProps['accent']>, string> = {
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function NotificationStatCard({
  label,
  value,
  icon,
  accent = 'slate',
}: NotificationStatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
      <div
        className={cn(
          'w-10 h-10 rounded-md border flex items-center justify-center',
          ACCENT_STYLES[accent],
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