import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  roles?: string[];
}

export function ProtectedRoute({ children, permission, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-500 mt-2">
            Your current role does not have permission to access this page. Please contact your system
            administrator if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  if (permission && !hasPermission(permission as never)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Permission Denied</h2>
          <p className="text-sm text-slate-500 mt-2">
            You do not have the required permission to perform this action.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
