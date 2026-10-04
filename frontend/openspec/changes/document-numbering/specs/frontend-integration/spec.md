> **Status: SUPERSEDED — goal met differently.** Not delivered by this change.
> `@tanstack/react-query`, `react-hook-form`, `zod`, and `date-fns` are **not installed**, and
> `src/lib/api.ts` / `src/providers/QueryProvider.tsx` / `src/hooks/queries/*` do not exist.
> The underlying goal is met: `src/mocks` is deleted with 0 remaining imports, and every page reads
> from the real backend through feature-scoped hooks (`src/features/*/hooks/`) plus a shared
> `request` helper. `useAuth` uses the real API with no `localStorage`. Adding TanStack Query would
> replace a data layer that works. Rewrite this requirement against the shipped hooks.

## ADDED Requirements

### Requirement: HTTP client
The frontend SHALL provide a typed `apiFetch(path, init)` helper that handles CSRF, cookies, refresh-on-401, error normalization, and JSON parsing for every backend call.

#### Scenario: Authenticated GET
- **WHEN** the caller makes an authenticated request
- **THEN** `credentials: 'include'` SHALL be set
- **AND** the `X-XSRF-TOKEN` header SHALL mirror the `dms_csrf` cookie for unsafe methods

#### Scenario: Silent refresh on 401
- **WHEN** the server returns `401`
- **THEN** the client SHALL call `POST /auth/refresh` once
- **AND** on success SHALL retry the original request
- **AND** on failure SHALL surface the `ApiError`

#### Scenario: Error normalization
- **WHEN** the server returns a 4xx/5xx with a JSON body
- **THEN** the client SHALL throw an `ApiError` carrying `status`, `code`, `message`, and any `details`

### Requirement: Auth provider rewrite
The frontend SHALL replace the localStorage-based demo auth with a real provider backed by `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/refresh`.

#### Scenario: Login
- **WHEN** the user submits valid credentials
- **THEN** the client SHALL `POST /auth/login`, store the user in memory, and navigate to `/dashboard`
- **AND** on failure SHALL display the server's message inline

#### Scenario: Logout
- **WHEN** the user clicks logout
- **THEN** the client SHALL `POST /auth/logout` and clear in-memory user state

#### Scenario: Session restoration on reload
- **WHEN** the page reloads with valid cookies
- **THEN** the client SHALL call `GET /auth/me`
- **AND** SHALL rehydrate the user before rendering protected routes

### Requirement: TanStack Query layer
The frontend SHALL install `@tanstack/react-query` and provide a single `QueryClient` via a `QueryProvider`. Per-feature hooks (`useDocuments`, `useDocument`, `useDashboardSummary`, `useNotifications`, `useAuditLogs`, etc.) SHALL encapsulate fetching and mutation.

#### Scenario: Cache invalidation on transition
- **WHEN** a mutation (e.g. `approve`) succeeds
- **THEN** the mutation's `onSuccess` SHALL invalidate the relevant query keys (`['document', id]`, `['documents']`, `['dashboard', 'summary']`)

#### Scenario: Optimistic UI for review
- **WHEN** a user submits a review action
- **THEN** the mutation MAY optimistically update the status in cache
- **AND** SHALL roll back on server error

### Requirement: Status-name harmonization
The frontend SHALL convert `in_routing` â†” `routed` at the integration boundary in `src/lib/documentStatus.ts`.

#### Scenario: Outgoing payload
- **WHEN** the frontend sends `currentOfficeId` or a filter `status`
- **THEN** outgoing payloads SHALL use the backend's status names
- **AND** incoming payloads SHALL be normalized to the frontend's display labels

### Requirement: Mock-data removal
After the integration, feature pages SHALL NOT import from `/mocks/*`. The mocks directory MAY remain in the repo for reference but SHALL NOT be referenced by runtime code.

#### Scenario: Production builds contain no mock imports
- **WHEN** `npm run build` runs
- **THEN** the resulting bundle SHALL NOT contain any path referencing `/src/mocks/*`
- **AND** `grep -r "from '@/mocks/" src` SHALL return zero matches across `features/`, `hooks/`, `components/`

### Requirement: Form validation
The registration and routing-plan forms SHALL use `react-hook-form` + `zod` schemas aligned to backend DTOs (`CreateDocumentDto`, `CreateRoutingPlanDto`).

#### Scenario: Field-level validation
- **WHEN** an encoder submits the registration form with an empty title
- **THEN** the form SHALL display an inline `Title is required` message
- **AND** SHALL NOT post to the server

#### Scenario: Server-side error surfaced inline
- **WHEN** the server returns `409` due to duplicate `documentNumber`
- **THEN** the form SHALL display the server's message next to the `documentNumber` field
