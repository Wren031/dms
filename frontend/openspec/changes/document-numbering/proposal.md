# Document Numbering

## Why

Document numbers must be unique **per originating office**, not globally. Two offices should each
be able to begin their own `0001` sequence. The schema enforced a global unique index on
`Document.documentNumber`, which forbids that.

Most of the original scope of this change was already implemented before it was written down, and
the parts that were not turned out to be either superseded or blocked:

- The `audit.interceptor.ts` / `audit.decorator.ts` pair exists with 34 `@Audit()` decorations, so
  the "no auto-interceptor yet" premise was stale.
- `src/mocks` is deleted with 0 remaining imports and `useAuth` uses the real API with no
  `localStorage`, so the "connect the halves" premise was stale.
- `documentNumber` itself, the suggestion helper, `@Length(1, 100)` validation, and the `409`
  `P2002` handler were already built. Only the constraint's scope was wrong.
- Transition logic is already consolidated in `documents.service.ts` with `ALLOWED_TRANSITIONS`,
  `TRANSITION_ROLES`, and `TRANSITION_PERMISSIONS`, so the proposed `WorkflowService` /
  `PoliciesService` extraction is a DRY refactor with no functional gain.
- Routing **cannot be implemented as written**: `specs/routing/spec.md` requires
  `Document.status = 'routed'` and `= 'returned'`, but the `DocumentStatus` enum has neither, in
  either the Prisma schema or the frontend types.

So this change was rescoped on 2026-10-03 to the one thing that was genuinely wrong and genuinely
needed: the scope of the document-number uniqueness constraint, plus the availability check that
has to agree with it.

## What Changes

- **Schema**: `@@unique([documentNumber])` → `@@unique([originatingOfficeId, documentNumber])` on
  `Document`. `@@index([documentNumber])` is retained for the list search's `contains` match.
  Migration `20261003000000_document_number_per_office` drops the old index and creates the new one.
- **Availability check becomes office-scoped**: `findExistingDocumentByNumber` and
  `checkDocumentNumberAvailability` accept an `originatingOfficeId`, exposed as an optional query
  param on `GET /documents/check-document-number` and threaded through the frontend
  `useDocumentNumberCheck` hook and the registration page.
- **The check is aligned with the real constraint**: `findExistingDocumentByNumber` no longer
  filters `deletedAt: null`, and `suggestDocumentNumber` / `generateManualDocumentNumber` no longer
  skip soft-deleted rows when computing the next sequence. The unique index has no
  `WHERE deletedAt IS NULL`, so a soft-deleted document's number stays reserved; the suggestion
  must step past it rather than propose a value that will fail.
- **The manual-origin path is guarded in application code**: Postgres treats NULLs as distinct in a
  composite unique index, so documents with no originating office (the `originMode` toggle on the
  registration page, which uses the `MAN-YYYY-NNNN` series) get no database-level guarantee.
  `create()` rejects a duplicate before insert.

## Capabilities

### New Capabilities

None. `openspec/specs/` is empty; this change does not introduce a capability spec.

### Deferred

Eleven capability specs were bundled here. Ten describe work that was already done, done
differently, or never built; each of those spec files now carries a `**Status:**` header with its
verified verdict, so they cannot be read as claims about current behaviour. In summary: `archive`,
`audit-trail`, `notifications`, `release`, and `review` are implemented; `permissions` and
`frontend-integration` are superseded by a different mechanism that already works; `dashboard` and
`seed-data` are partial; and `routing` is not implementable as written.

`specs/documents/spec.md` is the only spec this change owns. It was corrected: the status lifecycle
now matches the real enum, `originatingOfficeId` is documented as optional (manual origin is a
shipped feature), the `trackingNumber` pattern inconsistency is resolved to `DMS-YYYY-NNNN`, and
scenarios were added for per-office uniqueness, the manual-origin guard, office-scoped
availability, and soft-deleted number reservation.

`specs/routing/spec.md` is retained so the requirement text survives, but it is not implementable
until the `routed` / `returned` enum values are added and the relationship between sequential
routing and the live parallel `DocumentRecipient` fan-out is decided.

## Impact

- **Backend code**: `src/prisma/schema.prisma`, `src/modules/documents/documents.service.ts`,
  `src/modules/documents/documents.controller.ts`,
  `src/modules/documents/dto/check-document-number.dto.ts`.
- **Frontend code**: `src/features/documents/services/documents.service.ts`,
  `src/features/documents/hooks/useDocumentNumberCheck.ts`,
  `src/features/documents/pages/DocumentRegistrationPage.tsx`.
- **Dependencies**: none added on either side.
- **APIs**: `GET /documents/check-document-number` gains an **optional** `originatingOfficeId`
  query param. Additive; existing callers are unaffected.
- **Data**: one non-destructive migration. All 6 existing documents already had distinct
  `(office, number)` pairs, so no backfill was required. Applied with `prisma migrate deploy`
  rather than by hand, so `_prisma_migrations` stays in sync and no drift is introduced.
- **Known limitation**: the manual-origin uniqueness guard is application-level, so two concurrent
  manual-origin registrations in the same year could in principle both pass it. Closing that needs
  a serializable transaction or a partial index (PostgreSQL 13 does not support
  `NULLS NOT DISTINCT`).
- **Unrelated pre-existing drift**: `DocumentRecipient.updatedAt` declares `@default(now())` in the
  schema but has no default in the database. Deliberately excluded from this migration.
