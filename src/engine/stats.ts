// stats.ts — Moteur central de calcul statistique basketball
// Toute formule statistique du projet passe par ce module.
// Expose via window.StatsEngine pour retrocompatibilite.

interface ORtgParams {
  MP: number; PTS: number; FGM: number; FGA: number;
  ThreePM: number; FTM: number; FTA: number; ORB: number;
  AST: number; TOV: number;
  Team_PTS: number; Team_FGM: number; Team_FGA: number;
  Team_ThreePM: number; Team_FTM: number; Team_FTA: number;
  Team_ORB: number; Team_AST: number; Team_MP: number;
  Opp_DRB: number;
}

interface DRtgParams {
  MP: number; STL: number; BLK: number; DRB: number; PF: number;
  Team_DRB: number; Team_STL: number; Team_BLK: number; Team_PF: number;
  Team_FGA: number; Team_FTA: number; Team_ORB: number; Team_TOV: number; Team_MP: number;
  Opp_PTS: number; Opp_FGM: number; Opp_FGA: number; Opp_FTM: number;
  Opp_FTA: number; Opp_ORB: number; Opp_TOV: number; Opp_MP: number;
}

export const StatsEngine = {
  /**
   * Coefficients partages entre toutes les formules.
   * Modifier ici propage le changement a l'ensemble du moteur.
   */
  CONSTANTS: {
    FTA_WEIGHT: 0.44,     // Poids des lancer-francs dans l'estimation simplifiee des possessions (TS%, Usage%, TOV%)
    FTA_WEIGHT_ADV: 0.4,  // Poids des LF dans la formule avancee Dean Oliver (possAdvanced, ORtg, DRtg)
    THREE_BONUS: 0.5,     // Bonus eFG% par 3-points marque (valeur = 1 + 0.5 = 1.5x)
    ORB_FACTOR: 1.07,     // Coefficient d'ajustement rebond offensif dans les formules de possession
    PER_MIN: 36,          // Base de normalisation per-minute standard
    IMPACT_MIN: 40,       // Base de normalisation pour l'Impact Score
    PACE_MIN: 48,         // Duree de match NBA en minutes (base pace)
  } as const,

  // ---------------------------------------------------------------------------
  // UTILITAIRES
  // ---------------------------------------------------------------------------

  safe(numerator: number, denominator: number, multiplier: number = 1): number {
    return denominator === 0 ? 0 : (numerator / denominator) * multiplier;
  },

  per36(value: number, minutes: number): number {
    return this.safe(value, minutes, this.CONSTANTS.PER_MIN);
  },

  // ---------------------------------------------------------------------------
  // EFFICACITE AU TIR
  // ---------------------------------------------------------------------------

  TS(pts: number, fga: number, fta: number): number {
    return this.safe(pts, 2 * (fga + this.CONSTANTS.FTA_WEIGHT * fta), 100);
  },

  eFG(fgm: number, threePM: number, fga: number): number {
    return this.safe(fgm + this.CONSTANTS.THREE_BONUS * threePM, fga, 100);
  },

  threePAr(threePA: number, totalFGA: number): number {
    return this.safe(threePA, totalFGA);
  },

  FTr(fta: number, fga: number): number {
    return this.safe(fta, fga);
  },

  // ---------------------------------------------------------------------------
  // POSSESSION
  // ---------------------------------------------------------------------------

  possSimple(fga: number, fta: number, tov: number, orb: number): number {
    return fga + this.CONSTANTS.FTA_WEIGHT * fta + tov - orb;
  },

  possAdvanced(team: { fga: number; fta: number; tov: number; oreb: number; dreb?: number; fgm: number }, opp: { fga: number; fta?: number; tov?: number; oreb?: number; dreb?: number; fgm?: number } | null): number {
    if (!opp || typeof opp.fga === 'undefined' || opp.fga === 0) {
      return Math.max(1, this.possSimple(team.fga, team.fta, team.tov, team.oreb));
    }
    const tORB_pct = this.safe(team.oreb, team.oreb + (opp.dreb || 0));
    const oORB_pct = this.safe(opp.oreb || 0, (opp.oreb || 0) + (team.dreb || 0));
    const tPoss =
      team.fga +
      this.CONSTANTS.FTA_WEIGHT_ADV * team.fta -
      this.CONSTANTS.ORB_FACTOR * tORB_pct * (team.fga - team.fgm) +
      team.tov;
    const oPoss =
      opp.fga +
      this.CONSTANTS.FTA_WEIGHT_ADV * (opp.fta || 0) -
      this.CONSTANTS.ORB_FACTOR * oORB_pct * (opp.fga - (opp.fgm || 0)) +
      (opp.tov || 0);
    return Math.max(1, (tPoss + oPoss) / 2);
  },

  pace(tmPoss: number, oppPoss: number, tmMP: number): number {
    return this.safe(this.CONSTANTS.PACE_MIN * (tmPoss + oppPoss), 2 * (tmMP / 5));
  },

  // ---------------------------------------------------------------------------
  // METRIQUES D'USAGE
  // ---------------------------------------------------------------------------

  usageRate(playerFGA: number, playerFTA: number, playerTOV: number, playerMin: number, teamMin: number, teamPoss: number): number {
    const playPoss = playerFGA + this.CONSTANTS.FTA_WEIGHT * playerFTA + playerTOV;
    return this.safe(playPoss * (teamMin / 5), playerMin * teamPoss, 100);
  },

  astTovRatio(ast: number, tov: number): number {
    return tov > 0 ? ast / tov : ast;
  },

  astPct(ast: number, mp: number, tmMP: number, tmFGM: number, fgm: number): number {
    const denom = (mp / (tmMP / 5)) * tmFGM - fgm;
    return this.safe(100 * ast, denom);
  },

  tovPct(tov: number, fga: number, fta: number): number {
    return this.safe(100 * tov, fga + this.CONSTANTS.FTA_WEIGHT * fta + tov);
  },

  orbPct(orb: number, mp: number, tmMP: number, tmORB: number, oppDRB: number): number {
    return this.safe(100 * (orb * (tmMP / 5)), mp * (tmORB + oppDRB));
  },

  drbPct(drb: number, mp: number, tmMP: number, tmDRB: number, oppORB: number): number {
    return this.safe(100 * (drb * (tmMP / 5)), mp * (tmDRB + oppORB));
  },

  floorGeneral(ast: number, tov: number, min: number, teamMin: number, teamFgm: number, teamPoss: number): { ratio: number; astPct: number; tovPct: number } {
    const ratio = this.astTovRatio(ast, tov);
    const astPct =
      teamFgm > 0 && min > 0
        ? (ast / ((teamFgm / (teamMin || 1)) * min * 5 - (ast > teamFgm ? teamFgm : ast) || 1)) *
          100
        : 0;
    const tovPct =
      teamPoss > 0 && min > 0 ? (tov / ((teamPoss / (teamMin || 1)) * min * 5 || 1)) * 100 : 0;
    return {
      ratio: parseFloat(ratio.toFixed(2)),
      astPct: parseFloat(Math.min(astPct, 100).toFixed(1)),
      tovPct: parseFloat(Math.min(tovPct, 100).toFixed(1)),
    };
  },

  // ---------------------------------------------------------------------------
  // METRIQUES COMPOSITES SIMPLES
  // ---------------------------------------------------------------------------

  EFF(pts: number, reb: number, ast: number, stl: number, blk: number, fga: number, fgm: number, fta: number, ftm: number, tov: number): number {
    return pts + reb + ast + stl + blk - (fga - fgm + (fta - ftm) + tov);
  },

  gameScore(pts: number, fgm: number, fga: number, ftm: number, fta: number, oreb: number, dreb: number, stl: number, ast: number, blk: number, pf: number, tov: number): number {
    return (
      pts +
      0.4 * fgm -
      0.7 * fga -
      0.4 * (fta - ftm) +
      0.7 * oreb +
      0.3 * dreb +
      stl +
      0.7 * ast +
      0.7 * blk -
      0.4 * pf -
      tov
    );
  },

  PIE(player: { pts: number; fgm: number; ftm: number; fga: number; fta: number; dreb: number; oreb: number; ast: number; stl: number; blk: number; pf: number; tov: number }, gameTotal: { pts: number; fgm: number; ftm: number; fga: number; fta: number; drb: number; orb: number; ast: number; stl: number; blk: number; pf: number; tov: number }): number {
    const num =
      player.pts +
      player.fgm +
      player.ftm -
      player.fga -
      player.fta +
      player.dreb +
      this.CONSTANTS.THREE_BONUS * player.oreb +
      player.ast +
      player.stl +
      this.CONSTANTS.THREE_BONUS * player.blk -
      player.pf -
      player.tov;
    const den =
      gameTotal.pts +
      gameTotal.fgm +
      gameTotal.ftm -
      gameTotal.fga -
      gameTotal.fta +
      gameTotal.drb +
      this.CONSTANTS.THREE_BONUS * gameTotal.orb +
      gameTotal.ast +
      gameTotal.stl +
      this.CONSTANTS.THREE_BONUS * gameTotal.blk -
      gameTotal.pf -
      gameTotal.tov;
    return this.safe(num, den, 100);
  },

  hustleIndex(oreb: number, stl: number, blk: number, chargesTaken: number, minutes: number): number {
    const raw = oreb * 1.5 + stl * 1.2 + blk * 1.0 + chargesTaken * 2.0;
    return minutes > 0 ? (raw / minutes) * this.CONSTANTS.PER_MIN : raw;
  },

  dirtyWork(oreb: number, dreb: number, stl: number, blk: number, chargesTaken: number, deflections: number, minutes: number): number {
    const raw = oreb * 2 + dreb * 0.5 + stl * 1.5 + blk * 1.5 + chargesTaken * 3 + deflections * 1;
    return minutes > 0 ? (raw / minutes) * this.CONSTANTS.PER_MIN : raw;
  },

  consistency(effValues: number[]): number | null {
    if (!effValues || effValues.length < 2) return null;
    const mean = effValues.reduce((a, b) => a + b, 0) / effValues.length;
    if (Math.abs(mean) < 0.01) return null;
    const variance =
      effValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / effValues.length;
    return Math.sqrt(variance) / Math.abs(mean);
  },

  EPC(ast: number, oreb: number, fta: number, teamPts: number, teamFtm: number, teamFga: number, teamAst: number): number {
    const avgPtsPerAssist =
      teamAst > 0 ? ((teamPts - teamFtm) / teamFga) * 2 * (1 / (teamAst / (teamAst + 1))) : 2.0;
    const clampedAvg = Math.max(1.5, Math.min(2.8, avgPtsPerAssist));
    return ast * clampedAvg + oreb * 0.7 + fta * 0.4;
  },

  // ---------------------------------------------------------------------------
  // IMPACT OFFENSIF / DEFENSIF
  // ---------------------------------------------------------------------------

  OIS(pts: number, ast: number, oreb: number, fte: number, tov: number, fga: number, fgm: number, fta: number, ftm: number): number {
    return pts + ast * 1.5 + oreb * 1.2 + fte * 1.2 - tov * 1.5 - (fta - ftm + (fga - fgm)) * 0.2;
  },

  DIS(stl: number, blk: number, dreb: number, fouls: number, plusMinus: number): number {
    return stl * 2 + blk * 2 + dreb - fouls * 0.7 + plusMinus * 0.3;
  },

  impactTotal(ois: number, dis: number, minutes: number): number {
    const total = ois + dis;
    const impact = (total / minutes) * this.CONSTANTS.IMPACT_MIN;
    return impact > 0 ? parseFloat(impact.toFixed(1)) : parseFloat(impact.toFixed(2));
  },

  playerNetRtg(plusMinus: number, poss: number, playerMin: number, teamMin: number): number {
    const playerPoss = poss * (playerMin / (teamMin / 5));
    return this.safe(plusMinus, playerPoss, 100);
  },

  applyFormationWeight(rawRating: number, teamRating: number, playerMin: number, totalTeamMin: number, activeCount: number, k: number): number {
    const Min_moy = totalTeamMin / (activeCount || 5);
    const C = k * Min_moy;
    const w = playerMin / (playerMin + C);
    return teamRating + (rawRating - teamRating) * w;
  },

  // ---------------------------------------------------------------------------
  // RATINGS AVANCES (DEAN OLIVER)
  // ---------------------------------------------------------------------------

  calcORtg(params: ORtgParams): number {
    const {
      MP, PTS, FGM, FGA, ThreePM, FTM, FTA, ORB, AST, TOV,
      Team_PTS, Team_FGM, Team_FGA, Team_ThreePM, Team_FTM, Team_FTA,
      Team_ORB, Team_AST, Team_MP, Opp_DRB,
    } = params;
    if (MP === 0 || Team_MP === 0) return 0;

    const Team_ORB_Pct = Team_ORB + Opp_DRB > 0 ? Team_ORB / (Team_ORB + Opp_DRB) : 0;
    const Team_Play_Pct = Team_FGA > 0 ? Team_FGM / Team_FGA : 0;
    const FT_Scoring =
      FTA > 0 ? (1 - Math.pow(1 - FTM / FTA, 2)) * this.CONSTANTS.FTA_WEIGHT_ADV * FTA : 0;
    const Team_FT_Scoring =
      Team_FTA > 0
        ? (1 - Math.pow(1 - Team_FTM / Team_FTA, 2)) * this.CONSTANTS.FTA_WEIGHT_ADV * Team_FTA
        : 0;
    const Team_Scoring_Poss = Team_FGM + Team_FT_Scoring;
    const Team_ORB_Weight =
      Team_Scoring_Poss > 0
        ? ((1 - Team_ORB_Pct) * Team_Play_Pct) /
          ((1 - Team_ORB_Pct) * Team_Play_Pct + Team_ORB_Pct * (1 - Team_Play_Pct))
        : 0;

    const qAST_t1 = (MP / (Team_MP / 5)) * (1.14 * ((Team_AST - AST) / (Team_FGM || 1)));
    const qAST_t2 =
      (((Team_AST / Team_MP) * MP * 5 - AST) / ((Team_FGM / Team_MP) * MP * 5 - FGM || 1)) *
      (1 - MP / (Team_MP / 5));
    const qAST = Math.min(Math.max(qAST_t1 + qAST_t2, 0), 1) || 0;

    const FG_Part = FGM * (1 - this.CONSTANTS.THREE_BONUS * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
    const AST_Part =
      this.CONSTANTS.THREE_BONUS *
      ((Team_PTS - Team_FTM - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) *
      AST;
    const ScPoss_Factor =
      Team_Scoring_Poss > 0
        ? 1 - (Team_ORB / Team_Scoring_Poss) * Team_ORB_Weight * Team_Play_Pct
        : 1;
    const ScPoss =
      (FG_Part + AST_Part + FT_Scoring) * ScPoss_Factor + ORB * Team_ORB_Weight * Team_Play_Pct;
    const FGxPoss = (FGA - FGM) * (1 - this.CONSTANTS.ORB_FACTOR * Team_ORB_Pct);
    const FTxPoss = Math.pow(1 - FTM / (FTA || 1), 2) * this.CONSTANTS.FTA_WEIGHT_ADV * FTA;
    const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;

    const PProd_FG =
      2 *
      (FGM + this.CONSTANTS.THREE_BONUS * ThreePM) *
      (1 - this.CONSTANTS.THREE_BONUS * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
    const PProd_AST =
      2 *
      ((Team_FGM - FGM + this.CONSTANTS.THREE_BONUS * (Team_ThreePM - ThreePM)) /
        (Team_FGM - FGM || 1)) *
      this.CONSTANTS.THREE_BONUS *
      ((Team_PTS - Team_FTM - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) *
      AST;
    const Team_Pts_Per_Score = Team_Scoring_Poss > 0 ? Team_PTS / Team_Scoring_Poss : 2;
    const PProd_ORB = ORB * Team_ORB_Weight * Team_Play_Pct * Team_Pts_Per_Score;
    const PProd = (PProd_FG + PProd_AST + FTM) * ScPoss_Factor + PProd_ORB;

    return TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;
  },

  calcDRtg(params: DRtgParams): number {
    const {
      MP, STL, BLK, DRB, PF,
      Team_DRB, Team_STL, Team_BLK, Team_PF,
      Team_FGA, Team_FTA, Team_ORB, Team_TOV, Team_MP,
      Opp_PTS, Opp_FGM, Opp_FGA, Opp_FTM, Opp_FTA, Opp_ORB, Opp_TOV, Opp_MP,
    } = params;
    if (MP === 0 || Team_MP === 0) return 0;

    const Team_Poss = Team_FGA + this.CONSTANTS.FTA_WEIGHT * Team_FTA - Team_ORB + Team_TOV;
    const DOR_Pct = Opp_ORB + Team_DRB > 0 ? Opp_ORB / (Opp_ORB + Team_DRB) : 0;
    const DFG_Pct = Opp_FGA > 0 ? Opp_FGM / Opp_FGA : 0.45;
    const FMwt_D = DFG_Pct * (1 - DOR_Pct);
    const FMwt =
      FMwt_D + (1 - DFG_Pct) * DOR_Pct > 0 ? FMwt_D / (FMwt_D + (1 - DFG_Pct) * DOR_Pct) : 0.5;

    const Stops1 = STL + BLK * FMwt * (1 - this.CONSTANTS.ORB_FACTOR * DOR_Pct) + DRB * (1 - FMwt);
    const Stops2_P1 =
      Team_MP > 0
        ? ((Opp_FGA - Opp_FGM - Team_BLK) / Team_MP) *
          FMwt *
          (1 - this.CONSTANTS.ORB_FACTOR * DOR_Pct)
        : 0;
    const Stops2_P2 = Team_MP > 0 ? (Opp_TOV - Team_STL) / Team_MP : 0;
    const Stops2_P3 =
      Team_PF > 0 && Opp_FTA > 0
        ? (PF / Team_PF) *
          this.CONSTANTS.FTA_WEIGHT_ADV *
          Opp_FTA *
          Math.pow(1 - Opp_FTM / Opp_FTA, 2)
        : 0;
    const Stops = Stops1 + (Stops2_P1 + Stops2_P2) * MP + Stops2_P3;

    const Stop_Pct = Team_Poss * MP > 0 ? (Stops * (Opp_MP || Team_MP)) / (Team_Poss * MP) : 0;
    const Team_DRtg = Team_Poss > 0 ? 100 * (Opp_PTS / Team_Poss) : 100;
    const Opp_FT_Scoring =
      Opp_FTA > 0
        ? (1 - Math.pow(1 - Opp_FTM / Opp_FTA, 2)) * this.CONSTANTS.FTA_WEIGHT_ADV * Opp_FTA
        : 0;
    const D_Pts_per_ScPoss =
      Opp_FGM + Opp_FT_Scoring > 0 ? Opp_PTS / (Opp_FGM + Opp_FT_Scoring) : 2;

    return Team_DRtg + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg);
  },

  // ---------------------------------------------------------------------------
  // QUATRE FACTEURS & PROJECTION ADVERSAIRE
  // ---------------------------------------------------------------------------

  fourFactors(s: { fgm: number; fga: number; threePM: number; fta: number; tov: number; oreb: number; oppDreb?: number }): { eFG: number; tovPct: number; orebPct: number; ftRate: number } {
    const eFG =
      s.fga > 0
        ? parseFloat((((s.fgm + this.CONSTANTS.THREE_BONUS * s.threePM) / s.fga) * 100).toFixed(1))
        : 0;
    const tovPct =
      s.fga + this.CONSTANTS.FTA_WEIGHT * s.fta + s.tov > 0
        ? parseFloat(
            ((s.tov / (s.fga + this.CONSTANTS.FTA_WEIGHT * s.fta + s.tov)) * 100).toFixed(1)
          )
        : 0;
    const orebPct =
      s.oreb + (s.oppDreb || 0) > 0
        ? parseFloat(((s.oreb / (s.oreb + (s.oppDreb || 0))) * 100).toFixed(1))
        : 0;
    const ftRate = s.fga > 0 ? parseFloat(((s.fta / s.fga) * 100).toFixed(1)) : 0;
    return { eFG, tovPct, orebPct, ftRate };
  },

  estimateOpponent(pts: number): { fgm: number; fga: number; ftm: number; fta: number; oreb: number; dreb: number; reb: number; tov: number; fouls: number; ast: number; blk: number } {
    return {
      fgm: Math.round(pts * 0.42),
      fga: Math.round(pts * 1.1),
      ftm: Math.round(pts * 0.18),
      fta: Math.round(pts * 0.24),
      oreb: Math.round(pts * 0.15),
      dreb: Math.round(pts * 0.3),
      reb: Math.round(pts * 0.45),
      tov: Math.round(pts * 0.12),
      fouls: 0,
      ast: 0,
      blk: 0,
    };
  },

  // ---------------------------------------------------------------------------
  // HOT / COLD STREAK
  // ---------------------------------------------------------------------------

  hotColdStreak(logs: Array<{ eff: number }>, window: number = 3): { status: 'hot' | 'cold' | 'steady'; delta: number; recentAvg: number; seasonAvg: number } {
    if (!logs || logs.length < window + 1) {
      return { status: 'steady', delta: 0, recentAvg: 0, seasonAvg: 0 };
    }
    const recent = logs.slice(0, window);
    const seasonAvg = logs.reduce((s, l) => s + (l.eff || 0), 0) / logs.length;
    const recentAvg = recent.reduce((s, l) => s + (l.eff || 0), 0) / recent.length;
    const delta = recentAvg - seasonAvg;
    const threshold = Math.max(1.5, Math.abs(seasonAvg) * 0.18);
    return {
      status: delta >= threshold ? 'hot' : delta <= -threshold ? 'cold' : 'steady',
      delta: Math.round(delta * 10) / 10,
      recentAvg: Math.round(recentAvg * 10) / 10,
      seasonAvg: Math.round(seasonAvg * 10) / 10,
    };
  },

  // ---------------------------------------------------------------------------
  // WOBA BASKETBALL
  // ---------------------------------------------------------------------------

  woba(pts: number, ast: number, oreb: number, tov: number, fga: number, fgm: number, fta: number, ftm: number): number {
    const value = pts + ast * 1.5 + oreb * 0.7;
    const cost = tov * 1.5 + (fga - fgm) * 0.4 + (fta - ftm) * 0.15;
    const poss = fga + this.CONSTANTS.FTA_WEIGHT * fta + tov;
    return this.safe(value - cost, poss);
  },

  // ---------------------------------------------------------------------------
  // PROFIL DE FATIGUE PAR QUART-TEMPS
  // ---------------------------------------------------------------------------

  fatigueProfile(qStats: Array<{ q: number; eff: number; min: number }>): { trend: 'improving' | 'declining' | 'stable'; breakpoint: number | null; slope: number; data: Array<{ q: number; effPer10: number; min: number }> } | null {
    if (!qStats || qStats.length < 3) return null;
    const sorted = [...qStats].sort((a, b) => a.q - b.q);
    const effs = sorted.map((q) => (q.min > 0 ? (q.eff / q.min) * 10 : 0));
    const n = effs.length;
    if (n < 2) return null;
    const meanX = (n - 1) / 2;
    const meanY = effs.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    effs.forEach((v, i) => {
      num += (i - meanX) * (v - meanY);
      den += (i - meanX) * (i - meanX);
    });
    const slope = den > 0 ? num / den : 0;
    let breakpoint: number | null = null, maxDrop = 0;
    for (let i = 1; i < n; i++) {
      const drop = effs[i - 1] - effs[i];
      if (drop > maxDrop && drop > 0.3) {
        maxDrop = drop;
        breakpoint = sorted[i].q;
      }
    }
    return {
      trend: slope > 0.15 ? 'improving' : slope < -0.15 ? 'declining' : 'stable',
      slope: Math.round(slope * 100) / 100,
      breakpoint,
      data: sorted.map((q) => ({
        q: q.q,
        effPer10: Math.round((q.min > 0 ? (q.eff / q.min) * 10 : 0) * 10) / 10,
        min: Math.round(q.min * 10) / 10,
      })),
    };
  },

  // ---------------------------------------------------------------------------
  // K-MEANS CLUSTERING
  // ---------------------------------------------------------------------------

  kMeansCluster(points: number[][], k: number, maxIter: number = 40): number[] {
    if (!points || points.length < k) {
      return (points || []).map((_, i) => i % Math.max(k, 1));
    }
    const dims = points[0].length;
    const cidx = [0];
    while (cidx.length < k) {
      let best = -1, bestDist = -1;
      for (let i = 0; i < points.length; i++) {
        if (cidx.includes(i)) continue;
        const minD = cidx.reduce((mn, ci) => {
          const d = points[i].reduce((s, v, dim) => s + (v - points[ci][dim]) ** 2, 0);
          return Math.min(mn, d);
        }, Infinity);
        if (minD > bestDist) {
          bestDist = minD;
          best = i;
        }
      }
      cidx.push(best);
    }
    let centroids = cidx.map((i) => [...points[i]]);
    let assignments = new Array(points.length).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      points.forEach((p, i) => {
        let best = 0, bestDist = Infinity;
        centroids.forEach((c, ci) => {
          const d = p.reduce((s, v, dim) => s + (v - c[dim]) ** 2, 0);
          if (d < bestDist) {
            bestDist = d;
            best = ci;
          }
        });
        if (assignments[i] !== best) {
          assignments[i] = best;
          changed = true;
        }
      });
      if (!changed) break;
      centroids = Array.from({ length: k }, (_, ci) => {
        const members = points.filter((_, i) => assignments[i] === ci);
        if (members.length === 0) return centroids[ci];
        return Array.from(
          { length: dims },
          (_, dim) => members.reduce((s, p) => s + p[dim], 0) / members.length
        );
      });
    }
    return assignments;
  },

  // ---------------------------------------------------------------------------
  // ADJUSTED PLUS/MINUS (APM)
  // ---------------------------------------------------------------------------

  adjustedPlusMinus(playerPM: number, playerMinTotal: number, teamAvgPM: number, teamMinTotal: number, k: number = 2.5): number {
    if (playerMinTotal <= 0) return 0;
    const minPerSlot = teamMinTotal / 5 || playerMinTotal;
    const w = playerMinTotal / (playerMinTotal + k * minPerSlot);
    const adjusted = teamAvgPM + (playerPM - teamAvgPM) * w;
    return Math.round(adjusted * 10) / 10;
  },
};

// Shim global pour retrocompatibilite (ShotChart.js, live.html, app.jsx, etc.)
if (typeof window !== 'undefined') {
  (window as any).StatsEngine = StatsEngine;
}

export type { ORtgParams, DRtgParams };
