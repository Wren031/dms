import { IsString, Length } from 'class-validator';

export class CheckDocumentNumberDto {
  @IsString()
  @Length(1, 250)
  documentNumber!: string;
}