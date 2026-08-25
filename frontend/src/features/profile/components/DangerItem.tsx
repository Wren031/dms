import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface DangerItemProps {
  label: string;
  description: string;
  onClick: () => void;
  icon?: ReactNode;
  confirmText?: string;
}

export function DangerItem({
  label,
  description,
  onClick,
  icon,
  confirmText = 'Execute',
}: DangerItemProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-900">{label}</p>
          <p className="mt-0.5 text-xs text-rose-700">{description}</p>
        </div>
      </div>
      <Button variant="danger" size="sm" onClick={onClick}>
        {confirmText}
      </Button>
    </div>
  );
}