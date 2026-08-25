import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageOpen,
  CheckCircle2,
  Building2,
  User as UserIcon,
  Calendar,
  Send,
  Eye,
  Paperclip,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useDocumentTransition } from '@/features/documents/hooks/useDocumentTransition';
import { getOfficeById } from '@/mocks/offices';
import { getUserById, users } from '@/mocks/users';
import { DOCUMENT_TYPE_LABELS } from '@/constants';
import { formatDate, formatRelative } from '@/lib/utils';

export function ReleasePage() {
  const toast = useToast();
  const { items: documents } = useDocuments({ pageSize: 100 });
  const transition = useDocumentTransition();
  const [tab, setTab] = useState('ready');
  const [releaseModal, setReleaseModal] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [recipientType, setRecipientType] = useState('user');
  const [remarks, setRemarks] = useState('');
  const [notifyRecipient, setNotifyRecipient] = useState(true);

  const readyToRelease = useMemo(() => documents.filter(d => d.status === 'approved'), [documents]);
  const released = useMemo(() => documents.filter(d => d.status === 'released' || d.status === 'archived'), [documents]);

  const counts = {
    ready: readyToRelease.length,
    released: released.length,
  };

  const list = tab === 'ready' ? readyToRelease : released;
  const pagination = usePagination({ totalItems: list.length, initialPageSize: 10 });
  const paged = list.slice(pagination.start, pagination.end);

  const handleRelease = (docId: string) => {
    setReleaseModal(docId);
    setRecipient('');
    setRemarks('');
    setNotifyRecipient(true);
  };

  const submitRelease = () => {
    if (!recipient) {
      toast.error('Recipient required', 'Please specify who will receive this document.');
      return;
    }
    if (!releaseModal) return;
    void transition.transition(releaseModal, {
      toStatus: 'released',
      remarks: remarks.trim() || undefined,
    }).then(updated => {
      if (updated) {
        toast.success('Document released', 'The document has been released and the recipient notified.');
        setReleaseModal(null);
      } else {
        toast.error('Release failed', transition.error ?? 'Please retry.');
      }
    });
  };

  const recipientOptions = users.filter(u => u.status === 'active');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Release"
        description="Release approved documents to recipients and finalize the workflow"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader title="Release Summary" />
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md border border-amber-200 bg-amber-50">
              <div>
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Ready to Release</p>
                <p className="text-2xl font-semibold text-amber-900 mt-1">{counts.ready}</p>
              </div>
              <PackageOpen className="w-8 h-8 text-amber-600" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-md border border-emerald-200 bg-emerald-50">
              <div>
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Released</p>
                <p className="text-2xl font-semibold text-emerald-900 mt-1">{counts.released}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Release Process" description="Standard workflow for releasing documents" />
          <ol className="space-y-2.5">
            {[
              { title: 'Verify Approval', desc: 'Confirm the document has been approved by the appropriate authority' },
              { title: 'Select Recipient', desc: 'Choose the receiving office or person' },
              { title: 'Add Remarks', desc: 'Document any special handling instructions' },
              { title: 'Send Notification', desc: 'Notify the recipient and update tracking' },
              { title: 'Mark as Released', desc: 'Finalize the workflow and prepare for archival' },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-md border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center text-xs font-semibold shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="text-xs text-slate-600">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'ready', label: 'Ready to Release', count: counts.ready, icon: <PackageOpen className="w-4 h-4" /> },
              { id: 'released', label: 'Released', count: counts.released, icon: <CheckCircle2 className="w-4 h-4" /> },
            ]}
          />
        </div>

        <Table
          data={paged}
          keyExtractor={d => d.id}
          emptyState={
            <EmptyState
              icon={<PackageOpen className="w-7 h-7" />}
              title={tab === 'ready' ? 'No documents ready' : 'No released documents'}
              description={tab === 'ready' ? 'Approved documents will appear here for release.' : 'Released documents will be listed here.'}
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
              key: 'attachments',
              header: 'Attachments',
              width: '110px',
              cell: d => (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Paperclip className="w-3.5 h-3.5" />
                  {d.attachments?.length ?? d.attachmentCount ?? 0}
                </div>
              ),
            },
            {
              key: 'office',
              header: 'Office',
              width: '170px',
              cell: d => {
                const office = getOfficeById(d.currentOfficeId);
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
              key: 'status',
              header: 'Status',
              width: '130px',
              cell: d => <StatusBadge status={d.status} />,
            },
            {
              key: 'updated',
              header: 'Updated',
              width: '130px',
              cell: d => (
                <div className="text-xs">
                  <p className="text-slate-700">{formatDate(d.updatedAt)}</p>
                  <p className="text-slate-400 text-[10px]">{formatRelative(d.updatedAt)}</p>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Action',
              width: '140px',
              align: 'right',
              cell: d => (
                d.status === 'approved' ? (
                  <Button size="sm" leftIcon={<Send className="w-3.5 h-3.5" />} onClick={() => handleRelease(d.id)}>
                    Release
                  </Button>
                ) : (
                  <Link to={`/documents/${d.id}`}>
                    <Button size="sm" variant="ghost" leftIcon={<Eye className="w-3 h-3" />}>View</Button>
                  </Link>
                )
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
        open={!!releaseModal}
        onClose={() => setReleaseModal(null)}
        title="Release Document"
        description="Finalize and release this document to the recipient"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setReleaseModal(null)}>Cancel</Button>
            <Button leftIcon={<Send className="w-4 h-4" />} onClick={submitRelease}>
              Confirm Release
            </Button>
          </>
        }
      >
        {releaseModal && (() => {
          const doc = documents.find(d => d.id === releaseModal);
          if (!doc) return null;
          return (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Document</p>
                <p className="text-sm font-semibold text-slate-900">{doc.trackingNumber} · {doc.title}</p>
              </div>
              <Select
                label="Recipient Type"
                value={recipientType}
                onChange={e => setRecipientType(e.target.value)}
                options={[
                  { value: 'user', label: 'Internal User' },
                  { value: 'office', label: 'External Office / Organization' },
                ]}
              />
              <Select
                label="Recipient"
                required
                placeholder={recipientType === 'user' ? 'Choose user…' : 'Enter organization name…'}
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                options={recipientType === 'user' ? recipientOptions.map(u => ({ value: u.id, label: `${u.fullName} (${u.position})` })) : []}
              />
              <Textarea
                label="Release Remarks"
                rows={3}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Optional release notes…"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyRecipient}
                  onChange={e => setNotifyRecipient(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Send email notification to recipient</span>
              </label>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
