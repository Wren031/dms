import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Activates the local (email/password) authentication strategy for the
 * login endpoint.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
