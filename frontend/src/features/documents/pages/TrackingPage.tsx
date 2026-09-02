import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Activity,
  Inbox,
  CircleDot,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useDocumentRouting } from '@/features/documents/hooks/useDocumentRouting';
import { useOfficeLookup, useUserLookup } from '@/hooks/useLookups';
import {
  ALL_DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_WORKFLOW,
} from '@/constants';
import { formatRelative, cn, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import type { DocumentListItem } from '@/features/documents/types/document';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, normal: 2, low: 3,
};

const TERMINAL_COMPLETE_STATUSES = ['released', 'archived', 'rejected'];

function lifecycleProgress(status: string): number {
  if (TERMINAL_COMPLETE_STATUSES.includes(status)) return 100;
  if (status === 'returned') return Math.round((5 / DOCUMENT_WORKFLOW.length) * 100);
  const idx = DOCUMENT_WORKFLOW.indexOf(status);
  if (idx < 0) return 0;
  return Math.min(Math.round(((idx + 1) / DOCUMENT_WORKFLOW.length) * 100), 99);
}

export function TrackingPage() {
  const toast = useToast();
  const { items: documents } = useDocuments({ pageSize: 100 });
  const { steps: routingSteps } = useDocumentRouting(undefined);
  const officeById = useOfficeLookup();
  const userById = useUserLookup();
  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTERS.status);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter(d => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (q) {
          const haystack = `${d.trackingNumber} ${d.title} ${d.senderName ?? ''} ${d.tags.join(' ')}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const p = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        if (p !== 0) return p;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [documents, search, statusFilter]);

  const stats = useMemo(() => {
    const active = documents.filter(d =>
      ['registered', 'received', 'routed', 'assigned', 'under_review', 'recommended'].includes(d.status)
    ).length;
    const completed = documents.filter(d => d.status === 'released' || d.status === 'archived').length;
    const overdue = documents.filter(d => {
      if (!d.dueDate) return false;
      if (d.status === 'released' || d.status === 'archived' || d.status === 'rejected') return false;
      return new Date(d.dueDate).getTime() < new Date().getTime();
    }).length;
    const inMyQueue = documents.filter(d => d.currentHolderId).length;
    return { active, completed, overdue, inMyQueue };
  }, [documents]);

  const hasActiveFilters =
    search !== DEFAULT_FILTERS.search || statusFilter !== DEFAULT_FILTERS.status;

  const resetFilters = () => {
    setSearch(DEFAULT_FILTERS.search);
    setStatusFilter(DEFAULT_FILTERS.status);
    toast.info('Filters reset', 'Showing all tracked documents.');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Document Tracking"
        description="Real-time overview of every document across your workflow"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="In Transit" value={stats.active} icon={<Activity className="w-4 h-4" />} />
        <StatCard label="Awaiting Action" value={stats.inMyQueue} icon={<Inbox className="w-4 h-4" />} />
        <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="w-4 h-4" />} tone="success" />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertCircle className="w-4 h-4" />}
          tone="danger"
          hint={stats.overdue > 0 ? 'Needs attention' : undefined}
        />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-background border border-border text-muted-foreground flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              {hasActiveFilters && (
                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by tracking #, title, sender, or tags…"
              className="flex-1 min-w-0"
            />
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 lg:w-auto">
              <Select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 w-full sm:w-44"
                options={[
                  { value: 'all', label: 'All Status' },
                  ...ALL_DOCUMENT_STATUSES.map(s => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] })),
                ]}
              />
              <Button
                variant="outline"
                onClick={resetFilters}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                disabled={!hasActiveFilters}
                className="h-10"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No documents to track"
              description="Adjust your filters or check back later."
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
  hint?: string;
}) {
  const iconTone =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-600 border-rose-200'
        : 'bg-brand-50 text-brand-600 border-brand-200';

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 flex items-center gap-3 transition-shadow hover:shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', iconTone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        {hint && <p className="text-[10px] font-medium text-rose-600 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function DocumentCard({ doc }: { doc: DocumentListItem }) {
  const officeById = useOfficeLookup();
  const userById = useUserLookup();
  const { steps } = useDocumentRouting(doc.id);
  const office = officeById(doc.currentOfficeId);
  const holder = doc.currentHolderId ? userById(doc.currentHolderId) : null;
  const totalSteps = steps.length;
  const progress = lifecycleProgress(doc.status);
  const inProgressStep = steps.find(s => s.status === 'in_progress');
  const isOverdue = doc.dueDate &&
    doc.status !== 'released' && doc.status !== 'archived' && doc.status !== 'rejected' &&
    new Date(doc.dueDate).getTime() < new Date().getTime();
  const currentStop = inProgressStep ? officeById(inProgressStep.toOfficeId) : office;
  const nextStop = inProgressStep
    ? officeById(inProgressStep.toOfficeId)
    : steps.filter(s => s.status === 'pending')[0]
      ? officeById(steps.filter(s => s.status === 'pending')[0].toOfficeId)
      : null;

  return (
    <Link
      to={`/documents/${doc.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-4 sm:p-5 transition-all hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded px-1.5 py-0.5">
            {doc.trackingNumber}
          </span>
          <StatusBadge status={doc.status} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <PriorityBadge priority={doc.priority} />
          <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
        {doc.title}
      </h3>

      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Updated {formatRelative(doc.updatedAt)}</span>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2.5 text-xs">
        <DetailRow
          icon={<Building2 className="w-3.5 h-3.5" />}
          label="Office"
          value={office?.name}
          sub={office?.code}
        />
        <DetailRow
          icon={<MapPin className="w-3.5 h-3.5" />}
          label="Holder"
          value={holder?.fullName}
          sub={holder?.position ?? undefined}
          avatar={holder ? { name: holder.fullName, color: holder.avatarColor } : undefined}
        />
        <DetailRow
          icon={<CircleDot className="w-3.5 h-3.5" />}
          label="Due"
          value={doc.dueDate ? formatDate(doc.dueDate) : 'No deadline'}
          tone={isOverdue ? 'danger' : 'default'}
          badge={isOverdue ? 'Overdue' : undefined}
        />
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
            Progress
          </span>
          <span className="tabular-nums text-foreground font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span className="truncate">{currentStop?.code ?? '—'}</span>
          <span className="text-slate-300">to</span>
          <span className="font-medium text-foreground truncate">
            {nextStop?.code ?? (progress === 100 ? 'Complete' : '—')}
          </span>
        </div>
        {totalSteps === 0 && (
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            {DOCUMENT_STATUS_LABELS[doc.status]} · No routing steps recorded yet.
          </p>
        )}
      </div>
    </Link>
  );
}

function DetailRow({
  icon,
  label,
  value,
  sub,
  avatar,
  tone = 'default',
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  sub?: string;
  avatar?: { name: string; color: string };
  tone?: 'default' | 'danger';
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="w-11 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {avatar && <Avatar name={avatar.name} color={avatar.color} size="xs" />}
      <span className={cn(
        'truncate font-medium',
        tone === 'danger' ? 'text-rose-600' : 'text-slate-900'
      )}>
        {value ?? '—'}
      </span>
      {sub && <span className="text-muted-foreground truncate">· {sub}</span>}
      {badge && (
        <span className="ml-auto shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3" />
          {badge}
        </span>
      )}
    </div>
  );
}
