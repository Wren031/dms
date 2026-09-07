import { API_BASE_URL } from '@/lib/apiConfig';

export interface FormDraftResponse {
  id: string;
  formKey: string;
  payload: Record<string, unknown>;
  status: 'DRAFT' | 'SUBMITTED';
  createdAt: string;
  updatedAt: string;
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
}

export const formDraftsApi = {
  get(formKey: string): Promise<FormDraftResponse | null> {
    return request<FormDraftResponse | null>(`/form-drafts/${encodeURIComponent(formKey)}`);
  },
  upsert(formKey: string, payload: Record<string, unknown>): Promise<FormDraftResponse> {
    return request<FormDraftResponse>(`/form-drafts/${encodeURIComponent(formKey)}`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
  },
  clear(formKey: string): Promise<void> {
    return request<void>(`/form-drafts/${encodeURIComponent(formKey)}`, {
      method: 'DELETE',
    });
  },
};
