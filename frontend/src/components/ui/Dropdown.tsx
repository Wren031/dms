import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center cursor-pointer"
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-[200px] bg-white border border-slate-200 rounded-md overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          <div className="py-1">
            {items.map((item, idx) => {
              if (item.divider) {
                return <div key={`div-${idx}`} className="my-1 border-t border-slate-100" />;
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                    item.disabled
                      ? 'text-slate-400 cursor-not-allowed'
                      : item.destructive
                        ? 'text-rose-700 hover:bg-rose-50'
                        : 'text-slate-700 hover:bg-slate-50'
                  )}
                  role="menuitem"
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownTriggerProps {
  children: ReactNode;
  hasArrow?: boolean;
}

export function DropdownTrigger({ children, hasArrow = true }: DropdownTriggerProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      {hasArrow && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
    </span>
  );
}
