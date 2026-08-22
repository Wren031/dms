import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DocumentTypeCode } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterDocumentTypesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentTypeCode)
  code?: DocumentTypeCode;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'code' | 'createdAt';

  @IsOptional()
  @IsString()
  order: SortOrder = SortOrder.ASC;
}
