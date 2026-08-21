import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantStyles: Record<ToastVariant, { icon: typeof CheckCircle2; bar: string; iconClass: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', iconClass: 'text-emerald-600' },
  error: { icon: XCircle, bar: 'bg-rose-500', iconClass: 'text-rose-600' },
  warning: { icon: AlertTriangle, bar: 'bg-amber-500', iconClass: 'text-amber-600' },
  info: { icon: Info, bar: 'bg-blue-500', iconClass: 'text-blue-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({
    push,
    success: (title, description) => push({ title, description, variant: 'success' }),
    error: (title, description) => push({ title, description, variant: 'error' }),
    warning: (title, description) => push({ title, description, variant: 'warning' }),
    info: (title, description) => push({ title, description, variant: 'info' }),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map(t => {
          const Icon = variantStyles[t.variant].icon;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'bg-white border border-slate-200 rounded-lg overflow-hidden flex',
                'animate-in fade-in slide-in-from-right-4'
              )}
            >
              <div className={cn('w-1 shrink-0', variantStyles[t.variant].bar)} />
              <div className="flex-1 p-3 flex gap-3 items-start">
                <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', variantStyles[t.variant].iconClass)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-slate-600 mt-0.5">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
