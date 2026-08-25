export {
  useDocuments,
  useDocumentDetail,
  useRegisterDocument,
  useDocumentTransition,
  useDocumentHistory,
  useDocumentTimeline,
  useDocumentRouting,
} from '@/features/documents/hooks';

export {
  DocumentsApiError,
  documentsService,
  routingService,
} from '@/features/documents/services';

export type * from '@/features/documents/types';

export { DashboardPage } from '@/features/documents/pages/DashboardPage';
export { DocumentsListPage } from '@/features/documents/pages/DocumentsListPage';
export { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage';
export { DocumentRegistrationPage } from '@/features/documents/pages/DocumentRegistrationPage';
export { InboxPage } from '@/features/documents/pages/InboxPage';
export { OutboxPage } from '@/features/documents/pages/OutboxPage';
export { RoutingPage } from '@/features/documents/pages/RoutingPage';
export { ReviewPage } from '@/features/documents/pages/ReviewPage';
export { ReleasePage } from '@/features/documents/pages/ReleasePage';
export { TrackingPage } from '@/features/documents/pages/TrackingPage';
export { ArchivePage } from '@/features/documents/pages/ArchivePage';
