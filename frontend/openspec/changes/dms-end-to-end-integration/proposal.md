# DMS End-to-End Integration

## Why

The Document Management System repository already contains a fully modeled NestJS + Prisma backend (auth, documents, routing, review, release, archive, notifications, audit-logs) and a complete React + Tailwind frontend UI shell. The two halves have never been connected: every frontend page consumes `/mocks/*`, the auth provider is a `localStorage` demo picker, and several capabilities required by the developer requirements document — most notably an automatic audit trail, the dual document-number model, role/office/holder permission checks at the service layer, server-driven dashboard statistics, and notification fan-out on workflow events — are missing or only partially implemented.

This change wires the existing halves together, fills the gap between the requirements and the code, and produces a runnable end-to-end system that exercises the full lifecycle (register → route → review → approve → release → archive) with a complete, append-only audit history.

## What Changes

- **Backend**
  - Add `Document.documentNumber` (organizational reference, unique per `originatingOfficeId`) alongside the existing auto-generated `trackingNumber`. Add a server-side suggestion helper and uniqueness validation.
  - Introduce a global audit interceptor (`APP_INTERCEPTOR`) that captures every write request on privileged modules and appends an immutable `AuditLog` row inside the same transaction as the business write. Make the audit table append-only via a Prisma client extension that throws on `update`/`delete`.
  - Centralize workflow state transitions in a new `WorkflowService` that, for every transition, runs `document update` + `DocumentHistory` insert + `DocumentTracking` event + `Notification` publish in a single Prisma transaction. Wire this into the existing `documents`, `document-routing`, `document-review`, `document-release`, and `document-archive` services.
  - Add `PoliciesService` that asserts the caller's role permission, office membership, and document holder status before any transition is applied. Permissions enforced server-side (the existing `RolesGuard` is route-level only).
  - Add `GET /dashboard/summary` and `GET /dashboard/recent-activity` returning role/office-aware counts and a recent-activity feed.
  - Author `prisma/seed.ts` with 4 offices, ~12 users across all 5 roles, ~25 demo documents covering every status, with attachments, routing plans, reviews, releases, and audit history.
  - Backend status naming harmonization: API keeps `routed`; frontend maps `in_routing` ↔ `routed` at the integration boundary.

- **Frontend**
  - Add `@tanstack/react-query`, `react-hook-form`, `zod`, `date-fns` (if absent).
  - Replace `/mocks/*` with a typed HTTP client (`src/lib/api.ts`) handling cookies, the `X-XSRF-TOKEN` header, refresh-on-401 retry, and pagination.
  - Rewrite `useAuth` to use real `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/refresh`. Drop the demo user picker from production builds; keep it behind `import.meta.env.DEV` for local exploration.
  - Replace every feature page's data source with TanStack Query hooks: `useDashboardSummary`, `useDocuments`, `useDocument`, `useDocumentMutations`, `useRoutingPlan`, `useReviewActions`, `useReleaseActions`, `useArchiveActions`, `useNotifications`, `useNotificationsStream` (SSE), `useAuditLogs`, `useOffices`, `useUsers`, `useDocumentTypes`.
  - Wire all workflow modals (recommend / approve / reject / return / release / archive) and the routing-plan builder to the corresponding endpoints.
  - Implement the registration flow as: presigned upload (if attachments present) → `POST /documents` → success. Form validation aligned to `CreateDocumentDto` via `zod`.
  - Add a `FileUploadField` component that handles presigned uploads with progress, retries, and max-size enforcement.

## Capabilities

### New Capabilities

- `documents`: document lifecycle (registration, dual numbering, status transitions, holders, attachments, classification, priority).
- `routing`: routing plans, advance steps, current-office/holder updates.
- `review`: review actions (recommend / approve / reject / return / comment) and resulting transitions.
- `release`: releasing approved documents with method and recipient.
- `archive`: archiving completed documents with retention metadata.
- `audit-trail`: append-only audit history for every privileged action, with module / action / actor / metadata.
- `dashboard`: role-aware summary statistics and recent activity feed.
- `notifications`: persistent notifications backed by database + SSE push.
- `permissions`: centralized policies with role, office, and holder checks enforced server-side.
- `frontend-integration`: HTTP client, TanStack Query layer, query/mutation hooks per feature, mock-removal.
- `seed-data`: offices, users, document types, demo documents covering every workflow stage.

### Modified Capabilities

None (no prior specs exist; the above list creates the initial capability surface).

## Impact

- **Backend code**: new `src/modules/workflow/*`, `src/common/interceptors/audit.interceptor.ts`, `src/common/services/policies.service.ts`, `src/modules/dashboard/*`; modifications to `src/prisma/schema.prisma`, `src/prisma/prisma.service.ts` (append-only extension), and modules `documents`, `document-routing`, `document-review`, `document-release`, `document-archive`, `notifications`, `audit-logs`. New `prisma/seed.ts`.
- **Backend dependencies**: none added (`@prisma/client` already covers JSON). Migration required.
- **Frontend code**: new `src/lib/api.ts`, `src/lib/documentStatus.ts`, `src/hooks/queries/*`, `src/providers/QueryProvider.tsx`; rewrite of `src/hooks/useAuth.tsx`; per-page data-source conversions in `src/features/*/pages/*`; deletion of `src/mocks/*` consumption (file kept only where used as fallback during transition).
- **Frontend dependencies**: `@tanstack/react-query`, `react-hook-form`, `zod`, optional `date-fns`.
- **APIs**: new `GET /dashboard/summary`, `GET /dashboard/recent-activity`. No breaking changes to existing endpoints (additive).
- **Data**: a new migration adds `Document.documentNumber`. A seed run resets demo data.
- **Non-breaking for clients of the existing API**: existing controller paths continue to work; they now route through `WorkflowService` for any state-machine writes.
