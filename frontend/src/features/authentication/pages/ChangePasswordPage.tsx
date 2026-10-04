import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { authService } from '@/features/authentication/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/useToast';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, loading, mustChangePassword, updateCurrentUser } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await authService.firstLoginChangePassword({
        newPassword: password,
        confirmPassword: confirm,
      });
      updateCurrentUser(updatedUser);
      toast.success(
        'Password changed',
        'Your password has been set. Welcome to the DMS.',
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
          <Logo />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-slate-900">CityDocs DMS</p>
            <p className="text-xs text-slate-500">Document Management System</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
            <KeyRound className="h-5 w-5 text-amber-600" />
          </div>

          <header>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
              Change your temporary password
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              You are signing in for the first time. For your security, please set a new
              private password before you can access the system.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="New password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters with a letter and a number"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <Input
              label="Confirm password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your new password"
              leftIcon={<Lock className="h-4 w-4" />}
            />

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-xs leading-relaxed text-rose-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              disabled={!password || !confirm}
            >
              {submitting ? 'Saving…' : 'Set password and continue'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
