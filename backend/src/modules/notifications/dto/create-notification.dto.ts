import { IsEnum, IsOptional, IsString, IsUUID, Length, IsUrl } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 1000)
  message!: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  link?: string;
}
