import { useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';
import type { DocumentDetail } from '@/features/documents/types/document';
import type { LookupUser } from '@/hooks/useLookups';

interface RecipientTrackingProps {
  document: DocumentDetail;
  userById: (id: string | null | undefined) => LookupUser | undefined;
}

export function RecipientTracking({ document: doc, userById }: RecipientTrackingProps) {
  const recipients = doc.recipients;

  const summary = useMemo(() => {
    const total = recipients.length;
    const received = recipients.filter(r => r.status === 'received').length;
    const pending = total - received;
    const progress = total > 0 ? Math.round((received / total) * 100) : 0;
    return { total, received, pending, progress };
  }, [recipients]);

  return (
    <Card padded={false}>
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Recipient Tracking</h2>
          <p className="text-xs text-slate-500">
            Per-office receiving status — each office acknowledges receipt independently.
          </p>
        </div>
      </div>

      {summary.total === 0 ? (
        <div className="px-5 py-6">
          <EmptyState
            icon={<Building2 className="w-6 h-6" />}
            title="No recipients"
            description="No receiving office has been designated for this document."
          />
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryTile
              icon={<Building2 className="w-4 h-4" />}
              label="Offices"
              value={summary.total}
              tone="indigo"
            />
            <SummaryTile
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Received"
              value={summary.received}
              tone="emerald"
            />
            <SummaryTile
              icon={<Clock className="w-4 h-4" />}
              label="Not Received"
              value={summary.pending}
              tone="amber"
            />
            <SummaryTile
              icon={null}
              label="Progress"
              value={`${summary.progress}%`}
              tone="slate"
            />
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${summary.progress}%` }}
            />
          </div>

          <Table
            data={recipients}
            keyExtractor={r => r.id}
            columns={[
              {
                key: 'office',
                header: 'Destination Office',
                cell: r => (
                  <div>
                    <p className="font-medium text-slate-900">{r.office.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{r.office.code}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Receiving Status',
                width: '140px',
                cell: r =>
                  r.status === 'received' ? (
                    <Badge variant="emerald" size="sm">Received</Badge>
                  ) : (
                    <Badge variant="amber" size="sm">Not Received</Badge>
                  ),
              },
              {
                key: 'receivedBy',
                header: 'Received By',
                width: '180px',
                cell: r => {
                  if (r.status !== 'received' || !r.receivedById) {
                    return <span className="text-xs text-slate-400">—</span>;
                  }
                  const person = userById(r.receivedById);
                  return (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {person?.fullName ?? 'Unknown'}
                    </span>
                  );
                },
              },
              {
                key: 'receivedAt',
                header: 'Received Date & Time',
                width: '170px',
                cell: r =>
                  r.status === 'received' && r.receivedAt ? (
                    <span className="text-xs text-slate-700">
                      {formatDate(r.receivedAt, true)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  ),
              },
              {
                key: 'remarks',
                header: 'Remarks',
                cell: r =>
                  r.remarks ? (
                    <span className="text-xs text-slate-600 line-clamp-2">{r.remarks}</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  ),
              },
            ]}
          />
        </div>
      )}
    </Card>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: 'indigo' | 'emerald' | 'amber' | 'slate';
}) {
  const tones: Record<typeof tone, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <div className={cn('rounded-md border p-3 flex items-center gap-2.5', tones[tone])}>
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight">{value}</p>
        <p className="text-[11px] text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}