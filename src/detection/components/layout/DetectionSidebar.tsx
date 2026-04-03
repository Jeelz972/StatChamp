import React, { useEffect } from 'react';
import { useDetectionStore } from '../../stores/detection-store';

type NavItem = {
  id: 'sessions' | 'players' | 'testing' | 'results';
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'sessions', label: 'Sessions', icon: '📋' },
  { id: 'players', label: 'Joueurs', icon: '👤' },
  { id: 'testing', label: 'Tests', icon: '⏱' },
  { id: 'results', label: 'Résultats', icon: '📊' },
];

export function DetectionSidebar() {
  const { view, setView, sidebarMobileOpen, setSidebarMobileOpen } = useDetectionStore();

  // Close on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarMobileOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [setSidebarMobileOpen]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold text-sidebar-foreground">StatChamp</h1>
        <p className="text-xs text-muted-foreground">Détection</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setView(item.id);
              setSidebarMobileOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              view === item.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 text-xs text-muted-foreground">v2.0 — Phase 3</div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-sidebar shadow-xl md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
