import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AttachmentStatus } from '@prisma/client';

export class FilterAttachmentsDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsEnum(AttachmentStatus)
  status?: AttachmentStatus;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
