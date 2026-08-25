import { AccountStatus, Role } from '@prisma/client';

export class OfficeSummaryDto {
  id!: string;
  name!: string;
  code!: string;
  type!: string;
}

export class AuthenticatedUserDto {
  id!: string;
  email!: string | null;
  username!: string | null;
  role!: Role;
  status!: AccountStatus;
  officeId?: string | null;
  office?: OfficeSummaryDto | null;
  position?: string | null;
  employeeId?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarColor?: string | null;
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