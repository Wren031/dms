import { useState } from 'react';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Lock,
  Bell,
  Database,
  Globe,
  Mail,
  Save,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth, useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { getOfficeById } from '@/mocks/offices';
import { ROLE_LABELS } from '@/constants';

export function SettingsPage() {
  const user = useCurrentUser();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('profile');

  const [profile, setProfile] = useState({
    fullName: user.fullName,
    email: user.email,
    position: user.position,
    phone: '+63 917 555 1234',
  });

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    documentAlerts: true,
    routingUpdates: true,
    weeklyDigest: false,
    soundEnabled: true,
  });

  const office = getOfficeById(user.officeId);

  const saveProfile = () => toast.success('Profile updated', 'Your profile has been saved successfully.');
  const changePassword = () => {
    if (password.new !== password.confirm) {
      toast.error('Passwords do not match', 'Please make sure your new passwords match.');
      return;
    }
    if (password.new.length < 8) {
      toast.error('Password too short', 'Password must be at least 8 characters.');
      return;
    }
    setPassword({ current: '', new: '', confirm: '' });
    toast.success('Password changed', 'Your password has been updated.');
  };
  const savePrefs = () => toast.success('Preferences saved', 'Your notification preferences have been updated.');

  const resetSystem = async () => {
    const ok = await confirm({
      title: 'Reset system data',
      description: 'This will reset all mock data to its default state. This is a development action.',
      confirmText: 'Reset Data',
      variant: 'danger',
    });
    if (ok) {
      toast.success('System reset', 'All data has been reset to defaults.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and system configuration"
      />

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> },
              { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
              { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
              ...(hasPermission('settings.view') ? [
                { id: 'system', label: 'System', icon: <Database className="w-4 h-4" /> },
              ] : []),
            ]}
          />
        </div>

        <div className="p-5">
          {tab === 'profile' && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-center gap-4">
                <Avatar name={user.fullName} color={user.avatarColor} size="xl" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{user.fullName}</h3>
                  <p className="text-sm text-slate-600">{ROLE_LABELS[user.role]} · {office?.name}</p>
                  <p className="text-xs text-slate-500 mt-1">User ID: <span className="font-mono">{user.id}</span></p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Avatar
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={profile.fullName}
                    onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                  />
                  <Input
                    label="Position"
                    value={profile.position}
                    onChange={e => setProfile({ ...profile, position: e.target.value })}
                  />
                  <Input
                    label="Phone Number"
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button leftIcon={<Save className="w-4 h-4" />} onClick={saveProfile}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Change Password</h3>
                <p className="text-sm text-slate-500 mt-1">Update your password to keep your account secure.</p>
              </div>

              <div className="space-y-3">
                <Input
                  label="Current Password"
                  type="password"
                  value={password.current}
                  onChange={e => setPassword({ ...password, current: e.target.value })}
                />
                <Input
                  label="New Password"
                  type="password"
                  value={password.new}
                  onChange={e => setPassword({ ...password, new: e.target.value })}
                  hint="Minimum 8 characters, include a number and special character"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={password.confirm}
                  onChange={e => setPassword({ ...password, confirm: e.target.value })}
                />
                <div className="pt-2 flex justify-end">
                  <Button leftIcon={<Lock className="w-4 h-4" />} onClick={changePassword}>
                    Update Password
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-base font-semibold text-slate-900">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                <div className="mt-4 p-4 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">2FA is currently disabled</p>
                    <p className="text-xs text-slate-500 mt-0.5">Recommended for all administrative accounts.</p>
                  </div>
                  <Button variant="outline" size="sm">Enable 2FA</Button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-base font-semibold text-slate-900">Active Sessions</h3>
                <p className="text-sm text-slate-500 mt-1">Devices currently logged in to your account.</p>
                <div className="mt-4 space-y-2">
                  <SessionItem device="Chrome on Windows" location="Quezon City, PH" current />
                  <SessionItem device="Safari on macOS" location="Quezon City, PH" />
                  <SessionItem device="Chrome on Android" location="Manila, PH" />
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Notification Preferences</h3>
                <p className="text-sm text-slate-500 mt-1">Choose how and when you want to be notified.</p>
              </div>

              <div className="space-y-2">
                <PrefRow
                  label="Email Notifications"
                  description="Receive notifications via email"
                  checked={prefs.emailNotifications}
                  onChange={v => setPrefs({ ...prefs, emailNotifications: v })}
                  icon={<Mail className="w-4 h-4" />}
                />
                <PrefRow
                  label="Document Alerts"
                  description="Get notified about new document assignments"
                  checked={prefs.documentAlerts}
                  onChange={v => setPrefs({ ...prefs, documentAlerts: v })}
                  icon={<Bell className="w-4 h-4" />}
                />
                <PrefRow
                  label="Routing Updates"
                  description="Notifications when documents are routed to you"
                  checked={prefs.routingUpdates}
                  onChange={v => setPrefs({ ...prefs, routingUpdates: v })}
                  icon={<Globe className="w-4 h-4" />}
                />
                <PrefRow
                  label="Weekly Digest"
                  description="Summary email every Monday morning"
                  checked={prefs.weeklyDigest}
                  onChange={v => setPrefs({ ...prefs, weeklyDigest: v })}
                  icon={<Mail className="w-4 h-4" />}
                />
                <PrefRow
                  label="Sound Effects"
                  description="Play sound for new notifications"
                  checked={prefs.soundEnabled}
                  onChange={v => setPrefs({ ...prefs, soundEnabled: v })}
                  icon={<Bell className="w-4 h-4" />}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button leftIcon={<Save className="w-4 h-4" />} onClick={savePrefs}>
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {tab === 'system' && hasPermission('settings.view') && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <h3 className="text-base font-semibold text-slate-900">System Information</h3>
                <p className="text-sm text-slate-500 mt-1">General system details and configuration.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="System Name" value="CityDocs DMS" readOnly />
                <Input label="Version" value="1.0.0 (Build 2026.08)" readOnly />
                <Select
                  label="Default Language"
                  value="en"
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'fil', label: 'Filipino' },
                  ]}
                />
                <Select
                  label="Date Format"
                  value="mdy"
                  options={[
                    { value: 'mdy', label: 'MMM DD, YYYY' },
                    { value: 'dmy', label: 'DD MMM YYYY' },
                    { value: 'ymd', label: 'YYYY-MM-DD' },
                  ]}
                />
                <Select
                  label="Timezone"
                  value="asia-manila"
                  options={[
                    { value: 'asia-manila', label: 'Asia/Manila (UTC+8)' },
                  ]}
                />
                <Select
                  label="Document Retention"
                  value="3y"
                  options={[
                    { value: '1y', label: '1 Year' },
                    { value: '3y', label: '3 Years (Default)' },
                    { value: '5y', label: '5 Years' },
                    { value: '10y', label: '10 Years' },
                    { value: 'perm', label: 'Permanent' },
                  ]}
                />
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-base font-semibold text-slate-900">System Health</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <HealthItem label="Database" status="healthy" value="2.3 GB / 10 GB" />
                  <HealthItem label="API Response" status="healthy" value="120 ms avg" />
                  <HealthItem label="Last Backup" status="healthy" value="2 hours ago" />
                  <HealthItem label="Active Sessions" status="healthy" value="12 users" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-base font-semibold text-rose-700">Danger Zone</h3>
                <p className="text-sm text-slate-500 mt-1">These actions cannot be undone. Proceed with caution.</p>
                <div className="mt-3 space-y-2">
                  <DangerItem
                    label="Reset Mock Data"
                    description="Restore all mock data to default state. Useful for development."
                    onClick={resetSystem}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function PrefRow({ label, description, checked, onChange, icon }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md border border-slate-200">
      <div className="w-9 h-9 rounded-md bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Checkbox checked={checked} onChange={onChange} />
    </div>
  );
}

function SessionItem({ device, location, current }: { device: string; location: string; current?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border border-slate-200">
      <div>
        <p className="text-sm font-medium text-slate-900">{device}</p>
        <p className="text-xs text-slate-500">{location}</p>
      </div>
      <div className="flex items-center gap-2">
        {current && <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Current</span>}
        {!current && (
          <Button variant="ghost" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

function HealthItem({ label, status, value }: { label: string; status: 'healthy' | 'warning' | 'error'; value: string }) {
  return (
    <div className="p-3 rounded-md border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${
          status === 'healthy' ? 'bg-emerald-500' :
          status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
        }`} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DangerItem({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-rose-200 bg-rose-50">
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-900">{label}</p>
        <p className="text-xs text-rose-700">{description}</p>
      </div>
      <Button variant="danger" size="sm" onClick={onClick}>Execute</Button>
    </div>
  );
}
