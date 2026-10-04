import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { authService } from '@/features/authentication/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/useToast';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const missingToken = !token;

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

    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword: password });
      toast.success('Password reset', 'Your password has been updated. You can now sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset your password.');
    } finally {
      setLoading(false);
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
          {missingToken ? (
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 ring-1 ring-rose-100">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
                Invalid reset link
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                This link is missing its reset token. Request a new one from the forgot-password page.
              </p>
              <div className="mt-6 space-y-3">
                <Button fullWidth size="lg" variant="outline" onClick={() => navigate('/forgot-password')}>
                  Request a new link
                </Button>
                <Button fullWidth size="lg" onClick={() => navigate('/login')}>
                  Back to sign in
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
                <Lock className="h-5 w-5 text-brand-600" />
              </div>
              <header>
                <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
                  Set a new password
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Choose a strong password for your account. Must be at least 8 characters with a letter
                  and a number.
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
                  placeholder="Enter new password"
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
                  placeholder="Re-enter new password"
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
                  loading={loading}
                  disabled={!password || !confirm}
                >
                  {loading ? 'Saving…' : 'Reset password'}
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
