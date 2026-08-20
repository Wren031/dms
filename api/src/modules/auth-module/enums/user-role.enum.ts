import { UserRole } from '@prisma/client';

export { UserRole } from '@prisma/client';

/**
 * Role hierarchy used by the RolesGuard.
 * A role with a higher rank implicitly satisfies requirements of lower ranks.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3,
};

export function roleSatisfies(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
