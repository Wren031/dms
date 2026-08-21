import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Office } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { AuditAction } from 'src/modules/audit-module/audit.actions';
import { AuditService } from 'src/modules/audit-module/audit.service';

import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

export interface OfficeRequestContext {
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
}

@Injectable()
export class OfficeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // CREATE
  async createOffice(
    dto: CreateOfficeDto,
    ctx: OfficeRequestContext,
  ): Promise<Office> {
    try {
      const office = await this.prismaService.office.create({
        data: {
          name: dto.name,
          code: dto.code,
        },
      });

      await this.auditService.log({
        userId: ctx.userId,
        action: AuditAction.OFFICE_CREATED,
        resource: 'Office',
        resourceId: office.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          name: office.name,
          code: office.code,
        },
      });

      return office;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'An office with the same code already exists',
        );
      }

      throw error;
    }
  }

  // GET ALL
  async getOffices(): Promise<Office[]> {
    return this.prismaService.office.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  // GET BY ID
  async getOfficeById(id: string): Promise<Office> {
    const office = await this.prismaService.office.findUnique({
      where: {
        id,
      },
    });

    if (!office) {
      throw new NotFoundException('Office not found');
    }

    return office;
  }

  // UPDATE
  async updateOffice(
    id: string,
    dto: UpdateOfficeDto,
    ctx: OfficeRequestContext,
  ): Promise<Office> {
    try {
      const existingOffice =
        await this.prismaService.office.findUnique({
          where: {
            id,
          },
        });

      if (!existingOffice) {
        throw new NotFoundException('Office not found');
      }

      const office = await this.prismaService.office.update({
        where: {
          id,
        },
        data: {
          name: dto.name,
          code: dto.code,
        },
      });

      await this.auditService.log({
        userId: ctx.userId,
        action: AuditAction.OFFICE_UPDATED,
        resource: 'Office',
        resourceId: office.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          name: office.name,
          code: office.code,
        },
      });

      return office;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'An office with the same code already exists',
        );
      }

      throw error;
    }
  }

  // DELETE
  async deleteOffice(
    id: string,
    ctx: OfficeRequestContext,
  ): Promise<Office> {
    const existingOffice =
      await this.prismaService.office.findUnique({
        where: {
          id,
        },
      });

    if (!existingOffice) {
      throw new NotFoundException('Office not found');
    }

    try {
      const office = await this.prismaService.office.delete({
        where: {
          id,
        },
      });

      await this.auditService.log({
        userId: ctx.userId,
        action: AuditAction.OFFICE_DELETED,
        resource: 'Office',
        resourceId: office.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          name: office.name,
          code: office.code,
        },
      });

      return office;
    } catch (error) {
      // Foreign key constraint
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete this office because employees are still assigned to it',
        );
      }

      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}