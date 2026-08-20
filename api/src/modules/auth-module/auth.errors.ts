import { ConflictException, UnauthorizedException } from '@nestjs/common';

export const GENERIC_CREDENTIALS_MESSAGE = 'Invalid email or password';

/**
 * Thrown when credentials are wrong, the account is locked or the account
 * status does not permit login. The message is deliberately generic so that
 * the response never reveals whether an email address exists or whether an
 * account is locked (anti-enumeration).
 */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super(GENERIC_CREDENTIALS_MESSAGE);
  }
}

export class TokenInvalidException extends UnauthorizedException {
  constructor() {
    super('Invalid or expired token');
  }
}

export class EmailAlreadyRegisteredException extends ConflictException {
  constructor() {
    super('Email is already registered');
  }
}
