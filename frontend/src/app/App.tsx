import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

import { LoginPage } from '@/features/authentication/pages/LoginPage';
import { DashboardPage } from '@/features/documents/pages/DashboardPage';
import { DocumentsListPage } from '@/features/documents/pages/DocumentsListPage';
import { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage';
import { DocumentRegistrationPage } from '@/features/documents/pages/DocumentRegistrationPage';
import { InboxPage } from '@/features/documents/pages/InboxPage';
import { RoutingPage } from '@/features/documents/pages/RoutingPage';
import { ReviewPage } from '@/features/documents/pages/ReviewPage';
import { ReleasePage } from '@/features/documents/pages/ReleasePage';
import { TrackingPage } from '@/features/documents/pages/TrackingPage';
import { ArchivePage } from '@/features/documents/pages/ArchivePage';
import { UsersPage } from '@/features/system-admin/users/UsersPage';
import { AddUserPage } from '@/features/system-admin/users/AddUserPage';
import { OfficesPage } from '@/features/system-admin/offices/OfficesPage';
import { RolesPermissionsPage } from '@/features/system-admin/roles-permissions/RolesPermissionsPage';
import { AuditLogsPage } from '@/features/system-admin/audit-logs/AuditLogsPage';
import { SettingsPage } from '@/features/system-admin/settings/SettingsPage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmDialogProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/documents" element={<DocumentsListPage />} />
                <Route path="/documents/register" element={<DocumentRegistrationPage />} />
                <Route path="/documents/:id" element={<DocumentDetailPage />} />

                <Route
                  path="/inbox"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin', 'receiving_officer']}>
                      <InboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/routing"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin', 'receiving_officer']}>
                      <RoutingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/review"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin', 'reviewing_officer']}>
                      <ReviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/release"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin', 'reviewing_officer']}>
                      <ReleasePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/tracking" element={<TrackingPage />} />
                <Route path="/archive" element={<ArchivePage />} />

                <Route
                  path="/users"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/new"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <AddUserPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/offices"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <OfficesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute roles={['system_admin']}>
                      <RolesPermissionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute roles={['system_admin', 'office_admin']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ConfirmDialogProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
