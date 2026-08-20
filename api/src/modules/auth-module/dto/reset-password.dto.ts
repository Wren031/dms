import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_PATTERN_MESSAGE } from './register.dto';

export class ResetPasswordDto {
  @IsString()
  @MinLength(16)
  @MaxLength(2048)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password: string;

  @IsString()
  @MaxLength(128)
  confirmPassword: string;
}
