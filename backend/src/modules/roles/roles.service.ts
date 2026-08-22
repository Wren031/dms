import { Injectable } from '@nestjs/common';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

@Injectable()
export class RolesService {
  private readonly roles: RoleDefinition[] = [
    {
      id: 'system_admin',
      name: 'System Administrator',
      description: 'Full system access.',
      permissions: ['*'],
    },
    {
      id: 'office_admin',
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
      id: 'document_encoder',
      name: 'Document Encoder',
      description: 'Encodes and registers documents.',
      permissions: ['documents.view', 'documents.create', 'documents.register', 'documents.track', 'notifications.view'],
    },
    {
      id: 'receiving_officer',
      name: 'Receiving Officer',
      description: 'Receives and routes incoming documents.',
      permissions: ['documents.view', 'documents.receive', 'documents.route', 'documents.track', 'notifications.view'],
    },
    {
      id: 'reviewing_officer',
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

  findOne(id: string): RoleDefinition | undefined {
    return this.roles.find((r) => r.id === id);
  }
}
