import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

export interface NotificationEvent {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly events$ = new Subject<NotificationEvent>();
  readonly stream$ = this.events$.asObservable();

  constructor(private readonly prisma: PrismaService) {}

  publish(event: NotificationEvent): void {
    this.events$.next(event);
  }

  async create(dto: CreateNotificationDto): Promise<unknown> {
    const notif = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
    });
    this.publish({
      id: notif.id,
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link ?? undefined,
      createdAt: notif.createdAt,
    });
    return notif;
  }

  async findAll(
    userId: string,
    filter: FilterNotificationsDto,
  ): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, type, read, order } = filter;
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;
    if (typeof read === 'boolean') where.read = read;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: string, dto: MarkReadDto): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: dto.ids }, userId },
      data: { read: true, readAt: new Date() },
    });
    return { count: result.count };
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { count: result.count };
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    const result = await this.prisma.notification.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      // Caller decides whether this is an error; return success only when found.
      return { success: false as unknown as true };
    }
    return { success: true };
  }
}
