-- This migration does not use a transaction
-- Consolidate RECEIVING_OFFICER and REVIEWING_OFFICER into DOCUMENT_OFFICER
-- (PG 13 compatible: enums cannot drop values, so the type is recreated)

ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;

CREATE TYPE "Role_new" AS ENUM ('SYSTEM_ADMIN', 'OFFICE_ADMIN', 'DOCUMENT_ENCODER', 'DOCUMENT_OFFICER');

ALTER TABLE "User"
  ALTER COLUMN role TYPE "Role_new"
  USING (
    CASE role::text
      WHEN 'RECEIVING_OFFICER' THEN 'DOCUMENT_OFFICER'
      WHEN 'REVIEWING_OFFICER' THEN 'DOCUMENT_OFFICER'
      ELSE role::text
    END
  )::"Role_new";

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'DOCUMENT_ENCODER';
