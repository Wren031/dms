import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Observable, filter, map } from 'rxjs';
import { NotificationsService, NotificationEvent } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @SkipThrottle()
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: FilterNotificationsDto,
  ) {
    return this.notificationsService.findAll(user.id, filter);
  }

  @SkipThrottle()
  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user.id);
  }

  @SkipThrottle()
  @Get('stream')
  @Sse()
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.notificationsService.stream$.pipe(
      filter((e: NotificationEvent) => e.userId === user.id),
      map((e: NotificationEvent) => ({ data: e })),
    );
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() user: AuthenticatedUser, @Body() dto: MarkReadDto) {
    return this.notificationsService.markRead(user.id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.notificationsService.remove(user.id, id);
  }

  // Internal: any module can call this (admin-only) to dispatch a notification.
  @Roles(ROLES.SYSTEM_ADMIN, ROLES.OFFICE_ADMIN)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('dispatch')
  @HttpCode(HttpStatus.CREATED)
  dispatch(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }
}