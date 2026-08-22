# Design — DMS End-to-End Integration

## Context

The `F:\RealProject\DMS` monorepo contains:

- `backend/` — NestJS 10 + Prisma 5 + PostgreSQL. Auth (JWT access 10m, refresh 7d, httpOnly cookies, double-submit CSRF), users/roles/offices/employees, documents (CRUD + transitions), document-types, document-attachments (two-step S3 presigned upload), document-routing, document-review, document-release, document-tracking, document-archive, notifications (DB + RxJS subject), audit-logs (service + controller, no auto-interceptor yet). Helmet, throttler, class-validator, role guards are wired in `app.module.ts`. Tests are absent.
- `frontend/` — Vite 5 + React 18 + Tailwind 3 + TS 5. Complete UI shell with all feature pages (`DashboardPage`, `DocumentsListPage`, `DocumentDetailPage`, `DocumentRegistrationPage`, `InboxPage`, `RoutingPage`, `ReviewPage`, `ReleasePage`, `TrackingPage`, `ArchivePage`, `NotificationsPage`, system-admin pages). UI primitives are complete. Auth and data sources all read from `/src/mocks/*`. TanStack Query, react-hook-form, zod are not installed.

Constraints: Node 20+, project-locked dependencies, no internet during package install (assumed). Status enum divergence: backend uses `routed`, frontend type currently uses `in_routing` — README acknowledges the boundary is to be handled at integration.

Stakeholders: government office IT, document encoders, receiving officers, reviewing officers, approvers, releasing officers, system admins.

## Goals / Non-Goals

**Goals**

- Every privileged mutation in the backend writes an immutable audit row inside the same DB transaction as the business write.
- Every workflow transition runs `(document update) + DocumentHistory + DocumentTracking + Notification` in one transaction, through a single `WorkflowService`.
- `PolicyService` rejects any transition that would let an unauthorized user mutate or move a document.
- Frontend communicates with the real backend over cookies; no mock data in feature pages.
- Server-driven dashboard statistics match the requirements' role-aware counts.
- A reproducible seed produces offices, users across all five roles, and demo documents in every status.
- Frontend environment: dev keeps an "impersonate" affordance behind `import.meta.env.DEV`; production is fully cookie-auth driven.

**Non-Goals**

- Replacing Argon2 or JWT; the existing auth is acceptable.
- Adding new domain entities (notifications / signatures / external feeds are out of scope).
- Multi-tenant separation (single agency).
- Real-time collaborative editing or push fan-out beyond per-user notifications.
- i18n, a11y beyond keyboard + focus + ARIA labels (already present in most components).
- Introducing a UI component library other than the existing primitives.

## Decisions

1. **Append-only audit via Prisma client extension, not a separate writer service.**
   - Rationale: enforcing at the Prisma layer is the only way to make `AuditLog` immutable by construction. Services can't accidentally edit an audit row.
   - Alternative considered: a separate DB user with revoked `UPDATE`/`DELETE` privileges. More robust at the DB level, but requires a second Postgres role and adds deploy complexity. Deferred to ops hardening.
2. **Audit interceptor captures at the controller boundary, not at the Prisma layer.**
   - Rationale: we want human-readable `module` / `action` strings, not raw model writes. Mapping model writes → actions is brittle. `@Audit('documents.approve')` metadata on each handler gives intent.
   - Alternative considered: emit audit rows from `WorkflowService.transition()` directly. Simpler, but the audit interceptor captures non-workflow writes (auth, users, offices) too. We keep both: interceptor for write endpoints with `@Audit`, and `WorkflowService` for capturing business-level history (already distinct from `AuditLog`).

3. **Single `WorkflowService.transition(...)` is the only path that can change `Document.status`.**
   - Existing services (`documents.service`, `document-routing.service`, `document-review.service`, `document-release.service`, `document-archive.service`) call into it.
   - The transition function: validates the (from → to) edge against `ALLOWED_TRANSITIONS`, runs `PoliciesService.assert`, runs the `prisma.$transaction` (document update + history + tracking + notification), and returns the updated document.

4. **`PoliciesService`** is split into:
   - `roleHas(role, permission)` — pure lookup against a static matrix.
   - `assertForAction(role, action, document, user)` — combines role check + office check (the document's `currentOfficeId` matches the user's office, or the user is `system_admin`) + holder check (for review/release/return, the user must be the `currentHolderId`, or be `office_admin`/`system_admin`).

5. **Document numbering.**
   - `documentNumber` is unique-per-`originatingOfficeId`, supplied by the encoder.
   - Server provides an auto-suggested `OFFICE-CODE/YYYY/NNNN` value (e.g. `CAO-2026-0007`) but allows override.
   - On collision → `409 Conflict`.
   - Stored as `Document.documentNumber` with a composite unique index `(originatingOfficeId, documentNumber)`. `trackingNumber` remains globally unique and auto-generated.

6. **Notification fan-out.**
   - `WorkflowService.transition()` posts a `Notification` to the next handler (the new `currentHolderId` if set, else the office's primary encoder). Email/push out of scope.
   - The RxJS `Subject` in `NotificationsService` is preserved; SSE endpoint stays.

7. **Frontend data layer.**
   - `@tanstack/react-query` v5 (matches React 18) for cache, mutations, optimistic updates, and SSE invalidation.
   - `react-hook-form` + `zod` for the registration and routing-plan forms (existing forms have inline validation we will replace).
   - `date-fns` only if not already implicit (none in package.json → adding it).

8. **HTTP client.**
   - `src/lib/api.ts` exposes `apiFetch(path, init)` that:
     - Sets `credentials: 'include'`.
     - Reads `dms_csrf` cookie, sends it as `X-XSRF-TOKEN` for unsafe methods.
     - On `401`, attempts one silent `POST /auth/refresh`, then retries the original request.
     - On failure, normalizes into `ApiError { status, code, message, details? }`.

9. **Auth rewrite in frontend.**
   - `useAuth` issues `POST /auth/login`, stores the user in memory + memory-backed `lastUser` cache (no localStorage) so SSR-safe. Production builds see no user picker. Dev builds may retain a "switch user" list for local exploration (controlled).

10. **Status-name mapping.**
    - Single source of truth at the integration boundary in `src/lib/documentStatus.ts`:
      ```ts
      export const FRONT_TO_BACK_STATUS: Record<FrontendStatus, BackendStatus> = {
        in_routing: 'routed',
        // ... pass-through for others
      };
      ```
    - All outgoing payloads use the backend name; the UI displays the frontend label.

## Risks / Trade-offs

- **Risk**: Audit interceptor must run inside the same transaction as the business write — otherwise a failed business write could still leave an audit row.
  - Mitigation: interceptor uses `clsr` (already part of NestJS `AsyncLocalStorage`) to attach the active Prisma transaction; the service-level `WorkflowService.transition` passes its `tx` handle to the interceptor's writer.

- **Risk**: Prisma extension throws on `AuditLog.update`/`delete` could break admin tooling that intentionally prunes audit (e.g. GDPR erasure).
  - Mitigation: provide an opt-in env flag `AUDIT_ALLOW_PRUNE=true` that disables the throw. Default is locked.

- **Risk**: Marking `documentNumber` unique-per-office requires a data migration if existing rows lack it.
  - Mitigation: backfill with `${trackingNumber}` during the migration, then enforce the constraint.

- **Risk**: Frontend `useAuth` rewrite touches every page (because every page imports it).
  - Mitigation: keep the public hook signature (`useAuth().user`, `hasPermission`, etc.) backwards-compatible so pages don't need to change their import.

- **Risk**: TanStack Query replaces imperative `useEffect` data fetches in 14 pages — large surface.
  - Mitigation: introduce one hook per logical resource; each page only has to swap its data source. Mutations use `useMutation` with invalidation keys.

- **Risk**: SSE on the frontend can stall when the user is behind a corporate proxy.
  - Mitigation: keep polling fallback (`useNotificationsStream({ pollMs: 30000 })`) with SSE as primary.

- **Risk**: Concurrency on `transition()` if two officers click simultaneously.
  - Mitigation: Prisma `update` with a `where: { id, status: fromStatus }` filter; zero rows updated → `Conflict`. The state machine already prevents double-transition.

## Migration Plan

1. Apply schema migration for `Document.documentNumber`. Backfill with `trackingNumber` for existing rows.
2. Deploy interceptor + `WorkflowService` + `PoliciesService` + audit extension. All endpoint signatures unchanged.
3. Deploy dashboard endpoints (additive).
4. Run seed in lower environment to populate demo data.
5. Frontend: ship behind `import.meta.env.VITE_USE_API` flag if a dark launch is desired; default-on otherwise.
6. Rollback: revert app deployment; database migration is non-destructive (additive column + composite unique). Drop the unique index if necessary.

## Open Questions

- Should `documents.review` allow comments without transitioning? Schema supports `commented`; UI should expose a "comment" action distinct from approve/reject. Defer to implementation; we'll add the action button.
- Should notifications carry a deep link to the document? Backend supports `link`; frontend will populate as `/documents/:id`.
- Should the audit log retention window be configurable? Backend stores forever by default. Out of scope.
