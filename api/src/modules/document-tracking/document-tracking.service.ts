import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordTrackingDto, FilterTrackingDto } from './dto/tracking.dto';

@Injectable()
export class DocumentTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async record(dto: RecordTrackingDto, actorId: string): Promise<unknown> {
    return this.prisma.documentTracking.create({
      data: {
        documentId: dto.documentId,
        actorId,
        event: dto.event,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
  }

  findAll(filter: FilterTrackingDto): Promise<unknown> {
    const where: Prisma.DocumentTrackingWhereInput = {};
    if (filter.documentId) where.documentId = filter.documentId;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.event) where.event = filter.event;
    if (filter.dateFrom || filter.dateTo) {
      where.occurredAt = {};
      if (filter.dateFrom) where.occurredAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.occurredAt.lte = new Date(filter.dateTo);
    }
    return this.prisma.documentTracking.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });
  }

  findByDocument(documentId: string): Promise<unknown> {
    return this.prisma.documentTracking.findMany({
      where: { documentId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
