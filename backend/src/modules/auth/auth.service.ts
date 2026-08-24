import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { constantTimeVerify, hashPassword } from '../../common/utils/hash.util';
import { randomToken, sha256Hex } from '../../common/utils/token.util';
import { AuthConfig, SameSite } from '../../config/auth.config';
import { COOKIE_NAMES, COOKIE_PATHS } from '../../common/constants/cookie.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AuthResponseDto,
  AuthenticatedUserDto,
  SessionDto,
} from './dto/authenticated-user.dto';
import { Request, Response } from 'express';
import type { CookieOptions } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';

type AuthUserWithEmployee = Prisma.UserGetPayload<{
  include: { employee: { select: { id: true; officeId: true; position: true } } };
}>;

function toExpressSameSite(value: SameSite): 'strict' | 'lax' | 'none' {
  return value.toLowerCase() as 'strict' | 'lax' | 'none';
}

function parseTtlMs(ttl: string): number {
  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(ttl.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2] ?? 'ms';
  switch (unit) {
    case 'ms':
      return n;
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return n;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;
  private readonly csrfTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const authCfg = this.configService.getOrThrow<AuthConfig>('auth');
    this.accessTtlMs = parseTtlMs(authCfg.access.ttl);
    this.refreshTtlMs = parseTtlMs(authCfg.refresh.ttl);
    this.csrfTtlMs = this.refreshTtlMs;
  }

  // ---------- Public API ----------

  async login(dto: LoginDto, req: Request, res: Response): Promise<AuthResponseDto> {
    const identifier = dto.emailOrUsername.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: { employee: { select: { id: true, officeId: true, position: true } } },
    });

    const ok = await constantTimeVerify(dto.password, user?.passwordHash ?? null);

    if (!user || !ok) {
      this.logFailedAttempt(req, identifier);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { sessionId, refreshRaw } = await this.issueSession(user.id);
    const accessToken = this.signAccessToken(user.id, user.role, sessionId);
    const csrfRaw = randomToken(32);
    this.setAuthCookies(res, accessToken, refreshRaw, this.refreshTtlMs, csrfRaw);

    return { user: this.toUserDto(user) };
  }

  async register(dto: RegisterDto, req: Request, res: Response): Promise<AuthResponseDto> {
    const employeeNo = dto.employeeNo.trim();

    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      include: { user: { select: { id: true } } },
    });

    if (!employee || !employee.isActive) {
      throw new BadRequestException('Invalid employee number');
    }
    if (employee.user) {
      throw new ConflictException('A user account already exists for this employee');
    }

    const providedEmail = dto.email?.trim().toLowerCase();
    if (providedEmail && providedEmail !== employee.email.toLowerCase()) {
      throw new BadRequestException('Email does not match the employee record');
    }
    const email = providedEmail ?? employee.email.toLowerCase();

    const username = dto.username?.trim();
    if (username) {
      const taken = await this.prisma.user.findUnique({ where: { username } });
      if (taken) {
        throw new ConflictException('Username is already taken');
      }
    }

    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      throw new ConflictException('Email is already taken');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username: username ?? null,
        email,
        passwordHash,
        role: dto.role,
        status: 'ACTIVE',
        employeeId: employee.id,
      },
      include: { employee: { select: { id: true, officeId: true, position: true } } },
    });

    const { sessionId, refreshRaw } = await this.issueSession(user.id);
    const accessToken = this.signAccessToken(user.id, user.role, sessionId);
    const csrfRaw = randomToken(32);
    this.setAuthCookies(res, accessToken, refreshRaw, this.refreshTtlMs, csrfRaw);

    this.logger.log(`Registered user ${user.id} for employee ${employee.employeeNo}`);
    return { user: this.toUserDto(user) };
  }

  async refresh(req: Request, res: Response): Promise<AuthResponseDto> {
    const raw = (req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined) ?? null;
    if (!raw) {
      this.clearAllCookies(res);
      throw new UnauthorizedException('Invalid session');
    }
    const hash = sha256Hex(raw);
    const session = await this.prisma.authSession.findFirst({
      where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) {
      this.clearAllCookies(res);
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { employee: { select: { id: true, officeId: true, position: true } } },
    });
    if (!user || user.status !== 'ACTIVE') {
      this.clearAllCookies(res);
      throw new UnauthorizedException('Invalid session');
    }

    // Rotate: revoke old, issue new
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const { sessionId: newSessionId, refreshRaw: newRefreshRaw } = await this.issueSession(user.id);
    const accessToken = this.signAccessToken(user.id, user.role, newSessionId);
    const csrfRaw = randomToken(32);
    this.setAuthCookies(res, accessToken, newRefreshRaw, this.refreshTtlMs, csrfRaw);

    return { user: this.toUserDto(user) };
  }

  async logout(req: Request, res: Response, sessionId?: string): Promise<void> {
    const raw = (req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined) ?? null;
    if (raw) {
      const hash = sha256Hex(raw);
      await this.prisma.authSession.updateMany({
        where: { tokenHash: hash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    if (sessionId) {
      await this.prisma.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.clearAllCookies(res);
  }

  async me(userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { select: { id: true, officeId: true, position: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }
    return this.toUserDto(user);
  }

  async listSessions(userId: string, currentSessionId: string | null): Promise<SessionDto[]> {
    const rows = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt,
      expiresAt: r.expiresAt,
      revokedAt: r.revokedAt,
      current: r.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }
    const ok = await constantTimeVerify(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        authSessions: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: new Date() },
          },
        },
      },
    });
  }

  // ---------- Internals ----------

  private async issueSession(userId: string): Promise<{ sessionId: string; refreshRaw: string }> {
    const refreshRaw = randomToken(64);
    const refreshHash = sha256Hex(refreshRaw);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    const session = await this.prisma.authSession.create({
      data: { userId, tokenHash: refreshHash, expiresAt },
      select: { id: true },
    });
    return { sessionId: session.id, refreshRaw };
  }

  private signAccessToken(userId: string, role: Role, sessionId: string): string {
    const payload: JwtPayload = { sub: userId, role, sid: sessionId };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<AuthConfig>('auth').access.secret,
      expiresIn: `${this.accessTtlMs}ms`,
    });
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshRaw: string,
    refreshMaxAgeMs: number,
    csrfRaw: string,
  ): void {
    const authCfg = this.configService.getOrThrow<AuthConfig>('auth');
    const sameSite = toExpressSameSite(authCfg.cookie.sameSite);
    const base: Pick<CookieOptions, 'secure' | 'sameSite' | 'domain'> = {
      secure: authCfg.cookie.secure,
      sameSite,
      domain: authCfg.cookie.domain,
    };
    const accessOpts: CookieOptions = {
      ...base,
      httpOnly: true,
      path: COOKIE_PATHS.ACCESS,
      maxAge: this.accessTtlMs,
    };
    const refreshOpts: CookieOptions = {
      ...base,
      httpOnly: true,
      path: COOKIE_PATHS.REFRESH,
      maxAge: refreshMaxAgeMs,
    };
    const csrfOpts: CookieOptions = {
      ...base,
      httpOnly: false,
      path: COOKIE_PATHS.CSRF,
      maxAge: this.csrfTtlMs,
    };

    res.cookie(COOKIE_NAMES.ACCESS, accessToken, accessOpts);
    res.cookie(COOKIE_NAMES.REFRESH, refreshRaw, refreshOpts);
    res.cookie(COOKIE_NAMES.CSRF, csrfRaw, csrfOpts);
  }

  private clearAllCookies(res: Response): void {
    const authCfg = this.configService.getOrThrow<AuthConfig>('auth');
    const opts: Pick<CookieOptions, 'secure' | 'sameSite' | 'domain'> = {
      secure: authCfg.cookie.secure,
      sameSite: toExpressSameSite(authCfg.cookie.sameSite),
      domain: authCfg.cookie.domain,
    };
    res.clearCookie(COOKIE_NAMES.ACCESS, { ...opts, path: COOKIE_PATHS.ACCESS });
    res.clearCookie(COOKIE_NAMES.REFRESH, { ...opts, path: COOKIE_PATHS.REFRESH });
    res.clearCookie(COOKIE_NAMES.CSRF, { ...opts, path: COOKIE_PATHS.CSRF });
  }

  private logFailedAttempt(req: Request, identifier: string): void {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown';
    this.logger.warn(`Login failed for "${identifier}" from ${ip}`);
  }

  private toUserDto(user: AuthUserWithEmployee): AuthenticatedUserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      officeId: user.employee?.officeId ?? null,
      position: user.employee?.position ?? null,
      createdAt: user.createdAt,
    };
  }
}
