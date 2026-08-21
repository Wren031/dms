import type { Role } from '@/types';
import { ROLE_DESCRIPTIONS, ROLE_PERMISSIONS } from '@/constants';

export const roles: Role[] = [
  {
    id: 'system_admin',
    name: 'System Administrator',
    description: ROLE_DESCRIPTIONS.system_admin,
    permissions: ROLE_PERMISSIONS.system_admin,
  },
  {
    id: 'office_admin',
    name: 'Office Administrator',
    description: ROLE_DESCRIPTIONS.office_admin,
    permissions: ROLE_PERMISSIONS.office_admin,
  },
  {
    id: 'document_encoder',
    name: 'Document Encoder',
    description: ROLE_DESCRIPTIONS.document_encoder,
    permissions: ROLE_PERMISSIONS.document_encoder,
  },
  {
    id: 'receiving_officer',
    name: 'Receiving Officer',
    description: ROLE_DESCRIPTIONS.receiving_officer,
    permissions: ROLE_PERMISSIONS.receiving_officer,
  },
  {
    id: 'reviewing_officer',
    name: 'Reviewing Officer',
    description: ROLE_DESCRIPTIONS.reviewing_officer,
    permissions: ROLE_PERMISSIONS.reviewing_officer,
  },
];

export const getRoleById = (id: string) => roles.find(r => r.id === id);
