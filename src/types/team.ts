export interface Phase {
  id: string;
  name: string;
  seasonId?: string;
  sortOrder?: number;
}

export interface Season {
  id?: string;
  label?: string;
  name: string;
  roster?: import('./player').RosterEntry[];
  games?: import('./game').Game[];
  phases?: Phase[];
  archivedAt?: string;
  archived?: boolean;
}

export interface AppConfig {
  playTypes?: string[];
  _wk?: string;
}

// ═══════════════════════════════════════════════════════════════
// BENCHMARKS (seuils par niveau de competition)
// ═══════════════════════════════════════════════════════════════

export interface LevelBenchmarks {
  id: string;
  label: string;
  ts_elite: number;
  ts_good: number;
  ts_bad: number;
  usage_high: number;
  usage_low: number;
  ast_good: number;
  astTov_good: number;
  astTov_bad: number;
  oreb_good: number;
  reb_dom: number;
  def_active: number;
  pf36_warn: number;
  pf36_bad: number;
  threePct_good: number;
  trend_delta: number;
}
