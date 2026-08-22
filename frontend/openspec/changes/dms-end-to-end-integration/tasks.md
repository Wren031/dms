# Tasks

## 1. Backend — Schema and Persistence

- [ ] 1.1 Add `Document.documentNumber String` (≤ 100 chars), `DocumentNumberSuggestion` helper, and composite unique index `(originatingOfficeId, documentNumber)` in `prisma/schema.prisma`.
- [ ] 1.2 Run `prisma:migrate --name document_number` and backfill existing rows with `${trackingNumber}` so the constraint holds.
- [ ] 1.3 Extend `PrismaService` with an append-only `auditLog` extension that throws on `update`/`delete` (gated by `AUDIT_ALLOW_PRUNE` env).
- [ ] 1.4 Add `addDocumentNumberSuggestion` to `documents.service.ts` that returns the next sequential number for an office/year.

## 2. Backend — Audit, Workflow, Permissions

- [ ] 2.1 Create `src/common/interceptors/audit.interceptor.ts` registered as `APP_INTERCEPTOR`. Read `@Audit(action, module)` metadata; capture `actorId`, role, `ipAddress`, `userAgent`, request body, and the route's `targetId` (param `:id`) into an `AuditLog` row written through the request's active Prisma transaction.
- [ ] 2.2 Create `src/common/decorators/audit.decorator.ts` exporting `@Audit(action, module)` and decorate every privileged write across `documents`, `document-routing`, `document-review`, `document-release`, `document-archive`, `users`, `offices`, `document-attachments`.
- [ ] 2.3 Create `src/modules/workflow/workflow.service.ts` with `transition(documentId, toStatus, actorId, opts)` that runs `(document update) + DocumentHistory + DocumentTracking + Notification` in one Prisma transaction. Inject `PrismaService` and `NotificationsService`.
- [ ] 2.4 Replace duplicated transition logic in `documents.service.transition`, `document-routing.service.advance`, `document-review.service.create`, `document-release.service.create`, `document-archive.service.create` with calls to `WorkflowService.transition`.
- [ ] 2.5 Create `src/common/services/policies.service.ts` with `roleHas(role, permission)` and `assertForAction(role, action, document, user)` covering `documents.register`, `documents.receive`, `documents.route`, `documents.review`, `documents.approve`, `documents.reject`, `documents.return`, `documents.release`, `documents.archive`.
- [ ] 2.6 Wire `PoliciesService.assertForAction` into every `WorkflowService.transition` call.
- [ ] 2.7 Add the notifications fan-out calls in `WorkflowService.transition` so the new holder/originator receives a `Notification` (and an SSE event).

## 3. Backend — Dashboard Endpoints

- [ ] 3.1 Create `src/modules/dashboard/dashboard.module.ts`, `dashboard.controller.ts`, `dashboard.service.ts`.
- [ ] 3.2 Implement `GET /dashboard/summary` returning `{ totals, byStatus, byPriority, myInbox, pendingReview, pendingApproval, overdue, completionRate }` computed per role/office.
- [ ] 3.3 Implement `GET /dashboard/recent-activity?limit=20` returning a paginated `AuditLog` feed scoped to the caller's role.

## 4. Backend — Seed Data

- [ ] 4.1 Author `prisma/seed.ts` with idempotent upserts for: 4 offices (1 main, 2 divisions, 2 units), all `DocumentTypeCode` rows, ≥ 12 users covering every role with argon2id-hashed passwords, ≥ 25 demo documents distributed across statuses.
- [ ] 4.2 For each demo document: attach routing plan, reviews, release (if approved/released), archive (if archived), document-history rows, and matching `AuditLog` entries.
- [ ] 4.3 Add `npm run seed` script + ensure the seed runs against `NODE_ENV=development` only.

## 5. Backend — Validation, Polish

- [ ] 5.1 Add `IsString @Length(1, 100)` for `documentNumber` in `CreateDocumentDto`. Return `409` with a clear message on `(originatingOfficeId, documentNumber)` collision.
- [ ] 5.2 Add `ConflictException` mapping in `HttpExceptionFilter`.
- [ ] 5.3 Verify `npm run typecheck && npm run lint` pass.

## 6. Frontend — Dependencies and Foundations

- [ ] 6.1 Install `@tanstack/react-query`, `react-hook-form`, `zod`, `date-fns` in `frontend/`.
- [ ] 6.2 Add `src/providers/QueryProvider.tsx`, wire it into `App.tsx`.
- [ ] 6.3 Add `src/lib/api.ts` exporting `apiFetch(path, init)` with credentials, CSRF header, refresh-on-401, and `ApiError`.
- [ ] 6.4 Add `src/lib/documentStatus.ts` with `FRONT_TO_BACK` and `BACK_TO_FRONT` mappings (notably `in_routing` ↔ `routed`).
- [ ] 6.5 Rewrite `src/hooks/useAuth.tsx` to use `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/refresh`. Drop localStorage; keep an opt-in `__DEV__` impersonation list.

## 7. Frontend — Query Layer per Feature

- [ ] 7.1 Create `src/hooks/queries/useDocuments.ts` (list + detail + filters + pagination + mutations for register/transition/assign-holder).
- [ ] 7.2 Create `src/hooks/queries/useRouting.ts` (plan upsert, advance, update step).
- [ ] 7.3 Create `src/hooks/queries/useReview.ts`, `useRelease.ts`, `useArchive.ts` — each thin wrappers around `documents.review|release|archive` mutations.
- [ ] 7.4 Create `src/hooks/queries/useDashboard.ts` (`useDashboardSummary`, `useRecentActivity`).
- [ ] 7.5 Create `src/hooks/queries/useNotifications.ts` (list, unread count, mark read; SSE via `useNotificationsStream`).
- [ ] 7.6 Create `src/hooks/queries/useAuditLogs.ts`, `useOffices.ts`, `useUsers.ts`, `useDocumentTypes.ts`.

## 8. Frontend — Page-by-Page Integration

- [ ] 8.1 Wire `DashboardPage` to `useDashboardSummary` + `useRecentActivity`.
- [ ] 8.2 Wire `DocumentsListPage` to `useDocuments` (filters, pagination).
- [ ] 8.3 Wire `DocumentDetailPage` to `useDocument` + workflow action modals (recommend, approve, reject, return, release, archive) backed by mutations.
- [ ] 8.4 Wire `DocumentRegistrationPage` to react-hook-form + zod (CreateDocumentDto schema); add `FileUploadField` with presigned upload + confirm; submit through `useDocuments.register`.
- [ ] 8.5 Wire `InboxPage` to `useDocuments` filtered by `currentHolderId`/`currentOfficeId`.
- [ ] 8.6 Wire `RoutingPage` to `useRouting` (plan + advance).
- [ ] 8.7 Wire `ReviewPage`, `ReleasePage`, `ArchivePage`, `TrackingPage` to corresponding queries.
- [ ] 8.8 Wire `NotificationsPage` and the header bell to `useNotifications` + SSE.
- [ ] 8.9 Wire `AuditLogsPage`, `UsersPage`, `OfficesPage`, `RolesPermissionsPage` to backend endpoints.

## 9. Frontend — Mock Removal

- [ ] 9.1 Remove all `import … from '@/mocks/*'` from `src/features/**`, `src/hooks/**`, `src/components/**`.
- [ ] 9.2 Reduce `src/mocks/*` to documentation-only (or delete if not referenced).
- [ ] 9.3 Replace the demo user picker in `LoginPage` with a notice "Use your assigned credentials" while preserving dev impersonation in `__DEV__`.

## 10. Polish

- [ ] 10.1 Verify loading/empty/error states on every page.
- [ ] 10.2 Verify pagination + filters on `DocumentsListPage`, `InboxPage`, `RoutingPage`, `AuditLogsPage`.
- [ ] 10.3 Verify confirmation dialogs for reject/archive/delete in `DocumentDetailPage`.
- [ ] 10.4 Run `npm run typecheck && npm run lint` in `frontend/`.
- [ ] 10.5 Run `npm run typecheck && npm run lint` in `backend/`.
- [ ] 10.6 Add `concurrently` script `npm run dev:all` that runs backend + frontend together.

## 11. Acceptance

- [ ] 11.1 Run an end-to-end smoke against the seeded backend: register a doc → route to an office → recommend → approve → release → archive; assert each step writes a `DocumentHistory`, a `DocumentTracking`, and an `AuditLog` row.
- [ ] 11.2 Verify the audit interceptor rejects `prisma.auditLog.update` with `ImmutabilityError`.
- [ ] 11.3 Verify the dashboard summary matches the count of documents in each status.
- [ ] 11.4 Verify the SSE stream pushes a notification to the test recipient within 1 s.
