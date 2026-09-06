export type DocumentTypeCode =
  | 'memo'
  | 'letter'
  | 'ordinance'
  | 'resolution'
  | 'report'
  | 'contract'
  | 'circular'
  | 'others';

export interface DocumentTypeRecord {
  id: string;
  codes: DocumentTypeCode[];
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number };
}

export interface DocumentTypeListResponse {
  items: DocumentTypeRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DocumentTypeListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  code?: DocumentTypeCode;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateDocumentTypePayload {
  codes: DocumentTypeCode[];
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDocumentTypePayload {
  codes?: DocumentTypeCode[];
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export const DOCUMENT_TYPE_CODES: DocumentTypeCode[] = [
  'memo',
  'letter',
  'ordinance',
  'resolution',
  'report',
  'contract',
  'circular',
  'others',
];

export const DOCUMENT_TYPE_CODE_LABELS: Record<DocumentTypeCode, string> = {
  memo: 'Memorandum',
  letter: 'Letter',
  ordinance: 'Ordinance',
  resolution: 'Resolution',
  report: 'Report',
  contract: 'Contract',
  circular: 'Circular',
  others: 'Others',
};

export const DOCUMENT_TYPE_CODE_DESCRIPTIONS: Record<DocumentTypeCode, string> = {
  memo: 'Internal memos and brief communications between offices.',
  letter: 'Formal letters to external parties or other agencies.',
  ordinance: 'Local ordinances enacted by the city council.',
  resolution: 'Formal expressions of the council or governing body.',
  report: 'Activity, accomplishment, and status reports.',
  contract: 'Contracts, MOUs, and other binding agreements.',
  circular: 'Circulars and advisories for general circulation.',
  others: 'Other document types that do not fit the standard categories.',
};
