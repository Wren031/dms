## ADDED Requirements

### Requirement: Dual document identifiers
The system SHALL provide two independent identifiers for every document: a user-supplied `documentNumber` (organizational reference, unique per originating office) and an auto-generated `trackingNumber` (system-wide unique, format `<AGENCY>-<YEAR>-<NNNN>`).

#### Scenario: Auto-generated tracking number
- **WHEN** a new document is created
- **THEN** the server SHALL generate a `trackingNumber` matching the pattern `DMS-YYYY-NNNN`
- **AND** the value SHALL be globally unique

#### Scenario: User-supplied document number
- **WHEN** an encoder submits a new document with a `documentNumber`
- **THEN** the server SHALL validate that the value is non-empty, ≤ 100 chars
- **AND** SHALL reject creation with `409 Conflict` if another document in the same `originatingOfficeId` already uses the value

#### Scenario: Server-side document number suggestion
- **WHEN** an encoder requests a suggested number for their office
- **THEN** the server SHALL return the next sequential `OFFICE-CODE/YYYY/NNNN`
- **AND** the encoder SHALL be able to override the suggestion before submission

### Requirement: Document registration validation
The system SHALL validate all required registration fields before persisting a document.

#### Scenario: Missing required field
- **WHEN** a registration request omits `title`, `typeId`, `classification`, `source`, `originatingOfficeId`, or `currentOfficeId`
- **THEN** the server SHALL return `400 Bad Request`
- **AND** the response SHALL list every missing/invalid field

#### Scenario: Valid registration
- **WHEN** all required fields are valid
- **THEN** the server SHALL persist the document with `status='registered'`
- **AND** SHALL write a `DocumentHistory` row (null → registered)
- **AND** SHALL write a `DocumentTracking` row with `event='document.registered'`
- **AND** SHALL write an `AuditLog` row with `module='documents'`, `action='register'`, `actorId=<encoder>`

### Requirement: Document status lifecycle
The system SHALL enforce the canonical workflow `REGISTERED → RECEIVED → ROUTED → UNDER_REVIEW → RECOMMENDED → APPROVED → RELEASED → ARCHIVED` with side branches `REJECTED` and `RETURNED`.

#### Scenario: Allowed transition
- **WHEN** an authorized user requests a transition whose edge is defined in the state machine
- **THEN** the server SHALL update `Document.status`, write a `DocumentHistory` row, write a `DocumentTracking` event, publish a `Notification` to the next handler, and return the updated document — all inside one Prisma transaction

#### Scenario: Forbidden transition
- **WHEN** a transition edge is not defined in the state machine
- **THEN** the server SHALL return `400 Bad Request` with message `Cannot transition from X to Y`
- **AND** SHALL NOT mutate the document, history, tracking, or notifications

### Requirement: Document metadata
The system SHALL persist the following metadata for each document: `title`, `description`, `typeId`, `classification` (`public|internal|confidential|restricted`), `priority` (`low|normal|high|urgent`), `source` (`internal|external`), `senderName`, `originatingOfficeId`, `currentOfficeId`, `currentHolderId`, `encodedById`, `receivedById`, `dateReceived`, `dueDate`, `tags[]` (≤ 20 items, ≤ 50 chars each).

#### Scenario: Persist classification and priority
- **WHEN** a document is created with classification `confidential` and priority `urgent`
- **THEN** both values SHALL be persisted as enums
- **AND** SHALL be visible in the document detail response

### Requirement: Attachments
The system SHALL allow 0..N attachments per document. Each attachment SHALL have `fileName`, `mimeType`, `sizeBytes`, `storageKey`, `uploadedById`, `uploadedAt`, and `status` (`uploaded|deleted`).

#### Scenario: Presigned upload
- **WHEN** a client requests an upload URL for a document
- **THEN** the server SHALL return a presigned `PUT` URL (≤ 15 min TTL) plus a `storageKey`
- **AND** SHALL NOT yet create a `DocumentAttachment` row

#### Scenario: Confirm upload
- **WHEN** the client confirms an upload
- **THEN** the server SHALL create the `DocumentAttachment` row, link it to the `documentId`, and record `uploadedById`
- **AND** SHALL write an `AuditLog` row with `action='attachment.confirm'`

#### Scenario: Soft delete
- **WHEN** an authorized user deletes an attachment
- **THEN** the server SHALL set `status='deleted'` (not remove the row)
- **AND** SHALL delete the object from storage
- **AND** SHALL write an `AuditLog` row
