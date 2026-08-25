import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArchiveDto } from './dto/create-archive.dto';
import { UpdateArchiveDto } from './dto/update-archive.dto';
import { FilterArchivesDto } from './dto/filter-archives.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentArchiveService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArchiveDto, archivedById: string): Promise<unknown> {
    const doc = await this.prisma.document.findUnique({ where: { id: dto.documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const allowed = ['released', 'rejected', 'returned', 'approved'];
    if (!allowed.includes(doc.status)) {
      throw new BadRequestException(
        `Cannot archive document in status ${doc.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const archive = await tx.documentArchive.create({
        data: {
          documentId: dto.documentId,
          archivedById,
          location: dto.location,
          retentionUntil: dto.retentionUntil ? new Date(dto.retentionUntil) : null,
        },
      });
      await tx.document.update({
        where: { id: dto.documentId },
        data: { status: 'archived' },
      });
      await tx.documentHistory.create({
        data: {
          documentId: dto.documentId,
          fromStatus: doc.status,
          toStatus: 'archived',
          actorId: archivedById,
          remarks: dto.notes ?? 'Document archived',
        },
      });
      return archive;
    });
  }

  async findAll(filter: FilterArchivesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, documentId, archivedById, dateFrom, dateTo, order } = filter;
    const where: Record<string, unknown> = {};
    if (documentId) where.documentId = documentId;
    if (archivedById) where.archivedById = archivedById;
    if (dateFrom || dateTo) {
      where.archivedAt = {};
      if (dateFrom) (where.archivedAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.archivedAt as Record<string, Date>).lte = new Date(dateTo);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentArchive.findMany({
        where,
        orderBy: { archivedAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentArchive.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.documentArchive.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateArchiveDto): Promise<unknown> {
    return this.prisma.documentArchive.update({ where: { id }, data: dto });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.documentArchive.delete({ where: { id } });
  }
}
