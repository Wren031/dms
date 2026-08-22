import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UploadAttachmentDto {
  @IsString()
  @Length(1, 255)
  fileName!: string;

  @IsString()
  @Length(1, 255)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100 MB hard cap
  sizeBytes!: number;
}

export class AttachmentMetadataDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
