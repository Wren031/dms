import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { FilterReleasesDto } from './dto/filter-releases.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentReleaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReleaseDto, releasedById: string): Promise<unknown> {
    const doc = await this.prisma.document.findFirst({ where: { id: dto.documentId, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== 'approved') {
      throw new BadRequestException('Only approved documents can be released');
    }

    return this.prisma.$transaction(async (tx) => {
      const release = await tx.documentRelease.create({
        data: {
          documentId: dto.documentId,
          releasedById,
          releasedToId: dto.releasedToId,
          method: dto.method,
          recipientName: dto.recipientName,
          notes: dto.notes,
          releasedAt: dto.releasedAt ? new Date(dto.releasedAt) : new Date(),
        },
      });
      await tx.document.update({
        where: { id: dto.documentId },
        data: { status: 'released' },
      });
      await tx.documentHistory.create({
        data: {
          documentId: dto.documentId,
          fromStatus: 'approved',
          toStatus: 'released',
          actorId: releasedById,
          remarks: dto.notes ?? `Released via ${dto.method}`,
        },
      });
      return release;
    });
  }

  async findAll(filter: FilterReleasesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, documentId, releasedById, releasedToId, method, dateFrom, dateTo, order } =
      filter;
    const where: Record<string, unknown> = {};
    if (documentId) where.documentId = documentId;
    if (releasedById) where.releasedById = releasedById;
    if (releasedToId) where.releasedToId = releasedToId;
    if (method) where.method = method;
    if (dateFrom || dateTo) {
      where.releasedAt = {};
      if (dateFrom) (where.releasedAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.releasedAt as Record<string, Date>).lte = new Date(dateTo);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentRelease.findMany({
        where,
        orderBy: { releasedAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentRelease.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.documentRelease.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateReleaseDto): Promise<unknown> {
    return this.prisma.documentRelease.update({ where: { id }, data: dto });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.documentRelease.delete({ where: { id } });
  }
}
