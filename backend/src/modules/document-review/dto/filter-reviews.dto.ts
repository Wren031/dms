import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReviewActionKind } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterReviewsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @IsOptional()
  @IsEnum(ReviewActionKind)
  action?: ReviewActionKind;

  @IsOptional()
  order: SortOrder = SortOrder.DESC;
}
