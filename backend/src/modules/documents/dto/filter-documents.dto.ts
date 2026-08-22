import {
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
  DocumentStatus,
} from '@prisma/client';
import { PaginationDto, SortOrder } from '../../../common/dto/pagination.dto';

export class FilterDocumentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 250)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(DocumentStatus, { each: true })
  statuses?: DocumentStatus[];

  @IsOptional()
  @IsUUID()
  typeId?: string;

  @IsOptional()
  @IsEnum(DocumentClassification)
  classification?: DocumentClassification;

  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @IsOptional()
  @IsEnum(DocumentSource)
  source?: DocumentSource;

  @IsOptional()
  @IsUUID()
  originatingOfficeId?: string;

  @IsOptional()
  @IsUUID()
  currentOfficeId?: string;

  @IsOptional()
  @IsUUID()
  currentHolderId?: string;

  @IsOptional()
  @IsUUID()
  encodedById?: string;

  @IsOptional()
  @IsUUID()
  receivedById?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'trackingNumber' | 'title' | 'dateReceived' | 'dueDate';

  @IsOptional()
  @IsString()
  order: SortOrder = SortOrder.DESC;
}
