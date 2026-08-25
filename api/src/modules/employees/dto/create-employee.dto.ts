import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @Length(1, 50)
  employeeNo!: string;

  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  middleName?: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @IsString()
  @Length(1, 100)
  position!: string;

  @IsEmail()
  @Length(3, 254)
  email!: string;

  @IsOptional()
  @IsString()
  @Length(5, 32)
  phone?: string;

  @IsUUID()
  officeId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  hiredAt?: string;
}
