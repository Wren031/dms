import { UserRole } from '../../modules/auth-module/enums/user-role.enum';

/**
 * Central registry of permissions per role.
 * Future modules should add their permission strings here and protect
 * endpoints with the @Permissions() decorator.
 */
export const PERMISSION_REGISTRY: Record<UserRole, readonly string[]> = {
  [UserRole.USER]: ['users:read-self', 'users:update-self'],
  [UserRole.ADMIN]: ['users:read-self', 'users:update-self', 'users:read-any', 'employees:create'],
  [UserRole.SUPER_ADMIN]: ['*'],
};

export function roleHasPermission(userRole: UserRole, permission: string): boolean {
  const granted = PERMISSION_REGISTRY[userRole] ?? [];
  if (granted.includes('*')) {
    return true;
  }
  return granted.includes(permission);
}
