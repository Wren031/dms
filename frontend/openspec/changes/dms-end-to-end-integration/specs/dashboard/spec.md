## ADDED Requirements

### Requirement: Role-aware dashboard summary
The system SHALL expose `GET /dashboard/summary` returning counts scoped to the caller's role and office.

#### Scenario: Receiving officer summary
- **WHEN** an authenticated receiving officer requests the summary
- **THEN** the response SHALL include counts for: documents currently in their office's inbox, documents awaiting routing, urgent documents in their office
- **AND** SHALL NOT include organization-wide totals unless the caller is `system_admin`

#### Scenario: Reviewing officer summary
- **WHEN** an authenticated reviewing officer requests the summary
- **THEN** the response SHALL include counts for: documents assigned to the officer, pending-review documents, pending-approval documents, documents returned for revision

#### Scenario: System admin summary
- **WHEN** an authenticated system admin requests the summary
- **THEN** the response SHALL include global totals by status, by priority, by classification, plus overdue counts and completion rate

### Requirement: Recent activity feed
The system SHALL expose `GET /dashboard/recent-activity?limit=20` returning a chronological feed of `AuditLog` entries scoped to the caller's visibility.

#### Scenario: Paginated recent activity
- **WHEN** the dashboard loads
- **THEN** the recent-activity feed SHALL be paginated (default page size 20)
- **AND** each entry SHALL include `actorName`, `action`, `module`, `description`, `createdAt`
- **AND** the response SHALL be ordered `createdAt DESC`
