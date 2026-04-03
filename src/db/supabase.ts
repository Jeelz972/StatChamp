// ═══════════════════════════════════════════════════════════════
// DB Layer — Supabase implementation
// Remplace src/db/firebase.ts une fois la migration validée.
// Interface identique pour zéro impact sur les consumers.
// ═══════════════════════════════════════════════════════════════

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Game, GameAction, PlayerGameStats } from '../types/game';
import type { RosterEntry } from '../types/player';
import type { Phase, Season, AppConfig } from '../types/team';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let _teamId: string | null = null;
let _supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

function getWk(): string {
  return sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
}

// ─── Row → Domain mappers ────────────────────────────────────

function rowToPlayer(row: any): RosterEntry {
  return {
    id:        row.id,
    name:      row.name,
    number:    String(row.number),
    pos:       row.pos ?? 'G',
    status:    row.status ?? 'available',
    photo:     row.photo_url ?? undefined,
    seasonIds: [],
  };
}

function rowToPhase(row: any): Phase {
  return {
    id:         row.id,
    name:       row.name,
    seasonId:   row.season_id ?? undefined,
    sortOrder:  row.sort_order ?? 0,
  };
}

function rowToSeason(row: any): Season {
  return {
    id:         row.id,
    name:       row.name,
    label:      row.name,
    archived:   !!row.archived_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

function statsRowToPlayerStats(row: any): PlayerGameStats {
  return {
    pts:       row.pts,
    fgm:       row.fgm,
    fga:       row.fga,
    threePM:   row.three_pm,
    threePA:   row.three_pa,
    ftm:       row.ftm,
    fta:       row.fta,
    oreb:      row.oreb,
    dreb:      row.dreb,
    ast:       row.ast,
    stl:       row.stl,
    blk:       row.blk,
    tov:       row.tov,
    pf:        row.pf,
    minutes:   row.minutes,
    plusMinus: row.plus_minus,
    foulDrawn: row.foul_drawn ?? undefined,
    blkAgainst: row.blk_against ?? undefined,
  };
}

function actionRowToGameAction(row: any): GameAction {
  const base = {
    id:    String(row.id),
    q:     row.quarter,
    time:  row.time_seconds ?? 0,
    pid:   row.pid != null ? parseInt(row.pid, 10) : 0,
    team:  row.team as 'home' | 'away' | undefined,
    onCourt: row.on_court ?? undefined,
  };

  switch (row.type) {
    case 'SHOT':
      return {
        ...base,
        type:            'SHOT',
        made:            row.made ?? false,
        val:             (row.shot_value ?? 2) as 2 | 3,
        zone:            row.zone ?? undefined,
        x:               row.x ?? undefined,
        y:               row.y ?? undefined,
        astId:           row.ast_id != null ? parseInt(row.ast_id, 10) : undefined,
        hockeyAssistId:  row.hockey_assist_id != null ? parseInt(row.hockey_assist_id, 10) : undefined,
        shotQuality:     row.shot_quality ?? undefined,
        playType:        row.play_type ?? undefined,
      };
    case 'FT':
      return { ...base, type: 'FT', ftMade: row.ft_made ?? 0, ftTotal: row.ft_total ?? 0 };
    case 'FOUL':
      if (row.foul_type === 'TECHNICAL' || row.foul_type === 'UNSPORTSMANLIKE') {
        return {
          ...base, type: 'FOUL',
          foulType:     row.foul_type,
          ftShooterId:  row.ft_shooter_id != null ? parseInt(row.ft_shooter_id, 10) : undefined,
        };
      }
      return {
        ...base, type: 'FOUL',
        foulType:  (row.foul_type ?? 'PERSONAL') as 'PERSONAL' | 'OFFENSIVE',
        victimId:  row.victim_id != null ? parseInt(row.victim_id, 10) : 0,
        ftAwarded: row.ft_awarded ?? 0,
      };
    case 'OREB': return { ...base, type: 'OREB' };
    case 'DREB': return { ...base, type: 'DREB' };
    case 'STL':  return { ...base, type: 'STL', loserId: row.loser_id != null ? parseInt(row.loser_id, 10) : undefined };
    case 'BLK':  return { ...base, type: 'BLK', blockedId: row.blocked_id != null ? parseInt(row.blocked_id, 10) : undefined };
    case 'TOV':  return { ...base, type: 'TOV', unforced: row.unforced ?? undefined };
    case 'SUB':  return { ...base, type: 'SUB', subOut: row.sub_out_id != null ? parseInt(row.sub_out_id, 10) : 0, inId: row.sub_in_id != null ? parseInt(row.sub_in_id, 10) : undefined };
    case 'TIMEOUT':  return { ...base, type: 'TIMEOUT', duration: row.duration ?? undefined };
    case 'STOPPAGE': return { ...base, type: 'STOPPAGE', duration: row.duration ?? undefined };
    case 'PAINT_TOUCH': return { ...base, type: 'PAINT_TOUCH' };
    case 'DEFLECTION':  return { ...base, type: 'DEFLECTION' };
    case 'BOXOUT':      return { ...base, type: 'BOXOUT' };
    case 'BLOWBY':      return { ...base, type: 'BLOWBY' };
    default:            return { ...base, type: 'STOPPAGE' };
  }
}

async function assembleGames(gameRows: any[]): Promise<Game[]> {
  if (!gameRows.length) return [];
  const ids = gameRows.map((g) => g.id);
  const sb = getClient();

  const [statsRes, actionsRes, startersRes, shRes] = await Promise.all([
    sb.from('game_player_stats').select('*').in('game_id', ids),
    sb.from('game_actions').select('*').in('game_id', ids).order('action_index'),
    sb.from('game_starters').select('*').in('game_id', ids),
    sb.from('score_history').select('*').in('game_id', ids).order('time_seconds'),
  ]);

  // Group by game_id
  const statsMap   = groupBy(statsRes.data ?? [], 'game_id');
  const actionsMap = groupBy(actionsRes.data ?? [], 'game_id');
  const startersMap = groupBy(startersRes.data ?? [], 'game_id');
  const shMap      = groupBy(shRes.data ?? [], 'game_id');

  return gameRows.map((row) => {
    const stats         = statsMap[row.id] ?? [];
    const homeStats     = stats.filter((s: any) => s.side === 'home');
    const opponentStats = stats.filter((s: any) => s.side === 'opponent');
    const actions       = actionsMap[row.id] ?? [];
    const starters      = startersMap[row.id] ?? [];
    const sh            = shMap[row.id] ?? [];

    // playerStats: Record<playerId, PlayerGameStats>
    const playerStats: Record<string, PlayerGameStats> = {};
    homeStats.forEach((s: any) => { playerStats[String(s.player_id)] = statsRowToPlayerStats(s); });

    // opponentPlayerStats
    const oppStats: Record<string, PlayerGameStats> = {};
    opponentStats.forEach((s: any) => { oppStats[String(s.player_id)] = statsRowToPlayerStats(s); });

    // starters: Record<quarter, number[]> (home only)
    const startersRecord: Record<number, number[]> = {};
    const oppStartersRecord: Record<number, number[]> = {};
    starters.forEach((st: any) => {
      const ids = (st.player_ids as string[]).map((id: string) => parseInt(id, 10));
      if (st.side === 'home') startersRecord[st.quarter] = ids;
      else oppStartersRecord[st.quarter] = ids;
    });

    const game: Game = {
      id:                  row.id,
      date:                typeof row.date === 'string' ? row.date.slice(0, 10) : String(row.date),
      opponent:            row.opponent,
      phase:               row.phase_id ?? '',
      homeScore:           row.home_score,
      awayScore:           row.away_score,
      status:              row.status as 'live' | 'final',
      playerStats,
      opponentPlayerStats: Object.keys(oppStats).length ? oppStats : undefined,
      actions:             actions.map(actionRowToGameAction),
      scoreHistory:        sh.map((pt: any) => ({ time: pt.time_seconds, q: pt.quarter, home: pt.home_score, away: pt.away_score })),
      starters:            Object.keys(startersRecord).length ? startersRecord : undefined,
      opponentStarters:    Object.keys(oppStartersRecord).length ? oppStartersRecord : undefined,
      teamFouls:           row.team_fouls ?? undefined,
      timeouts:            row.timeouts ?? undefined,
      playTypes:           row.play_types ?? undefined,
    };
    return game;
  });
}

function groupBy<T>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce((acc: Record<string, T[]>, item: any) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ─── Game → RPC payload ──────────────────────────────────────

function gameToRpcPayload(game: Game) {
  const p_game = {
    id:             game.id,
    season_id:      (game as any).seasonId ?? null,
    date:           game.date,
    opponent:       game.opponent,
    home_score:     game.homeScore ?? 0,
    away_score:     game.awayScore ?? 0,
    phase_id:       game.phase ?? null,
    status:         game.status ?? 'final',
    team_fouls:     game.teamFouls ?? null,
    timeouts:       game.timeouts ?? null,
    play_types:     game.playTypes ?? null,
  };

  const p_player_stats = [
    ...Object.entries(game.playerStats ?? {}).map(([pid, s]) => ({ player_id: parseInt(pid, 10), side: 'home', ...statsToRow(s) })),
    ...Object.entries(game.opponentPlayerStats ?? {}).map(([pid, s]) => ({ player_id: parseInt(pid, 10), side: 'opponent', ...statsToRow(s) })),
  ];

  const p_actions = (game.actions ?? []).map((a: any, i: number) => ({
    action_index:    i,
    type:            a.type,
    pid:             a.pid != null ? String(a.pid) : null,
    team:            a.team ?? null,
    quarter:         a.q,
    time_seconds:    a.time,
    on_court:        a.onCourt ?? null,
    made:            a.made ?? null,
    shot_value:      a.val ?? null,
    zone:            a.zone ?? null,
    x:               a.x ?? null,
    y:               a.y ?? null,
    ast_id:          a.astId != null ? String(a.astId) : (a.assistId != null ? String(a.assistId) : null),
    hockey_assist_id: a.hockeyAssistId != null ? String(a.hockeyAssistId) : null,
    shot_quality:    a.shotQuality ?? null,
    ft_made:         a.ftMade ?? null,
    ft_total:        a.ftTotal ?? null,
    foul_type:       a.foulType ?? null,
    victim_id:       a.victimId != null ? String(a.victimId) : null,
    ft_shooter_id:   a.ftShooterId != null ? String(a.ftShooterId) : null,
    ft_awarded:      a.ftAwarded ?? null,
    loser_id:        a.loserId != null ? String(a.loserId) : null,
    blocked_id:      a.blockedId != null ? String(a.blockedId) : null,
    unforced:        a.unforced ?? null,
    sub_in_id:       a.inId != null ? String(a.inId) : null,
    sub_out_id:      a.subOut != null ? String(a.subOut) : (a.outId != null ? String(a.outId) : null),
    duration:        a.duration ?? null,
    play_type:       a.playType ?? null,
  }));

  const p_starters = [
    ...Object.entries(game.starters ?? {}).map(([q, ids]) => ({ quarter: parseInt(q, 10), side: 'home', player_ids: ids.map(String) })),
    ...Object.entries(game.opponentStarters ?? {}).map(([q, ids]) => ({ quarter: parseInt(q, 10), side: 'opponent', player_ids: ids.map(String) })),
  ];

  const p_score_history = (game.scoreHistory ?? []).map((pt) => ({
    time_seconds: pt.time,
    quarter:      pt.q,
    home_score:   pt.home,
    away_score:   pt.away,
  }));

  return { p_game, p_player_stats, p_actions, p_starters, p_score_history };
}

function statsToRow(s: PlayerGameStats) {
  return {
    pts:          s.pts,
    fgm:          s.fgm,
    fga:          s.fga,
    three_pm:     s.threePM,
    three_pa:     s.threePA,
    ftm:          s.ftm,
    fta:          s.fta,
    oreb:         s.oreb,
    dreb:         s.dreb,
    ast:          s.ast,
    stl:          s.stl,
    blk:          s.blk,
    tov:          s.tov,
    pf:           s.pf,
    minutes:      s.minutes,
    plus_minus:   s.plusMinus,
    foul_drawn:   s.foulDrawn ?? 0,
    blk_against:  s.blkAgainst ?? 0,
  };
}

// ─── Realtime helpers ─────────────────────────────────────────

const channels: RealtimeChannel[] = [];

function listenTable(table: string, teamIdCol: string, onUpdate: () => void): () => void {
  const sb = getClient();
  const channel = sb
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `${teamIdCol}=eq.${_teamId}` },
      onUpdate
    )
    .subscribe();
  channels.push(channel);
  return () => { sb.removeChannel(channel); };
}

// ─── DB export ────────────────────────────────────────────────

export const DB = {
  get currentDataMode(): string { return 'supabase'; },

  setTeam(teamId: string | null) {
    _teamId = teamId;
    if (teamId) localStorage.setItem('statchamp_team_id', teamId);
    else localStorage.removeItem('statchamp_team_id');
  },

  async initTeam(teamId: string): Promise<void> {
    _teamId = teamId;
    localStorage.setItem('statchamp_team_id', teamId);
  },

  getTeamId(): string | null { return _teamId; },

  async getTeams(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await getClient().from('teams').select('id, name');
    if (error) throw error;
    return data ?? [];
  },

  // ─── Roster ───────────────────────────────────────────────

  async getRoster(): Promise<RosterEntry[]> {
    const { data, error } = await getClient()
      .from('players')
      .select('*')
      .eq('team_id', _teamId!)
      .order('number');
    if (error) throw error;
    return (data ?? []).map(rowToPlayer);
  },

  onRoster(cb: (list: RosterEntry[]) => void): () => void {
    let unsub: () => void;
    this.getRoster().then(cb);
    unsub = listenTable('players', 'team_id', () => { this.getRoster().then(cb); });
    return unsub;
  },

  async saveRoster(list: RosterEntry[]): Promise<void> {
    const { data: res } = await getClient().rpc('save_roster', {
      p_token:   getWk(),
      p_team_id: _teamId,
      p_players: list.map((p) => ({
        firebase_id: String(p.id),
        name:        p.name,
        number:      parseInt(p.number, 10),
        pos:         p.pos ?? 'G',
        status:      p.status ?? 'available',
        photo_url:   p.photo ?? null,
      })),
    });
    if (res?.error) throw new Error(res.error);
  },

  // ─── Phases ───────────────────────────────────────────────

  async getPhases(): Promise<Phase[]> {
    const { data, error } = await getClient()
      .from('phases')
      .select('*')
      .eq('team_id', _teamId!)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map(rowToPhase);
  },

  onPhases(cb: (list: Phase[]) => void): () => void {
    this.getPhases().then(cb);
    return listenTable('phases', 'team_id', () => { this.getPhases().then(cb); });
  },

  async savePhases(list: Phase[]): Promise<void> {
    const { data: res } = await getClient().rpc('save_phases', {
      p_token:   getWk(),
      p_team_id: _teamId,
      p_phases:  list,
    });
    if (res?.error) throw new Error(res.error);
  },

  // ─── Seasons ──────────────────────────────────────────────

  async getSeasons(): Promise<Season[]> {
    const { data, error } = await getClient()
      .from('seasons')
      .select('*')
      .eq('team_id', _teamId!)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToSeason);
  },

  onSeasons(cb: (list: Season[]) => void): () => void {
    this.getSeasons().then(cb);
    return listenTable('seasons', 'team_id', () => { this.getSeasons().then(cb); });
  },

  async saveSeasons(list: Season[]): Promise<void> {
    const { data: res } = await getClient().rpc('save_seasons', {
      p_token:    getWk(),
      p_team_id:  _teamId,
      p_seasons:  list,
    });
    if (res?.error) throw new Error(res.error);
  },

  // ─── Config ───────────────────────────────────────────────

  async getConfig(): Promise<AppConfig> {
    const { data } = await getClient()
      .from('team_config')
      .select('*')
      .eq('team_id', _teamId!)
      .maybeSingle();
    return { playTypes: data?.play_types ?? undefined };
  },

  async saveConfig(cfg: AppConfig): Promise<void> {
    await getClient().rpc('verify_token', { p_team_id: _teamId, p_token: getWk() });
    const { error } = await getClient()
      .from('team_config')
      .upsert({ team_id: _teamId!, play_types: cfg.playTypes });
    if (error) throw error;
  },

  // ─── Games ────────────────────────────────────────────────

  async getGames(): Promise<Game[]> {
    const { data, error } = await getClient()
      .from('games')
      .select('*')
      .eq('team_id', _teamId!)
      .order('date', { ascending: false });
    if (error) throw error;
    return assembleGames(data ?? []);
  },

  async getGame(gameId: string): Promise<Game | null> {
    const { data, error } = await getClient()
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [game] = await assembleGames([data]);
    return game ?? null;
  },

  onGames(cb: (games: Game[]) => void): () => void {
    this.getGames().then(cb);
    return listenTable('games', 'team_id', () => { this.getGames().then(cb); });
  },

  async saveGame(game: Game): Promise<void> {
    const { p_game, p_player_stats, p_actions, p_starters, p_score_history } = gameToRpcPayload(game);
    const { data: res, error } = await getClient().rpc('save_game', {
      p_token:         getWk(),
      p_team_id:       _teamId,
      p_game,
      p_player_stats,
      p_actions,
      p_starters,
      p_score_history,
    });
    if (error) throw error;
    if (res?.error) throw new Error(res.error);
  },

  async deleteGame(gameId: string): Promise<void> {
    await this.saveGame({
      id: gameId, date: '', opponent: '', phase: '',
      playerStats: {}, actions: [],
      status: 'final',
      _deleted: true,
    } as any);
  },

  // ─── Game Preps ───────────────────────────────────────────

  async getPrep(prepId: string): Promise<any> {
    const { data } = await getClient()
      .from('game_preps')
      .select('*')
      .eq('id', prepId)
      .maybeSingle();
    return data ?? null;
  },

  async savePrep(prepId: string, data: Record<string, any>): Promise<void> {
    await getClient().rpc('verify_token', { p_team_id: _teamId, p_token: getWk() });
    const { error } = await getClient().from('game_preps').upsert({
      id:          prepId,
      team_id:     _teamId!,
      opponent:    data.opponent ?? 'Inconnu',
      coach_notes: data.coachNotes ?? '',
      starters:    data.starters ?? null,
      updated_at:  new Date().toISOString(),
    });
    if (error) throw error;
  },
};

// Shim global
if (typeof window !== 'undefined') {
  (window as any).DB = DB;
  const savedTeamId = localStorage.getItem('statchamp_team_id');
  if (savedTeamId) _teamId = savedTeamId;
}
