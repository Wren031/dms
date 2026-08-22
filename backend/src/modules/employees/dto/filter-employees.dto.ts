import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterEmployeesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  search?: string;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  position?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'firstName' | 'lastName' | 'employeeNo' | 'createdAt';

  @IsOptional()
  @IsString()
  order: SortOrder = SortOrder.ASC;
}
