import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Paperclip,
  Calendar,
  Building2,
  User as UserIcon,
  Tag as TagIcon,
  Send,
  ClipboardCheck,
  PackageOpen,
  Archive as ArchiveIcon,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ThumbsUp,
  AlertCircle,
  FileText,
  History as HistoryIcon,
  Activity as ActivityIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, ClassificationBadge, Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { documents } from '@/mocks/documents';
import { getRoutingStepsByDocument } from '@/mocks/routes';
import { getOfficeById } from '@/mocks/offices';
import { getUserById } from '@/mocks/users';
import { auditLogs } from '@/mocks/auditLogs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/constants';
import { formatDate, formatRelative, cn } from '@/lib/utils';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const doc = useMemo(() => documents.find(d => d.id === id), [id]);
  const routing = useMemo(() => (id ? getRoutingStepsByDocument(id) : []), [id]);
  const logs = useMemo(() => auditLogs.filter(l => l.targetId === id), [id]);

  const [tab, setTab] = useState('overview');
  const [actionModal, setActionModal] = useState<'recommend' | 'approve' | 'reject' | 'return' | 'release' | 'archive' | null>(null);
  const [remarks, setRemarks] = useState('');

  if (!doc) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-700 font-medium">Document not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const office = getOfficeById(doc.currentOfficeId);
  const holder = doc.currentHolderId ? getUserById(doc.currentHolderId) : null;
  const originator = getOfficeById(doc.originatingOfficeId);
  const encoder = getUserById(doc.encodedById);
  const receiver = doc.receivedById ? getUserById(doc.receivedById) : null;

  const isOverdue = doc.dueDate && new Date(doc.dueDate).getTime() < new Date().getTime() &&
    !['released', 'archived', 'rejected'].includes(doc.status);

  const handleAction = async (action: typeof actionModal) => {
    if (!action) return;
    if (action === 'reject' || action === 'archive') {
      const ok = await confirm({
        title: action === 'reject' ? 'Reject Document' : 'Archive Document',
        description: action === 'reject'
          ? 'Are you sure you want to reject this document? This action cannot be undone.'
          : 'This document will be archived and moved out of active workflow.',
        confirmText: action === 'reject' ? 'Reject' : 'Archive',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setActionModal(action);
  };

  const submitAction = () => {
    if (!actionModal) return;
    toast.success('Action recorded', `Document has been ${actionModal}d.`);
    setActionModal(null);
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/documents" className="inline-flex items-center text-xs text-slate-600 hover:text-brand-700 mb-2">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Documents
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-brand-700">{doc.trackingNumber}</span>
            <StatusBadge status={doc.status} size="md" />
            <PriorityBadge priority={doc.priority} />
            <ClassificationBadge classification={doc.classification} />
            {isOverdue && (
              <Tag variant="rose" icon={<AlertCircle className="w-3 h-3" />}>Overdue</Tag>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{doc.title}</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl">{doc.description}</p>
          {doc.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <TagIcon className="w-3.5 h-3.5 text-slate-400" />
              {doc.tags.map(t => (
                <Badge key={t} variant="slate" size="sm">#{t}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {hasPermission('documents.review') && (doc.status === 'under_review' || doc.status === 'recommended') && (
            <>
              <Button variant="outline" leftIcon={<ThumbsUp className="w-4 h-4" />} onClick={() => handleAction('recommend')}>
                Recommend
              </Button>
              <Button leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => handleAction('approve')}>
                Approve
              </Button>
              <Button variant="outline" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={() => handleAction('return')}>
                Return
              </Button>
              <Button variant="danger" leftIcon={<XCircle className="w-4 h-4" />} onClick={() => handleAction('reject')}>
                Reject
              </Button>
            </>
          )}
          {hasPermission('documents.release') && doc.status === 'approved' && (
            <Button leftIcon={<PackageOpen className="w-4 h-4" />} onClick={() => handleAction('release')}>
              Release
            </Button>
          )}
          {hasPermission('documents.archive') && doc.status === 'released' && (
            <Button variant="outline" leftIcon={<ArchiveIcon className="w-4 h-4" />} onClick={() => handleAction('archive')}>
              Archive
            </Button>
          )}
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader title="Document Information" />
          <DetailRow icon={<FileText className="w-4 h-4" />} label="Type" value={DOCUMENT_TYPE_LABELS[doc.type]} />
          <DetailRow icon={<Building2 className="w-4 h-4" />} label="Originating Office" value={originator?.name} sub={originator?.code} />
          <DetailRow icon={<Building2 className="w-4 h-4" />} label="Current Office" value={office?.name} sub={office?.code} />
          <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Current Holder" value={holder?.fullName} sub={holder ? DOC_POSITION(holder.role) : undefined} />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date Received" value={doc.dateReceived ? formatDate(doc.dateReceived) : 'Not yet received'} />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Due Date" value={doc.dueDate ? formatDate(doc.dueDate) : 'No deadline'} />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Created" value={formatDate(doc.createdAt, true)} />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Last Updated" value={formatRelative(doc.updatedAt)} />
        </Card>

        <Card>
          <CardHeader title="People" />
          <PersonRow
            label="Encoded by"
            userId={doc.encodedById}
            fallback={encoder?.fullName}
          />
          <PersonRow
            label="Received by"
            userId={doc.receivedById}
            fallback={receiver?.fullName ?? 'Not yet received'}
          />
          <PersonRow
            label="Current holder"
            userId={doc.currentHolderId}
            fallback={holder?.fullName}
          />
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Source</p>
            <p className="text-sm font-medium text-slate-900">
              {doc.source === 'internal' ? 'Internal Document' : 'External Document'}
            </p>
            {doc.senderName && (
              <p className="text-xs text-slate-600 mt-0.5">From: {doc.senderName}</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Attachments" />
          <div className="space-y-2">
            {Array.from({ length: doc.attachmentCount }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      Attachment {i + 1}.pdf
                    </p>
                    <p className="text-xs text-slate-500">PDF · {((Math.random() * 4) + 0.5).toFixed(1)} MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-slate-500 hover:text-slate-900 rounded">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-slate-500 hover:text-slate-900 rounded">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
              { id: 'routing', label: 'Routing History', icon: <Send className="w-4 h-4" />, count: routing.length },
              { id: 'audit', label: 'Audit History', icon: <HistoryIcon className="w-4 h-4" />, count: logs.length },
              { id: 'tracking', label: 'Live Tracking', icon: <ActivityIcon className="w-4 h-4" /> },
            ]}
          />
        </div>

        <div className="p-5">
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Workflow Status</h3>
                <WorkflowTimeline currentStatus={doc.status} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <QuickActionItem
                    icon={<Send className="w-4 h-4" />}
                    label="Route to another office"
                    hint="Forward this document to another office for action"
                    onClick={() => toast.info('Routing modal will open')}
                  />
                  <QuickActionItem
                    icon={<ClipboardCheck className="w-4 h-4" />}
                    label="Add review notes"
                    hint="Attach remarks or recommendation"
                    onClick={() => toast.info('Review modal will open')}
                  />
                  <QuickActionItem
                    icon={<PackageOpen className="w-4 h-4" />}
                    label="Mark as released"
                    hint="Document has been delivered to recipient"
                    onClick={() => handleAction('release')}
                    disabled={doc.status !== 'approved'}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'routing' && (
            <div className="space-y-3">
              {routing.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No routing history yet.</p>
              ) : (
                routing.map((step, idx) => {
                  const fromOffice = getOfficeById(step.fromOfficeId);
                  const toOffice = getOfficeById(step.toOfficeId);
                  const toUser = step.toUserId ? getUserById(step.toUserId) : null;
                  const fromUser = step.fromUserId ? getUserById(step.fromUserId) : null;
                  return (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border',
                          step.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          step.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          step.status === 'returned' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        )}>
                          {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                           step.status === 'in_progress' ? idx + 1 :
                           step.status === 'returned' ? <RotateCcw className="w-4 h-4" /> :
                           idx + 1}
                        </div>
                        {idx < routing.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">
                            Step {step.sequence}: {fromOffice?.code} → {toOffice?.code}
                          </p>
                          <Tag variant={
                            step.status === 'completed' ? 'emerald' :
                            step.status === 'in_progress' ? 'amber' :
                            step.status === 'returned' ? 'rose' :
                            'slate'
                          }>
                            {step.status.replace('_', ' ')}
                          </Tag>
                        </div>
                        {toUser && (
                          <p className="text-xs text-slate-600 mt-1">Assigned to: <span className="font-medium">{toUser.fullName}</span></p>
                        )}
                        {fromUser && (
                          <p className="text-xs text-slate-500 mt-0.5">Routed by: {fromUser.fullName}</p>
                        )}
                        <div className="mt-2 p-3 rounded-md bg-slate-50 border border-slate-200">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Instructions</p>
                          <p className="text-sm text-slate-700">{step.instructions}</p>
                        </div>
                        {step.remarks && (
                          <div className="mt-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-1">Remarks</p>
                            <p className="text-sm text-amber-900">{step.remarks}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                          {step.receivedAt && <span>Received: {formatDate(step.receivedAt, true)}</span>}
                          {step.completedAt && <span>· Completed: {formatDate(step.completedAt, true)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No audit entries yet.</p>
              ) : (
                logs.map(log => {
                  const actor = getUserById(log.actorId);
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-md border border-slate-200 hover:bg-slate-50">
                      <Avatar name={log.actorName} color={actor?.avatarColor ?? 'bg-slate-600'} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{log.actorName}</p>
                          <Tag
                            variant={
                              log.action === 'APPROVE' ? 'emerald' :
                              log.action === 'REJECT' ? 'rose' :
                              log.action === 'RETURN' ? 'orange' :
                              log.action === 'REVIEW' || log.action === 'RECOMMEND' ? 'indigo' :
                              log.action === 'RECEIVE' ? 'blue' :
                              'slate'
                            }
                          >
                            {log.action}
                          </Tag>
                          <span className="text-xs text-slate-500">in {log.module}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{log.description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(log.createdAt, true)} · IP: {log.ipAddress}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'tracking' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Real-time view of where this document currently stands in the workflow.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <TrackingItem label="Status" value={DOCUMENT_STATUS_LABELS[doc.status]} />
                <TrackingItem label="Current Office" value={office?.name ?? '—'} />
                <TrackingItem label="Current Holder" value={holder?.fullName ?? 'Unassigned'} />
                <TrackingItem label="Last Activity" value={formatRelative(doc.updatedAt)} />
              </div>
              <WorkflowTimeline currentStatus={doc.status} />
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={
          actionModal === 'recommend' ? 'Recommend for Approval' :
          actionModal === 'approve' ? 'Approve Document' :
          actionModal === 'reject' ? 'Reject Document' :
          actionModal === 'return' ? 'Return for Revision' :
          actionModal === 'release' ? 'Release Document' :
          actionModal === 'archive' ? 'Archive Document' : ''
        }
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal === 'reject' ? 'danger' : 'primary'}
              onClick={submitAction}
            >
              Confirm {actionModal}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Document: <span className="font-semibold text-slate-900">{doc.trackingNumber}</span>
          </p>
          {actionModal === 'return' && (
            <Select
              label="Return to"
              options={[
                { value: 'encoder', label: 'Encoder' },
                { value: 'originator', label: 'Originating Office' },
                { value: 'previous', label: 'Previous Office' },
              ]}
            />
          )}
          <Textarea
            label="Remarks"
            required
            rows={4}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder={`Provide details for this ${actionModal} action…`}
          />
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value?: string | null; sub?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function PersonRow({ label, userId, fallback }: { label: string; userId?: string; fallback?: string }) {
  const u = userId ? getUserById(userId) : null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <Avatar name={fallback ?? '—'} color={u?.avatarColor ?? 'bg-slate-600'} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{fallback ?? '—'}</p>
        {u && <p className="text-xs text-slate-500 truncate">{u.email}</p>}
      </div>
    </div>
  );
}

function QuickActionItem({ icon, label, hint, onClick, disabled }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-md border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <span className="w-8 h-8 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </button>
  );
}

function WorkflowTimeline({ currentStatus }: { currentStatus: string }) {
  const steps = [
    { id: 'registered', label: 'Registered' },
    { id: 'received', label: 'Received' },
    { id: 'in_routing', label: 'In Routing' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'recommended', label: 'Recommended' },
    { id: 'approved', label: 'Approved' },
    { id: 'released', label: 'Released' },
    { id: 'archived', label: 'Archived' },
  ];
  const currentIdx = steps.findIndex(s => s.id === currentStatus);
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step.id} className="flex items-center gap-3">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border',
              isPast ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
              isCurrent ? 'bg-brand-600 text-white border-brand-600' :
              'bg-white text-slate-400 border-slate-300'
            )}>
              {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            <span className={cn(
              'text-sm',
              isCurrent ? 'font-semibold text-slate-900' :
              isPast ? 'text-slate-700' : 'text-slate-400'
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrackingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md border border-slate-200 bg-slate-50">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function DOC_POSITION(role: string) {
  const map: Record<string, string> = {
    system_admin: 'System Administrator',
    office_admin: 'Office Administrator',
    document_encoder: 'Document Encoder',
    receiving_officer: 'Receiving Officer',
    reviewing_officer: 'Reviewing Officer',
  };
  return map[role] ?? role;
}
