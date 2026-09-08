import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSIONS_METADATA_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { RolesService } from '../../modules/roles/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    // SYSTEM_ADMIN is a superuser and bypasses permission checks.
    if (user.role === Role.SYSTEM_ADMIN) {
      return true;
    }
    const effective = await this.rolesService.effectivePermissions(user.role);
    const missing = required.filter((permission) => !effective.includes(permission));
    if (missing.length > 0) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}