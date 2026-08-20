import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { roleHasPermission } from './permissions.registry';

/**
 * Global permissions guard. When a handler declares @Permissions(...), every
 * listed permission must be granted to the authenticated user's role.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const hasAll = requiredPermissions.every((permission) =>
      roleHasPermission(user.role, permission),
    );

    if (!hasAll) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
