-- Add soft-delete support to documents (deletedAt / deletedById).

-- AlterTable
ALTER TABLE "Document"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");