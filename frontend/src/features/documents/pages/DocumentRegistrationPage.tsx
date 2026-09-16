import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  Building2,
  Route,
  Users,
  Paperclip,
  FileInput,
  ClipboardList,
  ShieldCheck,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { SearchInput } from '@/components/ui/SearchInput';
import { DraftIndicator } from '@/components/ui/DraftIndicator';
import { useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import {
  ALL_CLASSIFICATIONS,
  DOCUMENT_CLASSIFICATION_LABELS,
} from '@/constants';
import type { DocumentClassification } from '@/types';
import { useDocumentTypes } from '@/features/system-admin/document-type/hooks/useDocumentTypes';
import { useRegisterDocument } from '@/features/documents/hooks/useRegisterDocument';
import { attachmentsService } from '@/features/documents/services/documents.service';
import { useRoutingOptions } from '@/features/documents/hooks/useRoutingOptions';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FORM_DRAFT_KEYS } from '@/lib/formDraftKeys';
import { cn } from '@/lib/utils';

interface FormState {
  documentNumber: string;
  title: string;
  type: string;
  classification: DocumentClassification;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  source: 'internal' | 'external';
  senderName: string;
  originMode: 'manual' | 'select' | '';
  originatingOfficeId: string;
  originatingOfficeName: string;
  allOffices: boolean;
  recipientOfficeIds: string[];
  assignedUserId: string;
  description: string;
  dueDate: string;
  tagsInput: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  documentNumber: '',
  title: '',
  type: '',
  classification: 'internal',
  priority: 'normal',
  source: 'internal',
  senderName: '',
  originMode: '',
  originatingOfficeId: '',
  originatingOfficeName: '',
  allOffices: true,
  recipientOfficeIds: [],
  assignedUserId: '',
  description: '',
  dueDate: '',
  tagsInput: '',
};

const ORIGIN_KEYS: Array<keyof FormState> = [
  'originMode',
  'originatingOfficeId',
  'originatingOfficeName',
];

function defaultOrigin(officeId: string): Partial<FormState> {
  return officeId
    ? { originMode: 'select' as const, originatingOfficeId: officeId }
    : {};
}

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

interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
}

export function DocumentRegistrationPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const { items: documentTypes } = useDocumentTypes({ pageSize: 100, isActive: true });
  const registration = useRegisterDocument();
  const { offices, loading: officesLoading, error: officesError } = useOffices();
  const { users: routingUsers, loading: usersLoading, error: usersError } = useRoutingOptions();

  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_STATE,
    ...defaultOrigin(user.officeId),
  }));

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>(
    {} as Record<keyof FormState, boolean>
  );
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [restoredAttachmentMeta, setRestoredAttachmentMeta] = useState<AttachmentMeta[]>([]);

  const formDraft = useFormDraft(FORM_DRAFT_KEYS.DOCUMENT_REGISTER, {
    onRestore: payload => {
      const restored: Partial<FormState> = {};
      for (const key of Object.keys(INITIAL_STATE) as Array<keyof FormState>) {
        const v = payload[key as string];
        if (v === undefined) continue;
        if (ORIGIN_KEYS.includes(key) && v === '') continue;
        (restored as Record<string, unknown>)[key] = v;
      }
      if (Object.keys(restored).length > 0) {
        setForm(prev => ({ ...prev, ...restored }));
      }
      const rawAttachments = payload.attachments;
      if (Array.isArray(rawAttachments)) {
        const meta: AttachmentMeta[] = [];
        for (const item of rawAttachments) {
          if (
            item &&
            typeof item === 'object' &&
            typeof (item as AttachmentMeta).name === 'string' &&
            typeof (item as AttachmentMeta).size === 'number' &&
            typeof (item as AttachmentMeta).type === 'string'
          ) {
            meta.push({
              name: (item as AttachmentMeta).name,
              size: (item as AttachmentMeta).size,
              type: (item as AttachmentMeta).type,
            });
          }
        }
        if (meta.length > 0) setRestoredAttachmentMeta(meta);
      }
    },
  });

  const tags = useMemo(
    () => form.tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    [form.tagsInput]
  );

  const formRef = useRef(form);
  formRef.current = form;
  const updateForm = useCallback(
    (next: FormState) => {
      setForm(next);
      const attachmentsMeta = files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      formDraft.saveDraft({
        ...(next as unknown as Record<string, unknown>),
        attachments: attachmentsMeta,
      });
    },
    [files, formDraft],
  );

  const filteredRecipientOffices = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return offices;
    return offices.filter(
      o => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    );
  }, [offices, recipientSearch]);

  const assignedUsers = useMemo(() => {
    // Officers are scoped to the current authenticated user's office since the
    // document is held by the encoder at registration time.
    return routingUsers.filter(option => option.officeId === user.officeId);
  }, [routingUsers, user.officeId]);

  useEffect(() => {
    if (officesLoading || offices.length === 0) return;
    const officeIds = new Set(offices.map(office => office.id));
    const routingUserIds = new Set(routingUsers.map(option => option.id));
    setForm(previous => {
      const originatingOfficeId = officeIds.has(previous.originatingOfficeId)
        ? previous.originatingOfficeId
        : '';
      const recipientOfficeIds = previous.recipientOfficeIds.filter(id => officeIds.has(id));
      const assignedUserId = routingUserIds.has(previous.assignedUserId)
        ? previous.assignedUserId
        : '';

      const originUntouched =
        previous.originMode === '' &&
        !previous.originatingOfficeId &&
        !previous.originatingOfficeName;
      const currentOfficeId = user.officeId && officeIds.has(user.officeId) ? user.officeId : '';
      const origin = originUntouched && currentOfficeId
        ? { originMode: 'select' as const, originatingOfficeId: currentOfficeId }
        : { originMode: previous.originMode, originatingOfficeId };

      if (
        origin.originMode === previous.originMode &&
        origin.originatingOfficeId === previous.originatingOfficeId &&
        recipientOfficeIds.length === previous.recipientOfficeIds.length &&
        assignedUserId === previous.assignedUserId
      ) {
        return previous;
      }

      return {
        ...previous,
        ...origin,
        recipientOfficeIds,
        assignedUserId,
      };
    });
  }, [offices, officesLoading, routingUsers, user.officeId]);

  const validateField = (field: keyof FormState, value: string): string | undefined => {
    if (field === 'title' && !value.trim()) return 'Title is required';
    if (field === 'title' && value.trim().length < 5)
      return 'Title must be at least 5 characters';
    if (field === 'description' && !value.trim())
      return 'Description is required';
    if (field === 'description' && value.trim().length < 10)
      return 'Description must be at least 10 characters';
    if (field === 'senderName' && form.source === 'external' && !value.trim())
      return 'Sender name is required for external documents';
    if (field === 'dueDate' && value) {
      const due = new Date(value).getTime();
      if (Number.isNaN(due)) return undefined;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today.getTime()) return 'Due date must be on or after today';
    }
    return undefined;
  };

  const getOriginValue = (state: FormState): string =>
    state.originMode === 'select'
      ? state.originatingOfficeId
      : state.originMode === 'manual'
        ? state.originatingOfficeName
        : '';

  const validateOrigin = (state: FormState): string | undefined => {
    if (!state.originMode) return 'Choose how to specify the originating office';
    if (state.originMode === 'select' && !state.originatingOfficeId)
      return 'Select an originating office';
    if (state.originMode === 'manual' && !state.originatingOfficeName.trim())
      return 'Originating office name is required';
    return undefined;
  };

  const validateAll = (state: FormState): FormErrors => {
    const next: FormErrors = {};
    (Object.keys(state) as Array<keyof FormState>).forEach(key => {
      if (key === 'originMode' || key === 'allOffices' || key === 'recipientOfficeIds')
        return;
      const err = validateField(key, String((state as never)[key]) ?? '');
      if (err) next[key] = err;
    });
    const originError = validateOrigin(state);
    if (originError) next.originMode = originError;
    return next;
  };

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (typeof value !== 'boolean' && !Array.isArray(value) && touched[field]) {
        const err = validateField(field, String(value ?? ''));
        setErrors(e => ({ ...e, [field]: err }));
      }
      if (field === 'source' && value === 'internal') {
        setErrors(e => ({ ...e, senderName: undefined }));
      }
      if (field === 'originMode' && prev.originMode !== value) {
        next.originatingOfficeId = '';
        next.originatingOfficeName = '';
      }
      const attachmentsMeta = files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      formDraft.saveDraft({
        ...(next as unknown as Record<string, unknown>),
        attachments: attachmentsMeta,
      });
      return next;
    });
  };

  const markTouched = (field: keyof FormState) => {
    setTouched(t => ({ ...t, [field]: true }));
    if (field === 'originMode' || field === 'allOffices' || field === 'recipientOfficeIds')
      return;
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
    if (form.originMode === 'select' && !offices.some(office => office.id === form.originatingOfficeId)) {
      toast.error('Invalid originating office', 'Select an office loaded from the server.');
      return;
    }
    if (!form.allOffices && form.recipientOfficeIds.length === 0) {
      toast.error('No recipient selected', 'Select at least one receiving office, or enable All Offices.');
      return;
    }

    const typeId = form.type;
    if (!typeId) {
      toast.error('Document type unavailable', 'Please select a document type.');
      return;
    }

    const originatingOfficeId = form.originMode === 'select' ? form.originatingOfficeId : undefined;
    const originatingOfficeName =
      form.originMode === 'manual' ? form.originatingOfficeName.trim() : undefined;
    const destinationsAllOffices = form.allOffices;

    setSubmitting(true);
    const doc = await registration.register({
      documentNumber: form.documentNumber.trim() || undefined,
      title: form.title,
      typeId,
      classification: form.classification,
      source: form.source,
      senderName: form.source === 'external' ? form.senderName : undefined,
      description: form.description,
      priority: form.priority,
      originatingOfficeId,
      originatingOfficeName,
      destinationsAllOffices,
      recipientOfficeIds: destinationsAllOffices ? [] : form.recipientOfficeIds,
      currentOfficeId: user.officeId,
      currentHolderId: form.assignedUserId || user.id,
      dueDate: form.dueDate || undefined,
      tags,
    });

    setSubmitting(false);
    if (!doc) {
      toast.error('Registration failed', registration.error ?? 'Please retry.');
      if (registration.status === 409) {
        setErrors(e => ({
          ...e,
          documentNumber:
            'This number already exists. Leave it blank to auto-generate a unique number.',
        }));
        setTouched(t => ({ ...t, documentNumber: true }));
      }
      return;
    }
    if (files.length > 0) {
      try {
        await Promise.all(files.map(file => attachmentsService.upload(doc.id, file)));
      } catch (error) {
        toast.warning(
          'Document registered, attachments pending',
          error instanceof Error ? error.message : 'The document was saved but one or more files failed to upload.',
        );
      }
    }
    toast.success(
      mode === 'register' ? 'Document registered' : 'Document registered & routed',
      `${doc.trackingNumber} has been ${mode === 'register' ? 'successfully registered' : 'registered and forwarded to the recipient offices'}.`
    );
    void formDraft.clearDraft();
    setRestoredAttachmentMeta([]);
    navigate(`/documents/${doc.id}`);
  };

  const requiredFieldsComplete =
    form.title.trim() &&
    !!getOriginValue(form) &&
    (form.allOffices || form.recipientOfficeIds.length > 0) &&
    form.description.trim() &&
    (form.source === 'internal' || form.senderName.trim());

  const errorCount = Object.keys(errors).filter(k => errors[k as keyof FormState]).length;

  const checklist = [
    { key: 'title', ok: !!form.title.trim() && form.title.trim().length >= 5, label: 'Title is filled' },
    { key: 'origin', ok: !!getOriginValue(form), label: 'Originating office specified' },
    { key: 'recipients', ok: form.allOffices || form.recipientOfficeIds.length > 0, label: 'Receiving / destination offices set' },
    { key: 'source', ok: form.source === 'internal' || !!form.senderName.trim(), label: 'Source / sender specified' },
    { key: 'description', ok: !!form.description.trim() && form.description.trim().length >= 10, label: 'Description is detailed' },
  ];
  const checklistDone = checklist.filter(item => item.ok).length;
  const completionPercent = Math.round((checklistDone / checklist.length) * 100);

  const originSummary =
    form.originMode === 'select'
      ? (offices.find(o => o.id === form.originatingOfficeId)?.code ?? '—')
      : form.originMode === 'manual'
        ? (form.originatingOfficeName || '—')
        : '—';

  const recipientSummary = form.allOffices
    ? 'All Offices'
    : form.recipientOfficeIds.length > 0
      ? offices
          .filter(o => form.recipientOfficeIds.includes(o.id))
          .map(o => o.code)
          .join(', ')
      : '—';

  return (
    <div className="space-y-6 w-full">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700 transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Documents
      </button>

      {/* Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Documents', to: '/documents' }, { label: 'Register New Document' }]}
        eyebrow="Document Control"
        title="Register New Document"
        description="Encode a new document into the system. Fields marked with an asterisk (*) are required."
        className="mb-5"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/documents')}>
              Cancel
            </Button>
            <Button
              variant="outline"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={() => {
                const attachmentsMeta = files.map(f => ({
                  name: f.name,
                  size: f.size,
                  type: f.type,
                }));
                void formDraft
                  .saveDraftNow({
                    ...(formRef.current as unknown as Record<string, unknown>),
                    attachments: attachmentsMeta,
                  })
                  .then(() => toast.success('Draft saved', 'You can return to this form anytime.'));
              }}
              disabled={submitting}
            >
              Save Draft
            </Button>
            <Button
              leftIcon={<Send className="w-4 h-4" />}
              onClick={() => submitRegistration('route')}
              loading={submitting}
            >
              Register &amp; Route
            </Button>
          </>
        }
      />

      {/* Draft status row */}
      <div className="flex items-center justify-between gap-3 flex-wrap -mt-3 mb-2">
        <DraftIndicator
          state={formDraft.saving}
          lastSavedAt={formDraft.lastSavedAt}
          error={formDraft.error}
          onRetry={() => {
            const attachmentsMeta = files.map(f => ({
              name: f.name,
              size: f.size,
              type: f.type,
            }));
            void formDraft.saveDraftNow({
              ...(formRef.current as unknown as Record<string, unknown>),
              attachments: attachmentsMeta,
            });
          }}
        />
        {formDraft.draft && (
          <button
            type="button"
            onClick={() => {
              setForm({ ...INITIAL_STATE, ...defaultOrigin(user.officeId) });
              setFiles([]);
              setErrors({});
              setTouched({} as Record<keyof FormState, boolean>);
              setRestoredAttachmentMeta([]);
              void formDraft.clearDraft();
              toast.info('Draft discarded', 'The form has been reset.');
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors"
            aria-label="Discard draft"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard draft
          </button>
        )}
      </div>

      {/* Restored attachment metadata banner */}
      {restoredAttachmentMeta.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 mb-4">
          <Paperclip className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed text-amber-900">
            <p className="font-semibold">
              {restoredAttachmentMeta.length} attachment
              {restoredAttachmentMeta.length === 1 ? '' : 's'} were previously attached.
            </p>
            <p className="mt-0.5">
              File contents are not stored in drafts for security. Please re-attach the files
              below before submitting.
            </p>
            <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-amber-800">
              {restoredAttachmentMeta.map((m, i) => (
                <li key={`${m.name}-${i}`}>
                  · {m.name} ({(m.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setRestoredAttachmentMeta([])}
            className="ml-auto shrink-0 text-xs font-medium text-amber-800 hover:text-amber-900"
            aria-label="Dismiss attachment notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Validation banner */}
      {errorCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-rose-200 bg-rose-50 mb-6">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-900">
              {errorCount} validation {errorCount === 1 ? 'error' : 'errors'} found
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              Please review the highlighted fields below before submitting.
            </p>
          </div>
          <button
            onClick={() => setErrors({})}
            className="ml-auto shrink-0 text-xs font-medium text-rose-700 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* 1 - Identifiers */}
          <SectionCard
            step="01"
            icon={FileInput}
            tint="indigo"
            title="Document Identifiers"
            description="Tracking and document numbers uniquely identify this record"
          >
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
          </SectionCard>

          {/* 2 - Details */}
          <SectionCard
            step="02"
            icon={Users}
            tint="sky"
            title="Basic Information"
            description="Core details about the document content"
          >
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
                onChange={e => setField('type', e.target.value)}
                options={documentTypes.map(t => ({ value: t.id, label: t.name }))}
                disabled={documentTypes.length === 0}
                hint={documentTypes.length === 0 ? 'No active document types are configured.' : undefined}
              />
              <Select
                label="Classification"
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
          </SectionCard>

          {/* 3 - Source & Routing */}
          <SectionCard
            step="03"
            icon={Route}
            tint="violet"
            title="Source & Routing"
            description="Origin, recipients, and assignment"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <span className="block text-sm font-medium text-slate-700 mb-2">
                  Originating Office <span className="text-rose-500">*</span>
                </span>
                <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 gap-0.5">
                  <OriginOption
                    label="Select office"
                    active={form.originMode === 'select'}
                    onClick={() => setField('originMode', 'select')}
                  />
                  <OriginOption
                    label="Manual entry"
                    active={form.originMode === 'manual'}
                    onClick={() => setField('originMode', 'manual')}
                  />
                </div>
                {errors.originMode && (
                  <p className="mt-1.5 text-xs text-rose-600">{errors.originMode}</p>
                )}
              </div>

              {form.originMode === 'select' && (
                <div className="md:col-span-2">
                  <Select
                    label="Originating Office"
                    placeholder="Choose originating office…"
                    value={form.originatingOfficeId}
                    onChange={e => setField('originatingOfficeId', e.target.value)}
                    onBlur={() => markTouched('originatingOfficeId')}
                    error={errors.originatingOfficeId}
                    options={[
                      { value: '', label: officesLoading ? 'Loading offices…' : 'Choose originating office…' },
                      ...offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                    ]}
                    disabled={officesLoading || offices.length === 0}
                  />
                </div>
              )}

              {form.originMode === 'manual' && (
                <div className="md:col-span-2">
                  <Input
                    label="Originating Office Name"
                    placeholder="e.g., Barangay San Isidro, Office of the Mayor"
                    value={form.originatingOfficeName}
                    onChange={e => setField('originatingOfficeName', e.target.value)}
                    onBlur={() => markTouched('originatingOfficeName')}
                    error={errors.originatingOfficeName}
                    leftIcon={<Building2 className="w-4 h-4" />}
                  />
                </div>
              )}

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

              <div className="md:col-span-2">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-medium text-slate-700">
                    Receiving / Destination Offices
                  </span>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <Checkbox
                      checked={form.allOffices}
                      onChange={checked => setField('allOffices', checked)}
                      ariaLabel="Send to all offices"
                    />
                    All Offices
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  {form.allOffices
                    ? 'The document will be visible to all offices. Uncheck All Offices to target specific offices.'
                    : 'Select one or more offices that will receive this document. No selection defaults to All Offices.'}
                </p>
                {!form.allOffices && (
                  <div className="mt-3">
                    <SearchInput
                      value={recipientSearch}
                      onChange={setRecipientSearch}
                      placeholder="Search offices by name or code…"
                      className="max-w-sm"
                    />
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {filteredRecipientOffices.map(office => {
                        const checked = form.recipientOfficeIds.includes(office.id);
                        return (
                          <label
                            key={office.id}
                            className="flex items-center gap-2.5 p-2.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={checked}
                              onChange={() => {
                                setField(
                                  'recipientOfficeIds',
                                  checked
                                    ? form.recipientOfficeIds.filter(id => id !== office.id)
                                    : [...form.recipientOfficeIds, office.id],
                                );
                              }}
                              ariaLabel={office.name}
                            />
                            <span className="font-mono text-[11px] text-slate-500 shrink-0">{office.code}</span>
                            <span className="text-sm text-slate-700 truncate">{office.name}</span>
                          </label>
                        );
                      })}
                      {filteredRecipientOffices.length === 0 && (
                        <p className="text-sm text-slate-500 col-span-full py-5 text-center border border-dashed border-slate-200 rounded-md">
                          No offices match "{recipientSearch.trim()}".
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!form.allOffices && (
                  <p className="mt-2 text-xs text-slate-500">
                    {form.recipientOfficeIds.length} office
                    {form.recipientOfficeIds.length === 1 ? '' : 's'} selected
                  </p>
                )}
              </div>

              <Select
                label="Assigned Officer (Optional)"
                placeholder="Choose officer…"
                value={form.assignedUserId}
                onChange={e => setField('assignedUserId', e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                   ...assignedUsers.map(u => ({
                     value: u.id,
                     label: `${u.fullName}${u.position ? ` (${u.position})` : ''}`,
                   })),
                 ]}
                 disabled={usersLoading}
                 hint={usersError ?? undefined}
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
          </SectionCard>

          {/* 4 - Schedule */}
          <SectionCard
            step="04"
            icon={CalendarClock}
            tint="amber"
            title="Schedule"
            description="Dates that govern this record"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </SectionCard>

          {/* 5 - Classification Tags */}
          <SectionCard
            step="05"
            icon={TagIcon}
            tint="emerald"
            title="Classification Tags"
            description="Optional labels to help organize and find documents"
          >
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
          </SectionCard>

          {/* 6 - Attachments */}
          <SectionCard
            step="06"
            icon={Paperclip}
            tint="rose"
            title="Attachments"
            description="Supporting files to attach to this document"
          >
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
                dragOver
                  ? 'border-brand-500 bg-brand-50/50'
                  : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50/30'
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
              <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {dragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, WEBP (max 25MB per file)
              </p>
            </div>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
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
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Completion checklist */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-brand-600" />
                Completion Checklist
              </h3>
              <span className="text-xs font-semibold text-brand-700">{completionPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <ul className="space-y-2.5">
              {checklist.map(item => (
                <ChecklistItem
                  key={item.key}
                  checked={item.ok}
                  label={
                    <span className={item.ok ? 'text-slate-500 line-through' : 'text-slate-700'}>
                      {item.label}
                    </span>
                  }
                />
              ))}
            </ul>
          </Card>

          {/* Submission summary */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Submission Summary</h3>
            </div>
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Type" value={documentTypes.find(t => t.id === form.type)?.name ?? '—'} />
              <SummaryRow
                label="Classification"
                value={DOCUMENT_CLASSIFICATION_LABELS[form.classification]}
              />
              <SummaryRow label="Priority" value={<span className="capitalize">{form.priority}</span>} />
              <SummaryRow label="Source" value={<span className="capitalize">{form.source}</span>} />
              <SummaryRow label="Originating" value={originSummary} />
              <SummaryRow label="Recipients" value={recipientSummary} />
              <SummaryRow
                label="Tags"
                value={tags.length > 0 ? tags.map(t => `#${t}`).join(' ') : '—'}
              />
              <SummaryRow label="Attachments" value={`${files.length} file${files.length === 1 ? '' : 's'}`} />
            </dl>
            {requiredFieldsComplete && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                All required fields complete
              </div>
            )}
          </Card>

          {/* Workflow tip */}
          <Card className="p-5 border-brand-200 bg-brand-50/50">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Pro tip:</strong> Your work is{' '}
                <strong>auto-saved as a draft</strong>. Use <strong>Save Draft</strong> to save
                immediately, or <strong>Register &amp; Route</strong> to forward when ready.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

type IconType = React.ComponentType<{ className?: string }>;

function SectionCard({
  step,
  icon: Icon,
  tint,
  title,
  description,
  children,
}: {
  step: string;
  icon: IconType;
  tint: 'indigo' | 'sky' | 'violet' | 'amber' | 'emerald' | 'rose';
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const tints: Record<string, { chip: string; title: string }> = {
    indigo: { chip: 'text-indigo-600 bg-indigo-50 border-indigo-200', title: 'text-indigo-700' },
    sky: { chip: 'text-sky-600 bg-sky-50 border-sky-200', title: 'text-sky-700' },
    violet: { chip: 'text-violet-600 bg-violet-50 border-violet-200', title: 'text-violet-700' },
    amber: { chip: 'text-amber-700 bg-amber-50 border-amber-200', title: 'text-amber-700' },
    emerald: { chip: 'text-emerald-600 bg-emerald-50 border-emerald-200', title: 'text-emerald-700' },
    rose: { chip: 'text-rose-600 bg-rose-50 border-rose-200', title: 'text-rose-700' },
  };
  const t = tints[tint];
  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-1">
          <span
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg border text-xs font-bold',
              t.chip
            )}
          >
            {step}
          </span>
          <div>
            <h3 className={cn('text-sm font-semibold flex items-center gap-2', t.title)}>
              {title}
              <Icon className={cn('w-4 h-4', t.title)} />
            </h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </Card>
  );
}

function OriginOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-sm font-medium px-4 h-8 rounded-md transition-colors',
        active
          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
          : 'text-slate-500 hover:text-slate-700'
      )}
    >
      {label}
    </button>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      {checked ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <span className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
      )}
      <span className="text-sm">{label}</span>
    </li>
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
