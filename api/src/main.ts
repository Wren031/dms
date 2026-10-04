import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';
import { CorsConfig } from './config/cors.config';
import { API_PREFIX } from './common/constants/api.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const configService = app.get(ConfigService);
  const appCfg = configService.getOrThrow<AppConfig>('app');
  const cors = configService.getOrThrow<CorsConfig>('cors');

  const expressInstance = app.getHttpAdapter().getInstance() as { set?: (key: string, value: unknown) => void };
  if (typeof expressInstance.set === 'function') {
    expressInstance.set('trust proxy', appCfg.host === '0.0.0.0' || appCfg.host === '::' ? 'loopback' : true);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false, // API-only; enable in browser apps via gateway
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Cookies
  app.use(cookieParser());

  // Global API version prefix
  app.setGlobalPrefix(API_PREFIX);

  // CORS with credentials
  app.enableCors({
    origin: cors.origin,
    credentials: cors.credentials,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  await app.listen(appCfg.port, appCfg.host);
  Logger.log(`DMS backend listening on http://${appCfg.host}:${appCfg.port}`, 'Bootstrap');
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
