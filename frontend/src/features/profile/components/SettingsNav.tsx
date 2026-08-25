import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  description?: string;
  badge?: number | string;
}

interface SettingsNavProps {
  items: SettingsNavItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SettingsNav({ items, value, onChange, className }: SettingsNavProps) {
  return (
    <nav
      role="tablist"
      aria-label="Settings sections"
      className={cn(
        'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4',
        className,
      )}
    >
      {items.map(item => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              active
                ? 'border-brand-300 bg-brand-50/60 shadow-sm ring-1 ring-brand-200'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
              )}
            >
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-sm font-semibold leading-tight',
                  active ? 'text-brand-900' : 'text-slate-900',
                )}
              >
                {item.label}
              </p>
              {item.description && (
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="absolute right-2 top-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}