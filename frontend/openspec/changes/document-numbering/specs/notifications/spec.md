> **Status: IMPLEMENTED.** Not delivered by this change.
> All four documented endpoints exist (`GET /notifications`, `GET /notifications/unread-count`,
> `POST /notifications/mark-read`, `POST /notifications/mark-all-read`) plus `GET /notifications/stream`
> for SSE. 77 rows present. Accurate as written.

## ADDED Requirements

### Requirement: Persistent notifications
The system SHALL persist every notification as a `Notification` row with `userId`, `type` (`document|system|reminder`), `title`, `message`, `link?`, `read`, `readAt?`, `createdAt`.

#### Scenario: Publish on transition
- **WHEN** `WorkflowService.transition` advances a document
- **THEN** the server SHALL publish exactly one `Notification` to the appropriate user (next holder, approver, or originator)
- **AND** the notification SHALL carry a `link` to `/documents/<id>` when applicable

### Requirement: Notification API
The system SHALL expose `GET /notifications` (paginated), `GET /notifications/unread-count`, `POST /notifications/mark-read`, and `POST /notifications/mark-all-read`.

#### Scenario: List notifications
- **WHEN** an authenticated user requests `GET /notifications?page=1&pageSize=20`
- **THEN** the server SHALL return only that user's notifications, ordered `createdAt DESC`

#### Scenario: Mark as read
- **WHEN** a user posts to `POST /notifications/mark-read` with a list of `ids`
- **THEN** the server SHALL set `read=true`, `readAt=now` for those rows whose `userId` matches the caller

### Requirement: SSE stream
The system SHALL expose `GET /notifications/stream` (Server-Sent Events) that pushes a `NotificationEvent` payload whenever a new notification is created for the authenticated user.

#### Scenario: SSE push on new notification
- **WHEN** the backend publishes a new notification for user X
- **AND** user X has an open SSE connection
- **THEN** the stream SHALL send an event matching the notification payload

#### Scenario: SSE is user-scoped
- **WHEN** user Y opens an SSE connection
- **THEN** only user Y's notifications SHALL be pushed to that connection
