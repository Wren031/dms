import { AccountStatus, Role } from '@prisma/client';

export class AuthenticatedUserDto {
  id!: string;
  email!: string | null;
  username!: string | null;
  role!: Role;
  status!: AccountStatus;
  officeId?: string | null;
  position?: string | null;
  createdAt!: Date;
}

export class AuthResponseDto {
  user!: AuthenticatedUserDto;
}

export class SessionDto {
  id!: string;
  createdAt!: Date;
  lastUsedAt!: Date | null;
  expiresAt!: Date;
  revokedAt!: Date | null;
  current!: boolean;
}
