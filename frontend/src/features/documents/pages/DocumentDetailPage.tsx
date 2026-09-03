import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Paperclip,
  Building2,
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
  History as HistoryIcon,
  Hash,
  Route as RouteIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, ClassificationBadge, Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Input';
import { useOfficeLookup } from '@/hooks/useLookups';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import { useRoutingOptions } from '@/features/documents/hooks/useRoutingOptions';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
  ROLE_LABELS,
  canTransition,
} from '@/constants';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import { attachmentsService, documentsService } from '@/features/documents/services/documents.service';
import { useDocumentHistory } from '@/features/documents/hooks/useDocumentHistory';
import { useDocumentTimeline } from '@/features/documents/hooks/useDocumentTimeline';
import { useDocumentTransition } from '@/features/documents/hooks/useDocumentTransition';
import { useDocumentDetail } from '@/features/documents/hooks/useDocumentDetail';
import type { DocumentStatus, Permission } from '@/types';
import { DocumentJourneyView } from '@/features/documents/components/DocumentJourneyView';
import type { DocumentDetail } from '@/features/documents/types/document';

type ActionType = 'receive' | 'recommend' | 'approve' | 'reject' | 'return' | 'release' | 'archive';

const ACTION_STATUS_MAP: Record<ActionType, DocumentStatus> = {
  receive: 'received',
  recommend: 'recommended',
  approve: 'approved',
  reject: 'rejected',
  return: 'returned',
  release: 'released',
  archive: 'archived',
};

const ACTION_PERMISSION: Record<ActionType, Permission> = {
  receive: 'documents.receive',
  recommend: 'documents.recommend',
  approve: 'documents.approve',
  reject: 'documents.reject',
  return: 'documents.return',
  release: 'documents.release',
  archive: 'documents.archive',
};

const ACTION_META: Record<
  ActionType,
  { label: string; description: string; icon: React.ReactNode; tone: 'primary' | 'outline' | 'danger' }
> = {
  receive: {
    label: 'Receive',
    description: 'Receive this document into your office to begin processing.',
    icon: <Inbox className="w-3.5 h-3.5" />,
    tone: 'primary',
  },
  recommend: {
    label: 'Recommend',
    description: 'Add a recommendation for the final approver.',
    icon: <ThumbsUp className="w-3.5 h-3.5" />,
    tone: 'outline',
  },
  approve: {
    label: 'Approve',
    description: 'Final approval — the document can be released.',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    tone: 'primary',
  },
  return: {
    label: 'Return',
    description: 'Return to the originating office for revision.',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    tone: 'outline',
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

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  // Load custom hooks at the top level
  const { offices = [], loading: officesLoading } = useOffices();
  const { document: doc, loading: documentLoading, refresh } = useDocumentDetail(id);
  const { history } = useDocumentHistory(id);
  const { timeline } = useDocumentTimeline(id);
  const transition = useDocumentTransition();
  const { users: routingUsers } = useRoutingOptions();
  const officeById = useOfficeLookup();

  const [tab, setTab] = useState<'routing' | 'audit'>('routing');
  const [actionModal, setActionModal] = useState<ActionType | null>(null);
  const [remarks, setRemarks] = useState('');
  const [routeOffice, setRouteOffice] = useState('');
  const [routeUser, setRouteUser] = useState('');
  const [routeInstructions, setRouteInstructions] = useState('');
  const [routeModal, setRouteModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (documentLoading || officesLoading) {
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

  // Derive target office dynamically from offices
  const officeFromDirectory = offices.find(item => item.id === doc.currentOfficeId);
  const officeUser = routingUsers.find(u => u.officeId === doc.currentOfficeId);
  const office = officeFromDirectory
    ?? (doc.currentOfficeId === user?.officeId
      ? { id: user.officeId, name: user.officeName ?? 'Current office', code: user.officeCode ?? user.officeId, type: 'unit' as const }
      : null)
    ?? (officeUser?.officeName
      ? { id: doc.currentOfficeId, name: officeUser.officeName, code: '', type: 'unit' as const }
      : null);

  const holderPerson = doc.currentHolder
    ?? (doc.currentHolderId ? routingUsers.find(u => u.id === doc.currentHolderId) ?? null : null);
  const holder = holderPerson ? { ...holderPerson, avatarColor: 'bg-brand-600' } as unknown as import('@/types').User : null;
  const originator = officeById(doc.originatingOfficeId);
  const encoder = doc.encodedBy ? { ...doc.encodedBy, avatarColor: 'bg-brand-600' } as unknown as import('@/types').User : null;
  const receiver = doc.receivedBy ? { ...doc.receivedBy, avatarColor: 'bg-emerald-600' } as unknown as import('@/types').User : null;

  const isOverdue =
    doc.dueDate &&
    new Date(doc.dueDate).getTime() < Date.now() &&
    !['released', 'archived', 'rejected'].includes(doc.status);

  const decisionActions: ActionType[] = [
    ...(hasPermission('documents.receive') && canTransition(doc.status, 'received')
      ? (['receive'] as ActionType[])
      : []),
    ...(doc.status === 'under_review' || doc.status === 'recommended'
      ? (['recommend', 'approve', 'return', 'reject'] as ActionType[]).filter(
          action =>
            hasPermission(ACTION_PERMISSION[action]) &&
            canTransition(doc.status, ACTION_STATUS_MAP[action]),
        )
      : []),
  ];
  const terminalActions: ActionType[] = [];
  if (
    doc.status === 'approved' &&
    hasPermission('documents.release') &&
    canTransition(doc.status, 'released')
  ) {
    terminalActions.push('release');
  }
  if (
    doc.status === 'released' &&
    hasPermission('documents.archive') &&
    canTransition(doc.status, 'archived')
  ) {
    terminalActions.push('archive');
  }
  const canRoute =
    hasPermission('documents.route') && canTransition(doc.status, 'routed');
  const canAssign =
    doc.status === 'routed' && hasPermission('documents.route');
  const canStartReview =
    (doc.status === 'assigned' || doc.status === 'returned') &&
    hasPermission('documents.review');
  const canDownload = doc.attachments.length > 0;
  const legacyDocument = doc as unknown as import('@/types').Document;
  const legacyRouting = doc.routingSteps.map(step => ({
    ...step,
    fromUserId: step.fromUserId ?? undefined,
    toUserId: step.toUserId ?? undefined,
    instructions: step.instructions ?? '',
    remarks: step.remarks ?? undefined,
  })) as unknown as import('@/types').RoutingStep[];
  const legacyLogs = timeline.map(entry => ({
    id: entry.id,
    actorId: entry.actorId ?? '',
    actorName:
      (entry.actorId ? routingUsers.find(u => u.id === entry.actorId)?.fullName : null) ??
      'System',
    action:
      typeof entry.event === 'string'
        ? entry.event
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        : 'Status transition',
    module: 'Documents',
    description:
      (entry.payload && typeof entry.payload === 'object' && 'to' in entry.payload
        ? `Document moved to ${String((entry.payload as { to?: string }).to ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`
        : 'Status update recorded') +
      (typeof entry.event === 'string' && entry.event === 'status.transition'
        ? ' — status transition'
        : ''),
    targetId: doc.id,
    targetType: 'document',
    ipAddress: '',
    userAgent: '',
    createdAt: entry.occurredAt,
  })) as import('@/types').AuditLog[];

  const statusAction: ActionType | null =
    doc.status === 'registered'
      ? 'receive'
      : doc.status === 'under_review' || doc.status === 'recommended'
        ? 'approve'
        : doc.status === 'approved'
          ? 'release'
          : doc.status === 'released'
            ? 'archive'
            : null;
  const primaryAction: ActionType | null =
    statusAction &&
    hasPermission(ACTION_PERMISSION[statusAction]) &&
    canTransition(doc.status, ACTION_STATUS_MAP[statusAction])
      ? statusAction
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
    if (!actionModal || !user) return;
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
    toast.success(
      'Action recorded',
      `Document has been ${actionModal === 'recommend' ? 'recommended' : actionModal === 'return' ? 'returned' : `${actionModal}d`}.`,
    );
    setActionModal(null);
    setRemarks('');
  };

  const submitRoute = async () => {
    if (!routeOffice || !user) {
      toast.error('Target office required', 'Please select an office to route this document to.');
      return;
    }
    const updated = await transition.transition(doc.id, {
      toStatus: 'routed',
      currentOfficeId: routeOffice,
      currentHolderId: routeUser || undefined,
      remarks: routeInstructions || remarks || 'Forwarded for action',
    });
    if (!updated) {
      toast.error('Routing failed', transition.error ?? 'Please retry.');
      return;
    }
    await refresh();
    toast.success('Document routed', `Forwarded to ${officeById(routeOffice)?.code}.`);
    setRouteModal(false);
    setRouteOffice('');
    setRouteUser('');
    setRouteInstructions('');
    setRemarks('');
  };

  const officeUsers = routeOffice
    ? routingUsers.filter(u => u.officeId === routeOffice)
    : [];

  const currentOfficeUsers = routingUsers.filter(u => u.officeId === doc.currentOfficeId);

  const startReview = async () => {
    setSubmitting(true);
    const updated = await transition.transition(doc.id, {
      toStatus: 'under_review',
      remarks: 'Review started',
    });
    setSubmitting(false);
    if (!updated) {
      toast.error('Action failed', transition.error ?? 'Please retry.');
      return;
    }
    await refresh();
    toast.success('Review started', 'Document is now under review.');
  };

  const submitAssign = async () => {
    if (!assignUserId) {
      toast.error('Select a holder', 'Please choose the person to assign this document to.');
      return;
    }
    setSubmitting(true);
    try {
      await documentsService.assignHolder(doc.id, {
        holderId: assignUserId,
        officeId: doc.currentOfficeId ?? undefined,
        notes: assignNotes.trim() || 'Document assigned to holder',
      });
      window.dispatchEvent(new Event('documents:invalidate'));
      await refresh();
      toast.success(
        'Document assigned',
        `Assigned to ${routingUsers.find(u => u.id === assignUserId)?.fullName ?? 'holder'}.`,
      );
      setAssignModal(false);
      setAssignUserId('');
      setAssignNotes('');
    } catch (err) {
      toast.error('Assignment failed', err instanceof Error ? err.message : 'Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

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
        document={legacyDocument}
        holder={holder}
        office={office}
        isOverdue={!!isOverdue}
        primaryAction={primaryAction}
        onPrimaryAction={() => primaryAction && openAction(primaryAction)}
        canDownload={canDownload}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <DocumentJourneyView
            document={legacyDocument}
            routingSteps={legacyRouting}
            auditLogs={legacyLogs}
          />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <DocumentActions
            decisionActions={decisionActions}
            terminalActions={terminalActions}
            canRoute={canRoute}
            canAssign={canAssign}
            canStartReview={canStartReview}
            onAction={openAction}
            onRoute={() => setRouteModal(true)}
            onAssign={() => setAssignModal(true)}
            onStartReview={startReview}
          />
          <DocumentInfoSidebar
            document={doc}
            originator={originator ?? null}
            encoder={encoder ?? null}
            receiver={receiver ?? null}
            holder={holder ?? null}
            isOverdue={!!isOverdue}
          />
        </aside>
      </div>

      <HistoryTabs
        tab={tab}
        onTabChange={setTab}
        routing={legacyRouting}
        logs={legacyLogs}
        offices={offices}
        users={routingUsers}
        officeById={officeById}
      />

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
            >
              {actionModal ? `Confirm ${ACTION_META[actionModal].label.toLowerCase()}` : ''}
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
              Current office: {office?.name} ({office?.code}) · Status:{' '}
              {doc.status.replace(/_/g, ' ')}
            </p>
          </div>
          {actionModal === 'return' && (
            <Select
              label="Return to"
              options={offices.map(o => ({
                value: o.id,
                label: `${o.code} — ${o.name}`,
              }))}
            />
          )}
          <Textarea
            label="Remarks"
            required
            rows={4}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Provide context for this action…"
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
            <Button variant="outline" onClick={() => setRouteModal(false)}>
              Cancel
            </Button>
            <Button leftIcon={<Send className="w-4 h-4" />} onClick={submitRoute}>
              Route Document
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
              From: {office?.name} ({office?.code})
            </p>
          </div>
          <Select
            label="Target Office"
            required
            placeholder="Choose target office…"
            value={routeOffice}
            onChange={e => {
              setRouteOffice(e.target.value);
              setRouteUser('');
            }}
            options={offices
              .filter(o => o.id !== doc.currentOfficeId)
              .map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
          />
          <Select
            label="Assign To (Optional)"
            placeholder={routeOffice ? 'Choose officer…' : 'Select office first'}
            value={routeUser}
            onChange={e => setRouteUser(e.target.value)}
            options={officeUsers.map(u => ({
              value: u.id,
              label: u.position ? `${u.fullName} (${u.position})` : u.fullName,
            }))}
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

      <Modal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        title="Assign Document"
        description="Assign this document to a holder in your office"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignModal(false)}>
              Cancel
            </Button>
            <Button leftIcon={<Inbox className="w-4 h-4" />} onClick={submitAssign} disabled={submitting}>
              {submitting ? 'Assigning…' : 'Assign Document'}
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
          </div>
          <Select
            label="Assign To"
            required
            placeholder="Choose holder…"
            value={assignUserId}
            onChange={e => setAssignUserId(e.target.value)}
            options={currentOfficeUsers.map(u => ({
              value: u.id,
              label: u.position ? `${u.fullName} (${u.position})` : u.fullName,
            }))}
          />
          <Textarea
            label="Assignment Notes"
            rows={3}
            value={assignNotes}
            onChange={e => setAssignNotes(e.target.value)}
            placeholder="Optional instructions for the assigned holder…"
          />
        </div>
      </Modal>
    </div>
  );
}

interface DocumentHeroProps {
  document: import('@/types').Document;
  holder: import('@/types').User | null | undefined;
  office: { id: string; name: string; code: string } | null | undefined;
  isOverdue: boolean;
  primaryAction: ActionType | null;
  onPrimaryAction: () => void;
  canDownload: boolean;
}

function DocumentHero({
  document: d,
  holder,
  office,
  isOverdue,
  primaryAction,
  onPrimaryAction,
  canDownload,
}: DocumentHeroProps) {
  const isTerminal = ['released', 'archived', 'rejected'].includes(d.status);
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
        <span className="font-mono font-semibold text-slate-700">{d.trackingNumber}</span>
        {d.documentNumber && (
          <>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Hash className="w-3 h-3" />
              {d.documentNumber}
            </span>
          </>
        )}
        <span className="text-slate-300">·</span>
        <span>Created {formatDate(d.createdAt)}</span>
        {d.source === 'external' && d.senderName && (
          <>
            <span className="text-slate-300">·</span>
            <span>From {d.senderName}</span>
          </>
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-snug">
        {d.title}
      </h1>

      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={d.status} size="md" />
        <PriorityBadge priority={d.priority} />
        <ClassificationBadge classification={d.classification} />
        <Tag variant="slate">{DOCUMENT_TYPE_LABELS[d.type]}</Tag>
        {isOverdue && (
          <Tag variant="rose" icon={<AlertCircle className="w-3 h-3" />}>
            Overdue
          </Tag>
        )}
      </div>

      {d.description && (
        <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">{d.description}</p>
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

      <div className="border border-slate-200 rounded-md bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 min-w-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Office
            </p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {office ? `${office.code} ${office.name}` : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Holder
            </p>
            {holder ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  name={holder.fullName}
                  color={holder.avatarColor}
                  size="xs"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {holder.fullName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {ROLE_LABELS[holder.role] ?? (holder as unknown as { position?: string | null }).position ?? ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Unassigned</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Date Received
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {d.dateReceived ? formatDate(d.dateReceived) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Due
            </p>
            <p
              className={cn(
                'text-sm font-semibold inline-flex items-center gap-1.5',
                isOverdue ? 'text-rose-700' : 'text-slate-900'
              )}
            >
              <Clock className="w-3 h-3" />
              {d.dueDate ? formatDate(d.dueDate) : 'No deadline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canDownload && (
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
              Download
            </Button>
          )}
          {primaryAction && !isTerminal && (
            <Button
              size="sm"
              leftIcon={ACTION_META[primaryAction].icon}
              onClick={onPrimaryAction}
            >
              {ACTION_META[primaryAction].label}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

interface DocumentActionsProps {
  decisionActions: ActionType[];
  terminalActions: ActionType[];
  canRoute: boolean;
  canAssign: boolean;
  canStartReview: boolean;
  onAction: (action: ActionType) => void;
  onRoute: () => void;
  onAssign: () => void;
  onStartReview: () => void;
}

function DocumentActions({
  decisionActions,
  terminalActions,
  canRoute,
  canAssign,
  canStartReview,
  onAction,
  onRoute,
  onAssign,
  onStartReview,
}: DocumentActionsProps) {
  const [open, setOpen] = useState(true);
  const hasAny =
    decisionActions.length > 0 || terminalActions.length > 0 || canRoute || canAssign || canStartReview;
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
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">Actions</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {decisionActions.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
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
          {(canRoute || canAssign || canStartReview) && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
                Workflow
              </p>
              <div className="space-y-2">
                {canAssign && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Inbox className="w-3.5 h-3.5" />}
                    onClick={onAssign}
                    fullWidth
                  >
                    Assign to holder
                  </Button>
                )}
                {canStartReview && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={onStartReview}
                    fullWidth
                  >
                    Start review
                  </Button>
                )}
                {canRoute && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    onClick={onRoute}
                    fullWidth
                  >
                    Route to another office
                  </Button>
                )}
              </div>
            </div>
          )}
          {terminalActions.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
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
  originator: { code: string; name: string } | null | undefined;
  encoder: import('@/types').User | null | undefined;
  receiver: import('@/types').User | null | undefined;
  holder: import('@/types').User | null | undefined;
  isOverdue: boolean;
}

function DocumentInfoSidebar({
  document: d,
  originator,
  encoder,
  receiver,
  holder,
  isOverdue,
}: DocumentInfoSidebarProps) {
  const downloadAttachment = async (attachmentId: string) => {
    try {
      const url = attachmentsService.downloadUrl(attachmentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Keep detail view usable if download link fails
    }
  };
  return (
    <>
      <Card padded={false}>
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">People</h3>
        </div>
        <ul className="divide-y divide-slate-100">
          <PersonLine label="Encoded by" user={encoder} />
          <PersonLine label="Received by" user={receiver} />
          <PersonLine label="Current holder" user={holder} />
          <PersonLine
            label="Originating office"
            text={originator ? `${originator.code} — ${originator.name}` : (d.originatingOfficeName ?? '—')}
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
              <li
                key={att.id}
                className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-slate-50"
              >
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
                  onClick={() => void downloadAttachment(att.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                  aria-label="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                  aria-label="Download"
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

function PersonLine({
  label,
  user,
  text,
}: {
  label: string;
  user?: import('@/types').User | null;
  text?: string;
}) {
  if (text) {
    return (
      <li className="px-5 py-2.5 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-sm font-medium text-slate-900 truncate text-right">{text}</span>
      </li>
    );
  }
  return (
    <li className="px-5 py-2.5 flex items-center gap-3">
      <Avatar
        name={user?.fullName ?? '—'}
        color={user?.avatarColor ?? 'bg-slate-400'}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">
          {user?.fullName ?? 'Unassigned'}
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

interface HistoryTabsProps {
  tab: 'routing' | 'audit';
  onTabChange: (t: 'routing' | 'audit') => void;
  routing: import('@/types').RoutingStep[];
  logs: import('@/types').AuditLog[];
  offices: import('@/features/system-admin/offices/types/office').Office[];
  users: import('@/features/system-admin/users/types/user').RoutingUserOption[];
  officeById: (id: string | null | undefined) =>
    | import('@/features/system-admin/offices/types/office').Office
    | undefined;
}

const ROUTING_STEP_STYLES = {
  pending: 'bg-slate-100 text-slate-700',
  received: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-rose-100 text-rose-700',
} as const;

function RoutingStepStatus({ status }: { status: import('@/types').RoutingStep['status'] }) {
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        ROUTING_STEP_STYLES[status]
      )}
    >
      {label}
    </span>
  );
}

function HistoryTabs({ tab, onTabChange, routing, logs, offices, users, officeById }: HistoryTabsProps) {
  const officeName = (id?: string | null) => {
    if (!id) return '—';
    const office = offices.find(o => o.id === id) ?? officeById(id);
    return office ? `${office.code} ${office.name}` : id.slice(0, 8);
  };
  const userName = (id?: string | null) => {
    if (!id) return null;
    const user = users.find(u => u.id === id);
    return user ? user.fullName : null;
  };

  const sortedRouting = [...routing].sort((a, b) => a.sequence - b.sequence);
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <Card padded={false}>
      <div className="px-5 pt-4">
        <Tabs
          value={tab}
          onChange={id => onTabChange(id as 'routing' | 'audit')}
          items={[
            {
              id: 'routing',
              label: 'Routing History',
              icon: <RouteIcon className="w-4 h-4" />,
              count: sortedRouting.length,
            },
            {
              id: 'audit',
              label: 'Audit History',
              icon: <HistoryIcon className="w-4 h-4" />,
              count: sortedLogs.length,
            },
          ]}
        />
      </div>

      <div className="p-5">
        {tab === 'routing' && (
          <div className="space-y-3">
            {sortedRouting.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No routing history yet.</p>
            ) : (
              sortedRouting.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start gap-3 rounded-md border border-slate-200 p-3.5"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                      {step.sequence}
                    </span>
                    {index < sortedRouting.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-slate-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {officeName(step.fromOfficeId)}
                        <span className="mx-1.5 text-slate-400">→</span>
                        {officeName(step.toOfficeId)}
                      </span>
                      <RoutingStepStatus status={step.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        {formatDate(step.completedAt ?? step.receivedAt ?? undefined, true)}
                      </span>
                      {userName(step.toUserId) && <span>Assigned to {userName(step.toUserId)}</span>}
                      {userName(step.fromUserId) && <span>By {userName(step.fromUserId)}</span>}
                    </div>
                    {(step.instructions || step.remarks) && (
                      <p className="mt-1.5 text-sm text-slate-600">
                        {step.instructions || step.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="space-y-3">
            {sortedLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No audit history yet.</p>
            ) : (
              sortedLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-md border border-slate-200 p-3.5"
                >
                  <Avatar name={log.actorName} color="bg-slate-400" size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {log.action || 'Event'}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(log.createdAt, true)}</span>
                    </div>
                    <p className="text-sm text-slate-600">{log.description}</p>
                    {log.actorName && (
                      <p className="mt-0.5 text-xs text-slate-500">By {log.actorName}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  );
}