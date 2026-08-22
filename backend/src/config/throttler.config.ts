import { registerAs } from '@nestjs/config';

export interface ThrottlerAppConfig {
  ttl: number;
  limit: number;
}

export default registerAs<ThrottlerAppConfig>('throttler', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '900000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '5', 10),
}));
