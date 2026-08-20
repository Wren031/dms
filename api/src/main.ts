import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Never send stack traces or internals to clients.
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const isProduction = configService.get<boolean>('isProduction', false);

  app.setGlobalPrefix('api');

  // ---------------------------------------------------------------
  // Security headers (CSP, X-Content-Type-Options, X-Frame-Options,
  // Referrer-Policy, Strict-Transport-Security)
  // ---------------------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
    }),
  );

  // ---------------------------------------------------------------
  // Cookies (refresh token lives in an HTTP-only cookie)
  // ---------------------------------------------------------------
  app.use(cookieParser());

  // ---------------------------------------------------------------
  // CORS - only the configured frontend origin, credentials enabled.
  // NEVER use origin: '*' when cookies/credentials are involved.
  // ---------------------------------------------------------------
  app.enableCors({
    origin: [configService.get<string>('frontendUrl', 'http://localhost:5173')],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ---------------------------------------------------------------
  // Global input validation
  // ---------------------------------------------------------------
  app.useGlobalPipes(new GlobalValidationPipe());

  // Trust the first proxy hop so req.ip reflects the real client
  // when deployed behind a reverse proxy (Nginx, ALB, ...).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const port = configService.get<number>('port', 3000);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
