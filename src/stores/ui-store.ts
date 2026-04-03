import { create } from 'zustand';

type ViewId =
  | 'home'
  | 'global_stats'
  | 'history'
  | 'settings'
  | 'season'
  | 'scouting'
  | 'gameprep'
  | 'live';

interface UIState {
  view: ViewId;
  showLogin: boolean;
  showReport: boolean;
  importData: any | null;
  multiImportQueue: any[];
  prepOpponent: string | null;
  activeGame: any | null;

  setView: (v: ViewId) => void;
  setShowLogin: (v: boolean) => void;
  setShowReport: (v: boolean) => void;
  setImportData: (d: any | null) => void;
  setMultiImportQueue: (q: any[]) => void;
  setPrepOpponent: (name: string | null) => void;
  setActiveGame: (g: any | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'home',
  showLogin: false,
  showReport: false,
  importData: null,
  multiImportQueue: [],
  prepOpponent: null,
  activeGame: null,

  setView: (view) => set({ view }),
  setShowLogin: (showLogin) => set({ showLogin }),
  setShowReport: (showReport) => set({ showReport }),
  setImportData: (importData) => set({ importData }),
  setMultiImportQueue: (multiImportQueue) => set({ multiImportQueue }),
  setPrepOpponent: (prepOpponent) => set({ prepOpponent }),
  setActiveGame: (activeGame) => set({ activeGame }),
}));
