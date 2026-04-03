import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
import { getEligibleTestsByCategory, getEligibleTests } from '../../engine/test-catalog';
import { scoreRawValue } from '../../engine/baremes';
import { isTestEligible } from '../../engine/test-catalog';
import { ScoreBadge } from '../shared/ScoreBadge';
import { TestCategoryTabs } from './TestCategoryTabs';
import { TestInput } from './TestInput';
import type { TestCategory, TestResult } from '../../types/detection';

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function TestBatchInput() {
  const { sessions, players, results, setResults, activeSessionId } = useDetectionStore();

  const session = sessions.find((s) => s.id === activeSessionId);
  const sessionPlayers = players.filter((p) => session?.playerIds.includes(p.id));

  const [activeCategory, setActiveCategory] = useState<TestCategory>('speed');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const testsInCategory = useMemo(() => {
    // Get all tests for this category that at least one session player is eligible for
    if (!session) return [];
    const catTests = session.testIds
      .map((id) => {
        const found = getEligibleTests('Senior').find((t) => t.id === id);
        return found;
      })
      .filter((t): t is NonNullable<typeof t> => t !== undefined && t.category === activeCategory);
    return catTests;
  }, [session, activeCategory]);

  // Auto-select first test when category changes
  useEffect(() => {
    if (testsInCategory.length > 0) {
      setActiveTestId(testsInCategory[0].id);
    } else {
      setActiveTestId(null);
    }
  }, [activeCategory, testsInCategory]);

  const activeTest = testsInCategory.find((t) => t.id === activeTestId) ?? null;

  // Build result map keyed by `playerId_testId`
  const resultMap = useMemo(() => {
    const map: Record<string, TestResult> = {};
    for (const r of results) {
      map[`${r.playerId}_${r.testId}`] = r;
    }
    return map;
  }, [results]);

  // Counts per category for badge
  const counts = useMemo(() => {
    const cats: TestCategory[] = ['speed', 'agility', 'power', 'endurance', 'shooting', 'anthropometry'];
    const out: Partial<Record<TestCategory, { filled: number; total: number }>> = {};
    if (!session) return out;
    for (const cat of cats) {
      const catTestIds = session.testIds.filter((id) => {
        const t = getEligibleTests('Senior').find((x) => x.id === id);
        return t?.category === cat;
      });
      if (catTestIds.length === 0) continue;
      let filled = 0;
      let total = 0;
      for (const p of sessionPlayers) {
        for (const tid of catTestIds) {
          if (isTestEligible(tid, p.category)) {
            total++;
            if (resultMap[`${p.id}_${tid}`] !== undefined) filled++;
          }
        }
      }
      out[cat] = { filled, total };
    }
    return out;
  }, [session, sessionPlayers, resultMap]);

  // Count filled for current test
  const filledForTest = activeTestId
    ? sessionPlayers.filter((p) => resultMap[`${p.id}_${activeTestId}`] !== undefined).length
    : 0;
  const eligibleForTest = activeTestId
    ? sessionPlayers.filter((p) => isTestEligible(activeTestId, p.category)).length
    : 0;

  // First empty input ref
  const firstEmptyRef = useRef<HTMLInputElement>(null);

  async function handleSave(result: TestResult) {
    await DetectionDB.saveResult(result);
    setResults([...results.filter((r) => r.id !== result.id), result]);
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-4">
      <TestCategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        counts={counts}
      />

      {/* Test chips */}
      {testsInCategory.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {testsInCategory.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTestId(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTestId === t.id
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
              }`}
            >
              {t.shortName}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun test dans cette catégorie pour cette session.</p>
      )}

      {/* Sticky header + player list */}
      {activeTest && (
        <div className="rounded-lg border border-border">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-border bg-muted/80 px-4 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{activeTest.name}</span>
              <span className="text-xs text-muted-foreground">({activeTest.unit})</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {filledForTest}/{eligibleForTest} saisis
            </span>
          </div>

          {/* Players */}
          <div className="divide-y divide-border">
            {sessionPlayers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Aucun joueur dans cette session.
              </p>
            ) : (
              sessionPlayers.map((player) => {
                const eligible = isTestEligible(activeTest.id, player.category);
                const existing = resultMap[`${player.id}_${activeTest.id}`];
                const liveScore = existing
                  ? existing.score
                  : undefined;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${!eligible ? 'opacity-40' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                      {initials(player.firstName, player.lastName)}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{player.category}</p>
                    </div>

                    {/* Input or disabled message */}
                    {eligible ? (
                      <div className="flex items-center gap-2">
                        <TestInput
                          testId={activeTest.id}
                          playerId={player.id}
                          sessionId={session.id}
                          currentValue={existing?.rawValue}
                          precision={activeTest.precision}
                          unit={activeTest.unit}
                          minValue={activeTest.minValue}
                          maxValue={activeTest.maxValue}
                          gender={player.gender}
                          category={player.category}
                          onSave={handleSave}
                        />
                        {liveScore !== undefined && (
                          <ScoreBadge score={liveScore} size="sm" />
                        )}
                        {liveScore === undefined && existing === undefined && (
                          <span className="w-10" />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Non dispo ({player.category})
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
