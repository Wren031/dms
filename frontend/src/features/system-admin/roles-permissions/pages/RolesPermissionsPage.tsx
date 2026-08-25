import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Edit2, Lock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useRoles } from '@/features/system-admin/roles-permissions/hooks/useRoles';
import {
  PERMISSION_GROUPS,
  roleCoveragePercent,
} from '@/features/system-admin/roles-permissions/types/role';
import {
  PermissionGroup,
  RoleList,
  RoleStat,
  UsersWithRole,
} from '@/features/system-admin/roles-permissions/components';
import type { Permission as PermissionKey } from '@/types';

export function RolesPermissionsPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('roles.edit');

  const {
    roles,
    loading,
    error,
    selectedRole,
    selectedLoading,
    selectedError,
    selectRole,
    roleUsers,
    usersLoading,
    usersError,
    refresh,
    refreshUsers,
  } = useRoles();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first role on first load
  useEffect(() => {
    if (!selectedId && roles.length > 0) {
      setSelectedId(roles[0].id);
      void selectRole(roles[0].id);
    }
  }, [roles, selectedId, selectRole]);

  useEffect(() => {
    if (error) toast.error('Failed to load roles', error);
  }, [error, toast]);

  useEffect(() => {
    if (selectedError) toast.error('Failed to load role', selectedError);
  }, [selectedError, toast]);

  useEffect(() => {
    if (usersError) toast.error('Failed to load users', usersError);
  }, [usersError, toast]);

  const grantedPermissions = useMemo<PermissionKey[]>(
    () => (selectedRole?.permissions ?? []) as PermissionKey[],
    [selectedRole],
  );

  const coverage = useMemo(() => roleCoveragePercent(selectedRole), [selectedRole]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    void selectRole(id);
  };

  const handleToggle = (perm: PermissionKey) => {
    if (!canEdit) {
      toast.warning('Permission denied', 'You cannot edit role permissions.');
      return;
    }
    const granted = grantedPermissions.includes(perm);
    toast.info(
      granted ? 'Permission revoked' : 'Permission granted',
      `${perm} ${granted ? 'revoked from' : 'granted to'} ${selectedRole?.name ?? 'role'}.`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Define and manage role-based access controls"
        actions={
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader
            title="System Roles"
            description={`${roles.length} role${roles.length === 1 ? '' : 's'} defined`}
          />
          <RoleList
            roles={roles}
            selectedId={selectedId}
            onSelect={handleSelect}
            loading={loading}
          />
        </Card>

        <Card className="lg:col-span-2" padded={false}>
          {selectedRole ? (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{selectedRole.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedRole.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={canEdit ? <Edit2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  disabled={!canEdit}
                  title={canEdit ? 'Edit role' : 'Read-only'}
                >
                  {canEdit ? 'Edit Role' : 'Read only'}
                </Button>
              </div>

              <div className="px-5 py-4 sm:px-6">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <RoleStat
                    label="Permissions"
                    value={selectedRole.permissions.length}
                    accent="brand"
                  />
                  <RoleStat
                    label="Users Assigned"
                    value={roleUsers.length}
                    accent="indigo"
                  />
                  <RoleStat
                    label="Coverage"
                    value={`${coverage}%`}
                    accent="emerald"
                  />
                </div>

                <div className="space-y-4">
                  {PERMISSION_GROUPS.map(group => (
                    <PermissionGroup
                      key={group.label}
                      group={group}
                      granted={grantedPermissions}
                      onToggle={handleToggle}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : selectedLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading role…</div>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={<ShieldCheck className="h-7 w-7" />}
                title="Select a role"
                description="Pick a role from the list to view its permissions and members."
              />
            </div>
          )}
        </Card>
      </div>

      {selectedRole && (
        <Card padded={false}>
          <div className="px-5 py-4 border-b border-slate-200 sm:px-6">
            <CardHeader
              title={`Users with ${selectedRole.name} role`}
              description={`${roleUsers.length} user${roleUsers.length === 1 ? '' : 's'}`}
            />
          </div>
          <div className="px-5 py-5 sm:px-6">
            {usersLoading && roleUsers.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Loading users…</p>
            ) : (
              <UsersWithRole users={roleUsers} roleName={selectedRole.name} />
            )}
          </div>
          {roleUsers.length > 0 && (
            <div className="border-t border-slate-200 px-5 py-3 sm:px-6">
              <Button variant="ghost" size="sm" onClick={() => void refreshUsers()}>
                Refresh users
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}