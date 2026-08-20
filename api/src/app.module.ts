import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './modules/audit-module/audit.module';
import { AuthModule } from './modules/auth-module/auth.module';
import { UsersModule } from './modules/users-module/users.module';
import { EmployeeModule } from './modules/features/admin-module/employee/employee.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    CommonModule,
    AuditModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('throttling.ttlSeconds', 60) * 1000,
          limit: config.get<number>('throttling.limit', 100),
        },
        {
          // Stricter limits for authentication endpoints.
          name: 'auth',
          ttl: config.get<number>('throttling.authTtlSeconds', 60) * 1000,
          limit: config.get<number>('throttling.authLimit', 5),
          skipIf: (context) => {
            const path: string = context.switchToHttp().getRequest().path ?? '';
            return !path.startsWith('/api/auth/');
          },
        },
      ],
    }),
    AuthModule,
    UsersModule,
    EmployeeModule,
  ],
  providers: [
    // Authentication is enforced globally; @Public() opts endpoints out.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
