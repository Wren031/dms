import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterArchivesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  archivedById?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  order: SortOrder = SortOrder.DESC;
}
