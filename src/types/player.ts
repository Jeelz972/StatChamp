// ═══════════════════════════════════════════════════════════════
// ROSTER ENTRY (donnee brute depuis Firebase/Supabase)
// ═══════════════════════════════════════════════════════════════

export interface RosterEntry {
  id: number;
  name: string;
  number: string;
  pos?: string;
  photo?: string;
  status?: 'fit' | 'available' | 'injured' | 'doubtful' | 'rest' | 'sanction';
  seasonIds?: string[];
}

// ═══════════════════════════════════════════════════════════════
// PLAYER AVERAGES (calculees par AnalysisEngine.processPlayerData)
// ═══════════════════════════════════════════════════════════════

export interface PlayerAverages {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  min: number;
  eff: number;
  plusMinus: number;
  oreb: number;
  fouls: number;
  fgm: number;
  fga: number;
  fta: number;
  ftm: number;
  threem: number;
  threea: number;
  fgPct: number;
  threePct: number;
  ftPct: number;
  TS: number;
  eFG: number;
  usage: number;
  threePAr: number;
  FTr: number;
  astTov: number;
  pf36: number;
  netRtg: number;
  impactTotal: number;
  fte: number;
  astPct?: number;
  tovPct?: number;
  woba?: number;
  adjPM?: number;
  dreb?: number;
}

// ═══════════════════════════════════════════════════════════════
// GAME LOG (un match pour un joueur)
// ═══════════════════════════════════════════════════════════════

export interface PlayerGameLog {
  date: string;
  rawDate: number;
  opponent: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  min: number;
  eff: number;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  oreb: number;
  fouls: number;
  plusMinus: number;
  usage: number;
  netRtg: number;
  foulDrawn?: number;
  _hasFteData?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PROCESSED PLAYER (sortie de AnalysisEngine.processPlayerData)
// ═══════════════════════════════════════════════════════════════

export interface ProcessedPlayer {
  id: number;
  name: string;
  number: string;
  pos?: string;
  photo?: string;
  status?: string;
  logs: PlayerGameLog[];
  avg: PlayerAverages;
  shotProfile?: ShotProfile;
}

// ═══════════════════════════════════════════════════════════════
// SHOT PROFILE
// ═══════════════════════════════════════════════════════════════

export interface ShotProfile {
  paintPct: number;
  midPct: number;
  cornerPct: number;
  abPct: number;
  totalShots: number;
}

// ═══════════════════════════════════════════════════════════════
// FINGERPRINT (8 dimensions, 0-100 chacune)
// ═══════════════════════════════════════════════════════════════

export interface PlayerFingerprint {
  volume: number;
  efficiency: number;
  shooting: number;
  creation: number;
  rebounding: number;
  interior: number;
  defense: number;
  impact: number;
}

// ═══════════════════════════════════════════════════════════════
// ARCHETYPE
// ═══════════════════════════════════════════════════════════════

export interface Archetype {
  name: string;
  desc: string;
  secondary: string | null;
  tags: string[];
  color: string;
  border: string;
  bg: string;
  tier: number;
  fingerprint: PlayerFingerprint | null;
  nbaComp: NBAComparison | null;
}

// ═══════════════════════════════════════════════════════════════
// NBA COMPARISON
// ═══════════════════════════════════════════════════════════════

export interface NBACompMatch {
  name: string | null;
  similarity: number;
  desc: string;
}

export interface NBAComparison {
  best: NBACompMatch;
  second: NBACompMatch;
  styleTwin: NBACompMatch | null;
  top5: Array<{ name: string; dist: number }>;
  isAnomaly: boolean;
  shotMatchUsed: boolean;
}

// ═══════════════════════════════════════════════════════════════
// NBA PROFILE (reference depuis nba-profiles.js)
// ═══════════════════════════════════════════════════════════════

export interface NBAProfile {
  name: string;
  desc: string;
  style: {
    astRatio: number;
    rebRatio: number;
    defRatio: number;
    threePAr: number;
    ftRate: number;
    usageNorm: number;
  };
  prod: {
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    tov: number;
    TS: number;
    usage: number;
    eff: number;
  };
  shot: {
    paintPct: number;
    midPct: number;
    cornerPct: number;
    abPct: number;
  };
}
