/**
 * The refresh token is only ever read from the HTTP-only cookie.
 * Any body sent to the refresh endpoint is rejected by the global
 * ValidationPipe (forbidNonWhitelisted) - a defensive measure that keeps
 * clients from passing tokens through the request body.
 */
export class RefreshTokenDto {}
