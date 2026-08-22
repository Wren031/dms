export const COOKIE_NAMES = {
  ACCESS: 'dms_at',
  REFRESH: 'dms_rt',
  CSRF: 'dms_csrf',
} as const;

export const COOKIE_PATHS = {
  ACCESS: '/',
  REFRESH: '/auth',
  CSRF: '/',
} as const;

export const CSRF_HEADER = 'x-xsrf-token';

export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];
