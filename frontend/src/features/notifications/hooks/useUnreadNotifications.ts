import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { notificationsService } from '@/features/notifications/services/notifications.service';

export interface UseUnreadNotificationsReturn {
  unreadCount: number;
  setUnreadCount: Dispatch<SetStateAction<number>>;
  loading: boolean;
}

const POLL_INTERVAL_MS = 90_000;
const POLL_BACKOFF_MS = 30_000;

export function useUnreadNotifications(enabled: boolean): UseUnreadNotificationsReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let backoff: number | null = null;

    const tick = async () => {
      setLoading(true);
      try {
        const { count } = await notificationsService.unreadCount();
        if (active) {
          setUnreadCount(count);
          backoff = null;
        }
      } catch (err) {
        if (!active) return;
        const status =
          err && typeof err === 'object' && 'status' in err
            ? (err as { status?: number }).status
            : undefined;
        if (status === 429) {
          backoff = window.setTimeout(tick, POLL_BACKOFF_MS);
          return;
        }
      } finally {
        if (active) setLoading(false);
      }

      if (active && backoff === null) {
        backoff = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    tick();

    return () => {
      active = false;
      if (backoff !== null) window.clearTimeout(backoff);
    };
  }, [enabled]);

  return { unreadCount, setUnreadCount, loading };
}