import { authApi } from '@/features/authentication/api/authApi';
import type {
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateMyProfileRequest,
} from '@/features/authentication/api/authApi';

export const authService = {

  async login(credentials: LoginRequest): Promise<AuthUser> {
    const response = await authApi.login(credentials);
    return response.user;
  },

  async register(payload: RegisterRequest): Promise<AuthUser> {
    const response = await authApi.register(payload);
    return response.user;
  },

  async restoreSession(): Promise<AuthUser | null> {
    try {
      return (await authApi.me());
    } catch {
      try {
        return (await authApi.refresh()).user;
      } catch {
        return null;
      }
    }
  },

  logout: () => authApi.logout(),
  changePassword: (payload: ChangePasswordRequest) => authApi.changePassword(payload),
  
  updateMe: (payload: UpdateMyProfileRequest) => authApi.updateMe(payload),
  listSessions: () => authApi.sessions(),
  revokeSession: (sessionId: string) => authApi.revokeSession(sessionId),
  revokeAllSessions: () => authApi.revokeAllSessions(),
  forgotPassword: (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> =>
    authApi.forgotPassword(payload),
  resetPassword: (payload: ResetPasswordRequest) => authApi.resetPassword(payload),
};
