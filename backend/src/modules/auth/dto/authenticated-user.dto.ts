import { UserRole, UserStatus } from '@prisma/client';

export class AuthenticatedUserDto {
  id!: string;
  email!: string;
  username!: string;
  fullName!: string;
  role!: UserRole;
  status!: UserStatus;
  avatarColor?: string | null;
  officeId?: string | null;
  position?: string | null;
  lastLoginAt?: Date | null;
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
