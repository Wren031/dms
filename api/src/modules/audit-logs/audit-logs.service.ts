import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { FilterAuditLogsDto } from './dto/filter-audit-logs.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateAuditLogDto,
    context: { actorId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<unknown> {
    return this.prisma.auditLog.create({
      data: {
        actorId: context.actorId ?? null,
        action: dto.action,
        module: dto.module,
        description: dto.description,
        targetId: dto.targetId,
        targetType: dto.targetType,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: dto.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(filter: FilterAuditLogsDto): Promise<PaginatedResult<unknown>> {
    const {
      page,
      pageSize,
      actorId,
      module,
      action,
      targetType,
      dateFrom,
      dateTo,
      order,
    } = filter;
    const where: Prisma.AuditLogWhereInput = {};
    if (actorId) where.actorId = actorId;
    if (module) where.module = module;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<unknown> {
    return this.prisma.auditLog.findUniqueOrThrow({ where: { id } });
  }
}
