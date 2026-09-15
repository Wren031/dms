import { DocumentStatus } from '@prisma/client';

export const DOCUMENT_WORKFLOW: DocumentStatus[] = [
  'registered',
  'received',
  'approved',
  'released',
];

export const DOCUMENT_TERMINAL_STATUSES: DocumentStatus[] = [
  'archived',
  'rejected',
];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  registered: 'Registered',
  received: 'Received',
  approved: 'Approved',
  rejected: 'Rejected',
  released: 'Released',
  archived: 'Archived',
};

export function isValidDocumentStatus(value: string): value is DocumentStatus {
  return (DOCUMENT_WORKFLOW as string[]).includes(value)
    || ['rejected', 'archived'].includes(value);
}
