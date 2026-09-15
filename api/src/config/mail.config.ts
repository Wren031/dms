import { registerAs } from '@nestjs/config';

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromAddress: string;
  loginUrl: string;
}

export default registerAs<MailConfig>('mail', () => ({
  host: process.env.MAIL_HOST ?? '',
  port: parseInt(process.env.MAIL_PORT ?? '587', 10),
  secure: (process.env.MAIL_SECURE ?? 'false').toLowerCase() === 'true',
  requireTls: (process.env.MAIL_REQUIRE_TLS ?? 'false').toLowerCase() === 'true',
  user: process.env.MAIL_USER ?? '',
  pass: process.env.MAIL_PASS ?? '',
  fromName: process.env.MAIL_FROM_NAME ?? 'DMS',
  fromAddress: process.env.MAIL_FROM_ADDRESS ?? process.env.MAIL_USER ?? '',
  loginUrl: process.env.MAIL_LOGIN_URL ?? 'http://localhost:5173/login',
}));