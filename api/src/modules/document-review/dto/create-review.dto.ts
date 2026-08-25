import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ReviewActionKind } from '@prisma/client';

export class CreateReviewDto {
  @IsUUID()
  documentId!: string;

  @IsEnum(ReviewActionKind)
  action!: ReviewActionKind;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  remarks?: string;
}
