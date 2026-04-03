// ═══════════════════════════════════════════════════════════════
// ACTIONS — Union discriminee par le champ `type`
// ═══════════════════════════════════════════════════════════════

export interface BaseAction {
  id?: string;
  q: number;
  time: number;
  pid: number;
  team?: 'home' | 'away';
  onCourt?: number[];
}

export interface ShotAction extends BaseAction {
  type: 'SHOT';
  made: boolean;
  val: 2 | 3;
  zone?: string;
  x?: number;
  y?: number;
  astId?: number;
  assistId?: number;
  hockeyAssistId?: number;
  shotQuality?: number;
  playType?: string;
}

export interface FreeThrowAction extends BaseAction {
  type: 'FT';
  ftMade: number;
  ftTotal: number;
  foulRef?: string;
}

export interface PersonalFoulAction extends BaseAction {
  type: 'FOUL';
  foulType: 'PERSONAL' | 'OFFENSIVE';
  victimId: number;
  ftAwarded: number;
}

export interface TechnicalFoulAction extends BaseAction {
  type: 'FOUL';
  foulType: 'TECHNICAL' | 'UNSPORTSMANLIKE';
  ftShooterId?: number;
}

export interface ReboundAction extends BaseAction {
  type: 'OREB' | 'DREB';
}

export interface StealAction extends BaseAction {
  type: 'STL';
  loserId?: number;
}

export interface BlockAction extends BaseAction {
  type: 'BLK';
  blockedId?: number;
}

export interface TurnoverAction extends BaseAction {
  type: 'TOV';
  unforced?: boolean;
}

export interface SubAction extends BaseAction {
  type: 'SUB';
  subOut: number;
  inId?: number;
  outId?: number;
}

export interface TimeoutAction extends BaseAction {
  type: 'TIMEOUT';
  duration?: number;
}

export interface StoppageAction extends BaseAction {
  type: 'STOPPAGE';
  duration?: number;
}

export interface PaintTouchAction extends BaseAction {
  type: 'PAINT_TOUCH';
}

export interface DeflectionAction extends BaseAction {
  type: 'DEFLECTION';
}

export interface BoxoutAction extends BaseAction {
  type: 'BOXOUT';
}

export interface BlowbyAction extends BaseAction {
  type: 'BLOWBY';
}

export type GameAction =
  | ShotAction
  | FreeThrowAction
  | PersonalFoulAction
  | TechnicalFoulAction
  | ReboundAction
  | StealAction
  | BlockAction
  | TurnoverAction
  | SubAction
  | TimeoutAction
  | StoppageAction
  | PaintTouchAction
  | DeflectionAction
  | BoxoutAction
  | BlowbyAction;

// ═══════════════════════════════════════════════════════════════
// FOUL ACTIONS — Type guard utilitaire
// ═══════════════════════════════════════════════════════════════

export type FoulAction = PersonalFoulAction | TechnicalFoulAction;

export function isTechnicalFoul(a: FoulAction): a is TechnicalFoulAction {
  return a.foulType === 'TECHNICAL' || a.foulType === 'UNSPORTSMANLIKE';
}

export function isPersonalFoul(a: FoulAction): a is PersonalFoulAction {
  return a.foulType === 'PERSONAL' || a.foulType === 'OFFENSIVE';
}

// ═══════════════════════════════════════════════════════════════
// PLAYER STATS (par match, stockees dans game.playerStats)
// ═══════════════════════════════════════════════════════════════

export interface PlayerGameStats {
  pts: number;
  fgm: number;          // 2PT made (hors 3PT)
  fga: number;          // 2PT attempted (hors 3PT)
  threePM: number;
  threePA: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  minutes: number;
  plusMinus: number;
  foulDrawn?: number;
  blkAgainst?: number;
}

// ═══════════════════════════════════════════════════════════════
// OPPONENT STATS (agrege par match)
// ═══════════════════════════════════════════════════════════════

export interface OpponentStats {
  pts?: number;
  fgm?: number;
  fga?: number;
  ftm?: number;
  fta?: number;
  oreb?: number;
  dreb?: number;
  reb?: number;
  tov?: number;
  fouls?: number;
  ast?: number;
  blk?: number;
}

// ═══════════════════════════════════════════════════════════════
// COACH REPORT (saved in game document)
// ═══════════════════════════════════════════════════════════════

export interface CoachReportAlert {
  level: 'good' | 'problem';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  weight: number;
}

export interface CoachReportIndividual {
  pid: number;
  name: string;
  number: string;
  type: 'positive' | 'negative';
  message: string;
  value: number;
  impactDetail?: string;
}

export interface CoachReportAward {
  type: string;
  pid: number;
  name: string;
  number: string;
  stat: string;
  value: number;
}

export interface CoachReport {
  type: 'halftime' | 'final';
  generatedAt: string;
  teamStats: {
    fgm: number; fga: number; fgPct: number;
    threePM: number; threePA: number; threePct: number;
    ftm: number; fta: number; ftPct: number;
    oreb: number; dreb: number; reb: number;
    ast: number; tov: number; stl: number; blk: number; pf: number;
  };
  scoreByQuarter: Array<{ q: number; home: number; away: number }>;
  tone: { label: string; icon: string };
  recommendations: string[];
  alerts: CoachReportAlert[];
  possession: {
    tovCost: number; foulCost: number; oppOrebCost: number;
    stlGain: number; orebGain: number; lfGain: number;
    totalCost: number; totalGain: number; net: number;
  };
  individualAlerts: CoachReportIndividual[];
  awards?: CoachReportAward[];
  disruptor?: { pid: number; name: string; number: string; pts: number; eff: number } | null;
}

// ═══════════════════════════════════════════════════════════════
// GAME
// ═══════════════════════════════════════════════════════════════

export interface Game {
  id: string;
  date: string;
  opponent: string;
  phase: string;
  homeScore?: number;
  awayScore?: number;
  status?: 'live' | 'final';
  playerStats: Record<string, PlayerGameStats>;
  opponentStats?: OpponentStats;
  opponentPlayerStats?: Record<string, PlayerGameStats & { number?: string; name?: string }>;
  actions: GameAction[];
  scoreHistory?: Array<{ time: number; q: number; home: number; away: number }>;
  starters?: Record<number, number[]>;
  opponentStarters?: Record<number, number[]>;
  specialFouls?: {
    technical: any[];
    unsportsmanlike: any[];
    offensive: any[];
  };
  playTypes?: string[];
  teamFouls?: { home: number[]; away: number[] };
  timeouts?: { home: any[]; away: any[] };
  _deleted?: boolean;
  _wk?: string;
  updatedAt?: string;
  coachReport?: CoachReport;
}

// ═══════════════════════════════════════════════════════════════
// SCORE HISTORY POINT
// ═══════════════════════════════════════════════════════════════

export interface ScoreHistoryPoint {
  time: number;
  q: number;
  home: number;
  away: number;
}
