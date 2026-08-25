import { registerAs } from '@nestjs/config';

export type SameSite = 'Strict' | 'Lax' | 'None';

export interface AuthConfig {
  access: {
    secret: string;
    ttl: string;
  };
  refresh: {
    secret: string;
    ttl: string;
  };
  cookie: {
    domain: string | undefined;
    secure: boolean;
    sameSite: SameSite;
  };
  trustProxy: boolean;
}

function parseSameSite(raw: string | undefined): SameSite {
  const value = (raw ?? 'Lax').trim();
  if (value === 'Strict' || value === 'Lax' || value === 'None') {
    return value;
  }
  return 'Lax';
}

export default registerAs<AuthConfig>('auth', () => ({
  access: {
    secret: process.env.JWT_ACCESS_SECRET ?? '',
    ttl: process.env.JWT_ACCESS_TTL ?? '10m',
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET ?? '',
    ttl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: (process.env.COOKIE_SECURE ?? 'false').toLowerCase() === 'true',
    sameSite: parseSameSite(process.env.COOKIE_SAMESITE),
  },
  trustProxy: (process.env.TRUST_PROXY ?? 'false').toLowerCase() === 'true',
}));
