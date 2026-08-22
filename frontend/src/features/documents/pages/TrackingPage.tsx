import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Building2,
  User as UserIcon,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { useDocuments, useRoutingSteps } from '@/lib/store';
import { getOfficeById } from '@/mocks/offices';
import { getUserById } from '@/mocks/users';
import {
  ALL_DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
} from '@/constants';
import { formatRelative, cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import type { Document } from '@/types';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, normal: 2, low: 3,
};

export function TrackingPage() {
  const toast = useToast();
  const documents = useDocuments();
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
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const active = documents.filter(d =>
      ['registered', 'received', 'in_routing', 'under_review', 'recommended'].includes(d.status)
    ).length;
    const completed = documents.filter(d => d.status === 'released' || d.status === 'archived').length;
    const overdue = documents.filter(d => {
      if (!d.dueDate) return false;
      if (d.status === 'released' || d.status === 'archived' || d.status === 'rejected') return false;
      return new Date(d.dueDate).getTime() < new Date().getTime();
    }).length;
    const inMyQueue = documents.filter(d => d.currentHolderId).length;
    return { active, completed, overdue, inMyQueue };
  }, []);

  const hasActiveFilters =
    search !== DEFAULT_FILTERS.search || statusFilter !== DEFAULT_FILTERS.status;

  const resetFilters = () => {
    setSearch(DEFAULT_FILTERS.search);
    setStatusFilter(DEFAULT_FILTERS.status);
    toast.info('Filters reset', 'Showing all tracked documents.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Tracking"
        description="Real-time tracking of all documents across the workflow"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="In Transit" value={stats.active} icon={<Activity className="w-4 h-4" />} />
        <StatTile label="Awaiting Action" value={stats.inMyQueue} icon={<Inbox className="w-4 h-4" />} />
        <StatTile label="Completed" value={stats.completed} icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatTile label="Overdue" value={stats.overdue} icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      <Card padded={false}>
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
            {hasActiveFilters && (
              <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                ACTIVE
              </span>
            )}
            <span className="ml-auto text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'document' : 'documents'} tracked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_auto] gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by tracking #, title, sender, or tags…"
              className="h-11"
              inputClassName="h-11 text-base"
            />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                ...ALL_DOCUMENT_STATUSES.map(s => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] })),
              ]}
              className="h-11"
            />
            <Button
              variant="outline"
              onClick={resetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              disabled={!hasActiveFilters}
              className="h-11"
            >
              Reset
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
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
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(doc => (
              <DocumentTracker key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 hover:border-slate-300 transition-colors">
      <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-slate-900 tabular-nums leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function DocumentTracker({ doc }: { doc: Document }) {
  const steps = useRoutingSteps(doc.id);

  const office = getOfficeById(doc.currentOfficeId);
  const holder = doc.currentHolderId ? getUserById(doc.currentHolderId) : null;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  const inProgressStep = steps.find(s => s.status === 'in_progress');
  const isOverdue = doc.dueDate &&
    doc.status !== 'released' && doc.status !== 'archived' && doc.status !== 'rejected' &&
    new Date(doc.dueDate).getTime() < new Date().getTime();

  return (
    <div className="px-4 sm:px-5 py-4 hover:bg-slate-50/50 transition-colors">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-4 xl:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Link
              to={`/documents/${doc.id}`}
              className="font-mono text-[11px] font-semibold text-brand-700 hover:underline"
            >
              {doc.trackingNumber}
            </Link>
            <StatusBadge status={doc.status} />
            <PriorityBadge priority={doc.priority} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>
          <Link
            to={`/documents/${doc.id}`}
            className="block text-sm font-semibold text-slate-900 hover:text-brand-700 line-clamp-2 leading-snug"
          >
            {doc.title}
          </Link>
          <p className="text-[11px] text-slate-500 mt-1">
            Updated {formatRelative(doc.updatedAt)}
          </p>

          <div className="mt-3 space-y-1.5 text-xs">
            <Field icon={<Building2 className="w-3.5 h-3.5" />} label="Office" value={office?.name} sub={office?.code} />
            <Field
              icon={<UserIcon className="w-3.5 h-3.5" />}
              label="Holder"
              value={holder?.fullName}
              sub={holder?.position}
              avatar={holder ? { name: holder.fullName, color: holder.avatarColor } : undefined}
            />
            <Field
              icon={<Calendar className="w-3.5 h-3.5" />}
              label="Due"
              value={doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline'}
              valueClassName={isOverdue ? 'text-rose-600 font-semibold' : undefined}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Link
              to={`/documents/${doc.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View details
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          {totalSteps > 0 ? (
            <>
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="font-semibold uppercase tracking-wider text-slate-500">
                  Routing Progress
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold text-slate-900">{completedSteps}</span>
                  <span className="text-slate-400"> / {totalSteps}</span>
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <ol className="relative">
                {steps.map((step, idx) => {
                  const fromOffice = getOfficeById(step.fromOfficeId);
                  const toOffice = getOfficeById(step.toOfficeId);
                  const toUser = step.toUserId ? getUserById(step.toUserId) : null;
                  const completed = step.status === 'completed';
                  const inProgress = step.status === 'in_progress';
                  const returned = step.status === 'returned';
                  const isLast = idx === steps.length - 1;
                  return (
                    <li key={step.id} className={cn('relative pl-7', !isLast && 'pb-3')}>
                      {!isLast && (
                        <span
                          className={cn(
                            'absolute left-[7px] top-3.5 bottom-0 w-px',
                            completed ? 'bg-emerald-300' : 'bg-slate-200'
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          'absolute left-0.5 top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center bg-white',
                          completed ? 'border-emerald-500' :
                          inProgress ? 'border-amber-500' :
                          returned ? 'border-rose-500' :
                          'border-slate-300'
                        )}
                      >
                        {completed && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                        {inProgress && <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />}
                        {returned && <span className="w-1 h-1 rounded-full bg-rose-500" />}
                      </span>
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
                          <span className="text-slate-400 font-mono shrink-0">{step.sequence}.</span>
                          <span className="text-slate-600 font-medium truncate">{fromOffice?.code}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                          <span className="text-slate-900 font-semibold truncate">{toOffice?.code}</span>
                          {toUser && (
                            <span className="text-slate-500 truncate hidden sm:inline">· {toUser.fullName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              'text-[10px] font-semibold uppercase tracking-wider',
                              completed ? 'text-emerald-700' :
                              inProgress ? 'text-amber-700' :
                              returned ? 'text-rose-700' :
                              'text-slate-500'
                            )}
                          >
                            {step.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <div className="text-xs text-slate-500 italic">No routing steps recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  sub,
  avatar,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  sub?: string;
  avatar?: { name: string; color: string };
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">{label}</span>
      {avatar && <Avatar name={avatar.name} color={avatar.color} size="xs" />}
      <span className={cn('truncate font-medium text-slate-900', valueClassName)}>{value ?? '—'}</span>
      {sub && <span className="text-slate-500 truncate">· {sub}</span>}
    </div>
  );
}
