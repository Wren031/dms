import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoutingPlanDto } from './dto/create-routing-plan.dto';
import { UpdateRoutingStepDto, AdvanceRoutingStepDto } from './dto/update-routing-step.dto';
import { FilterRoutingStepsDto } from './dto/filter-routing-steps.dto';

@Injectable()
export class DocumentRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * OFFICE_ADMIN may only route documents currently held by their own office.
   * SYSTEM_ADMIN is a superuser and bypasses this check.
   */
  private async assertOfficeOwnership(actorId: string, documentId: string): Promise<void> {
    const [actor, doc] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actorId },
        select: { role: true, employee: { select: { officeId: true } } },
      }),
      this.prisma.document.findUnique({
        where: { id: documentId },
        select: { currentOfficeId: true },
      }),
    ]);
    if (!actor) throw new NotFoundException('Actor not found');
    if (actor.role === 'OFFICE_ADMIN') {
      const officeId = actor.employee?.officeId;
      if (!officeId || !doc || doc.currentOfficeId !== officeId) {
        throw new ForbiddenException(
          'You can only route documents assigned to your own office',
        );
      }
    }
  }

  async createPlan(documentId: string, dto: CreateRoutingPlanDto, actorId: string): Promise<unknown> {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.assertOfficeOwnership(actorId, documentId);

    return this.prisma.$transaction(async (tx) => {
      await tx.documentRoutingStep.deleteMany({ where: { documentId } });
      const created = await tx.documentRoutingStep.createMany({
        data: dto.steps.map((s) => ({ ...s, documentId })),
      })
      return tx.documentRoutingStep.findMany({
        where: { documentId },
        orderBy: { sequence: 'asc' },
      }).then((rows) => ({ count: created.count, steps: rows }));
    });
  }

  findAll(filter: FilterRoutingStepsDto): Promise<unknown> {
    const { documentId, toOfficeId, toUserId, status } = filter;
    return this.prisma.documentRoutingStep.findMany({
      where: {
        ...(documentId ? { documentId } : {}),
        ...(toOfficeId ? { toOfficeId } : {}),
        ...(toUserId ? { toUserId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ documentId: 'asc' }, { sequence: 'asc' }],
    });
  }

  findOne(id: string): Promise<unknown> {
    return this.prisma.documentRoutingStep.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, dto: UpdateRoutingStepDto, actorId: string): Promise<unknown> {
    const step = await this.prisma.documentRoutingStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Routing step not found');
    await this.assertOfficeOwnership(actorId, step.documentId);
    return this.prisma.documentRoutingStep.update({ where: { id }, data: dto });
  }

  async advance(id: string, dto: AdvanceRoutingStepDto, actorId: string): Promise<unknown> {
    const step = await this.prisma.documentRoutingStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Routing step not found');
    await this.assertOfficeOwnership(actorId, step.documentId);

    const now = new Date();
    const data: Record<string, unknown> = {
      status: dto.status,
      remarks: dto.remarks ?? step.remarks,
    };
    if (dto.status === 'received' && !step.receivedAt) data.receivedAt = now;
    if ((dto.status === 'completed' || dto.status === 'returned') && !step.completedAt) {
      data.completedAt = now;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.documentRoutingStep.update({ where: { id }, data });
      await tx.documentTracking.create({
        data: {
          documentId: step.documentId,
          actorId,
          event: 'routing.advance',
          payload: {
            stepId: id,
            sequence: step.sequence,
            status: dto.status,
            remarks: dto.remarks ?? null,
          },
        },
      });
      // If completing the last pending step, advance document status to 'routed'
      if (dto.status === 'completed') {
        const current = await tx.document.findUnique({
          where: { id: step.documentId },
          select: { status: true },
        });
        await tx.document.update({
          where: { id: step.documentId },
          data: { status: 'routed', currentOfficeId: step.toOfficeId, currentHolderId: step.toUserId ?? null },
        });
        await tx.documentHistory.create({
          data: {
            documentId: step.documentId,
            fromStatus: current?.status ?? null,
            toStatus: 'routed',
            actorId,
            remarks: `Routing step ${step.sequence} completed`,
          },
        });
      }
      return updated;
    });
  }

  async remove(id: string, actorId: string): Promise<unknown> {
    const step = await this.prisma.documentRoutingStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Routing step not found');
    await this.assertOfficeOwnership(actorId, step.documentId);
    return this.prisma.documentRoutingStep.delete({ where: { id } });
  }
}
