import { CheckCircle2, XCircle, Ban } from 'lucide-react';
import type { UserStatusApi } from '@/features/system-admin/users/types/user';
import { cn } from '@/lib/utils';

interface UserStatusBadgeProps {
  status: UserStatusApi;
  withIcon?: boolean;
  className?: string;
}

const variants: Record<UserStatusApi, { classes: string; iconClass: string; icon: typeof CheckCircle2 }> = {
  ACTIVE: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconClass: 'text-emerald-500',
    icon: CheckCircle2,
  },
  INACTIVE: {
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
    iconClass: 'text-slate-400',
    icon: XCircle,
  },
  SUSPENDED: {
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
    iconClass: 'text-rose-500',
    icon: Ban,
  },
};

const labels: Record<UserStatusApi, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

export function UserStatusBadge({ status, withIcon = true, className }: UserStatusBadgeProps) {
  const v = variants[status];
  const Icon = v.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium',
        v.classes,
        className,
      )}
    >
      {withIcon && <Icon className={cn('w-3 h-3', v.iconClass)} />}
      {labels[status]}
    </span>
  );
}
