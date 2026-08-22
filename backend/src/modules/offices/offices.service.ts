import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { FilterOfficesDto } from './dto/filter-offices.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOfficeDto): Promise<unknown> {
    return this.prisma.office.create({ data: dto });
  }

  async findAll(filter: FilterOfficesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, search, type, isActive, order } = filter;
    const where: Record<string, unknown> = {};
    if (search) {
      Object.assign(where, {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (type) where.type = type;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.office.findMany({
        where,
        include: { parent: true, children: true, _count: { select: { employees: true } } },
        orderBy: { name: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.office.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findTree(): Promise<unknown> {
    return this.prisma.office.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: { include: { children: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.office.findUniqueOrThrow({
      where: { id },
      include: { parent: true, children: true, employees: { take: 50 } },
    });
  }

  update(id: string, dto: UpdateOfficeDto): Promise<unknown> {
    return this.prisma.office.update({ where: { id }, data: dto });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.office.delete({ where: { id } });
  }
}
