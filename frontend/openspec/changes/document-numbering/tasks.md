# Tasks

Scope was narrowed on 2026-10-03. This change now covers **document numbering only**.
Rationale and the deferred work are recorded in `proposal.md` and the *Deferred* section below.

## 1. Document Numbering

- [x] 1.1 Add `Document.documentNumber String` (≤ 100 chars) and a server-side suggestion helper in `prisma/schema.prisma`.
- [x] 1.2 Backfill existing rows — not required; the column was added before any document existed.
- [x] 1.3 Enforce uniqueness **per originating office** via `@@unique([originatingOfficeId, documentNumber])` (migration `20261003000000_document_number_per_office`).
- [x] 1.4 Add `suggestDocumentNumber(officeId)` returning the next `OFFICE-CODE/YYYY/NNNN` value, plus `generateManualDocumentNumber()` for the `MAN-YYYY-NNNN` pool used when there is no originating office.
- [x] 1.5 Scope the availability check to the originating office: `findExistingDocumentByNumber` and `checkDocumentNumberAvailability` now take `originatingOfficeId`, exposed as an optional `originatingOfficeId` query param on `GET /documents/check-document-number` and threaded through `useDocumentNumberCheck`.
- [x] 1.6 Guard the manual-origin path in application code. Postgres treats NULLs as distinct in a composite unique index, so a document with no originating office gets no database-level guarantee; `create()` rejects a duplicate before insert.

## 2. Validation and Error Surfacing

- [x] 2.1 `@IsString() @Length(1, 100)` on `documentNumber` in `CreateDocumentDto`.
- [x] 2.2 Return `409 Conflict` on collision via the `P2002` handler and `buildDocumentNumberConflict`, which names the conflicting tracking number and originating office.
- [x] 2.3 `ConflictException` mapping present in the exception filter.

## 3. Consistency Fixes Found While Scoping

- [x] 3.1 Soft-deleted documents permanently reserve their number (the unique index has no `WHERE deletedAt IS NULL`), so `findExistingDocumentByNumber` no longer filters `deletedAt: null`. The UI now reports "taken" instead of letting the encoder type a number that fails with a 409.
- [x] 3.2 `suggestDocumentNumber` and `generateManualDocumentNumber` no longer skip soft-deleted rows when computing the next sequence, so a suggestion can never collide with a reserved number.

## 4. Verification

- [x] 4.1 `npm run typecheck` and `npm run build` pass in `api/`; changed API files pass ESLint.
- [x] 4.2 `npm run typecheck` and `npm run build` pass in `frontend/`.
- [x] 4.3 `prisma migrate status` reports the schema up to date.
- [ ] 4.4 Manually click through document registration in the browser: select an originating office, confirm the suggestion loads, and confirm a deliberately duplicated number reports as taken.

## Deferred — Not In This Change

This change originally bundled eleven capability specs. Ten of them describe work that was already
done, done differently, or was never built. Each of those spec files now carries a `**Status:**`
header at the top recording its verified verdict against the code, so none of them can be mistaken
for a description of current behaviour. `specs/documents/spec.md` is the only spec this change
owns; it was corrected to match the shipped enum and the optional `originatingOfficeId`.

Do not implement anything under this change ID that belongs to a deferred spec. The summaries below
are orientation only — the per-spec headers are authoritative.

### Routing (sequential relay between offices)

`DocumentRoutingStep`, `RoutingStepStatus`, and `Document.routingSteps` remain in `schema.prisma`
as scaffolding. They are unused: no API module, no page, 0 rows.

`specs/routing/spec.md` **cannot be implemented as written.** It requires
`Document.status = 'routed'` and `Document.status = 'returned'`, but the `DocumentStatus`
enum has only `registered | received | approved | rejected | released | archived` — in both
`schema.prisma:36` and `frontend/src/features/documents/types/document.ts:3`.
`ALLOWED_TRANSITIONS` in `documents.service.ts` is typed `Record<DocumentStatus, DocumentStatus[]>`,
so a `routed` edge will not compile until the enum gains the value. That requires an enum
migration, client regeneration, and updates to `ALLOWED_TRANSITIONS`, `TRANSITION_ROLES`,
`TRANSITION_PERMISSIONS`, the frontend union, and every status label, filter, and badge.

Routing is also a **second distribution paradigm**. The live model fans a document out to many
offices in parallel via `DocumentRecipient` (108 rows); routing relays it sequentially through
ordered steps. Implementing both means two mechanisms writing to the same `Document.status`.
That is an open domain decision, not a task.

Track it as a separate change once the enum and the fan-out/relay relationship are decided.

### Frontend query-layer migration

TanStack Query, `react-hook-form`, `zod`, and `date-fns` are not installed and are not needed.
The existing feature-scoped hooks (`src/features/*/hooks/`) and `request` helper work against
the real backend. `src/mocks` is already deleted with 0 remaining imports, so the original
"remove mocks" goal is met without this migration.

### `WorkflowService` / `PoliciesService` extraction

Superseded. Transition logic is already consolidated in `documents.service.ts` with
`ALLOWED_TRANSITIONS`, `TRANSITION_ROLES`, and `TRANSITION_PERMISSIONS`, plus an
append-only `audit.interceptor.ts` (34 `@Audit()` decorations) and an
`audit.decorator.ts`. Extracting a `WorkflowService` and `PoliciesService` would be a DRY
refactor with no functional gain.

### Backend dashboard aggregation

`GET /dashboard/summary` and `GET /dashboard/recent-activity` were never built.
`DashboardPage` computes what it shows client-side. Reconsider only if dashboard performance
or role-scoped counting becomes a problem.

### Seed data expansion

`prisma/seed.ts` populates document types and reference data. It does not create 12 users or
25 demo documents, and does not attach routing plans, reviews, releases, or audit rows.
