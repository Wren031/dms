import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Send,
  Eye,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useDocuments } from '@/lib/store';
import { getOfficeById } from '@/mocks/offices';
import { getUserById } from '@/mocks/users';
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from '@/constants';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import type { Document } from '@/types';

export function InboxPage() {
  const user = useCurrentUser();
  const documents = useDocuments();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const myInbox = useMemo(() => {
    return documents.filter(d =>
      d.currentHolderId === user.id ||
      d.receivedById === user.id ||
      d.currentOfficeId === user.officeId
    );
  }, [user.id, user.officeId]);

  const counts = useMemo(() => {
    return {
      pending: myInbox.filter(d => ['received', 'in_routing'].includes(d.status)).length,
      reviewing: myInbox.filter(d => ['under_review', 'recommended'].includes(d.status)).length,
      completed: myInbox.filter(d => ['approved', 'released', 'archived'].includes(d.status)).length,
      all: myInbox.length,
    };
  }, [myInbox]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return myInbox.filter(d => {
      if (tab === 'pending' && !['received', 'in_routing'].includes(d.status)) return false;
      if (tab === 'reviewing' && !['under_review', 'recommended'].includes(d.status)) return false;
      if (tab === 'completed' && !['approved', 'released', 'archived'].includes(d.status)) return false;
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
      if (q) {
        const haystack = `${d.trackingNumber} ${d.title} ${d.senderName ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [myInbox, tab, search, priorityFilter]);

  const pagination = usePagination({ totalItems: filtered.length, initialPageSize: 10 });
  const paged = useMemo(
    () => filtered.slice(pagination.start, pagination.end),
    [filtered, pagination.start, pagination.end]
  );

  const overdueCount = useMemo(() => {
    return myInbox.filter(d =>
      d.dueDate && new Date(d.dueDate).getTime() < new Date().getTime() &&
      !['released', 'archived', 'rejected', 'approved'].includes(d.status)
    ).length;
  }, [myInbox]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Documents received or currently held by your office"
        actions={
          <Link to="/documents">
            <Button variant="outline">All Documents</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SmallStat icon={<Clock className="w-4 h-4" />} label="Pending" value={counts.pending} accent="amber" />
        <SmallStat icon={<Eye className="w-4 h-4" />} label="Under Review" value={counts.reviewing} accent="indigo" />
        <SmallStat icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={counts.completed} accent="emerald" />
        <SmallStat icon={<AlertCircle className="w-4 h-4" />} label="Overdue" value={overdueCount} accent="rose" />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'pending', label: 'Pending', count: counts.pending },
              { id: 'reviewing', label: 'Under Review', count: counts.reviewing },
              { id: 'completed', label: 'Completed', count: counts.completed },
              { id: 'all', label: 'All', count: counts.all },
            ]}
          />
        </div>

        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search inbox…"
            className="flex-1"
          />
          <Select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); pagination.reset(); }}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
              { value: 'low', label: 'Low' },
            ]}
            className="!w-44"
          />
        </div>

        <Table
          data={paged}
          keyExtractor={d => d.id}
          emptyState={
            <EmptyState
              icon={<Inbox className="w-7 h-7" />}
              title="Your inbox is empty"
              description="No documents match the current filter."
            />
          }
          columns={[
            {
              key: 'trackingNumber',
              header: 'Tracking #',
              width: '150px',
              cell: d => (
                <Link to={`/documents/${d.id}`} className="font-mono font-semibold text-brand-700 hover:underline">
                  {d.trackingNumber}
                </Link>
              ),
            },
            {
              key: 'title',
              header: 'Document',
              cell: d => (
                <div>
                  <Link to={`/documents/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                    {d.title}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="slate" size="sm">{DOCUMENT_TYPE_LABELS[d.type]}</Badge>
                    <PriorityBadge priority={d.priority} />
                  </div>
                </div>
              ),
            },
            {
              key: 'from',
              header: 'From',
              width: '180px',
              cell: d => {
                const fromOffice = getOfficeById(d.originatingOfficeId);
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-slate-700">{d.source === 'external' ? d.senderName : fromOffice?.name}</p>
                      <p className="text-slate-400 text-[10px]">{d.source === 'external' ? 'External' : fromOffice?.code}</p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'received',
              header: 'Received',
              width: '130px',
              cell: d => (
                <div className="text-xs">
                  <p className="text-slate-700">{d.dateReceived ? formatDate(d.dateReceived) : '—'}</p>
                  <p className="text-slate-400 text-[10px]">{formatRelative(d.dateReceived ?? d.createdAt)}</p>
                </div>
              ),
            },
            {
              key: 'due',
              header: 'Due',
              width: '130px',
              cell: d => {
                if (!d.dueDate) return <span className="text-xs text-slate-400">—</span>;
                const overdue = new Date(d.dueDate).getTime() < new Date().getTime() && !['released', 'archived', 'approved'].includes(d.status);
                return (
                  <div className="text-xs">
                    <p className={cn('font-medium', overdue ? 'text-rose-700' : 'text-slate-700')}>
                      {formatDate(d.dueDate)}
                    </p>
                    <p className={cn('text-[10px]', overdue ? 'text-rose-500' : 'text-slate-400')}>
                      {overdue ? 'Overdue' : formatRelative(d.dueDate)}
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              width: '150px',
              cell: d => <StatusBadge status={d.status} />,
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

function SmallStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
      <div className={cn(
        'w-9 h-9 rounded-md border flex items-center justify-center',
        accent === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
        accent === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
        accent === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        'bg-rose-50 text-rose-700 border-rose-200'
      )}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
