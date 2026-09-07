import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DraftIndicator } from '@/components/ui/DraftIndicator';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FORM_DRAFT_KEYS } from '@/lib/formDraftKeys';
import {
  DOCUMENT_TYPE_CODES,
  DOCUMENT_TYPE_CODE_LABELS,
  type CreateDocumentTypePayload,
  type DocumentTypeCode,
  type DocumentTypeRecord,
  type UpdateDocumentTypePayload,
} from '@/features/system-admin/document-type/types/document-type';

interface DocumentTypeFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: DocumentTypeRecord;
  loading: boolean;
  errorMessage: string | null;
  existingCodes: Map<DocumentTypeCode, string>;
  onClose: () => void;
  onSubmit: (input: CreateDocumentTypePayload | UpdateDocumentTypePayload) => Promise<void>;
}

interface FormState {
  code: DocumentTypeCode | '';
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  description: '',
  isActive: true,
};

function toFormState(record?: DocumentTypeRecord): FormState {
  if (!record) return EMPTY_FORM;
  return {
    code: record.codes[0] ?? '',
    name: record.name,
    description: record.description ?? '',
    isActive: record.isActive,
  };
}

export function DocumentTypeFormModal({
  open,
  mode,
  initial,
  loading,
  errorMessage,
  existingCodes,
  onClose,
  onSubmit,
}: DocumentTypeFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const formDraft = useFormDraft(FORM_DRAFT_KEYS.DOCUMENT_TYPE_CREATE, {
    enabled: open && mode === 'create',
    onRestore: payload => {
      const restored: Partial<FormState> = {};
      for (const key of Object.keys(EMPTY_FORM) as Array<keyof FormState>) {
        const v = payload[key as string];
        if (v !== undefined) {
          (restored as Record<string, unknown>)[key] = v;
        }
      }
      if (Object.keys(restored).length > 0) {
        setForm(prev => ({ ...prev, ...restored }));
      }
    },
  });

  const formRef = useRef(form);
  formRef.current = form;
  const updateForm = useCallback(
    (next: FormState) => {
      setForm(next);
      if (mode === 'create') {
        formDraft.saveDraft(next as unknown as Record<string, unknown>);
      }
    },
    [formDraft, mode],
  );

  useEffect(() => {
    if (open) setForm(toFormState(initial));
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!form.code) return;

    const description = form.description.trim();
    if (mode === 'create') {
      const payload: CreateDocumentTypePayload = {
        codes: [form.code],
        name: form.name.trim(),
        description: description || undefined,
        isActive: form.isActive,
      };
      await onSubmit(payload);
    } else {
      const payload: UpdateDocumentTypePayload = {
        codes: [form.code],
        name: form.name.trim(),
        description: description || null,
        isActive: form.isActive,
      };
      await onSubmit(payload);
    }
    if (mode === 'create') {
      await formDraft.clearDraft();
    }
  };

  const handleDiscardDraft = () => {
    updateForm(EMPTY_FORM);
    void formDraft.clearDraft();
  };

  const title = mode === 'create' ? 'Add Document Type' : 'Edit Document Type';
  const description =
    mode === 'create'
      ? 'Create a new category used when registering documents.'
      : 'Update the label, code, and description for this document type.';

  const isInvalid = !form.name.trim() || !form.code;

  const codeOptions = DOCUMENT_TYPE_CODES.map(c => ({
    value: c,
    label: `${DOCUMENT_TYPE_CODE_LABELS[c]} (${c})`,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          {title}
        </span>
      }
      description={description}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="document-type-form"
            disabled={loading || isInvalid}
          >
            {loading
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create Document Type'
                : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form id="document-type-form" onSubmit={handleSubmit} className="space-y-3">
        {errorMessage && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
          >
            {errorMessage}
          </div>
        )}

        {mode === 'create' && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <DraftIndicator
              state={formDraft.saving}
              lastSavedAt={formDraft.lastSavedAt}
              error={formDraft.error}
              onRetry={() =>
                formDraft.saveDraftNow(formRef.current as unknown as Record<string, unknown>)
              }
            />
            {formDraft.draft && (
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors"
                aria-label="Discard draft"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Discard draft
              </button>
            )}
          </div>
        )}

        <Input
          label="Display Name"
          name="name"
          required
          value={form.name}
          onChange={e => updateForm({ ...formRef.current, name: e.target.value })}
          placeholder="e.g., Memorandum Circular"
          disabled={loading}
          hint="Shown to users when selecting a document type."
        />

        <Select
          label="Code"
          name="code"
          required
          value={form.code}
          onChange={e =>
            updateForm({ ...formRef.current, code: e.target.value as DocumentTypeCode })
          }
          options={codeOptions}
          disabled={loading}
          hint={
            existingCodes.has(form.code as DocumentTypeCode) &&
            (mode === 'create' || existingCodes.get(form.code as DocumentTypeCode) !== initial?.id)
              ? 'This code is also assigned to another document type.'
              : 'Internal identifier used by documents.'
          }
        />

        <Textarea
          label="Description"
          name="description"
          rows={3}
          value={form.description}
          onChange={e => updateForm({ ...formRef.current, description: e.target.value })}
          placeholder="Briefly describe what documents fall under this type…"
          disabled={loading}
          hint="Optional. Helpful for encoders when classifying documents."
        />

        <Select
          label="Status"
          name="isActive"
          value={form.isActive ? 'true' : 'false'}
          onChange={e =>
            updateForm({ ...formRef.current, isActive: e.target.value === 'true' })
          }
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
          disabled={loading}
          hint="Inactive types are hidden from new document registrations."
        />
      </form>
    </Modal>
  );
}
