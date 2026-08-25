import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  computeCounts,
  type NotificationTab,
} from '@/features/notifications/types/notification';
import {
  tabToServerFilter,
  useNotifications,
} from '@/features/notifications/hooks/useNotifications';
import {
  NotificationEmpty,
  NotificationRow,
  NotificationStatCard,
} from '@/features/notifications/components';

const PAGE_SIZE = 50;

export function NotificationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<NotificationTab>('all');

  const {
    items,
    loading,
    errorMessage,
    fetchList,
    markRead,
    markAllRead,
    remove,
    clearAll,
    unreadCount,
  } = useNotifications();

  // Server-side filter for the active tab — re-fetch only when tab or
  // pageSize change, not on every render.
  useEffect(() => {
    fetchList({ ...tabToServerFilter(tab), pageSize: PAGE_SIZE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Surface fetch errors once.
  useEffect(() => {
    if (errorMessage) toast.error('Failed to load notifications', errorMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  const counts = useMemo(() => computeCounts(items), [items]);
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [items],
  );

  const handleToggleRead = async (id: string) => {
    const target = items.find(n => n.id === id);
    if (!target || target.read) return;
    await markRead([id]);
  };

  const handleMarkAllRead = async () => {
    if (counts.unread === 0) return;
    const count = await markAllRead();
    if (count !== null) {
      toast.success('All marked as read', `${count} notification${count === 1 ? '' : 's'} updated.`);
    } else {
      toast.error('Could not mark all as read', 'Please retry.');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete notification',
      description: 'This notification will be permanently removed.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const success = await remove(id);
    if (success) toast.success('Notification deleted');
    else if (success === false) toast.error('Could not delete', 'Please retry.');
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Clear all notifications',
      description: 'This will permanently remove all your notifications. This action cannot be undone.',
      confirmText: 'Clear All',
      variant: 'danger',
    });
    if (!ok) return;
    const removed = await clearAll();
    if (removed !== null) {
      toast.success('Notifications cleared', `${removed} removed from your inbox.`);
    } else {
      toast.error('Could not clear notifications', 'Please retry.');
    }
  };

  const handleTabChange = (next: string) => {
    setTab(next as NotificationTab);
  };

  const tabItems = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'document', label: 'Documents', count: counts.document },
    { id: 'system', label: 'System', count: counts.system },
    { id: 'reminder', label: 'Reminders', count: counts.reminder },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on document activities and system events"
        actions={
          <>
            {counts.unread > 0 && (
              <Button
                variant="outline"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleMarkAllRead}
                disabled={loading}
              >
                Mark All Read
              </Button>
            )}
            {items.length > 0 && (
              <Button
                variant="outline"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleClearAll}
                disabled={loading}
              >
                Clear All
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <NotificationStatCard label="Total" value={counts.all} icon={<Bell className="w-5 h-5" />} />
        <NotificationStatCard
          label="Unread"
          value={counts.unread}
          icon={<Mail className="w-5 h-5" />}
          accent="brand"
        />
        <NotificationStatCard
          label="Document"
          value={counts.document}
          icon={<FileText className="w-5 h-5" />}
          accent="indigo"
        />
        <NotificationStatCard
          label="System"
          value={counts.system}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="amber"
        />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4 border-b border-slate-200">
          <Tabs value={tab} onChange={handleTabChange} items={tabItems} />
        </div>

        <div className="divide-y divide-slate-100">
          {loading && items.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">Loading notifications…</p>
          ) : sorted.length === 0 ? (
            <NotificationEmpty
              icon={<Bell className="w-7 h-7" />}
              title="No notifications"
              description={
                tab === 'unread'
                  ? "You're all caught up!"
                  : 'No notifications in this category.'
              }
            />
          ) : (
            sorted.map(n => (
              <NotificationRow
                key={n.id}
                notification={n}
                onToggleRead={handleToggleRead}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </Card>

      {unreadCount > 0 && (
        <p className="text-xs text-slate-500 text-center">
          {unreadCount} unread notification{unreadCount === 1 ? '' : 's'} on the server.
        </p>
      )}
    </div>
  );
}