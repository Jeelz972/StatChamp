import React from 'react';
import { Button } from '@/components/ui/button';
import { useDetectionStore } from '../../stores/detection-store';

const VIEW_CONFIG = {
  sessions: { title: 'Sessions de détection', cta: 'Nouvelle session', action: 'setShowSessionCreate' as const },
  players: { title: 'Registre des joueurs', cta: 'Ajouter un joueur', action: 'setShowPlayerCreate' as const },
  testing: { title: 'Saisie des tests', cta: null, action: null },
  results: { title: 'Résultats & Rapports', cta: null, action: null },
};

export function DetectionHeader() {
  const { view, setSidebarMobileOpen, setShowSessionCreate, setShowPlayerCreate } = useDetectionStore();
  const config = VIEW_CONFIG[view];

  function handleCta() {
    if (config.action === 'setShowSessionCreate') setShowSessionCreate(true);
    if (config.action === 'setShowPlayerCreate') setShowPlayerCreate(true);
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground md:hidden"
          onClick={() => setSidebarMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-base font-semibold">{config.title}</h2>
      </div>
      {config.cta && (
        <Button size="sm" onClick={handleCta} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {config.cta}
        </Button>
      )}
    </header>
  );
}
