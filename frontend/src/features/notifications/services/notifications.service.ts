import { apiFetch } from '@/lib/apiClient';
import type {
  NotificationItem,
  NotificationListFilters,
  NotificationListResponse,
} from '@/features/notifications/types/notification';

export class NotificationsApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'NotificationsApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init, {
    ErrorClass: NotificationsApiError,
    source: 'notifications.service',
  });
}

function buildQuery(filters?: NotificationListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.type) params.set('type', filters.type);
  if (typeof filters.read === 'boolean') params.set('read', String(filters.read));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const removeOne = (id: string): Promise<{ success: boolean }> =>
  request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' });

export const notificationsService = {
  list(filters?: NotificationListFilters): Promise<NotificationListResponse> {
    return request<NotificationListResponse>(`/notifications${buildQuery(filters)}`);
  },

  unreadCount(): Promise<{ count: number }> {
    return request<{ count: number }>('/notifications/unread-count');
  },

  markRead(ids: string[]): Promise<{ count: number }> {
    return request<{ count: number }>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  markAllRead(): Promise<{ count: number }> {
    return request<{ count: number }>('/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  remove(id: string): Promise<{ success: boolean }> {
    return removeOne(id);
  },

  async clearAll(items: NotificationItem[]): Promise<{ removed: number }> {
    const results = await Promise.allSettled(items.map(n => removeOne(n.id)));
    const removed = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    return { removed };
  },
};