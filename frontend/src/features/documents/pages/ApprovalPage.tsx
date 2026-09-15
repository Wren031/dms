import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useDocumentTransition } from '@/features/documents/hooks/useDocumentTransition';
import { useCurrentUser, useAuth } from '@/features/authentication/hooks/useAuth';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import { DOCUMENT_TYPE_LABELS } from '@/constants';
import { formatDate, formatRelative } from '@/lib/utils';
import type { DocumentStatus } from '@/types';

type ApprovalAction = 'approve' | 'reject';

export function ApprovalPage() {
  const toast = useToast();
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const { items: documents } = useDocuments({ fetchAll: true });

  const scopedDocuments = useMemo(
    () =>
      user.role === 'system_admin'
        ? documents
        : documents.filter(d =>
            d.currentHolderId === user.id ||
            d.receivedById === user.id ||
            d.currentOfficeId === user.officeId
          ),
    [documents, user.id, user.officeId, user.role],
  );
  const officeById = useOfficeLookup();
  const userById = useUserLookup();
  const transition = useDocumentTransition();
  const [tab, setTab] = useState('pending');
  const [actionModal, setActionModal] = useState<{
    docId: string;
    action: ApprovalAction;
  } | null>(null);
  const [remarks, setRemarks] = useState('');

  const pending = useMemo(
    () => scopedDocuments.filter(d => d.status === 'received'),
    [scopedDocuments],
  );
  const approved = useMemo(
    () => scopedDocuments.filter(d => d.status === 'approved'),
    [scopedDocuments],
  );
  const rejected = useMemo(
    () => scopedDocuments.filter(d => d.status === 'rejected'),
    [scopedDocuments],
  );
  const completed = useMemo(() => [...approved, ...rejected], [approved, rejected]);

  const counts = {
    pending: pending.length,
    completed: completed.length,
  };

  const list = tab === 'pending' ? pending : completed;

  const pagination = usePagination({ totalItems: list.length, initialPageSize: 10 });
  const paged = list.slice(pagination.start, pagination.end);

  const handleAction = (docId: string, action: ApprovalAction) => {
    setActionModal({ docId, action });
    setRemarks('');
  };

  const submitAction = async () => {
    if (!actionModal) return;
    const doc = documents.find(d => d.id === actionModal.docId);
    if (actionModal.action === 'reject' && !remarks.trim()) {
      toast.error('Remarks required', 'Please provide a reason for rejection.');
      return;
    }
    const nextStatus = actionModal.action === 'approve' ? 'approved' : 'rejected';
    const updated = await transition.transition(actionModal.docId, {
      toStatus: nextStatus,
      remarks: remarks.trim() || (doc ? `${nextStatus} recorded` : undefined),
    });
    setActionModal(null);
    if (updated) {
      toast.success(
        actionModal.action === 'approve' ? 'Document approved' : 'Document rejected',
        'Your action has been recorded.',
      );
    } else if (transition.error) {
      toast.error('Action failed', transition.error);
    }
    setRemarks('');
  };

  const stats = {
    pending: pending.length,
    urgent: pending.filter(d => d.priority === 'urgent' || d.priority === 'high').length,
    approved: approved.length,
    rejected: rejected.length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval"
        description="Approve or reject documents that have been received and are ready for decision"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="For Approval" value={stats.pending} icon={<ClipboardCheck className="w-4 h-4" />} accent="indigo" />
        <StatCard label="Urgent / High Priority" value={stats.urgent} icon={<FileText className="w-4 h-4" />} accent="amber" />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="w-4 h-4" />} accent="emerald" />
        <StatCard label="Rejected" value={stats.rejected} icon={<XCircle className="w-4 h-4" />} accent="rose" />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'pending', label: 'For Approval', count: counts.pending },
              { id: 'completed', label: 'Completed', count: counts.completed },
            ]}
          />
        </div>

        <Table
          data={paged}
          keyExtractor={d => d.id}
          emptyState={
            <EmptyState
              icon={<ClipboardCheck className="w-7 h-7" />}
              title="No documents to approve"
              description="Received documents awaiting approval in your office will appear here."
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
              key: 'office',
              header: 'From',
              width: '170px',
              cell: d => {
                const office = d.originatingOfficeId ? officeById(d.originatingOfficeId) : null;
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-slate-700">{office?.code ?? 'Manual'}</p>
                      <p className="text-slate-400 text-[10px]">{office?.name ?? d.originatingOfficeName ?? '—'}</p>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'holder',
              header: 'Submitted By',
              width: '170px',
              cell: d => {
                const u = d.currentHolderId ? userById(d.currentHolderId) : null;
                if (!u) return <span className="text-xs text-slate-400">—</span>;
                return (
                  <div className="flex items-center gap-1.5">
                    <Avatar name={u.fullName} color={u.avatarColor} size="sm" />
                    <span className="text-xs text-slate-700 truncate">{u.fullName}</span>
                  </div>
                );
              },
            },
            {
              key: 'submitted',
              header: 'Received',
              width: '130px',
              cell: d => (
                <div className="text-xs">
                  <p className="text-slate-700">{formatDate(d.dateReceived ?? d.updatedAt)}</p>
                  <p className="text-slate-400 text-[10px]">{formatRelative(d.dateReceived ?? d.updatedAt)}</p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '130px',
              cell: d => <StatusBadge status={d.status} />,
            },
            {
              key: 'actions',
              header: 'Action',
              width: '240px',
              align: 'right',
              cell: d => (
                <div className="flex items-center justify-end gap-1">
                  {d.status === 'received' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(d.id, 'reject')}
                        leftIcon={<XCircle className="w-3 h-3" />}
                        disabled={!hasPermission('documents.reject')}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(d.id, 'approve')}
                        leftIcon={<CheckCircle2 className="w-3 h-3" />}
                        disabled={!hasPermission('documents.approve')}
                      >
                        Approve
                      </Button>
                    </>
                  )}
                  {(d.status === 'approved' || d.status === 'rejected') && (
                    <Link to={`/documents/${d.id}`}>
                      <Button size="sm" variant="ghost" leftIcon={<Eye className="w-3 h-3" />}>View</Button>
                    </Link>
                  )}
                </div>
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
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        size="md"
        title={actionModal?.action === 'approve' ? 'Approve Document' : 'Reject Document'}
        description={
          actionModal?.action === 'approve'
            ? 'Approving will mark this document as approved and ready for release.'
            : 'Rejecting will close this document out of the active workflow.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal?.action === 'reject' ? 'danger' : 'primary'}
              onClick={submitAction}
            >
              {actionModal?.action === 'approve' ? 'Approve Document' : 'Reject Document'}
            </Button>
          </>
        }
      >
        {actionModal && (() => {
          const doc = documents.find(d => d.id === actionModal.docId);
          if (!doc) return null;
          return (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Document</p>
                <p className="text-sm font-semibold text-slate-900">{doc.trackingNumber}</p>
                <p className="text-sm text-slate-700">{doc.title}</p>
              </div>
              <Textarea
                label={actionModal.action === 'approve' ? 'Approval notes' : 'Reason for rejection'}
                required={actionModal.action === 'reject'}
                rows={5}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={
                  actionModal.action === 'approve'
                    ? 'Optional approval notes…'
                    : 'Reason for rejection (required)…'
                }
              />
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${
          accent === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
          accent === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          accent === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}