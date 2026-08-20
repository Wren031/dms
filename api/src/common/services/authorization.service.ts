import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../modules/auth-module/enums/user-role.enum';
import { AuthenticatedUser } from '../types/authenticated-user.type';

/**
 * Reusable object-level authorization logic (IDOR / BOLA protection).
 *
 * Rules:
 *  - USER        -> may only access their own resources
 *  - ADMIN       -> may access resources according to admin permissions
 *  - SUPER_ADMIN -> unrestricted administrative access
 *
 * Future modules (orders, bookings, files, ...) should extend this service
 * with resource-specific resolvers, e.g.:
 *
 *   async canAccessOrder(user, orderId): Promise<boolean>
 */
@Injectable()
export class AuthorizationService {
  /**
   * Whether the current user may access the given user's resources.
   */
  canAccessUser(currentUser: AuthenticatedUser, requestedUserId: string): boolean {
    if (!requestedUserId) {
      return false;
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    return currentUser.id === requestedUserId;
  }

  assertCanAccessUser(currentUser: AuthenticatedUser, requestedUserId: string): void {
    if (!this.canAccessUser(currentUser, requestedUserId)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
  }
}
