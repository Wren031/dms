import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class UpsertFormDraftDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class UpsertFormDraftParamsDto {
  @IsString()
  @Length(1, 100)
  formKey!: string;
}
