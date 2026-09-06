-- Add many-to-many DocumentType <-> DocumentTypeCode relationship.
-- Migrates the existing single `code` column into a row per code in
-- `DocumentTypeCodeEntry` before dropping the old column so that no
-- data is lost.

-- 1. Create the new join table.
CREATE TABLE "DocumentTypeCodeEntry" (
    "id" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "code" "DocumentTypeCode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTypeCodeEntry_pkey" PRIMARY KEY ("id")
);

-- 2. Backfill: one row per existing DocumentType.code.
INSERT INTO "DocumentTypeCodeEntry" ("id", "documentTypeId", "code", "createdAt")
SELECT gen_random_uuid(), "id", "code"::"DocumentTypeCode", "createdAt"
FROM "DocumentType"
WHERE "code" IS NOT NULL;

-- 3. Drop the old unique constraint on DocumentType.code (if present).
ALTER TABLE "DocumentType" DROP CONSTRAINT IF EXISTS "DocumentType_code_key";

-- 4. Drop the old single-column code from DocumentType.
ALTER TABLE "DocumentType" DROP COLUMN "code";

-- 5. Uniqueness, indexes, and foreign key on the new table.
CREATE UNIQUE INDEX "DocumentTypeCodeEntry_documentTypeId_code_key"
    ON "DocumentTypeCodeEntry"("documentTypeId", "code");

CREATE INDEX "DocumentTypeCodeEntry_code_idx"
    ON "DocumentTypeCodeEntry"("code");

CREATE INDEX "DocumentTypeCodeEntry_documentTypeId_idx"
    ON "DocumentTypeCodeEntry"("documentTypeId");

ALTER TABLE "DocumentTypeCodeEntry"
    ADD CONSTRAINT "DocumentTypeCodeEntry_documentTypeId_fkey"
    FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
