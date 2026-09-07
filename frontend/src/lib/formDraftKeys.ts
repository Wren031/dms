export const FORM_DRAFT_KEYS = {
  USER_CREATE: 'user.create',
  OFFICE_CREATE: 'office.create',
  DOCUMENT_TYPE_CREATE: 'document-type.create',
  DOCUMENT_REGISTER: 'document.register',
} as const;

export type FormDraftKey =
  (typeof FORM_DRAFT_KEYS)[keyof typeof FORM_DRAFT_KEYS];
