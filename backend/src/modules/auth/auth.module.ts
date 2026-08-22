import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthSessionCleanupService } from './auth-session-cleanup.service';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '../../config/auth.config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authCfg = configService.getOrThrow<AuthConfig>('auth');
        return {
          secret: authCfg.access.secret,
          signOptions: {
            expiresIn: authCfg.access.ttl,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthSessionCleanupService],
  exports: [AuthService],
})
export class AuthModule {}
