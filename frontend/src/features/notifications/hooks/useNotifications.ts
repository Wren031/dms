import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notificationsService } from '@/features/notifications/services/notifications.service';
import type {
  NotificationItem,
  NotificationListFilters,
  NotificationListResponse,
  NotificationType,
} from '@/features/notifications/types/notification';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseNotificationsOptions {
  /** Initial server-side filter. Only applied on the very first mount. */
  initial?: NotificationListFilters;
}

export interface UseNotificationsReturn {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  errorMessage: string | null;

  fetchList: (filters?: NotificationListFilters) => Promise<NotificationListResponse | null>;
  markRead: (ids: string[]) => Promise<number | null>;
  markAllRead: () => Promise<number | null>;
  remove: (id: string) => Promise<boolean | null>;
  clearAll: () => Promise<number | null>;

  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const initial = options.initial;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initial?.page ?? 1);
  const [pageSize, setPageSize] = useState(initial?.pageSize ?? 20);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Capture the initial filter so it is only used on mount; subsequent renders
  // never re-trigger the initial fetch even if the caller passes a new object.
  const initialRef = useRef<NotificationListFilters | undefined>(initial);
  const didInitRef = useRef(false);

  const fetchList = useCallback(async (filters?: NotificationListFilters) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await notificationsService.list(filters);
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setPageSize(res.pageSize);
      return res;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not load notifications.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const { count } = await notificationsService.unreadCount();
      setUnreadCount(count);
    } catch {
      // Silent: bell dot is decorative.
    }
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchList(initialRef.current).then(() => refreshUnreadCount());
  }, [fetchList, refreshUnreadCount]);

  const markRead = useCallback(async (ids: string[]): Promise<number | null> => {
    if (ids.length === 0) return 0;
    setErrorMessage(null);
    try {
      const { count } = await notificationsService.markRead(ids);
      const idSet = new Set(ids);
      setItems(prev =>
        prev.map(n => (idSet.has(n.id) ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount(c => Math.max(0, c - count));
      return count;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not mark notifications as read.'));
      return null;
    }
  }, []);

  const markAllRead = useCallback(async (): Promise<number | null> => {
    setErrorMessage(null);
    try {
      const { count } = await notificationsService.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      return count;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not mark all notifications as read.'));
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean | null> => {
    setErrorMessage(null);
    try {
      const { success } = await notificationsService.remove(id);
      if (success) {
        setItems(prev => {
          const removed = prev.find(n => n.id === id);
          if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
          return prev.filter(n => n.id !== id);
        });
      }
      return success;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not delete notification.'));
      return null;
    }
  }, []);

  const clearAll = useCallback(async (): Promise<number | null> => {
    setErrorMessage(null);
    try {
      const { removed } = await notificationsService.clearAll(items);
      setItems([]);
      setTotal(0);
      setUnreadCount(0);
      return removed;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not clear notifications.'));
      return null;
    }
  }, [items]);

  return useMemo(
    () => ({
      items,
      total,
      page,
      pageSize,
      loading,
      errorMessage,
      fetchList,
      markRead,
      markAllRead,
      remove,
      clearAll,
      unreadCount,
      refreshUnreadCount,
    }),
    [
      items,
      total,
      page,
      pageSize,
      loading,
      errorMessage,
      fetchList,
      markRead,
      markAllRead,
      remove,
      clearAll,
      unreadCount,
      refreshUnreadCount,
    ],
  );
}

/** Translate the active UI tab into a stable server-side filter. */
export function tabToServerFilter(tab: string): NotificationListFilters {
  if (tab === 'unread') return { read: false };
  if (tab === 'document' || tab === 'system' || tab === 'reminder') {
    return { type: tab as NotificationType };
  }
  return {};
}