## ADDED Requirements

### Requirement: Centralized policy enforcement
The system SHALL enforce role/office/holder permission checks via a single `PoliciesService` invoked from `WorkflowService.transition` for every business write. The existing route-level `RolesGuard` remains in place as a first filter.

#### Scenario: Office boundary on transition
- **WHEN** a non-admin user attempts to transition a document whose `currentOfficeId` is not in their office's subtree
- **THEN** `PoliciesService` SHALL throw `ForbiddenException`
- **AND** the document SHALL NOT be mutated

#### Scenario: Holder requirement for review action
- **WHEN** a non-admin user attempts to recommend/approve/reject/return a document whose `currentHolderId` is not themselves
- **THEN** `PoliciesService` SHALL throw `ForbiddenException`

#### Scenario: System admin bypass
- **WHEN** an authenticated `system_admin` attempts any of the above
- **THEN** all office/holder checks SHALL be bypassed
- **AND** the role permission check SHALL still apply

### Requirement: Permission matrix
The system SHALL maintain a static role-permission matrix in code (no DB-backed permissions in this change). The matrix SHALL cover: `documents.*`, `users.*`, `offices.*`, `roles.*`, `audit.*`, `notifications.*`.

#### Scenario: Action denied when role lacks permission
- **WHEN** a role lacks the required permission for the action
- **THEN** `PoliciesService.roleHas` SHALL return `false`
- **AND** the workflow call SHALL throw `ForbiddenException` with message `Insufficient role`
