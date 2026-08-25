interface RoleStatProps {
  label: string;
  value: string | number;
  accent?: 'brand' | 'indigo' | 'emerald' | 'slate';
}

const ACCENT: Record<NonNullable<RoleStatProps['accent']>, string> = {
  brand: 'text-brand-700',
  indigo: 'text-indigo-700',
  emerald: 'text-emerald-700',
  slate: 'text-slate-900',
};

export function RoleStat({ label, value, accent = 'slate' }: RoleStatProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${ACCENT[accent]}`}>{value}</p>
    </div>
  );
}