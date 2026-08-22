import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordTrackingDto {
  @IsUUID()
  documentId!: string;

  @IsString()
  @Length(1, 100)
  event!: string;

  @IsOptional()
  @Type(() => Object)
  payload?: Record<string, unknown>;
}

export class FilterTrackingDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  event?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
