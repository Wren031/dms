import type { AuthUser, Session, UpdateMyProfileRequest } from '@/features/authentication/api/authApi';

export type { AuthUser, Session, UpdateMyProfileRequest };

export interface ProfileForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  position: string;
  phone: string;
}

interface ProfileSource {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email: string | null;
  position: string | null;
  phone?: string | null;
}

export interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

export interface NotificationPrefs {
  emailNotifications: boolean;
  documentAlerts: boolean;
  routingUpdates: boolean;
  weeklyDigest: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailNotifications: true,
  documentAlerts: true,
  routingUpdates: true,
  weeklyDigest: false,
  soundEnabled: true,
};

export function profileFormFromUser(user: ProfileSource): ProfileForm {
  return {
    firstName: user.firstName ?? '',
    middleName: user.middleName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    position: user.position ?? '',
    phone: user.phone ?? '',
  };
}