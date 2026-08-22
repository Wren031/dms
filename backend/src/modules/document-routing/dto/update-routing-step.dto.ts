import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { RoutingStepStatus } from '@prisma/client';

export class UpdateRoutingStepDto {
  @IsOptional()
  @IsEnum(RoutingStepStatus)
  status?: RoutingStepStatus;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  instructions?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remarks?: string;

  @IsOptional()
  @IsUUID()
  toUserId?: string;
}

export class AdvanceRoutingStepDto {
  @IsEnum(RoutingStepStatus)
  status!: RoutingStepStatus;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remarks?: string;
}
