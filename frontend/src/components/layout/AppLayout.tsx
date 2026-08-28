import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutSidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <LayoutSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-[1600px] w-full mx-auto">
          {children ?? <Outlet />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
