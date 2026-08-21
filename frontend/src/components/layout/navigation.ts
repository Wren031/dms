import type { UserRole } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  permission?: string;
  roles?: UserRole[];
  section?: 'main' | 'workspace' | 'admin';
  badge?: number;
}

import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Inbox,
  Send,
  ClipboardCheck,
  PackageOpen,
  Activity,
  Archive,
  Users as UsersIcon,
  Building2,
  ShieldCheck,
  History,
  Bell,
  Settings,
} from 'lucide-react';

export const navigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: 'LayoutDashboard',
    section: 'main',
  },
  {
    id: 'documents',
    label: 'Documents',
    to: '/documents',
    icon: 'FileText',
    section: 'main',
  },
  {
    id: 'registration',
    label: 'Registration',
    to: '/documents/register',
    icon: 'PlusCircle',
    section: 'main',
    roles: ['system_admin', 'office_admin', 'document_encoder'],
  },
  {
    id: 'inbox',
    label: 'Inbox',
    to: '/inbox',
    icon: 'Inbox',
    section: 'workspace',
    roles: ['system_admin', 'office_admin', 'receiving_officer'],
  },
  {
    id: 'routing',
    label: 'Routing',
    to: '/routing',
    icon: 'Send',
    section: 'workspace',
    roles: ['system_admin', 'office_admin', 'receiving_officer'],
  },
  {
    id: 'review',
    label: 'Review & Action',
    to: '/review',
    icon: 'ClipboardCheck',
    section: 'workspace',
    roles: ['system_admin', 'office_admin', 'reviewing_officer'],
  },
  {
    id: 'release',
    label: 'Release',
    to: '/release',
    icon: 'PackageOpen',
    section: 'workspace',
    roles: ['system_admin', 'office_admin', 'reviewing_officer'],
  },
  {
    id: 'tracking',
    label: 'Tracking',
    to: '/tracking',
    icon: 'Activity',
    section: 'workspace',
  },
  {
    id: 'archive',
    label: 'Archive',
    to: '/archive',
    icon: 'Archive',
    section: 'workspace',
  },
  {
    id: 'users',
    label: 'Users',
    to: '/users',
    icon: 'Users',
    section: 'admin',
    roles: ['system_admin', 'office_admin'],
  },
  {
    id: 'offices',
    label: 'Offices',
    to: '/offices',
    icon: 'Building2',
    section: 'admin',
    roles: ['system_admin', 'office_admin'],
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    to: '/roles',
    icon: 'ShieldCheck',
    section: 'admin',
    roles: ['system_admin'],
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    to: '/audit',
    icon: 'History',
    section: 'admin',
    roles: ['system_admin', 'office_admin'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    to: '/notifications',
    icon: 'Bell',
    section: 'admin',
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: 'Settings',
    section: 'admin',
    roles: ['system_admin'],
  },
];

export const iconMap = {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Inbox,
  Send,
  ClipboardCheck,
  PackageOpen,
  Activity,
  Archive,
  Users: UsersIcon,
  Building2,
  ShieldCheck,
  History,
  Bell,
  Settings,
} as const;

export type IconName = keyof typeof iconMap;
