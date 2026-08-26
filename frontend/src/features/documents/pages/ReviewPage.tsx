import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  RotateCcw,
  Eye,
  Calendar,
  Building2,
  User as UserIcon,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge, PriorityBadge, Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useDocumentTransition } from '@/features/documents/hooks/useDocumentTransition';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import { DOCUMENT_TYPE_LABELS } from '@/constants';
import { formatDate, formatRelative } from '@/lib/utils';

export function ReviewPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { items: documents } = useDocuments({ pageSize: 100 });
  const officeById = useOfficeLookup();
  const userById = useUserLookup();
  const transition = useDocumentTransition();
  const [tab, setTab] = useState('for_review');
  const [actionModal, setActionModal] = useState<{
    docId: string;
    action: 'recommend' | 'approve' | 'reject' | 'return';
  } | null>(null);
  const [remarks, setRemarks] = useState('');

  const forReview = useMemo(
    () => documents.filter(d => d.status === 'assigned' || d.status === 'under_review'),
    [documents],
  );
  const recommended = useMemo(() => documents.filter(d => d.status === 'recommended'), [documents]);
  const returned = useMemo(() => documents.filter(d => d.status === 'returned'), [documents]);
  const completed = useMemo(() => documents.filter(d => d.status === 'approved' || d.status === 'rejected'), [documents]);

  const counts = {
    for_review: forReview.length,
    recommended: recommended.length,
    returned: returned.length,
    completed: completed.length,
  };

  const list =
    tab === 'for_review' ? forReview :
    tab === 'recommended' ? recommended :
    tab === 'returned' ? returned : completed;

  const pagination = usePagination({ totalItems: list.length, initialPageSize: 10 });
  const paged = list.slice(pagination.start, pagination.end);

  const handleAction = (docId: string, action: 'recommend' | 'approve' | 'reject' | 'return') => {
    setActionModal({ docId, action });
    setRemarks('');
  };

  const startReview = async (docId: string) => {
    const updated = await transition.transition(docId, {
      toStatus: 'under_review',
      remarks: 'Review started',
    });
    if (updated) {
      toast.success('Review started', 'Document is now under review.');
    } else if (transition.error) {
      toast.error('Action failed', transition.error);
    }
  };

  const submitAction = async () => {
    if (!actionModal) return;
    if (actionModal.action === 'reject' && !remarks.trim()) {
      toast.error('Remarks required', 'Please provide a reason for rejection.');
      return;
    }
    const nextStatus =
      actionModal.action === 'recommend' ? 'recommended' :
      actionModal.action === 'approve' ? 'approved' :
      actionModal.action === 'reject' ? 'rejected' :
      'returned';
    const updated = await transition.transition(actionModal.docId, {
      toStatus: nextStatus,
      remarks: remarks.trim() || undefined,
    });
    setActionModal(null);
    if (updated) {
      const labels = { recommend: 'Recommended', approve: 'Approved', reject: 'Rejected', return: 'Returned' };
      toast.success(`Document ${labels[actionModal.action]}`, 'Your action has been recorded.');
    } else if (transition.error) {
      toast.error('Action failed', transition.error);
    }
    setRemarks('');
  };

  const stats = {
    pending: forReview.length + recommended.length,
    urgent: documents.filter(d => ['under_review', 'recommended'].includes(d.status) && (d.priority === 'urgent' || d.priority === 'high')).length,
    completed: completed.length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review & Action"
        description="Review documents and recommend, approve, reject, or return them"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="For Review" value={stats.pending} icon={<ClipboardCheck className="w-4 h-4" />} accent="indigo" />
        <StatCard label="Urgent / High Priority" value={stats.urgent} icon={<FileText className="w-4 h-4" />} accent="amber" />
        <StatCard label="Approved" value={stats.completed} icon={<CheckCircle2 className="w-4 h-4" />} accent="emerald" />
        <StatCard label="Rejected" value={stats.rejected} icon={<XCircle className="w-4 h-4" />} accent="rose" />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'for_review', label: 'For Review', count: counts.for_review },
              { id: 'recommended', label: 'Recommended', count: counts.recommended },
              { id: 'returned', label: 'Returned', count: counts.returned },
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
              title="No documents to review"
              description="Documents awaiting your action will appear here."
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
                const office = officeById(d.originatingOfficeId);
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-slate-700">{office?.code}</p>
                      <p className="text-slate-400 text-[10px]">{office?.name}</p>
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
              header: 'Submitted',
              width: '130px',
              cell: d => (
                <div className="text-xs">
                  <p className="text-slate-700">{formatDate(d.updatedAt)}</p>
                  <p className="text-slate-400 text-[10px]">{formatRelative(d.updatedAt)}</p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '140px',
              cell: d => <StatusBadge status={d.status} />,
            },
            {
              key: 'actions',
              header: 'Action',
              width: '180px',
              align: 'right',
              cell: d => (
                <div className="flex items-center justify-end gap-1">
                  {d.status === 'assigned' && (
                    <Button
                      size="sm"
                      onClick={() => startReview(d.id)}
                      leftIcon={<ClipboardCheck className="w-3 h-3" />}
                    >
                      Start Review
                    </Button>
                  )}
                  {(d.status === 'under_review' || d.status === 'recommended') && (
                    <>
                      {d.status === 'under_review' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(d.id, 'recommend')}
                          leftIcon={<ThumbsUp className="w-3 h-3" />}
                        >
                          Recommend
                        </Button>
                      )}
                      {d.status === 'recommended' && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(d.id, 'approve')}
                          leftIcon={<CheckCircle2 className="w-3 h-3" />}
                        >
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(d.id, 'return')}
                        leftIcon={<RotateCcw className="w-3 h-3" />}
                      >
                        Return
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAction(d.id, 'reject')}
                        leftIcon={<XCircle className="w-3 h-3" />}
                      >
                        Reject
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
        title={
          actionModal?.action === 'recommend' ? 'Recommend for Approval' :
          actionModal?.action === 'approve' ? 'Approve Document' :
          actionModal?.action === 'reject' ? 'Reject Document' :
          'Return for Revision'
        }
        description="Provide remarks to document your decision"
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal?.action === 'reject' ? 'danger' : 'primary'}
              onClick={submitAction}
            >
              {actionModal?.action === 'recommend' ? 'Submit Recommendation' :
               actionModal?.action === 'approve' ? 'Approve Document' :
               actionModal?.action === 'reject' ? 'Reject Document' :
               'Return Document'}
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
              {actionModal.action === 'return' && (
                <Select
                  label="Return To"
                  options={[
                    { value: 'encoder', label: 'Document Encoder' },
                    { value: 'originator', label: 'Originating Office' },
                    { value: 'reviewer', label: 'Previous Reviewer' },
                  ]}
                />
              )}
              <Textarea
                label="Remarks"
                required={actionModal.action === 'reject'}
                rows={5}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={
                  actionModal.action === 'approve' ? 'Optional approval notes…' :
                  actionModal.action === 'recommend' ? 'Recommendation details…' :
                  actionModal.action === 'reject' ? 'Reason for rejection (required)…' :
                  'What needs to be revised?'
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
