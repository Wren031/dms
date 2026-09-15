-- Simplify the document lifecycle to Registered -> Received -> Approved -> Released.
-- Legacy intermediate statuses (routed, assigned, under_review, recommended,
-- returned) are migrated to 'received' and removed from the enum.

-- 1. Backfill legacy in-progress documents into 'received'.
UPDATE "Document"
SET "status" = 'received'
WHERE "status" IN ('routed', 'assigned', 'under_review', 'recommended', 'returned');

-- History rows referencing the removed statuses are mapped to 'received'.
UPDATE "DocumentHistory"
SET "fromStatus" = 'received'
WHERE "fromStatus" IN ('routed', 'assigned', 'under_review', 'recommended', 'returned');
UPDATE "DocumentHistory"
SET "toStatus" = 'received'
WHERE "toStatus" IN ('routed', 'assigned', 'under_review', 'recommended', 'returned');

-- 2. Recreate the DocumentStatus enum without the removed values.
CREATE TYPE "DocumentStatus_new" AS ENUM ('registered', 'received', 'approved', 'rejected', 'released', 'archived');
ALTER TABLE "Document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "DocumentHistory"
  ALTER COLUMN "fromStatus" TYPE "DocumentStatus_new" USING ("fromStatus"::text::"DocumentStatus_new");
ALTER TABLE "DocumentHistory"
  ALTER COLUMN "toStatus" TYPE "DocumentStatus_new" USING ("toStatus"::text::"DocumentStatus_new");
DROP TYPE "DocumentStatus";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
ALTER TABLE "Document" ALTER COLUMN "status" SET DEFAULT 'registered';

-- 3. Add approval / release metadata columns.
ALTER TABLE "Document" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Document" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN "approvedRemarks" TEXT;
ALTER TABLE "Document" ADD COLUMN "releasedById" TEXT;
ALTER TABLE "Document" ADD COLUMN "releasedAt" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN "releasedRemarks" TEXT;