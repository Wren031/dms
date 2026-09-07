import { apiFetch } from '@/lib/apiClient';
import type {
  CreateDocumentTypePayload,
  DocumentTypeListFilters,
  DocumentTypeListResponse,
  DocumentTypeRecord,
  UpdateDocumentTypePayload,
} from '@/features/system-admin/document-type/types/document-type';

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

async function request<T>( path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init, {
    ErrorClass: ApiError,
    source: 'document-type.service',
  });
}

function buildQuery(filters?: DocumentTypeListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.code) params.set('code', filters.code);
  if (typeof filters.isActive === 'boolean') {
    params.set('isActive', String(filters.isActive));
  }
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const documentTypeService = {
  list(filters?: DocumentTypeListFilters): Promise<DocumentTypeListResponse> {
    return request<DocumentTypeListResponse>(`/document-types${buildQuery(filters)}`);
  },

  getById(id: string): Promise<DocumentTypeRecord> {
    return request<DocumentTypeRecord>(`/document-types/${id}`);
  },

  create(payload: CreateDocumentTypePayload): Promise<DocumentTypeRecord> {
    return request<DocumentTypeRecord>('/document-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateDocumentTypePayload): Promise<DocumentTypeRecord> {
    return request<DocumentTypeRecord>(`/document-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<DocumentTypeRecord> {
    return request<DocumentTypeRecord>(`/document-types/${id}`, { method: 'DELETE' });
  },
};
