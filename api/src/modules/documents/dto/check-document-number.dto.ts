import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CheckDocumentNumberDto {
  @IsString()
  @Length(1, 250)
  documentNumber!: string;

  /**
   * Numbers are unique per originating office. Omit (or pass null) to check the
   * manual-origin pool, which uses the `MAN-YYYY-NNNN` series.
   */
  @IsOptional()
  @IsUUID()
  originatingOfficeId?: string;
}
