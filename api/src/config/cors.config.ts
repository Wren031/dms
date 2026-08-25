import { registerAs } from '@nestjs/config';

export interface CorsConfig {
  origin: string[];
  credentials: boolean;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default registerAs<CorsConfig>('cors', () => ({
  origin: parseOrigins(process.env.CORS_ORIGIN),
  credentials: (process.env.CORS_CREDENTIALS ?? 'true').toLowerCase() === 'true',
}));
