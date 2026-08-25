import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { navigation, iconMap } from './navigation';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useUnreadNotifications } from '@/features/notifications/hooks/useUnreadNotifications';
import { ROLE_LABELS } from '@/constants';
import { Archive as ArchiveIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { unreadCount } = useUnreadNotifications(true);

  if (!user) return null;

  const filteredNav = navigation.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  const sections: Array<{ key: 'main' | 'workspace' | 'personal' | 'admin'; label: string }> = [
    { key: 'main', label: 'Overview' },
    { key: 'workspace', label: 'Workflow' },
    { key: 'personal', label: 'Personal' },
    { key: 'admin', label: 'Administration' },
  ];

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-16 px-5 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-md bg-brand-600 text-white flex items-center justify-center">
            <ArchiveIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-tight">CityDocs DMS</p>
            <p className="text-[11px] text-slate-500 leading-tight">Document Management</p>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-slate-200 shrink-0">
          <div className="px-2.5 py-2 rounded-md bg-slate-50 border border-slate-200">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Logged in as</p>
            <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{user.fullName}</p>
            <p className="text-xs text-slate-600 truncate">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {sections.map(section => {
            const items = filteredNav.filter(i => i.section === section.key);
            if (items.length === 0) return null;
            return (
              <div key={section.key} className="mb-5">
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {items.map(item => {
                    const Icon = iconMap[item.icon as keyof typeof iconMap];
                    const badge = item.id === 'notifications' ? unreadCount : undefined;
                    return (
                      <li key={item.id}>
                        <NavLink
                          to={item.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            )
                          }
                        >
                          {Icon && <Icon className="w-4 h-4 shrink-0" />}
                          <span className="flex-1 truncate">{item.label}</span>
                          {typeof badge === 'number' && badge > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                              {badge}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500 shrink-0">
          <p>DMS v1.0.0 &middot; Build 2026.08</p>
          <p className="mt-0.5">For government use only</p>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
    </>
  );
}
