import { IsString, Length } from 'class-validator';

export class SetRecipientNoteDto {
  @IsString()
  @Length(1, 2000)
  note!: string;
}