import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
  description?: string;
  disabled?: boolean;
}

interface ComboboxProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  id?: string;
  name?: string;
  searchable?: boolean;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

export function Combobox({
  label,
  hint,
  error,
  required,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled,
  className,
  emptyMessage = 'No matches found.',
  id,
  name,
  searchable = true,
}: ComboboxProps) {
  const inputId = id ?? name;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find(o => o.value === value) ?? null,
    [options, value],
  );

  // A value can legitimately fall outside `options` — e.g. an office saved before
  // it was added to the directory constant. Fall back to the raw value so the
  // field shows the real selection instead of rendering blank.
  const displayValue = selected?.label ?? value;

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter(
      o => normalize(o.label).includes(q) || normalize(o.value).includes(q),
    );
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ComboboxOption[]>();
    for (const opt of filtered) {
      const key = opt.group ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector<HTMLElement>(
        `[data-combobox-index="${activeIndex}"]`,
      );
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const choose = (opt: ComboboxOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const clear = () => {
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex(i => Math.min(flatList.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = flatList[activeIndex];
      if (opt) choose(opt);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Backspace' && !query && value) {
      onChange('');
    }
  };

  let runningIndex = -1;

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          className={cn(
            'flex items-center h-10 rounded-md border bg-white text-sm text-slate-900',
            'transition-colors focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500',
            'disabled:bg-slate-50 disabled:text-slate-500',
            error ? 'border-rose-400' : 'border-slate-300',
          )}
        >
          {searchable && <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />}
          <input
            ref={inputRef}
            id={inputId}
            name={name}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete={searchable ? 'list' : 'none'}
            aria-controls={inputId ? `${inputId}-listbox` : undefined}
            disabled={disabled}
            readOnly={!searchable}
            value={open && searchable ? query : displayValue}
            placeholder={
              open && searchable
                ? searchPlaceholder
                : displayValue
                  ? undefined
                  : placeholder
            }
            onChange={
              searchable
                ? e => {
                    setQuery(e.target.value);
                    if (!open) setOpen(true);
                  }
                : undefined
            }
            onFocus={() => {
              if (!disabled) {
                setOpen(true);
                if (searchable) setQuery('');
              }
            }}
            onClick={() => {
              if (!disabled && !open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex-1 h-full bg-transparent outline-none px-2 placeholder:text-slate-400',
              !searchable && 'cursor-pointer',
              'disabled:cursor-not-allowed',
            )}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={clear}
              tabIndex={-1}
              aria-label="Clear selection"
              className="p-1 mr-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-500 mr-2.5 shrink-0 transition-transform',
              open && 'rotate-180',
            )}
          />
        </div>

        {open && !disabled && (
          <div
            className={cn(
              'absolute z-50 mt-1 w-full max-h-72 overflow-auto bg-white border border-slate-200 rounded-md shadow-lg',
            )}
            ref={listRef}
            id={inputId ? `${inputId}-listbox` : undefined}
            role="listbox"
          >
            {flatList.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                {emptyMessage}
              </div>
            ) : (
              grouped.map(([groupLabel, groupOpts]) => (
                <div key={groupLabel || '__ungrouped'}>
                  {groupLabel && (
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-50 sticky top-0">
                      {groupLabel}
                    </div>
                  )}
                  {groupOpts.map(opt => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const isActive = idx === activeIndex;
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={opt.disabled}
                        data-combobox-index={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => choose(opt)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm flex items-center gap-2',
                          isActive ? 'bg-brand-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50',
                          opt.disabled && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <span className="flex-1 truncate">
                          {opt.label}
                          {opt.description && (
                            <span className="block text-[11px] text-slate-500">
                              {opt.description}
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-semibold text-brand-700">
                            selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
