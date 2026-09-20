-- Grant OFFICE_ADMIN the documents.delete permission (idempotent).
--
-- The effective permission set for a role comes from RolePermission rows
-- (DEFAULT_ROLE_PERMISSIONS in roles.service.ts is only the fallback when the
-- whole table is empty). Two edge cases must be handled:
--   * OFFICE_ADMIN already has rows  -> add only documents.delete;
--   * OFFICE_ADMIN has NO rows but other roles do -> effectivePermissions
--     treats an empty row set as "intentionally empty" and returns [] (a
--     full revoke), so we must create the full default OFFICE_ADMIN set.

-- 1) When OFFICE_ADMIN has no rows yet, seed the full default set (which
--    includes documents.delete) so the role does not end up fully revoked.
INSERT INTO "RolePermission" ("id", "role", "permission")
SELECT gen_random_uuid(), 'OFFICE_ADMIN', defaults.permission
FROM (VALUES
  ('dashboard.view'),
  ('documents.view'),
  ('documents.edit'),
  ('documents.delete'),
  ('documents.approve'),
  ('documents.reject'),
  ('documents.release'),
  ('documents.archive'),
  ('documents.track'),
  ('users.view'),
  ('users.create'),
  ('users.edit'),
  ('offices.view'),
  ('offices.edit'),
  ('document_types.view'),
  ('document_types.create'),
  ('document_types.edit'),
  ('audit.view'),
  ('notifications.view')
) AS defaults(permission)
WHERE NOT EXISTS (SELECT 1 FROM "RolePermission" WHERE "role" = 'OFFICE_ADMIN')
ON CONFLICT ("role", "permission") DO NOTHING;

-- 2) When OFFICE_ADMIN already has rows, add just documents.delete.
INSERT INTO "RolePermission" ("id", "role", "permission")
SELECT gen_random_uuid(), 'OFFICE_ADMIN', 'documents.delete'
WHERE EXISTS (SELECT 1 FROM "RolePermission" WHERE "role" = 'OFFICE_ADMIN')
ON CONFLICT ("role", "permission") DO NOTHING;