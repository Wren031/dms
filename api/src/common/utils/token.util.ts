import { randomBytes, createHash } from 'crypto';

export function randomToken(byteLength = 64): string {
  return randomBytes(byteLength).toString('base64url');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
