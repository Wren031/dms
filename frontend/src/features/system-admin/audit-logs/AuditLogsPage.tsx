import { useMemo, useState } from 'react';
import {
  History,
  Search,
  Download,
  Calendar,
  User as UserIcon,
  Globe,
  Monitor,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePagination } from '@/hooks/usePagination';
import { auditLogs } from '@/mocks/auditLogs';
import { getUserById } from '@/mocks/users';
import { formatDate, cn } from '@/lib/utils';

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  const actions = useMemo(() => Array.from(new Set(auditLogs.map(l => l.action))), []);
  const modules = useMemo(() => Array.from(new Set(auditLogs.map(l => l.module))), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return auditLogs.filter(l => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (moduleFilter !== 'all' && l.module !== moduleFilter) return false;
      if (q && !`${l.actorName} ${l.description} ${l.ipAddress}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [search, actionFilter, moduleFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 15 });
  const paged = filtered.slice(pagination.start, pagination.end);

  const stats = useMemo(() => ({
    total: auditLogs.length,
    today: auditLogs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length,
    uniqueUsers: new Set(auditLogs.map(l => l.actorId)).size,
    approvals: auditLogs.filter(l => l.action === 'APPROVE').length,
  }), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Complete history of all system actions for accountability and transparency"
        actions={
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Export Logs
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Total Events" value={stats.total} />
        <Stat label="Today's Events" value={stats.today} accent="brand" />
        <Stat label="Unique Actors" value={stats.uniqueUsers} accent="indigo" />
        <Stat label="Approvals" value={stats.approvals} accent="emerald" />
      </div>

      <Card padded={false}>
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by actor, description, IP address…"
            className="flex-1"
          />
          <Select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Actions' }, ...actions.map(a => ({ value: a, label: a }))]}
            className="!w-40"
          />
          <Select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Modules' }, ...modules.map(m => ({ value: m, label: m }))]}
            className="!w-44"
          />
        </div>

        <Table
          data={paged}
          keyExtractor={l => l.id}
          emptyState={
            <EmptyState
              icon={<History className="w-7 h-7" />}
              title="No audit entries"
              description="No actions match your filters."
            />
          }
          columns={[
            {
              key: 'createdAt',
              header: 'Timestamp',
              width: '170px',
              cell: l => (
                <div className="text-xs">
                  <p className="text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(l.createdAt)}
                  </p>
                  <p className="text-slate-400 text-[10px] ml-5">{new Date(l.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ),
            },
            {
              key: 'actor',
              header: 'Actor',
              width: '220px',
              cell: l => {
                const u = getUserById(l.actorId);
                return (
                  <div className="flex items-center gap-2">
                    <Avatar name={l.actorName} color={u?.avatarColor ?? 'bg-slate-600'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{l.actorName}</p>
                      <p className="text-xs text-slate-500 truncate">{u?.position ?? 'System'}</p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'action',
              header: 'Action',
              width: '140px',
              cell: l => (
                <Tag
                  variant={
                    l.action === 'APPROVE' ? 'emerald' :
                    l.action === 'REJECT' ? 'rose' :
                    l.action === 'RETURN' ? 'orange' :
                    l.action === 'REVIEW' || l.action === 'RECOMMEND' ? 'indigo' :
                    l.action === 'RECEIVE' ? 'blue' :
                    l.action === 'LOGIN' ? 'teal' :
                    l.action === 'CREATE' ? 'brand' :
                    'slate'
                  }
                >
                  {l.action}
                </Tag>
              ),
            },
            {
              key: 'module',
              header: 'Module',
              width: '140px',
              cell: l => <Badge variant="slate">{l.module}</Badge>,
            },
            {
              key: 'description',
              header: 'Description',
              cell: l => <p className="text-sm text-slate-700">{l.description}</p>,
            },
            {
              key: 'ip',
              header: 'IP Address',
              width: '140px',
              cell: l => (
                <div className="text-xs">
                  <p className="text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    {l.ipAddress}
                  </p>
                </div>
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

      <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-start gap-2.5">
          <Monitor className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Audit Retention Policy</p>
            <p className="text-xs text-amber-800 mt-0.5">
              All system actions are logged and retained for a minimum of 3 years in compliance with
              government record-keeping requirements. Logs cannot be modified or deleted by any user,
              including administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = 'slate' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn(
        'text-2xl font-semibold mt-1',
        accent === 'brand' ? 'text-brand-700' :
        accent === 'indigo' ? 'text-indigo-700' :
        accent === 'emerald' ? 'text-emerald-700' :
        'text-slate-900'
      )}>
        {value}
      </p>
    </div>
  );
}
