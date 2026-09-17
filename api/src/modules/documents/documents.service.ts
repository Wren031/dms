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
import { ReceiveDocumentDto } from './dto/receive-document.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  // 'received' is NOT a manual transition: documents become received only
  // when every designated recipient office has received (per-office action).
  registered: [],
  received: ['approved', 'rejected'],
  approved: ['released'],
  rejected: ['archived'],
  released: ['archived'],
  archived: [],
};

// Which roles may perform each status transition (SYSTEM_ADMIN is superuser).
const TRANSITION_ROLES: Record<DocumentStatus, Role[]> = {
  registered: [Role.SYSTEM_ADMIN, Role.DOCUMENT_ENCODER],
  received: [Role.SYSTEM_ADMIN, Role.DOCUMENT_OFFICER],
  approved: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  rejected: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  released: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
  archived: [Role.SYSTEM_ADMIN, Role.OFFICE_ADMIN],
};

// Persisted permission required for each target status. If a role's granted
// permissions were revoked, the transition is rejected with 403.
const TRANSITION_PERMISSIONS: Record<DocumentStatus, string> = {
  registered: 'documents.register',
  received: 'documents.receive',
  approved: 'documents.approve',
  rejected: 'documents.reject',
  released: 'documents.release',
  archived: 'documents.archive',
};

export type DocumentTypeMeta = Prisma.DocumentTypeGetPayload<Record<string, never>>;

export type DocumentListItem = Prisma.DocumentGetPayload<{
  include: {
    type: true;
    recipients: { include: { office: { select: { id: true; name: true; code: true } } } };
    _count: { select: { reviews: true; releases: true; archives: true } };
  };
}>;

export type DocumentDetail = Prisma.DocumentGetPayload<{
  include: {
    type: true;
    attachments: true;
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
  approvedBy: DocumentPerson | null;
  releasedBy: DocumentPerson | null;
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

    // Materialize the recipient offices: "All Offices" creates a receiving
    // record for every active office so each office tracks its own status.
    const effectiveRecipientOfficeIds = await this.resolveRecipientOfficeIds(
      destinationsAllOffices,
      recipientOfficeIds,
    );

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
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            recipients: effectiveRecipientOfficeIds.length
              ? { create: effectiveRecipientOfficeIds.map((officeId) => ({ officeId })) }
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
              recipientOfficeIds: effectiveRecipientOfficeIds,
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

  /**
   * Resolve the offices a document is destined for. When sent to all offices,
   * materialize one receiving record per ACTIVE office so each office tracks
   * its own receiving status independently.
   */
  private async resolveRecipientOfficeIds(
    destinationsAllOffices: boolean,
    recipientOfficeIds: string[],
  ): Promise<string[]> {
    if (destinationsAllOffices) {
      const offices = await this.prisma.office.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return offices.map((office) => office.id);
    }
    return recipientOfficeIds;
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
      recipientOfficeId,
      recipientStatus,
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
    if (recipientOfficeId) {
      where.recipients = {
        some: {
          officeId: recipientOfficeId,
          ...(recipientStatus ? { status: recipientStatus } : {}),
        },
      };
    }
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
          _count: { select: { reviews: true, releases: true, archives: true } },
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
        reviews: { orderBy: { createdAt: 'desc' } },
        releases: { orderBy: { releasedAt: 'desc' } },
        archives: { orderBy: { archivedAt: 'desc' } },
        history: { orderBy: { occurredAt: 'asc' } },
        recipients: { include: { office: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const ids = Array.from(new Set([doc.encodedById, doc.receivedById, doc.approvedById, doc.releasedById, doc.currentHolderId].filter((value): value is string => !!value)));
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
      approvedBy: doc.approvedById ? people.get(doc.approvedById) ?? null : null,
      releasedBy: doc.releasedById ? people.get(doc.releasedById) ?? null : null,
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
   * OFFICE_ADMIN may only act on documents their own office may act on:
   * the document is currently held by their office, OR their office has
   * already received the document (per-office receiving). SYSTEM_ADMIN is a
   * superuser and bypasses this check.
   */
  private async assertOfficeOwnership(
    actorId: string,
    doc: { id: string; currentOfficeId: string | null },
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, employee: { select: { officeId: true } } },
    });
    if (!actor) throw new NotFoundException('Actor not found');
    if (actor.role === Role.OFFICE_ADMIN) {
      const officeId = actor.employee?.officeId;
      if (!officeId) {
        throw new ForbiddenException(
          'You can only manage documents assigned to your own office',
        );
      }
      if (doc.currentOfficeId === officeId) return;
      const received = await this.prisma.documentRecipient.count({
        where: { documentId: doc.id, officeId, status: 'received' },
      });
      if (received === 0) {
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

    const finalAllOffices =
      destinationsAllOffices !== undefined
        ? destinationsAllOffices
        : recipientOfficeIds !== undefined && recipientOfficeIds.length === 0;

    const nextRecipientIds =
      recipientOfficeIds !== undefined || destinationsAllOffices !== undefined
        ? await this.resolveRecipientOfficeIds(finalAllOffices, recipientOfficeIds ?? [])
        : null;

    return this.prisma.$transaction(async (tx) => {
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

      if (nextRecipientIds !== null) {
        // Replace the recipient set with the resolved (materialized) list.
        await tx.documentRecipient.deleteMany({ where: { documentId: id } });
        if (nextRecipientIds.length > 0) {
          await tx.documentRecipient.createMany({
            data: nextRecipientIds.map((officeId) => ({ documentId: id, officeId })),
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

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.document.update({
        where: { id },
        data: {
          status: dto.toStatus,
          currentOfficeId: dto.currentOfficeId ?? doc.currentOfficeId,
          currentHolderId: dto.currentHolderId ?? doc.currentHolderId,
          ...(dto.toStatus === 'approved'
            ? { approvedById: actorId, approvedAt: now, approvedRemarks: dto.remarks }
            : {}),
          ...(dto.toStatus === 'released'
            ? { releasedById: actorId, releasedAt: now, releasedRemarks: dto.remarks }
            : {}),
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

      // Record approval / rejection / release actions for audit parity.
      if (dto.toStatus === 'approved' || dto.toStatus === 'rejected') {
        await tx.documentReview.create({
          data: {
            documentId: id,
            reviewerId: actorId,
            action: dto.toStatus,
            remarks: dto.remarks,
          },
        });
      }
      if (dto.toStatus === 'released') {
        await tx.documentRelease.create({
          data: {
            documentId: id,
            releasedById: actorId,
            method: 'hand_delivery',
            notes: dto.remarks,
          },
        });
      }

      return updated;
    }).then(async (updated) => {
      // Notifications (outside the transaction; never blocks the workflow)
      const title = `${doc.trackingNumber} · ${doc.title}`;
      switch (dto.toStatus) {
        case 'approved':
          this.notify(doc.encodedById, 'Document approved', `${title} was approved.`);
          break;
        case 'rejected':
          this.notify(doc.encodedById, 'Document rejected', dto.remarks ? `${title} was rejected: ${dto.remarks}` : `${title} was rejected.`);
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

  /**
   * Per-office receiving action. Only a user belonging to a designated
   * recipient office may receive the document for that office. Each office's
   * receiving status is tracked independently; the document itself is
   * auto-advanced to 'received' once every designated office has received it.
   */
  async receive(id: string, actorId: string, dto: ReceiveDocumentDto): Promise<unknown> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, employee: { select: { officeId: true } } },
    });
    if (!actor) throw new NotFoundException('Actor not found');

    const permittedRoles: Role[] = [Role.SYSTEM_ADMIN, Role.DOCUMENT_OFFICER];
    if (!permittedRoles.includes(actor.role)) {
      throw new ForbiddenException(
        'Your role is not permitted to receive documents',
      );
    }

    // Enforce the persisted permission (SYSTEM_ADMIN bypasses, matching the
    // superuser convention used across the module).
    if (actor.role !== Role.SYSTEM_ADMIN) {
      const granted = await this.prisma.rolePermission.count({
        where: { role: actor.role, permission: 'documents.receive' },
      });
      if (granted === 0) {
        throw new ForbiddenException(
          'Your role does not have permission to receive documents',
        );
      }
    }

    if (doc.encodedById === actorId) {
      throw new ForbiddenException(
        'The registrar cannot receive a document they registered. Another authorized user must receive it.',
      );
    }

    const officeId = actor.employee?.officeId;
    if (!officeId) {
      throw new BadRequestException('Authenticated user has no assigned office');
    }

    if (['released', 'archived', 'rejected'].includes(doc.status)) {
      throw new BadRequestException(
        'Cannot receive a document that has already been finalized',
      );
    }

    const recipient = await this.prisma.documentRecipient.findUnique({
      where: { documentId_officeId: { documentId: id, officeId } },
    });
    if (!recipient) {
      throw new ForbiddenException(
        'Your office is not a designated recipient of this document',
      );
    }
    if (recipient.status === 'received') {
      throw new BadRequestException(
        'Your office has already received this document',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.documentRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'received',
          receivedById: actorId,
          receivedAt: now,
          remarks: dto.remarks?.trim() ? dto.remarks.trim() : null,
        },
        include: { office: { select: { id: true, name: true, code: true } } },
      });

      await tx.documentTracking.create({
        data: {
          documentId: id,
          actorId,
          event: 'recipient.received',
          payload: {
            officeId,
            remarks: dto.remarks ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      // Auto-advance the document once at least one recipient office has
      // received it. Per-recipient receiving continues independently after
      // this point — other offices can still mark themselves as received.
      let advanced = false;
      if (doc.status === 'registered') {
        await tx.document.update({
          where: { id },
          data: { status: 'received', receivedById: actorId, dateReceived: now },
        });
        await tx.documentHistory.create({
          data: {
            documentId: id,
            fromStatus: 'registered',
            toStatus: 'received',
            actorId,
            remarks: 'Document received by at least one recipient office',
          },
        });
        await tx.documentTracking.create({
          data: {
            documentId: id,
            actorId,
            event: 'status.transition',
            payload: {
              from: 'registered',
              to: 'received',
              automatic: true,
            } as Prisma.InputJsonValue,
          },
        });
        advanced = true;
      }

      return { recipient: updated, advanced, officeName: updated.office.name };
    });

    // Notifications (outside the transaction; never blocks the workflow).
    const title = `${doc.trackingNumber} · ${doc.title}`;
    this.notify(
      doc.encodedById,
      'Document received',
      result.advanced
        ? `${title} was received by ${result.officeName}. Approval and release can now proceed.`
        : `${title} was received by ${result.officeName}.`,
    );

    return {
      recipient: result.recipient,
      documentStatus: result.advanced ? 'received' : doc.status,
    };
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
