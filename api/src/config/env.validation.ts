import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @IsOptional()
  PORT?: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  MAX_LOGIN_ATTEMPTS?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  LOCKOUT_DURATION_MINUTES?: number;

  @IsInt()
  @Min(1024)
  @IsOptional()
  ARGON2_MEMORY_KB?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  ARGON2_TIME_COST?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  ARGON2_PARALLELISM?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  PASSWORD_RESET_TOKEN_TTL_MINUTES?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_TTL_SECONDS?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  AUTH_THROTTLE_TTL_SECONDS?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  AUTH_THROTTLE_LIMIT?: number;

  @IsString()
  @IsOptional()
  COOKIE_SAMESITE?: 'lax' | 'strict' | 'none';

  @IsString()
  @IsOptional()
  COOKIE_PATH?: string;

  @IsString()
  @IsOptional()
  DEV_RETURN_TOKENS?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validatedConfig;
}
