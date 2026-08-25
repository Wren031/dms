import { API_BASE_URL } from '@/lib/apiConfig';
import type {
  AuditLogItem,
  AuditLogListFilters,
  AuditLogListResponse,
} from '@/features/system-admin/audit-logs/types/audit-log';

export class AuditLogsApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AuditLogsApiError';
    this.status = status;
    this.details = details;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${name}=`))
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
    throw new AuditLogsApiError(0, 'Network error — please retry.');
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
      console.warn(`[audit-logs.service] ${init.method ?? 'GET'} ${path} → ${response.status}`, message);
    }
    throw new AuditLogsApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
}

function buildQuery(filters?: AuditLogListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.module) params.set('module', filters.module);
  if (filters.action) params.set('action', filters.action);
  if (filters.targetType) params.set('targetType', filters.targetType);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const auditLogsService = {
  list(filters?: AuditLogListFilters): Promise<AuditLogListResponse> {
    return request<AuditLogListResponse>(`/audit-logs${buildQuery(filters)}`);
  },

  getById(id: string): Promise<AuditLogItem> {
    return request<AuditLogItem>(`/audit-logs/${id}`);
  },
};