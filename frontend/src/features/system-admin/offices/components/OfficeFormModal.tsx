import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Lock, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
import { DraftIndicator } from '@/components/ui/DraftIndicator';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FORM_DRAFT_KEYS } from '@/lib/formDraftKeys';
import { OFFICE_DIRECTORY } from '@/constants';
import type {
  CreateOfficeInput,
  Office,
  OfficeType,
} from '@/features/system-admin/offices/types/office';

interface OfficeFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Office;
  parentOptions: Office[];
  loading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: CreateOfficeInput) => Promise<void>;
}

interface FormState {
  name: string;
  code: string;
  type: OfficeType;
  parentId: string;
  headName: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  type: 'division',
  parentId: '',
  headName: '',
  description: '',
  isActive: true,
};

const TYPE_OPTIONS: { value: OfficeType; label: string }[] = [
  { value: 'main', label: 'Main Office' },
  { value: 'division', label: 'Division' },
  { value: 'unit', label: 'Unit' },
];

const OFFICE_NAME_OPTIONS: ComboboxOption[] = OFFICE_DIRECTORY.map(entry => ({
  value: entry.name,
  label: entry.name,
  group: entry.group,
  description: entry.code,
}));

function toFormState(office?: Office): FormState {
  if (!office) return EMPTY_FORM;
  return {
    name: office.name,
    code: office.code,
    type: office.type,
    parentId: office.parentId ?? '',
    headName: office.headName ?? '',
    description: office.description ?? '',
    isActive: office.isActive,
  };
}

export function OfficeFormModal({
  open,
  mode,
  initial,
  parentOptions,
  loading,
  errorMessage,
  onClose,
  onSubmit,
}: OfficeFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const formDraft = useFormDraft(FORM_DRAFT_KEYS.OFFICE_CREATE, {
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
    // We intentionally do NOT clear the draft when the modal closes — the draft
    // persists on the server so the user can return and restore later.
  }, [open, initial]);

  const handleNameChange = (name: string) => {
    const entry = OFFICE_DIRECTORY.find(e => e.name === name);
    const matched = parentOptions.find(o => o.name === name);
    updateForm({
      ...formRef.current,
      name,
      code: entry?.code ?? formRef.current.code,
      parentId: matched?.parentId ?? '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    const payload: CreateOfficeInput = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      type: form.type,
      parentId: form.parentId || null,
      headName: form.headName.trim() || null,
      description: form.description.trim() || null,
      isActive: form.isActive,
    };

    if (mode === 'create' && form.type === 'main') {
      payload.parentId = null;
    }

    await onSubmit(payload);
    if (mode === 'create') {
      await formDraft.clearDraft();
    }
  };

  const handleDiscardDraft = () => {
    updateForm(EMPTY_FORM);
    void formDraft.clearDraft();
  };

  const title = mode === 'create' ? 'Add New Office' : 'Edit Office';
  const description =
    mode === 'create'
      ? 'Create a new office in the organizational structure'
      : 'Update the details for this office';

  const parentDisplayName = useMemo(() => {
    if (!form.parentId) return '';
    const found = parentOptions.find(o => o.id === form.parentId);
    if (found?.name) return found.name;
    return initial?.parent?.name ?? '';
  }, [form.parentId, parentOptions, initial]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          {title}
        </span>
      }
      description={description}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="office-form"
            disabled={loading || !form.name.trim() || !form.code.trim()}
          >
            {loading
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create Office'
                : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form id="office-form" onSubmit={handleSubmit} className="space-y-3">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Combobox
            label="Office Name"
            name="name"
            required
            value={form.name}
            onChange={handleNameChange}
            options={OFFICE_NAME_OPTIONS}
            placeholder="Search for an office…"
            searchPlaceholder="Type to filter offices…"
            disabled={loading}
            hint="Pick from the official office directory."
          />
          <Input
            label="Office Code"
            name="code"
            required
            value={form.code}
            readOnly
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="—"
            hint="Auto-derived from the office name."
          />
          <Select
            label="Office Type"
            name="type"
            value={form.type}
            onChange={e =>
              updateForm({ ...formRef.current, type: e.target.value as OfficeType })
            }
            options={TYPE_OPTIONS}
            disabled={loading}
          />
          <Input
            label="Parent Office"
            name="parentId"
            value={parentDisplayName}
            readOnly
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="No Parent Office"
            hint={form.type === 'main' ? 'Main offices cannot have a parent' : 'Derived from the selected office.'}
          />
          <Input
            label="Office Head"
            name="headName"
            value={form.headName}
            onChange={e => updateForm({ ...formRef.current, headName: e.target.value })}
            placeholder="Full name of office head"
            disabled={loading}
          />
          {mode === 'edit' && (
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
            />
          )}
        </div>

        <Textarea
          label="Description"
          name="description"
          rows={3}
          value={form.description}
          onChange={e => updateForm({ ...formRef.current, description: e.target.value })}
          placeholder="Brief description of the office's responsibilities…"
          disabled={loading}
        />
      </form>
    </Modal>
  );
}
