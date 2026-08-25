import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Optional body for `POST /users/:id/reset-password` (admin action).
 */
export class ResetUserPasswordDto {
  @IsOptional()
  @IsString()
  @Length(8, 128)
  newPassword?: string;
}
