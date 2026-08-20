import { ConflictException, Injectable } from '@nestjs/common';
import { Employee } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditAction } from 'src/modules/audit-module/audit.actions';
import { AuditService } from 'src/modules/audit-module/audit.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

export interface EmployeeRequestContext {
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
}

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async addEmployee(dto: CreateEmployeeDto, ctx: EmployeeRequestContext): Promise<Employee> {
    try {
      const employee = await this.prismaService.employee.create({
        data: {
          employeeId: dto.employeeId,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          suffix: dto.suffix,
          email: dto.email,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          gender: dto.gender,
          position: dto.position,
          officeId: dto.officeId,
          employmentStatus: dto.employmentStatus,
          dateHired: dto.dateHired ? new Date(dto.dateHired) : null,
          dateSeparated: dto.dateSeparated ? new Date(dto.dateSeparated) : null,
          profilePhoto: dto.profilePhoto,
          userId: dto.userId,
        },
      });

      await this.auditService.log({
        userId: ctx.userId,
        action: AuditAction.EMPLOYEE_CREATED,
        resource: 'Employee',
        resourceId: employee.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { employeeId: employee.employeeId },
      });

      return employee;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'An employee with the same employeeId, email, or userId already exists',
        );
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002'
    );
  }
}
