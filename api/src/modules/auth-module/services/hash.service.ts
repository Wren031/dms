import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';

/**
 * Password hashing (Argon2id) and token hashing utilities.
 * Raw passwords and tokens are never stored - only hashes.
 */
@Injectable()
export class HashService {
  constructor(private readonly configService: ConfigService) {}

  async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.configService.get<number>('security.argon2MemoryKb', 65536),
      timeCost: this.configService.get<number>('security.argon2TimeCost', 3),
      parallelism: this.configService.get<number>('security.argon2Parallelism', 4),
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * SHA-256 hash of a random token. Stored in the database instead of the
   * raw token, so a database leak does not expose usable tokens.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Cryptographically secure random token (URL-safe, no padding).
   */
  generateToken(byteLength = 32): string {
    return randomBytes(byteLength).toString('base64url');
  }

  /**
   * Cryptographically secure random id for JWT jti claims.
   */
  generateJti(): string {
    return randomBytes(16).toString('base64url');
  }
}
