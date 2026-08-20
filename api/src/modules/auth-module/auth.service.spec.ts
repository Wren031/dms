import { AccountStatus, UserRole } from '@prisma/client';
import { AuditService } from '../audit-module/audit.service';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { CookieService } from './services/cookie.service';
import { EmailService } from './services/email.service';
import { HashService } from './services/hash.service';
import { TokenService } from './services/token.service';
import { ConfigService } from '@nestjs/config';
import { InvalidCredentialsException } from './auth.errors';

const CONFIG_DEFAULTS: Record<string, unknown> = {
  'security.maxLoginAttempts': 5,
  'security.lockoutDurationMinutes': 15,
  'tokens.emailVerificationTtlMinutes': 1440,
  'tokens.passwordResetTtlMinutes': 15,
  'jwt.refreshExpiresIn': '7d',
  'dev.returnTokens': true,
  isProduction: false,
};

function mockConfig() {
  return {
    get: jest.fn((path: string, def?: unknown) =>
      path in CONFIG_DEFAULTS ? CONFIG_DEFAULTS[path] : def,
    ),
  } as unknown as ConfigService;
}

interface UserLike {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function userEntity(overrides: Partial<UserLike> = {}): UserLike {
  return {
    id: 'user-1',
    email: 'user@test.com',
    passwordHash: 'hashed:StrongPass123!',
    role: UserRole.USER,
    status: AccountStatus.ACTIVE,
    emailVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createService() {
  const repository = {
    findByEmailWithSecurity: jest.fn(),
    findById: jest.fn(),
    findAuthContextById: jest.fn(),
    runInTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    incrementFailedLoginAttempts: jest.fn(),
    lockAccount: jest.fn(),
    recordLoginSuccess: jest.fn(),
    createRefreshSession: jest.fn(),
    findRefreshSessionByHash: jest.fn(),
    revokeRefreshSession: jest.fn(),
    revokeAllRefreshSessions: jest.fn(),
    updateRefreshSessionLastUsed: jest.fn(),
    createEmailVerificationToken: jest.fn(),
    findEmailVerificationToken: jest.fn(),
    markEmailVerificationTokenUsed: jest.fn(),
    markEmailVerified: jest.fn(),
    invalidateEmailVerificationTokens: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    markPasswordResetTokenUsed: jest.fn(),
    invalidatePasswordResetTokens: jest.fn(),
    resetPasswordTransaction: jest.fn(),
    updatePassword: jest.fn(),
  };

  const hashService = {
    hashPassword: jest.fn(async (plain: string) => `hashed:${plain}`),
    verifyPassword: jest.fn(async (hash: string, plain: string) => hash === `hashed:${plain}`),
    hashToken: jest.fn((token: string) => `hash:${token}`),
    generateToken: jest.fn(() => 'raw-token-123'),
    generateJti: jest.fn(() => 'jti-123'),
  } as unknown as HashService;

  const tokenService = {
    signAccessToken: jest.fn(async (payload: { sub: string }) => `access.${payload.sub}`),
    signRefreshToken: jest.fn(async (payload: { sub: string }) => `refresh.${payload.sub}`),
  } as unknown as TokenService;

  const cookieService = {
    getRefreshCookieOptions: jest.fn(),
    setRefreshCookie: jest.fn(),
    clearRefreshCookie: jest.fn(),
  } as unknown as CookieService;

  const emailService = { send: jest.fn(async () => undefined) } as unknown as EmailService;

  const auditService = { log: jest.fn(async () => ({})) } as unknown as AuditService;

  const service = new AuthService(
    repository as unknown as AuthRepository,
    hashService,
    tokenService,
    cookieService,
    emailService,
    auditService,
    mockConfig(),
  );

  return { service, repository, hashService, tokenService, auditService, emailService };
}

const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

describe('AuthService', () => {
  describe('register', () => {
    it('creates a USER with PENDING status and normalizes email', async () => {
      const { service, repository, hashService, auditService } = createService();
      repository.runInTransaction.mockImplementation(async (fn) =>
        fn({
          user: {
            create: jest.fn(async () => ({
              id: 'new-user',
              email: 'new@test.com',
              role: UserRole.USER,
              status: AccountStatus.PENDING,
              emailVerified: false,
              createdAt: new Date(),
            })),
          },
          emailVerificationToken: { create: jest.fn() },
        }),
      );

      const result = await service.register(
        { email: '  NEW@Test.com ', password: 'StrongPass123!', confirmPassword: 'StrongPass123!' },
        ctx,
      );

      expect(hashService.hashPassword).toHaveBeenCalledWith('StrongPass123!');
      expect(result.user.email).toBe('new@test.com');
      expect(result.user.role).toBe(UserRole.USER);
      expect(result.user.status).toBe(AccountStatus.PENDING);
      expect(result.verificationToken).toBe('raw-token-123');
      expect(repository.runInTransaction).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REGISTER', resourceId: 'new-user' }),
      );
    });

    it('throws 409 on duplicate email', async () => {
      const { service, repository } = createService();
      repository.findByEmailWithSecurity.mockResolvedValue(userEntity());

      await expect(
        service.register(
          { email: 'dup@test.com', password: 'StrongPass123!', confirmPassword: 'StrongPass123!' },
          ctx,
        ),
      ).rejects.toThrow('Email is already registered');
    });

    it('throws 400 when passwords do not match', async () => {
      const { service } = createService();

      await expect(
        service.register(
          { email: 'x@test.com', password: 'StrongPass123!', confirmPassword: 'Different123!' },
          ctx,
        ),
      ).rejects.toThrow('Passwords do not match');
    });
  });

  describe('validateCredentials', () => {
    it('returns the auth context on valid credentials', async () => {
      const { service, repository } = createService();
      repository.findByEmailWithSecurity.mockResolvedValue(userEntity());

      const result = await service.validateCredentials('USER@TEST.COM', 'StrongPass123!', ctx);

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.USER,
        status: AccountStatus.ACTIVE,
      });
      expect(repository.recordLoginSuccess).not.toHaveBeenCalled();
    });

    it('throws a generic error for an unknown email (anti-enumeration)', async () => {
      const { service, repository, auditService } = createService();
      repository.findByEmailWithSecurity.mockResolvedValue(null);

      await expect(
        service.validateCredentials('ghost@test.com', 'StrongPass123!', ctx),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED', userId: null }),
      );
    });

    it('rejects a locked account with a generic message', async () => {
      const { service, repository } = createService();
      repository.findByEmailWithSecurity.mockResolvedValue(
        userEntity({ lockedUntil: new Date(Date.now() + 60_000) }),
      );

      await expect(
        service.validateCredentials('user@test.com', 'StrongPass123!', ctx),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects a non-ACTIVE account', async () => {
      const { service, repository } = createService();
      repository.findByEmailWithSecurity.mockResolvedValue(
        userEntity({ status: AccountStatus.SUSPENDED }),
      );

      await expect(
        service.validateCredentials('user@test.com', 'StrongPass123!', ctx),
      ).rejects.toThrow('Invalid email or password');
    });

    it('increments failed attempts on a wrong password', async () => {
      const { service, repository } = createService();
      repository.findByEmailWithSecurity.mockResolvedValue(userEntity());

      await expect(
        service.validateCredentials('user@test.com', 'WrongPass123!', ctx),
      ).rejects.toThrow('Invalid email or password');

      expect(repository.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-1', 1);
      expect(repository.lockAccount).not.toHaveBeenCalled();
    });

    it('locks the account at the attempt threshold', async () => {
      const { service, repository, auditService } = createService();
      repository.findByEmailWithSecurity.mockResolvedValue(userEntity({ failedLoginAttempts: 4 }));

      await expect(
        service.validateCredentials('user@test.com', 'WrongPass123!', ctx),
      ).rejects.toThrow('Invalid email or password');

      expect(repository.lockAccount).toHaveBeenCalledWith('user-1', expect.any(Date), 5);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACCOUNT_LOCKED' }),
      );
    });
  });

  describe('refresh (rotation & reuse detection)', () => {
    it('rotates the token for a valid session', async () => {
      const { service, repository, tokenService } = createService();
      repository.findAuthContextById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.USER,
        status: AccountStatus.ACTIVE,
      });
      repository.findById.mockResolvedValue(userEntity());
      repository.findRefreshSessionByHash.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await service.refresh(
        { sub: 'user-1', role: UserRole.USER, type: 'refresh', jti: 'jti-1', rawToken: 'raw' },
        ctx,
      );

      expect(repository.revokeRefreshSession).toHaveBeenCalledWith('session-1');
      expect(repository.createRefreshSession).toHaveBeenCalled();
      expect(tokenService.signAccessToken).toHaveBeenCalledWith({
        sub: 'user-1',
        role: UserRole.USER,
      });
      expect(result.refreshToken).toBe('refresh.user-1');
    });

    it('detects reuse of a revoked token and revokes the whole family', async () => {
      const { service, repository, auditService } = createService();
      repository.findRefreshSessionByHash.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.refresh(
          { sub: 'user-1', role: UserRole.USER, type: 'refresh', jti: 'jti-1', rawToken: 'old' },
          ctx,
        ),
      ).rejects.toThrow('Invalid or expired token');

      expect(repository.revokeAllRefreshSessions).toHaveBeenCalledWith('user-1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TOKEN_REUSE_DETECTED' }),
      );
    });

    it('rejects an expired session', async () => {
      const { service, repository } = createService();
      repository.findRefreshSessionByHash.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.refresh(
          {
            sub: 'user-1',
            role: UserRole.USER,
            type: 'refresh',
            jti: 'jti-1',
            rawToken: 'expired',
          },
          ctx,
        ),
      ).rejects.toThrow('Invalid or expired token');

      expect(repository.revokeRefreshSession).toHaveBeenCalledWith('session-1');
    });
  });

  describe('resetPassword', () => {
    it('resets the password and revokes all sessions', async () => {
      const { service, repository, hashService } = createService();
      repository.findPasswordResetToken.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await service.resetPassword(
        { token: 'token', password: 'NewStrong123!', confirmPassword: 'NewStrong123!' },
        ctx,
      );

      expect(hashService.hashPassword).toHaveBeenCalledWith('NewStrong123!');
      expect(repository.resetPasswordTransaction).toHaveBeenCalledWith(
        'reset-1',
        'user-1',
        'hashed:NewStrong123!',
      );
      expect(repository.revokeAllRefreshSessions).toHaveBeenCalledWith('user-1');
    });

    it('rejects a used token', async () => {
      const { service, repository } = createService();
      repository.findPasswordResetToken.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.resetPassword(
          { token: 'token', password: 'NewStrong123!', confirmPassword: 'NewStrong123!' },
          ctx,
        ),
      ).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('changePassword', () => {
    it('changes the password and revokes sessions', async () => {
      const { service, repository } = createService();
      repository.findById.mockResolvedValue(userEntity());

      const result = await service.changePassword(
        'user-1',
        {
          currentPassword: 'StrongPass123!',
          newPassword: 'NewStrong123!',
          confirmPassword: 'NewStrong123!',
        },
        ctx,
      );

      expect(repository.updatePassword).toHaveBeenCalledWith('user-1', 'hashed:NewStrong123!');
      expect(repository.revokeAllRefreshSessions).toHaveBeenCalledWith('user-1');
      expect(result.message).toContain('Password changed');
    });

    it('rejects a wrong current password', async () => {
      const { service, repository } = createService();
      repository.findById.mockResolvedValue(userEntity());

      await expect(
        service.changePassword(
          'user-1',
          {
            currentPassword: 'WrongPass123!',
            newPassword: 'NewStrong123!',
            confirmPassword: 'NewStrong123!',
          },
          ctx,
        ),
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
