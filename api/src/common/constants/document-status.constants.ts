import { DocumentStatus } from '@prisma/client';

export const DOCUMENT_WORKFLOW: DocumentStatus[] = [
  'registered',
  'received',
  'routed',
  'assigned',
  'under_review',
  'recommended',
  'approved',
  'released',
  'archived',
];

export const DOCUMENT_TERMINAL_STATUSES: DocumentStatus[] = [
  'archived',
  'rejected',
];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  registered: 'Registered',
  received: 'Received',
  routed: 'In Routing',
  assigned: 'Assigned',
  under_review: 'Under Review',
  recommended: 'Recommended',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
  released: 'Released',
  archived: 'Archived',
};

export function isValidDocumentStatus(value: string): value is DocumentStatus {
  return (DOCUMENT_WORKFLOW as string[]).includes(value)
    || ['rejected', 'returned'].includes(value);
}
