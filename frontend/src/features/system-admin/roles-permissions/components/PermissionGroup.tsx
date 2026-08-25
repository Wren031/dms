import type { ReactNode } from 'react';
import {
  FileText,
  ShieldCheck,
  Users as UsersIcon,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PermissionGroupMeta } from '@/features/system-admin/roles-permissions/types/role';
import type { Permission } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  ShieldCheck,
  Users: UsersIcon,
};

interface PermissionGroupProps {
  group: PermissionGroupMeta;
  granted: Permission[];
  onToggle: (permission: Permission) => void;
  canEdit: boolean;
}

export function PermissionGroup({ group, granted, onToggle, canEdit }: PermissionGroupProps) {
  const Icon = ICON_MAP[group.iconName] ?? ShieldCheck;
  const grantedCount = group.permissions.filter(p => granted.includes(p.key)).length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-sm font-semibold text-slate-900">{group.label}</h4>
        </div>
        <span className="text-xs font-medium text-slate-500 tabular-nums">
          {grantedCount} of {group.permissions.length}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {group.permissions.map(perm => {
          const isGranted = granted.includes(perm.key);
          return (
            <li
              key={perm.key}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    isGranted
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-300',
                  )}
                >
                  {isGranted && <Check className="h-3 w-3" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{perm.label}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{perm.key}</p>
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onToggle(perm.key)}
                  className={cn(
                    'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors',
                    isGranted
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                  )}
                >
                  {isGranted ? 'Revoke' : 'Grant'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}