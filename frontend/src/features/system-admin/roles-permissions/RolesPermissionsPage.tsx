import { useState } from 'react';
import { ShieldCheck, Users, FileText, Eye, Edit2, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { roles } from '@/mocks/roles';
import { users } from '@/mocks/users';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/constants';
import { cn } from '@/lib/utils';
import type { Permission } from '@/types';

const PERMISSION_GROUPS: Array<{ label: string; icon: typeof Eye; permissions: Array<{ key: Permission; label: string }> }> = [
  {
    label: 'Documents',
    icon: FileText,
    permissions: [
      { key: 'documents.view', label: 'View documents' },
      { key: 'documents.create', label: 'Create documents' },
      { key: 'documents.edit', label: 'Edit documents' },
      { key: 'documents.delete', label: 'Delete documents' },
      { key: 'documents.register', label: 'Register documents' },
      { key: 'documents.receive', label: 'Receive documents' },
      { key: 'documents.route', label: 'Route documents' },
      { key: 'documents.review', label: 'Review documents' },
      { key: 'documents.recommend', label: 'Recommend documents' },
      { key: 'documents.approve', label: 'Approve documents' },
      { key: 'documents.reject', label: 'Reject documents' },
      { key: 'documents.return', label: 'Return documents' },
      { key: 'documents.release', label: 'Release documents' },
      { key: 'documents.archive', label: 'Archive documents' },
      { key: 'documents.track', label: 'Track documents' },
    ],
  },
  {
    label: 'Users & Offices',
    icon: Users,
    permissions: [
      { key: 'users.view', label: 'View users' },
      { key: 'users.create', label: 'Create users' },
      { key: 'users.edit', label: 'Edit users' },
      { key: 'users.delete', label: 'Delete users' },
      { key: 'offices.view', label: 'View offices' },
      { key: 'offices.create', label: 'Create offices' },
      { key: 'offices.edit', label: 'Edit offices' },
      { key: 'offices.delete', label: 'Delete offices' },
    ],
  },
  {
    label: 'System & Audit',
    icon: ShieldCheck,
    permissions: [
      { key: 'roles.view', label: 'View roles' },
      { key: 'roles.edit', label: 'Edit roles' },
      { key: 'audit.view', label: 'View audit logs' },
      { key: 'notifications.view', label: 'View notifications' },
      { key: 'settings.view', label: 'View settings' },
      { key: 'settings.edit', label: 'Edit settings' },
      { key: 'dashboard.view', label: 'View dashboard' },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export function RolesPermissionsPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>(roles[0]?.id ?? '');
  const role = roles.find(r => r.id === selectedRole);
  const roleUsers = users.filter(u => u.role === selectedRole);

  const togglePermission = (perm: Permission) => {
    if (!hasPermission('roles.edit')) {
      toast.warning('Permission denied', 'You cannot edit role permissions.');
      return;
    }
    toast.info('Permission updated', `${perm} has been ${ROLE_PERMISSIONS[selectedRole as keyof typeof ROLE_PERMISSIONS]?.includes(perm) ? 'revoked' : 'granted'} for this role.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Define and manage role-based access controls"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader title="System Roles" description={`${roles.length} roles defined`} />
          <div className="space-y-1.5">
            {roles.map(r => {
              const userCount = users.filter(u => u.role === r.id).length;
              const isActive = r.id === selectedRole;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={cn(
                    'w-full p-3 rounded-md border text-left transition-colors',
                    isActive ? 'bg-brand-50 border-brand-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('font-semibold', isActive ? 'text-brand-900' : 'text-slate-900')}>
                      {r.name}
                    </p>
                    <Badge variant={isActive ? 'brand' : 'slate'}>{userCount}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={role?.name ?? ''}
            description={role?.description ?? ''}
            action={
              hasPermission('roles.edit') && (
                <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                  Edit Role
                </Button>
              )
            }
          />

          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Total Permissions" value={role?.permissions.length ?? 0} />
            <Stat label="Users Assigned" value={roleUsers.length} />
            <Stat label="Coverage" value={`${Math.round(((role?.permissions.length ?? 0) / ALL_PERMISSIONS.length) * 100)}%`} />
          </div>

          <div className="space-y-4">
            {PERMISSION_GROUPS.map(group => {
              const Icon = group.icon;
              const groupPerms = group.permissions.filter(p => role?.permissions.includes(p.key));
              return (
                <div key={group.label} className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <h4 className="text-sm font-semibold text-slate-900">{group.label}</h4>
                    </div>
                    <span className="text-xs text-slate-500">
                      {groupPerms.length} of {group.permissions.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.permissions.map(perm => {
                      const granted = role?.permissions.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-5 h-5 rounded flex items-center justify-center border',
                              granted
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-slate-50 border-slate-200 text-slate-300'
                            )}>
                              {granted && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{perm.label}</p>
                              <p className="text-xs text-slate-500 font-mono">{perm.key}</p>
                            </div>
                          </div>
                          {hasPermission('roles.edit') && (
                            <button
                              onClick={() => togglePermission(perm.key)}
                              className={cn(
                                'text-xs font-semibold px-2.5 py-1 rounded border transition-colors',
                                granted
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              )}
                            >
                              {granted ? 'Revoke' : 'Grant'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {role && roleUsers.length > 0 && (
        <Card>
          <CardHeader title={`Users with ${role.name} role`} description={`${roleUsers.length} user(s)`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {roleUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-md border border-slate-200">
                <div className="w-9 h-9 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0" style={{ backgroundColor: u.avatarColor.replace('bg-', '').includes('-') ? '' : '' }}>
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${u.avatarColor}`}>
                    {u.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-md border border-slate-200 bg-slate-50">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
