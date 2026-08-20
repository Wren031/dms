import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Ownership } from '../../common/decorators/ownership.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { UserRole } from '../auth-module/enums/user-role.enum';
import { AuthService } from '../auth-module/auth.service';

/**
 * Minimal read-only user profile module.
 *
 * It is the reference implementation for object-level authorization:
 *  - @Ownership('userId') => OwnershipGuard => IDOR/BOLA protection
 *  - @Roles(...)          => RBAC
 *
 * Future modules (passenger, driver, orders, files, ...) must follow the
 * same pattern: never query a resource by a client-supplied id without an
 * authorization check.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getProfile(user.id);
    return { success: true, user: profile };
  }

  @Post()
  async createUsers() {}

  /**
   * Protected by the OwnershipGuard: a USER may only access their own
   * profile; ADMIN / SUPER_ADMIN may access any profile. A UUID alone is
   * never sufficient authorization.
   */
  @UseGuards(OwnershipGuard)
  @Ownership('userId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':userId')
  async getById(@Param('userId', ParseUUIDPipe) userId: string) {
    const profile = await this.authService.getProfile(userId);
    return { success: true, user: profile };
  }
}
