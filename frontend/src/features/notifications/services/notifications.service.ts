import { API_BASE_URL } from '@/lib/apiConfig';
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

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith(`${name}=`))
    ?.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : undefined;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = readCookie('dms_csrf');
  if (csrfToken) headers.set('x-xsrf-token', csrfToken);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new NotificationsApiError(0, 'Network error — please retry.');
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let details: unknown;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
      details = body;
    } catch {
      details = undefined;
    }
    if (response.status === 429) {
      message = 'Too many requests — please slow down and retry in a moment.';
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[notifications.service] ${init.method ?? 'GET'} ${path} → ${response.status}`, message);
    }
    throw new NotificationsApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
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