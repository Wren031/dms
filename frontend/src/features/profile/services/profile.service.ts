import {
  authApi,
  type AuthUser,
  type Session,
  type UpdateMyProfileRequest,
} from '@/features/authentication/api/authApi';

export class ProfileApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ProfileApiError';
    this.status = status;
    this.details = details;
  }
}

export const profileService = {
  updateMe(payload: UpdateMyProfileRequest): Promise<AuthUser> {
    return authApi.updateMe(payload);
  },

  changePassword(payload: { currentPassword: string; newPassword: string }): Promise<{ success: true }> {
    return authApi.changePassword(payload);
  },

  listSessions(): Promise<Session[]> {
    return authApi.sessions();
  },

  revokeSession(sessionId: string): Promise<{ success: true }> {
    return authApi.revokeSession(sessionId);
  },

  revokeAllSessions(): Promise<{ revoked: number }> {
    return authApi.revokeAllSessions();
  },
};