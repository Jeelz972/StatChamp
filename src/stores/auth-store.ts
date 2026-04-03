import { create } from 'zustand';
import { DB } from '../db/firebase';

export interface TeamInfo {
  id: string;
  name: string;
}

const CREDENTIALS: Record<string, { password: string; role: string }> = {
  coach: { password: 'CoachPass2026', role: 'coach' },
  root: { password: 'RootPass2026', role: 'root' },
};

interface AuthState {
  isAdmin: boolean;
  isPlayerMode: boolean;
  isRoot: boolean;
  userId: string | null;
  currentTeamId: string | null;
  availableTeams: TeamInfo[];

  login: (username: string, password: string) => Promise<boolean>;
  loginWithCredentials: (userId: string, role: string, teamId: string | null) => void;
  logout: () => void;
  setPlayerMode: (v: boolean) => void;
  setTeam: (teamId: string) => Promise<void>;
  setAvailableTeams: (teams: TeamInfo[]) => void;
  restoreSession: () => void;
  loadTeams: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAdmin: localStorage.getItem('statchamp_admin') === 'true',
  isPlayerMode: new URLSearchParams(window.location.search).get('mode') === 'player',
  isRoot: localStorage.getItem('statchamp_role') === 'root',
  userId: localStorage.getItem('statchamp_user_id'),
  currentTeamId: localStorage.getItem('statchamp_team_id'),
  availableTeams: [],

  login: async (username: string, password: string): Promise<boolean> => {
    const cred = CREDENTIALS[username.toLowerCase()];
    if (!cred || cred.password !== password) return false;
    const role = cred.role;
    const isAdminRole = role === 'coach' || role === 'root';
    const isRootRole = role === 'root';
    const wk = btoa(`${username}:${password}`);
    localStorage.setItem('statchamp_wk', wk);
    sessionStorage.setItem('statchamp_wk', wk);
    localStorage.setItem('statchamp_admin', String(isAdminRole));
    localStorage.setItem('statchamp_role', role);
    localStorage.setItem('statchamp_user_id', username.toLowerCase());
    set({ isAdmin: isAdminRole, isRoot: isRootRole, userId: username.toLowerCase() });
    return true;
  },

  loginWithCredentials: (userId: string, role: string, teamId: string | null) => {
    const isAdminRole = role === 'coach' || role === 'root';
    const isRootRole = role === 'root';
    localStorage.setItem('statchamp_admin', String(isAdminRole));
    localStorage.setItem('statchamp_role', role);
    localStorage.setItem('statchamp_user_id', userId);
    if (teamId) {
      localStorage.setItem('statchamp_team_id', teamId);
      DB.setTeam(teamId);
    } else {
      localStorage.removeItem('statchamp_team_id');
    }
    set({ isAdmin: isAdminRole, isRoot: isRootRole, userId, currentTeamId: teamId });
  },

  logout: () => {
    sessionStorage.removeItem('statchamp_wk');
    localStorage.removeItem('statchamp_wk');
    localStorage.removeItem('statchamp_admin');
    localStorage.removeItem('statchamp_role');
    localStorage.removeItem('statchamp_user_id');
    localStorage.removeItem('statchamp_team_id');
    DB.setTeam(null);
    set({ isAdmin: false, isRoot: false, userId: null, currentTeamId: null, availableTeams: [] });
  },

  setPlayerMode: (v: boolean) => set({ isPlayerMode: v }),

  setTeam: async (teamId: string): Promise<void> => {
    localStorage.setItem('statchamp_team_id', teamId);
    set({ currentTeamId: teamId });
    if ((window as any).db) {
      await DB.initTeam(teamId);
    } else {
      DB.setTeam(teamId);
    }
  },

  setAvailableTeams: (teams: TeamInfo[]) => set({ availableTeams: teams }),

  restoreSession: () => {
    const wk = localStorage.getItem('statchamp_wk');
    if (!wk) return;
    const isAdmin = localStorage.getItem('statchamp_admin') === 'true';
    const isRoot = localStorage.getItem('statchamp_role') === 'root';
    const userId = localStorage.getItem('statchamp_user_id');
    const teamId = localStorage.getItem('statchamp_team_id');
    sessionStorage.setItem('statchamp_wk', wk);
    if (teamId) DB.setTeam(teamId);
    set({ isAdmin, isRoot, userId, currentTeamId: teamId });
  },

  loadTeams: async (): Promise<void> => {
    if (!(window as any).db) return;
    try {
      const teams = await DB.getTeams();
      if (!teams?.length) return;
      set({ availableTeams: teams });
      const { currentTeamId } = get();
      if (!currentTeamId) {
        const defaultTeam = teams.find((t: TeamInfo) => t.id === 'default') ?? teams[0];
        await get().setTeam(defaultTeam.id);
      } else {
        await DB.initTeam(currentTeamId);
      }
    } catch (_) {}
  },
}));
