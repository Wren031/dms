import { API_BASE_URL } from '@/lib/apiConfig';
import type {
  RoleDefinition,
  RoleSummary,
  RoleUser,
} from '@/features/system-admin/roles-permissions/types/role';

export class RolesApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'RolesApiError';
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
    throw new RolesApiError(0, 'Network error — please retry.');
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
      console.warn(`[roles.service] ${init.method ?? 'GET'} ${path} → ${response.status}`, message);
    }
    throw new RolesApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload
  ) as T;
}

export const rolesService = {
  list(): Promise<RoleSummary[]> {
    return request<RoleSummary[]>('/roles');
  },

  getById(id: string): Promise<RoleDefinition> {
    return request<RoleDefinition>(`/roles/${id}`);
  },

  getRoleUsers(id: string): Promise<RoleUser[]> {
    return request<RoleUser[]>(`/roles/${id}/users`);
  },

  setPermissions(id: string, permissions: string[]): Promise<string[]> {
    return request<{ permissions: string[] }>(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    }).then(res => res.permissions);
  },
};