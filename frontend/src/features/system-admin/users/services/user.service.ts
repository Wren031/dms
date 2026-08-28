import { API_BASE_URL } from '@/lib/apiConfig';
import type {
  CreateEmployeePayload,
  CreateUserPayload,
  EmployeeSummary,
  ResetUserPasswordPayload,
  UpdateUserPayload,
  UserAccount,
  UserListFilters,
  UserListResponse,
  RoutingUserOption,
} from '@/features/system-admin/users/types/user';

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

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
      console.warn(`[user.service] ${init.method ?? 'GET'} ${path} → ${response.status}`, message);
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

function buildQuery(filters?: UserListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  if (filters.officeId) params.set('officeId', filters.officeId);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function listAll(filters?: UserListFilters): Promise<UserListResponse> {
  const pageSize = 200;
  const first = await request<UserListResponse>(
    `/users${buildQuery({ ...filters, fetchAll: undefined, page: 1, pageSize })}`,
  );
  if (first.items.length >= first.total) return first;

  const totalPages = Math.ceil(first.total / pageSize);
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      request<UserListResponse>(
        `/users${buildQuery({ ...filters, fetchAll: undefined, page: index + 2, pageSize })}`,
      ),
    ),
  );
  return {
    ...first,
    items: [first, ...remaining].flatMap(response => response.items),
    page: 1,
    pageSize: first.total,
  };
}

export interface EmployeeListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  officeId?: string;
  isActive?: boolean;
  position?: string;
  sortBy?: 'firstName' | 'lastName' | 'employeeNo' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface EmployeeListResponse {
  items: EmployeeSummary[];
  total: number;
  page: number;
  pageSize: number;
}

function buildEmployeeQuery(filters?: EmployeeListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.officeId) params.set('officeId', filters.officeId);
  if (typeof filters.isActive === 'boolean') {
    params.set('isActive', String(filters.isActive));
  }
  if (filters.position) params.set('position', filters.position);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.order) params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const userService = {
  list(filters?: UserListFilters): Promise<UserListResponse> {
    if (filters?.fetchAll) return listAll(filters);
    return request<UserListResponse>(`/users${buildQuery(filters)}`);
  },

  routingOptions(): Promise<RoutingUserOption[]> {
    return request<RoutingUserOption[]>('/users/routing-options');
  },

  getById(id: string): Promise<UserAccount> {
    return request<UserAccount>(`/users/${id}`);
  },

  create(payload: CreateUserPayload): Promise<UserAccount> {
    return request<UserAccount>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateUserPayload): Promise<UserAccount> {
    return request<UserAccount>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<UserAccount> {
    return request<UserAccount>(`/users/${id}`, { method: 'DELETE' });
  },

  resetPassword(id: string, payload?: ResetUserPasswordPayload): Promise<{ success: true }> {
    return request<{ success: true }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  },
};

export const employeeService = {
  list(filters?: EmployeeListFilters): Promise<EmployeeListResponse> {
    return request<EmployeeListResponse>(`/employees${buildEmployeeQuery(filters)}`);
  },

  getById(id: string): Promise<EmployeeSummary> {
    return request<EmployeeSummary>(`/employees/${id}`);
  },

  create(payload: CreateEmployeePayload): Promise<EmployeeSummary> {
    return request<EmployeeSummary>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
