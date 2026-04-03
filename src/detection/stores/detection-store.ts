import { create } from 'zustand';
import type {
  DetectionPlayer,
  DetectionSession,
  TestResult,
  AgeCategory,
  Gender,
} from '../types/detection';

type View = 'sessions' | 'players' | 'testing' | 'results';
type TestingMode = 'by_test' | 'by_player';

interface DetectionState {
  // Data
  sessions: DetectionSession[];
  players: DetectionPlayer[];
  results: TestResult[];

  // UI State
  view: View;
  activeSessionId: string | null;
  activePlayerId: string | null;
  activeTestId: string | null;
  testingMode: TestingMode;

  // Filters
  filterCategory: AgeCategory | 'all';
  filterGender: Gender | 'all';
  filterSearch: string;

  // Modals
  showSessionCreate: boolean;
  showPlayerCreate: boolean;
  showCompare: boolean;
  comparePlayerIds: string[];

  // Layout
  sidebarMobileOpen: boolean;

  // Mutations
  setSessions: (sessions: DetectionSession[]) => void;
  setPlayers: (players: DetectionPlayer[]) => void;
  setResults: (results: TestResult[]) => void;
  setView: (view: View) => void;
  setActiveSessionId: (id: string | null) => void;
  setActivePlayerId: (id: string | null) => void;
  setActiveTestId: (id: string | null) => void;
  setTestingMode: (mode: TestingMode) => void;
  setFilterCategory: (cat: AgeCategory | 'all') => void;
  setFilterGender: (g: Gender | 'all') => void;
  setFilterSearch: (s: string) => void;
  setShowSessionCreate: (v: boolean) => void;
  setShowPlayerCreate: (v: boolean) => void;
  setShowCompare: (v: boolean) => void;
  setComparePlayerIds: (ids: string[]) => void;
  addComparePlayerId: (id: string) => void;
  removeComparePlayerId: (id: string) => void;
  setSidebarMobileOpen: (v: boolean) => void;
}

export const useDetectionStore = create<DetectionState>((set) => ({
  sessions: [],
  players: [],
  results: [],

  view: 'sessions',
  activeSessionId: null,
  activePlayerId: null,
  activeTestId: null,
  testingMode: 'by_test',

  filterCategory: 'all',
  filterGender: 'all',
  filterSearch: '',

  showSessionCreate: false,
  showPlayerCreate: false,
  showCompare: false,
  comparePlayerIds: [],
  sidebarMobileOpen: false,

  setSessions: (sessions) => set({ sessions }),
  setPlayers: (players) => set({ players }),
  setResults: (results) => set({ results }),
  setView: (view) => set({ view }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setActivePlayerId: (id) => set({ activePlayerId: id }),
  setActiveTestId: (id) => set({ activeTestId: id }),
  setTestingMode: (mode) => set({ testingMode: mode }),
  setFilterCategory: (cat) => set({ filterCategory: cat }),
  setFilterGender: (g) => set({ filterGender: g }),
  setFilterSearch: (s) => set({ filterSearch: s }),
  setShowSessionCreate: (v) => set({ showSessionCreate: v }),
  setShowPlayerCreate: (v) => set({ showPlayerCreate: v }),
  setShowCompare: (v) => set({ showCompare: v }),
  setComparePlayerIds: (ids) => set({ comparePlayerIds: ids }),
  addComparePlayerId: (id) =>
    set((s) => ({
      comparePlayerIds: s.comparePlayerIds.includes(id)
        ? s.comparePlayerIds
        : [...s.comparePlayerIds, id].slice(0, 3),
    })),
  removeComparePlayerId: (id) =>
    set((s) => ({
      comparePlayerIds: s.comparePlayerIds.filter((x) => x !== id),
    })),
  setSidebarMobileOpen: (v) => set({ sidebarMobileOpen: v }),
}));
