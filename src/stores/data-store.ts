import { create } from 'zustand';
import type { Game } from '../types/game';
import type { RosterEntry } from '../types/player';
import type { Phase, Season } from '../types/team';
import { DB } from '../db/firebase';

function resolvePhaseIds(season: any): string[] {
  if (!season?.phases?.length) return [];
  return season.phases
    .map((p: any) => (typeof p === 'string' ? p : p.id || p.name || ''))
    .filter(Boolean);
}

const DEFAULT_PHASES: Phase[] = [
  { id: 'phase1', name: 'Phase 1' },
  { id: 'phase2', name: 'Phase 2' },
];

interface DataState {
  // --- Donnees ---
  players: RosterEntry[];
  games: Game[];
  phases: Phase[];
  seasons: Season[];
  activeSeason: Season | null;
  isDataLoaded: boolean;
  playTypes: string[];

  // --- Mutations synchrones ---
  setPlayers: (p: RosterEntry[]) => void;
  setGames: (g: Game[]) => void;
  setPhases: (p: Phase[]) => void;
  setSeasons: (s: Season[]) => void;
  setActiveSeason: (season: Season | null) => void;
  setDataLoaded: (v: boolean) => void;
  setPlayTypes: (pt: string[]) => void;

  // --- Actions metier ---
  updateGame: (game: Game) => void;
  deleteGame: (gameId: string) => void;
  addGame: (game: Game) => void;
  rosterForSeason: (seasonId: string) => RosterEntry[];
  phasesForSeason: (seasonId: string) => Phase[];
  gamesForActiveSeason: () => Game[];
  updatePlayerStatus: (playerId: string, status: 'available' | 'injured' | 'doubtful' | 'rest' | 'sanction') => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  players: [],
  games: [],
  phases: DEFAULT_PHASES,
  seasons: [],
  activeSeason: null,
  isDataLoaded: false,
  playTypes: [
    'Transition',
    'Pick & Roll',
    'Jeu posté',
    'Isolation',
    'Motion',
    'Sortie de temps mort',
  ],

  setPlayers: (players) => set({ players }),
  setGames: (games) => set({ games }),
  setPhases: (phases) => set({ phases }),

  setSeasons: (seasons) => {
    const savedId = localStorage.getItem('statchamp_active_season_id');
    let activeSeason = get().activeSeason;

    // Re-sync activeSeason when seasons list changes
    if (!activeSeason || !seasons.find((s) => s.id === activeSeason?.id)) {
      if (savedId) {
        activeSeason = seasons.find((s) => s.id === savedId) ?? null;
      }
      if (!activeSeason) {
        activeSeason = seasons.find((s) => !s.archived && !s.archivedAt) ?? null;
      }
    }

    // Migration: populate flat phases store from embedded season phases if missing
    const currentPhases = get().phases;
    const knownIds = new Set(currentPhases.map((p) => p.id));
    const toAdd: Phase[] = [];
    for (const s of seasons) {
      if (s.id && s.phases?.length) {
        for (const ph of s.phases) {
          if (!knownIds.has(ph.id)) {
            toAdd.push({ ...ph, seasonId: ph.seasonId ?? s.id });
            knownIds.add(ph.id);
          }
        }
      }
    }
    const mergedPhases = toAdd.length > 0 ? [...currentPhases, ...toAdd] : currentPhases;
    set({ seasons, activeSeason, phases: mergedPhases });
  },

  setActiveSeason: (season) => {
    if (season?.id) {
      localStorage.setItem('statchamp_active_season_id', season.id);
    } else {
      localStorage.removeItem('statchamp_active_season_id');
    }
    set({ activeSeason: season });
  },

  setDataLoaded: (v) => set({ isDataLoaded: v }),
  setPlayTypes: (pt) => set({ playTypes: pt }),

  updateGame: (game) => {
    const { games } = get();
    const exists = games.some((g) => g.id === game.id);
    const newGames = exists
      ? games.map((g) => (g.id === game.id ? game : g))
      : [game, ...games];
    set({ games: newGames });
  },

  deleteGame: (gameId) => {
    set({ games: get().games.filter((g) => g.id !== gameId) });
  },

  addGame: (game) => {
    set({ games: [game, ...get().games] });
  },

  rosterForSeason: (seasonId: string) => {
    const { players } = get();
    if (!seasonId) return players;
    return players.filter((p) => !p.seasonIds?.length || p.seasonIds.includes(seasonId));
  },

  phasesForSeason: (seasonId: string) => {
    return get().phases.filter((p) => p.seasonId === seasonId);
  },

  gamesForActiveSeason: () => {
    const { games, activeSeason } = get();
    if (!activeSeason) return [];
    const phaseIds = resolvePhaseIds(activeSeason);
    if (phaseIds.length === 0) return games;
    return games.filter((g) => phaseIds.includes(g.phase));
  },

  updatePlayerStatus: (playerId, status) => {
    const { players } = get();
    const newPlayers = players.map((p) =>
      String(p.id) === String(playerId) ? { ...p, status } : p
    );
    set({ players: newPlayers });
    if ((window as any).db) {
      DB.saveRoster(newPlayers).catch(console.error);
    }
  },
}));
