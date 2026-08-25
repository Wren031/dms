import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  permissions: string[];
}

@Injectable()
export class RolesService {
  private readonly roles: RoleDefinition[] = [
    {
      id: 'SYSTEM_ADMIN',
      name: 'System Administrator',
      description: 'Full system access.',
      permissions: ['*'],
    },
    {
      id: 'OFFICE_ADMIN',
      name: 'Office Administrator',
      description: 'Manages office operations.',
      permissions: [
        'documents.*',
        'users.view',
        'users.create',
        'users.edit',
        'offices.view',
        'offices.edit',
        'audit.view',
        'notifications.view',
      ],
    },
    {
      id: 'DOCUMENT_ENCODER',
      name: 'Document Encoder',
      description: 'Encodes and registers documents.',
      permissions: ['documents.view', 'documents.create', 'documents.register', 'documents.track', 'notifications.view'],
    },
    {
      id: 'RECEIVING_OFFICER',
      name: 'Receiving Officer',
      description: 'Receives and routes incoming documents.',
      permissions: ['documents.view', 'documents.receive', 'documents.route', 'documents.track', 'notifications.view'],
    },
    {
      id: 'REVIEWING_OFFICER',
      name: 'Reviewing Officer',
      description: 'Reviews, recommends, approves, rejects, returns.',
      permissions: [
        'documents.view',
        'documents.review',
        'documents.recommend',
        'documents.approve',
        'documents.reject',
        'documents.return',
        'documents.release',
        'documents.track',
        'documents.archive',
        'notifications.view',
      ],
    },
  ];

  findAll(): RoleDefinition[] {
    return this.roles;
  }

  findOne(id: Role): RoleDefinition | undefined {
    return this.roles.find((r) => r.id === id);
  }
}
