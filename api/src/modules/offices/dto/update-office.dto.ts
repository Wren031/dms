import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OfficeType } from '@prisma/client';

export class UpdateOfficeDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  code?: string;

  @IsOptional()
  @IsEnum(OfficeType)
  type?: OfficeType;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  headName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
