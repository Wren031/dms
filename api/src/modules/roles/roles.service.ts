import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

// Single source of truth for the permission catalog plus the default
// permissions for each role. The DB stores the *effective* permission list
// per role; when a role has no rows yet it falls back to these defaults.
export const PERMISSION_CATALOG: string[] = [
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
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  SYSTEM_ADMIN: PERMISSION_CATALOG.slice(),
  OFFICE_ADMIN: [
    'dashboard.view',
    'documents.view', 'documents.edit', 'documents.route',
    'documents.approve', 'documents.reject', 'documents.return',
    'documents.release', 'documents.archive', 'documents.track',
    'users.view', 'users.create', 'users.edit',
    'offices.view', 'offices.edit',
    'document_types.view', 'document_types.create', 'document_types.edit',
    'audit.view',
    'notifications.view',
  ],
  DOCUMENT_ENCODER: [
    'dashboard.view',
    'documents.view', 'documents.create', 'documents.edit', 'documents.register', 'documents.track',
    'notifications.view',
  ],
  DOCUMENT_OFFICER: [
    'dashboard.view',
    'documents.view', 'documents.receive', 'documents.review', 'documents.recommend',
    'documents.track',
    'notifications.view',
  ],
};

const ROLE_DEFINITIONS: Record<Role, { name: string; description: string }> = {
  SYSTEM_ADMIN: {
    name: 'System Administrator',
    description: 'Full system access. Manages users, offices, roles, and system configuration.',
  },
  OFFICE_ADMIN: {
    name: 'Office Administrator',
    description:
      'Manages documents and users within their authorized office, including document assignments and routing.',
  },
  DOCUMENT_ENCODER: {
    name: 'Document Encoder',
    description:
      'Registers documents, uploads attachments, and maintains document metadata.',
  },
  DOCUMENT_OFFICER: {
    name: 'Document Officer',
    description:
      'Receives incoming documents, acknowledges receipt, reviews documents, adds actions/comments/remarks, and makes recommendations.',
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

  /**
   * Returns the effective permission set for a role, seeding from the
   * current defaults when no persisted rows exist yet.
   */
  async effectivePermissions(roleId: string): Promise<string[]> {
    const role = this.toRoleId(roleId);
    const rows = await this.prisma.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    });
    if (rows.length > 0) {
      return rows.map(r => r.permission);
    }
    await this.prisma.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS[role].map(permission => ({
        role,
        permission,
      })),
      skipDuplicates: true,
    });
    return DEFAULT_ROLE_PERMISSIONS[role].slice();
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
      permissions: await this.effectivePermissions(id),
      userCount,
    };
  }

  /**
   * Replaces the full effective permission list for a role. Returns the
   * updated effective list.
   */
  async setPermissions(id: string, permissions: string[]): Promise<string[]> {
    const role = this.toRoleId(id);

    // Normalize and validate every permission against the catalog.
    const normalized = Array.from(new Set(permissions));
    const invalid = normalized.filter(p => !PERMISSION_CATALOG.includes(p));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown permissions: ${invalid.join(', ')}`);
    }

    // Never allow removing roles.edit from the last remaining editor model,
    // but in practice the SYSTEM_ADMIN role should stay fully privileged.
    // Guard against locking out all permission management.
    if (role === Role.SYSTEM_ADMIN && !normalized.includes('roles.edit')) {
      throw new ForbiddenException(
        'Cannot remove roles.edit from the System Administrator role.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { role } }),
      this.prisma.rolePermission.createMany({
        data: normalized.map(permission => ({ role, permission })),
        skipDuplicates: true,
      }),
    ]);

    return normalized;
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
