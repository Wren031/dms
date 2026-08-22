import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterUsersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}

export class UsersSortDto {
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'fullName', 'username', 'email', 'lastLoginAt'] as const)
  sortBy?: 'createdAt' | 'updatedAt' | 'fullName' | 'username' | 'email' | 'lastLoginAt';

  @IsOptional()
  @Type(() => Number)
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
