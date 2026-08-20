import { ForbiddenException } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService (object-level authorization / IDOR/BOLA)', () => {
  const authorizationService = new AuthorizationService();

  const user = (role: UserRole) => ({
    id: 'user-a',
    email: 'a@test.com',
    role,
    status: AccountStatus.ACTIVE,
  });

  it('USER can access only their own resources', () => {
    expect(authorizationService.canAccessUser(user(UserRole.USER), 'user-a')).toBe(true);
    expect(authorizationService.canAccessUser(user(UserRole.USER), 'user-b')).toBe(false);
  });

  it('ADMIN can access any users resources', () => {
    expect(authorizationService.canAccessUser(user(UserRole.ADMIN), 'user-b')).toBe(true);
  });

  it('SUPER_ADMIN has unrestricted access', () => {
    expect(authorizationService.canAccessUser(user(UserRole.SUPER_ADMIN), 'any-user')).toBe(true);
  });

  it('assertCanAccessUser throws 403 for unauthorized access', () => {
    expect(() => authorizationService.assertCanAccessUser(user(UserRole.USER), 'user-b')).toThrow(
      ForbiddenException,
    );
  });

  it('never grants access for a missing/empty id', () => {
    expect(authorizationService.canAccessUser(user(UserRole.SUPER_ADMIN), '')).toBe(false);
    expect(authorizationService.canAccessUser(user(UserRole.USER), '')).toBe(false);
  });
});
