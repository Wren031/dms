> **Status: IMPLEMENTED (path differs).** Not delivered by this change.
> `document-archive` exposes `POST /`, `GET /`, `GET /:id`, `PATCH /:id`. This spec asks for
> `GET /documents/archive`, which does not exist — the list lives on the module's own controller.
> Reconcile the documented path with the shipped route before treating this spec as authoritative.

## ADDED Requirements

### Requirement: Archive completed documents
The system SHALL allow a system or office admin to archive a completed document. Archived documents SHALL preserve their full history and SHALL remain queryable.

#### Scenario: Archive allowed document
- **WHEN** an admin archives a document whose status is one of `released`, `rejected`, `returned`, `approved`
- **THEN** the server SHALL create a `DocumentArchive` row with `location`, `retentionUntil?`, `archivedAt`, `archivedById`
- **AND** SHALL set `Document.status = 'archived'`
- **AND** SHALL write a `DocumentHistory` row

#### Scenario: Archive rejected status
- **WHEN** a document is in status `rejected` and an admin archives it
- **THEN** the document SHALL be moved to `archived` without losing the rejection history

#### Scenario: Archive disallowed status
- **WHEN** a document is in status `received` or `routed` or `under_review`
- **THEN** the server SHALL return `400 Bad Request`

### Requirement: Archive retention metadata
The system SHALL store optional `location` (physical storage label) and `retentionUntil` (Date) on every archive row.

#### Scenario: Retention date in the future
- **WHEN** a retention date is supplied
- **THEN** the server SHALL persist it
- **AND** SHALL expose it via `GET /documents/:id` and `GET /documents/archive`
