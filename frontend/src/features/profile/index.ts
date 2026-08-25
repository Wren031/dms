export { SettingsPage } from '@/features/profile/pages/SettingsPage';

export {
  useProfileForm,
  usePasswordForm,
  useNotificationPrefs,
  useSessions,
} from '@/features/profile/hooks';

export {
  ProfileApiError,
  profileService,
} from '@/features/profile/services/profile.service';

export type {
  ProfileForm,
  PasswordForm,
  NotificationPrefs,
  AuthUser,
  Session,
  UpdateMyProfileRequest,
} from '@/features/profile/types/profile';

export {
  DangerItem,
  HealthItem,
  PrefRow,
  SessionItem,
  SettingsHero,
  SettingsNav,
  SettingsSection,
} from '@/features/profile/components';

export type { SettingsNavItem } from '@/features/profile/components';