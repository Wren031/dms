import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole, Permission } from '@/types';
import { users, getUserById } from '@/mocks/users';
import { ROLE_PERMISSIONS } from '@/constants';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (permission: Permission) => boolean;
  allSwitchableUsers: User[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'dms.activeUserId';

const ROLE_TO_USER: Record<UserRole, string> = {
  system_admin: 'usr-001',
  office_admin: 'usr-002',
  document_encoder: 'usr-011',
  receiving_officer: 'usr-007',
  reviewing_officer: 'usr-003',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const id = localStorage.getItem(STORAGE_KEY);
      if (id) return getUserById(id) ?? null;
    } catch {
      // ignore
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, user.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 350));
    setLoading(false);
    const match = users.find(
      u => (u.username === username || u.email === username) && u.status === 'active'
    );
    if (!match) {
      return { ok: false, error: 'Invalid credentials. Please check your username and password.' };
    }
    if (password !== 'password123' && password !== match.username) {
      return { ok: false, error: 'Invalid credentials. Please check your username and password.' };
    }
    setUser(match);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const switchUser = useCallback((userId: string) => {
    const u = getUserById(userId);
    if (u) setUser(u);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const u = getUserById(ROLE_TO_USER[role]);
    if (u) setUser(u);
  }, []);

  const hasPermission = useCallback((permission: Permission) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role].includes(permission);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      switchUser,
      switchRole,
      hasPermission,
      allSwitchableUsers: users.filter(u => u.status === 'active'),
    }),
    [user, loading, login, logout, switchUser, switchRole, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
