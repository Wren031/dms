import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Check, KeyRound, AlertTriangle, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DraftIndicator } from '@/components/ui/DraftIndicator';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useUsers } from '@/features/system-admin/users/hooks/useUsers';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import { ApiError } from '@/features/system-admin/users/services/user.service';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FORM_DRAFT_KEYS } from '@/lib/formDraftKeys';
import {
  ROLE_TO_API,
  STATUS_TO_API,
  USER_ROLE_LABELS,
  type OfficeSummary,
  type UserStatusUi,
} from '@/features/system-admin/users/types/user';
import { ROLE_LABELS } from '@/constants';
import type { UserRole } from '@/types';
import {
  AddUserTipsCard,
  RoleInfoCard,
  UserFormFields,
  UserPreviewCard,
  type AddUserFormState,
  type FormErrors,
} from '@/features/system-admin/users/components';

const DEFAULT_FORM: AddUserFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  officeId: '',
  role: 'document_encoder',
  username: '',
  password: '',
  status: 'active',
};

const TOUCHED_INITIAL: Record<string, boolean> = {
  firstName: false,
  middleName: false,
  lastName: false,
  email: false,
  phone: false,
  position: false,
  officeId: false,
  role: false,
  username: false,
  password: false,
  status: false,
};

function usernameFrom(firstName: string, lastName: string): string {
  const f = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const l = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!f || !l) return '';
  return `${f}.${l}`;
}

function validate(form: AddUserFormState, username: string): FormErrors {
  const e: FormErrors = {};
  if (!form.firstName.trim()) e.firstName = 'First name is required';
  if (!form.lastName.trim()) e.lastName = 'Last name is required';
  if (!form.email.trim()) e.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
  if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) e.phone = 'Invalid phone number';
  if (!form.position.trim()) e.position = 'Position is required';
  if (!form.officeId) e.officeId = 'Office is required';
  if (!username) e.username = 'Username is required';
  else if (username.length < 3) e.username = 'At least 3 characters';
  return e;
}

function flattenOffices(tree: { id: string; name: string; code: string; type: 'main' | 'division' | 'unit' }[]): OfficeSummary[] {
  const out: OfficeSummary[] = [];
  const walk = (nodes: typeof tree) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, code: n.code, type: n.type, isActive: true });
    }
  };
  walk(tree);
  return out;
}

interface CreatedCredential {
  fullName: string;
  username: string;
  email: string;
  temporaryPassword: string;
}

export function AddUserPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const { offices } = useOffices();
  const { createUser, creating, actionError, clearActionError } = useUsers();

  const [form, setForm] = useState<AddUserFormState>(DEFAULT_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>(TOUCHED_INITIAL);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [credential, setCredential] = useState<CreatedCredential | null>(null);
  const [copied, setCopied] = useState(false);

  const formDraft = useFormDraft(FORM_DRAFT_KEYS.USER_CREATE, {
    onRestore: payload => {
      const restored: Partial<AddUserFormState> = {};
      for (const key of Object.keys(DEFAULT_FORM) as Array<keyof AddUserFormState>) {
        const v = payload[key as string];
        if (v !== undefined) {
          (restored as Record<string, unknown>)[key] = v;
        }
      }
      if (Object.keys(restored).length > 0) {
        setForm(prev => ({ ...prev, ...restored }));
        if (typeof payload.username === 'string' && payload.username.length > 0) {
          setUsernameTouched(true);
        }
      }
    },
  });

  const formRef = useRef(form);
  formRef.current = form;
  const handleFormChange = useCallback(
    (next: AddUserFormState) => {
      setForm(next);
      const { password: _password, ...persistable } = next;
      void _password;
      formDraft.saveDraft(persistable as unknown as Record<string, unknown>);
    },
    [formDraft],
  );

  const flatOffices = useMemo(() => flattenOffices(offices), [offices]);

  useEffect(() => {
    if (!form.officeId && flatOffices.length > 0) {
      setForm(prev => ({ ...prev, officeId: flatOffices[0].id }));
    }
  }, [flatOffices, form.officeId]);

  const fullName = useMemo(() => {
    return [form.firstName, form.middleName, form.lastName]
      .map(s => s.trim())
      .filter(Boolean)
      .join(' ');
  }, [form.firstName, form.middleName, form.lastName]);

  const suggestedUsername = useMemo(
    () => usernameFrom(form.firstName, form.lastName),
    [form.firstName, form.lastName],
  );

  const usernameValue = usernameTouched
    ? form.username
    : (form.username || suggestedUsername);

  const errors = useMemo(
    () => validate(form, usernameValue),
    [form, usernameValue],
  );

  const isValid = Object.keys(errors).length === 0;
  const showFormError = submitAttempted && !isValid;

  const markTouched = (field: string) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      position: true,
      officeId: true,
      role: true,
      username: true,
      password: true,
    });
    if (!isValid) {
      toast.error('Please fix the errors', 'Some required fields are missing or invalid.');
      return;
    }

    if (!form.officeId) {
      toast.error('Office required', 'Please select an office for the new user.');
      return;
    }

    clearActionError();

    try {
      const result = await createUser({
        employee: {
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim() || undefined,
          lastName: form.lastName.trim(),
          position: form.position.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          officeId: form.officeId,
          isActive: form.status === 'active',
        },
        user: {
          username: usernameValue.trim() || undefined,
          email: form.email.trim().toLowerCase(),
          role: ROLE_TO_API[form.role],
          status: STATUS_TO_API[form.status],
        },
      });
      setCredential({
        fullName,
        username: result.user.username ?? usernameValue,
        email: result.user.email ?? form.email.trim().toLowerCase(),
        temporaryPassword: result.temporaryPassword,
      });
      void formDraft.clearDraft();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error('Could not create user', err.message);
      } else {
        toast.error('Could not create user', 'An unexpected error occurred.');
      }
    }
  };

  const office = useMemo(
    () => flatOffices.find(o => o.id === form.officeId) ?? null,
    [flatOffices, form.officeId],
  );

  const handleCopyPassword = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.temporaryPassword);
      setCopied(true);
      toast.info('Copied', 'The temporary password has been copied to your clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed', 'Please select and copy the password manually.');
    }
  };

  const handleAcknowledged = () => {
    toast.success('User created', `${credential?.fullName ?? fullName} has been added to the system.`);
    setCredential(null);
    void formDraft.clearDraft();
    navigate('/users');
  };

  const handleDiscardDraft = () => {
    setForm(DEFAULT_FORM);
    setTouched(TOUCHED_INITIAL);
    setUsernameTouched(false);
    setSubmitAttempted(false);
    void formDraft.clearDraft();
    toast.info('Draft discarded', 'The form has been reset.');
  };

  if (!hasPermission('users.create')) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="inline-flex items-center text-xs text-slate-600 hover:text-brand-700">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Users
        </Link>
        <Card>
          <p className="text-sm text-slate-700">You don't have permission to create users.</p>
        </Card>
      </div>
    );
  }

  const apiStatus = STATUS_TO_API[form.status];

  return (
    <div className="space-y-6 w-full">
      <div>
        <Link
          to="/users"
          className="inline-flex items-center text-xs text-slate-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Users
        </Link>
      </div>

      <PageHeader
        title="Add New User"
        description="Create a new system user account. Fields marked with * are required."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/users')} disabled={creating}>
              Cancel
            </Button>
            <Button
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleSubmit}
              loading={creating}
              disabled={creating}
            >
              Create User
            </Button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DraftIndicator
          state={formDraft.saving}
          lastSavedAt={formDraft.lastSavedAt}
          error={formDraft.error}
          onRetry={() => {
            const { password: _p, ...rest } = formRef.current;
            void _p;
            void formDraft.saveDraftNow(rest as unknown as Record<string, unknown>);
          }}
        />
        {formDraft.draft && !credential && (
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

      {actionError && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          {actionError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <UserFormFields
              form={form}
              onChange={handleFormChange}
              touched={touched}
              onTouched={markTouched}
              errors={showFormError ? errors : touchedErrors(touched, errors)}
              offices={flatOffices}
              usernameTouched={usernameTouched}
              onUsernameTouched={setUsernameTouched}
              suggestedUsername={suggestedUsername}
              disabled={creating}
              showPasswordField={false}
            />
            {showFormError && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Please review the highlighted fields and try again.
              </div>
            )}
          </div>

          <div className="xl:col-span-1 space-y-6">
            <UserPreviewCard
              firstName={form.firstName}
              lastName={form.lastName}
              email={form.email}
              username={usernameValue}
              position={form.position}
              roleLabel={
                USER_ROLE_LABELS[ROLE_TO_API[form.role as UserRole]] ?? ROLE_LABELS[form.role]
              }
              status={apiStatus}
              office={office}
            />
            <RoleInfoCard role={ROLE_TO_API[form.role]} office={office} />
            <AddUserTipsCard />
          </div>
        </div>
      </form>

      <Modal
        open={!!credential}
        onClose={() => undefined}
        title="User created — share the temporary password"
        description={`${credential?.fullName ?? ''} can now sign in.`}
        size="md"
        hideCloseButton
        footer={
          <Button onClick={handleAcknowledged} leftIcon={<Check className="w-4 h-4" />}>
            I have saved the password
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs leading-relaxed text-amber-800">
              This password will <strong>only be shown once</strong>. The system does not store
              the plain-text value. The user will be required to set a new private password on
              their first login.
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Username
            </p>
            <p className="mt-1 font-mono text-sm text-slate-900 break-all">
              {credential?.username}
            </p>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Email
            </p>
            <p className="mt-1 font-mono text-sm text-slate-900 break-all">
              {credential?.email}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Temporary password
            </label>
            <div className="mt-2 flex items-stretch gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5">
                <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                <code className="flex-1 break-all font-mono text-sm text-slate-900 select-all">
                  {credential?.temporaryPassword}
                </code>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPassword}
                leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Deliver this password to the user through a secure channel. Once they sign in,
              they will be prompted to set a new private password.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function touchedErrors(touched: Record<string, boolean>, errors: FormErrors): FormErrors {
  const out: FormErrors = {};
  (Object.keys(errors) as (keyof FormErrors)[]).forEach(key => {
    if (touched[key]) out[key] = errors[key];
  });
  return out;
}
