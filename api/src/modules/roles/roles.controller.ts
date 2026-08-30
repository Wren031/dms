import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Get(':id/users')
  getRoleUsers(@Param('id') id: string) {
    return this.rolesService.getRoleUsers(id);
  }

  @Roles(ROLES.SYSTEM_ADMIN)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async setPermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
  ) {
    const updatedPermissions = await this.rolesService.setPermissions(id, permissions ?? []);
    return { permissions: updatedPermissions };
  }
}
