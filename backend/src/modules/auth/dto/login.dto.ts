import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  emailOrUsername!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
