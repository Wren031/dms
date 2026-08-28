/**
 * One-time idempotent backfill for DocumentRoutingStep records.
 *
 * Creates routing records ONLY where existing document data establishes a
 * reliable office-to-office movement:
 *   - document has left its originating office (originatingOfficeId !== currentOfficeId)
 *   - document has progressed beyond 'registered' (i.e. it was received/moved)
 *   - both office references are valid
 * No history that cannot be determined from existing data is fabricated:
 *   - fromUserId stays null (the original sender is not recorded on the document)
 *   - exactly one step per document reflecting the single known movement
 *
 * Run once from api/:  node backfill-routing-steps.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TERMINAL_STATUSES = ['released', 'archived', 'rejected'];

async function main() {
  const documents = await prisma.document.findMany({
    select: {
      id: true,
      trackingNumber: true,
      originatingOfficeId: true,
      currentOfficeId: true,
      currentHolderId: true,
      status: true,
      updatedAt: true,
    },
  });

  let created = 0;
  let skippedExistingSteps = 0;
  let skippedNoMovement = 0;

  for (const doc of documents) {
    const existing = await prisma.documentRoutingStep.count({ where: { documentId: doc.id } });
    if (existing > 0) {
      skippedExistingSteps += 1;
      continue;
    }

    // Only backfill a genuine office-to-office movement that we can prove
    // from the document's own data.
    const hasMovement =
      doc.status !== 'registered' &&
      !!doc.originatingOfficeId &&
      !!doc.currentOfficeId &&
      doc.originatingOfficeId !== doc.currentOfficeId;

    if (!hasMovement) {
      skippedNoMovement += 1;
      continue;
    }

    const isTerminal = TERMINAL_STATUSES.includes(doc.status);

    await prisma.documentRoutingStep.create({
      data: {
        documentId: doc.id,
        sequence: 1,
        fromOfficeId: doc.originatingOfficeId,
        toOfficeId: doc.currentOfficeId,
        toUserId: doc.currentHolderId ?? null,
        instructions: 'Backfilled from existing document record',
        status: isTerminal ? 'completed' : 'in_progress',
        ...(isTerminal ? { completedAt: doc.updatedAt } : {}),
      },
    });
    created += 1;
  }

  console.log('Backfill complete:');
  console.log(`  steps created:          ${created}`);
  console.log(`  skipped (already has):  ${skippedExistingSteps}`);
  console.log(`  skipped (no provable movement): ${skippedNoMovement}`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
