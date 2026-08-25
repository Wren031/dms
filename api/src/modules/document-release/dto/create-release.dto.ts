import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ReleaseMethod } from '@prisma/client';

export class CreateReleaseDto {
  @IsUUID()
  documentId!: string;

  @IsOptional()
  @IsUUID()
  releasedToId?: string;

  @IsEnum(ReleaseMethod)
  method!: ReleaseMethod;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  releasedAt?: string;
}
