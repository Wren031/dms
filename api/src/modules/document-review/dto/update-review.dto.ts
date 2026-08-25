import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  remarks?: string;
}
