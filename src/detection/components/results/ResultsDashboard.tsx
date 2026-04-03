import React, { useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDetectionStore } from '../../stores/detection-store';
import { computePlayerProfile, computeAnthropometryPercentiles } from '../../engine/detection-engine';
import { CategoryFilter } from '../shared/CategoryFilter';
import { GenderFilter } from '../shared/GenderFilter';
import { RankingTable } from './RankingTable';
import { PlayerRadar } from './PlayerRadar';
import { CompareView } from './CompareView';
import { ExportableReport } from './ExportableReport';
import { useExportPdf } from '../../hooks/useExportPdf';
import type { PlayerProfile, DetectionSession } from '../../types/detection';

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

export function ResultsDashboard() {
  const {
    sessions,
    players,
    results,
    activeSessionId,
    setActiveSessionId,
    filterCategory,
    filterGender,
  } = useDetectionStore();

  const { exportSessionPdf, exporting } = useExportPdf();
  const [showExport, setShowExport] = useState(false);

  const session = sessions.find((s) => s.id === activeSessionId);

  const allProfiles = useMemo(() => {
    if (!session) return [];
    const profs = session.playerIds
      .map((pid) => {
        const player = players.find((p) => p.id === pid);
        if (!player) return null;
        return computePlayerProfile(pid, results, player.gender, player.category);
      })
      .filter((p): p is PlayerProfile => p !== null);
    computeAnthropometryPercentiles(profs);
    return profs;
  }, [session, players, results]);

  // Apply filters
  const profiles = useMemo(() => {
    return allProfiles.filter((profile) => {
      const player = players.find((p) => p.id === profile.playerId);
      if (!player) return false;
      const matchesCat = filterCategory === 'all' || player.category === filterCategory;
      const matchesGender = filterGender === 'all' || player.gender === filterGender;
      return matchesCat && matchesGender;
    });
  }, [allProfiles, players, filterCategory, filterGender]);

  const filteredPlayers = useMemo(
    () => players.filter((p) => session?.playerIds.includes(p.id)),
    [players, session]
  );

  async function handleExport() {
    if (!session) return;
    setShowExport(true);
    await new Promise((r) => setTimeout(r, 100)); // Let render settle
    const date = session.date.replace(/-/g, '');
    await exportSessionPdf(
      'detection-export',
      `detection-${session.name.replace(/\s+/g, '-')}-${date}.pdf`
    );
    setShowExport(false);
  }

  // No session selected
  if (!activeSessionId || !session) {
    const available = sessions.filter(
      (s) => s.status === 'active' || s.status === 'completed'
    );
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">📊</div>
        <h3 className="mb-2 text-lg font-semibold">Sélectionnez une session</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Choisissez une session pour afficher les résultats.
        </p>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucune session disponible.</p>
        ) : (
          <div className="flex w-full max-w-xs flex-col gap-2">
            {available.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
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
            {profiles.length} profil{profiles.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleExport}
            disabled={exporting || profiles.length === 0}
          >
            {exporting ? '⏳ Export…' : '⬇ PDF'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setActiveSessionId(null)}
          >
            Changer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <GenderFilter />
        <CategoryFilter />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ranking">
        <TabsList className="inline-flex w-max gap-0.5 rounded-lg bg-muted p-1">
          <TabsTrigger value="ranking" className="px-4 text-xs">
            Classement
          </TabsTrigger>
          <TabsTrigger value="profiles" className="px-4 text-xs">
            Profils
          </TabsTrigger>
          <TabsTrigger value="compare" className="px-4 text-xs">
            Comparaison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-4">
          <RankingTable profiles={profiles} players={filteredPlayers} />
        </TabsContent>

        <TabsContent value="profiles" className="mt-4">
          {profiles.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aucun profil à afficher avec ces filtres.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {profiles.map((profile) => {
                const player = filteredPlayers.find((p) => p.id === profile.playerId);
                if (!player) return null;
                return (
                  <div
                    key={profile.playerId}
                    className="flex flex-col items-center rounded-lg border border-border bg-card p-4"
                  >
                    <PlayerRadar profile={profile} player={player} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <CompareView profiles={profiles} players={filteredPlayers} />
        </TabsContent>
      </Tabs>

      {/* Hidden export element */}
      {showExport && (
        <div className="fixed left-[-9999px] top-0">
          <ExportableReport
            profiles={allProfiles}
            players={players.filter((p) => session.playerIds.includes(p.id))}
            session={session}
          />
        </div>
      )}
    </div>
  );
}
