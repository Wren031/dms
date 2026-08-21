import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'brand'
  | 'slate'
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'purple'
  | 'indigo'
  | 'teal'
  | 'orange';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-brand-50 text-brand-700 border-brand-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variantStyles[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
