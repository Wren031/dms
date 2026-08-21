import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  ArrowLeft,
  Paperclip,
  Save,
  Send,
  X,
  FileText,
  Calendar,
  Tag as TagIcon,
  Upload,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { offices } from '@/mocks/offices';
import {
  ALL_DOCUMENT_TYPES,
  ALL_CLASSIFICATIONS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
} from '@/constants';

export function DocumentRegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    title: '',
    type: 'memo',
    classification: 'internal',
    source: 'internal',
    originatingOfficeId: user?.officeId ?? 'off-002',
    senderName: '',
    description: '',
    priority: 'normal',
    dateReceived: new Date().toISOString().slice(0, 10),
    dueDate: '',
    tagsInput: '',
  });

  const [files, setFiles] = useState<Array<{ name: string; size: number }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const tags = useMemo(() =>
    form.tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    [form.tagsInput]
  );

  const handleSubmit = async (action: 'draft' | 'submit') => {
    if (!form.title.trim()) {
      toast.error('Missing title', 'Please provide a document title.');
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    setSubmitting(false);
    const trackingNumber = `DMS-2026-${String(Math.floor(Math.random() * 9000) + 100).padStart(4, '0')}`;
    toast.success(
      action === 'draft' ? 'Saved as draft' : 'Document registered',
      `${trackingNumber} has been ${action === 'draft' ? 'saved' : 'successfully registered'}.`
    );
    navigate('/documents');
  };

  const addFile = () => {
    const fakeName = `Attachment_${files.length + 1}.pdf`;
    const fakeSize = Math.floor(Math.random() * 4 * 1024 * 1024) + 200 * 1024;
    setFiles([...files, { name: fakeName, size: fakeSize }]);
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs text-slate-600 hover:text-brand-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back
        </button>
      </div>

      <PageHeader
        title="Register New Document"
        description="Encode a new document into the system. Fields marked with * are required."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/documents')}>
              Cancel
            </Button>
            <Button variant="outline" leftIcon={<Save className="w-4 h-4" />} onClick={() => handleSubmit('draft')}>
              Save as Draft
            </Button>
            <Button leftIcon={<Send className="w-4 h-4" />} onClick={() => handleSubmit('submit')} loading={submitting}>
              Register & Submit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Basic Information" description="General details about the document" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2 lg:col-span-3">
                <Input
                  label="Document Title"
                  required
                  placeholder="e.g., Request for Budget Allocation for Q3 2026"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <Select
                label="Document Type"
                required
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                options={ALL_DOCUMENT_TYPES.map(t => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] }))}
              />
              <Select
                label="Classification"
                required
                value={form.classification}
                onChange={e => setForm({ ...form, classification: e.target.value })}
                options={ALL_CLASSIFICATIONS.map(c => ({ value: c, label: DOCUMENT_CLASSIFICATION_LABELS[c] }))}
                hint="Classification determines access controls"
              />
              <Select
                label="Priority Level"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
              <Select
                label="Originating Office"
                required
                value={form.originatingOfficeId}
                onChange={e => setForm({ ...form, originatingOfficeId: e.target.value })}
                options={offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
              />
              <Select
                label="Source"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
                options={[
                  { value: 'internal', label: 'Internal (from another office)' },
                  { value: 'external', label: 'External (from outside the agency)' },
                ]}
              />
              {form.source === 'external' && (
                <Input
                  label="Sender Name / Organization"
                  placeholder="e.g., Department of the Interior and Local Government"
                  value={form.senderName}
                  onChange={e => setForm({ ...form, senderName: e.target.value })}
                />
              )}
              <div className="md:col-span-2 lg:col-span-3">
                <Textarea
                  label="Description / Subject"
                  rows={4}
                  placeholder="Brief description of the document's content and purpose…"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Timeline" description="Important dates for tracking" />
              <div className="space-y-4">
                <Input
                  type="date"
                  label="Date Received"
                  value={form.dateReceived}
                  onChange={e => setForm({ ...form, dateReceived: e.target.value })}
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  type="date"
                  label="Due Date"
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  hint="Optional. Set a deadline if applicable."
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Tags" description="Comma-separated for searching" />
              <Input
                leftIcon={<TagIcon className="w-4 h-4" />}
                placeholder="e.g., budget, infrastructure, 2026"
                value={form.tagsInput}
                onChange={e => setForm({ ...form, tagsInput: e.target.value })}
                hint="Separate tags with commas"
              />
              {tags.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {tags.map(t => (
                    <Badge key={t} variant="slate" size="sm">#{t}</Badge>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Attachments" description="Upload supporting files (PDF, images, documents)" />
            {files.length === 0 ? (
              <div
                onClick={addFile}
                className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG (max 25MB per file)</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-3 rounded-md border border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{f.name}</p>
                        <p className="text-xs text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addFile}
                  className="w-full border border-dashed border-slate-300 rounded-md p-3 text-sm text-slate-600 hover:text-brand-700 hover:border-brand-400"
                >
                  + Add another file
                </button>
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader title="Routing Recommendation" description="Suggested initial route after registration" />
            <div className="space-y-4">
              <Select
                label="Initial Routing Office"
                placeholder="Choose office…"
                options={offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
              />
              <Select
                label="Assigned Officer"
                placeholder="Choose officer…"
                options={[]}
                hint="Select an office first to see available officers"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Submission Summary" description="Quick overview before submission" />
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {DOCUMENT_TYPE_LABELS[form.type as keyof typeof DOCUMENT_TYPE_LABELS] ?? '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Classification</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {DOCUMENT_CLASSIFICATION_LABELS[form.classification as keyof typeof DOCUMENT_CLASSIFICATION_LABELS] ?? '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Priority</dt>
                <dd className="font-medium text-slate-900 text-right capitalize">{form.priority}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Source</dt>
                <dd className="font-medium text-slate-900 text-right capitalize">{form.source}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Originating Office</dt>
                <dd className="font-medium text-slate-900 text-right truncate max-w-[180px]">
                  {offices.find(o => o.id === form.originatingOfficeId)?.name ?? '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Tags</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {tags.length > 0 ? tags.map(t => `#${t}`).join(' ') : '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Attachments</dt>
                <dd className="font-medium text-slate-900 text-right">{files.length}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
