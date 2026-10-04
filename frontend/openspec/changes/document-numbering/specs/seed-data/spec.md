> **Status: PARTIALLY IMPLEMENTED — deferred.** Not delivered by this change.
> `prisma/seed.ts` populates document types and reference data idempotently. It does **not** create
> 4 offices, ~12 users across all roles, or ~25 demo documents, and attaches no routing plans,
> reviews, releases, or audit rows. Current database: 19 offices, 8 users, 12 document types,
> 6 documents.

## ADDED Requirements

### Requirement: Seeded organizational hierarchy
The seed script SHALL create a hierarchy of offices: one main office, two divisions, and one unit per division. Each office SHALL have a unique `code`.

#### Scenario: Office tree
- **WHEN** the seed completes
- **THEN** the database SHALL contain 4 offices in a parent-child relationship
- **AND** the main office SHALL be the parent of the two divisions
- **AND** each division SHALL own one unit

### Requirement: Seeded users across all roles
The seed script SHALL create at least 12 users covering every `UserRole`: `system_admin`, `office_admin`, `document_encoder`, `receiving_officer`, `reviewing_officer`. Users SHALL be distributed across offices.

#### Scenario: Role coverage
- **WHEN** the seed completes
- **THEN** for each role there SHALL be at least one active user whose `employee.officeId` is set
- **AND** passwords SHALL be hashed via argon2id

### Requirement: Seeded document types
The seed script SHALL create document types for every `DocumentTypeCode` value with a human-readable `name`.

#### Scenario: DocumentType coverage
- **WHEN** the seed completes
- **THEN** the `DocumentType` table SHALL contain one row per `DocumentTypeCode` enum value

### Requirement: Seeded demo documents
The seed script SHALL create at least 25 documents with attachments, routing plans, reviews, releases, and audit history. The documents SHALL cover every `DocumentStatus` value.

#### Scenario: Status coverage
- **WHEN** the seed completes
- **THEN** at least one document SHALL exist in each `DocumentStatus` value
- **AND** each document SHALL have at least one entry in `DocumentHistory`
- **AND** documents in active statuses SHALL have at least one routing step

### Requirement: Seed idempotency
The seed script SHALL be idempotent: running it twice SHALL NOT duplicate rows.

#### Scenario: Re-run
- **WHEN** the seed is executed a second time after a successful run
- **THEN** existing seed rows SHALL be reused (lookup by stable key)
- **AND** NEW rows SHALL be added for any data that was missing (demo documents)
- **AND** no duplicate `documentNumber` or `trackingNumber` collisions SHALL occur
