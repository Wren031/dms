export { DocumentTypesPage } from '@/features/system-admin/document-type/pages/DocumentTypesPage';
export { DocumentTypeDetailPage } from '@/features/system-admin/document-type/pages/DocumentTypeDetailPage';

export { useDocumentTypes } from '@/features/system-admin/document-type/hooks/useDocumentTypes';

export { ApiError, documentTypeService } from '@/features/system-admin/document-type/services/document-type.service';

export type {
  CreateDocumentTypePayload,
  DocumentTypeCode,
  DocumentTypeListFilters,
  DocumentTypeListResponse,
  DocumentTypeRecord,
  UpdateDocumentTypePayload,
} from '@/features/system-admin/document-type/types/document-type';

export {
  DOCUMENT_TYPE_CODES,
  DOCUMENT_TYPE_CODE_DESCRIPTIONS,
  DOCUMENT_TYPE_CODE_LABELS,
} from '@/features/system-admin/document-type/types/document-type';

export {
  DocumentTypeCodeBadge,
  DocumentTypeFormModal,
  DocumentTypeStatCard,
  DocumentTypeStatusBadge,
} from '@/features/system-admin/document-type/components';
