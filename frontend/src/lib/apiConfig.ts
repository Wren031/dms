const API_VERSION = '/api/v2';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '') + API_VERSION;
