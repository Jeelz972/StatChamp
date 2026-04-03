import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useDetectionStore } from '../../stores/detection-store';
import { compareProfiles } from '../../engine/detection-engine';
import type { PlayerProfile, DetectionPlayer, PlayerAxisScores } from '../../types/detection';

const COMPARE_COLORS = ['#e8913a', '#3b82f6', '#22c55e'];

const AXES: { key: keyof PlayerAxisScores; label: string }[] = [
  { key: 'speed', label: 'Vitesse' },
  { key: 'agility', label: 'Agilité' },
  { key: 'power', label: 'Puissance' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'shooting', label: 'Tir' },
  { key: 'anthropometry', label: 'Mesures' },
];

interface CompareViewProps {
  profiles: PlayerProfile[];
  players: DetectionPlayer[];
}

export function CompareView({ profiles, players }: CompareViewProps) {
  const { comparePlayerIds, addComparePlayerId, removeComparePlayerId, setComparePlayerIds } =
    useDetectionStore();

  const selectedProfiles = comparePlayerIds
    .map((id) => profiles.find((p) => p.playerId === id))
    .filter((p): p is PlayerProfile => p !== undefined);

  function getPlayer(playerId: string): DetectionPlayer | undefined {
    return players.find((p) => p.id === playerId);
  }

  function getPlayerName(playerId: string): string {
    const p = getPlayer(playerId);
    return p ? `${p.lastName} ${p.firstName[0]}.` : playerId;
  }

  // Build radar data with one key per player
  const radarData = AXES.map(({ key, label }) => {
    const entry: Record<string, string | number> = { axis: label };
    selectedProfiles.forEach((p, i) => {
      entry[`player${i}`] = p.axisScores[key];
    });
    return entry;
  });

  // Selector view
  if (selectedProfiles.length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Sélectionnez 2 ou 3 joueurs à comparer{' '}
            <span className="text-xs">({comparePlayerIds.length}/3 sélectionnés)</span>
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const player = getPlayer(profile.playerId);
            if (!player) return null;
            const isSelected = comparePlayerIds.includes(profile.playerId);
            const isDisabled = !isSelected && comparePlayerIds.length >= 3;
            return (
              <button
                key={profile.playerId}
                disabled={isDisabled}
                onClick={() =>
                  isSelected
                    ? removeComparePlayerId(profile.playerId)
                    : addComparePlayerId(profile.playerId)
                }
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : isDisabled
                    ? 'cursor-not-allowed border-border opacity-40'
                    : 'border-border hover:border-accent/50 hover:bg-accent/5'
                }`}
              >
                <div
                  className="h-4 w-4 shrink-0 rounded border"
                  style={
                    isSelected
                      ? { backgroundColor: COMPARE_COLORS[comparePlayerIds.indexOf(profile.playerId)], borderColor: 'transparent' }
                      : { borderColor: 'var(--border)' }
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {player.category} · {profile.compositeScore.toFixed(1)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Comparison view
  const delta =
    selectedProfiles.length >= 2
      ? compareProfiles(selectedProfiles[0], selectedProfiles[1])
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Player chips */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedProfiles.map((profile, i) => {
          const player = getPlayer(profile.playerId);
          return (
            <div
              key={profile.playerId}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1"
              style={{ borderColor: COMPARE_COLORS[i] }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COMPARE_COLORS[i] }}
              />
              <span className="text-sm font-medium">{getPlayerName(profile.playerId)}</span>
              <button
                onClick={() => removeComparePlayerId(profile.playerId)}
                className="ml-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => setComparePlayerIds([])}
        >
          Réinitialiser
        </Button>
        {comparePlayerIds.length < 3 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              // Reset to selector to add more
              const toRemove = comparePlayerIds[comparePlayerIds.length - 1];
              removeComparePlayerId(toRemove);
            }}
          >
            + Ajouter
          </Button>
        )}
      </div>

      {/* Superposed radar */}
      <div className="flex justify-center rounded-lg border border-border bg-card p-4">
        <RadarChart width={360} height={300} data={radarData}>
          <PolarGrid stroke="var(--border, #2a2b3d)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'var(--muted-foreground, #888)', fontSize: 11 }}
          />
          {selectedProfiles.map((p, i) => (
            <Radar
              key={p.playerId}
              name={getPlayerName(p.playerId)}
              dataKey={`player${i}`}
              stroke={COMPARE_COLORS[i]}
              fill={COMPARE_COLORS[i]}
              fillOpacity={0.15}
              dot={{ r: 3, fill: COMPARE_COLORS[i] }}
            />
          ))}
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: 11, color: 'var(--foreground)' }}>{value}</span>
            )}
          />
        </RadarChart>
      </div>

      {/* Comparison table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Axe</th>
              {selectedProfiles.map((p, i) => (
                <th
                  key={p.playerId}
                  className="px-4 py-2 text-center font-medium"
                  style={{ color: COMPARE_COLORS[i] }}
                >
                  {getPlayerName(p.playerId)}
                </th>
              ))}
              {delta && <th className="px-4 py-2 text-center font-medium text-muted-foreground">Δ (1 vs 2)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {AXES.map(({ key, label }) => (
              <tr key={key} className="hover:bg-accent/5">
                <td className="px-4 py-2 text-muted-foreground">{label}</td>
                {selectedProfiles.map((p, i) => {
                  const score = p.axisScores[key];
                  return (
                    <td key={i} className="px-4 py-2 text-center">
                      {score > 0 ? (
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${COMPARE_COLORS[i]}15`,
                            color: COMPARE_COLORS[i],
                          }}
                        >
                          {score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                  );
                })}
                {delta && (
                  <td className="px-4 py-2 text-center">
                    {(() => {
                      const d = delta.axisDeltas[key];
                      if (d === 0) return <span className="text-xs text-muted-foreground">=</span>;
                      return (
                        <span className={`text-xs font-semibold ${d > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {d > 0 ? '+' : ''}{d.toFixed(1)}
                        </span>
                      );
                    })()}
                  </td>
                )}
              </tr>
            ))}
            {/* Composite row */}
            <tr className="bg-accent/5 font-semibold">
              <td className="px-4 py-2">Global</td>
              {selectedProfiles.map((p, i) => (
                <td key={i} className="px-4 py-2 text-center">
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: `${COMPARE_COLORS[i]}20`,
                      color: COMPARE_COLORS[i],
                    }}
                  >
                    {p.compositeScore.toFixed(1)}
                  </span>
                </td>
              ))}
              {delta && (
                <td className="px-4 py-2 text-center">
                  {(() => {
                    const d = delta.compositeDelta;
                    if (d === 0) return <span className="text-xs text-muted-foreground">=</span>;
                    return (
                      <span className={`text-xs font-bold ${d > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {d > 0 ? '+' : ''}{d.toFixed(1)}
                      </span>
                    );
                  })()}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
