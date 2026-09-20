import { IsIn } from 'class-validator';

export class DeleteAllDocumentsDto {
  @IsIn(['DELETE ALL DOCUMENTS'], {
    message: 'confirmation must equal DELETE ALL DOCUMENTS',
  })
  confirmation!: string;
}