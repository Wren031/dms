import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Archive as ArchiveIcon,
  ArrowLeft,
  ArrowRight,
  Mail,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { authService } from '@/features/authentication/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.forgotPassword({ emailOrUsername: identifier });
      setResetUrl(res.resetUrl);
      toast.success('Reset link generated', 'Use the link below to set a new password.');
    } catch (error) {
      toast.error(
        'Something went wrong',
        error instanceof Error ? error.message : 'Unable to generate a reset link.',
      );
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.info('Copied', 'The reset link has been copied to your clipboard.');
    } catch {
      toast.error('Copy failed', 'Please select and copy the link manually.');
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ArchiveIcon className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold text-slate-900">CityDocs DMS</p>
            <p className="text-xs text-slate-500">Document Management System</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
            <KeyRound className="h-5 w-5 text-brand-600" />
          </div>

          {!resetUrl ? (
            <>
              <header>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Forgot your password?
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Enter your username or email and we&apos;ll generate a link to reset your password.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <Input
                  label="Username or Email"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="yourname@city.gov"
                  leftIcon={<Mail className="h-4 w-4" />}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  disabled={!identifier}
                  rightIcon={loading ? undefined : <ArrowRight className="h-4 w-4" />}
                >
                  {loading ? 'Generating link…' : 'Generate reset link'}
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
          ) : (
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
                Your reset link is ready
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Because this system does not email links, copy the link below and open it to choose a
                new password. The link expires in 30 minutes.
              </p>

              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
                <p className="break-all font-mono text-xs leading-relaxed text-slate-700">{resetUrl}</p>
              </div>

              <div className="mt-5 space-y-3">
                <Button fullWidth size="lg" onClick={copyLink} leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
                  {copied ? 'Copied to clipboard' : 'Copy reset link'}
                </Button>
                <Button fullWidth size="lg" variant="outline" onClick={() => navigate('/login')}>
                  Back to sign in
                </Button>
              </div>
            </div>
          )}

          <p className="mt-7 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secured with role-based access control
          </p>
        </div>
      </div>
    </div>
  );
}
