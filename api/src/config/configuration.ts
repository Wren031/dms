export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  frontendUrl: string;
  security: {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    argon2MemoryKb: number;
    argon2TimeCost: number;
    argon2Parallelism: number;
  };
  tokens: {
    emailVerificationTtlMinutes: number;
    passwordResetTtlMinutes: number;
  };
  throttling: {
    ttlSeconds: number;
    limit: number;
    authTtlSeconds: number;
    authLimit: number;
  };
  cookies: {
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
  };
  dev: {
    returnTokens: boolean;
  };
}

export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: parseInt(process.env.PORT ?? '3000', 10),
    databaseUrl: process.env.DATABASE_URL ?? '',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    security: {
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '5', 10),
      lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES ?? '15', 10),
      argon2MemoryKb: parseInt(process.env.ARGON2_MEMORY_KB ?? '65536', 10),
      argon2TimeCost: parseInt(process.env.ARGON2_TIME_COST ?? '3', 10),
      argon2Parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '4', 10),
    },
    tokens: {
      emailVerificationTtlMinutes: parseInt(
        process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? '1440',
        10,
      ),
      passwordResetTtlMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? '15', 10),
    },
    throttling: {
      ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
      authTtlSeconds: parseInt(process.env.AUTH_THROTTLE_TTL_SECONDS ?? '60', 10),
      authLimit: parseInt(process.env.AUTH_THROTTLE_LIMIT ?? '5', 10),
    },
    cookies: {
      sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
      path: process.env.COOKIE_PATH ?? '/api/auth',
    },
    dev: {
      returnTokens: (process.env.DEV_RETURN_TOKENS ?? 'false') === 'true',
    },
  };
};
