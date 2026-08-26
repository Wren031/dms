import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

export interface RoleUser {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: string;
  status: string;
  officeName: string | null;
  position: string | null;
  createdAt: string;
}

const ROLE_DEFINITIONS: Record<Role, { name: string; description: string; permissions: string[] }> = {
  SYSTEM_ADMIN: {
    name: 'System Administrator',
    description: 'Full system access. Manages users, offices, roles, and system configuration.',
    permissions: [
      'dashboard.view',
      'documents.view', 'documents.create', 'documents.edit', 'documents.delete',
      'documents.register', 'documents.receive', 'documents.route', 'documents.review',
      'documents.recommend', 'documents.approve', 'documents.reject', 'documents.return',
      'documents.release', 'documents.archive', 'documents.track',
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'offices.view', 'offices.create', 'offices.edit', 'offices.delete',
      'document_types.view', 'document_types.create', 'document_types.edit', 'document_types.delete',
      'roles.view', 'roles.edit',
      'audit.view',
      'notifications.view',
      'settings.view', 'settings.edit',
    ],
  },
  OFFICE_ADMIN: {
    name: 'Office Administrator',
    description: 'Manages office operations, users within an office, and document workflows.',
    permissions: [
      'dashboard.view',
      'documents.view', 'documents.register', 'documents.receive', 'documents.route',
      'documents.review', 'documents.recommend', 'documents.approve', 'documents.reject',
      'documents.return', 'documents.release', 'documents.archive', 'documents.track',
      'users.view', 'users.create', 'users.edit',
      'offices.view', 'offices.edit',
      'document_types.view', 'document_types.create', 'document_types.edit',
      'audit.view',
      'notifications.view',
    ],
  },
  DOCUMENT_ENCODER: {
    name: 'Document Encoder',
    description: 'Encodes and registers incoming/outgoing documents into the system.',
    permissions: [
      'dashboard.view',
      'documents.view', 'documents.create', 'documents.register', 'documents.track',
      'notifications.view',
    ],
  },
  DOCUMENT_OFFICER: {
    name: 'Document Officer',
    description:
      'Receives, verifies, and reviews documents. Adds actions/comments/remarks and makes recommendations.',
    permissions: [
      'dashboard.view',
      'documents.view', 'documents.receive', 'documents.route',
      'documents.review', 'documents.recommend',
      'documents.approve', 'documents.reject', 'documents.return', 'documents.release',
      'documents.track', 'documents.archive',
      'notifications.view',
    ],
  },
};

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  toRoleId(value: string): Role {
    const normalized = value.toLowerCase();
    const match = (Object.keys(ROLE_DEFINITIONS) as Role[]).find(
      r => r.toLowerCase() === normalized,
    );
    if (!match) {
      throw new NotFoundException(`Unknown role: ${value}`);
    }
    return match;
  }

  async findAll(): Promise<RoleSummary[]> {
    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });
    const countByRole = new Map(counts.map(c => [c.role, c._count._all]));

    return (Object.keys(ROLE_DEFINITIONS) as Role[]).map(role => ({
      id: role.toLowerCase(),
      name: ROLE_DEFINITIONS[role].name,
      description: ROLE_DEFINITIONS[role].description,
      userCount: countByRole.get(role) ?? 0,
    }));
  }

  async findOne(id: string): Promise<RoleDefinition> {
    const role = this.toRoleId(id);
    const summary = ROLE_DEFINITIONS[role];
    const userCount = await this.prisma.user.count({ where: { role } });
    return {
      id: role.toLowerCase(),
      name: summary.name,
      description: summary.description,
      permissions: summary.permissions,
      userCount,
    };
  }

  async getRoleUsers(roleId: string): Promise<RoleUser[]> {
    const role = this.toRoleId(roleId);
    const rows = await this.prisma.user.findMany({
      where: { role },
      include: {
        employee: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            position: true,
            office: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(u => {
      const composed = [u.employee?.firstName, u.employee?.middleName, u.employee?.lastName]
        .filter(Boolean)
        .join(' ');
      const fullName = composed || u.username || u.email || u.id;
      return {
        id: u.id,
        fullName,
        email: u.email ?? '',
        username: u.username ?? u.email ?? '',
        role: u.role.toLowerCase(),
        status: u.status.toLowerCase(),
        officeName: u.employee?.office?.name ?? null,
        position: u.employee?.position ?? null,
        createdAt: u.createdAt.toISOString(),
      };
    });
  }
}