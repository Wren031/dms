import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RoutingStepStatus } from '@prisma/client';

export class FilterRoutingStepsDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  toOfficeId?: string;

  @IsOptional()
  @IsUUID()
  toUserId?: string;

  @IsOptional()
  @IsEnum(RoutingStepStatus)
  status?: RoutingStepStatus;
}
