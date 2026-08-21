import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/constants';
import type { DocumentStatus, DocumentClassification } from '@/types';

interface StatusBadgeProps {
  status: DocumentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        DOCUMENT_STATUS_COLORS[status],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}

interface ClassificationBadgeProps {
  classification: DocumentClassification;
  size?: 'sm' | 'md';
  className?: string;
}

import { DOCUMENT_CLASSIFICATION_COLORS, DOCUMENT_CLASSIFICATION_LABELS } from '@/constants';

export function ClassificationBadge({
  classification,
  size = 'sm',
  className,
}: ClassificationBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        DOCUMENT_CLASSIFICATION_COLORS[classification],
        className
      )}
    >
      {DOCUMENT_CLASSIFICATION_LABELS[classification]}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: 'low' | 'normal' | 'high' | 'urgent';
  className?: string;
}

import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants';

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium px-2 py-0.5 text-xs',
        PRIORITY_COLORS[priority],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

interface GenericBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'brand' | 'slate' | 'blue' | 'amber' | 'emerald' | 'rose' | 'purple' | 'indigo' | 'teal' | 'orange';
  className?: string;
  icon?: ReactNode;
}

const variants = {
  default: 'bg-brand-50 text-brand-700 border-brand-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

export function Tag({ children, variant = 'slate', className, icon }: GenericBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium px-2 py-0.5 text-xs',
        variants[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
