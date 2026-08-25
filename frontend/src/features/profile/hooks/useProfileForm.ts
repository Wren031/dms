import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@/features/authentication/api/authApi';
import { profileFormFromUser, type ProfileForm } from '@/features/profile/types/profile';
import { profileService } from '@/features/profile/services/profile.service';

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

function validate(form: ProfileForm): string | null {
  if (!form.firstName.trim()) return 'First name is required';
  if (!form.lastName.trim()) return 'Last name is required';
  if (!form.email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Enter a valid email address';
  }
  if (!form.position.trim()) return 'Position is required';
  if (form.phone && !/^[+0-9()\-\s]*$/.test(form.phone.trim())) {
    return 'Phone may only contain digits, spaces, +, -, ()';
  }
  return null;
}

export interface UseProfileFormReturn {
  form: ProfileForm;
  setField: <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => void;
  reset: () => void;
  isDirty: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  validationError: string | null;
  emailChanged: boolean;
  save: () => Promise<AuthUser | null>;
}

export function useProfileForm(user: AuthUser): UseProfileFormReturn {
  const initial = useMemo(() => profileFormFromUser(user), [user]);
  const [form, setForm] = useState<ProfileForm>(initial);
  const [isSaving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
    setErrorMessage(null);
  }, [initial]);

  const setField: UseProfileFormReturn['setField'] = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(initial);
    setErrorMessage(null);
  }, [initial]);

  const isDirty = useMemo(() => {
    return (
      form.firstName !== initial.firstName ||
      form.middleName !== initial.middleName ||
      form.lastName !== initial.lastName ||
      form.email !== initial.email ||
      form.position !== initial.position ||
      form.phone !== initial.phone
    );
  }, [form, initial]);

  const validationError = useMemo(() => validate(form), [form]);

  const emailChanged = useMemo(
    () => form.email.trim().toLowerCase() !== (initial.email ?? '').toLowerCase(),
    [form.email, initial.email],
  );

  const save = useCallback(async (): Promise<AuthUser | null> => {
    const validation = validate(form);
    if (validation) {
      setErrorMessage(validation);
      return null;
    }
    if (!isDirty) return null;

    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await profileService.updateMe({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || undefined,
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        position: form.position.trim(),
      });
      setForm(profileFormFromUser(updated));
      return updated;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not save profile.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [form, isDirty]);

  return {
    form,
    setField,
    reset,
    isDirty,
    isSaving,
    errorMessage,
    validationError,
    emailChanged,
    save,
  };
}