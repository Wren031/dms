-- Add optional manual originating office support and informational
-- Receiving / Destination Offices for documents.

-- 1. Make originatingOfficeId optional (manual entry mode supported).
ALTER TABLE "Document" ALTER COLUMN "originatingOfficeId" DROP NOT NULL;

-- 2. Add free-text originating office name (used when manual entry is chosen).
ALTER TABLE "Document" ADD COLUMN "originatingOfficeName" TEXT;

-- 3. Add informational flag: true = send to all offices, false = only recipients.
ALTER TABLE "Document" ADD COLUMN "destinationsAllOffices" BOOLEAN NOT NULL DEFAULT true;

-- 4. Add many-to-many Document <-> Office recipients (informational only).
CREATE TABLE "DocumentRecipient" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRecipient_pkey" PRIMARY KEY ("id")
);

-- 5. Global uniqueness for documentNumber (prevents duplicates for manual-origin docs).
--    First drop the old composite unique constraint, then add a global one.
DROP INDEX "Document_originatingOfficeId_documentNumber_key";
CREATE UNIQUE INDEX "Document_documentNumber_key" ON "Document"("documentNumber");

-- 6. Indexes & foreign keys for the new recipient table.
CREATE UNIQUE INDEX "DocumentRecipient_documentId_officeId_key" ON "DocumentRecipient"("documentId", "officeId");
CREATE INDEX "DocumentRecipient_officeId_idx" ON "DocumentRecipient"("officeId");

ALTER TABLE "DocumentRecipient" ADD CONSTRAINT "DocumentRecipient_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentRecipient" ADD CONSTRAINT "DocumentRecipient_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
