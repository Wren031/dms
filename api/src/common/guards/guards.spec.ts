import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountStatus, UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

function context(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  it('allows when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(context(undefined))).toBe(true);
  });

  it('allows a USER on a USER-protected endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const user = { id: '1', email: 'u@t.com', role: UserRole.USER, status: AccountStatus.ACTIVE };
    expect(guard.canActivate(context(user))).toBe(true);
  });

  it('forbids a USER on an ADMIN-protected endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const user = { id: '1', email: 'u@t.com', role: UserRole.USER, status: AccountStatus.ACTIVE };
    expect(() => guard.canActivate(context(user))).toThrow(ForbiddenException);
  });

  it('allows an ADMIN on an ADMIN-protected endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const user = { id: '1', email: 'a@t.com', role: UserRole.ADMIN, status: AccountStatus.ACTIVE };
    expect(guard.canActivate(context(user))).toBe(true);
  });

  it('a SUPER_ADMIN satisfies lower-role requirements (hierarchy)', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.USER]);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const user = {
      id: '1',
      email: 's@t.com',
      role: UserRole.SUPER_ADMIN,
      status: AccountStatus.ACTIVE,
    };
    expect(guard.canActivate(context(user))).toBe(true);
  });
});

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  it('allows when no permissions are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(context(undefined))).toBe(true);
  });

  it('grants registered role permissions', () => {
    reflector.getAllAndOverride.mockReturnValue(['users:read-self']);
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    const user = { id: '1', email: 'u@t.com', role: UserRole.USER, status: AccountStatus.ACTIVE };
    expect(guard.canActivate(context(user))).toBe(true);
  });

  it('forbids un-granted permissions', () => {
    reflector.getAllAndOverride.mockReturnValue(['users:delete-any']);
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    const user = { id: '1', email: 'u@t.com', role: UserRole.USER, status: AccountStatus.ACTIVE };
    expect(() => guard.canActivate(context(user))).toThrow(ForbiddenException);
  });
});

// Keep metadata keys referenced so decorators stay in sync with guards.
describe('Decorator metadata keys', () => {
  it('uses the documented metadata keys', () => {
    expect(ROLES_KEY).toBe('roles');
    expect(PERMISSIONS_KEY).toBe('permissions');
  });
});
