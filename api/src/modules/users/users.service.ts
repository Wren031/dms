import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { hashPassword } from '../../common/utils/hash.util';

type UserWithEmployee = Prisma.UserGetPayload<{
  include: {
    employee: {
      include: {
        office: true;
      };
    };
  };
}>;

const userWithEmployeeInclude = {
  employee: {
    include: {
      office: true,
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserWithEmployee> {
    const passwordHash = await hashPassword(dto.password);

    return this.prisma.user.create({
      data: {
        username: dto.username ?? null,
        email: dto.email ?? null,
        passwordHash,
        role: dto.role ?? 'DOCUMENT_ENCODER',
        status: dto.status ?? 'ACTIVE',
        employeeId: dto.employeeId,
      },
      include: userWithEmployeeInclude,
    });
  }

  async findAll(filter: FilterUsersDto): Promise<PaginatedResult<UserWithEmployee>> {
    const { page, pageSize, search, role, status, officeId, order } = filter;
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { middleName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { employeeNo: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (officeId) where.employee = { officeId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userWithEmployeeInclude,
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<UserWithEmployee> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: userWithEmployeeInclude,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserWithEmployee> {
    const { password, ...rest } = dto;
    const data: Prisma.UserUpdateInput = {};
    if (rest.username !== undefined) data.username = rest.username;
    if (rest.email !== undefined) data.email = rest.email;
    if (rest.role !== undefined) data.role = rest.role;
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.employeeId !== undefined) data.employee = { connect: { id: rest.employeeId } };
    if (password) {
      data.passwordHash = await hashPassword(password);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      include: userWithEmployeeInclude,
    });
  }

  async remove(id: string): Promise<UserWithEmployee> {
    return this.prisma.user.delete({
      where: { id },
      include: userWithEmployeeInclude,
    });
  }

  async resetPassword(id: string, newPassword?: string): Promise<{ success: true }> {
    const password = newPassword ?? this.generateTempPassword();
    const passwordHash = await hashPassword(password);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        authSessions: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: new Date() },
          },
        },
      },
    });
    return { success: true };
  }

  private generateTempPassword(): string {
    const len = 12;
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < len; i++) {
      out += charset[Math.floor(Math.random() * charset.length)];
    }
    return out;
  }
}
