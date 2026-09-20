import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ReviewActionKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilterReviewsDto } from './dto/filter-reviews.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

const ACTION_TO_STATUS: Partial<Record<ReviewActionKind, DocumentStatus>> = {
  approved: 'approved',
  rejected: 'rejected',
};

@Injectable()
export class DocumentReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto, reviewerId: string): Promise<unknown> {
    const doc = await this.prisma.document.findFirst({ where: { id: dto.documentId, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.documentReview.create({
        data: {
          documentId: dto.documentId,
          reviewerId,
          action: dto.action,
          remarks: dto.remarks,
        },
      });

      const next = ACTION_TO_STATUS[dto.action];
      if (next) {
        if (doc.status === 'received') {
          await tx.document.update({
            where: { id: dto.documentId },
            data: { status: next },
          });
          await tx.documentHistory.create({
            data: {
              documentId: dto.documentId,
              fromStatus: doc.status,
              toStatus: next,
              actorId: reviewerId,
              remarks: dto.remarks ?? `Review: ${dto.action}`,
            },
          });
        } else {
          throw new BadRequestException(
            `Cannot apply review action when document status is ${doc.status}`,
          );
        }
      }

      return review;
    });
  }

  async findAll(filter: FilterReviewsDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, documentId, reviewerId, action, order } = filter;
    const where: Record<string, unknown> = {};
    if (documentId) where.documentId = documentId;
    if (reviewerId) where.reviewerId = reviewerId;
    if (action) where.action = action;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentReview.findMany({
        where,
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentReview.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.documentReview.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, dto: UpdateReviewDto): Promise<unknown> {
    return this.prisma.documentReview.update({ where: { id }, data: dto });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.documentReview.delete({ where: { id } });
  }
}
