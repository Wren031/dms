import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DocumentTypeCode } from '@prisma/client';

export class CreateDocumentTypeDto {
  @IsEnum(DocumentTypeCode)
  code!: DocumentTypeCode;

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
