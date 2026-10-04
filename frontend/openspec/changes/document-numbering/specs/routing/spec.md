> **Status: NOT IMPLEMENTABLE AS WRITTEN — deferred.** Not delivered by this change.
> This spec requires `Document.status = 'routed'` and `= 'returned'`. Neither value exists in the
> `DocumentStatus` enum in `schema.prisma:36` or `frontend/.../types/document.ts:3`, and
> `ALLOWED_TRANSITIONS` is typed `Record<DocumentStatus, DocumentStatus[]>`, so a `routed` edge
> will not compile until the enum gains the value. Adding it needs an enum migration, client
> regeneration, and updates to `ALLOWED_TRANSITIONS`, `TRANSITION_ROLES`, `TRANSITION_PERMISSIONS`,
> the frontend union, and every status label, filter, and badge.
>
> Routing is also a **second distribution paradigm**. The live model fans documents out to many
> offices in parallel via `DocumentRecipient` (108 rows); this spec relays them sequentially
> through ordered steps. Implementing both means two mechanisms writing to the same
> `Document.status`. `DocumentRoutingStep`, `RoutingStepStatus`, and `Document.routingSteps` remain
> in `schema.prisma` as unused scaffolding (0 rows, no module, no page). Decide the enum and the
> fan-out/relay relationship before implementing; track it as a separate change.

## ADDED Requirements

### Requirement: Routing plans
The system SHALL allow an authorized user to define an ordered set of routing steps for a document. Each step SHALL have `sequence`, `fromOfficeId`, `fromUserId?`, `toOfficeId`, `toUserId?`, `instructions`, `status` (`pending|received|in_progress|completed|returned`), `receivedAt?`, `completedAt?`, `remarks?`.

#### Scenario: Create or replace a plan
- **WHEN** an authorized user posts a routing plan for a document
- **THEN** the server SHALL delete any prior steps for that document
- **AND** SHALL insert the new steps in `sequence` order
- **AND** SHALL return the plan ordered by `sequence`

#### Scenario: Empty plan rejected
- **WHEN** the plan has zero steps
- **THEN** the server SHALL return `400 Bad Request`

### Requirement: Advance routing steps
The system SHALL allow advancing a routing step to a new status, recording when the step was received or completed.

#### Scenario: Mark step received
- **WHEN** an authorized user advances a step to `received`
- **THEN** the server SHALL set `receivedAt = now`
- **AND** SHALL write a `DocumentTracking` event with `event='routing.advance'`
- **AND** SHALL persist a route in `DocumentHistory` capturing the previous status

#### Scenario: Mark step completed
- **WHEN** an authorized user advances the active step to `completed`
- **THEN** the server SHALL set `completedAt = now`
- **AND** SHALL update the document's `currentOfficeId = step.toOfficeId`
- **AND** SHALL update `currentHolderId = step.toUserId` when present
- **AND** SHALL set `Document.status = 'routed'`
- **AND** SHALL publish a `Notification` to the new holder

#### Scenario: Return a step
- **WHEN** a step is advanced to `returned`
- **THEN** the server SHALL set `completedAt = now`
- **AND** SHALL set `Document.status = 'returned'`
- **AND** SHALL publish a `Notification` to the previous office
