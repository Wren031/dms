import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';

import { Request } from 'express';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuthenticatedUser } from 'src/common/types/authenticated-user.type';
import { UserRole } from 'src/modules/auth-module/enums/user-role.enum';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeRequestContext, EmployeeService } from './employee.service';

@Controller('admin/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ==============================
  // REQUEST CONTEXT
  // ==============================

  private getContext(request: Request, user: AuthenticatedUser): EmployeeRequestContext {
    return {
      ip: request.ip ?? null,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
      userId: user.id,
    };
  }

  // ==============================
  // CREATE EMPLOYEE
  // POST /admin/employees
  // ==============================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Permissions('employees:create')
  async addEmployee(
    @Body() dto: CreateEmployeeDto,
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const employee = await this.employeeService.addEmployee(dto, this.getContext(request, user));

    return {
      success: true,
      message: 'Employee created successfully',
      employee,
    };
  }

  // ==============================
  // GET ALL EMPLOYEES
  // GET /admin/employees
  // ==============================

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Permissions('employees:read')
  async getEmployees() {
    const employees = await this.employeeService.getEmployees();

    return {
      success: true,
      employees,
    };
  }

  // ==============================
  // GET EMPLOYEE BY ID
  // GET /admin/employees/:id
  // ==============================

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Permissions('employees:read')
  async getEmployeeById(@Param('id') id: string) {
    const employee = await this.employeeService.getEmployeeById(id);

    return {
      success: true,
      employee,
    };
  }

  // ==============================
  // UPDATE EMPLOYEE
  // PATCH /admin/employees/:id
  // ==============================

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Permissions('employees:update')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const employee = await this.employeeService.updateEmployee(
      id,
      dto,
      this.getContext(request, user),
    );

    return {
      success: true,
      message: 'Employee updated successfully',
      employee,
    };
  }

  // ==============================
  // DELETE EMPLOYEE
  // DELETE /admin/employees/:id
  // ==============================

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Permissions('employees:delete')
  async deleteEmployee(
    @Param('id') id: string,
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const employee = await this.employeeService.deleteEmployee(id, this.getContext(request, user));

    return {
      success: true,
      message: 'Employee deleted successfully',
      employee,
    };
  }
}
