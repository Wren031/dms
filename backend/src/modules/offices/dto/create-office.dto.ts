import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { OfficeType } from '@prisma/client';

export class CreateOfficeDto {
  @IsString()
  @Length(1, 150)
  name!: string;

  @IsString()
  @Length(1, 30)
  code!: string;

  @IsEnum(OfficeType)
  type!: OfficeType;

  @IsOptional()
  @IsUUID()
  parentId?: string;

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
