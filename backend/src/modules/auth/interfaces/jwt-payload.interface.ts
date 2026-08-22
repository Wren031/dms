export interface JwtPayload {
  sub: string;
  role: string;
  sid: string | null;
  iat?: number;
  exp?: number;
}
