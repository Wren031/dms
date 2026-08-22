import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  ArrowRight,
  Building2,
  User as UserIcon,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { useDocuments, useRoutingSteps } from '@/lib/store';
import { offices } from '@/mocks/offices';
import { getOfficeById } from '@/mocks/offices';
import { getUserById, users } from '@/mocks/users';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/constants';
import { formatDate, formatRelative } from '@/lib/utils';

export function RoutingPage() {
  const toast = useToast();
  const documents = useDocuments();
  const routingSteps = useRoutingSteps();
  const [tab, setTab] = useState('pending');
  const [routeModal, setRouteModal] = useState<string | null>(null);
  const [targetOffice, setTargetOffice] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [instructions, setInstructions] = useState('');

  const pendingRoutes = useMemo(() => {
    return routingSteps.filter(r => r.status === 'pending' || r.status === 'in_progress');
  }, [routingSteps]);
  const completedRoutes = useMemo(() => {
    return routingSteps.filter(r => r.status === 'completed' || r.status === 'returned');
  }, [routingSteps]);

  const counts = {
    pending: pendingRoutes.length,
    completed: completedRoutes.length,
  };

  const list = tab === 'pending' ? pendingRoutes : completedRoutes;

  const pagination = usePagination({ totalItems: list.length, initialPageSize: 10 });
  const paged = list.slice(pagination.start, pagination.end);

  const handleRoute = (stepId: string) => {
    setRouteModal(stepId);
    setTargetOffice('');
    setTargetUser('');
    setInstructions('');
  };

  const submitRoute = () => {
    if (!targetOffice) {
      toast.error('Select target office', 'Please choose an office to route this document to.');
      return;
    }
    toast.success('Document routed', `Successfully forwarded to ${getOfficeById(targetOffice)?.code}.`);
    setRouteModal(null);
  };

  const targetUsers = users.filter(u => u.officeId === targetOffice && u.status === 'active');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routing"
        description="Forward documents to appropriate offices for action"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader title="Routing Summary" />
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md border border-amber-200 bg-amber-50">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-semibold text-amber-900 mt-1">{counts.pending}</p>
            </div>
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50">
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-semibold text-emerald-900 mt-1">{counts.completed}</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Quick Reference" description="Common routing paths" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <QuickPath
              from="Records Section"
              to="City Administrator's Office"
              label="Standard routing"
            />
            <QuickPath
              from="Any Office"
              to="City Legal Office"
              label="For legal review"
            />
            <QuickPath
              from="Any Office"
              to="City Accounting Office"
              label="For disbursement"
            />
            <QuickPath
              from="Any Office"
              to="Office of the Mayor"
              label="For executive approval"
            />
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'pending', label: 'Pending Routing', count: counts.pending, icon: <Clock className="w-4 h-4" /> },
              { id: 'completed', label: 'Completed', count: counts.completed, icon: <CheckCircle2 className="w-4 h-4" /> },
            ]}
          />
        </div>

        <Table
          data={paged}
          keyExtractor={r => r.id}
          emptyState={
            <EmptyState
              icon={<Send className="w-7 h-7" />}
              title="No routing tasks"
              description="All documents are properly routed."
            />
          }
          columns={[
            {
              key: 'document',
              header: 'Document',
              cell: r => {
                const doc = documents.find(d => d.id === r.documentId);
                if (!doc) return <span>—</span>;
                return (
                  <div>
                    <Link to={`/documents/${doc.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {doc.title}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-500">{doc.trackingNumber}</span>
                      <Badge variant="slate" size="sm">{DOCUMENT_TYPE_LABELS[doc.type]}</Badge>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'route',
              header: 'Route',
              cell: r => {
                const from = getOfficeById(r.fromOfficeId);
                const to = getOfficeById(r.toOfficeId);
                return (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-700">{from?.code}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-mono text-slate-900 font-semibold">{to?.code}</span>
                  </div>
                );
              },
            },
            {
              key: 'sequence',
              header: 'Step',
              width: '70px',
              cell: r => (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold">
                    {r.sequence}
                  </div>
                </div>
              ),
            },
            {
              key: 'instructions',
              header: 'Instructions',
              cell: r => (
                <p className="text-xs text-slate-600 max-w-xs truncate">{r.instructions}</p>
              ),
            },
            {
              key: 'assignee',
              header: 'Assigned To',
              width: '180px',
              cell: r => {
                const u = r.toUserId ? getUserById(r.toUserId) : null;
                if (!u) return <span className="text-xs text-slate-400">Unassigned</span>;
                return (
                  <div className="flex items-center gap-1.5">
                    <Avatar name={u.fullName} color={u.avatarColor} size="sm" />
                    <span className="text-xs text-slate-700 truncate">{u.fullName}</span>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              width: '130px',
              cell: r => (
                <Tag variant={
                  r.status === 'completed' ? 'emerald' :
                  r.status === 'in_progress' ? 'amber' :
                  r.status === 'returned' ? 'rose' :
                  'slate'
                }>
                  {r.status.replace('_', ' ')}
                </Tag>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '120px',
              align: 'right',
              cell: r => (
                r.status === 'pending' || r.status === 'in_progress' ? (
                  <Button size="sm" variant="outline" onClick={() => handleRoute(r.id)} leftIcon={<Send className="w-3.5 h-3.5" />}>
                    Route
                  </Button>
                ) : (
                  <Link to={`/documents/${r.documentId}`}>
                    <Button size="sm" variant="ghost">View</Button>
                  </Link>
                )
              ),
            },
          ]}
        />

        <div className="px-4 py-3 border-t border-slate-200">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={list.length}
            start={pagination.start}
            end={pagination.end}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </Card>

      <Modal
        open={!!routeModal}
        onClose={() => setRouteModal(null)}
        title="Route Document"
        description="Forward this document to another office for action"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRouteModal(null)}>Cancel</Button>
            <Button leftIcon={<Send className="w-4 h-4" />} onClick={submitRoute}>
              Send Route
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {routeModal && (() => {
            const step = routingSteps.find(r => r.id === routeModal);
            if (!step) return null;
            const doc = documents.find(d => d.id === step.documentId);
            return doc ? (
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Document</p>
                <p className="text-sm font-semibold text-slate-900">{doc.trackingNumber} · {doc.title}</p>
              </div>
            ) : null;
          })()}
          <Select
            label="Target Office"
            required
            placeholder="Choose office…"
            value={targetOffice}
            onChange={e => { setTargetOffice(e.target.value); setTargetUser(''); }}
            options={offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
          />
          <Select
            label="Assign To (Optional)"
            placeholder={targetOffice ? 'Choose officer…' : 'Select office first'}
            value={targetUser}
            onChange={e => setTargetUser(e.target.value)}
            options={targetUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.position})` }))}
            disabled={!targetOffice}
          />
          <Textarea
            label="Instructions"
            rows={4}
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Provide instructions for the receiving office…"
          />
        </div>
      </Modal>
    </div>
  );
}

function QuickPath({ from, to, label }: { from: string; to: string; label: string }) {
  return (
    <div className="p-3 rounded-md border border-slate-200 bg-slate-50">
      <p className="text-xs font-medium text-slate-700 mb-1.5">{label}</p>
      <div className="flex items-center gap-2 text-xs">
        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-600 truncate">{from}</span>
        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="text-slate-900 font-medium truncate">{to}</span>
      </div>
    </div>
  );
}
