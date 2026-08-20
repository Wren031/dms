import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-local';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { AuthService, RequestContext } from '../auth.service';

/**
 * Validates email + password against the database and returns the
 * AuthenticatedUser on success. All failure paths (wrong credentials,
 * locked account, suspended account, brute-force lockout) surface as a
 * generic 'Invalid email or password' via AuthService.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(request: Request, email: string, password: string): Promise<AuthenticatedUser> {
    const ctx: RequestContext = {
      ip: request.ip ?? null,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    };
    return this.authService.validateCredentials(email, password, ctx);
  }
}
