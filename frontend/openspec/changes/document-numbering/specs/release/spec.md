> **Status: IMPLEMENTED.** Not delivered by this change.
> `ReleaseMethod` is exactly `pickup | email | courier | hand_delivery` in `schema.prisma:91`,
> and `document-release` is a live module. Accurate as written.

## ADDED Requirements

### Requirement: Release approved documents
The system SHALL allow a releasing officer to release an approved document to a recipient. Release records SHALL have `releasedById`, `releasedToId?`, `method` (`pickup|email|courier|hand_delivery`), `recipientName?`, `notes?`, `releasedAt`.

#### Scenario: Release an approved document
- **WHEN** an authorized releasing officer posts a release against an `approved` document
- **THEN** the server SHALL create a `DocumentRelease` row
- **AND** SHALL set `Document.status = 'released'`
- **AND** SHALL write a `DocumentHistory` row
- **AND** SHALL write a `DocumentTracking` event with `event='document.released'`
- **AND** SHALL publish a `Notification` to the originator

#### Scenario: Release a non-approved document is rejected
- **WHEN** a release is attempted against a document whose status is not `approved`
- **THEN** the server SHALL return `400 Bad Request` with the message `Only approved documents can be released`
- **AND** SHALL NOT mutate the document or release tables
