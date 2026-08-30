import { cn } from '@/lib/utils';

interface RoleStatProps {
  label: string;
  value: string | number;
  accent?: 'brand' | 'indigo' | 'emerald' | 'slate';
}

const ACCENT: Record<NonNullable<RoleStatProps['accent']>, string> = {
  brand: 'text-brand-700',
  indigo: 'text-indigo-700',
  emerald: 'text-emerald-700',
  slate: 'text-foreground',
};

export function RoleStat({ label, value, accent = 'slate' }: RoleStatProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums leading-none', ACCENT[accent])}>
        {value}
      </p>
    </div>
  );
}