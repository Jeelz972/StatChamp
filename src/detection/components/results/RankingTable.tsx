import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { rankPlayers } from '../../engine/detection-engine';
import { useDetectionStore } from '../../stores/detection-store';
import type { PlayerProfile, DetectionPlayer, PlayerAxisScores } from '../../types/detection';

interface RankingTableProps {
  profiles: PlayerProfile[];
  players: DetectionPlayer[];
}

type SortKey = 'composite' | keyof PlayerAxisScores;

function scoreCellClass(score: number): string {
  if (score === 0) return 'text-muted-foreground/40';
  if (score >= 4.5) return 'bg-emerald-500/10 text-emerald-400';
  if (score >= 3.5) return 'bg-blue-500/10 text-blue-400';
  if (score >= 2.5) return 'bg-amber-500/10 text-amber-400';
  if (score >= 1.5) return 'bg-orange-500/10 text-orange-400';
  return 'bg-red-500/10 text-red-400';
}

function ScoreCell({ score, highlight }: { score: number; highlight?: boolean }) {
  if (score === 0) return <span className="text-xs text-muted-foreground/40">—</span>;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreCellClass(score)} ${
        highlight ? 'text-sm font-bold' : ''
      }`}
    >
      {score.toFixed(1)}
    </span>
  );
}

const AXES: { key: keyof PlayerAxisScores; label: string }[] = [
  { key: 'speed', label: 'Vitesse' },
  { key: 'agility', label: 'Agilité' },
  { key: 'power', label: 'Puissance' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'shooting', label: 'Tir' },
  { key: 'anthropometry', label: 'Anthropo' },
];

export function RankingTable({ profiles, players }: RankingTableProps) {
  const { setActivePlayerId } = useDetectionStore();
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = (() => {
    const base =
      sortKey === 'composite'
        ? rankPlayers(profiles)
        : rankPlayers(profiles, sortKey as keyof PlayerAxisScores);
    return sortDir === 'asc' ? [...base].reverse() : base;
  })();

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 text-muted-foreground/40">↕</span>;
    return <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  }

  function HeaderBtn({ k, label, className }: { k: SortKey; label: string; className?: string }) {
    return (
      <TableHead
        className={`cursor-pointer select-none whitespace-nowrap hover:text-foreground ${
          sortKey === k ? 'text-foreground' : 'text-muted-foreground'
        } ${className ?? ''}`}
        onClick={() => handleSort(k)}
      >
        {label}
        <SortIcon k={k} />
      </TableHead>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-center">#</TableHead>
            <TableHead>Joueur</TableHead>
            <TableHead className="hidden md:table-cell">Cat</TableHead>
            <TableHead className="hidden md:table-cell">Genre</TableHead>
            <HeaderBtn k="composite" label="Global" className="bg-accent/5" />
            {AXES.map(({ key, label }) => (
              <TableHead
                key={key}
                className={`cursor-pointer select-none whitespace-nowrap hover:text-foreground ${
                  sortKey === key ? 'text-foreground' : 'text-muted-foreground'
                }`}
                onClick={() => handleSort(key as SortKey)}
              >
                {label}
                <SortIcon k={key as SortKey} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                Aucun profil calculé.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((profile, idx) => {
              const player = players.find((p) => p.id === profile.playerId);
              if (!player) return null;
              return (
                <TableRow
                  key={profile.playerId}
                  className="cursor-pointer hover:bg-accent/5"
                  onClick={() => setActivePlayerId(profile.playerId)}
                >
                  <TableCell className="text-center text-sm text-muted-foreground font-mono">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {player.lastName} {player.firstName[0]}.
                      </p>
                      {player.club && (
                        <p className="text-xs text-muted-foreground">{player.club}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
                      {player.category}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        player.gender === 'M'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-pink-500/10 text-pink-400'
                      }`}
                    >
                      {player.gender}
                    </span>
                  </TableCell>
                  <TableCell className="bg-accent/5">
                    <ScoreCell score={profile.compositeScore} highlight />
                  </TableCell>
                  {AXES.map(({ key }) => (
                    <TableCell key={key}>
                      <ScoreCell score={profile.axisScores[key]} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
