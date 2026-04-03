import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
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

export function SessionList() {
  const { sessions, setShowSessionCreate, setActiveSessionId, setView } = useDetectionStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await DetectionDB.deleteSession(id);
    setConfirmDeleteId(null);
  }

  function handleOpen(session: DetectionSession) {
    setActiveSessionId(session.id);
    setView('testing');
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">📋</div>
        <h3 className="mb-2 text-lg font-semibold">Aucune session</h3>
        <p className="mb-6 text-sm text-muted-foreground">Créez votre première session de détection.</p>
        <Button onClick={() => setShowSessionCreate(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          Nouvelle session
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="truncate font-semibold text-card-foreground">{session.name}</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(session.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                {session.location && ` · ${session.location}`}
              </p>
            </div>
            <Badge variant={STATUS_VARIANTS[session.status]} className="shrink-0 text-xs">
              {STATUS_LABELS[session.status]}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1">
            {session.categories.map((cat) => (
              <span key={cat} className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
                {cat}
              </span>
            ))}
            {session.genders.map((g) => (
              <span
                key={g}
                className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${g === 'M' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}
              >
                {g === 'M' ? 'Masculin' : 'Féminin'}
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {session.playerIds.length} joueur{session.playerIds.length !== 1 ? 's' : ''} · {session.testIds.length} test{session.testIds.length !== 1 ? 's' : ''}
          </p>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleOpen(session)}>
              Ouvrir
            </Button>
            {confirmDeleteId === session.id ? (
              <>
                <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleDelete(session.id)}>
                  Confirmer
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmDeleteId(null)}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setConfirmDeleteId(session.id)}>
                Suppr.
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
