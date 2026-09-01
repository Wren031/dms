import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterNotificationsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  read?: string | boolean;

  @IsOptional()
  order: SortOrder = SortOrder.DESC;
}
