import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { FilterAuditLogsDto } from './dto/filter-audit-logs.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

export interface AuditLogActor {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  fullName: string;
  position: string | null;
  avatarColor: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  module: string;
  description: string;
  targetId: string | null;
  targetType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue | null;
  actorId: string | null;
  actor: AuditLogActor | null;
  createdAt: string;
}

type AuditLogRow = Prisma.AuditLogGetPayload<Record<string, never>>;

const PALETTE = [
  'bg-brand-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600',
  'bg-purple-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-pink-600',
  'bg-teal-600', 'bg-orange-600',
];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateAuditLogDto,
    context: { actorId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<AuditLogDto> {
    const row = await this.prisma.auditLog.create({
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
    const actor = await this.loadActor(row.actorId);
    return this.toDto(row, actor);
  }

  async findAll(filter: FilterAuditLogsDto): Promise<PaginatedResult<AuditLogDto>> {
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

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const actorById = await this.loadActors(rows.map(r => r.actorId));
    return {
      items: rows.map(row => this.toDto(row, row.actorId ? actorById.get(row.actorId) ?? null : null)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<AuditLogDto> {
    const row = await this.prisma.auditLog.findUniqueOrThrow({ where: { id } });
    const actor = await this.loadActor(row.actorId);
    return this.toDto(row, actor);
  }

  private async loadActor(actorId: string | null): Promise<AuditLogActor | null> {
    if (!actorId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      include: { employee: { select: { firstName: true, middleName: true, lastName: true, position: true } } },
    });
    if (!user) return null;
    return this.toActor(user);
  }

  private async loadActors(actorIds: Array<string | null>): Promise<Map<string, AuditLogActor>> {
    const unique = Array.from(new Set(actorIds.filter((id): id is string => !!id)));
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      include: { employee: { select: { firstName: true, middleName: true, lastName: true, position: true } } },
    });
    const map = new Map<string, AuditLogActor>();
    for (const u of users) {
      map.set(u.id, this.toActor(u));
    }
    return map;
  }

  private toActor(user: Prisma.UserGetPayload<{
    include: { employee: { select: { firstName: true; middleName: true; lastName: true; position: true } } };
  }>): AuditLogActor {
    const emp = user.employee;
    const composed = emp
      ? [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')
      : '';
    const fullName = composed || user.username || user.email || user.id;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role.toLowerCase(),
      fullName,
      position: emp?.position ?? null,
      avatarColor: avatarColorFor(user.id),
    };
  }

  private toDto(row: AuditLogRow, actor: AuditLogActor | null): AuditLogDto {
    return {
      id: row.id,
      action: row.action,
      module: row.module,
      description: row.description,
      targetId: row.targetId ?? null,
      targetType: row.targetType ?? null,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      metadata: row.metadata ?? null,
      actorId: row.actorId ?? null,
      actor,
      createdAt: row.createdAt.toISOString(),
    };
  }
}