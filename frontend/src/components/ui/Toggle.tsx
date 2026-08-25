import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

const SIZE_CLASS = {
  sm: { track: 'w-8 h-[18px]', thumb: 'h-3.5 w-3.5', offX: 'left-[2px]', onX: 'translate-x-[16px]' },
  md: { track: 'w-10 h-6', thumb: 'h-[18px] w-[18px]', offX: 'left-[3px]', onX: 'translate-x-[18px]' },
} as const;

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, label, size = 'md', disabled, className, ...rest }, ref) => {
    const s = SIZE_CLASS[size];
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          s.track,
          checked
            ? 'bg-brand-600 border-brand-600'
            : 'bg-slate-200 border-slate-200 hover:bg-slate-300',
          className,
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200',
            s.thumb,
            s.offX,
            checked && s.onX,
          )}
        />
      </button>
    );
  },
);

Toggle.displayName = 'Toggle';