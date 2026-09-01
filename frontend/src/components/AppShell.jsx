import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';

const SIDEBAR = {
  expanded: 272,
  collapsed: 92,
};

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('emberly-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('emberly-sidebar-collapsed', String(collapsed));
    } catch {
      // Local storage is optional.
    }
  }, [collapsed]);

  const sidebarWidth = collapsed ? SIDEBAR.collapsed : SIDEBAR.expanded;

  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-emberly-navy text-emberly-ivory"
      style={{ '--emberly-sidebar-width': `${sidebarWidth}px` }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emberly-blue/[0.08] blur-3xl" />
        <div className="absolute -bottom-28 left-[18%] h-72 w-72 rounded-full bg-emberly-crimson/[0.06] blur-3xl" />
      </div>

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div
        className="min-h-screen transition-[padding] duration-300 ease-out lg:pl-[var(--emberly-sidebar-width)]"
      >
        <MobileHeader />

        <main className="relative z-10 min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="mx-auto min-h-screen w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
