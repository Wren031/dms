import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { REFRESH_COOKIE_NAME } from '../services/cookie.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Refresh-token strategy. The token is extracted exclusively from the
 * HTTP-only cookie - it is never accepted from the request body or URL.
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          const token = request.cookies?.[REFRESH_COOKIE_NAME];
          if (typeof token === 'string' && token.length > 0) {
            return token;
          }
          if (request.body && typeof request.body.refreshToken === 'string') {
            throw new BadRequestException(
              'The refresh token must be sent via the refresh_token cookie, not the request body',
            );
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret', ''),
      passReqToCallback: true,
    });
  }

  validate(request: Request, payload: JwtPayload): JwtPayload & { rawToken: string } {
    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const rawToken = request.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return { ...payload, rawToken };
  }
}
