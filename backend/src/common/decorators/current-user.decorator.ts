import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  sessionId: string | null;
  employee?: {
    id: string;
    officeId: string;
  } | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
