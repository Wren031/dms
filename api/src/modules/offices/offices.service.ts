import { Injectable } from '@nestjs/common';
import { Prisma, Office } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { FilterOfficesDto } from './dto/filter-offices.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

type OfficeWithCount = Prisma.OfficeGetPayload<{
  include: { _count: { select: { employees: true } } };
}>;

type OfficeListItem = Prisma.OfficeGetPayload<{
  include: {
    parent: true;
    children: true;
    _count: { select: { employees: true } };
  };
}>;

type OfficeDetail = Prisma.OfficeGetPayload<{
  include: {
    parent: true;
    children: true;
    employees: { take: 50 };
    _count: { select: { employees: true } };
  };
}>;

type OfficeTreeNode = Prisma.OfficeGetPayload<{
  include: {
    _count: { select: { employees: true } };
    children: {
      include: {
        _count: { select: { employees: true } };
        children: {
          include: {
            _count: { select: { employees: true } };
            children: {
              include: { _count: { select: { employees: true } } };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOfficeDto): Promise<OfficeWithCount> {
    return this.prisma.office.create({
      data: dto,
      include: { _count: { select: { employees: true } } },
    });
  }

  async findAll(filter: FilterOfficesDto): Promise<PaginatedResult<OfficeListItem>> {
    const { page, pageSize, search: term, type, isActive, order } = filter;
    const where: Prisma.OfficeWhereInput = {};
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.office.findMany({
        where,
        include: {
          parent: true,
          children: true,
          _count: { select: { employees: true } },
        },
        orderBy: { name: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.office.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findTree(): Promise<OfficeTreeNode[]> {
    return this.prisma.office.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: true } },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { employees: true } },
            children: {
              orderBy: { name: 'asc' },
              include: {
                _count: { select: { employees: true } },
                children: {
                  orderBy: { name: 'asc' },
                  include: {
                    _count: { select: { employees: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  findOne(id: string): Promise<OfficeDetail> {
    return this.prisma.office.findUniqueOrThrow({
      where: { id },
      include: {
        parent: true,
        children: true,
        employees: { take: 50 },
        _count: { select: { employees: true } },
      },
    });
  }

  update(id: string, dto: UpdateOfficeDto): Promise<OfficeWithCount> {
    return this.prisma.office.update({
      where: { id },
      data: dto,
      include: { _count: { select: { employees: true } } },
    });
  }

  remove(id: string): Promise<Office> {
    return this.prisma.office.delete({ where: { id } });
  }
}