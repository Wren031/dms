import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterAuditLogsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  module?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  action?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  order: SortOrder = SortOrder.DESC;
}
