import { useCallback, useState } from 'react';
import type { PasswordForm } from '@/features/profile/types/profile';
import { profileService } from '@/features/profile/services/profile.service';

const EMPTY: PasswordForm = { current: '', next: '', confirm: '' };

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

function validate(form: PasswordForm): string | null {
  if (!form.current) return 'Enter your current password to proceed.';
  if (form.next.length < 8) {
    return 'New password must be at least 8 characters and include a letter and a number.';
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(form.next)) {
    return 'New password must include at least one letter and one number.';
  }
  if (form.next !== form.confirm) return 'Please make sure your new passwords match.';
  return null;
}

export interface UsePasswordFormReturn {
  form: PasswordForm;
  setField: <K extends keyof PasswordForm>(key: K, value: PasswordForm[K]) => void;
  reset: () => void;
  isSaving: boolean;
  errorMessage: string | null;
  validationError: string | null;
  isDirty: boolean;
  submit: () => Promise<boolean>;
}

export function usePasswordForm(): UsePasswordFormReturn {
  const [form, setForm] = useState<PasswordForm>(EMPTY);
  const [isSaving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setField: UsePasswordFormReturn['setField'] = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(EMPTY);
    setErrorMessage(null);
  }, []);

  const validationError = validate(form);
  const isDirty = form.current !== '' || form.next !== '' || form.confirm !== '';

  const submit = useCallback(async (): Promise<boolean> => {
    const validation = validate(form);
    if (validation) {
      setErrorMessage(validation);
      return false;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await profileService.changePassword({
        currentPassword: form.current,
        newPassword: form.next,
      });
      setForm(EMPTY);
      return true;
    } catch (err) {
      setErrorMessage(toMessage(err, 'Could not change password.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [form]);

  return {
    form,
    setField,
    reset,
    isSaving,
    errorMessage,
    validationError,
    isDirty,
    submit,
  };
}