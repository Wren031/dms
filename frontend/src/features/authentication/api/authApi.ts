import { API_BASE_URL } from '@/lib/apiConfig';

export interface AuthUser {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  status: string;
  officeId: string | null;
  office?: { id: string; name: string; code: string; type: string } | null;
  position: string | null;
  employeeId?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarColor?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface Session {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  current: boolean;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface RegisterRequest {
  employeeNo: string;
  username?: string;
  email?: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  emailOrUsername: string;
}

export interface ForgotPasswordResponse {
  resetToken: string;
  resetUrl: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UpdateMyProfileRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith(`${name}=`))
    ?.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : undefined;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

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
      const body = await response.json() as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  return (payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data: T }).data
    : payload) as T;
}

export const authApi = {
  login: (payload: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  register: (payload: RegisterRequest) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  refresh: () => request<AuthResponse>('/auth/refresh', { method: 'POST' }),

  logout: (sessionId?: string) =>
    request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(sessionId ? { sessionId } : {}),
    }),

  me: () => request<AuthUser>('/auth/me'),

  updateMe: (payload: UpdateMyProfileRequest) =>
    request<AuthUser>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: ChangePasswordRequest) =>
    request<{ success: true }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    request<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: ResetPasswordRequest) =>
    request<{ success: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sessions: () => request<Session[]>('/auth/sessions'),
  
  revokeSession: (sessionId: string) =>
    request<{ success: true }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeAllSessions: () => request<{ revoked: number }>('/auth/sessions', { method: 'DELETE' }),
};

export { API_BASE_URL };
