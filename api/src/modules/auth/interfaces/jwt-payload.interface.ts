import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  sid: string | null;
  iat?: number;
  exp?: number;
}
