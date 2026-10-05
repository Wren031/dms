import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Paperclip,
  Building2,
  Tag as TagIcon,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  PackageOpen,
  Archive as ArchiveIcon,
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  Inbox,
  AlertCircle,
  ArrowRight,
  Calendar,
  Trash2,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, ClassificationBadge, Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
  DOCUMENT_STATUS_LABELS,
  canTransition,
} from '@/constants';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import { attachmentsService } from '@/features/documents/services/documents.service';
import { useDocumentHistory } from '@/features/documents/hooks/useDocumentHistory';
import { useDocumentTransition } from '@/features/documents/hooks/useDocumentTransition';
import { useDocumentReceive } from '@/features/documents/hooks/useDocumentReceive';
import { useDocumentDelete } from '@/features/documents/hooks/useDocumentDelete';
import { useRecipientNote } from '@/features/documents/hooks/useRecipientNote';
import { useDocumentDetail } from '@/features/documents/hooks/useDocumentDetail';
import { DocumentTracker } from '@/features/documents/components/DocumentTracker';
import { RecipientTracking } from '@/features/documents/components/RecipientTracking';
import type { DocumentStatus, Permission } from '@/types';
import type { DocumentDetail, DocumentPerson } from '@/features/documents/types/document';

type ActionType = 'receive' | 'approve' | 'reject' | 'release' | 'archive';

const ACTION_STATUS_MAP: Record<ActionType, DocumentStatus> = {
  receive: 'received',
  approve: 'approved',
  reject: 'rejected',
  release: 'released',
  archive: 'archived',
};

const ACTION_PERMISSION: Record<ActionType, Permission> = {
  receive: 'documents.receive',
  approve: 'documents.approve',
  reject: 'documents.reject',
  release: 'documents.release',
  archive: 'documents.archive',
};

const ACTION_META: Record<
  ActionType,
  { label: string; description: string; icon: React.ReactNode; tone: 'primary' | 'outline' | 'danger' }
> = {
  receive: {
    label: 'Receive',
    description: 'Acknowledge receipt for your office. Other recipient offices are unaffected.',
    icon: <Inbox className="w-3.5 h-3.5" />,
    tone: 'primary',
  },
  approve: {
    label: 'Approve',
    description: 'Approve this document so it can be released.',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    tone: 'primary',
  },
  reject: {
    label: 'Reject',
    description: 'Reject the document — it will be closed out.',
    icon: <XCircle className="w-3.5 h-3.5" />,
    tone: 'danger',
  },
  release: {
    label: 'Release',
    description: 'Mark as released to the recipient.',
    icon: <PackageOpen className="w-3.5 h-3.5" />,
    tone: 'primary',
  },
  archive: {
    label: 'Archive',
    description: 'Move to long-term archive.',
    icon: <ArchiveIcon className="w-3.5 h-3.5" />,
    tone: 'outline',
  },
};

const PRIMARY_BY_STATUS: Partial<Record<DocumentStatus, ActionType>> = {
  registered: 'receive',
  received: 'approve',
  approved: 'release',
  rejected: 'archive',
  released: 'archive',
};

const DECISION_BY_STATUS: Partial<Record<DocumentStatus, ActionType[]>> = {
  registered: ['receive'],
  received: ['approve', 'reject'],
};

const TERMINAL_BY_STATUS: Partial<Record<DocumentStatus, ActionType[]>> = {
  approved: ['release'],
  rejected: ['archive'],
  released: ['archive'],
};

const TERMINAL_STATUSES: DocumentStatus[] = ['rejected', 'released', 'archived'];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return ['bg-brand-600', 'bg-emerald-600', 'bg-rose-600', 'bg-indigo-600', 'bg-blue-600', 'bg-amber-600'][
    Math.abs(hash) % 6
  ];
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const { document: doc, loading: documentLoading, refresh, downloadAttachment } = useDocumentDetail(id);
  const { history } = useDocumentHistory(id);
  const transition = useDocumentTransition();
  const receiveAction = useDocumentReceive();
  const documentDelete = useDocumentDelete();
  const recipientNote = useRecipientNote();
  const officeById = useOfficeLookup();
  const userById = useUserLookup();

  const [actionModal, setActionModal] = useState<ActionType | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionsOpen, setActionsOpen] = useState(true);

  if (documentLoading) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading document…</div>;
  }

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

  const isOverdue =
    doc.dueDate &&
    new Date(doc.dueDate).getTime() < Date.now() &&
    !TERMINAL_STATUSES.includes(doc.status);

  const allowed = (action: ActionType): boolean =>
    hasPermission(ACTION_PERMISSION[action]) && canTransition(doc.status, ACTION_STATUS_MAP[action]);

  const isTerminal = TERMINAL_STATUSES.includes(doc.status);

  // Per-office receiving: the actor's own office must be a designated
  // recipient that has not yet received the document.
  const myRecipient = doc.recipients.find(r => r.officeId === user.officeId);
  const receiveAvailable =
    myRecipient?.status === 'pending' &&
    allowed('receive') &&
    !isTerminal &&
    doc.encodedById !== user.id;

  const decisionActions = (DECISION_BY_STATUS[doc.status] ?? []).filter(
    a => allowed(a) && (a !== 'receive' || receiveAvailable)
  );
  const terminalActions = (TERMINAL_BY_STATUS[doc.status] ?? []).filter(allowed);
  const primaryStatus = PRIMARY_BY_STATUS[doc.status];
  const primaryAction: ActionType | null =
    primaryStatus && allowed(primaryStatus) && (primaryStatus !== 'receive' || receiveAvailable)
      ? primaryStatus
      : null;

  const openAction = (action: ActionType) => {
    if (action === 'reject' || action === 'archive') {
      confirm({
        title: action === 'reject' ? 'Reject Document' : 'Archive Document',
        description:
          action === 'reject'
            ? 'Are you sure you want to reject this document? This action cannot be undone.'
            : 'This document will be archived and moved out of active workflow.',
        confirmText: action === 'reject' ? 'Reject' : 'Archive',
        variant: 'danger',
      }).then(ok => {
        if (ok) setActionModal(action);
      });
    } else {
      setActionModal(action);
    }
  };

  const submitAction = async () => {
    if (!actionModal) return;
    if (actionModal === 'receive') {
      const result = await receiveAction.receive(doc.id, {
        remarks: remarks.trim() || undefined,
      });
      if (!result) {
        toast.error('Action failed', receiveAction.error ?? 'Please retry.');
        return;
      }
      await refresh();
      toast.success('Document received', `Receipt recorded for your office.`);
      setActionModal(null);
      setRemarks('');
      return;
    }
    const newStatus = ACTION_STATUS_MAP[actionModal];
    const updated = await transition.transition(doc.id, {
      toStatus: newStatus,
      remarks: remarks || `${ACTION_META[actionModal].label} action recorded.`,
    });
    if (!updated) {
      toast.error('Action failed', transition.error ?? 'Please retry.');
      return;
    }
    await refresh();
    toast.success('Action recorded', `Document has been ${actionMarker(actionModal)}.`);
    setActionModal(null);
    setRemarks('');
  };

  const canDownload = doc.attachments.length > 0;

  const canManageNotes = user.role === 'system_admin' || user.role === 'office_admin';

  const handleSetNote = async (officeId: string, note: string): Promise<boolean> => {
    const updated = await recipientNote.setNote(doc.id, officeId, note);
    if (!updated) return false;
    await refresh();
    toast.success('Note saved', 'The office note has been updated.');
    return true;
  };

  const handleDeleteNote = async (officeId: string): Promise<boolean> => {
    const ok = await recipientNote.deleteNote(doc.id, officeId);
    if (!ok) return false;
    await refresh();
    toast.success('Note deleted', 'The office note has been removed.');
    return true;
  };
  const canDeleteDocument =
    hasPermission('documents.delete') &&
    (user.role === 'system_admin' ||
      doc.currentOfficeId === user.officeId ||
      doc.recipients.some(r => r.officeId === user.officeId && r.status === 'received'));

  const handleDeleteDocument = async () => {
    const ok = await confirm({
      title: 'Delete Document',
      description: `Delete ${doc.trackingNumber} · ${doc.title}? It will be hidden from all lists and workflows. This cannot be undone through the interface.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const deleted = await documentDelete.remove(doc.id);
    if (deleted) {
      toast.success('Document deleted', `${doc.trackingNumber} has been removed.`);
      navigate('/documents');
    } else {
      toast.error('Could not delete document', documentDelete.error ?? 'Please retry.');
    }
  };

  const office = officeById(doc.currentOfficeId);
  const holderName = doc.currentHolder?.fullName ?? (doc.currentHolderId ? userById(doc.currentHolderId)?.fullName ?? null : null);
  const holderPosition = doc.currentHolder?.position ?? (doc.currentHolderId ? userById(doc.currentHolderId)?.position ?? null : null);

  return (
    <div className="space-y-6">
      <Link
        to="/documents"
        className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-3 h-3 mr-1" />
        Back to Documents
      </Link>

      <DocumentHero
        document={doc}
        holderName={holderName}
        holderPosition={holderPosition}
        office={office ? `${office.code} ${office.name}` : null}
        isOverdue={!!isOverdue}
        primaryAction={primaryAction}
        onPrimaryAction={() => primaryAction && openAction(primaryAction)}
        canDownload={canDownload}
        canDelete={canDeleteDocument}
        onDelete={handleDeleteDocument}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <DocumentTracker document={doc} />
          <RecipientTracking
            document={doc}
            userById={userById}
            canManageNotes={canManageNotes}
            currentOfficeId={user.officeId}
            noteError={recipientNote.error}
            onSetNote={handleSetNote}
            onDeleteNote={handleDeleteNote}
          />
          <HistoryPanel document={doc} history={history} userById={userById} />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <DocumentActions
            decisionActions={decisionActions}
            terminalActions={terminalActions}
            open={actionsOpen}
            onToggle={() => setActionsOpen(o => !o)}
            onAction={openAction}
          />
          <DocumentInfoSidebar
            document={doc}
            office={office}
            isOverdue={!!isOverdue}
            onViewAttachment={(att) => {
              if (att.mimeType.toLowerCase() === 'application/pdf') {
              void downloadAttachment(att.id);
              } else {
                void downloadAttachment(att.id);
              }
            }}
            onDownloadAttachment={(attId) => void downloadAttachment(attId)}
          />
        </aside>
      </div>

      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal ? `${ACTION_META[actionModal].label} Document` : ''}
        description={actionModal ? ACTION_META[actionModal].description : ''}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              variant={actionModal === 'reject' ? 'danger' : 'primary'}
              onClick={submitAction}
              disabled={transition.saving}
            >
              {transition.saving
                ? 'Saving…'
                : actionModal
                  ? `Confirm ${ACTION_META[actionModal].label.toLowerCase()}`
                  : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Document</p>
            <p className="text-sm font-semibold text-slate-900">
              {doc.trackingNumber} · {doc.title}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Current office: {office ? `${office.code} ${office.name}` : '—'} · Status:{' '}
              {DOCUMENT_STATUS_LABELS[doc.status]}
            </p>
          </div>
          <Textarea
            label={
              actionModal === 'receive'
                ? 'Remarks (optional)'
                : actionModal === 'reject'
                  ? 'Rejection reason'
                  : 'Remarks'
            }
            required={actionModal !== 'receive'}
            rows={4}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder={
              actionModal === 'receive'
                ? 'Optional note about this receipt…'
                : 'Provide context for this action…'
            }
          />
        </div>
      </Modal>
    </div>
  );
}

function actionMarker(action: ActionType): string {
  switch (action) {
    case 'reject':
      return 'rejected';
    case 'receive':
      return 'received';
    case 'approve':
      return 'approved';
    case 'release':
      return 'released';
    case 'archive':
      return 'archived';
  }
}

interface DocumentHeroProps {
  document: DocumentDetail;
  holderName: string | null;
  holderPosition: string | null;
  office: string | null;
  isOverdue: boolean;
  primaryAction: ActionType | null;
  onPrimaryAction: () => void;
  canDownload: boolean;
  canDelete: boolean;
  onDelete: () => void;
}

function DocumentHero({
  document: d,
  holderName,
  holderPosition,
  office,
  isOverdue,
  primaryAction,
  onPrimaryAction,
  canDownload,
  canDelete,
  onDelete,
}: DocumentHeroProps) {
  const isTerminal = TERMINAL_STATUSES.includes(d.status);
  const showAttachmentBar = true;
  return (
    <header className="space-y-4">
      <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-slate-500">
        <span className="font-mono font-semibold text-slate-800">{d.trackingNumber}</span>
        {d.documentNumber && <span className="font-mono text-slate-600">{d.documentNumber}</span>}
        <span>Created {formatDate(d.createdAt)}</span>
        {d.source === 'external' && d.senderName && <span>From {d.senderName}</span>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-snug">
              {d.title}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
              <StatusBadge status={d.status} />
              <PriorityBadge priority={d.priority} />
              <ClassificationBadge classification={d.classification} />
              <Tag variant="slate">{DOCUMENT_TYPE_LABELS[d.type]}</Tag>
              {isOverdue && (
                <Tag variant="rose" icon={<AlertCircle className="w-3 h-3" />}>
                  Overdue
                </Tag>
              )}
            </div>
          </div>

          {d.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{d.description}</p>
          )}

          {d.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <TagIcon className="w-3.5 h-3.5 text-slate-400" />
              {d.tags.map(t => (
                <span
                  key={t}
                  className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 px-5 sm:px-6 py-4 border-t border-slate-100">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Office</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{office ?? '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Holder</p>
            {holderName ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={holderName} color="bg-brand-600" size="xs" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{holderName}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {holderPosition ?? (d.receivedBy ? 'Received' : '')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Unassigned</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Date Received
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {d.dateReceived ? formatDate(d.dateReceived) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Due</p>
            <p className={cn('text-sm font-semibold', isOverdue ? 'text-rose-700' : 'text-slate-900')}>
              {d.dueDate ? formatDate(d.dueDate) : 'No deadline'}
            </p>
          </div>
        </div>

        {showAttachmentBar && (
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 sm:px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden sm:block text-xs text-slate-500">
              {primaryAction && !isTerminal
                ? `Next step: ${ACTION_META[primaryAction].label} this document.`
                : isTerminal
                  ? 'This document has reached the end of its lifecycle.'
                  : 'No further actions available.'}
            </p>
            <div className="flex items-center gap-2 sm:justify-end">
              {canDelete && (
                <Button
                  variant="danger"
                  size="md"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={onDelete}
                >
                  Delete Document
                </Button>
              )}
              {canDownload && (
                <Button variant="outline" size="md" leftIcon={<Download className="w-4 h-4" />}>
                  Download
                </Button>
              )}

            </div>
          </div>
        )}
      </div>
    </header>
  );
}

interface DocumentActionsProps {
  decisionActions: ActionType[];
  terminalActions: ActionType[];
  open: boolean;
  onToggle: () => void;
  onAction: (action: ActionType) => void;
}

function DocumentActions({
  decisionActions,
  terminalActions,
  open,
  onToggle,
  onAction,
}: DocumentActionsProps) {
  const hasAny = decisionActions.length > 0 || terminalActions.length > 0;
  if (!hasAny) {
    return (
      <Card>
        <CardHeader title="Actions" description="No actions available for your role" />
        <p className="text-xs text-slate-500">
          You don't have permission to act on this document at its current stage.
        </p>
      </Card>
    );
  }
  return (
    <Card padded={false}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group w-full px-5 py-3.5 flex items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">Actions</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-200 group-hover:text-slate-700">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-4">
          {decisionActions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2.5">
                Decision
              </p>
              <div className="grid grid-cols-2 gap-2">
                {decisionActions.map(action => {
                  const meta = ACTION_META[action];
                  const variant =
                    meta.tone === 'primary'
                      ? 'primary'
                      : meta.tone === 'danger'
                        ? 'danger'
                        : 'outline';
                  return (
                    <Button
                      key={action}
                      variant={variant as 'primary' | 'outline' | 'danger'}
                      size="sm"
                      className={meta.tone === 'primary' ? 'shadow-sm' : undefined}
                      leftIcon={meta.icon}
                      onClick={() => onAction(action)}
                    >
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          {terminalActions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2.5">
                Final
              </p>
              <div className="grid grid-cols-1 gap-2">
                {terminalActions.map(action => {
                  const meta = ACTION_META[action];
                  return (
                    <Button
                      key={action}
                      variant={meta.tone === 'primary' ? 'primary' : 'outline'}
                      size="sm"
                      className={meta.tone === 'primary' ? 'shadow-sm' : undefined}
                      leftIcon={meta.icon}
                      onClick={() => onAction(action)}
                      fullWidth
                    >
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

interface DocumentInfoSidebarProps {
  document: DocumentDetail;
  office: { code: string; name: string } | undefined;
  isOverdue: boolean;
  onDownloadAttachment: (id: string) => void;
}

function DocumentInfoSidebar({
  document: d,
  office,
  isOverdue,
  onDownloadAttachment,
}: DocumentInfoSidebarProps) {
  return (
    <>
      <Card padded={false}>
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">People</h3>
        </div>
        <ul className="divide-y divide-slate-100">
          <PersonLine label="Encoded by" person={d.encodedBy} />
          <PersonLine label="Received by" person={d.receivedBy} />
          <PersonLine label="Approved by" person={d.approvedBy} />
          <PersonLine label="Released by" person={d.releasedBy} />
          <InfoLine
            label="Holder"
            value={d.currentHolder?.fullName ?? d.encodedBy?.fullName ?? 'Unassigned'}
          />
          <InfoLine
            label="Originating office"
            value={office?.code && office?.name ? `${office.code} — ${office.name}` : (d.originatingOfficeName ?? '—')}
          />
          <InfoLine
            label="Current office"
            value={office?.code && office?.name ? `${office.code} — ${office.name}` : '—'}
          />
        </ul>
      </Card>

      <Card padded={false}>
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Document</h3>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          <InfoLine label="Type" value={DOCUMENT_TYPE_LABELS[d.type]} />
          <InfoLine
            label="Classification"
            value={DOCUMENT_CLASSIFICATION_LABELS[d.classification]}
          />
          <InfoLine
            label="Source"
            value={
              d.source === 'internal' ? 'Internal' : `External${d.senderName ? ` · ${d.senderName}` : ''}`
            }
          />
          <InfoLine
            label="Recipients"
            value={
              d.destinationsAllOffices
                ? 'All Offices'
                : d.recipients.length > 0
                  ? d.recipients.map(r => `${r.office.code} — ${r.office.name}`).join(', ')
                  : '—'
            }
          />
          <InfoLine label="Created" value={formatDate(d.createdAt, true)} />
          <InfoLine label="Last updated" value={formatRelative(d.updatedAt)} />
        </ul>
      </Card>

      <Card padded={false}>
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
          <span className="text-xs text-slate-500 tabular-nums">{d.attachments.length}</span>
        </div>
        {d.attachments.length === 0 ? (
          <p className="text-sm text-slate-500 px-5 py-6 text-center">No attachments.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.attachments.map(att => (
              <li key={att.id} className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-slate-50">
                <div className="w-7 h-7 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Paperclip className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{att.fileName}</p>
                  <p className="text-[11px] text-slate-500">
                    {(att.sizeBytes / 1024).toFixed(1)} KB ·{' '}
                    {att.mimeType.split('/').pop()?.toUpperCase() ?? 'FILE'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onViewAttachment(att)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                  aria-label="View Attachment"
                  title="View Attachment"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadAttachment(att.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                  aria-label="Download"
                  title="Download Attachment"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isOverdue && (
        <div className="border border-rose-200 bg-rose-50 rounded-md p-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Past due date</p>
            <p className="text-xs mt-0.5">
              This document was due {d.dueDate ? formatRelative(d.dueDate) : ''} and still needs an
              action.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function PersonLine({ label, person }: { label: string; person: DocumentPerson | null }) {
  return (
    <li className="px-5 py-2.5 flex items-center gap-3">
      <Avatar name={person?.fullName ?? '—'} color={person ? colorForId(person.id) : 'bg-slate-400'} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">
          {person?.fullName ?? 'Unassigned'}
        </p>
      </div>
    </li>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <li className="px-5 py-2 flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 truncate text-right">{value}</span>
    </li>
  );
}

interface HistoryPanelProps {
  document: DocumentDetail;
  history: import('@/features/documents/types/document').DocumentHistoryEntry[];
  userById: (id: string | null | undefined) => import('@/hooks/useLookups').LookupUser | undefined;
}

function HistoryPanel({ document, history, userById }: HistoryPanelProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  return (
    <Card padded={false}>
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
          <HistoryIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Status History</h2>
          <p className="text-xs text-slate-500">
            Complete chronological record of this document's lifecycle. History is immutable.
          </p>
        </div>
      </div>

      <div className="px-5 py-5">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon className="w-6 h-6" />}
            title="No history yet"
            description="Status transitions will appear here as the document moves through the workflow."
          />
        ) : (
          <ol className="relative">
            <span aria-hidden className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
            {sorted.map(entry => {
              const actor = userById(entry.actorId);
              return (
                <li key={entry.id} className="relative pl-12 pb-5 last:pb-0">
                  <span className="absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="rounded-md border border-slate-200 p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <span className="font-semibold text-slate-900">
                            {entry.fromStatus ? statusLabel(entry.fromStatus) : 'Created'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-brand-700">
                            {statusLabel(entry.toStatus)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Status change
                          {actor ? ` · by ${actor.fullName}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-700 font-medium inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(entry.occurredAt, true)}
                        </p>
                      </div>
                    </div>
                    {entry.remarks && entry.remarks !== `${entry.toStatus} recorded` && (
                      <div className="mt-2.5 p-2.5 rounded-md bg-slate-50 border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-0.5">
                          Remarks
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">{entry.remarks}</p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}

function statusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

