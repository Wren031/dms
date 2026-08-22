import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OfficeType } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterOfficesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  search?: string;

  @IsOptional()
  @IsEnum(OfficeType)
  type?: OfficeType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.ASC;
}
