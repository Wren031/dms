import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { users as allUsers } from '@/mocks/users';
import { offices } from '@/mocks/offices';
import {
  ALL_ROLES,
  ROLE_LABELS,
  ROLE_SHORT_LABELS,
} from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, cn } from '@/lib/utils';

export function UsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (officeFilter !== 'all' && u.officeId !== officeFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (q) {
        const haystack = `${u.fullName} ${u.email} ${u.username} ${u.position}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [search, roleFilter, officeFilter, statusFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paged = filtered.slice(pagination.start, pagination.end);

  const stats = useMemo(() => ({
    total: allUsers.length,
    active: allUsers.filter(u => u.status === 'active').length,
    inactive: allUsers.filter(u => u.status === 'inactive').length,
    byRole: ALL_ROLES.map(r => ({ role: r, count: allUsers.filter(u => u.role === r).length })),
  }), []);

  const handleDelete = async (userId: string) => {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;
    const ok = await confirm({
      title: 'Delete User',
      description: `Permanently delete ${u.fullName}? This action cannot be undone.`,
      confirmText: 'Delete User',
      variant: 'danger',
    });
    if (ok) {
      toast.success('User deleted', `${u.fullName} has been removed from the system.`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage system users, roles, and office assignments"
        actions={
          hasPermission('users.create') ? (
            <Link to="/users/new">
              <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
                Add User
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard label="Total Users" value={stats.total} />
        <StatCard label="Active" value={stats.active} accent="emerald" />
        <StatCard label="Inactive" value={stats.inactive} accent="slate" />
        {stats.byRole.slice(0, 2).map(({ role, count }) => (
          <StatCard key={role} label={ROLE_SHORT_LABELS[role]} value={count} accent="brand" />
        ))}
      </div>

      <Card padded={false}>
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, username…"
            className="flex-1"
          />
          <Select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Roles' }, ...ALL_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))]}
            className="!w-56"
          />
          <Select
            value={officeFilter}
            onChange={e => setOfficeFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Offices' }, ...offices.map(o => ({ value: o.id, label: o.name }))]}
            className="!w-64"
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="!w-32"
          />
        </div>

        <Table
          data={paged}
          keyExtractor={u => u.id}
          emptyState={
            <EmptyState
              icon={<Search className="w-7 h-7" />}
              title="No users found"
              description="Try adjusting your search filters."
            />
          }
          columns={[
            {
              key: 'fullName',
              header: 'User',
              cell: u => (
                <div className="flex items-center gap-3">
                  <Avatar name={u.fullName} color={u.avatarColor} size="md" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{u.fullName}</p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      {u.email}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              width: '200px',
              cell: u => (
                <div>
                  <p className="text-sm font-semibold text-slate-900">{ROLE_LABELS[u.role]}</p>
                  <p className="text-xs text-slate-500">{u.position}</p>
                </div>
              ),
            },
            {
              key: 'office',
              header: 'Office',
              width: '180px',
              cell: u => {
                const office = offices.find(o => o.id === u.officeId);
                return <Badge variant="slate">{office?.code} · {office?.name}</Badge>;
              },
            },
            {
              key: 'status',
              header: 'Status',
              width: '120px',
              cell: u => (
                <div className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium',
                  u.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                )}>
                  {u.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {u.status === 'active' ? 'Active' : 'Inactive'}
                </div>
              ),
            },
            {
              key: 'created',
              header: 'Created',
              width: '130px',
              cell: u => <span className="text-xs text-slate-600">{formatDate(u.createdAt)}</span>,
            },
            {
              key: 'actions',
              header: '',
              width: '60px',
              align: 'right',
              cell: u => (
                <Dropdown
                  align="right"
                  trigger={
                    <button className="p-1.5 hover:bg-slate-100 rounded" aria-label="User actions">
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                  }
                  items={[
                    {
                      id: 'edit',
                      label: 'Edit User',
                      icon: <Edit2 className="w-4 h-4" />,
                      onClick: () => toast.info('Edit User', 'Edit page coming soon.'),
                      disabled: !hasPermission('users.edit'),
                    },
                    {
                      id: 'delete',
                      label: 'Delete User',
                      icon: <Trash2 className="w-4 h-4" />,
                      destructive: true,
                      onClick: () => handleDelete(u.id),
                      disabled: !hasPermission('users.delete'),
                    },
                  ]}
                />
              ),
            },
          ]}
        />

        <div className="px-4 py-3 border-t border-slate-200">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={filtered.length}
            start={pagination.start}
            end={pagination.end}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent = 'slate' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn(
        'text-2xl font-semibold mt-1',
        accent === 'emerald' ? 'text-emerald-700' :
        accent === 'brand' ? 'text-brand-700' :
        'text-slate-900'
      )}>
        {value}
      </p>
    </div>
  );
}
