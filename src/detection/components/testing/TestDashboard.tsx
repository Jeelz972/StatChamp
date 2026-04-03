import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
import { TestBatchInput } from './TestBatchInput';
import { TestPlayerInput } from './TestPlayerInput';
import { AddPlayersDialog } from './AddPlayersDialog';
import type { DetectionSession } from '../../types/detection';

const STATUS_LABELS: Record<DetectionSession['status'], string> = {
  draft: 'Brouillon',
  active: 'Active',
  completed: 'Terminée',
};

const STATUS_VARIANTS: Record<DetectionSession['status'], 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  completed: 'outline',
};

export function TestDashboard() {
  const {
    sessions,
    players,
    activeSessionId,
    setActiveSessionId,
    setResults,
    testingMode,
    setTestingMode,
  } = useDetectionStore();

  const [showAddPlayers, setShowAddPlayers] = useState(false);

  // Load results when session changes
  useEffect(() => {
    if (!activeSessionId) return;
    const unsub = DetectionDB.onResultsBySession(activeSessionId, setResults);
    return unsub;
  }, [activeSessionId, setResults]);

  const session = sessions.find((s) => s.id === activeSessionId);
  const sessionPlayers = players.filter((p) => session?.playerIds.includes(p.id));

  // No session selected
  if (!activeSessionId || !session) {
    const availableSessions = sessions.filter(
      (s) => s.status === 'draft' || s.status === 'active'
    );

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">⏱</div>
        <h3 className="mb-2 text-lg font-semibold">Sélectionnez une session</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Choisissez une session pour commencer la saisie des tests.
        </p>
        {availableSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Aucune session active ou brouillon disponible.
          </p>
        ) : (
          <div className="flex w-full max-w-xs flex-col gap-2">
            {availableSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[s.status]} className="text-xs">
                  {STATUS_LABELS[s.status]}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Session bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{session.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(session.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              {session.location ? ` · ${session.location}` : ''}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[session.status]} className="shrink-0 text-xs">
            {STATUS_LABELS[session.status]}
          </Badge>
          <span className="shrink-0 text-xs text-muted-foreground">
            {sessionPlayers.length} joueur{sessionPlayers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => setShowAddPlayers(true)}
          >
            + Joueurs
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 text-muted-foreground"
            onClick={() => setActiveSessionId(null)}
          >
            Changer
          </Button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border p-1 w-fit gap-1">
        <button
          onClick={() => setTestingMode('by_test')}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            testingMode === 'by_test'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Par test
        </button>
        <button
          onClick={() => setTestingMode('by_player')}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            testingMode === 'by_player'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Par joueur
        </button>
      </div>

      {/* Content */}
      {testingMode === 'by_test' ? <TestBatchInput /> : <TestPlayerInput />}

      {/* Add players dialog */}
      {showAddPlayers && <AddPlayersDialog onClose={() => setShowAddPlayers(false)} />}
    </div>
  );
}
