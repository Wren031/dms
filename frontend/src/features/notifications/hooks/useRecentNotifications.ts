import { useCallback, useEffect, useState } from 'react';
import { notificationsService } from '@/features/notifications/services/notifications.service';
import type { NotificationItem } from '@/features/notifications/types/notification';

export interface UseRecentNotificationsReturn {
  items: NotificationItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export function useRecentNotifications(
  active: boolean,
  limit = 6,
  unreadOnly = false,
): UseRecentNotificationsReturn {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationsService.list({
        pageSize: limit,
        ...(unreadOnly ? { read: false } : {}),
      });
      setItems(list.items);
    } catch {
      // Bell is decorative; swallow.
    } finally {
      setLoading(false);
    }
  }, [limit, unreadOnly]);

  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      if (unreadOnly) {
        setItems(prev => prev.filter(n => n.id !== id));
      } else {
        setItems(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
        );
      }
      try {
        await notificationsService.markRead([id]);
      } catch {
        // Re-sync from server on failure.
        refresh();
      }
    },
    [unreadOnly, refresh],
  );

  return { items, loading, refresh, markRead };
}