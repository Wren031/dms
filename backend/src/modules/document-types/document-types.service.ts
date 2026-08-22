import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { FilterDocumentTypesDto } from './dto/filter-document-types.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDocumentTypeDto): Promise<unknown> {
    return this.prisma.documentType.create({ data: dto });
  }

  async findAll(filter: FilterDocumentTypesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, search, code, isActive, sortBy, order } = filter;
    const where: Record<string, unknown> = {};
    if (search) {
      Object.assign(where, {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (code) where.code = code;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentType.findMany({
        where,
        include: { _count: { select: { documents: true } } },
        orderBy: { [sortBy ?? 'name']: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentType.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.documentType.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
  }

  update(id: string, dto: UpdateDocumentTypeDto): Promise<unknown> {
    return this.prisma.documentType.update({ where: { id }, data: dto });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.documentType.delete({ where: { id } });
  }
}
