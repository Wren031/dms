import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';

export const REFRESH_COOKIE_NAME = 'refresh_token';

export interface RefreshCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
}

/**
 * Configures and manages the HTTP-only refresh-token cookie.
 * The cookie is never readable from JavaScript and is restricted to the
 * /api/auth path.
 */
@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  getRefreshCookieOptions(): RefreshCookieOptions {
    const maxAge = ms(
      this.configService.get<string>('jwt.refreshExpiresIn', '7d') as ms.StringValue,
    );

    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('isProduction', false),
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('cookies.sameSite', 'lax'),
      path: this.configService.get<string>('cookies.path', '/api/auth'),
      maxAge,
    };
  }

  setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, this.getRefreshCookieOptions());
  }

  clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      path: this.configService.get<string>('cookies.path', '/api/auth'),
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('cookies.sameSite', 'lax'),
    });
  }
}
