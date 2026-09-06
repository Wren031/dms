import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
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

        <Input
          label="Display Name"
          name="name"
          required
          value={form.name}
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Memorandum Circular"
          disabled={loading}
          hint="Shown to users when selecting a document type."
        />

        <Select
          label="Code"
          name="code"
          required
          value={form.code}
          onChange={e => setForm(prev => ({ ...prev, code: e.target.value as DocumentTypeCode }))}
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
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Briefly describe what documents fall under this type…"
          disabled={loading}
          hint="Optional. Helpful for encoders when classifying documents."
        />

        <Select
          label="Status"
          name="isActive"
          value={form.isActive ? 'true' : 'false'}
          onChange={e => setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
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
