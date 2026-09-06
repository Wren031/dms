import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { DocumentTypeCode } from '@prisma/client';

export class CreateDocumentTypeDto {
  @IsArray()
  @IsEnum(DocumentTypeCode, { each: true })
  @IsNotEmpty()
  codes!: DocumentTypeCode[];

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
