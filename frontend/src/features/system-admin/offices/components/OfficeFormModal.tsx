import { useEffect, useState } from 'react';
import { Building2, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
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

  useEffect(() => {
    if (open) setForm(toFormState(initial));
  }, [open, initial]);

  const handleNameChange = (name: string) => {
    const entry = OFFICE_DIRECTORY.find(e => e.name === name);
    setForm(prev => ({
      ...prev,
      name,
      code: entry?.code ?? prev.code,
    }));
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
  };

  const title = mode === 'create' ? 'Add New Office' : 'Edit Office';
  const description =
    mode === 'create'
      ? 'Create a new office in the organizational structure'
      : 'Update the details for this office';

  const parentSelectOptions = parentOptions
    .filter(o => o.id !== initial?.id && o.type !== 'unit')
    .map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }));

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
              setForm(prev => ({ ...prev, type: e.target.value as OfficeType }))
            }
            options={TYPE_OPTIONS}
            disabled={loading}
          />
          <Select
            label="Parent Office"
            name="parentId"
            placeholder="None (top-level)"
            value={form.parentId}
            onChange={e => setForm(prev => ({ ...prev, parentId: e.target.value }))}
            options={parentSelectOptions}
            disabled={loading || form.type === 'main'}
            hint={form.type === 'main' ? 'Main offices cannot have a parent' : undefined}
          />
          <Input
            label="Office Head"
            name="headName"
            value={form.headName}
            onChange={e => setForm(prev => ({ ...prev, headName: e.target.value }))}
            placeholder="Full name of office head"
            disabled={loading}
          />
          {mode === 'edit' && (
            <Select
              label="Status"
              name="isActive"
              value={form.isActive ? 'true' : 'false'}
              onChange={e =>
                setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))
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
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of the office's responsibilities…"
          disabled={loading}
        />
      </form>
    </Modal>
  );
}
