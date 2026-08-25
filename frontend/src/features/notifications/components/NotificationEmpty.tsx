import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

interface NotificationEmptyProps {
  icon: ReactNode;
  title?: string;
  description?: string;
}

export function NotificationEmpty({
  icon,
  title = 'No notifications',
  description = 'No notifications in this category.',
}: NotificationEmptyProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      className="py-16"
    />
  );
}