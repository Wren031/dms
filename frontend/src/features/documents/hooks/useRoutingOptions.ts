import { useEffect, useState } from 'react';
import { userService } from '@/features/system-admin/users/services/user.service';
import type { RoutingUserOption } from '@/features/system-admin/users/types/user';

export function useRoutingOptions() {
  const [users, setUsers] = useState<RoutingUserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    userService.routingOptions()
      .then(items => {
        if (active) setUsers(items);
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load routing users.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { users, loading, error };
}
