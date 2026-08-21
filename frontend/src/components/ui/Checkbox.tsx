import { cn } from '@/lib/utils';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function Checkbox({ checked, indeterminate, onChange, disabled, ariaLabel, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'w-4 h-4 rounded border flex items-center justify-center transition-colors',
        checked || indeterminate
          ? 'bg-brand-600 border-brand-600 text-white'
          : 'bg-white border-slate-300 hover:border-slate-400',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {checked && (
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {!checked && indeterminate && (
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <path d="M3 6H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
