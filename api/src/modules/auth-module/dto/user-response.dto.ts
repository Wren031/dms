import { AccountStatus, UserRole } from '../enums';

/**
 * Safe user representation returned by the API.
 * Deliberately excludes passwordHash, refresh tokens, failed login attempts,
 * lockout timestamps and any other security-sensitive fields.
 */
export class UserResponseDto {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: Date;

  static fromEntity(user: {
    id: string;
    email: string;
    role: UserRole;
    status: AccountStatus;
    emailVerified: boolean;
    createdAt: Date;
  }): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.role = user.role;
    dto.status = user.status;
    dto.emailVerified = user.emailVerified;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
