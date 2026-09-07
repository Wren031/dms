import { apiFetch } from '@/lib/apiClient';
import type {
  CreateOfficeInput,
  Office,
  OfficeListFilters,
  OfficeListResponse,
  UpdateOfficeInput,
} from '@/features/system-admin/offices/types/office';

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, init, {
    ErrorClass: ApiError,
    source: 'office.service',
  });
}

function buildQuery(filters?: OfficeListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (typeof filters.isActive === 'boolean') {
    params.set('isActive', String(filters.isActive));
  }
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const officeService = {
  list(filters?: OfficeListFilters): Promise<OfficeListResponse> {
    return request<OfficeListResponse>(`/offices${buildQuery(filters)}`);
  },

  getTree(): Promise<Office[]> {
    return request<Office[]>('/offices/tree');
  },

  getById(id: string): Promise<Office> {
    return request<Office>(`/offices/${id}`);
  },

  create(payload: CreateOfficeInput): Promise<Office> {
    return request<Office>('/offices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateOfficeInput): Promise<Office> {
    return request<Office>(`/offices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<void> {
    return request<void>(`/offices/${id}`, { method: 'DELETE' });
  },
};
