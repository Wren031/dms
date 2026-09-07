-- Entry Recovery: per-user form drafts with debounced autosave.
-- One draft per (user, formKey); status lifecycle is DRAFT -> SUBMITTED.
-- Drafts cascade-delete with the owning user.

-- 1. Enum
CREATE TYPE "FormDraftStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- 2. Table
CREATE TABLE "FormDraft" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "formKey"   TEXT NOT NULL,
    "payload"   JSONB NOT NULL,
    "status"    "FormDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormDraft_pkey" PRIMARY KEY ("id")
);

-- 3. Unique constraint: one draft per user per form
CREATE UNIQUE INDEX "FormDraft_userId_formKey_key"
    ON "FormDraft"("userId", "formKey");

-- 4. Lookups
CREATE INDEX "FormDraft_userId_idx" ON "FormDraft"("userId");
CREATE INDEX "FormDraft_status_idx" ON "FormDraft"("status");

-- 5. FK with cascade delete (matches User.employee onDelete: Cascade pattern)
ALTER TABLE "FormDraft"
    ADD CONSTRAINT "FormDraft_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
