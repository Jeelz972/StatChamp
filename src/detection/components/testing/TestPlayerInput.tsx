import React, { useMemo, useState } from 'react';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
import { getEligibleTests } from '../../engine/test-catalog';
import { ScoreBadge } from '../shared/ScoreBadge';
import { TestCategoryTabs } from './TestCategoryTabs';
import { TestInput } from './TestInput';
import type { TestCategory, TestResult } from '../../types/detection';

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function TestPlayerInput() {
  const { sessions, players, results, setResults, activeSessionId } = useDetectionStore();

  const session = sessions.find((s) => s.id === activeSessionId);
  const sessionPlayers = players.filter((p) => session?.playerIds.includes(p.id));

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    sessionPlayers[0]?.id ?? null
  );
  const [activeCategory, setActiveCategory] = useState<TestCategory>('speed');

  const player = sessionPlayers.find((p) => p.id === selectedPlayerId) ?? sessionPlayers[0] ?? null;

  // Eligible tests for this player
  const eligibleTests = useMemo(() => {
    if (!player || !session) return [];
    return getEligibleTests(player.category).filter((t) =>
      session.testIds.includes(t.id)
    );
  }, [player, session]);

  // Tests in active category
  const testsInCategory = useMemo(
    () => eligibleTests.filter((t) => t.category === activeCategory),
    [eligibleTests, activeCategory]
  );

  // Build result map
  const resultMap = useMemo(() => {
    const map: Record<string, TestResult> = {};
    for (const r of results) {
      map[`${r.playerId}_${r.testId}`] = r;
    }
    return map;
  }, [results]);

  const filledCount = player
    ? eligibleTests.filter((t) => resultMap[`${player.id}_${t.id}`] !== undefined).length
    : 0;

  // Counts per category for badge
  const counts = useMemo(() => {
    const cats: TestCategory[] = ['speed', 'agility', 'power', 'endurance', 'shooting', 'anthropometry'];
    const out: Partial<Record<TestCategory, { filled: number; total: number }>> = {};
    if (!player) return out;
    for (const cat of cats) {
      const catTests = eligibleTests.filter((t) => t.category === cat);
      if (catTests.length === 0) continue;
      const filled = catTests.filter((t) => resultMap[`${player.id}_${t.id}`] !== undefined).length;
      out[cat] = { filled, total: catTests.length };
    }
    return out;
  }, [eligibleTests, resultMap, player]);

  async function handleSave(result: TestResult) {
    await DetectionDB.saveResult(result);
    setResults([...results.filter((r) => r.id !== result.id), result]);
  }

  function navigate(dir: -1 | 1) {
    if (!player) return;
    const idx = sessionPlayers.findIndex((p) => p.id === player.id);
    const next = sessionPlayers[idx + dir];
    if (next) setSelectedPlayerId(next.id);
  }

  if (!session) return null;

  if (sessionPlayers.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Aucun joueur dans cette session.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Player selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          disabled={!player || sessionPlayers.indexOf(player) === 0}
          className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Joueur précédent"
        >
          ←
        </button>

        <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
          {sessionPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                p.id === player?.id
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-border text-muted-foreground hover:border-accent/50'
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[10px] font-bold">
                {initials(p.firstName, p.lastName)}
              </span>
              <span className="hidden sm:inline">{p.lastName} {p.firstName[0]}.</span>
              <span className="sm:hidden">{initials(p.firstName, p.lastName)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate(1)}
          disabled={!player || sessionPlayers.indexOf(player) === sessionPlayers.length - 1}
          className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Joueur suivant"
        >
          →
        </button>
      </div>

      {player && (
        <>
          {/* Progress */}
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filledCount}/{eligibleTests.length}</span>{' '}
            tests complétés pour{' '}
            <span className="font-semibold text-foreground">
              {player.firstName} {player.lastName}
            </span>{' '}
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
              {player.category}
            </span>
          </p>

          <TestCategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            counts={counts}
          />

          {/* Tests in category */}
          <div className="rounded-lg border border-border divide-y divide-border">
            {testsInCategory.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun test dans cette catégorie pour {player.firstName}.
              </p>
            ) : (
              testsInCategory.map((test) => {
                const existing = resultMap[`${player.id}_${test.id}`];
                return (
                  <div key={test.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{test.name}</p>
                      <p className="text-xs text-muted-foreground">{test.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TestInput
                        testId={test.id}
                        playerId={player.id}
                        sessionId={session.id}
                        currentValue={existing?.rawValue}
                        precision={test.precision}
                        unit={test.unit}
                        minValue={test.minValue}
                        maxValue={test.maxValue}
                        gender={player.gender}
                        category={player.category}
                        onSave={handleSave}
                      />
                      {existing !== undefined && (
                        <ScoreBadge score={existing.score} size="sm" showLabel />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
