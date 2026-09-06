import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { FilterDocumentTypesDto } from './dto/filter-document-types.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

const CODES_INCLUDE = { codes: { select: { code: true } } };

function flattenCodes(row: any) {
  const { codes, ...rest } = row;
  return { ...rest, codes: codes.map((c: any) => c.code) };
}

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentTypeDto): Promise<unknown> {
    const { codes, ...rest } = dto;
    const created = await this.prisma.documentType.create({
      data: {
        ...rest,
        codes: { create: codes.map(code => ({ code })) },
      },
      include: CODES_INCLUDE,
    });
    return flattenCodes(created);
  }

  async findAll(filter: FilterDocumentTypesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, search, code, isActive, sortBy, order } = filter;
    const where: Record<string, unknown> = {};
    if (search) {
      Object.assign(where, {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { codes: { some: { code: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }
    if (code) where.codes = { some: { code } };
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.documentType.findMany({
        where,
        include: { ...CODES_INCLUDE, _count: { select: { documents: true } } },
        orderBy: { [sortBy ?? 'name']: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.documentType.count({ where }),
    ]);
    const items = rows.map(r => {
      const { codes, ...rest } = r;
      return { ...rest, codes: codes.map((c: any) => c.code) };
    });
    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<unknown> {
    const row = await this.prisma.documentType.findUniqueOrThrow({
      where: { id },
      include: { ...CODES_INCLUDE, _count: { select: { documents: true } } },
    });
    return flattenCodes(row);
  }

  async update(id: string, dto: UpdateDocumentTypeDto): Promise<unknown> {
    const { codes, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (codes !== undefined) {
      await this.prisma.documentTypeCodeEntry.deleteMany({ where: { documentTypeId: id } });
      data.codes = { create: codes.map(code => ({ code })) };
    }
    const updated = await this.prisma.documentType.update({
      where: { id },
      data,
      include: CODES_INCLUDE,
    });
    return flattenCodes(updated);
  }

  async remove(id: string): Promise<unknown> {
    return this.prisma.documentType.delete({ where: { id } });
  }
}
