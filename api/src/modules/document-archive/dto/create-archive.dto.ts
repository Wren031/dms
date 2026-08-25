import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateArchiveDto {
  @IsUUID()
  documentId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  location?: string;

  @IsOptional()
  @IsDateString()
  retentionUntil?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
