import { useState, type ChangeEvent, type FocusEvent } from 'react';
import { Eye, EyeOff, Lock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  showGenerate?: boolean;
  onGenerate?: () => void;
  autoComplete?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
}

export function PasswordInputField({
  value,
  onChange,
  onBlur,
  error,
  required,
  hint,
  showGenerate = false,
  onGenerate,
  autoComplete = 'new-password',
  name,
  id,
  disabled,
}: PasswordInputFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id ?? name}
        className="block text-sm font-medium text-slate-700"
      >
        Password{required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id ?? name}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={cn(
            'w-full h-10 pl-10 pr-20 rounded-md border bg-white text-sm text-slate-900 placeholder:text-slate-400',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
            'disabled:bg-slate-50 disabled:text-slate-500',
            error ? 'border-rose-400' : 'border-slate-300',
          )}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded disabled:opacity-50"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          {showGenerate && onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={disabled}
              className="p-1.5 text-slate-400 hover:text-brand-600 rounded disabled:opacity-50"
              aria-label="Generate new password"
              title="Generate secure password"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
