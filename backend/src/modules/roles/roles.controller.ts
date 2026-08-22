import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RolesService, RoleDefinition } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(): RoleDefinition[] {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): RoleDefinition | undefined {
    return this.rolesService.findOne(id);
  }
}
