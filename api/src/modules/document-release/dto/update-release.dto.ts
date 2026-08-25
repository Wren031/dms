import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateReleaseDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
