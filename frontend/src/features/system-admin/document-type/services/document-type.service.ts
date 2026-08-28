import { API_BASE_URL } from '@/lib/apiConfig';
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

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${name}=`))
    ?.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : undefined;
}

async function request<T>( path: string, init: RequestInit = {}): Promise<T> {
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
    throw new ApiError(0, 'Network error — please retry.');
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
      console.warn(`[document-type.service] ${init.method ?? 'GET'} ${path} → ${response.status}`, message);
    }

    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
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
