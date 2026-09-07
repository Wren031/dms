import { apiFetch } from '@/lib/apiClient';

export interface FormDraftResponse {
  id: string;
  formKey: string;
  payload: Record<string, unknown>;
  status: 'DRAFT' | 'SUBMITTED';
  createdAt: string;
  updatedAt: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init);
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
