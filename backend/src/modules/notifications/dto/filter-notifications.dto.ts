import { IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterNotificationsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  read?: boolean;

  @IsOptional()
  order: SortOrder = SortOrder.DESC;
}
