> **Status: IMPLEMENTED.** Not delivered by this change.
> `ReviewActionKind` (`schema.prisma:83`) carries all five documented actions —
> `recommended | approved | rejected | returned | commented`. Note these are review *actions*,
> distinct from `DocumentStatus`, which has no `recommended`/`returned` value. Accurate as written.

## ADDED Requirements

### Requirement: Review actions
The system SHALL allow a reviewer to record one of the following review actions on a document: `recommended`, `approved`, `rejected`, `returned`, `commented`.

#### Scenario: Recommend
- **WHEN** a reviewer posts `action='recommended'`
- **THEN** the server SHALL persist a `DocumentReview` row
- **AND** SHALL update `Document.status = 'recommended'`
- **AND** SHALL write a `DocumentHistory` row
- **AND** SHALL publish a `Notification` to the approver role in the originating office

#### Scenario: Approve
- **WHEN** a reviewer posts `action='approved'` and the current document status is `under_review` or `recommended`
- **THEN** the server SHALL set `Document.status = 'approved'`
- **AND** SHALL write a `DocumentHistory` row
- **AND** SHALL publish a `Notification` to the releasing officer

#### Scenario: Reject
- **WHEN** a reviewer posts `action='rejected'`
- **THEN** the server SHALL set `Document.status = 'rejected'`
- **AND** SHALL record the reviewer's remarks
- **AND** SHALL publish a `Notification` to the encoder

#### Scenario: Return for revision
- **WHEN** a reviewer posts `action='returned'`
- **THEN** the server SHALL set `Document.status = 'returned'`
- **AND** SHALL publish a `Notification` to the previous office

#### Scenario: Comment without transition
- **WHEN** a reviewer posts `action='commented'`
- **THEN** the server SHALL persist a `DocumentReview` row WITHOUT changing `Document.status`

### Requirement: Review guardrails
The system SHALL reject review actions that are inconsistent with the document's current status.

#### Scenario: Approve on non-reviewable status
- **WHEN** a reviewer attempts to approve a document whose status is not `under_review` or `recommended`
- **THEN** the server SHALL return `400 Bad Request`
- **AND** SHALL NOT persist the review or change the status
