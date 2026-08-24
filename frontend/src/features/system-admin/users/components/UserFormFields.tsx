import type { ChangeEvent, FocusEvent } from 'react';
import { Briefcase, Mail, Phone, User as UserIcon } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PasswordInputField } from '@/features/system-admin/users/components/PasswordInputField';
import type { OfficeSummary } from '@/features/system-admin/users/types/user';
import { ALL_ROLES, ROLE_LABELS } from '@/constants';
import type { UserRole } from '@/types';
import {
  STATUS_FROM_API,
  USER_STATUS_API,
  USER_STATUS_LABELS,
  type UserStatusUi,
} from '@/features/system-admin/users/types/user';

export interface AddUserFormState {
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
  status: UserStatusUi;
}

interface TouchedMap {
  [key: string]: boolean;
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  officeId?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

const STATUS_OPTIONS: { value: UserStatusUi; label: string }[] = USER_STATUS_API.map(
  s => ({ value: STATUS_FROM_API[s], label: USER_STATUS_LABELS[s] }),
);

export interface UserFormFieldsProps {
  form: AddUserFormState;
  onChange: (next: AddUserFormState) => void;
  touched: TouchedMap;
  onTouched: (field: string) => void;
  errors: FormErrors;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  offices: OfficeSummary[];
  usernameTouched: boolean;
  onUsernameTouched: (value: boolean) => void;
  suggestedUsername: string;
  onGeneratePassword: () => void;
  disabled?: boolean;
}

export function UserFormFields({
  form,
  onChange,
  touched,
  onTouched,
  errors,
  confirmPassword,
  onConfirmPasswordChange,
  offices,
  usernameTouched,
  onUsernameTouched,
  suggestedUsername,
  onGeneratePassword,
  disabled,
}: UserFormFieldsProps) {
  const usernameValue = usernameTouched ? form.username : (form.username || suggestedUsername);
  const showConfirmAsText = Boolean(form.password) && Boolean(confirmPassword) && confirmPassword === form.password;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Personal Information"
          description="Basic identity details for the user"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="First Name"
            name="firstName"
            required
            value={form.firstName}
            onChange={e => onChange({ ...form, firstName: e.target.value })}
            onBlur={() => onTouched('firstName')}
            placeholder="Juan"
            error={touched.firstName ? errors.firstName : undefined}
            leftIcon={<UserIcon className="w-4 h-4" />}
            disabled={disabled}
          />
          <Input
            label="Middle Name"
            name="middleName"
            value={form.middleName}
            onChange={e => onChange({ ...form, middleName: e.target.value })}
            placeholder="Santos"
            hint="Optional"
            disabled={disabled}
          />
          <Input
            label="Last Name"
            name="lastName"
            required
            value={form.lastName}
            onChange={e => onChange({ ...form, lastName: e.target.value })}
            onBlur={() => onTouched('lastName')}
            placeholder="Dela Cruz"
            error={touched.lastName ? errors.lastName : undefined}
            disabled={disabled}
          />
          <Input
            label="Email"
            name="email"
            required
            type="email"
            value={form.email}
            onChange={e => onChange({ ...form, email: e.target.value })}
            onBlur={() => onTouched('email')}
            placeholder="juan@example.com"
            error={touched.email ? errors.email : undefined}
            leftIcon={<Mail className="w-4 h-4" />}
            disabled={disabled}
          />
          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={e => onChange({ ...form, phone: e.target.value })}
            onBlur={() => onTouched('phone')}
            placeholder="09171234567"
            error={touched.phone ? errors.phone : undefined}
            leftIcon={<Phone className="w-4 h-4" />}
            disabled={disabled}
          />
          <Input
            label="Position"
            name="position"
            required
            value={form.position}
            onChange={e => onChange({ ...form, position: e.target.value })}
            onBlur={() => onTouched('position')}
            placeholder="Administrative Officer"
            error={touched.position ? errors.position : undefined}
            leftIcon={<Briefcase className="w-4 h-4" />}
            disabled={disabled}
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
            name="officeId"
            required
            value={form.officeId}
            onChange={e => onChange({ ...form, officeId: e.target.value })}
            options={offices.map(o => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
            disabled={disabled}
          />
          <Select
            label="Role"
            name="role"
            required
            value={form.role}
            onChange={e => onChange({ ...form, role: e.target.value as UserRole })}
            options={ALL_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
            hint="Determines user permissions"
            disabled={disabled}
          />
          <Select
            label="Status"
            name="status"
            value={form.status}
            onChange={e =>
              onChange({ ...form, status: e.target.value as UserStatusUi })
            }
            options={STATUS_OPTIONS}
            disabled={disabled}
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
            name="username"
            required
            value={usernameValue}
            onChange={e => {
              onUsernameTouched(true);
              onChange({ ...form, username: e.target.value });
            }}
            onBlur={() => onTouched('username')}
            placeholder="juan.delacruz"
            error={touched.username ? errors.username : undefined}
            hint={!usernameTouched && suggestedUsername ? 'Auto-generated from name' : undefined}
            disabled={disabled}
          />
          <PasswordInputField
            value={form.password}
            onChange={value => onChange({ ...form, password: value })}
            onBlur={() => onTouched('password')}
            error={touched.password ? errors.password : undefined}
            required
            hint={
              touched.password && errors.password
                ? undefined
                : 'User will be required to change this password on first login.'
            }
            showGenerate
            onGenerate={onGeneratePassword}
            disabled={disabled}
            name="password"
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            required
            type={showConfirmAsText ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onConfirmPasswordChange(e.target.value)
            }
            onBlur={(e: FocusEvent<HTMLInputElement>) => onTouched('confirmPassword')}
            placeholder="••••••••"
            error={confirmPassword ? errors.confirmPassword : undefined}
            disabled={disabled}
            autoComplete="new-password"
          />
        </div>
      </Card>
    </div>
  );
}
