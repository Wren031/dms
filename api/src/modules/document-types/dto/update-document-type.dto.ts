import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DocumentTypeCode } from '@prisma/client';

export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsArray()
  @IsEnum(DocumentTypeCode, { each: true })
  codes?: DocumentTypeCode[];

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
