import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

export const PASSWORD_PATTERN_MESSAGE =
  'Password must be 8-128 characters and contain at least one lowercase letter, one uppercase letter, one digit and one special character';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password: string;

  @IsString()
  @MaxLength(128)
  confirmPassword: string;
}
