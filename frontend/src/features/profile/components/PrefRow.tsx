import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/Toggle';

interface PrefRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: ReactNode;
  accent?: 'brand' | 'indigo' | 'amber' | 'emerald' | 'slate';
  disabled?: boolean;
}

const ACCENT_BG = {
  brand: 'bg-brand-50 text-brand-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  slate: 'bg-slate-100 text-slate-600',
} as const;

export function PrefRow({
  label,
  description,
  checked,
  onChange,
  icon,
  accent = 'brand',
  disabled,
}: PrefRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-colors',
        'hover:border-slate-300 hover:bg-slate-50/60',
        disabled && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          ACCENT_BG[accent],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        label={label}
        size="md"
      />
    </div>
  );
}