import { useMemo, useState } from 'react';
import {
  PlusCircle,
  Building2,
  Users as UsersIcon,
  Edit2,
  Trash2,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { offices as allOffices, getOfficeById } from '@/mocks/offices';
import { users } from '@/mocks/users';
import { documents } from '@/mocks/documents';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, cn } from '@/lib/utils';

export function OfficesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOffice, setViewOffice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    type: 'division' as 'main' | 'division' | 'unit',
    parentId: '',
    head: '',
    description: '',
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allOffices.filter(o => {
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (q && !`${o.name} ${o.code} ${o.head}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, typeFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 12 });
  const paged = filtered.slice(pagination.start, pagination.end);

  const stats = useMemo(() => {
    return {
      total: allOffices.length,
      main: allOffices.filter(o => o.type === 'main').length,
      division: allOffices.filter(o => o.type === 'division').length,
      unit: allOffices.filter(o => o.type === 'unit').length,
    };
  }, []);

  const handleCreate = () => {
    setCreateOpen(true);
    setForm({ name: '', code: '', type: 'division', parentId: '', head: '', description: '' });
  };

  const submitCreate = () => {
    if (!form.name || !form.code) {
      toast.error('Missing fields', 'Office name and code are required.');
      return;
    }
    toast.success('Office created', `${form.code} — ${form.name} has been added.`);
    setCreateOpen(false);
  };

  const handleDelete = async (officeId: string) => {
    const o = getOfficeById(officeId);
    if (!o) return;
    const ok = await confirm({
      title: 'Delete Office',
      description: `Permanently delete ${o.name}? This will affect user and document assignments.`,
      confirmText: 'Delete Office',
      variant: 'danger',
    });
    if (ok) {
      toast.success('Office deleted', `${o.name} has been removed.`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offices"
        description="Manage the organizational structure and office hierarchy"
        actions={
          hasPermission('offices.create') ? (
            <Button leftIcon={<PlusCircle className="w-4 h-4" />} onClick={handleCreate}>
              Add Office
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Offices" value={stats.total} icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Main Offices" value={stats.main} accent="brand" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Divisions" value={stats.division} accent="indigo" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Units" value={stats.unit} accent="emerald" icon={<Building2 className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2" padded={false}>
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, code, head…"
              className="flex-1"
            />
            <Select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'main', label: 'Main' },
                { value: 'division', label: 'Division' },
                { value: 'unit', label: 'Unit' },
              ]}
              className="!w-40"
            />
          </div>

          <Table
            data={paged}
            keyExtractor={o => o.id}
            emptyState={
              <EmptyState
                icon={<Building2 className="w-7 h-7" />}
                title="No offices found"
              />
            }
            columns={[
              {
                key: 'name',
                header: 'Office',
                cell: o => {
                  const parent = o.parentId ? getOfficeById(o.parentId) : null;
                  return (
                    <div>
                      <button onClick={() => setViewOffice(o.id)} className="font-semibold text-slate-900 hover:text-brand-700 text-left">
                        {o.name}
                      </button>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="slate" size="sm" className="!font-mono">{o.code}</Badge>
                        <Badge variant={o.type === 'main' ? 'brand' : o.type === 'division' ? 'indigo' : 'emerald'}>
                          {o.type}
                        </Badge>
                      </div>
                      {parent && (
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          Under <span className="font-medium">{parent.code}</span>
                          <ChevronRight className="w-3 h-3" />
                          {parent.name}
                        </p>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'head',
                header: 'Head',
                width: '200px',
                cell: o => <span className="text-sm text-slate-700">{o.head}</span>,
              },
              {
                key: 'users',
                header: 'Users',
                width: '90px',
                cell: o => (
                  <div className="flex items-center gap-1 text-xs text-slate-700">
                    <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                    {users.filter(u => u.officeId === o.id).length}
                  </div>
                ),
              },
              {
                key: 'docs',
                header: 'Documents',
                width: '100px',
                cell: o => (
                  <div className="flex items-center gap-1 text-xs text-slate-700">
                    {documents.filter(d => d.originatingOfficeId === o.id || d.currentOfficeId === o.id).length}
                  </div>
                ),
              },
              {
                key: 'created',
                header: 'Created',
                width: '130px',
                cell: o => <span className="text-xs text-slate-600">{formatDate(o.createdAt)}</span>,
              },
              {
                key: 'actions',
                header: '',
                width: '60px',
                align: 'right',
                cell: o => (
                  <Dropdown
                    align="right"
                    trigger={
                      <button className="p-1.5 hover:bg-slate-100 rounded" aria-label="Office actions">
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                    }
                    items={[
                      {
                        id: 'view',
                        label: 'View Details',
                        onClick: () => setViewOffice(o.id),
                      },
                      {
                        id: 'edit',
                        label: 'Edit Office',
                        icon: <Edit2 className="w-4 h-4" />,
                        onClick: () => toast.info('Edit modal would open'),
                        disabled: !hasPermission('offices.edit'),
                      },
                      {
                        id: 'delete',
                        label: 'Delete Office',
                        icon: <Trash2 className="w-4 h-4" />,
                        destructive: true,
                        onClick: () => handleDelete(o.id),
                        disabled: !hasPermission('offices.delete'),
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

        <Card>
          <CardHeader title="Organizational Hierarchy" description="Office structure overview" />
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
            {allOffices.filter(o => !o.parentId).map(parent => (
              <OfficeTreeNode key={parent.id} officeId={parent.id} depth={0} />
            ))}
          </div>
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add New Office"
        description="Create a new office in the organizational structure"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate}>Create Office</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Office Name"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., City Budget Office"
            />
            <Input
              label="Office Code"
              required
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g., CBO"
              hint="3-5 letter acronym"
            />
            <Select
              label="Office Type"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as 'main' | 'division' | 'unit' })}
              options={[
                { value: 'main', label: 'Main Office' },
                { value: 'division', label: 'Division' },
                { value: 'unit', label: 'Unit' },
              ]}
            />
            <Select
              label="Parent Office"
              placeholder="None (top-level)"
              value={form.parentId}
              onChange={e => setForm({ ...form, parentId: e.target.value })}
              options={allOffices.filter(o => o.type !== 'unit').map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
            />
            <Input
              label="Office Head"
              value={form.head}
              onChange={e => setForm({ ...form, head: e.target.value })}
              placeholder="Full name of office head"
            />
          </div>
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the office's responsibilities…"
          />
        </div>
      </Modal>

      <Drawer
        open={!!viewOffice}
        onClose={() => setViewOffice(null)}
        title={viewOffice ? getOfficeById(viewOffice)?.name : ''}
        description={viewOffice ? `${getOfficeById(viewOffice)?.code} · ${getOfficeById(viewOffice)?.type}` : ''}
        size="lg"
      >
        {viewOffice && <OfficeDetails officeId={viewOffice} />}
      </Drawer>
    </div>
  );
}

function StatCard({ label, value, icon, accent = 'slate' }: { label: string; value: number; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
      <div className={cn(
        'w-9 h-9 rounded-md border flex items-center justify-center',
        accent === 'brand' ? 'bg-brand-50 text-brand-700 border-brand-200' :
        accent === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
        accent === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        'bg-slate-50 text-slate-700 border-slate-200'
      )}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function OfficeTreeNode({ officeId, depth }: { officeId: string; depth: number }) {
  const office = getOfficeById(officeId);
  const children = allOffices.filter(o => o.parentId === officeId);
  if (!office) return null;
  return (
    <div>
      <div
        className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-mono text-[11px] text-slate-500 shrink-0">{office.code}</span>
        <span className="text-sm font-medium text-slate-900 truncate">{office.name}</span>
        <Badge variant={office.type === 'main' ? 'brand' : office.type === 'division' ? 'indigo' : 'emerald'} className="ml-auto">
          {office.type}
        </Badge>
      </div>
      {children.map(child => (
        <OfficeTreeNode key={child.id} officeId={child.id} depth={depth + 1} />
      ))}
    </div>
  );
}

function OfficeDetails({ officeId }: { officeId: string }) {
  const office = getOfficeById(officeId);
  if (!office) return null;
  const officeUsers = users.filter(u => u.officeId === officeId);
  const officeDocs = documents.filter(d => d.originatingOfficeId === officeId || d.currentOfficeId === officeId);
  const children = allOffices.filter(o => o.parentId === officeId);
  const parent = office.parentId ? getOfficeById(office.parentId) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">{office.description}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Users" value={officeUsers.length} />
        <Stat label="Documents" value={officeDocs.length} />
        <Stat label="Sub-offices" value={children.length} />
        <Stat label="Created" value={formatDate(office.createdAt)} />
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Office Head</h4>
        <p className="text-sm font-medium text-slate-900">{office.head}</p>
      </div>

      {parent && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Reports To</h4>
          <Badge variant="slate">{parent.code} · {parent.name}</Badge>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Assigned Users ({officeUsers.length})</h4>
        <div className="space-y-1.5">
          {officeUsers.map(u => (
            <div key={u.id} className="flex items-center gap-2 p-2 rounded-md border border-slate-200">
              <Avatar name={u.fullName} color={u.avatarColor} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                <p className="text-xs text-slate-500 truncate">{u.position}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-md border border-slate-200 bg-slate-50">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
