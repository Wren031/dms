import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateAttachmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
