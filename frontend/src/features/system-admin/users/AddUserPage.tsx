import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Building2,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { offices } from '@/mocks/offices';
import {
  ALL_ROLES,
  ROLE_LABELS,
  AVATAR_COLORS,
} from '@/constants';
import type { UserRole } from '@/types';

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  officeId: string;
  role: UserRole;
  username: string;
  password: string;
  status: 'active' | 'inactive';
}

const DEFAULT_FORM: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  officeId: 'off-002',
  role: 'document_encoder',
  username: '',
  password: '',
  status: 'active',
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

export function AddUserPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [usernameTouched, setUsernameTouched] = useState(false);

  const fullName = useMemo(() => {
    return [form.firstName, form.middleName, form.lastName]
      .map(s => s.trim())
      .filter(Boolean)
      .join(' ');
  }, [form.firstName, form.middleName, form.lastName]);

  const suggestedUsername = useMemo(
    () => usernameFrom(form.firstName, form.lastName),
    [form.firstName, form.lastName]
  );

  const usernameValue = usernameTouched ? form.username : (form.username || suggestedUsername);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState | 'confirmPassword' | 'username' | 'password', string>> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) e.phone = 'Invalid phone number';
    if (!form.position.trim()) e.position = 'Position is required';
    if (!usernameValue) e.username = 'Username is required';
    else if (usernameValue.length < 3) e.username = 'At least 3 characters';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password && confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    return e;
  }, [form, usernameValue, confirmPassword]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      firstName: true, lastName: true, email: true, phone: true,
      position: true, username: true, password: true,
    });
    if (!isValid) {
      toast.error('Please fix the errors', 'Some required fields are missing or invalid.');
      return;
    }
    toast.success('User created', `${fullName} has been added to the system.`);
    navigate('/users');
  };

  const regeneratePassword = () => {
    setForm(f => ({ ...f, password: generatePassword() }));
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
            <Button variant="outline" onClick={() => navigate('/users')}>
              Cancel
            </Button>
            <Button
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleSubmit}
            >
              Create User
            </Button>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader
                title="Personal Information"
                description="Basic identity details for the user"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="First Name"
                  required
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, firstName: true }))}
                  placeholder="Juan"
                  error={touched.firstName ? errors.firstName : undefined}
                  leftIcon={<UserIcon className="w-4 h-4" />}
                />
                <Input
                  label="Middle Name"
                  value={form.middleName}
                  onChange={e => setForm({ ...form, middleName: e.target.value })}
                  placeholder="Santos"
                  hint="Optional"
                />
                <Input
                  label="Last Name"
                  required
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, lastName: true }))}
                  placeholder="Dela Cruz"
                  error={touched.lastName ? errors.lastName : undefined}
                />
                <Input
                  label="Email"
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  placeholder="juan@example.com"
                  error={touched.email ? errors.email : undefined}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                  placeholder="09171234567"
                  error={touched.phone ? errors.phone : undefined}
                  leftIcon={<Phone className="w-4 h-4" />}
                />
                <Input
                  label="Position"
                  required
                  value={form.position}
                  onChange={e => setForm({ ...form, position: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, position: true }))}
                  placeholder="Administrative Officer"
                  error={touched.position ? errors.position : undefined}
                  leftIcon={<Briefcase className="w-4 h-4" />}
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Work Information"
                description="Office assignment and access role"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select
                  label="Office"
                  required
                  value={form.officeId}
                  onChange={e => setForm({ ...form, officeId: e.target.value })}
                  options={offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
                />
                <Select
                  label="Role"
                  required
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
                  options={ALL_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
                  hint="Determines user permissions"
                />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Account Credentials"
                description="Login credentials for the new user"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Username"
                  required
                  value={usernameValue}
                  onChange={e => {
                    setUsernameTouched(true);
                    setForm({ ...form, username: e.target.value });
                  }}
                  onBlur={() => setTouched(t => ({ ...t, username: true }))}
                  placeholder="juan.delacruz"
                  error={touched.username ? errors.username : undefined}
                  hint={!usernameTouched && suggestedUsername ? 'Auto-generated from name' : undefined}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password<span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))}
                      placeholder="••••••••"
                      className={`w-full h-10 pl-10 pr-20 rounded-md border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 ${
                        touched.password && errors.password ? 'border-rose-400' : 'border-slate-300'
                      }`}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={regeneratePassword}
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded"
                        aria-label="Generate new password"
                        title="Generate secure password"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {touched.password && errors.password ? (
                    <p className="text-xs text-rose-600">{errors.password}</p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      User will be required to change this password on first login.
                    </p>
                  )}
                </div>
                <Input
                  label="Confirm Password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  error={confirmPassword && errors.confirmPassword ? errors.confirmPassword : undefined}
                />
              </div>
            </Card>
          </div>

          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader title="Preview" description="How the user will appear" />
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-base font-semibold shrink-0"
                >
                  {(form.firstName[0] ?? '?')}{(form.lastName[0] ?? '')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {fullName || '—'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {form.email || '—'}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {ROLE_LABELS[form.role]}
                  </p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Username</dt>
                  <dd className="font-mono font-medium text-slate-900">{usernameValue || '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Position</dt>
                  <dd className="font-medium text-slate-900 truncate ml-2">{form.position || '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Office</dt>
                  <dd className="font-medium text-slate-900 truncate ml-2">
                    {offices.find(o => o.id === form.officeId)?.name ?? '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        form.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${form.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {form.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <CardHeader title="Permissions" description="Granted by the selected role" />
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">{ROLE_LABELS[form.role]}</p>
                    <p className="text-xs text-slate-500">
                      Permissions are inherited from this role and can be adjusted per user if needed.
                    </p>
                  </div>
                </div>
                <div className="pt-3 mt-2 border-t border-slate-100 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Office assignment
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {offices.find(o => o.id === form.officeId)?.name ?? '—'}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600">
                  <p className="font-medium text-slate-900 mb-1">Before you submit</p>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>Verify the email is correct — credentials will be sent here.</li>
                    <li>The user will be required to change the password on first login.</li>
                    <li>Office assignment determines which documents they can access.</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
