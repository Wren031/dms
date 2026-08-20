import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthContextUser {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
}

/**
 * Data-access layer for authentication. All Prisma queries live here;
 * controllers and services never touch Prisma directly.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Minimal projection used to build the authentication context. Never
   * includes passwordHash.
   */
  async findAuthContextById(id: string): Promise<AuthContextUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, status: true },
    });
  }

  async findByEmailWithSecurity(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.USER,
        status: AccountStatus.PENDING,
      },
    });
  }

  async incrementFailedLoginAttempts(userId: string, attempts: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts },
    });
  }

  async lockAccount(userId: string, lockedUntil: Date, attempts: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil,
        failedLoginAttempts: attempts,
      },
    });
  }

  async recordLoginSuccess(userId: string, ipAddress: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        status: AccountStatus.ACTIVE,
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
  }

  /**
   * Atomically marks the reset token as used and sets the new password.
   */
  async resetPasswordTransaction(
    tokenRecordId: string,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecordId },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
    ]);
  }

  // ------------------------------------------------------------------
  // Refresh token sessions (hashes only)
  // ------------------------------------------------------------------

  async createRefreshSession(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  async findRefreshSessionByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeRefreshSession(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async updateRefreshSessionLastUsed(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async revokeAllRefreshSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ------------------------------------------------------------------
  // Email verification tokens (hashes only)
  // ------------------------------------------------------------------

  async createEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.emailVerificationToken.create({ data });
  }

  async findEmailVerificationToken(tokenHash: string) {
    return this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await this.prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateEmailVerificationTokens(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  // ------------------------------------------------------------------
  // Password reset tokens (hashes only)
  // ------------------------------------------------------------------

  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({ data });
  }

  async findPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidatePasswordResetTokens(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  // ------------------------------------------------------------------
  // Transactions
  // ------------------------------------------------------------------

  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
