import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = 'underline',
  size = 'md',
  className,
}: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id ?? '');
  const current = value ?? internal;

  const handleClick = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  return (
    <div
      className={cn(
        'flex',
        variant === 'underline'
          ? 'border-b border-slate-200 gap-0'
          : 'bg-slate-100 p-1 rounded-md gap-1',
        className
      )}
      role="tablist"
    >
      {items.map(item => {
        const active = item.id === current;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => handleClick(item.id)}
            className={cn(
              'inline-flex items-center gap-2 font-medium transition-colors',
              variant === 'underline' &&
                cn(
                  size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
                  'border-b-2 -mb-px',
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                ),
              variant === 'pill' &&
                cn(
                  size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
                  'rounded-md',
                  active
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                )
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold',
                  active ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-600'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
