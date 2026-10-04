> **Status: IMPLEMENTED.** Not delivered by this change.
> `audit.interceptor.ts` is registered as `APP_INTERCEPTOR`, `audit.decorator.ts` exists with 34
> `@Audit()` decorations, and `GET /audit-logs` supports all six documented filters
> (`module`, `action`, `targetType`, `actorId`, `dateFrom`, `dateTo`) plus ordering. Accurate as written.

## ADDED Requirements

### Requirement: Automatic audit capture
The system SHALL write an `AuditLog` row inside the same database transaction as every privileged business write (controllers annotated with `@Audit`). Records SHALL be append-only.

#### Scenario: Privileged write audited
- **WHEN** an authorized user posts to a controller annotated with `@Audit('documents.approve', 'documents')`
- **THEN** the server SHALL create an `AuditLog` row with `module`, `action`, `actorId`, `targetId`, `targetType`, `ipAddress`, `userAgent`, `metadata` snapshot of the request body

#### Scenario: Append-only enforcement
- **WHEN** any code attempts `prisma.auditLog.update` or `prisma.auditLog.delete`
- **THEN** the client extension SHALL throw an `ImmutabilityError`
- **AND** the row SHALL remain unchanged

### Requirement: Workflow history captured separately
The system SHALL also persist a per-document `DocumentHistory` row for every status transition and a `DocumentTracking` row for every meaningful event — distinct from the system-wide `AuditLog`.

#### Scenario: Transition writes both
- **WHEN** `WorkflowService.transition` runs
- **THEN** it SHALL write a `DocumentHistory` row (with `fromStatus`, `toStatus`, `actorId`, `remarks`)
- **AND** it SHALL write a `DocumentTracking` row (with `event`, `payload`)
- **AND** it SHALL write the corresponding `AuditLog` row via the global interceptor

### Requirement: Audit query API
The system SHALL expose `GET /audit-logs` for authorized users (system_admin, office_admin) with filters: `module`, `action`, `targetType`, `actorId`, `dateFrom`, `dateTo`, plus pagination.

#### Scenario: Filtered audit listing
- **WHEN** an admin requests audit logs filtered by `module='documents'` and `dateFrom='2026-01-01'`
- **THEN** the server SHALL return only matching rows ordered by `createdAt DESC`, paginated
- **AND** non-admins SHALL receive `403 Forbidden`

### Requirement: Per-document audit trail
The system SHALL expose `GET /documents/:id/timeline` returning the full ordered event log (`DocumentTracking`) for a document, and `GET /documents/:id/history` returning the status-change log (`DocumentHistory`).

#### Scenario: Timeline query
- **WHEN** a user opens the document detail page
- **THEN** the timeline endpoint SHALL return every event in chronological order
- **AND** unauthorized users SHALL receive `403 Forbidden`
