import { BadRequestException, Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RolesService, RoleDefinition } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

function parseRole(value: string): Role {
  if ((Object.values(Role) as string[]).includes(value)) {
    return value as Role;
  }
  throw new BadRequestException(`Invalid role: ${value}`);
}

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
    return this.rolesService.findOne(parseRole(id));
  }
}
