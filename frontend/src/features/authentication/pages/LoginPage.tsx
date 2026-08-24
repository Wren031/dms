import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Archive as ArchiveIcon, Lock, User, LogIn } from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const res = await login(username, password);
    if (res.ok) {
      toast.success('Welcome back', 'You have been signed in successfully.');
      navigate('/dashboard');
    } else {
      setError(res.error ?? 'Sign in failed');
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand-950 text-white relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
            <ArchiveIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-lg leading-tight">CityDocs DMS</p>
            <p className="text-xs text-brand-200">Document Management System</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl xl:text-4xl font-semibold leading-tight">
            Secure, traceable, and centralized document management for modern government.
          </h1>
          <p className="mt-4 text-brand-200 text-sm leading-relaxed">
            Register, route, review, and release official documents with a complete audit trail. Built for
            offices that demand accountability, transparency, and operational efficiency.
          </p>

          <ul className="mt-8 space-y-2.5 text-sm">
            <li className="flex items-center gap-2 text-brand-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              End-to-end document workflow with audit trail
            </li>
            <li className="flex items-center gap-2 text-brand-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Role-based access for 5 user types
            </li>
            <li className="flex items-center gap-2 text-brand-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Real-time tracking and notifications
            </li>
            <li className="flex items-center gap-2 text-brand-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Compliant with government documentation standards
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-brand-300">
          &copy; 2026 CityDocs. For authorized government use only.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-md bg-brand-600 text-white flex items-center justify-center">
              <ArchiveIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-lg text-slate-900 leading-tight">CityDocs DMS</p>
              <p className="text-xs text-slate-500">Document Management System</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Sign in to your account</h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your credentials to access the document management system.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Input
              label="Username or Email"
              required
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              leftIcon={<User className="w-4 h-4" />}
              error={error}
            />
            <Input
              label="Password"
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300" defaultChecked />
                Keep me signed in
              </label>
              <a href="#" className="text-brand-600 hover:underline font-medium">
                Forgot password?
              </a>
            </div>
             <Button type="submit" fullWidth disabled={loading} leftIcon={<LogIn className="w-4 h-4" />}>
               Sign in
             </Button>
           </form>
        </div>
      </div>
    </div>
  );
}
