import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Lock,
  Bell,
  Database,
  Globe,
  Mail,
  Save,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Server,
  Activity,
  Sparkles,
  Clock,
  HardDrive,
  Users,
  Inbox,
  AtSign,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { usePasswordForm } from '@/features/profile/hooks/usePasswordForm';
import { useNotificationPrefs } from '@/features/profile/hooks/useNotificationPrefs';
import { useSessions } from '@/features/profile/hooks/useSessions';
import {
  DangerItem,
  HealthItem,
  PrefRow,
  SessionItem,
  SettingsHero,
  SettingsNav,
  SettingsSection,
  type SettingsNavItem,
} from '@/features/profile/components';

export function SettingsPage() {
  const user = useCurrentUser();
  const { hasPermission, updateCurrentUser, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [tab, setTab] = useState('profile');

  const profile = useProfileForm(user);
  const password = usePasswordForm();
  const prefs = useNotificationPrefs(user.id);
  const sessions = useSessions(tab === 'security');

  const officeName = user.officeName ?? null;
  const isAdmin = hasPermission('settings.view');

  const handleSaveProfile = async () => {
    if (profile.emailChanged) {
      const ok = await confirm({
        title: 'Change email & sign out?',
        description:
          "We'll save your new email, then sign you out so you can sign back in with it. Continue?",
        confirmText: 'Save & Sign Out',
        variant: 'primary',
      });
      if (!ok) return;
    }

    const updated = await profile.save();
    if (!updated) {
      if (profile.errorMessage) toast.error('Update failed', profile.errorMessage);
      return;
    }

    updateCurrentUser(updated);
    toast.success('Profile updated', 'Your profile has been saved.');

    if (profile.emailChanged) {
      await logout();
      navigate('/login');
    }
  };

  const handleChangePassword = async () => {
    const ok = await password.submit();
    if (!ok) {
      toast.error('Could not change password', password.errorMessage ?? 'Please retry.');
      return;
    }
    toast.success('Password changed', 'You will be signed out from other devices on next request.');
  };

  const handleSavePrefs = async () => {
    await prefs.save();
    toast.success('Preferences saved', 'Stored locally on this device. Server sync coming soon.');
  };

  const handleRevokeSession = async (sessionId: string) => {
    const ok = await confirm({
      title: 'Revoke session',
      description: 'That device will be signed out immediately.',
      confirmText: 'Revoke',
      variant: 'danger',
    });
    if (!ok) return;
    const revoked = await sessions.revoke(sessionId);
    if (revoked) toast.success('Session revoked');
    else toast.error('Revoke failed', sessions.errorMessage ?? 'Please retry.');
  };

  const handleRevokeAllSessions = async () => {
    const ok = await confirm({
      title: 'Revoke all other sessions',
      description: 'All other devices will be signed out. Your current session will remain active.',
      confirmText: 'Revoke All',
      variant: 'danger',
    });
    if (!ok) return;
    const revoked = await sessions.revokeAllOthers();
    if (revoked) toast.success('All other sessions revoked');
    else toast.error('Revoke failed', sessions.errorMessage ?? 'Please retry.');
  };

  const navItems: SettingsNavItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserIcon className="h-4 w-4" />,
      description: 'Personal info, contact details',
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Lock className="h-4 w-4" />,
      description: 'Password, 2FA, sessions',
      badge: sessions.sessions.filter(s => !s.current).length || undefined,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      description: 'Alerts, digests, sound',
    },
    ...(isAdmin
      ? [
          {
            id: 'system',
            label: 'System',
            icon: <Database className="h-4 w-4" />,
            description: 'Config & maintenance',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, security, and notification preferences"
        eyebrow="Personal"
      />

      <SettingsHero
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        officeName={officeName}
        userId={user.id}
        avatarColor={user.avatarColor}
        createdAt={user.createdAt}
        isDirty={profile.isDirty}
      />

      <SettingsNav items={navItems} value={tab} onChange={setTab} />

      <div className="space-y-6">
        {tab === 'profile' && (
          <SettingsSection
            title="Personal information"
            description="Keep your name, contact, and role details up to date."
            icon={<UserIcon className="h-5 w-5" />}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={profile.reset}
                  disabled={!profile.isDirty || profile.isSaving}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                  onClick={handleSaveProfile}
                  disabled={!profile.isDirty || profile.isSaving}
                >
                  {profile.isSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <FieldGroup label="First name" required>
                <Input
                  value={profile.form.firstName}
                  onChange={e => profile.setField('firstName', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Middle name">
                <Input
                  value={profile.form.middleName}
                  onChange={e => profile.setField('middleName', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Last name" required>
                <Input
                  value={profile.form.lastName}
                  onChange={e => profile.setField('lastName', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup
                label="Email"
                required
                hint={profile.emailChanged ? 'You will be signed out.' : 'Used for sign-in.'}
              >
                <Input
                  type="email"
                  leftIcon={<AtSign className="h-4 w-4" />}
                  value={profile.form.email}
                  onChange={e => profile.setField('email', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Position" required hint="Your role within the office.">
                <Input
                  leftIcon={<ShieldCheck className="h-4 w-4" />}
                  value={profile.form.position}
                  onChange={e => profile.setField('position', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Phone number" hint="Optional — for SMS notifications.">
                <Input
                  value={profile.form.phone}
                  onChange={e => profile.setField('phone', e.target.value)}
                  placeholder="+63 917 555 1234"
                />
              </FieldGroup>
            </div>
            {profile.errorMessage && !profile.validationError && (
              <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">
                {profile.errorMessage}
              </p>
            )}
          </SettingsSection>
        )}

        {tab === 'security' && (
          <>
            <SettingsSection
              title="Change password"
              description="Pick a strong password you don't use anywhere else."
              icon={<Lock className="h-5 w-5" />}
              actions={
                <Button
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                  onClick={handleChangePassword}
                  disabled={password.isSaving || !password.isDirty}
                >
                  {password.isSaving ? 'Updating…' : 'Update password'}
                </Button>
              }
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FieldGroup label="Current password">
                  <Input
                    type="password"
                    value={password.form.current}
                    onChange={e => password.setField('current', e.target.value)}
                    autoComplete="current-password"
                  />
                </FieldGroup>
                <FieldGroup label="New password" hint="8+ characters, letter + number">
                  <Input
                    type="password"
                    value={password.form.next}
                    onChange={e => password.setField('next', e.target.value)}
                    autoComplete="new-password"
                  />
                </FieldGroup>
                <FieldGroup label="Confirm new password">
                  <Input
                    type="password"
                    value={password.form.confirm}
                    onChange={e => password.setField('confirm', e.target.value)}
                    autoComplete="new-password"
                  />
                </FieldGroup>
              </div>
              {password.errorMessage && (
                <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">
                  {password.errorMessage}
                </p>
              )}
            </SettingsSection>

            <SettingsSection
              title="Two-factor authentication"
              description="Add an extra layer of security at sign-in."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 border border-slate-200">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">2FA is currently disabled</p>
                    <p className="text-xs text-slate-500">
                      Recommended for all administrative accounts.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                  Coming soon
                </span>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Active sessions"
              description="Devices currently logged in to your account."
              icon={<Activity className="h-5 w-5" />}
              actions={
                sessions.sessions.filter(s => !s.current).length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={handleRevokeAllSessions}
                  >
                    Revoke all others
                  </Button>
                ) : undefined
              }
            >
              {sessions.loading ? (
                <p className="text-sm text-slate-500 py-6 text-center">Loading sessions…</p>
              ) : sessions.sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">No active sessions</p>
                  <p className="mt-1 text-xs text-slate-500">
                    You appear to be signed out everywhere. Reload the page to refresh.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sessions.sessions.map(s => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      onRevoke={() => handleRevokeSession(s.id)}
                    />
                  ))}
                </div>
              )}
            </SettingsSection>
          </>
        )}

        {tab === 'notifications' && (
          <div className="space-y-6">
            <SettingsSection
              title="Notification preferences"
              description="Choose how and when you want to be notified. Saved on this device."
              icon={<Bell className="h-5 w-5" />}
              actions={
                <Button
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                  onClick={handleSavePrefs}
                  disabled={prefs.isSaving}
                >
                  {prefs.isSaving ? 'Saving…' : 'Save preferences'}
                </Button>
              }
            >
              <div className="space-y-2.5">
                <PrefRow
                  label="Email notifications"
                  description="Receive notifications via email"
                  checked={prefs.prefs.emailNotifications}
                  onChange={v => prefs.setPref('emailNotifications', v)}
                  icon={<Mail className="h-4 w-4" />}
                  accent="brand"
                />
                <PrefRow
                  label="Document alerts"
                  description="Get notified about new document assignments"
                  checked={prefs.prefs.documentAlerts}
                  onChange={v => prefs.setPref('documentAlerts', v)}
                  icon={<Inbox className="h-4 w-4" />}
                  accent="indigo"
                />
                <PrefRow
                  label="Routing updates"
                  description="Notifications when documents are routed to you"
                  checked={prefs.prefs.routingUpdates}
                  onChange={v => prefs.setPref('routingUpdates', v)}
                  icon={<Globe className="h-4 w-4" />}
                  accent="emerald"
                />
                <PrefRow
                  label="Weekly digest"
                  description="Summary email every Monday morning"
                  checked={prefs.prefs.weeklyDigest}
                  onChange={v => prefs.setPref('weeklyDigest', v)}
                  icon={<Activity className="h-4 w-4" />}
                  accent="amber"
                />
                <PrefRow
                  label="Sound effects"
                  description="Play sound for new notifications"
                  checked={prefs.prefs.soundEnabled}
                  onChange={v => prefs.setPref('soundEnabled', v)}
                  icon={<Sparkles className="h-4 w-4" />}
                  accent="brand"
                />
              </div>
            </SettingsSection>
          </div>
        )}

        {tab === 'system' && isAdmin && (
          <>
            <SettingsSection
              title="System configuration"
              description="General system details and configuration."
              icon={<Server className="h-5 w-5" />}
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <FieldGroup label="System name">
                  <Input value="CityDocs DMS" readOnly />
                </FieldGroup>
                <FieldGroup label="Version">
                  <Input value="1.0.0 (Build 2026.08)" readOnly />
                </FieldGroup>
                <FieldGroup label="Default language">
                  <Select
                    value="en"
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'fil', label: 'Filipino' },
                    ]}
                  />
                </FieldGroup>
                <FieldGroup label="Date format">
                  <Select
                    value="mdy"
                    options={[
                      { value: 'mdy', label: 'MMM DD, YYYY' },
                      { value: 'dmy', label: 'DD MMM YYYY' },
                      { value: 'ymd', label: 'YYYY-MM-DD' },
                    ]}
                  />
                </FieldGroup>
                <FieldGroup label="Timezone">
                  <Select
                    value="asia-manila"
                    options={[{ value: 'asia-manila', label: 'Asia/Manila (UTC+8)' }]}
                  />
                </FieldGroup>
                <FieldGroup label="Document retention">
                  <Select
                    value="3y"
                    options={[
                      { value: '1y', label: '1 Year' },
                      { value: '3y', label: '3 Years (Default)' },
                      { value: '5y', label: '5 Years' },
                      { value: '10y', label: '10 Years' },
                      { value: 'perm', label: 'Permanent' },
                    ]}
                  />
                </FieldGroup>
              </div>
            </SettingsSection>

            <SettingsSection
              title="System health"
              description="Real-time health signals across infrastructure components."
              icon={<Activity className="h-5 w-5" />}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <HealthItem
                  label="Database"
                  status="healthy"
                  value="2.3 / 10 GB"
                  icon={<HardDrive className="h-4 w-4" />}
                />
                <HealthItem
                  label="API response"
                  status="healthy"
                  value="120 ms"
                  icon={<Activity className="h-4 w-4" />}
                />
                <HealthItem
                  label="Last backup"
                  status="healthy"
                  value="2h ago"
                  icon={<Clock className="h-4 w-4" />}
                />
                <HealthItem
                  label="Active sessions"
                  status="healthy"
                  value="12 users"
                  icon={<Users className="h-4 w-4" />}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title="Danger zone"
              description="These actions cannot be undone. Proceed with caution."
              icon={<Trash2 className="h-5 w-5" />}
              tone="danger"
            >
              <DangerItem
                label="Delete all sessions"
                description="Revoke every active session including this one. All users will be signed out."
                onClick={handleRevokeAllSessions}
                icon={<Database className="h-4 w-4" />}
              />
            </SettingsSection>
          </>
        )}
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}