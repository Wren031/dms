import { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Filter,
  Trash2,
  Mail,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useCurrentUser } from '@/features/authentication/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { notifications as allNotifications, getNotificationsByUser } from '@/mocks/notifications';
import { formatRelative, cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function NotificationsPage() {
  const user = useCurrentUser();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('all');
  const [notifications, setNotifications] = useState(() => getNotificationsByUser(user.id));

  const counts = {
    all: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    document: notifications.filter(n => n.type === 'document').length,
    system: notifications.filter(n => n.type === 'system').length,
    reminder: notifications.filter(n => n.type === 'reminder').length,
  };

  const filtered = notifications
    .filter(n => {
      if (tab === 'unread') return !n.read;
      if (tab === 'document') return n.type === 'document';
      if (tab === 'system') return n.type === 'system';
      if (tab === 'reminder') return n.type === 'reminder';
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All marked as read', 'Your notifications have been updated.');
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Clear all notifications',
      description: 'This will permanently remove all your notifications. This action cannot be undone.',
      confirmText: 'Clear All',
      variant: 'danger',
    });
    if (ok) {
      setNotifications([]);
      toast.success('Notifications cleared', 'Your notification list is now empty.');
    }
  };

  const iconMap = {
    document: FileText,
    system: AlertTriangle,
    reminder: Clock,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on document activities and system events"
        actions={
          <>
            {counts.unread > 0 && (
              <Button variant="outline" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={markAllRead}>
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" leftIcon={<Trash2 className="w-4 h-4" />} onClick={clearAll}>
                Clear All
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Total" value={counts.all} icon={<Bell className="w-5 h-5" />} />
        <Stat label="Unread" value={counts.unread} icon={<Mail className="w-5 h-5" />} accent="brand" />
        <Stat label="Document" value={counts.document} icon={<FileText className="w-5 h-5" />} accent="indigo" />
        <Stat label="System" value={counts.system} icon={<AlertTriangle className="w-5 h-5" />} accent="amber" />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'unread', label: 'Unread', count: counts.unread },
              { id: 'document', label: 'Documents', count: counts.document },
              { id: 'system', label: 'System', count: counts.system },
              { id: 'reminder', label: 'Reminders', count: counts.reminder },
            ]}
          />
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-7 h-7" />}
              title="No notifications"
              description={tab === 'unread' ? "You're all caught up!" : 'No notifications in this category.'}
              className="py-16"
            />
          ) : (
            filtered.map(n => {
              const Icon = iconMap[n.type];
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors',
                    !n.read && 'bg-brand-50/30'
                  )}
                >
                  <button
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      'w-2 h-2 mt-2 rounded-full shrink-0',
                      n.read ? 'bg-slate-300' : 'bg-brand-500'
                    )}
                    aria-label={n.read ? 'Mark as unread' : 'Mark as read'}
                  />
                  <div className={cn(
                    'w-9 h-9 rounded-md flex items-center justify-center shrink-0 border',
                    n.type === 'document' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    n.type === 'system' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-sm font-semibold', n.read ? 'text-slate-700' : 'text-slate-900')}>
                        {n.title}
                      </p>
                      <Badge
                        variant={n.type === 'document' ? 'indigo' : n.type === 'system' ? 'amber' : 'blue'}
                        size="sm"
                      >
                        {n.type}
                      </Badge>
                      {!n.read && <Badge variant="brand" size="sm">New</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs text-slate-400">{formatRelative(n.createdAt)}</p>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => markAsRead(n.id)}
                          className="text-xs text-brand-600 hover:underline font-medium"
                        >
                          View related →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon, accent = 'slate' }: { label: string; value: number; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
      <div className={cn(
        'w-10 h-10 rounded-md border flex items-center justify-center',
        accent === 'brand' ? 'bg-brand-50 text-brand-700 border-brand-200' :
        accent === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
        accent === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
        'bg-slate-50 text-slate-700 border-slate-200'
      )}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
