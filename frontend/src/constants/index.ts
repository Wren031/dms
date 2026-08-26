import type { DocumentStatus, DocumentType, DocumentClassification, UserRole, Permission } from '@/types';

export const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  registered: ['received', 'archived'],
  received: ['routed', 'registered', 'archived'],
  routed: ['under_review', 'returned', 'archived'],
  under_review: ['recommended', 'approved', 'rejected', 'returned'],
  recommended: ['approved', 'rejected', 'returned'],
  approved: ['released', 'returned'],
  rejected: ['archived'],
  returned: ['received', 'routed', 'under_review', 'archived'],
  released: ['archived'],
  archived: [],
};

export const canTransition = (
  from: DocumentStatus,
  to: DocumentStatus,
): boolean => (ALLOWED_TRANSITIONS[from] ?? []).includes(to);

export const ROLE_LABELS: Record<UserRole, string> = {
  system_admin: 'System Administrator',
  office_admin: 'Office Administrator',
  document_encoder: 'Document Encoder',
  document_officer: 'Document Officer',
};

export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  system_admin: 'System Admin',
  office_admin: 'Office Admin',
  document_encoder: 'Encoder',
  document_officer: 'Officer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  system_admin: 'Full system access. Manages users, offices, roles, and system configuration.',
  office_admin: 'Manages office operations, users within an office, and document workflows.',
  document_encoder: 'Encodes and registers incoming/outgoing documents into the system.',
  document_officer:
    'Receives, verifies, and reviews documents. Adds actions/comments/remarks and makes recommendations.',
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  system_admin: [
    'dashboard.view',
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete',
    'documents.register', 'documents.receive', 'documents.route', 'documents.review',
    'documents.recommend', 'documents.approve', 'documents.reject', 'documents.return',
    'documents.release', 'documents.archive', 'documents.track',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'offices.view', 'offices.create', 'offices.edit', 'offices.delete',
    'document_types.view', 'document_types.create', 'document_types.edit', 'document_types.delete',
    'roles.view', 'roles.edit',
    'audit.view',
    'notifications.view',
    'settings.view', 'settings.edit',
  ],
  office_admin: [
    'dashboard.view',
    'documents.view', 'documents.register', 'documents.receive', 'documents.route',
    'documents.review', 'documents.recommend', 'documents.approve', 'documents.reject',
    'documents.return', 'documents.release', 'documents.archive', 'documents.track',
    'users.view', 'users.create', 'users.edit',
    'offices.view', 'offices.edit',
    'document_types.view', 'document_types.create', 'document_types.edit',
    'audit.view',
    'notifications.view',
  ],
  document_encoder: [
    'dashboard.view',
    'documents.view', 'documents.create', 'documents.register', 'documents.track',
    'notifications.view',
  ],
  document_officer: [
    'dashboard.view',
    'documents.view', 'documents.receive', 'documents.route',
    'documents.review', 'documents.recommend',
    'documents.approve', 'documents.reject', 'documents.return', 'documents.release',
    'documents.track', 'documents.archive',
    'notifications.view',
  ],
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  registered: 'Registered',
  received: 'Received',
  routed: 'In Routing',
  under_review: 'Under Review',
  recommended: 'Recommended',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
  released: 'Released',
  archived: 'Archived',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  registered: 'bg-slate-100 text-slate-700 border-slate-200',
  received: 'bg-blue-50 text-blue-700 border-blue-200',
  routed: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-purple-50 text-purple-700 border-purple-200',
  recommended: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  returned: 'bg-orange-50 text-orange-700 border-orange-200',
  released: 'bg-teal-50 text-teal-700 border-teal-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-300',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  memo: 'Memorandum',
  letter: 'Letter',
  ordinance: 'Ordinance',
  resolution: 'Resolution',
  report: 'Report',
  contract: 'Contract',
  circular: 'Circular',
  others: 'Others',
};

export const DOCUMENT_CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  restricted: 'Restricted',
};

export const DOCUMENT_CLASSIFICATION_COLORS: Record<DocumentClassification, string> = {
  public: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  internal: 'bg-slate-100 text-slate-700 border-slate-200',
  confidential: 'bg-amber-50 text-amber-700 border-amber-200',
  restricted: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
} as const;

export const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
} as const;

export const DOCUMENT_WORKFLOW: DocumentStatus[] = [
  'registered',
  'received',
  'routed',
  'under_review',
  'recommended',
  'approved',
  'released',
  'archived',
];

export const ALL_DOCUMENT_STATUSES: DocumentStatus[] = [
  'registered',
  'received',
  'routed',
  'under_review',
  'recommended',
  'approved',
  'rejected',
  'returned',
  'released',
  'archived',
];

export const ALL_ROLES: UserRole[] = [
  'system_admin',
  'office_admin',
  'document_encoder',
  'document_officer',
];

export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'memo', 'letter', 'ordinance', 'resolution', 'report', 'contract', 'circular', 'others',
];

export const ALL_CLASSIFICATIONS: DocumentClassification[] = [
  'public', 'internal', 'confidential', 'restricted',
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const AVATAR_COLORS = [
  'bg-brand-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-purple-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
];
