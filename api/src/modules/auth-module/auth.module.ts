import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CookieService } from './services/cookie.service';
import { EmailService } from './services/email.service';
import { HashService } from './services/hash.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    HashService,
    TokenService,
    CookieService,
    EmailService,
    JwtStrategy,
    LocalStrategy,
    RefreshTokenStrategy,
    LocalAuthGuard,
  ],
  exports: [AuthService, AuthRepository],
})
export class AuthModule {}
