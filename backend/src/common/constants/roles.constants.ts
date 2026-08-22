import { UserRole } from '@prisma/client';

export const ROLES = {
  SYSTEM_ADMIN: 'system_admin' as UserRole,
  OFFICE_ADMIN: 'office_admin' as UserRole,
  DOCUMENT_ENCODER: 'document_encoder' as UserRole,
  RECEIVING_OFFICER: 'receiving_officer' as UserRole,
  REVIEWING_OFFICER: 'reviewing_officer' as UserRole,
} as const;

export const ALL_ROLES: UserRole[] = [
  ROLES.SYSTEM_ADMIN,
  ROLES.OFFICE_ADMIN,
  ROLES.DOCUMENT_ENCODER,
  ROLES.RECEIVING_OFFICER,
  ROLES.REVIEWING_OFFICER,
];

export const ROLE_LABELS: Record<UserRole, string> = {
  system_admin: 'System Administrator',
  office_admin: 'Office Administrator',
  document_encoder: 'Document Encoder',
  receiving_officer: 'Receiving Officer',
  reviewing_officer: 'Reviewing Officer',
};
