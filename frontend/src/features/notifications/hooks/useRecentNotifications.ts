import { useCallback, useEffect, useState } from 'react';
import { notificationsService } from '@/features/notifications/services/notifications.service';
import type { NotificationItem } from '@/features/notifications/types/notification';

export interface UseRecentNotificationsReturn {
  items: NotificationItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export function useRecentNotifications(active: boolean, limit = 6): UseRecentNotificationsReturn {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationsService.list({ pageSize: limit });
      setItems(list.items);
    } catch {
      // Bell is decorative; swallow.
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);

  const markRead = useCallback(async (id: string) => {
    setItems(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
    );
    try {
      await notificationsService.markRead([id]);
    } catch {
      // Re-sync from server on failure.
      refresh();
    }
  }, [refresh]);

  return { items, loading, refresh, markRead };
}