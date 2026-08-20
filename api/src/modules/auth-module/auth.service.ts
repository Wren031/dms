import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus } from './enums/account-status.enum';
import { UserRole } from './enums/user-role.enum';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuditAction } from '../audit-module/audit.actions';
import { AuditService } from '../audit-module/audit.service';
import { AuthRepository } from './auth.repository';
import {
  EmailAlreadyRegisteredException,
  InvalidCredentialsException,
  TokenInvalidException,
} from './auth.errors';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CookieService } from './services/cookie.service';
import { EmailService } from './services/email.service';
import { HashService } from './services/hash.service';
import { TokenService } from './services/token.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { normalizeEmail } from './dto/register.dto';
import ms from 'ms';

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface LoginResult {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

const GENERIC_RESET_MESSAGE = 'If an account exists, password reset instructions have been sent';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService,
    private readonly cookieService: CookieService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  // ------------------------------------------------------------------
  // Registration
  // ------------------------------------------------------------------

  async register(
    dto: RegisterDto,
    ctx: RequestContext,
  ): Promise<{ user: UserResponseDto; verificationToken?: string }> {
    const email = normalizeEmail(dto.email);

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existing = await this.authRepository.findByEmailWithSecurity(email);
    if (existing) {
      throw new EmailAlreadyRegisteredException();
    }

    const passwordHash = await this.hashService.hashPassword(dto.password);
    const ttlMinutes = this.configService.get<number>('tokens.emailVerificationTtlMinutes', 1440);
    const rawToken = this.hashService.generateToken();
    const tokenHash = this.hashService.hashToken(rawToken);

    let user;
    try {
      user = await this.authRepository.runInTransaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            passwordHash,
            // Least privilege: new users can never choose their own role/status.
            role: UserRole.USER,
            status: AccountStatus.PENDING,
          },
        });

        await tx.emailVerificationToken.create({
          data: {
            userId: created.id,
            tokenHash,
            expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
          },
        });

        return created;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredException();
      }
      throw error;
    }

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.REGISTER,
      resource: 'User',
      resourceId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { role: UserRole.USER, status: AccountStatus.PENDING },
    });

    await this.emailService.send({
      to: email,
      subject: 'Verify your email',
      text: `Your email verification token: ${rawToken}`,
    });

    return {
      user: UserResponseDto.fromEntity(user),
      verificationToken: this.devReturnTokens() ? rawToken : undefined,
    };
  }

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------

  /**
   * Verifies credentials, enforcing account status and brute-force
   * lockout. Returns the authentication context on success or throws a
   * generic InvalidCredentialsException - the response never reveals
   * whether the email exists or whether the account is locked.
   */
  async validateCredentials(
    email: string,
    password: string,
    ctx: RequestContext,
  ): Promise<AuthenticatedUser> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.authRepository.findByEmailWithSecurity(normalizedEmail);

    if (!user) {
      await this.auditService.log({
        userId: null,
        action: AuditAction.LOGIN_FAILED,
        resource: 'User',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'unknown_email' },
      });
      throw new InvalidCredentialsException();
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        resource: 'User',
        resourceId: user.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'account_locked' },
      });
      throw new InvalidCredentialsException();
    }

    if (user.status !== AccountStatus.ACTIVE) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        resource: 'User',
        resourceId: user.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'account_status' },
      });
      throw new InvalidCredentialsException();
    }

    const passwordValid = await this.hashService.verifyPassword(user.passwordHash, password);

    if (!passwordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const maxAttempts = this.configService.get<number>('security.maxLoginAttempts', 5);

      if (attempts >= maxAttempts) {
        const lockoutMinutes = this.configService.get<number>(
          'security.lockoutDurationMinutes',
          15,
        );
        const lockedUntil = new Date(Date.now() + lockoutMinutes * 60_000);
        await this.authRepository.lockAccount(user.id, lockedUntil, attempts);

        await this.auditService.log({
          userId: user.id,
          action: AuditAction.ACCOUNT_LOCKED,
          resource: 'User',
          resourceId: user.id,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { lockedUntil: lockedUntil.toISOString() },
        });
      } else {
        await this.authRepository.incrementFailedLoginAttempts(user.id, attempts);
      }

      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        resource: 'User',
        resourceId: user.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'invalid_password' },
      });

      throw new InvalidCredentialsException();
    }

    return { id: user.id, email: user.email, role: user.role, status: user.status };
  }

  /**
   * Called after successful credential validation. Records the login,
   * issues the token pair and persists the refresh session (hash only).
   */
  async login(user: AuthenticatedUser, ctx: RequestContext): Promise<LoginResult> {
    await this.authRepository.recordLoginSuccess(user.id, ctx.ip);
    const tokens = await this.issueTokenPair(user, ctx);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      resource: 'User',
      resourceId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { lastLoginIp: ctx.ip },
    });

    const safeUser = await this.getProfile(user.id);
    return { user: safeUser, ...tokens };
  }

  // ------------------------------------------------------------------
  // Refresh (rotation + reuse detection)
  // ------------------------------------------------------------------

  /**
   * Rotates the refresh token. A revoked token presented here triggers
   * reuse detection: the whole token family is revoked.
   */
  async refresh(
    payload: JwtPayload & { rawToken: string },
    ctx: RequestContext,
  ): Promise<LoginResult> {
    const tokenHash = this.hashService.hashToken(payload.rawToken);
    const session = await this.authRepository.findRefreshSessionByHash(tokenHash);

    if (!session) {
      throw new TokenInvalidException();
    }

    if (session.revokedAt) {
      // Reuse of a rotated/revoked token - attacker or stolen cookie.
      await this.authRepository.revokeAllRefreshSessions(session.userId);
      await this.auditService.log({
        userId: session.userId,
        action: AuditAction.TOKEN_REUSE_DETECTED,
        resource: 'RefreshToken',
        resourceId: session.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new TokenInvalidException();
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.authRepository.revokeRefreshSession(session.id);
      throw new TokenInvalidException();
    }

    const user = await this.authRepository.findAuthContextById(payload.sub);
    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new TokenInvalidException();
    }
    if (user.id !== session.userId) {
      await this.authRepository.revokeRefreshSession(session.id);
      throw new TokenInvalidException();
    }

    await this.authRepository.revokeRefreshSession(session.id);
    const tokens = await this.issueTokenPair(user, ctx);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.TOKEN_REFRESH,
      resource: 'RefreshToken',
      resourceId: session.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { user: UserResponseDto.fromEntity(await this.requireUser(user.id)), ...tokens };
  }

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------

  async logout(
    user: AuthenticatedUser,
    rawRefreshToken: string | null,
    ctx: RequestContext,
  ): Promise<void> {
    if (rawRefreshToken) {
      const session = await this.authRepository.findRefreshSessionByHash(
        this.hashService.hashToken(rawRefreshToken),
      );
      if (session && session.userId === user.id && !session.revokedAt) {
        await this.authRepository.revokeRefreshSession(session.id);
      }
    }

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGOUT,
      resource: 'User',
      resourceId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async logoutAll(user: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    await this.authRepository.revokeAllRefreshSessions(user.id);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGOUT_ALL,
      resource: 'User',
      resourceId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  // ------------------------------------------------------------------
  // Email verification
  // ------------------------------------------------------------------

  async verifyEmail(rawToken: string, ctx: RequestContext): Promise<void> {
    const record = await this.authRepository.findEmailVerificationToken(
      this.hashService.hashToken(rawToken),
    );

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new TokenInvalidException();
    }

    await this.authRepository.markEmailVerificationTokenUsed(record.id);
    await this.authRepository.markEmailVerified(record.userId);

    await this.auditService.log({
      userId: record.userId,
      action: AuditAction.EMAIL_VERIFIED,
      resource: 'EmailVerificationToken',
      resourceId: record.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async resendVerification(email: string, ctx: RequestContext): Promise<string | undefined> {
    const user = await this.authRepository.findByEmailWithSecurity(normalizeEmail(email));

    if (!user || user.emailVerified) {
      return undefined;
    }

    await this.authRepository.invalidateEmailVerificationTokens(user.id);

    const ttlMinutes = this.configService.get<number>('tokens.emailVerificationTtlMinutes', 1440);
    const rawToken = this.hashService.generateToken();
    await this.authRepository.createEmailVerificationToken({
      userId: user.id,
      tokenHash: this.hashService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.EMAIL_VERIFICATION_RESENT,
      resource: 'User',
      resourceId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    await this.emailService.send({
      to: user.email,
      subject: 'Verify your email',
      text: `Your email verification token: ${rawToken}`,
    });

    return this.devReturnTokens() ? rawToken : undefined;
  }

  // ------------------------------------------------------------------
  // Password reset
  // ------------------------------------------------------------------

  async forgotPassword(
    email: string,
    ctx: RequestContext,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.authRepository.findByEmailWithSecurity(normalizeEmail(email));

    let resetToken: string | undefined;
    if (user) {
      await this.authRepository.invalidatePasswordResetTokens(user.id);

      const ttlMinutes = this.configService.get<number>('tokens.passwordResetTtlMinutes', 15);
      const rawToken = this.hashService.generateToken();
      await this.authRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash: this.hashService.hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      });

      await this.auditService.log({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        resource: 'User',
        resourceId: user.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      await this.emailService.send({
        to: user.email,
        subject: 'Reset your password',
        text: `Your password reset token: ${rawToken}`,
      });

      if (this.devReturnTokens()) {
        resetToken = rawToken;
      }
    }

    // Generic response - never reveals whether the email exists.
    return { message: GENERIC_RESET_MESSAGE, resetToken };
  }

  async resetPassword(dto: ResetPasswordDto, ctx: RequestContext): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const record = await this.authRepository.findPasswordResetToken(
      this.hashService.hashToken(dto.token),
    );

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new TokenInvalidException();
    }

    const passwordHash = await this.hashService.hashPassword(dto.password);

    await this.authRepository.resetPasswordTransaction(record.id, record.userId, passwordHash);
    await this.authRepository.revokeAllRefreshSessions(record.userId);

    await this.auditService.log({
      userId: record.userId,
      action: AuditAction.PASSWORD_RESET,
      resource: 'User',
      resourceId: record.userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { message: 'Password has been reset. You can now log in.' };
  }

  // ------------------------------------------------------------------
  // Password change (authenticated)
  // ------------------------------------------------------------------

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ctx: RequestContext,
  ): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const currentValid = await this.hashService.verifyPassword(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!currentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await this.hashService.hashPassword(dto.newPassword);
    await this.authRepository.updatePassword(userId, passwordHash);
    await this.authRepository.revokeAllRefreshSessions(userId);

    await this.auditService.log({
      userId,
      action: AuditAction.PASSWORD_CHANGED,
      resource: 'User',
      resourceId: userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { message: 'Password changed successfully' };
  }

  // ------------------------------------------------------------------
  // Profile
  // ------------------------------------------------------------------

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.requireUser(userId);
    return UserResponseDto.fromEntity(user);
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private async issueTokenPair(
    user: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = this.hashService.generateJti();
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
    });
    const refreshToken = await this.tokenService.signRefreshToken(
      { sub: user.id, role: user.role },
      jti,
    );

    const refreshTtl = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const expiresAtMs = ms(refreshTtl as ms.StringValue);

    await this.authRepository.createRefreshSession({
      userId: user.id,
      tokenHash: this.hashService.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + expiresAtMs),
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { accessToken, refreshToken };
  }

  private async requireUser(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private devReturnTokens(): boolean {
    return (
      this.configService.get<boolean>('dev.returnTokens', false) &&
      !this.configService.get<boolean>('isProduction', false)
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002'
    );
  }
}
