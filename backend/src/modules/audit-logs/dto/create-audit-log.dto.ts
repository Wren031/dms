import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @Length(1, 100)
  action!: string;

  @IsString()
  @Length(1, 50)
  module!: string;

  @IsString()
  @Length(1, 500)
  description!: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
