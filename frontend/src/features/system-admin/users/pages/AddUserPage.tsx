import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useUsers } from '@/features/system-admin/users/hooks/useUsers';
import { useOffices } from '@/features/system-admin/offices/hooks/useOffices';
import { ApiError } from '@/features/system-admin/users/services/user.service';
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
  confirmPassword: false,
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function usernameFrom(firstName: string, lastName: string): string {
  const f = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const l = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!f || !l) return '';
  return `${f}.${l}`;
}

function validate(form: AddUserFormState, confirmPassword: string, username: string): FormErrors {
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
  if (!form.password) e.password = 'Password is required';
  else if (form.password.length < 8) e.password = 'At least 8 characters';
  if (form.password && confirmPassword !== form.password)
    e.confirmPassword = 'Passwords do not match';
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

export function AddUserPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const { offices } = useOffices();
  const { createUser, creating, actionError, clearActionError } = useUsers();

  const [form, setForm] = useState<AddUserFormState>(DEFAULT_FORM);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>(TOUCHED_INITIAL);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
    () => validate(form, confirmPassword, usernameValue),
    [form, confirmPassword, usernameValue],
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
      confirmPassword: true,
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
      await createUser({
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
          password: form.password,
          role: ROLE_TO_API[form.role],
          status: STATUS_TO_API[form.status],
        },
      });
      toast.success('User created', `${fullName} has been added to the system.`);
      navigate('/users');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error('Could not create user', err.message);
      } else {
        toast.error('Could not create user', 'An unexpected error occurred.');
      }
    }
  };

  const regeneratePassword = () => {
    setForm(prev => ({ ...prev, password: generatePassword() }));
    setConfirmPassword('');
    markTouched('password');
  };

  const office = useMemo(
    () => flatOffices.find(o => o.id === form.officeId) ?? null,
    [flatOffices, form.officeId],
  );

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
              onChange={setForm}
              touched={touched}
              onTouched={markTouched}
              errors={showFormError ? errors : touchedErrors(touched, errors)}
              confirmPassword={confirmPassword}
              onConfirmPasswordChange={setConfirmPassword}
              offices={flatOffices}
              usernameTouched={usernameTouched}
              onUsernameTouched={setUsernameTouched}
              suggestedUsername={suggestedUsername}
              onGeneratePassword={regeneratePassword}
              disabled={creating}
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
