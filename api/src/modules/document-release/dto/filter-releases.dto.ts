import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReleaseMethod } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterReleasesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  releasedById?: string;

  @IsOptional()
  @IsUUID()
  releasedToId?: string;

  @IsOptional()
  @IsEnum(ReleaseMethod)
  method?: ReleaseMethod;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  order: SortOrder = SortOrder.DESC;
}
