import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import ms from 'ms';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Signs and verifies JWTs. Access tokens use a short TTL and the access
 * secret; refresh tokens use a longer TTL and a separate refresh secret.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(payload: Omit<JwtPayload, 'type' | 'jti'>): Promise<string> {
    return this.jwtService.signAsync({ ...payload, type: 'access' } as JwtPayload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m') as ms.StringValue,
    });
  }

  async signRefreshToken(payload: Omit<JwtPayload, 'type'>, jti: string): Promise<string> {
    return this.jwtService.signAsync({ ...payload, type: 'refresh', jti } as JwtPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d') as ms.StringValue,
    });
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
