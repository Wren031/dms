import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentsDto } from './dto/filter-documents.dto';
import { TransitionDocumentDto } from './dto/transition-document.dto';
import { AssignDocumentHolderDto } from './dto/assign-document-holder.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  registered: ['received', 'routed'],
  received: ['routed'],
  routed: ['assigned'],
  assigned: ['received', 'under_review'],
  under_review: ['recommended', 'returned'],
  recommended: ['approved', 'rejected'],
  approved: ['released'],
  rejected: ['archived'],
  returned: ['under_review'],
  released: ['archived'],
  archived: [],
};

// Which roles may perform each status transition (SYSTEM_ADMIN is superuser).
const TRANSITION_ROLES: Record<DocumentStatus, Role[]> = {
  registered: [Role.SYSTEM_ADMIN, Role.DOCUMENT_ENCODER],
  received: [Role.SYSTEM_ADMIN, Role.DOCUMENT_OFFICER],
  routed: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  assigned: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  under_review: [Role.SYSTEM_ADMIN, Role.DOCUMENT_OFFICER],
  recommended: [Role.SYSTEM_ADMIN, Role.DOCUMENT_OFFICER],
  approved: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  rejected: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  returned: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  released: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  archived: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
};

// Persisted permission required for each target status. If a role's granted
// permissions were revoked, the transition is rejected with 403.
const TRANSITION_PERMISSIONS: Record<DocumentStatus, string> = {
  registered: 'documents.register',
  received: 'documents.receive',
  routed: 'documents.route',
  assigned: 'documents.route',
  under_review: 'documents.review',
  recommended: 'documents.recommend',
  approved: 'documents.approve',
  rejected: 'documents.reject',
  returned: 'documents.return',
  released: 'documents.release',
  archived: 'documents.archive',
};

export type DocumentTypeMeta = Prisma.DocumentTypeGetPayload<Record<string, never>>;

export type DocumentListItem = Prisma.DocumentGetPayload<{
  include: {
    type: true;
    recipients: { include: { office: { select: { id: true; name: true; code: true } } } };
    _count: { select: { routingSteps: true; reviews: true; releases: true; archives: true } };
  };
}>;

export type DocumentDetail = Prisma.DocumentGetPayload<{
  include: {
    type: true;
    attachments: true;
    routingSteps: true;
    reviews: true;
    releases: true;
    archives: true;
    history: true;
    recipients: { include: { office: { select: { id: true; name: true; code: true } } } };
  };
}>;

export interface DocumentPerson {
  id: string;
  fullName: string;
  email: string | null;
  position: string | null;
  officeId: string | null;
}

export interface DocumentDetailResponse extends DocumentDetail {
  encodedBy: DocumentPerson | null;
  receivedBy: DocumentPerson | null;
  currentHolder: DocumentPerson | null;
}

export type DocumentHistoryEntry = Prisma.DocumentHistoryGetPayload<Record<string, never>>;

export type DocumentTimelineEntry = Prisma.DocumentTrackingGetPayload<Record<string, never>>;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Fire-and-forget notification. Never blocks or fails the workflow.
   */
  private notify(
    userId: string | null | undefined,
    title: string,
    message: string,
  ): void {
    if (!userId) return;
    void this.notifications
      .create({
        userId,
        type: 'document',
        title,
        message,
        link: 'documents',
      })
      .catch(() => undefined);
  }

  async create(dto: CreateDocumentDto, encodedById: string): Promise<unknown> {
    const encoder = await this.prisma.user.findUnique({
      where: { id: encodedById },
      include: { employee: { select: { officeId: true } } },
    });
    const authenticatedOfficeId = encoder?.employee?.officeId;
    if (!authenticatedOfficeId) {
      throw new BadRequestException('Authenticated user has no assigned office');
    }
    const trackingNumber = await this.generateTrackingNumber();

    const useManualOrigin = !dto.originatingOfficeId;
    const documentNumber =
      dto.documentNumber?.trim() ||
      (useManualOrigin
        ? await this.generateManualDocumentNumber()
        : await this.suggestDocumentNumber(dto.originatingOfficeId!));

    const destinationsAllOffices = dto.destinationsAllOffices ?? true;
    const recipientOfficeIds = (dto.recipientOfficeIds ?? []).filter((id) => !!id);

    // Validation: cannot target both "all offices" and specific offices.
    if (destinationsAllOffices && recipientOfficeIds.length > 0) {
      throw new BadRequestException(
        'Cannot specify recipient offices when the document is sent to all offices.',
      );
    }

    // Manual origin requires a text name.
    if (useManualOrigin && !dto.originatingOfficeName?.trim()) {
      throw new BadRequestException(
        'A manual originating office name is required when no office is selected.',
      );
    }

    if (recipientOfficeIds.length > 0) {
      const offices = await this.prisma.office.findMany({
        where: { id: { in: recipientOfficeIds } },
        select: { id: true },
      });
      if (offices.length !== recipientOfficeIds.length) {
        throw new BadRequestException('One or more recipient offices do not exist.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      try {
        const doc = await tx.document.create({
          data: {
            trackingNumber,
            documentNumber,
            title: dto.title,
            description: dto.description,
            typeId: dto.typeId,
            classification: dto.classification,
            priority: dto.priority ?? 'normal',
            source: dto.source,
            senderName: dto.senderName,
            tags: dto.tags ?? [],
            originatingOfficeId: dto.originatingOfficeId ?? null,
            originatingOfficeName: useManualOrigin ? dto.originatingOfficeName?.trim() : null,
            currentOfficeId: authenticatedOfficeId,
            currentHolderId: dto.currentHolderId ?? null,
            destinationsAllOffices,
            encodedById,
            receivedById: dto.receivedById,
            dateReceived: dto.dateReceived ? new Date(dto.dateReceived) : null,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            recipients: recipientOfficeIds.length
              ? { create: recipientOfficeIds.map((officeId) => ({ officeId })) }
              : undefined,
          },
        });
        await tx.documentHistory.create({
          data: {
            documentId: doc.id,
            fromStatus: null,
            toStatus: 'registered',
            actorId: encodedById,
            remarks: 'Document registered',
          },
        });
        await tx.documentTracking.create({
          data: {
            documentId: doc.id,
            actorId: encodedById,
            event: 'document.registered',
            payload: {
              trackingNumber,
              documentNumber,
              classification: dto.classification,
              destinationsAllOffices,
              recipientOfficeIds,
            } as Prisma.InputJsonValue,
          },
        });
        return doc;
      } catch (err: unknown) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException(
            useManualOrigin
              ? `Document number '${documentNumber}' is already used.`
              : `Document number '${documentNumber}' is already used in this originating office.`,
          );
        }
        throw err;
      }
    });
  }

  async findAll(filter: FilterDocumentsDto): Promise<PaginatedResult<DocumentListItem>> {
    const {
      page,
      pageSize,
      search,
      status,
      statuses,
      typeId,
      classification,
      priority,
      source,
      originatingOfficeId,
      currentOfficeId,
      currentHolderId,
      encodedById,
      receivedById,
      dateFrom,
      dateTo,
      sortBy,
      order,
    } = filter;

    const where: Prisma.DocumentWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }
    if (status) where.status = status;
    if (statuses && statuses.length) where.status = { in: statuses };
    if (typeId) where.typeId = typeId;
    if (classification) where.classification = classification;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (originatingOfficeId) where.originatingOfficeId = originatingOfficeId;
    if (currentOfficeId) where.currentOfficeId = currentOfficeId;
    if (currentHolderId) where.currentHolderId = currentHolderId;
    if (encodedById) where.encodedById = encodedById;
    if (receivedById) where.receivedById = receivedById;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: {
          type: true,
          recipients: { include: { office: { select: { id: true, name: true, code: true } } } },
          _count: { select: { routingSteps: true, reviews: true, releases: true, archives: true } },
        },
        orderBy: { [sortBy ?? 'createdAt']: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<DocumentDetailResponse> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        type: true,
        attachments: true,
        routingSteps: { orderBy: { sequence: 'asc' } },
        reviews: { orderBy: { createdAt: 'desc' } },
        releases: { orderBy: { releasedAt: 'desc' } },
        archives: { orderBy: { archivedAt: 'desc' } },
        history: { orderBy: { occurredAt: 'asc' } },
        recipients: { include: { office: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const ids = Array.from(new Set([doc.encodedById, doc.receivedById, doc.currentHolderId].filter((value): value is string => !!value)));
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          include: {
            employee: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                position: true,
                officeId: true,
              },
            },
          },
        })
      : [];
    const people = new Map(users.map(user => [user.id, this.toDocumentPerson(user)]));
    return {
      ...doc,
      encodedBy: people.get(doc.encodedById) ?? null,
      receivedBy: doc.receivedById ? people.get(doc.receivedById) ?? null : null,
      currentHolder: doc.currentHolderId ? people.get(doc.currentHolderId) ?? null : null,
    };
  }

  private toDocumentPerson(user: Prisma.UserGetPayload<{
    include: { employee: { select: { firstName: true; middleName: true; lastName: true; position: true; officeId: true } } };
  }>): DocumentPerson {
    return {
      id: user.id,
      fullName: [user.employee?.firstName, user.employee?.middleName, user.employee?.lastName]
        .filter(Boolean)
        .join(' ') || user.username || user.email || user.id,
      email: user.email,
      position: user.employee?.position ?? null,
      officeId: user.employee?.officeId ?? null,
    };
  }

  /**
   * OFFICE_ADMIN may only act on documents currently held by their own office.
   * SYSTEM_ADMIN is a superuser and bypasses this check.
   */
  private async assertOfficeOwnership(actorId: string, doc: { currentOfficeId: string | null }): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, employee: { select: { officeId: true } } },
    });
    if (!actor) throw new NotFoundException('Actor not found');
    if (actor.role === Role.OFFICE_ADMIN) {
      const officeId = actor.employee?.officeId;
      if (!officeId || doc.currentOfficeId !== officeId) {
        throw new ForbiddenException(
          'You can only manage documents assigned to your own office',
        );
      }
    }
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<unknown> {
    const { recipientOfficeIds, destinationsAllOffices, ...rest } = dto;

    if (
      destinationsAllOffices !== undefined &&
      recipientOfficeIds !== undefined &&
      destinationsAllOffices &&
      recipientOfficeIds.length > 0
    ) {
      throw new BadRequestException(
        'Cannot specify recipient offices when the document is sent to all offices.',
      );
    }

    if (recipientOfficeIds !== undefined && recipientOfficeIds.length > 0) {
      const offices = await this.prisma.office.findMany({
        where: { id: { in: recipientOfficeIds } },
        select: { id: true },
      });
      if (offices.length !== recipientOfficeIds.length) {
        throw new BadRequestException('One or more recipient offices do not exist.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const finalAllOffices =
        destinationsAllOffices !== undefined
          ? destinationsAllOffices
          : recipientOfficeIds !== undefined && recipientOfficeIds.length === 0;

      const doc = await tx.document.update({
        where: { id },
        data: {
          ...rest,
          ...(recipientOfficeIds !== undefined || destinationsAllOffices !== undefined
            ? { destinationsAllOffices: finalAllOffices }
            : {}),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });

      if (recipientOfficeIds !== undefined || destinationsAllOffices !== undefined) {
        // Replace the recipient set with the provided list (or clear when all-offices).
        const ids = finalAllOffices ? [] : (recipientOfficeIds ?? []);
        await tx.documentRecipient.deleteMany({ where: { documentId: id } });
        if (ids.length > 0) {
          await tx.documentRecipient.createMany({
            data: ids.map((officeId) => ({ documentId: id, officeId })),
          });
        }
      }

      return doc;
    }).then(() => this.findOne(id));
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.prisma.document.delete({ where: { id } });
    return { id };
  }

  async transition(
    id: string,
    dto: TransitionDocumentDto,
    actorId: string,
  ): Promise<unknown> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const allowed = ALLOWED_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(dto.toStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${doc.status} to ${dto.toStatus}`,
      );
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, employee: { select: { officeId: true } } },
    });
    const permittedRoles = TRANSITION_ROLES[dto.toStatus] ?? [];
    if (!actor || !permittedRoles.includes(actor.role)) {
      throw new ForbiddenException(
        `Your role is not permitted to move documents to ${dto.toStatus}`,
      );
    }

    // Enforce the persisted permission for the target status (SYSTEM_ADMIN
    // bypasses, matching the superuser convention used across the module).
    const requiredPermission = TRANSITION_PERMISSIONS[dto.toStatus];
    if (requiredPermission && actor.role !== Role.SYSTEM_ADMIN) {
      const granted = await this.prisma.rolePermission.count({
        where: { role: actor.role, permission: requiredPermission },
      });
      if (granted === 0) {
        throw new ForbiddenException(
          `Your role does not have permission to move documents to ${dto.toStatus}`,
        );
      }
    }

    await this.assertOfficeOwnership(actorId, doc);

    // Receiving a document brings it into the receiver's own office.
    const effectiveCurrentOfficeId =
      dto.currentOfficeId ??
      (dto.toStatus === 'received' ? actor.employee?.officeId ?? undefined : undefined);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: {
          status: dto.toStatus,
          currentOfficeId: effectiveCurrentOfficeId ?? doc.currentOfficeId,
          currentHolderId: dto.currentHolderId ?? doc.currentHolderId,
        },
      });
      await tx.documentHistory.create({
        data: {
          documentId: id,
          fromStatus: doc.status,
          toStatus: dto.toStatus,
          actorId,
          remarks: dto.remarks,
        },
      });
      await tx.documentTracking.create({
        data: {
          documentId: id,
          actorId,
          event: 'status.transition',
          payload: { from: doc.status, to: dto.toStatus, remarks: dto.remarks ?? null } as Prisma.InputJsonValue,
        },
      });

      // Record a routing step whenever a document moves between offices so
      // routing history / progress views have real data.
      if (
        effectiveCurrentOfficeId &&
        doc.currentOfficeId &&
        effectiveCurrentOfficeId !== doc.currentOfficeId
      ) {
        const last = await tx.documentRoutingStep.findFirst({
          where: { documentId: id },
          orderBy: { sequence: 'desc' },
          select: { sequence: true },
        });
        await tx.documentRoutingStep.create({
          data: {
            documentId: id,
            sequence: (last?.sequence ?? 0) + 1,
            fromOfficeId: doc.currentOfficeId,
            toOfficeId: effectiveCurrentOfficeId,
            toUserId: dto.currentHolderId ?? null,
            instructions: dto.remarks ?? null,
            status: 'in_progress',
          },
        });
        // The previous in-transit step has arrived at its destination.
        await tx.documentRoutingStep.updateMany({
          where: { documentId: id, status: 'in_progress', toOfficeId: doc.currentOfficeId },
          data: { status: 'completed', completedAt: new Date() },
        });
      }

      return updated;
    }).then(async (updated) => {
      // Notifications (outside the transaction; never blocks the workflow)
      const link = 'documents';
      const title = `${doc.trackingNumber} · ${doc.title}`;
      switch (dto.toStatus) {
        case 'received':
          this.notify(doc.encodedById, 'Document received', `${title} was received by the office.`, );
          break;
        case 'routed':
        case 'assigned':
          this.notify(
            dto.currentHolderId ?? updated.currentHolderId,
            'Document assigned to you',
            `${title} requires your attention.`,
          );
          this.notify(doc.encodedById, 'Document routed', `${title} was routed for action.`);
          break;
        case 'under_review':
        case 'recommended':
          this.notify(doc.encodedById, `Document ${dto.toStatus.replace('_', ' ')}`, `${title} is progressing through review.`);
          break;
        case 'approved':
          this.notify(doc.encodedById, 'Document approved', `${title} was approved.`);
          if (updated.currentHolderId && updated.currentHolderId !== doc.encodedById) {
            this.notify(updated.currentHolderId, 'Document approved', `${title} was approved.`);
          }
          break;
        case 'rejected':
          this.notify(doc.encodedById, 'Document rejected', dto.remarks ? `${title} was rejected: ${dto.remarks}` : `${title} was rejected.`);
          break;
        case 'returned':
          this.notify(
            dto.currentHolderId ?? updated.currentHolderId,
            'Document returned',
            dto.remarks ? `${title} was returned: ${dto.remarks}` : `${title} was returned for further action.`,
          );
          break;
        case 'released':
          this.notify(doc.encodedById, 'Document released', `${title} was released.`);
          break;
        default:
          break;
      }
      return updated;
    });
  }

  async assignHolder(
    id: string,
    dto: AssignDocumentHolderDto,
    actorId: string,
  ): Promise<unknown> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.assertOfficeOwnership(actorId, doc);

    // Assigning a holder moves a routed document into the assigned state.
    const toStatus = doc.status === 'routed' ? 'assigned' : doc.status;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: {
          currentHolderId: dto.holderId,
          currentOfficeId: dto.officeId ?? undefined,
          status: toStatus,
        },
      });
      if (toStatus !== doc.status) {
        await tx.documentHistory.create({
          data: {
            documentId: id,
            fromStatus: doc.status,
            toStatus,
            actorId,
            remarks: dto.notes ?? 'Document assigned to holder',
          },
        });
        await tx.documentTracking.create({
          data: {
            documentId: id,
            actorId,
            event: 'status.transition',
            payload: { from: doc.status, to: toStatus, remarks: dto.notes ?? null } as Prisma.InputJsonValue,
          },
        });
      }
      await tx.documentTracking.create({
        data: {
          documentId: id,
          actorId,
          event: 'holder.assigned',
          payload: { holderId: dto.holderId, officeId: dto.officeId ?? null, notes: dto.notes ?? null } as Prisma.InputJsonValue,
        },
      });
      // Mark the routing step that delivered the document to this office as completed.
      if (doc.currentOfficeId) {
        await tx.documentRoutingStep.updateMany({
          where: { documentId: id, status: 'in_progress', toOfficeId: doc.currentOfficeId },
          data: { status: 'completed', completedAt: new Date() },
        });
      }
      return updated;
    }).then(async (updated) => {
      this.notify(
        dto.holderId,
        'Document assigned to you',
        `${doc.trackingNumber} · ${doc.title} requires your attention.`,
      );
      return updated;
    });
  }

  async getHistory(id: string): Promise<DocumentHistoryEntry[]> {
    return this.prisma.documentHistory.findMany({
      where: { documentId: id },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async getTimeline(id: string): Promise<DocumentTimelineEntry[]> {
    return this.prisma.documentTracking.findMany({
      where: { documentId: id },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async suggestDocumentNumber(officeId: string): Promise<string> {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) {
      throw new NotFoundException(`Office ${officeId} not found`);
    }
    const year = new Date().getFullYear();
    const prefix = `${office.code}-${year}-`;
    const last = await this.prisma.document.findFirst({
      where: {
        originatingOfficeId: officeId,
        documentNumber: { startsWith: prefix },
      },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });
    let nextSeq = 1;
    if (last?.documentNumber) {
      const tail = last.documentNumber.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) nextSeq = n + 1;
    }
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  async getDocumentNumberSuggestion(officeId: string): Promise<{ suggestion: string }> {
    const suggestion = await this.suggestDocumentNumber(officeId);
    return { suggestion };
  }

  private async generateTrackingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DMS-${year}-`;
    const last = await this.prisma.document.findFirst({
      where: { trackingNumber: { startsWith: prefix } },
      orderBy: { trackingNumber: 'desc' },
      select: { trackingNumber: true },
    });
    let nextSeq = 1;
    if (last?.trackingNumber) {
      const tail = last.trackingNumber.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) nextSeq = n + 1;
    }
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Generate a globally unique document number for manual-origin documents
   * (no originating office selected). Uses a dedicated prefix so it never
   * collides with office-prefixed numbers.
   */
  private async generateManualDocumentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MAN-${year}-`;
    const last = await this.prisma.document.findFirst({
      where: { documentNumber: { startsWith: prefix } },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });
    let nextSeq = 1;
    if (last?.documentNumber) {
      const tail = last.documentNumber.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) nextSeq = n + 1;
    }
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }
}
