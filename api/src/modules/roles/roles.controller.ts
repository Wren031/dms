import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RolesService, RoleDefinition, RoleSummary, RoleUser } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(): Promise<RoleSummary[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<RoleDefinition> {
    return this.rolesService.findOne(id);
  }

  @Get(':id/users')
  getRoleUsers(@Param('id') id: string): Promise<RoleUser[]> {
    return this.rolesService.getRoleUsers(id);
  }
}