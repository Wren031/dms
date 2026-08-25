import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import {
  DocumentClassification,
  DocumentPriority,
  DocumentSource,
} from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  @Length(1, 250)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsUUID()
  typeId!: string;

  @IsEnum(DocumentClassification)
  classification!: DocumentClassification;

  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @IsEnum(DocumentSource)
  source!: DocumentSource;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  senderName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  documentNumber?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  tags?: string[];

  @IsUUID()
  originatingOfficeId!: string;

  @IsUUID()
  currentOfficeId!: string;

  @IsOptional()
  @IsUUID()
  currentHolderId?: string;

  @IsOptional()
  @IsUUID()
  receivedById?: string;

  @IsOptional()
  @IsDateString()
  dateReceived?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
