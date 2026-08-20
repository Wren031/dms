import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  /**
   * Unique token id, used to identify refresh-token sessions.
   */
  jti?: string;
}
