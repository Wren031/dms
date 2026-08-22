import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoutingStepDto {
  @IsInt()
  @Min(1)
  sequence!: number;

  @IsUUID()
  fromOfficeId!: string;

  @IsOptional()
  @IsUUID()
  fromUserId?: string;

  @IsUUID()
  toOfficeId!: string;

  @IsOptional()
  @IsUUID()
  toUserId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  instructions?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  remarks?: string;
}

export class CreateRoutingPlanDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateRoutingStepDto)
  steps!: CreateRoutingStepDto[];
}
