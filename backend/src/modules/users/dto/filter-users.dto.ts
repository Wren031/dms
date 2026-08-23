import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { AccountStatus, Role } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterUsersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
