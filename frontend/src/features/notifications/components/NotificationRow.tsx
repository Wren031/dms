import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, FileText, Trash2 } from 'lucide-react';
import type { NotificationItem, NotificationType } from '@/features/notifications/types/notification';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatRelative } from '@/lib/utils';

interface NotificationRowProps {
  notification: NotificationItem;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_ICON: Record<NotificationType, typeof FileText> = {
  document: FileText,
  system: AlertTriangle,
  reminder: Clock,
};

const TYPE_BADGE: Record<NotificationType, 'indigo' | 'amber' | 'blue'> = {
  document: 'indigo',
  system: 'amber',
  reminder: 'blue',
};

const TYPE_CHIP: Record<NotificationType, string> = {
  document: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  system: 'bg-amber-50 text-amber-700 border-amber-200',
  reminder: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function NotificationRow({ notification, onToggleRead, onDelete }: NotificationRowProps) {
  const Icon = TYPE_ICON[notification.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors',
        !notification.read && 'bg-brand-50/30',
      )}
    >
      <button
        type="button"
        onClick={() => onToggleRead(notification.id)}
        className={cn(
          'w-2 h-2 mt-2 rounded-full shrink-0',
          notification.read ? 'bg-slate-300 hover:bg-slate-400' : 'bg-brand-500 hover:bg-brand-600',
        )}
        aria-label={notification.read ? 'Mark as unread' : 'Mark as read'}
        title={notification.read ? 'Mark as unread' : 'Mark as read'}
      />
      <div
        className={cn(
          'w-9 h-9 rounded-md flex items-center justify-center shrink-0 border',
          TYPE_CHIP[notification.type],
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              'text-sm font-semibold',
              notification.read ? 'text-slate-700' : 'text-slate-900',
            )}
          >
            {notification.title}
          </p>
          <Badge variant={TYPE_BADGE[notification.type]} size="sm">
            {notification.type}
          </Badge>
          {!notification.read && (
            <Badge variant="brand" size="sm">
              New
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-0.5">{notification.message}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <p className="text-xs text-slate-400">{formatRelative(notification.createdAt)}</p>
          {notification.link && (
            <Link
              to={notification.link}
              onClick={() => onToggleRead(notification.id)}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              View related →
            </Link>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Delete notification"
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => onDelete(notification.id)}
        >
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}