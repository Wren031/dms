# Design — Document Numbering

## Context

The `F:\LGU\DMS` monorepo contains:

- `api/` — NestJS 10 + Prisma 5.22 + PostgreSQL 13. Auth (JWT access, refresh, httpOnly cookies, double-submit CSRF), users/roles/offices/employees, documents (CRUD + transitions), document-types, document-attachments, document-tracking, notifications (DB + RxJS subject + SSE), and audit-logs (service + controller + an `audit.interceptor.ts` registered as `APP_INTERCEPTOR`, with 34 `@Audit()` decorations). Helmet, throttler, class-validator, and role/permission guards are wired in `app.module.ts`. Tests are absent.
- `frontend/` — Vite 5 + React 18 + Tailwind 3 + TS 5. Complete UI shell with all feature pages (`DashboardPage`, `DocumentsListPage`, `DocumentDetailPage`, `DocumentRegistrationPage`, `InboxPage`, `OutboxPage`, `ApprovalPage`, `ReleasePage`, `ArchivePage`, `TrackingPage`, system-admin pages). UI primitives are complete. **All data access goes through the real backend** via feature-scoped hooks (`src/features/*/hooks/`) and a shared `request` helper. `src/mocks` is deleted with 0 remaining imports.

**No `RoutingPage` exists.** There is no routing feature in the frontend.

TanStack Query, react-hook-form, zod, and date-fns are not installed, and are not planned.

## Goals / Non-Goals

**Goals**

- Document numbers are unique **per originating office**, not globally.
- The server suggests the next number for an office and year; the encoder may override it.
- A collision surfaces as a clear `409` naming the conflicting document and office.
- The availability check agrees with what the database will actually enforce.

**Non-Goals**

- Sequential routing between offices (deferred; see `tasks.md`).
- Replacing Argon2 or JWT; the existing auth is acceptable.
- Multi-tenant separation (single agency).
- i18n, a11y beyond keyboard + focus + ARIA labels.
- Introducing a UI component library other than the existing primitives.
- Rewriting the frontend data layer.

## Decisions

1. **`documentNumber` is unique per `originatingOfficeId`.**
   - Stored as `Document.documentNumber` with `@@unique([originatingOfficeId, documentNumber])`.
   - `@@index([documentNumber])` is retained separately because the list search does a
     `contains` match (`documents.service.ts`).
   - Rationale: two offices should each be able to start their own `0001`. A global unique
     index forbids that.
   - Alternative considered: keep global uniqueness. Rejected — it blocks per-office numbering,
     which is the actual requirement.

2. **The server suggests, the encoder may override.**
   - `GET /documents/document-number-suggestion/:officeId` returns `OFFICE-CODE/YYYY/NNNN`
     (e.g. `OCM-2026-0007`) by scanning the highest existing number with that office's prefix.
   - A manually typed number is checked for availability and used verbatim.
   - `trackingNumber` remains globally unique and auto-generated, unchanged.

3. **Collisions return `409` with the offending document identified.**
   - The `P2002` handler calls `buildDocumentNumberConflict`, which looks up the existing row
     and includes its tracking number and originating office code/name.

4. **The availability check is office-scoped, and it agrees with the constraint.**
   - `GET /documents/check-document-number?documentNumber=…&originatingOfficeId=…` takes an
     optional `originatingOfficeId`. Omitting it checks the manual-origin pool.
   - Rationale: under a per-office constraint, a number-only check reports false conflicts
     across offices.

5. **Soft-deleted documents permanently reserve their number.**
   - The unique index is a plain btree with no `WHERE deletedAt IS NULL`, so a soft-deleted row
     still occupies its `(office, number)` slot. Rather than diverge the schema from the
     database, the check and the sequence generators were aligned to the real constraint:
     `findExistingDocumentByNumber` no longer filters `deletedAt: null`, and
     `suggestDocumentNumber` / `generateManualDocumentNumber` no longer skip soft-deleted rows
     when computing the next value.
   - Consequence: a number from a soft-deleted document is never offered or accepted again.
   - Alternative considered: a partial unique index (`WHERE "deletedAt" IS NULL`) via raw SQL,
     which would free the number. Rejected — Prisma cannot model a partial index, so
     `schema.prisma` would disagree with the database and the next `prisma migrate dev` would
     report drift and could offer to reset the database.

6. **The manual-origin path is guarded in application code.**
   - When `originatingOfficeId` is absent the server generates `MAN-YYYY-NNNN` via
     `generateManualDocumentNumber`. Postgres treats NULLs as distinct in a composite unique
     index, so those rows get **no** database-level uniqueness guarantee.
   - `create()` therefore checks for an existing `(documentNumber, originatingOfficeId: null)`
     row before insert and throws the same `409`.
   - Alternatives considered: `NULLS NOT DISTINCT` (requires PostgreSQL 15; this project is on
     13.22) and making `originatingOfficeId` required (deletes a user-facing feature — the
     registration page has an `originMode` toggle). Both rejected.
   - **Known limitation:** the guard is application-level, so two concurrent registrations in
     the manual-origin pool could in principle both pass it. Closing that would need a
     serializable transaction or a partial index.

## Risks / Trade-offs

- **Risk**: A concurrent double-submit could produce a duplicate manual-origin number (Decision 6).
  - Mitigation: none at the database level on PostgreSQL 13. Low likelihood; would need
    simultaneous manual-origin registrations in the same year. Revisit if it occurs.

- **Risk**: Numbering now depends on `originatingOfficeId`, which is user-selectable at
    registration time.
  - Mitigation: the availability check re-runs per office, so moving a document to a different
    originating office cannot silently collide.

- **Risk**: Pre-existing schema drift unrelated to this change.
  - `DocumentRecipient.updatedAt` has `@default(now())` in `schema.prisma` but no default in the
    database. `prisma migrate diff` reports it on every run. It was deliberately **excluded**
    from this change's migration to keep it scoped. Fix separately.

## Migration Plan

1. Applied `20261003000000_document_number_per_office`: drops `Document_documentNumber_key`,
   creates `Document_originatingOfficeId_documentNumber_key`.
   - Non-destructive to existing rows: all 6 documents already had distinct
     `(office, number)` pairs, so no backfill was required.
   - Applied with `prisma migrate deploy`, not by hand in pgAdmin, so `_prisma_migrations`
     stays in sync and no drift is introduced.
2. Backend: office-scoped check plus the manual-origin guard. Endpoint signature is additive —
   `originatingOfficeId` is an optional query param, so existing callers keep working.
3. Frontend: `useDocumentNumberCheck` takes `originatingOfficeId`; the registration page passes
   the selected office (or `undefined` in manual mode).
4. Rollback: revert the app deployment, then `DROP INDEX "Document_originatingOfficeId_documentNumber_key"`
   and recreate `Document_documentNumber_key`. No data loss either way.

## Open Questions

- Should soft-deleted documents' numbers ever be reusable? Answered for now as "no" (Decision 5);
  revisit only if Legal requires reuse.
- Should the encoder be allowed to edit `documentNumber` after registration? Currently not.
- Should notifications carry a deep link to the document? Backend supports `link`.
- Should the audit log retention window be configurable? Backend stores forever. Out of scope.
