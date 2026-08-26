import { Role } from '@prisma/client';

export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN' as Role,
  OFFICE_ADMIN: 'OFFICE_ADMIN' as Role,
  DOCUMENT_ENCODER: 'DOCUMENT_ENCODER' as Role,
  DOCUMENT_OFFICER: 'DOCUMENT_OFFICER' as Role,
} as const;

export const ALL_ROLES: Role[] = [
  ROLES.SYSTEM_ADMIN,
  ROLES.OFFICE_ADMIN,
  ROLES.DOCUMENT_ENCODER,
  ROLES.DOCUMENT_OFFICER,
];

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: 'System Administrator',
  OFFICE_ADMIN: 'Office Administrator',
  DOCUMENT_ENCODER: 'Document Encoder',
  DOCUMENT_OFFICER: 'Document Officer',
};
