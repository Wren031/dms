import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export type MailTestStatus = 'sent' | 'skipped' | 'failed';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Roles(ROLES.SYSTEM_ADMIN)
  @Audit('mail.test', 'mail', 'Mail')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async test(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ status: MailTestStatus; recipient: string }> {
    const recipient = user.email;
    if (!recipient) {
      throw new BadRequestException(
        'Your account has no email address to send the test to.',
      );
    }
    if (!this.mailService.isConfigured) {
      return { status: 'skipped', recipient };
    }
    try {
      await this.mailService.sendTest(recipient);
      return { status: 'sent', recipient };
    } catch {
      return { status: 'failed', recipient };
    }
  }
}