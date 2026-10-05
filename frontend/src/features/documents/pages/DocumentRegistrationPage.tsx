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
import { Stepper, StepperNavigation, type Step } from '@/components/ui/Stepper';
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
import { useDocumentNumberCheck } from '@/features/documents/hooks/useDocumentNumberCheck';
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
  const {
    items: documentTypes,
    loading: documentTypesLoading,
    error: documentTypesError,
  } = useDocumentTypes({ pageSize: 100, isActive: true });
  const registration = useRegisterDocument();
  const { offices, loading: officesLoading, error: officesError } = useOffices();
  const { users: routingUsers, loading: usersLoading, error: usersError } = useRoutingOptions();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_STATE,
    ...defaultOrigin(user.officeId),
  }));

  const [submitting, setSubmitting] = useState(false);

  const docNumberCheck = useDocumentNumberCheck({
    documentNumber: form.documentNumber,
    enabled: !submitting,
    originatingOfficeId:
      form.originMode === 'select' ? form.originatingOfficeId : undefined,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>(
    {} as Record<keyof FormState, boolean>
  );
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
    return routingUsers.filter(option => option.officeId === user.officeId);
  }, [routingUsers, user.officeId]);
