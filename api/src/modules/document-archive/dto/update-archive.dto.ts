import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateArchiveDto {
  @IsOptional()
  @IsString()
  @Length(0, 200)
  location?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
