import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthSessionCleanupService {
  private readonly logger = new Logger(AuthSessionCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Every hour, purge expired or revoked sessions older than 24h.
  // Live validation against `expiresAt` is always performed on every request;
  // this is just hygiene for the table.
  @Cron(CronExpression.EVERY_HOUR)
  async purge(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: cutoff, not: null } },
        ],
      },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} expired/revoked auth sessions`);
    }
  }
}
