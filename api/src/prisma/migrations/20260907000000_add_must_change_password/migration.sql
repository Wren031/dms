-- Add mustChangePassword flag to User.
-- Drives the first-login forced password change flow. Defaults to false
-- so existing rows continue to behave exactly as before.

ALTER TABLE "User"
    ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
