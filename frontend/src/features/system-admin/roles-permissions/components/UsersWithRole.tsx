import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/constants';
import type { RoleUser } from '@/features/system-admin/roles-permissions/types/role';

interface UsersWithRoleProps {
  users: RoleUser[];
  roleName: string;
}

export function UsersWithRole({ users, roleName }: UsersWithRoleProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
        No users currently hold this role.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {users.map(u => (
        <div
          key={u.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <Avatar name={u.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{u.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            <div className="mt-1 flex items-center gap-1">
              <Badge
                variant={u.status === 'active' ? 'emerald' : 'slate'}
                size="sm"
              >
                {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
              </Badge>
              {u.position && (
                <span className="text-[10px] text-muted-foreground truncate">· {u.position}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}