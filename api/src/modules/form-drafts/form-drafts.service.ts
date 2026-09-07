import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'temporaryPassword',
  'token',
  'refreshToken',
]);

export interface FormDraftDto {
  id: string;
  formKey: string;
  payload: Record<string, unknown>;
  status: 'DRAFT' | 'SUBMITTED';
  createdAt: string;
  updatedAt: string;
}

function sanitizePayload(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    clone[k] = v;
  }
  return clone;
}

function toDto(row: {
  id: string;
  formKey: string;
  payload: Prisma.JsonValue;
  status: 'DRAFT' | 'SUBMITTED';
  createdAt: Date;
  updatedAt: Date;
}): FormDraftDto {
  return {
    id: row.id,
    formKey: row.formKey,
    payload:
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class FormDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDraft(userId: string, formKey: string): Promise<FormDraftDto | null> {
    const row = await this.prisma.formDraft.findUnique({
      where: { userId_formKey: { userId, formKey } },
    });
    if (!row) return null;
    return toDto(row);
  }

  async upsertDraft(
    userId: string,
    formKey: string,
    rawPayload: Record<string, unknown> | undefined,
  ): Promise<FormDraftDto> {
    const payload = sanitizePayload(rawPayload ?? {});

    const existing = await this.prisma.formDraft.findUnique({
      where: { userId_formKey: { userId, formKey } },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status !== 'DRAFT') {
        // SUBMITTED drafts are immutable — recreate as DRAFT so the user can start over.
        const recreated = await this.prisma.formDraft.create({
          data: {
            userId,
            formKey,
            payload: payload as Prisma.InputJsonValue,
            status: 'DRAFT',
          },
        });
        return toDto(recreated);
      }
      const updated = await this.prisma.formDraft.update({
        where: { id: existing.id },
        data: { payload: payload as Prisma.InputJsonValue },
      });
      return toDto(updated);
    }

    const created = await this.prisma.formDraft.create({
      data: {
        userId,
        formKey,
        payload: payload as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });
    return toDto(created);
  }

  async clearDraft(userId: string, formKey: string): Promise<void> {
    const existing = await this.prisma.formDraft.findUnique({
      where: { userId_formKey: { userId, formKey } },
      select: { id: true, status: true },
    });
    if (!existing) {
      // Idempotent: treat missing as already cleared.
      return;
    }
    if (existing.status !== 'DRAFT') {
      // Never delete a SUBMITTED draft — only DRAFT (and the implicit empty state) can be removed.
      throw new NotFoundException('No draft to clear');
    }
    await this.prisma.formDraft.delete({ where: { id: existing.id } });
  }
}
