import { apiFetch } from '@/lib/apiClient';
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init, {
    ErrorClass: AuditLogsApiError,
    source: 'audit-logs.service',
  });
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