import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Optional body when refresh is sent explicitly instead of via the HttpOnly cookie.
 */
export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @Length(20, 512)
  refreshToken?: string;
}
