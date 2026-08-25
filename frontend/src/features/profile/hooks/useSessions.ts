import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@/features/authentication/api/authApi';
import { profileService } from '@/features/profile/services/profile.service';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  revoke: (sessionId: string) => Promise<boolean>;
  revokeAllOthers: () => Promise<boolean>;
}

export function useSessions(active: boolean): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      setSessions(await profileService.listSessions());
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not load sessions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      refresh();
    }
  }, [active, refresh]);

  const revoke = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      await profileService.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return true;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not revoke session.'));
      return false;
    }
  }, []);

  const revokeAllOthers = useCallback(async (): Promise<boolean> => {
    try {
      await profileService.revokeAllSessions();
      setSessions(prev => prev.filter(s => s.current));
      return true;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not revoke other sessions.'));
      return false;
    }
  }, []);

  return { sessions, loading, errorMessage, refresh, revoke, revokeAllOthers };
}