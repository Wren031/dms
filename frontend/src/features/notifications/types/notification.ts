export type NotificationType = 'document' | 'system' | 'reminder';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export type NotificationTab = 'all' | 'unread' | NotificationType;

export interface NotificationListFilters {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  read?: boolean;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationCounts {
  all: number;
  unread: number;
  document: number;
  system: number;
  reminder: number;
}

export function computeCounts(items: NotificationItem[]): NotificationCounts {
  return items.reduce<NotificationCounts>(
    (acc, n) => {
      acc.all += 1;
      if (!n.read) acc.unread += 1;
      if (n.type === 'document') acc.document += 1;
      else if (n.type === 'system') acc.system += 1;
      else if (n.type === 'reminder') acc.reminder += 1;
      return acc;
    },
    { all: 0, unread: 0, document: 0, system: 0, reminder: 0 },
  );
}

export function filterByTab(items: NotificationItem[], tab: NotificationTab): NotificationItem[] {
  if (tab === 'all') return items;
  if (tab === 'unread') return items.filter(n => !n.read);
  return items.filter(n => n.type === tab);
}