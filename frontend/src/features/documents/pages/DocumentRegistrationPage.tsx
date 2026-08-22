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
  Hash,
  AlertCircle,
  CheckCircle2,
  Info,
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
import { users } from '@/mocks/users';
import {
  ALL_DOCUMENT_TYPES,
  ALL_CLASSIFICATIONS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_CLASSIFICATION_LABELS,
} from '@/constants';
import type { DocumentAttachment, DocumentType, DocumentClassification } from '@/types';
import { registerDocument } from '@/lib/store';
import { cn } from '@/lib/utils';

interface FormState {
  documentNumber: string;
  title: string;
  type: DocumentType;
  classification: DocumentClassification;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  source: 'internal' | 'external';
  senderName: string;
  originatingOfficeId: string;
  receivingOfficeId: string;
  destinationOfficeId: string;
  assignedUserId: string;
  description: string;
  dateReceived: string;
  dueDate: string;
  tagsInput: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  documentNumber: '',
  title: '',
  type: 'memo',
  classification: 'internal',
  priority: 'normal',
  source: 'internal',
  senderName: '',
  originatingOfficeId: '',
  receivingOfficeId: '',
  destinationOfficeId: '',
  assignedUserId: '',
  description: '',
  dateReceived: new Date().toISOString().slice(0, 10),
  dueDate: '',
  tagsInput: '',
};

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function DocumentRegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_STATE,
    originatingOfficeId: user?.officeId ?? '',
  }));

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>(
    {} as Record<keyof FormState, boolean>
  );
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const tags = useMemo(
    () => form.tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    [form.tagsInput]
  );

  const assignedUsers = useMemo(() => {
    if (!form.receivingOfficeId) return [];
    return users.filter(
      u => u.officeId === form.receivingOfficeId && u.status === 'active'
    );
  }, [form.receivingOfficeId]);

  const validateField = (field: keyof FormState, value: string): string | undefined => {
    if (field === 'title' && !value.trim()) return 'Title is required';
    if (field === 'title' && value.trim().length < 5)
      return 'Title must be at least 5 characters';
    if (field === 'originatingOfficeId' && !value)
      return 'Originating office is required';
    if (field === 'receivingOfficeId' && !value)
      return 'Receiving office is required';
    if (field === 'destinationOfficeId' && !value)
      return 'Destination / responsible office is required';
    if (field === 'description' && !value.trim())
      return 'Description is required';
    if (field === 'description' && value.trim().length < 10)
      return 'Description must be at least 10 characters';
    if (field === 'senderName' && form.source === 'external' && !value.trim())
      return 'Sender name is required for external documents';
    if (field === 'dateReceived' && !value) return 'Date received is required';
    if (field === 'dueDate' && value) {
      const due = new Date(value).getTime();
      const recv = new Date(form.dateReceived).getTime();
      if (Number.isNaN(due) || Number.isNaN(recv)) return undefined;
      if (due < recv) return 'Due date must be on or after date received';
    }
    return undefined;
  };

  const validateAll = (state: FormState): FormErrors => {
    const next: FormErrors = {};
    (Object.keys(state) as Array<keyof FormState>).forEach(key => {
      const err = validateField(key, state[key]);
      if (err) next[key] = err;
    });
    return next;
  };

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (touched[field]) {
        const err = validateField(field, String(value ?? ''));
        setErrors(e => ({ ...e, [field]: err }));
      }
      if (field === 'source' && value === 'internal') {
        setErrors(e => ({ ...e, senderName: undefined }));
      }
      if (field === 'receivingOfficeId') {
        next.assignedUserId = '' as FormState['assignedUserId'];
      }
      return next;
    });
  };

  const markTouched = (field: keyof FormState) => {
    setTouched(t => ({ ...t, [field]: true }));
    const err = validateField(field, String(form[field] ?? ''));
    setErrors(e => ({ ...e, [field]: err }));
  };

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const accepted: File[] = [];
    arr.forEach(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error('File too large', `${f.name} exceeds 25MB limit.`);
        return;
      }
      if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$/i)) {
        toast.error('Unsupported file', `${f.name} is not a supported format.`);
        return;
      }
      accepted.push(f);
    });
    if (accepted.length > 0) {
      setFiles(prev => [...prev, ...accepted]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const submitRegistration = async (mode: 'register' | 'route') => {
    const allErrors = validateAll(form);
    setErrors(allErrors);
    setTouched(
      Object.keys(form).reduce(
        (acc, k) => ({ ...acc, [k]: true }),
        {} as Record<keyof FormState, boolean>
      )
    );
    if (Object.keys(allErrors).length > 0) {
      toast.error(
        'Please fix the errors',
        `${Object.keys(allErrors).length} field${Object.keys(allErrors).length === 1 ? '' : 's'} need${Object.keys(allErrors).length === 1 ? 's' : ''} attention.`
      );
      return;
    }
    if (!user) return;

    setSubmitting(true);
    await new Promise(r => setTimeout(r, 500));

    const attachments: Array<Omit<DocumentAttachment, 'id' | 'uploadedAt'>> = files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }));

    const doc = registerDocument({
      documentNumber: form.documentNumber.trim() || undefined,
      title: form.title,
      type: form.type,
      classification: form.classification,
      source: form.source,
      senderName: form.source === 'external' ? form.senderName : undefined,
      description: form.description,
      priority: form.priority,
      originatingOfficeId: form.originatingOfficeId,
      receivingOfficeId: form.receivingOfficeId || undefined,
      destinationOfficeId: form.destinationOfficeId || undefined,
      dateReceived: form.dateReceived || undefined,
      dueDate: form.dueDate || undefined,
      tags,
      attachments,
      encodedById: user.id,
      initialHolderId: form.assignedUserId || user.id,
      initialStatus: mode === 'route' ? 'in_routing' : 'registered',
    });

    setSubmitting(false);
    toast.success(
      mode === 'register' ? 'Document registered' : 'Document registered & routed',
      `${doc.trackingNumber} has been ${mode === 'register' ? 'successfully registered' : 'registered and forwarded to ' + (form.receivingOfficeId ? offices.find(o => o.id === form.receivingOfficeId)?.code : 'the receiving office')}.`
    );
    navigate(`/documents/${doc.id}`);
  };

  const requiredFieldsComplete =
    form.title.trim() &&
    form.originatingOfficeId &&
    form.receivingOfficeId &&
    form.destinationOfficeId &&
    form.description.trim() &&
    (form.source === 'internal' || form.senderName.trim());

  const errorCount = Object.keys(errors).filter(k => errors[k as keyof FormState]).length;

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
            <Button
              variant="outline"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={() => submitRegistration('register')}
              disabled={submitting}
            >
              Save
            </Button>
            <Button
              leftIcon={<Send className="w-4 h-4" />}
              onClick={() => submitRegistration('route')}
              loading={submitting}
            >
              Register & Route
            </Button>
          </>
        }
      />

      {errorCount > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-md border border-rose-200 bg-rose-50">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-900">
              {errorCount} validation {errorCount === 1 ? 'error' : 'errors'} found
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              Please review the highlighted fields below before submitting.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Document Identifiers"
              description="Tracking and document numbers uniquely identify this record"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Document Number"
                placeholder="Auto-generated if left blank"
                value={form.documentNumber}
                onChange={e => setField('documentNumber', e.target.value)}
                onBlur={() => markTouched('documentNumber')}
                leftIcon={<Hash className="w-4 h-4" />}
                error={errors.documentNumber}
                hint="The originating office's reference number, if available"
              />
              <Input
                label="Tracking Number"
                value="Auto-generated on submission"
                disabled
                readOnly
                leftIcon={<Hash className="w-4 h-4" />}
                hint="The system-assigned unique identifier (DMS-YYYY-NNNN)"
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Basic Information"
              description="General details about the document"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2 lg:col-span-3">
                <Input
                  label="Subject / Title"
                  required
                  placeholder="e.g., Request for Budget Allocation for Q3 2026"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  onBlur={() => markTouched('title')}
                  error={errors.title}
                />
              </div>
              <Select
                label="Document Type"
                required
                value={form.type}
                onChange={e => setField('type', e.target.value as DocumentType)}
                options={ALL_DOCUMENT_TYPES.map(t => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] }))}
              />
              <Select
                label="Classification / Confidentiality"
                required
                value={form.classification}
                onChange={e => setField('classification', e.target.value as DocumentClassification)}
                options={ALL_CLASSIFICATIONS.map(c => ({ value: c, label: DOCUMENT_CLASSIFICATION_LABELS[c] }))}
                hint="Determines who can access this document"
              />
              <Select
                label="Priority"
                value={form.priority}
                onChange={e => setField('priority', e.target.value as FormState['priority'])}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Source & Routing"
              description="Where the document came from and where it needs to go"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Originating Office"
                required
                value={form.originatingOfficeId}
                onChange={e => setField('originatingOfficeId', e.target.value)}
                onBlur={() => markTouched('originatingOfficeId')}
                error={errors.originatingOfficeId}
                options={[
                  { value: '', label: 'Choose originating office…' },
                  ...offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                ]}
              />
              <Select
                label="Source"
                value={form.source}
                onChange={e => setField('source', e.target.value as 'internal' | 'external')}
                options={[
                  { value: 'internal', label: 'Internal (from another office)' },
                  { value: 'external', label: 'External (from outside the agency)' },
                ]}
              />
              {form.source === 'external' && (
                <div className="md:col-span-2">
                  <Input
                    label="Source / Sender"
                    required
                    placeholder="e.g., Department of the Interior and Local Government"
                    value={form.senderName}
                    onChange={e => setField('senderName', e.target.value)}
                    onBlur={() => markTouched('senderName')}
                    error={errors.senderName}
                    leftIcon={<Send className="w-4 h-4" />}
                  />
                </div>
              )}
              <Select
                label="Receiving Office"
                required
                placeholder="Choose receiving office…"
                value={form.receivingOfficeId}
                onChange={e => setField('receivingOfficeId', e.target.value)}
                onBlur={() => markTouched('receivingOfficeId')}
                error={errors.receivingOfficeId}
                options={[
                  { value: '', label: 'Choose receiving office…' },
                  ...offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                ]}
                hint="Office that will receive the document first"
              />
              <Select
                label="Destination / Responsible Office"
                required
                placeholder="Choose destination office…"
                value={form.destinationOfficeId}
                onChange={e => setField('destinationOfficeId', e.target.value)}
                onBlur={() => markTouched('destinationOfficeId')}
                error={errors.destinationOfficeId}
                options={[
                  { value: '', label: 'Choose destination office…' },
                  ...offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                ]}
                hint="Final office responsible for action"
              />
              <Select
                label="Assigned Officer (Optional)"
                placeholder={
                  form.receivingOfficeId ? 'Choose officer…' : 'Select receiving office first'
                }
                value={form.assignedUserId}
                onChange={e => setField('assignedUserId', e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...assignedUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.position})` })),
                ]}
                disabled={!form.receivingOfficeId}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  required
                  rows={4}
                  placeholder="Brief description of the document's content, purpose, and any action required…"
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  onBlur={() => markTouched('description')}
                  error={errors.description}
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
                  required
                  value={form.dateReceived}
                  onChange={e => setField('dateReceived', e.target.value)}
                  onBlur={() => markTouched('dateReceived')}
                  error={errors.dateReceived}
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  type="date"
                  label="Due Date"
                  value={form.dueDate}
                  onChange={e => setField('dueDate', e.target.value)}
                  onBlur={() => markTouched('dueDate')}
                  error={errors.dueDate}
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
                onChange={e => setField('tagsInput', e.target.value)}
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
            <CardHeader
              title="Attachments"
              description="Upload supporting files (PDF, images, documents)"
            />
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              onClick={() => document.getElementById('file-input')?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                dragOver ? 'border-brand-500 bg-brand-50/50' : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50/30'
              )}
            >
              <input
                id="file-input"
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                onChange={e => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {dragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, WEBP (max 25MB per file)
              </p>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
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
                        <p className="text-xs text-slate-500">
                          {(f.size / 1024).toFixed(1)} KB · {f.type || 'file'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-500 text-center pt-1">
                  {files.length} file{files.length === 1 ? '' : 's'} attached
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader
              title="Completion"
              description="Form readiness overview"
            />
            <div className="space-y-2.5">
              <ChecklistItem
                ok={!!form.title.trim() && form.title.trim().length >= 5}
                label="Title is filled"
              />
              <ChecklistItem
                ok={!!form.originatingOfficeId}
                label="Originating office selected"
              />
              <ChecklistItem
                ok={!!form.receivingOfficeId}
                label="Receiving office selected"
              />
              <ChecklistItem
                ok={!!form.destinationOfficeId}
                label="Destination office selected"
              />
              <ChecklistItem
                ok={form.source === 'internal' || !!form.senderName.trim()}
                label="Source / sender specified"
              />
              <ChecklistItem
                ok={!!form.description.trim() && form.description.trim().length >= 10}
                label="Description is detailed"
              />
              <ChecklistItem
                ok={!!form.dateReceived}
                label="Date received is set"
              />
            </div>
            {requiredFieldsComplete && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Required fields complete
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Submission Summary"
              description="Quick overview before submission"
            />
            <dl className="space-y-3 text-sm">
              <SummaryRow
                label="Type"
                value={DOCUMENT_TYPE_LABELS[form.type]}
              />
              <SummaryRow
                label="Classification"
                value={DOCUMENT_CLASSIFICATION_LABELS[form.classification]}
              />
              <SummaryRow label="Priority" value={<span className="capitalize">{form.priority}</span>} />
              <SummaryRow label="Source" value={<span className="capitalize">{form.source}</span>} />
              <SummaryRow
                label="Originating"
                value={offices.find(o => o.id === form.originatingOfficeId)?.code ?? '—'}
              />
              <SummaryRow
                label="Receiving"
                value={offices.find(o => o.id === form.receivingOfficeId)?.code ?? '—'}
              />
              <SummaryRow
                label="Destination"
                value={offices.find(o => o.id === form.destinationOfficeId)?.code ?? '—'}
              />
              <SummaryRow
                label="Tags"
                value={tags.length > 0 ? tags.map(t => `#${t}`).join(' ') : '—'}
              />
              <SummaryRow label="Attachments" value={`${files.length} file${files.length === 1 ? '' : 's'}`} />
            </dl>
          </Card>

          <Card>
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Workflow tip</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Use <strong>Register &amp; Route</strong> to forward the document to the receiving
                  office immediately. Use <strong>Save</strong> to keep it on hold for review.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className="font-medium text-slate-900 text-right truncate max-w-[180px]">{value}</dd>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
      )}
      <span className={ok ? 'text-slate-700' : 'text-slate-500'}>{label}</span>
    </div>
  );
}
