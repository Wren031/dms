import { IsOptional, IsString, Length } from 'class-validator';

export class ReceiveDocumentDto {
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remarks?: string;
}