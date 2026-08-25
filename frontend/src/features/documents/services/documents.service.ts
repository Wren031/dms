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
} from '@/features/documents/types/document';

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

export const documentsService = {
  list(filters?: DocumentFilters): Promise<DocumentListResponse> {
    return request<DocumentListResponse>(`/documents${buildQuery(filters)}`);
  },

  getById(id: string): Promise<DocumentDetail> {
    return request<DocumentDetail>(`/documents/${id}`);
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
  listSteps(documentId: string): Promise<unknown[]> {
    return request<unknown[]>(`/document-routing?documentId=${documentId}`);
  },
};