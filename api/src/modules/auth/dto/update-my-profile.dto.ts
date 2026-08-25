import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateMyProfileDto {
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  middleName?: string;

  @IsString()
  @Length(1, 80)
  lastName!: string;

  @IsEmail()
  @Length(3, 254)
  email!: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  @Matches(/^[+0-9()\-\s]*$/, { message: 'phone may only contain digits, spaces, +, -, ()' })
  phone?: string;

  @IsString()
  @Length(1, 120)
  position!: string;
}