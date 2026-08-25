import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { RoleSummary } from '@/features/system-admin/roles-permissions/types/role';

interface RoleListProps {
  roles: RoleSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function RoleList({ roles, selectedId, onSelect, loading }: RoleListProps) {
  if (loading) {
    return <p className="text-sm text-slate-500 px-3 py-6 text-center">Loading roles…</p>;
  }
  if (roles.length === 0) {
    return <p className="text-sm text-slate-500 px-3 py-6 text-center">No roles defined.</p>;
  }
  return (
    <div className="space-y-1.5">
      {roles.map(r => {
        const isActive = r.id === selectedId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={cn(
              'w-full rounded-xl border p-3 text-left transition-all',
              isActive
                ? 'border-brand-300 bg-brand-50/60 shadow-sm ring-1 ring-brand-200'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-brand-900' : 'text-slate-900',
                )}
              >
                {r.name}
              </p>
              <Badge variant={isActive ? 'brand' : 'slate'} size="sm">
                <Users className="mr-1 inline h-3 w-3" />
                {r.userCount}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.description}</p>
          </button>
        );
      })}
    </div>
  );
}