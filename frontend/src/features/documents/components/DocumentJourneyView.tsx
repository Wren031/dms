import { useMemo } from 'react';
import {
  Circle,
  Clock,
  AlertCircle,
  Inbox,
  Send,
  Tag as TagIcon,
  ClipboardCheck,
  ThumbsUp,
  XCircle,
  RotateCcw,
  PackageOpen,
  Archive as ArchiveIcon,
  CheckCircle2,
  Sparkles,
  History as HistoryIcon,
  Building2,
  User as UserIcon,
  FileText,
  Hash,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge, PriorityBadge, ClassificationBadge, Tag } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  buildDocumentJourney,
  getJourneyProgress,
  isDecisionStage,
  isReworkStage,
  isTerminalStage,
} from '@/features/documents/journey';
import type { JourneyEvent, JourneyStage } from '@/features/documents/journey';
import { offices } from '@/mocks/offices';
import { users, getUserById } from '@/mocks/users';
import { DOCUMENT_TYPE_LABELS } from '@/constants';
import { formatDate, cn } from '@/lib/utils';
import type { AuditLog, Document, RoutingStep } from '@/types';

interface DocumentJourneyViewProps {
  document: Document;
  routingSteps: RoutingStep[];
  auditLogs: AuditLog[];
  loading?: boolean;
  error?: string | null;
}

const stageIcon = (stage: JourneyStage): React.ReactNode => {
  const iconClass = 'w-3.5 h-3.5';
  switch (stage.id) {
    case 'created':
      return <Sparkles className={iconClass} />;
    case 'registered':
      return <Hash className={iconClass} />;
    case 'classified':
      return <TagIcon className={iconClass} />;
    case 'assigned':
      return <Inbox className={iconClass} />;
    case 'routed':
      return <Send className={iconClass} />;
    case 'reviewed':
      return <ClipboardCheck className={iconClass} />;
    case 'recommended':
      return <ThumbsUp className={iconClass} />;
    case 'approved':
      return <CheckCircle2 className={iconClass} />;
    case 'rejected':
      return <XCircle className={iconClass} />;
    case 'returned':
      return <RotateCcw className={iconClass} />;
    case 'corrected':
      return <ClipboardCheck className={iconClass} />;
    case 'released':
      return <PackageOpen className={iconClass} />;
    case 'archived':
      return <ArchiveIcon className={iconClass} />;
    default:
      return <Circle className={iconClass} />;
  }
};

const stageColorClasses = (stage: JourneyStage, state: JourneyEvent['state']): string => {
  if (state === 'current') {
    return 'bg-brand-600 text-white border-brand-600 ring-4 ring-brand-100';
  }
  if (state === 'rework') {
    return 'bg-orange-500 text-white border-orange-500';
  }
  if (state === 'pending') {
    return 'bg-white text-slate-400 border-slate-300 border-dashed';
  }
  if (isDecisionStage(stage.id)) {
    if (stage.id === 'approved') return 'bg-emerald-600 text-white border-emerald-600';
    if (stage.id === 'rejected') return 'bg-rose-600 text-white border-rose-600';
    if (stage.id === 'returned') return 'bg-orange-500 text-white border-orange-500';
    if (stage.id === 'recommended') return 'bg-indigo-600 text-white border-indigo-600';
  }
  if (isReworkStage(stage.id)) {
    return 'bg-orange-500 text-white border-orange-500';
  }
  if (isTerminalStage(stage.id)) {
    return 'bg-slate-600 text-white border-slate-600';
  }
  return 'bg-emerald-600 text-white border-emerald-600';
};

const stateBadge = (event: JourneyEvent): { label: string; className: string } => {
  if (event.state === 'current') {
    return { label: 'Current', className: 'bg-brand-50 text-brand-700 border-brand-200' };
  }
  if (event.state === 'pending') {
    return { label: 'Pending', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  if (event.state === 'rework') {
    return { label: 'Rework', className: 'bg-orange-50 text-orange-700 border-orange-200' };
  }
  if (isDecisionStage(event.stage.id)) {
    if (event.stage.id === 'approved') {
      return { label: 'Decision · Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (event.stage.id === 'rejected') {
      return { label: 'Decision · Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (event.stage.id === 'returned') {
      return { label: 'Decision · Returned', className: 'bg-orange-50 text-orange-700 border-orange-200' };
    }
    if (event.stage.id === 'recommended') {
      return { label: 'Recommendation', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  }
  if (isTerminalStage(event.stage.id)) {
    return { label: 'Terminal', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  if (isReworkStage(event.stage.id)) {
    return { label: 'Returned', className: 'bg-orange-50 text-orange-700 border-orange-200' };
  }
  return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

export function DocumentJourneyView({
  document,
  routingSteps,
  auditLogs,
  loading = false,
  error = null,
}: DocumentJourneyViewProps) {
  const journeyEvents = useMemo(
    () => buildDocumentJourney({ document, routingSteps, auditLogs, users, offices }),
    [document, routingSteps, auditLogs]
  );

  const progress = useMemo(() => getJourneyProgress(journeyEvents), [journeyEvents]);

  const currentHolder = useMemo(
    () => (document.currentHolderId ? getUserById(document.currentHolderId) : null),
    [document.currentHolderId]
  );

  const currentOffice = useMemo(
    () => offices.find(o => o.id === document.currentOfficeId) ?? null,
    [document.currentOfficeId]
  );

  if (loading) {
    return (
      <Card>
        <div className="py-14 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading document journey…</p>
          <p className="text-xs text-slate-500 mt-1">
            Pulling workflow history and routing events.
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="Unable to load journey"
          description={error}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentJourneyHeader
        document={document}
        currentHolderName={currentHolder?.fullName ?? null}
        currentHolderPosition={currentHolder?.position ?? null}
        currentHolderColor={currentHolder?.avatarColor ?? null}
        currentOfficeName={currentOffice?.name ?? null}
        currentOfficeCode={currentOffice?.code ?? null}
        progress={progress}
      />

      <Card padded={false}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
            <HistoryIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Document Journey
            </h2>
            <p className="text-xs text-slate-500">
              Complete chronological workflow of this document. History is
              immutable.
            </p>
          </div>
          <div className="ml-auto inline-flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
              Current
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              Pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Returned / Rework
            </span>
          </div>
        </div>

        <div className="px-5 py-5">
          {journeyEvents.length === 0 ? (
            <EmptyState
              icon={<HistoryIcon className="w-6 h-6" />}
              title="No journey events yet"
              description="This document has not begun its workflow. The journey will start once the document is registered."
            />
          ) : (
            <ol className="relative">
              <span
                aria-hidden
                className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200"
              />
              {journeyEvents.map((event, idx) => (
                <li key={event.id} className="relative pl-12 pb-6 last:pb-0">
                  <span
                    className={cn(
                      'absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0',
                      stageColorClasses(event.stage, event.state)
                    )}
                    aria-hidden
                  >
                    {event.state === 'pending' ? (
                      <Circle className="w-3.5 h-3.5" />
                    ) : (
                      stageIcon(event.stage)
                    )}
                  </span>
                  <JourneyEventCard event={event} isLast={idx === journeyEvents.length - 1} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>
    </div>
  );
}

interface DocumentJourneyHeaderProps {
  document: Document;
  currentHolderName: string | null;
  currentHolderPosition: string | null;
  currentHolderColor: string | null;
  currentOfficeName: string | null;
  currentOfficeCode: string | null;
  progress: { total: number; completed: number; percent: number };
}

function DocumentJourneyHeader({
  document,
  currentHolderName,
  currentHolderPosition,
  currentHolderColor,
  currentOfficeName,
  currentOfficeCode,
  progress,
}: DocumentJourneyHeaderProps) {
  return (
    <Card>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 text-white text-xs font-mono">
              <Hash className="w-3 h-3" />
              {document.documentNumber ?? document.trackingNumber}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Tracking: {document.trackingNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-snug">
            {document.title}
          </h1>
          {document.description && (
            <p className="text-sm text-slate-600 mt-2 max-w-2xl line-clamp-3">
              {document.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <StatusBadge status={document.status} size="md" />
            <PriorityBadge priority={document.priority} />
            <ClassificationBadge classification={document.classification} />
            <Tag variant="slate" icon={<FileText className="w-3 h-3" />}>
              {DOCUMENT_TYPE_LABELS[document.type]}
            </Tag>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-brand-200 bg-brand-50/50 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-brand-700 font-semibold">
              Current Status
            </p>
            <p className="mt-1.5 text-base font-semibold text-slate-900">
              {document.status === 'under_review' || document.status === 'received'
                ? 'In Progress'
                : document.status === 'recommended'
                  ? 'Awaiting Decision'
                  : document.status === 'returned'
                    ? 'Returned for Correction'
                    : '—'}
            </p>
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                <span>Workflow progress</span>
                <span className="font-mono font-semibold text-slate-700">
                  {progress.percent}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white overflow-hidden border border-brand-100">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {progress.completed} of {progress.total} steps completed
              </p>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3.5 bg-white">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Current Office
            </p>
            <div className="mt-1.5 flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {currentOfficeName ?? '—'}
                </p>
                {currentOfficeCode && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    {currentOfficeCode}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Responsible Officer
              </p>
              {currentHolderName ? (
                <div className="mt-1.5 flex items-center gap-2 min-w-0">
                  <Avatar
                    name={currentHolderName}
                    color={currentHolderColor ?? 'bg-slate-600'}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {currentHolderName}
                    </p>
                    {currentHolderPosition && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentHolderPosition}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-slate-500 inline-flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  Unassigned
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface JourneyEventCardProps {
  event: JourneyEvent;
  isLast: boolean;
}

function JourneyEventCard({ event, isLast }: JourneyEventCardProps) {
  const badge = stateBadge(event);
  const timestamp = new Date(event.timestamp);
  const isCurrent = event.state === 'current';

  const accentBorder = (() => {
    if (isCurrent) return 'border-brand-300 ring-1 ring-brand-100';
    if (event.state === 'rework' || isReworkStage(event.stage.id))
      return 'border-orange-200';
    if (event.stage.id === 'approved') return 'border-emerald-200';
    if (event.stage.id === 'rejected') return 'border-rose-200';
    if (event.stage.id === 'recommended') return 'border-indigo-200';
    if (event.stage.id === 'archived') return 'border-slate-300';
    if (event.state === 'pending') return 'border-slate-200 border-dashed';
    return 'border-slate-200';
  })();

  const accentBg = (() => {
    if (isCurrent) return 'bg-brand-50/40';
    if (event.stage.id === 'approved') return 'bg-emerald-50/40';
    if (event.stage.id === 'rejected') return 'bg-rose-50/40';
    if (event.stage.id === 'returned' || event.state === 'rework')
      return 'bg-orange-50/40';
    if (event.stage.id === 'recommended') return 'bg-indigo-50/40';
    if (event.state === 'pending') return 'bg-slate-50/40';
    return 'bg-white';
  })();

  return (
    <div
      className={cn(
        'rounded-md border p-3.5 sm:p-4 transition-colors',
        accentBorder,
        accentBg
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900">
              {event.stage.label}
            </h3>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{event.action}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-700 font-medium inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatDate(event.timestamp)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-400" />
            {timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-700 mt-2.5 leading-relaxed">
        {event.description}
      </p>

      {(event.fromOffice || event.toOffice) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {event.fromOffice && (
            <OfficeChip
              name={event.fromOffice.name}
              code={event.fromOffice.code}
              tone="slate"
            />
          )}
          {event.fromOffice && event.toOffice && (
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          {event.toOffice && (
            <OfficeChip
              name={event.toOffice.name}
              code={event.toOffice.code}
              tone="brand"
            />
          )}
        </div>
      )}

      {(event.actor || event.toActor) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {event.actor && (
            <ActorChip
              name={event.actor.fullName}
              position={event.actor.position}
              color={event.actor.avatarColor}
              role={
                event.stage.id === 'created' || event.stage.id === 'registered'
                  ? 'Encoder'
                  : event.stage.id === 'reviewed' || event.stage.id === 'recommended'
                    ? 'Reviewer'
                    : event.stage.id === 'approved' || event.stage.id === 'rejected' || event.stage.id === 'returned'
                      ? 'Authorizing Officer'
                      : event.stage.id === 'released'
                        ? 'Release Officer'
                        : event.stage.id === 'archived'
                          ? 'Records Officer'
                          : 'Actor'
              }
            />
          )}
          {event.toActor && event.toActor.id !== event.actor?.id && (
            <ActorChip
              name={event.toActor.fullName}
              position={event.toActor.position}
              color={event.toActor.avatarColor}
              role="Recipient"
              suffix
            />
          )}
        </div>
      )}

      {event.remarks && event.remarks !== event.description && (
        <div className="mt-3 p-2.5 rounded-md bg-white border border-slate-200">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-0.5">
            Remarks / Recommendation
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {event.remarks}
          </p>
        </div>
      )}

      {event.office && !event.fromOffice && !event.toOffice && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">{event.office.name}</span>
          <span className="font-mono text-slate-400">{event.office.code}</span>
        </div>
      )}

      {isCurrent && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
          </span>
          Awaiting next action
        </div>
      )}

      {isLast && event.state !== 'current' && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          Latest recorded step
        </div>
      )}
    </div>
  );
}

function OfficeChip({
  name,
  code,
  tone,
}: {
  name: string;
  code: string;
  tone: 'slate' | 'brand';
}) {
  const toneClass =
    tone === 'brand'
      ? 'bg-brand-50 text-brand-700 border-brand-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
        toneClass
      )}
    >
      <Building2 className="w-3 h-3" />
      <span className="font-medium truncate max-w-[180px]">{name}</span>
      <span className="font-mono text-[10px] opacity-80">{code}</span>
    </span>
  );
}

function ActorChip({
  name,
  position,
  color,
  role,
  suffix,
}: {
  name: string;
  position?: string;
  color: string;
  role: string;
  suffix?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
        'bg-white border-slate-200'
      )}
    >
      <Avatar name={name} color={color} size="xs" />
      <span className="min-w-0">
        <span className="block font-medium text-slate-900 truncate max-w-[180px]">
          {name}
        </span>
        <span className="block text-[10px] text-slate-500 truncate max-w-[180px]">
          {role}
          {position && position !== '—' ? ` · ${position}` : ''}
          {suffix ? ' (recipient)' : ''}
        </span>
      </span>
    </span>
  );
}
