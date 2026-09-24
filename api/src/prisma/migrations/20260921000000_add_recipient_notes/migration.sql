-- Admin notes on the per-office receiving record.
-- Notes can only be set while the office has NOT yet received the document.
ALTER TABLE "DocumentRecipient" ADD COLUMN "note" TEXT;
ALTER TABLE "DocumentRecipient" ADD COLUMN "noteById" TEXT;
ALTER TABLE "DocumentRecipient" ADD COLUMN "noteAt" TIMESTAMP(3);

CREATE INDEX "DocumentRecipient_noteById_idx" ON "DocumentRecipient"("noteById");