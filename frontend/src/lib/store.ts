import { useSyncExternalStore } from 'react';
import type { AuditLog, Document, DocumentAttachment, DocumentStatus, Notification, RoutingStep } from '@/types';
import { seedAuditLogs } from '@/mocks/auditLogs';
import { seedDocuments } from '@/mocks/documents';
import { seedNotifications } from '@/mocks/notifications';
import { seedRoutingSteps } from '@/mocks/routes';
import { users, getUserById } from '@/mocks/users';

type StoreState = {
  documents: Document[];
  routingSteps: RoutingStep[];
  auditLogs: AuditLog[];
  notifications: Notification[];
};

const subscribers = new Set<() => void>();

const state: StoreState = {
  documents: [...seedDocuments],
  routingSteps: [...seedRoutingSteps],
  auditLogs: [...seedAuditLogs],
  notifications: [...seedNotifications],
};

let cachedSnapshot: StoreState = {
  documents: state.documents,
  routingSteps: state.routingSteps,
  auditLogs: state.auditLogs,
  notifications: state.notifications,
};

const getSnapshot = (): StoreState => cachedSnapshot;

const notify = () => {
  cachedSnapshot = {
    documents: state.documents,
    routingSteps: state.routingSteps,
    auditLogs: state.auditLogs,
    notifications: state.notifications,
  };
  subscribers.forEach(fn => fn());
};

const subscribe = (cb: () => void) => {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
};

const useStoreSnapshot = (): StoreState =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

const generateId = (prefix: string) => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
};

const currentYear = new Date().getFullYear();

const generateTrackingNumber = () => {
  const seq = state.documents.length + 1;
  return `DMS-${currentYear}-${String(seq).padStart(4, '0')}`;
};

const nowIso = () => new Date().toISOString();

export const store = {
  getDocuments: () => state.documents,
  getDocument: (id: string) => state.documents.find(d => d.id === id),
  getRoutingSteps: (documentId: string) =>
    state.routingSteps
      .filter(r => r.documentId === documentId)
      .sort((a, b) => a.sequence - b.sequence),
  getAuditLogs: (documentId?: string) =>
    documentId
      ? state.auditLogs.filter(l => l.targetId === documentId)
      : state.auditLogs,
  getNotifications: (userId?: string) =>
    userId ? state.notifications.filter(n => n.userId === userId) : state.notifications,
};

export interface RegisterDocumentInput {
  documentNumber?: string;
  title: string;
  type: Document['type'];
  classification: Document['classification'];
  source: 'internal' | 'external';
  senderName?: string;
  description: string;
  priority: Document['priority'];
  originatingOfficeId: string;
  receivingOfficeId?: string;
  destinationOfficeId?: string;
  dateReceived?: string;
  dueDate?: string;
  tags: string[];
  attachments: Array<Omit<DocumentAttachment, 'id' | 'uploadedAt'>>;
  encodedById: string;
  initialHolderId?: string;
  initialStatus?: DocumentStatus;
}

export const registerDocument = (input: RegisterDocumentInput): Document => {
  const id = generateId('doc');
  const encodedBy = getUserById(input.encodedById);
  const initialStatus: DocumentStatus = input.initialStatus ?? 'registered';
  const initialHolderId = input.initialHolderId ?? input.encodedById;
  const currentOfficeId = input.receivingOfficeId ?? input.originatingOfficeId;

  const doc: Document = {
    id,
    documentNumber: input.documentNumber?.trim() || generateTrackingNumber(),
    trackingNumber: generateTrackingNumber(),
    title: input.title.trim(),
    type: input.type,
    classification: input.classification,
    status: initialStatus,
    originatingOfficeId: input.originatingOfficeId,
    receivingOfficeId: input.receivingOfficeId,
    destinationOfficeId: input.destinationOfficeId,
    currentOfficeId,
    currentHolderId: initialHolderId,
    encodedById: input.encodedById,
    receivedById: input.receivingOfficeId ? input.encodedById : undefined,
    source: input.source,
    senderName: input.senderName?.trim() || undefined,
    description: input.description.trim(),
    tags: input.tags,
    attachments: input.attachments.map(a => ({
      ...a,
      id: generateId('att'),
      uploadedAt: nowIso(),
    })),
    priority: input.priority,
    dateReceived: input.dateReceived,
    dueDate: input.dueDate,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  state.documents = [doc, ...state.documents];

  const auditLog: AuditLog = {
    id: generateId('log'),
    actorId: input.encodedById,
    actorName: encodedBy?.fullName ?? 'Unknown',
    action: 'CREATE',
    module: 'Documents',
    description: `Registered new document ${doc.trackingNumber}: ${doc.title}`,
    targetId: doc.id,
    targetType: 'document',
    ipAddress: '127.0.0.1',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'mock-agent',
    createdAt: nowIso(),
  };
  state.auditLogs = [auditLog, ...state.auditLogs];

  if (input.receivingOfficeId) {
    const routingStep: RoutingStep = {
      id: generateId('rt'),
      documentId: doc.id,
      fromOfficeId: input.originatingOfficeId,
      fromUserId: input.encodedById,
      toOfficeId: input.receivingOfficeId,
      toUserId: input.initialHolderId,
      instructions: 'Initial routing upon registration',
      status: 'in_progress',
      receivedAt: nowIso(),
      sequence: 1,
    };
    state.routingSteps = [...state.routingSteps, routingStep];
  }

  notify();
  return doc;
};

export interface UpdateDocumentStatusInput {
  documentId: string;
  status: DocumentStatus;
  actorId: string;
  remarks?: string;
  targetOfficeId?: string;
  targetUserId?: string;
  action: 'APPROVE' | 'REJECT' | 'RETURN' | 'RECOMMEND' | 'RECEIVE' | 'REVIEW' | 'RELEASE' | 'ARCHIVE' | 'ROUTE' | 'COMMENT';
}

export const updateDocumentStatus = (input: UpdateDocumentStatusInput): Document | null => {
  const idx = state.documents.findIndex(d => d.id === input.documentId);
  if (idx === -1) return null;
  const doc = state.documents[idx];
  const updated: Document = {
    ...doc,
    status: input.status,
    currentOfficeId: input.targetOfficeId ?? doc.currentOfficeId,
    currentHolderId: input.targetUserId ?? doc.currentHolderId,
    updatedAt: nowIso(),
  };
  const next = [...state.documents];
  next[idx] = updated;
  state.documents = next;

  const actor = getUserById(input.actorId);
  state.auditLogs = [
    {
      id: generateId('log'),
      actorId: input.actorId,
      actorName: actor?.fullName ?? 'Unknown',
      action: input.action,
      module: 'Documents',
      description: input.remarks?.trim() || `${input.action} on document ${doc.trackingNumber}`,
      targetId: doc.id,
      targetType: 'document',
      ipAddress: '127.0.0.1',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'mock-agent',
      createdAt: nowIso(),
    },
    ...state.auditLogs,
  ];

  notify();
  return updated;
};

export interface AddRoutingStepInput {
  documentId: string;
  fromOfficeId: string;
  fromUserId?: string;
  toOfficeId: string;
  toUserId?: string;
  instructions: string;
  remarks?: string;
}

export const addRoutingStep = (input: AddRoutingStepInput): RoutingStep => {
  const existing = state.routingSteps.filter(r => r.documentId === input.documentId);
  const sequence = existing.length + 1;
  const step: RoutingStep = {
    id: generateId('rt'),
    documentId: input.documentId,
    fromOfficeId: input.fromOfficeId,
    fromUserId: input.fromUserId,
    toOfficeId: input.toOfficeId,
    toUserId: input.toUserId,
    instructions: input.instructions.trim(),
    remarks: input.remarks?.trim() || undefined,
    status: 'in_progress',
    receivedAt: nowIso(),
    sequence,
  };
  state.routingSteps = [...state.routingSteps, step];

  const docIdx = state.documents.findIndex(d => d.id === input.documentId);
  if (docIdx !== -1) {
    const doc = state.documents[docIdx];
    const updated: Document = {
      ...doc,
      currentOfficeId: input.toOfficeId,
      currentHolderId: input.toUserId ?? doc.currentHolderId,
      status: 'in_routing',
      updatedAt: nowIso(),
    };
    const next = [...state.documents];
    next[docIdx] = updated;
    state.documents = next;
  }

  notify();
  return step;
};

export const markNotificationRead = (id: string) => {
  const idx = state.notifications.findIndex(n => n.id === id);
  if (idx === -1) return;
  const next = [...state.notifications];
  next[idx] = { ...next[idx], read: true };
  state.notifications = next;
  notify();
};

export const markAllNotificationsRead = (userId: string) => {
  state.notifications = state.notifications.map(n =>
    n.userId === userId ? { ...n, read: true } : n
  );
  notify();
};

export const getActiveUsersByOffice = (officeId: string) =>
  users.filter(u => u.officeId === officeId && u.status === 'active');

import { useMemo } from 'react';

export const useDocuments = (): Document[] => {
  const snap = useStoreSnapshot();
  return useMemo(() => snap.documents, [snap.documents]);
};

export const useDocument = (id: string | undefined): Document | undefined => {
  const snap = useStoreSnapshot();
  return useMemo(
    () => (id ? snap.documents.find(d => d.id === id) : undefined),
    [snap.documents, id]
  );
};

export const useRoutingSteps = (documentId?: string): RoutingStep[] => {
  const snap = useStoreSnapshot();
  return useMemo(() => {
    const filtered = documentId
      ? snap.routingSteps.filter(r => r.documentId === documentId)
      : [...snap.routingSteps];
    return filtered.sort((a, b) => a.sequence - b.sequence);
  }, [snap.routingSteps, documentId]);
};

export const useAuditLogs = (documentId?: string): AuditLog[] => {
  const snap = useStoreSnapshot();
  return useMemo(
    () => (documentId ? snap.auditLogs.filter(l => l.targetId === documentId) : snap.auditLogs),
    [snap.auditLogs, documentId]
  );
};

export const useNotifications = (userId?: string): Notification[] => {
  const snap = useStoreSnapshot();
  return useMemo(
    () => (userId ? snap.notifications.filter(n => n.userId === userId) : snap.notifications),
    [snap.notifications, userId]
  );
};
