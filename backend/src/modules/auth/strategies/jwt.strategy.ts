import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { COOKIE_NAMES } from '../../../common/constants/cookie.constants';
import { AuthConfig } from '../../../config/auth.config';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

function cookieExtractor(req: Request): string | null {
  const token = (req.cookies?.[COOKIE_NAMES.ACCESS] as string | undefined) ?? null;
  if (token) return token;
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const authCfg = configService.getOrThrow<AuthConfig>('auth');
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: authCfg.access.secret,
    };
    super(options);
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: {
          select: { id: true, officeId: true },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    if (payload.sid) {
      const session = await this.prisma.authSession.findFirst({
        where: {
          id: payload.sid,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!session) {
        throw new UnauthorizedException('Session revoked');
      }
      // Touch lastUsedAt (fire-and-forget)
      void this.prisma.authSession
        .update({ where: { id: payload.sid }, data: { lastUsedAt: new Date() } })
        .catch((err: unknown) => this.logger.warn(`Could not update lastUsedAt: ${String(err)}`));
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      sessionId: payload.sid ?? null,
      employee: user.employee
        ? { id: user.employee.id, officeId: user.employee.officeId }
        : null,
    };
  }
}
