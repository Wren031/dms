import { API_BASE_URL } from '@/lib/apiConfig';
import type {
  DocumentAssignHolderInput,
  DocumentCreateInput,
  DocumentDetail,
  DocumentFilters,
  DocumentHistoryEntry,
  DocumentListItem,
  DocumentListResponse,
  DocumentNumberSuggestion,
  DocumentTimelineEntry,
  DocumentTransitionInput,
  DocumentUpdateInput,
  DocumentAttachment,
} from '@/features/documents/types/document';
import type { DocumentType } from '@/types';

export class DocumentsApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'DocumentsApiError';
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
    throw new DocumentsApiError(0, 'Network error — please retry.');
  }

  if (response.status === 401 && path !== '/auth/refresh') {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (refreshResponse.ok) {
        const retryHeaders = new Headers(init.headers);
        if (init.body && !retryHeaders.has('Content-Type')) {
          retryHeaders.set('Content-Type', 'application/json');
        }
        const retryCsrf = readCookie('dms_csrf');
        if (retryCsrf) retryHeaders.set('x-xsrf-token', retryCsrf);
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers: retryHeaders,
          credentials: 'include',
        });
      }
    } catch {
      // Fall through to the original 401 error.
    }
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
      console.warn(`[documents.service] ${init.method ?? 'GET'} ${path} → ${response.status}`, message);
    }
    throw new DocumentsApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
}

function normalizeDocument<T extends DocumentListItem | DocumentDetail>(document: T): T {
  const rawType = document.type as unknown as { codes?: string[]; code?: string } | string;
  const type = (typeof rawType === 'string'
    ? rawType
    : rawType?.codes?.[0] ?? rawType?.code) as DocumentType;
  return {
    ...document,
    type,
    attachments: 'attachments' in document ? (document.attachments ?? []) : undefined,
  } as T;
}

function normalizeList(response: DocumentListResponse): DocumentListResponse {
  return { ...response, items: response.items.map(normalizeDocument) };
}

function buildQuery(filters?: DocumentFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));
  if (filters.typeId) params.set('typeId', filters.typeId);
  if (filters.classification) params.set('classification', filters.classification);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.source) params.set('source', filters.source);
  if (filters.originatingOfficeId) params.set('originatingOfficeId', filters.originatingOfficeId);
  if (filters.currentOfficeId) params.set('currentOfficeId', filters.currentOfficeId);
  if (filters.currentHolderId) params.set('currentHolderId', filters.currentHolderId);
  if (filters.encodedById) params.set('encodedById', filters.encodedById);
  if (filters.receivedById) params.set('receivedById', filters.receivedById);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function listAll(filters?: DocumentFilters): Promise<DocumentListResponse> {
  const pageSize = 200;
  const first = await request<DocumentListResponse>(
    `/documents${buildQuery({ ...filters, fetchAll: undefined, page: 1, pageSize })}`,
  ).then(normalizeList);
  if (first.items.length >= first.total) return first;

  const totalPages = Math.ceil(first.total / pageSize);
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      request<DocumentListResponse>(
        `/documents${buildQuery({ ...filters, fetchAll: undefined, page: index + 2, pageSize })}`,
      ).then(normalizeList),
    ),
  );
  return {
    ...first,
    items: [first, ...remaining].flatMap(response => response.items),
    page: 1,
    pageSize: first.total,
  };
}

export const documentsService = {
  list(filters?: DocumentFilters): Promise<DocumentListResponse> {
    if (filters?.fetchAll) return listAll(filters);
    return request<DocumentListResponse>(`/documents${buildQuery(filters)}`).then(normalizeList);
  },

  getById(id: string): Promise<DocumentDetail> {
    return request<DocumentDetail>(`/documents/${id}`).then(normalizeDocument);
  },

  getDocumentNumberSuggestion(officeId: string): Promise<DocumentNumberSuggestion> {
    return request<DocumentNumberSuggestion>(`/documents/document-number-suggestion/${officeId}`);
  },

  register(payload: DocumentCreateInput): Promise<DocumentListItem> {
    return request<DocumentListItem>('/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: DocumentUpdateInput): Promise<DocumentListItem> {
    return request<DocumentListItem>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/documents/${id}`, { method: 'DELETE' });
  },

  transition(id: string, payload: DocumentTransitionInput): Promise<DocumentListItem> {
    return request<DocumentListItem>(`/documents/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  assignHolder(id: string, payload: DocumentAssignHolderInput): Promise<DocumentListItem> {
    return request<DocumentListItem>(`/documents/${id}/assign-holder`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getHistory(id: string): Promise<DocumentHistoryEntry[]> {
    return request<DocumentHistoryEntry[]>(`/documents/${id}/history`);
  },

  getTimeline(id: string): Promise<DocumentTimelineEntry[]> {
    return request<DocumentTimelineEntry[]>(`/documents/${id}/timeline`);
  },
};

export const routingService = {
  listSteps(documentId?: string): Promise<unknown[]> {
    const query = documentId ? `?documentId=${documentId}` : '';
    return request<unknown[]>(`/document-routing${query}`);
  },
};

export const attachmentsService = {
  list(documentId: string): Promise<DocumentAttachment[]> {
    return request<DocumentAttachment[]>(`/document-attachments/document/${documentId}`);
  },

  async upload(documentId: string, file: File): Promise<DocumentAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const headers = new Headers();
    const csrfToken = readCookie('dms_csrf');
    if (csrfToken) headers.set('x-xsrf-token', csrfToken);

    const response = await fetch(`${API_BASE_URL}/document-attachments/document/${documentId}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      let message = `Failed to upload ${file.name}`;
      try {
        const body = (await response.json()) as { message?: string | string[] };
        if (Array.isArray(body.message)) message = body.message.join(', ');
        else if (body.message) message = body.message;
      } catch {
        // ignore parse errors, keep fallback message
      }
      throw new DocumentsApiError(response.status, message);
    }
    const payload = await response.json();
    return (
      payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data: DocumentAttachment }).data
        : payload
    ) as DocumentAttachment;
  },

  downloadUrl(id: string): string {
    return `${API_BASE_URL}/document-attachments/${id}/download`;
  },

  previewUrl(id: string): string {
    return `${API_BASE_URL}/document-attachments/${id}/download?inline=1`;
  },

  async head(id: string): Promise<{ available: boolean; status: number }> {
    const response = await fetch(`${API_BASE_URL}/document-attachments/${id}/download?inline=1`, {
      method: 'HEAD',
      credentials: 'include',
    });
    return { available: response.ok, status: response.status };
  },
};
