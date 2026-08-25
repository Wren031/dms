import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconBgClass?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: 'default' | 'danger';
}

const TONE_STYLES = {
  default: {
    card: 'border-slate-200 bg-white shadow-sm',
    iconBg: 'bg-brand-50 text-brand-700',
    title: 'text-slate-900',
  },
  danger: {
    card: 'border-rose-200 bg-rose-50/40',
    iconBg: 'bg-rose-100 text-rose-700',
    title: 'text-rose-800',
  },
} as const;

export function SettingsSection({
  title,
  description,
  icon,
  iconBgClass,
  actions,
  children,
  className,
  contentClassName,
  tone = 'default',
}: SettingsSectionProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <section
      className={cn(
        'rounded-2xl border',
        toneStyle.card,
        className,
      )}
    >
      <header className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-6">
        <div className="flex items-start gap-3">
          {icon && (
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                iconBgClass ?? toneStyle.iconBg,
              )}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className={cn('text-base font-semibold leading-tight', toneStyle.title)}>
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className={cn('px-5 pb-5 sm:px-6 sm:pb-6', contentClassName)}>
        {children}
      </div>
    </section>
  );
}