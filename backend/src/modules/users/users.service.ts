import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { hashPassword } from '../../common/utils/hash.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<unknown> {
    const passwordHash = await hashPassword(dto.password);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        status: dto.status ?? 'active',
        avatarColor: dto.avatarColor,
        employeeId: dto.employeeId,
      },
      include: { employee: true },
    });
  }

  async findAll(filter: FilterUsersDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, search, role, status, officeId, order } = filter;
    const where: Record<string, unknown> = {};
    if (search) {
      Object.assign(where, {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (officeId) where.employee = { officeId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { employee: { include: { office: true } } },
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<unknown> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { employee: { include: { office: true } } },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<unknown> {
    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await hashPassword(password);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      include: { employee: { include: { office: true } } },
    });
  }

  async remove(id: string): Promise<unknown> {
    return this.prisma.user.delete({ where: { id } });
  }

  async resetPassword(id: string, newPassword?: string): Promise<{ success: true }> {
    const password = newPassword ?? this.generateTempPassword();
    const passwordHash = await hashPassword(password);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } },
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
