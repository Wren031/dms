import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Paperclip,
  Calendar,
  Building2,
  User as UserIcon,
  Tag as TagIcon,
  Send,
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
  Hash,
  Route as RouteIcon,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, ClassificationBadge, Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getOfficeById } from '@/mocks/offices';
import { getUserById } from '@/mocks/users';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
} from '@/constants';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import {
  useDocument,
  useRoutingSteps,
  useAuditLogs,
  updateDocumentStatus,
  addRoutingStep,
} from '@/lib/store';
import { offices } from '@/mocks/offices';
import { users } from '@/mocks/users';
import type { DocumentStatus } from '@/types';
import { DocumentJourneyView } from '@/features/documents/components/DocumentJourneyView';

const ACTION_STATUS_MAP: Record<string, DocumentStatus> = {
  recommend: 'recommended',
  approve: 'approved',
  reject: 'rejected',
  return: 'returned',
  release: 'released',
  archive: 'archived',
};

const ACTION_AUDIT_MAP: Record<string, 'APPROVE' | 'REJECT' | 'RETURN' | 'RECOMMEND' | 'RELEASE' | 'ARCHIVE'> = {
  recommend: 'RECOMMEND',
  approve: 'APPROVE',
  reject: 'REJECT',
  return: 'RETURN',
  release: 'RELEASE',
  archive: 'ARCHIVE',
};

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const doc = useDocument(id);
  const routing = useRoutingSteps(id);
  const logs = useAuditLogs(id);

  const [tab, setTab] = useState('journey');
  const [actionModal, setActionModal] = useState<'recommend' | 'approve' | 'reject' | 'return' | 'release' | 'archive' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [routeOffice, setRouteOffice] = useState('');
  const [routeUser, setRouteUser] = useState('');
  const [routeInstructions, setRouteInstructions] = useState('');
  const [routeModal, setRouteModal] = useState(false);

  if (!doc || !user) {
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
  const receivingOffice = doc.receivingOfficeId ? getOfficeById(doc.receivingOfficeId) : null;
  const destinationOffice = doc.destinationOfficeId ? getOfficeById(doc.destinationOfficeId) : null;
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
    if (!actionModal || !user) return;
    const newStatus = ACTION_STATUS_MAP[actionModal];
    const auditAction = ACTION_AUDIT_MAP[actionModal];
    updateDocumentStatus({
      documentId: doc.id,
      status: newStatus,
      actorId: user.id,
      action: auditAction,
      remarks: remarks || `Document ${actionModal}d.`,
    });
    toast.success('Action recorded', `Document has been ${actionModal}d.`);
    setActionModal(null);
    setRemarks('');
  };

  const submitRoute = () => {
    if (!routeOffice || !user) {
      toast.error('Target office required', 'Please select an office to route this document to.');
      return;
    }
    addRoutingStep({
      documentId: doc.id,
      fromOfficeId: doc.currentOfficeId,
      fromUserId: user.id,
      toOfficeId: routeOffice,
      toUserId: routeUser || undefined,
      instructions: routeInstructions || 'Forwarded for action',
      remarks: remarks || undefined,
    });
    toast.success('Document routed', `Forwarded to ${getOfficeById(routeOffice)?.code}.`);
    setRouteModal(false);
    setRouteOffice('');
    setRouteUser('');
    setRouteInstructions('');
    setRemarks('');
  };

  const officeUsers = routeOffice ? users.filter(u => u.officeId === routeOffice && u.status === 'active') : [];

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
            {doc.documentNumber && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                <Hash className="w-3 h-3" />
                {doc.documentNumber}
              </span>
            )}
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
          {hasPermission('documents.route') && doc.status !== 'archived' && doc.status !== 'released' && (
            <Button variant="outline" leftIcon={<Send className="w-4 h-4" />} onClick={() => setRouteModal(true)}>
              Route
            </Button>
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
          {doc.documentNumber && (
            <DetailRow icon={<Hash className="w-4 h-4" />} label="Document Number" value={doc.documentNumber} />
          )}
          <DetailRow icon={<Building2 className="w-4 h-4" />} label="Originating Office" value={originator?.name} sub={originator?.code} />
          {receivingOffice && (
            <DetailRow icon={<Building2 className="w-4 h-4" />} label="Receiving Office" value={receivingOffice.name} sub={receivingOffice.code} />
          )}
          {destinationOffice && (
            <DetailRow icon={<Building2 className="w-4 h-4" />} label="Destination Office" value={destinationOffice.name} sub={destinationOffice.code} />
          )}
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
            {doc.attachments.length === 0 ? (
              <p className="text-sm text-slate-500 py-3 text-center">No attachments uploaded.</p>
            ) : (
              doc.attachments.map(att => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {att.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(att.size / 1024).toFixed(1)} KB · {att.type.split('/').pop()?.toUpperCase() ?? 'FILE'}
                      </p>
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
              ))
            )}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'journey', label: 'Document Journey', icon: <RouteIcon className="w-4 h-4" /> },
              { id: 'routing', label: 'Routing History', icon: <Send className="w-4 h-4" />, count: routing.length },
              { id: 'audit', label: 'Audit History', icon: <HistoryIcon className="w-4 h-4" />, count: logs.length },
            ]}
          />
        </div>

        <div className="p-5">
          {tab === 'journey' && (
            <DocumentJourneyView
              document={doc}
              routingSteps={routing}
              auditLogs={logs}
            />
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
          <p className="text-xs text-slate-500">
            {doc.title} · {DOCUMENT_CLASSIFICATION_LABELS[doc.classification]}
          </p>
          {actionModal === 'return' && (
            <Select
              label="Return to"
              options={offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
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

      <Modal
        open={routeModal}
        onClose={() => setRouteModal(false)}
        title="Route Document"
        description="Forward this document to another office for action"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRouteModal(false)}>Cancel</Button>
            <Button leftIcon={<Send className="w-4 h-4" />} onClick={submitRoute}>
              Route Document
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Document</p>
            <p className="text-sm font-semibold text-slate-900">{doc.trackingNumber} · {doc.title}</p>
            <p className="text-xs text-slate-500 mt-1">
              From: {office?.name} ({office?.code})
            </p>
          </div>
          <Select
            label="Target Office"
            required
            placeholder="Choose target office…"
            value={routeOffice}
            onChange={e => { setRouteOffice(e.target.value); setRouteUser(''); }}
            options={offices.filter(o => o.id !== doc.currentOfficeId).map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
          />
          <Select
            label="Assign To (Optional)"
            placeholder={routeOffice ? 'Choose officer…' : 'Select office first'}
            value={routeUser}
            onChange={e => setRouteUser(e.target.value)}
            options={officeUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.position})` }))}
            disabled={!routeOffice}
          />
          <Textarea
            label="Routing Instructions"
            rows={3}
            value={routeInstructions}
            onChange={e => setRouteInstructions(e.target.value)}
            placeholder="Provide instructions for the receiving office…"
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
