import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { DocumentStatus } from '@prisma/client';

export class TransitionDocumentDto {
  @IsEnum(DocumentStatus)
  toStatus!: DocumentStatus;

  @IsOptional()
  @IsUUID()
  currentOfficeId?: string;

  @IsOptional()
  @IsUUID()
  currentHolderId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remarks?: string;
}
