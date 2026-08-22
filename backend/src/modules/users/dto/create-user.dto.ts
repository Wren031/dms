import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @Length(3, 254)
  email!: string;

  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'username may only contain letters, digits, dot, dash, underscore',
  })
  username!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @IsString()
  @Length(1, 150)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  middleName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(5, 32)
  phone?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  avatarColor?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
