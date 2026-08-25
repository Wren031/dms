import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class AssignDocumentHolderDto {
  @IsUUID()
  holderId!: string;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
