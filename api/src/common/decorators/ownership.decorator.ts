import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_KEY = 'ownership';

export interface OwnershipOptions {
  /**
   * Name of the route parameter that contains the resource owner id,
   * e.g. 'userId' for GET /api/users/:userId.
   */
  paramName: string;
}

/**
 * Declares that the handler owns the resource addressed by the given route
 * parameter. The OwnershipGuard verifies the authenticated user may access
 * that resource (object-level authorization / IDOR & BOLA protection).
 *
 * When the resource is not directly identified by a user id (e.g. an order),
 * register a resource owner resolver in AuthorizationService.
 */
export const Ownership = (paramName: string): MethodDecorator =>
  SetMetadata(OWNERSHIP_KEY, { paramName } satisfies OwnershipOptions);
