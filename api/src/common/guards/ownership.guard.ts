import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { AuthorizationService } from '../services/authorization.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { OWNERSHIP_KEY, OwnershipOptions } from '../decorators/ownership.decorator';

/**
 * Object-level authorization guard (IDOR / BOLA protection).
 *
 * Usage:
 *   @Ownership('userId')
 *   @Get('users/:userId')
 *
 * The guard resolves the owner id from the route parameter and asks the
 * AuthorizationService whether the authenticated user may access it.
 * The owner id from the URL is never trusted on its own.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<OwnershipOptions | undefined>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const requestedId: string | undefined = request.params?.[options.paramName];

    if (!requestedId) {
      throw new NotFoundException('Resource not found');
    }

    if (!isUUID(requestedId)) {
      throw new BadRequestException('Invalid resource identifier');
    }

    this.authorizationService.assertCanAccessUser(user, requestedId);
    return true;
  }
}
