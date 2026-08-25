import { useCallback, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@/features/profile/types/profile';

const STORAGE_KEY_PREFIX = 'dms.notifPrefs.';

function readFromStorage(userId: string): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

function writeToStorage(userId: string, prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(prefs));
  } catch {
    // localStorage may be unavailable; silently ignore.
  }
}

export interface UseNotificationPrefsReturn {
  prefs: NotificationPrefs;
  setPref: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
  save: () => Promise<boolean>;
  isSaving: boolean;
}

export function useNotificationPrefs(userId: string): UseNotificationPrefsReturn {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => readFromStorage(userId));
  const [isSaving, setSaving] = useState(false);

  const setPref = useCallback<UseNotificationPrefsReturn['setPref']>((key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      writeToStorage(userId, prefs);
      return true;
    } finally {
      setSaving(false);
    }
  }, [prefs, userId]);

  return { prefs, setPref, save, isSaving };
}