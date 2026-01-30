import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../store/ui';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="h-full flex flex-col bg-bg">
      <Header />
      <div className="dotted-separator" />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
        {sidebarOpen && (
          <>
            <div className="dotted-separator-v" />
            <Sidebar />
          </>
        )}
      </div>
    </div>
  );
}
