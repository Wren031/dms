import { FileText, FileSignature, ScrollText, FileSpreadsheet, FileBadge, Megaphone, MoreHorizontal, Mail } from 'lucide-react';
import type { DocumentTypeCode } from '@/features/system-admin/document-type/types/document-type';
import { cn } from '@/lib/utils';

interface DocumentTypeCodeBadgeProps {
  code: DocumentTypeCode;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

const codeStyles: Record<DocumentTypeCode, { classes: string; iconClass: string; icon: typeof FileText }> = {
  memo: {
    classes: 'bg-brand-50 text-brand-700 border-brand-200',
    iconClass: 'text-brand-500',
    icon: Mail,
  },
  letter: {
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    iconClass: 'text-blue-500',
    icon: FileText,
  },
  ordinance: {
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconClass: 'text-indigo-500',
    icon: ScrollText,
  },
  resolution: {
    classes: 'bg-purple-50 text-purple-700 border-purple-200',
    iconClass: 'text-purple-500',
    icon: ScrollText,
  },
  report: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconClass: 'text-emerald-500',
    icon: FileSpreadsheet,
  },
  contract: {
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'text-amber-500',
    icon: FileSignature,
  },
  circular: {
    classes: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconClass: 'text-cyan-500',
    icon: Megaphone,
  },
  others: {
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    iconClass: 'text-slate-500',
    icon: FileBadge,
  },
};

export function DocumentTypeCodeBadge({
  code,
  label,
  showIcon = true,
  className,
}: DocumentTypeCodeBadgeProps) {
  const v = codeStyles[code];
  const Icon = v.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium',
        v.classes,
        className,
      )}
    >
      {showIcon && <Icon className={cn('w-3 h-3', v.iconClass)} />}
      <span className="font-mono text-[10px] uppercase tracking-wider">
        {label ?? code}
      </span>
    </span>
  );
}

export { MoreHorizontal as DocumentTypeFallbackIcon };
