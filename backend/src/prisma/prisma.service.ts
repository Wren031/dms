import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class AuditImmutabilityError extends Error {
  constructor(message = 'Audit log rows are immutable') {
    super(message);
    this.name = 'AuditImmutabilityError';
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly allowAuditPrune =
    (process.env.AUDIT_ALLOW_PRUNE ?? '').toLowerCase() === 'true';

  constructor() {
    super({
      log: ['error', 'warn'],
    });
    this.applyAuditImmutability();
  }

  private applyAuditImmutability(): void {
    this.$use(async (params, next) => {
      if (!this.isAuditMutatingOp(params.model, params.action)) {
        return next(params);
      }
      if (this.allowAuditPrune) {
        this.logger.warn(
          `Audit log ${params.model}.${params.action} attempted while AUDIT_ALLOW_PRUNE=true. This is a dev-only escape hatch.`,
        );
        return next(params);
      }
      throw new AuditImmutabilityError(
        `Audit log ${params.model}.${params.action} is not permitted: audit records are append-only.`,
      );
    });
  }

  private isAuditMutatingOp(
    model: string | undefined,
    action: string | undefined,
  ): boolean {
    if (model !== 'AuditLog' && model !== 'auditLog') return false;
    return (
      action === 'update' ||
      action === 'updateMany' ||
      action === 'delete' ||
      action === 'deleteMany' ||
      action === 'upsert'
    );
  }

  get auditPruningAllowed(): boolean {
    return this.allowAuditPrune;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma connected');
    } catch (err) {
      this.logger.error('Prisma connection failed', err as Error);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
