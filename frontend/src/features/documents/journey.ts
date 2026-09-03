import type {
  AuditLog,
  Document,
  DocumentStatus,
  Office,
  RoutingStep,
  User,
} from '@/types';

export type JourneyStageId =
  | 'created'
  | 'registered'
  | 'classified'
  | 'assigned'
  | 'routed'
  | 'reviewed'
  | 'recommended'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'corrected'
  | 'released'
  | 'archived';

export type JourneyEventKind = 'progress' | 'decision' | 'rework' | 'terminal';

export type JourneyEventState = 'completed' | 'current' | 'pending' | 'rework';

export interface JourneyStage {
  id: JourneyStageId;
  label: string;
  shortLabel: string;
  kind: JourneyEventKind;
}

export const JOURNEY_STAGES: JourneyStage[] = [
  { id: 'created', label: 'Created', shortLabel: 'Created', kind: 'progress' },
  { id: 'registered', label: 'Registered', shortLabel: 'Registered', kind: 'progress' },
  { id: 'classified', label: 'Classified', shortLabel: 'Classified', kind: 'progress' },
  { id: 'assigned', label: 'Assigned', shortLabel: 'Assigned', kind: 'progress' },
  { id: 'routed', label: 'Routed', shortLabel: 'Routed', kind: 'progress' },
  { id: 'reviewed', label: 'Reviewed / Actioned', shortLabel: 'Reviewed', kind: 'progress' },
  { id: 'recommended', label: 'Recommended', shortLabel: 'Recommended', kind: 'decision' },
  { id: 'approved', label: 'Approved', shortLabel: 'Approved', kind: 'decision' },
  { id: 'rejected', label: 'Rejected', shortLabel: 'Rejected', kind: 'decision' },
  { id: 'returned', label: 'Returned', shortLabel: 'Returned', kind: 'rework' },
  { id: 'corrected', label: 'Corrected', shortLabel: 'Corrected', kind: 'rework' },
  { id: 'released', label: 'Released', shortLabel: 'Released', kind: 'progress' },
  { id: 'archived', label: 'Archived', shortLabel: 'Archived', kind: 'terminal' },
];

export const JOURNEY_STAGE_MAP: Record<JourneyStageId, JourneyStage> = JOURNEY_STAGES.reduce(
  (acc, stage) => {
    acc[stage.id] = stage;
    return acc;
  },
  {} as Record<JourneyStageId, JourneyStage>
);

export interface JourneyEvent {
  id: string;
  stage: JourneyStage;
  state: JourneyEventState;
  timestamp: string;
  actor: Pick<User, 'id' | 'fullName' | 'avatarColor' | 'position'> | null;
  office: Pick<Office, 'id' | 'name' | 'code'> | null;
  action: string;
  description: string;
  remarks?: string;
  fromOffice?: Pick<Office, 'id' | 'name' | 'code'> | null;
  toOffice?: Pick<Office, 'id' | 'name' | 'code'> | null;
  toActor?: Pick<User, 'id' | 'fullName' | 'avatarColor' | 'position'> | null;
  source:
    | 'document'
    | 'audit'
    | 'routing'
    | 'synthesis'
    | 'current-state';
}

export interface JourneyContext {
  document: Document;
  routingSteps: RoutingStep[];
  auditLogs: AuditLog[];
  users: User[];
  offices: Office[];
}

const stageByAction: Record<string, JourneyStageId> = {
  CREATE: 'registered',
  RECEIVE: 'classified',
  REVIEW: 'reviewed',
  RECOMMEND: 'recommended',
  APPROVE: 'approved',
  REJECT: 'rejected',
  RETURN: 'returned',
  RELEASE: 'released',
  ARCHIVE: 'archived',
  ROUTE: 'routed',
};

const decisionStageIds: JourneyStageId[] = ['approved', 'rejected', 'returned'];

const completedTerminalStates: DocumentStatus[] = [
  'released',
  'archived',
  'rejected',
];

function pickUser(
  users: User[],
  id: string | undefined | null
): JourneyEvent['actor'] {
  if (!id) return null;
  const u = users.find(x => x.id === id);
  if (!u) return null;
  return {
    id: u.id,
    fullName: u.fullName,
    avatarColor: u.avatarColor,
    position: u.position,
  };
}

function pickOffice(
  offices: Office[],
  id: string | undefined | null
): JourneyEvent['office'] {
  if (!id) return null;
  const o = offices.find(x => x.id === id);
  if (!o) return null;
  return { id: o.id, name: o.name, code: o.code };
}

function statusToCurrentStage(status: DocumentStatus): JourneyStageId {
  switch (status) {
    case 'registered':
      return 'registered';
    case 'received':
      return 'classified';
    case 'routed':
      return 'routed';
    case 'under_review':
      return 'reviewed';
    case 'recommended':
      return 'reviewed';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'returned':
      return 'returned';
    case 'released':
      return 'released';
    case 'archived':
      return 'archived';
    default:
      return 'registered';
  }
}

function ensureUniqueId(
  used: Set<string>,
  base: string
): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}-${i}`)) i++;
  const next = `${base}-${i}`;
  used.add(next);
  return next;
}

export function buildDocumentJourney(ctx: JourneyContext): JourneyEvent[] {
  const { document, routingSteps, auditLogs, users, offices } = ctx;
  const events: JourneyEvent[] = [];
  const usedIds = new Set<string>();

  const addEvent = (event: Omit<JourneyEvent, 'id'>, idBase: string): void => {
    const id = ensureUniqueId(usedIds, idBase);
    events.push({ ...event, id });
  };

  addEvent(
    {
      stage: JOURNEY_STAGE_MAP.created,
      state: 'completed',
      timestamp: document.createdAt,
      actor: pickUser(users, document.encodedById),
      office: pickOffice(offices, document.originatingOfficeId),
      action: 'Document created',
      description: `Document ${document.trackingNumber} was created.`,
      source: 'document',
    },
    `created-${document.id}`
  );

  if (document.receivedById && document.dateReceived) {
    addEvent(
      {
        stage: JOURNEY_STAGE_MAP.registered,
        state: 'completed',
        timestamp: document.dateReceived,
        actor: pickUser(users, document.receivedById),
        office: pickOffice(offices, document.currentOfficeId),
        action: 'Document registered',
        description: `Document was officially registered into the system and stamped with tracking number ${document.trackingNumber}.`,
        source: 'synthesis',
      },
      `registered-${document.id}`
    );
  } else {
    addEvent(
      {
        stage: JOURNEY_STAGE_MAP.registered,
        state: document.status === 'registered' ? 'current' : 'completed',
        timestamp: document.createdAt,
        actor: pickUser(users, document.encodedById),
        office: pickOffice(offices, document.originatingOfficeId),
        action: 'Document registered',
        description: `Document was encoded and registered in the records system.`,
        source: 'synthesis',
      },
      `registered-fallback-${document.id}`
    );
  }

  if (document.receivedById && document.dateReceived) {
    addEvent(
      {
        stage: JOURNEY_STAGE_MAP.classified,
        state: 'completed',
        timestamp: document.dateReceived,
        actor: pickUser(users, document.receivedById),
        office: pickOffice(offices, document.currentOfficeId),
        action: 'Document classified & assigned',
        description: `Document classified as ${document.classification.toUpperCase()} and tagged for routing.`,
        source: 'synthesis',
      },
      `classified-${document.id}`
    );
  }

  const sortedSteps = [...routingSteps].sort((a, b) => {
    const aTime = a.receivedAt ?? document.createdAt;
    const bTime = b.receivedAt ?? document.createdAt;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  sortedSteps.forEach((step, idx) => {
    const ts = step.receivedAt ?? document.createdAt;
    const fromOffice = pickOffice(offices, step.fromOfficeId);
    const toOffice = pickOffice(offices, step.toOfficeId);
    const toActor = pickUser(users, step.toUserId);

    const isReturnStep = step.status === 'returned' || step.instructions.toLowerCase().includes('returned');
    const isCompletion = step.status === 'completed';
    const isPending = step.status === 'pending';

    let stageId: JourneyStageId = 'routed';
    if (isReturnStep) stageId = 'returned';
    if (idx === 0 && !isReturnStep) stageId = 'assigned';

    let state: JourneyEventState = 'completed';
    if (isPending) state = 'pending';
    else if (!isCompletion && !isReturnStep) state = 'current';

    addEvent(
      {
        stage: JOURNEY_STAGE_MAP[stageId],
        state,
        timestamp: ts,
        actor: pickUser(users, step.fromUserId) ?? pickUser(users, document.encodedById),
        office: fromOffice,
        fromOffice,
        toOffice,
        toActor,
        action: isReturnStep
          ? 'Returned for correction'
          : idx === 0
            ? 'Assigned to receiving office'
            : 'Routed to next office',
        description:
          step.instructions ||
          (idx === 0
            ? 'Document assigned to the receiving office.'
            : 'Document forwarded to the next office in the workflow.'),
        remarks: step.remarks,
        source: 'routing',
      },
      `route-${step.id}`
    );
  });

  const relevantLogs = auditLogs
    .filter(log => log.targetId === document.id)
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  relevantLogs.forEach(log => {
    const stageId = stageByAction[log.action] ?? 'reviewed';
    const isDecision = decisionStageIds.includes(stageId);

    addEvent(
      {
        stage: JOURNEY_STAGE_MAP[stageId],
        state: 'completed',
        timestamp: log.createdAt,
        actor: {
          id: log.actorId,
          fullName: log.actorName,
          avatarColor: 'bg-slate-600',
          position: '—',
        },
        office: null,
        action: log.action.charAt(0) + log.action.slice(1).toLowerCase(),
        description: log.description,
        remarks: isDecision ? log.description : undefined,
        source: 'audit',
      },
      `audit-${log.id}`
    );
  });

  const sortedEvents = events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const hasTerminal = completedTerminalStates.includes(document.status);
  const hasCurrentMarker = sortedEvents.some(e => e.state === 'current');

  if (!hasTerminal && !hasCurrentMarker) {
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const currentEvent: JourneyEvent = {
      id: `current-${document.id}`,
      stage: JOURNEY_STAGE_MAP[statusToCurrentStage(document.status)],
      state: 'current',
      timestamp: document.updatedAt,
      actor: pickUser(users, document.currentHolderId),
      office: pickOffice(offices, document.currentOfficeId),
      action: 'In progress',
      description: `Document is currently with ${
        pickUser(users, document.currentHolderId)?.fullName ?? 'the assigned officer'
      } at ${pickOffice(offices, document.currentOfficeId)?.name ?? 'the current office'}.`,
      source: 'current-state',
    };
    if (lastEvent) {
      const lastTime = new Date(lastEvent.timestamp).getTime();
      const newTime = new Date(currentEvent.timestamp).getTime();
      if (newTime >= lastTime) {
        sortedEvents.push(currentEvent);
      } else {
        sortedEvents.unshift(currentEvent);
      }
    } else {
      sortedEvents.push(currentEvent);
    }
  }

  return sortedEvents.map(event => {
    const state: JourneyEventState =
      event.source === 'current-state' ? 'current' : event.state;
    return { ...event, state };
  });
}

export function getJourneyProgress(events: JourneyEvent[]): {
  total: number;
  completed: number;
  percent: number;
} {
  const trackable = events.filter(e => e.state !== 'pending');
  const completed = events.filter(e => e.state === 'completed').length;
  if (trackable.length === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }
  const percent = Math.round((completed / trackable.length) * 100);
  return { total: trackable.length, completed, percent };
}

export function isDecisionStage(stageId: JourneyStageId): boolean {
  return decisionStageIds.includes(stageId);
}

export function isReworkStage(stageId: JourneyStageId): boolean {
  return stageId === 'returned' || stageId === 'corrected';
}

export function isTerminalStage(stageId: JourneyStageId): boolean {
  return stageId === 'archived' || stageId === 'rejected';
}
