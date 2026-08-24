import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentTypeStatusBadgeProps {
  isActive: boolean;
  withIcon?: boolean;
  className?: string;
}

export function DocumentTypeStatusBadge({
  isActive,
  withIcon = true,
  className,
}: DocumentTypeStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium',
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
        className,
      )}
    >
      {withIcon &&
        (isActive ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        ) : (
          <XCircle className="w-3 h-3 text-slate-400" />
        ))}
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
