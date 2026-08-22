import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FilterEmployeesDto } from './dto/filter-employees.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEmployeeDto): Promise<unknown> {
    return this.prisma.employee.create({
      data: {
        ...dto,
        hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
      },
      include: { office: true, user: true },
    });
  }

  async findAll(filter: FilterEmployeesDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, search, officeId, isActive, position, sortBy, order } = filter;
    const where: Record<string, unknown> = {};
    if (search) {
      Object.assign(where, {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeNo: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (officeId) where.officeId = officeId;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (position) where.position = { contains: position, mode: 'insensitive' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: { office: true, user: { select: { id: true, username: true, role: true, status: true } } },
        orderBy: { [sortBy ?? 'lastName']: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.employee.findUniqueOrThrow({
      where: { id },
      include: { office: true, user: true },
    });
  }

  update(id: string, dto: UpdateEmployeeDto): Promise<unknown> {
    const data: Record<string, unknown> = { ...dto };
    if (dto.hiredAt) data.hiredAt = new Date(dto.hiredAt);
    return this.prisma.employee.update({
      where: { id },
      data,
      include: { office: true, user: true },
    });
  }

  remove(id: string): Promise<unknown> {
    return this.prisma.employee.delete({ where: { id } });
  }
}
