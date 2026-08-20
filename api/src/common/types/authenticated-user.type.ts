import { AccountStatus, UserRole } from '../../modules/auth-module/enums';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
}
