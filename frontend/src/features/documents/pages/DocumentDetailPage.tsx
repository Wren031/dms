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
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, ClassificationBadge, Tag } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Input';
import { getOfficeById } from '@/mocks/offices';
import { getUserById } from '@/mocks/users';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
  ROLE_LABELS,
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

type ActionType = 'recommend' | 'approve' | 'reject' | 'return' | 'release' | 'archive';

const ACTION_STATUS_MAP: Record<ActionType, DocumentStatus> = {
  recommend: 'recommended',
  approve: 'approved',
  reject: 'rejected',
  return: 'returned',
  release: 'released',
  archive: 'archived',
};

const ACTION_AUDIT_MAP: Record<ActionType, 'APPROVE' | 'REJECT' | 'RETURN' | 'RECOMMEND' | 'RELEASE' | 'ARCHIVE'> = {
  recommend: 'RECOMMEND',
  approve: 'APPROVE',
  reject: 'REJECT',
  return: 'RETURN',
  release: 'RELEASE',
  archive: 'ARCHIVE',
};

const ACTION_META: Record<
  ActionType,
  { label: string; description: string; icon: React.ReactNode; tone: 'primary' | 'outline' | 'danger' }
> = {
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
  const { user, hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const doc = useDocument(id);
  const routing = useRoutingSteps(id);
  const logs = useAuditLogs(id);

  const [tab, setTab] = useState<'routing' | 'audit'>('routing');
  const [actionModal, setActionModal] = useState<ActionType | null>(null);
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
  const encoder = getUserById(doc.encodedById);
  const receiver = doc.receivedById ? getUserById(doc.receivedById) : null;

  const isOverdue =
    doc.dueDate &&
    new Date(doc.dueDate).getTime() < Date.now() &&
    !['released', 'archived', 'rejected'].includes(doc.status);

  const decisionActions: ActionType[] =
    doc.status === 'under_review' || doc.status === 'recommended'
      ? ['recommend', 'approve', 'return', 'reject']
      : [];
  const terminalActions: ActionType[] = [];
  if (doc.status === 'approved' && hasPermission('documents.release')) {
    terminalActions.push('release');
  }
  if (doc.status === 'released' && hasPermission('documents.archive')) {
    terminalActions.push('archive');
  }
  const canRoute =
    hasPermission('documents.route') &&
    doc.status !== 'archived' &&
    doc.status !== 'released';
  const canDownload = doc.attachments.length > 0;

  const primaryAction: ActionType | null =
    doc.status === 'under_review' || doc.status === 'recommended'
      ? 'approve'
      : doc.status === 'approved'
        ? 'release'
        : doc.status === 'released'
          ? 'archive'
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

  const submitAction = () => {
    if (!actionModal || !user) return;
    const newStatus = ACTION_STATUS_MAP[actionModal];
    const auditAction = ACTION_AUDIT_MAP[actionModal];
    updateDocumentStatus({
      documentId: doc.id,
      status: newStatus,
      actorId: user.id,
      action: auditAction,
      remarks: remarks || `${ACTION_META[actionModal].label} action recorded.`,
    });
    toast.success(
      'Action recorded',
      `Document has been ${actionModal === 'recommend' ? 'recommended' : actionModal === 'return' ? 'returned' : `${actionModal}d`}.`,
    );
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

  const officeUsers = routeOffice
    ? users.filter(u => u.officeId === routeOffice && u.status === 'active')
    : [];

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
            document={doc}
            routingSteps={routing}
            auditLogs={logs}
          />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <DocumentActions
            decisionActions={decisionActions}
            terminalActions={terminalActions}
            canRoute={canRoute}
            onAction={openAction}
            onRoute={() => setRouteModal(true)}
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
        routing={routing}
        logs={logs}
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
              label: `${u.fullName} (${u.position})`,
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
    </div>
  );
}

interface DocumentHeroProps {
  document: import('@/types').Document;
  holder: import('@/types').User | null | undefined;
  office: import('@/types').Office | null | undefined;
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
                    {ROLE_LABELS[holder.role]}
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
  onAction: (action: ActionType) => void;
  onRoute: () => void;
}

function DocumentActions({
  decisionActions,
  terminalActions,
  canRoute,
  onAction,
  onRoute,
}: DocumentActionsProps) {
  const [open, setOpen] = useState(true);
  const hasAny = decisionActions.length > 0 || terminalActions.length > 0 || canRoute;
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
          {canRoute && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
                Workflow
              </p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Send className="w-3.5 h-3.5" />}
                onClick={onRoute}
                fullWidth
              >
                Route to another office
              </Button>
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
  document: import('@/types').Document;
  originator: import('@/types').Office | null | undefined;
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
            text={originator ? `${originator.code} — ${originator.name}` : '—'}
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
                  <p className="text-sm font-medium text-slate-900 truncate">{att.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(att.size / 1024).toFixed(1)} KB ·{' '}
                    {att.type.split('/').pop()?.toUpperCase() ?? 'FILE'}
                  </p>
                </div>
                <button
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
}

function HistoryTabs({ tab, onTabChange, routing, logs }: HistoryTabsProps) {
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
              count: routing.length,
            },
            {
              id: 'audit',
              label: 'Audit History',
              icon: <HistoryIcon className="w-4 h-4" />,
              count: logs.length,
            },
          ]}
        />
      </div>
      <div className="p-5">
        {tab === 'routing' && <RoutingList routing={routing} />}
        {tab === 'audit' && <AuditList logs={logs} />}
      </div>
    </Card>
  );
}

function RoutingList({ routing }: { routing: import('@/types').RoutingStep[] }) {
  if (routing.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">No routing history yet.</p>;
  }
  return (
    <ol className="relative space-y-4">
      <span
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200"
      />
      {routing.map(step => {
        const fromOffice = getOfficeById(step.fromOfficeId);
        const toOffice = getOfficeById(step.toOfficeId);
        const toUser = step.toUserId ? getUserById(step.toUserId) : null;
        const fromUser = step.fromUserId ? getUserById(step.fromUserId) : null;
        return (
          <li key={step.id} className="relative pl-12">
            <span
              className={cn(
                'absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border bg-white',
                step.status === 'completed' &&
                  'border-slate-300 text-slate-700',
                step.status === 'in_progress' &&
                  'border-slate-900 text-slate-900',
                step.status === 'returned' &&
                  'border-rose-300 text-rose-700',
                step.status === 'pending' &&
                  'border-slate-200 text-slate-400 border-dashed',
              )}
            >
              {step.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : step.status === 'in_progress' ? (
                step.sequence
              ) : step.status === 'returned' ? (
                <RotateCcw className="w-4 h-4" />
              ) : (
                step.sequence
              )}
            </span>
            <div className="rounded-md border border-slate-200 p-3.5 bg-white">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900">
                  Step {step.sequence}
                </p>
                <span className="text-xs text-slate-500">
                  {fromOffice?.code} → {toOffice?.code}
                </span>
                <Tag
                  variant={
                    step.status === 'completed'
                      ? 'emerald'
                      : step.status === 'in_progress'
                        ? 'amber'
                        : step.status === 'returned'
                          ? 'rose'
                          : 'slate'
                  }
                >
                  {step.status.replace('_', ' ')}
                </Tag>
              </div>
              <p className="text-sm text-slate-700 mt-2">{step.instructions}</p>
              {(toUser || fromUser) && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {fromUser && <>Routed by {fromUser.fullName}</>}
                  {fromUser && toUser && <> · </>}
                  {toUser && <>To {toUser.fullName}</>}
                </p>
              )}
              {step.remarks && (
                <div className="mt-2 p-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  {step.remarks}
                </div>
              )}
              <div className="mt-2 text-[11px] text-slate-500">
                {step.receivedAt && <span>Received {formatDate(step.receivedAt, true)}</span>}
                {step.completedAt && (
                  <span> · Completed {formatDate(step.completedAt, true)}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AuditList({ logs }: { logs: import('@/types').AuditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">No audit entries yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
      {logs.map(log => {
        const actor = getUserById(log.actorId);
        return (
          <li key={log.id} className="px-4 py-3 flex items-start gap-3">
            <Avatar
              name={log.actorName}
              color={actor?.avatarColor ?? 'bg-slate-600'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900">{log.actorName}</p>
                <Tag
                  variant={
                    log.action === 'APPROVE'
                      ? 'emerald'
                      : log.action === 'REJECT'
                        ? 'rose'
                        : log.action === 'RETURN'
                          ? 'orange'
                          : log.action === 'REVIEW' || log.action === 'RECOMMEND'
                            ? 'indigo'
                            : log.action === 'RECEIVE'
                              ? 'blue'
                              : 'slate'
                  }
                >
                  {log.action}
                </Tag>
                <span className="text-xs text-slate-500">{log.module}</span>
              </div>
              <p className="text-sm text-slate-700 mt-1">{log.description}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {formatDate(log.createdAt, true)} · IP: {log.ipAddress}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
