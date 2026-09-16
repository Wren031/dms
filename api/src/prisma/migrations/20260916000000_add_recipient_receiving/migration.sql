-- Add per-office receiving to DocumentRecipient.
-- Registration and receiving become separate actions; each recipient office
-- tracks its own receiving status (pending/received).

CREATE TYPE "RecipientStatus" AS ENUM ('pending', 'received');

ALTER TABLE "DocumentRecipient" ADD COLUMN "status" "RecipientStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "DocumentRecipient" ADD COLUMN "receivedById" TEXT;
ALTER TABLE "DocumentRecipient" ADD COLUMN "receivedAt" TIMESTAMP(3);
ALTER TABLE "DocumentRecipient" ADD COLUMN "remarks" TEXT;
ALTER TABLE "DocumentRecipient" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "DocumentRecipient_status_idx" ON "DocumentRecipient"("status");