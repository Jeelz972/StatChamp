// stat-engine.js — Moteur central de calcul statistique basketball
// Toute formule statistique du projet passe par ce module.
// Chargé EN PREMIER par index.html, exposé via window.StatsEngine.

window.StatsEngine = {
  /**
   * Coefficients partagés entre toutes les formules.
   * Modifier ici propage le changement à l'ensemble du moteur.
   */
  CONSTANTS: {
    FTA_WEIGHT: 0.44, // Poids des lancer-francs dans l'estimation simplifiée des possessions (TS%, Usage%, TOV%)
    FTA_WEIGHT_ADV: 0.4, // Poids des LF dans la formule avancée Dean Oliver (possAdvanced, ORtg, DRtg)
    THREE_BONUS: 0.5, // Bonus eFG% par 3-points marqué (valeur = 1 + 0.5 = 1.5x)
    ORB_FACTOR: 1.07, // Coefficient d'ajustement rebond offensif dans les formules de possession
    PER_MIN: 36, // Base de normalisation per-minute standard
    IMPACT_MIN: 40, // Base de normalisation pour l'Impact Score
    PACE_MIN: 48, // Durée de match NBA en minutes (base pace)
  },

  // ---------------------------------------------------------------------------
  // UTILITAIRES
  // ---------------------------------------------------------------------------

  /**
   * Division sécurisée — retourne 0 si le dénominateur est nul.
   * @param {number} numerator
   * @param {number} denominator
   * @param {number} [multiplier=1]
   * @returns {number}
   */
  safe(numerator, denominator, multiplier = 1) {
    return denominator === 0 ? 0 : (numerator / denominator) * multiplier;
  },

  /**
   * Normalise une statistique brute sur 36 minutes jouées.
   * @param {number} value  - Valeur brute sur les minutes réelles
   * @param {number} minutes - Minutes jouées
   * @returns {number}
   */
  per36(value, minutes) {
    return this.safe(value, minutes, this.CONSTANTS.PER_MIN);
  },

  // ---------------------------------------------------------------------------
  // EFFICACITÉ AU TIR
  // ---------------------------------------------------------------------------

  /**
   * True Shooting % — mesure l'efficacité globale en tenant compte des LF et des 3pts.
   * Formule : PTS / (2 × (FGA + 0.44 × FTA)) × 100
   * @param {number} pts
   * @param {number} fga - Tentatives à 2pts (hors 3pts)
   * @param {number} fta
   * @returns {number} TS% (0–100)
   */
  TS(pts, fga, fta) {
    return this.safe(pts, 2 * (fga + this.CONSTANTS.FTA_WEIGHT * fta), 100);
  },

  /**
   * Effective Field Goal % — ajuste le FG% pour la valeur supérieure des 3pts.
   * Formule : (FGM + 0.5 × 3PM) / FGA × 100
   * @param {number} fgm - Total des tirs marqués (2PM + 3PM)
   * @param {number} threePM
   * @param {number} fga - Total des tentatives (2PA + 3PA)
   * @returns {number} eFG% (0–100)
   */
  eFG(fgm, threePM, fga) {
    return this.safe(fgm + this.CONSTANTS.THREE_BONUS * threePM, fga, 100);
  },

  /**
   * Taux de tentatives à 3pts (3PAr) — part des tirs depuis l'arc.
   * @param {number} threePA
   * @param {number} totalFGA
   * @returns {number} ratio (0–1)
   */
  threePAr(threePA, totalFGA) {
    return this.safe(threePA, totalFGA);
  },

  /**
   * Taux de lancers-francs (FTr) — fréquence d'accès à la ligne.
   * @param {number} fta
   * @param {number} fga
   * @returns {number} ratio (0–1)
   */
  FTr(fta, fga) {
    return this.safe(fta, fga);
  },

  // ---------------------------------------------------------------------------
  // POSSESSION
  // ---------------------------------------------------------------------------

  /**
   * Estimation simplifiée des possessions (Hollinger).
   * Formule : FGA + 0.44×FTA + TOV − ORB
   * @param {number} fga
   * @param {number} fta
   * @param {number} tov
   * @param {number} orb
   * @returns {number}
   */
  possSimple(fga, fta, tov, orb) {
    return fga + this.CONSTANTS.FTA_WEIGHT * fta + tov - orb;
  },

  /**
   * Estimation avancée des possessions (Dean Oliver) — pondère le taux de rebond offensif.
   * Retombe sur possSimple si les stats adverses sont absentes.
   * @param {{fga,fta,tov,oreb,dreb,fgm}} team
   * @param {{fga,fta,tov,oreb,dreb,fgm}|null} opp
   * @returns {number} >= 1
   */
  possAdvanced(team, opp) {
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

  /**
   * Pace — nombre de possessions par 48 minutes (rythme de jeu).
   * @param {number} tmPoss  - Possessions équipe
   * @param {number} oppPoss - Possessions adversaire
   * @param {number} tmMP    - Minutes totales équipe (5 joueurs × minutes)
   * @returns {number}
   */
  pace(tmPoss, oppPoss, tmMP) {
    return this.safe(this.CONSTANTS.PACE_MIN * (tmPoss + oppPoss), 2 * (tmMP / 5));
  },

  // ---------------------------------------------------------------------------
  // MÉTRIQUES D'USAGE
  // ---------------------------------------------------------------------------

  /**
   * Usage Rate — part des possessions équipe consommées par le joueur.
   * Formule NBA : (FGA + 0.44×FTA + TOV) × (TeamMin/5) / (Min × TeamPoss) × 100
   * @param {number} playerFGA
   * @param {number} playerFTA
   * @param {number} playerTOV
   * @param {number} playerMin
   * @param {number} teamMin
   * @param {number} teamPoss
   * @returns {number} usage% (0–100)
   */
  usageRate(playerFGA, playerFTA, playerTOV, playerMin, teamMin, teamPoss) {
    const playPoss = playerFGA + this.CONSTANTS.FTA_WEIGHT * playerFTA + playerTOV;
    return this.safe(playPoss * (teamMin / 5), playerMin * teamPoss, 100);
  },

  /**
   * Ratio passes décisives / ballons perdus.
   * Retourne ast si tov = 0 (joueur sans perte de balle).
   * @param {number} ast
   * @param {number} tov
   * @returns {number}
   */
  astTovRatio(ast, tov) {
    return tov > 0 ? ast / tov : ast;
  },

  /**
   * Assist % — part des paniers équipe issus des passes du joueur pendant son temps de jeu.
   * @param {number} ast
   * @param {number} mp     - Minutes joueur
   * @param {number} tmMP   - Minutes totales équipe
   * @param {number} tmFGM  - Paniers marqués équipe
   * @param {number} fgm    - Paniers marqués joueur
   * @returns {number} AST% (0–100)
   */
  astPct(ast, mp, tmMP, tmFGM, fgm) {
    const denom = (mp / (tmMP / 5)) * tmFGM - fgm;
    return this.safe(100 * ast, denom);
  },

  /**
   * Turnover % — part des possessions terminant sur une perte de balle.
   * Formule : TOV / (FGA + 0.44×FTA + TOV) × 100
   * @param {number} tov
   * @param {number} fga
   * @param {number} fta
   * @returns {number} TOV% (0–100)
   */
  tovPct(tov, fga, fta) {
    return this.safe(100 * tov, fga + this.CONSTANTS.FTA_WEIGHT * fta + tov);
  },

  /**
   * Offensive Rebound % — part des rebonds offensifs disponibles captés par le joueur.
   * @param {number} orb    - ORB joueur
   * @param {number} mp     - Minutes joueur
   * @param {number} tmMP   - Minutes totales équipe
   * @param {number} tmORB  - ORB équipe
   * @param {number} oppDRB - DRB adversaire
   * @returns {number} ORB% (0–100)
   */
  orbPct(orb, mp, tmMP, tmORB, oppDRB) {
    return this.safe(100 * (orb * (tmMP / 5)), mp * (tmORB + oppDRB));
  },

  /**
   * Defensive Rebound % — part des rebonds défensifs disponibles captés par le joueur.
   * @param {number} drb    - DRB joueur
   * @param {number} mp     - Minutes joueur
   * @param {number} tmMP   - Minutes totales équipe
   * @param {number} tmDRB  - DRB équipe
   * @param {number} oppORB - ORB adversaire
   * @returns {number} DRB% (0–100)
   */
  drbPct(drb, mp, tmMP, tmDRB, oppORB) {
    return this.safe(100 * (drb * (tmMP / 5)), mp * (tmDRB + oppORB));
  },

  /**
   * Floor General — métriques de meneur : ratio AST/TOV, AST%, TOV% relatifs.
   * @param {number} ast
   * @param {number} tov
   * @param {number} min
   * @param {number} teamMin
   * @param {number} teamFgm
   * @param {number} teamPoss
   * @returns {{ratio: number, astPct: number, tovPct: number}}
   */
  floorGeneral(ast, tov, min, teamMin, teamFgm, teamPoss) {
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
  // MÉTRIQUES COMPOSITES SIMPLES
  // ---------------------------------------------------------------------------

  /**
   * EFF (Efficiency) — indice de performance basique FIBA.
   * Formule : (PTS+REB+AST+STL+BLK) − (tirs manqués + LF manqués + TOV)
   * @returns {number}
   */
  EFF(pts, reb, ast, stl, blk, fga, fgm, fta, ftm, tov) {
    return pts + reb + ast + stl + blk - (fga - fgm + (fta - ftm) + tov);
  },

  /**
   * Game Score (Hollinger) — note de performance par match.
   * @returns {number}
   */
  gameScore(pts, fgm, fga, ftm, fta, oreb, dreb, stl, ast, blk, pf, tov) {
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

  /**
   * PIE (Player Impact Estimate) — contribution du joueur au total du match.
   * @param {{pts,fgm,ftm,fga,fta,dreb,oreb,ast,stl,blk,pf,tov}} player
   * @param {{pts,fgm,ftm,fga,fta,drb,orb,ast,stl,blk,pf,tov}} gameTotal
   * @returns {number} PIE% (0–100)
   */
  PIE(player, gameTotal) {
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

  /**
   * Hustle Index — activité défensive/offensive sur 36 minutes.
   * @param {number} oreb
   * @param {number} stl
   * @param {number} blk
   * @param {number} chargesTaken
   * @param {number} minutes
   * @returns {number}
   */
  hustleIndex(oreb, stl, blk, chargesTaken, minutes) {
    const raw = oreb * 1.5 + stl * 1.2 + blk * 1.0 + chargesTaken * 2.0;
    return minutes > 0 ? (raw / minutes) * this.CONSTANTS.PER_MIN : raw;
  },

  /**
   * Dirty Work — contribution aux tâches ingrates sur 36 minutes.
   * @returns {number}
   */
  dirtyWork(oreb, dreb, stl, blk, chargesTaken, deflections, minutes) {
    const raw = oreb * 2 + dreb * 0.5 + stl * 1.5 + blk * 1.5 + chargesTaken * 3 + deflections * 1;
    return minutes > 0 ? (raw / minutes) * this.CONSTANTS.PER_MIN : raw;
  },

  /**
   * Consistency — coefficient de variation des performances (écart-type / moyenne).
   * Retourne null si moins de 2 valeurs ou moyenne proche de zéro.
   * @param {number[]} effValues
   * @returns {number|null}
   */
  consistency(effValues) {
    if (!effValues || effValues.length < 2) return null;
    const mean = effValues.reduce((a, b) => a + b, 0) / effValues.length;
    if (Math.abs(mean) < 0.01) return null;
    const variance =
      effValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / effValues.length;
    return Math.sqrt(variance) / Math.abs(mean);
  },

  /**
   * EPC (Estimated Points Created) — points générés via passes, rebonds offensifs, accès LF.
   * @param {number} ast
   * @param {number} oreb
   * @param {number} fta
   * @param {number} teamPts
   * @param {number} teamFtm
   * @param {number} teamFga
   * @param {number} teamAst
   * @returns {number}
   */
  EPC(ast, oreb, fta, teamPts, teamFtm, teamFga, teamAst) {
    const avgPtsPerAssist =
      teamAst > 0 ? ((teamPts - teamFtm) / teamFga) * 2 * (1 / (teamAst / (teamAst + 1))) : 2.0;
    const clampedAvg = Math.max(1.5, Math.min(2.8, avgPtsPerAssist));
    return ast * clampedAvg + oreb * 0.7 + fta * 0.4;
  },

  // ---------------------------------------------------------------------------
  // IMPACT OFFENSIF / DÉFENSIF
  // ---------------------------------------------------------------------------

  /**
   * OIS (Offensive Impact Score) — contribution offensive pondérée.
   * Formule : PTS + AST×1.5 + ORB×1.2 + FTE×1.2 − TOV×1.5
   * @param {number} pts
   * @param {number} ast
   * @param {number} oreb
   * @param {number} fte  - Fautes provoquées (foulDrawn)
   * @param {number} tov
   * @returns {number}
   */
  OIS(pts, ast, oreb, fte, tov, fga, fgm, fta, ftm) {
    return pts + ast * 1.5 + oreb * 1.2 + fte * 1.2 - tov * 1.5 - (fta - ftm + (fga - fgm)) * 0.2;
  },

  /**
   * DIS (Defensive Impact Score) — contribution défensive pondérée.
   * Formule : STL×2 + BLK×2 + DREB − PF×0.7 + +/−×0.3
   * @param {number} stl
   * @param {number} blk
   * @param {number} dreb
   * @param {number} fouls
   * @param {number} plusMinus
   * @returns {number}
   */
  DIS(stl, blk, dreb, fouls, plusMinus) {
    return stl * 2 + blk * 2 + dreb - fouls * 0.7 + plusMinus * 0.3;
  },

  /**
   * Impact Total — (OIS + DIS) normalisé sur 40 minutes.
   * @param {number} ois
   * @param {number} dis
   * @param {number} minutes
   * @returns {number}
   */
  impactTotal(ois, dis, minutes) {
    ttoisdis = ois + dis;
    impct = (ttoisdis / minutes) * this.CONSTANTS.IMPACT_MIN;
    return impct > 0 ? parseFloat(impct.toFixed(1)) : parseFloat(impct.toFixed(2));
  },

  /**
   * Player Net Rating — différentiel de points par 100 possessions joueur.
   * @param {number} plusMinus
   * @param {number} poss     - Possessions équipe totales
   * @param {number} playerMin
   * @param {number} teamMin
   * @returns {number}
   */
  playerNetRtg(plusMinus, poss, playerMin, teamMin) {
    const playerPoss = poss * (playerMin / (teamMin / 5));
    return this.safe(plusMinus, playerPoss, 100);
  },

  /**
   * Pondération bayésienne — lisse le rating brut d'un joueur vers le rating équipe
   * selon son volume de minutes (protection contre les petits échantillons).
   * @param {number} rawRating
   * @param {number} teamRating
   * @param {number} playerMin
   * @param {number} totalTeamMin
   * @param {number} activeCount
   * @param {number} k           - Coefficient de confiance
   * @returns {number}
   */
  applyFormationWeight(rawRating, teamRating, playerMin, totalTeamMin, activeCount, k) {
    const Min_moy = totalTeamMin / (activeCount || 5);
    const C = k * Min_moy;
    const w = playerMin / (playerMin + C);
    return teamRating + (rawRating - teamRating) * w;
  },

  // ---------------------------------------------------------------------------
  // RATINGS AVANCÉS (DEAN OLIVER)
  // ---------------------------------------------------------------------------

  /**
   * Offensive Rating — points produits par 100 possessions (formule Dean Oliver complète).
   * @param {{MP,PTS,FGM,FGA,ThreePM,FTM,FTA,ORB,AST,TOV,
   *          Team_PTS,Team_FGM,Team_FGA,Team_ThreePM,Team_FTM,Team_FTA,
   *          Team_ORB,Team_AST,Team_MP,Opp_DRB}} params
   * @returns {number} ORtg (points/100 poss)
   */
  calcORtg(params) {
    const {
      MP,
      PTS,
      FGM,
      FGA,
      ThreePM,
      FTM,
      FTA,
      ORB,
      AST,
      TOV,
      Team_PTS,
      Team_FGM,
      Team_FGA,
      Team_ThreePM,
      Team_FTM,
      Team_FTA,
      Team_ORB,
      Team_AST,
      Team_MP,
      Opp_DRB,
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

  /**
   * Defensive Rating — points concédés par 100 possessions (formule Dean Oliver complète).
   * @param {{MP,STL,BLK,DRB,PF,Team_DRB,Team_STL,Team_BLK,Team_PF,
   *          Team_FGA,Team_FTA,Team_ORB,Team_TOV,Team_MP,
   *          Opp_PTS,Opp_FGM,Opp_FGA,Opp_FTM,Opp_FTA,Opp_ORB,Opp_TOV,Opp_MP}} params
   * @returns {number} DRtg (points/100 poss)
   */
  calcDRtg(params) {
    const {
      MP,
      STL,
      BLK,
      DRB,
      PF,
      Team_DRB,
      Team_STL,
      Team_BLK,
      Team_PF,
      Team_FGA,
      Team_FTA,
      Team_ORB,
      Team_TOV,
      Team_MP,
      Opp_PTS,
      Opp_FGM,
      Opp_FGA,
      Opp_FTM,
      Opp_FTA,
      Opp_ORB,
      Opp_TOV,
      Opp_MP,
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

  /**
   * Four Factors (Dean Oliver) — les quatre indicateurs de victoire.
   * @param {{fgm,fga,threePM,fta,tov,oreb,oppDreb}} s
   * @returns {{eFG: number, tovPct: number, orebPct: number, ftRate: number}}
   */
  fourFactors(s) {
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

  /**
   * Projection des stats adverses à partir de son score (régression linéaire).
   * Utilisé quand les stats complètes de l'adversaire ne sont pas disponibles.
   * @param {number} pts - Points marqués par l'adversaire
   * @returns {{fgm,fga,ftm,fta,oreb,dreb,reb,tov,fouls,ast,blk}}
   */
  estimateOpponent(pts) {
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
  // F4 — HOT / COLD STREAK
  // ---------------------------------------------------------------------------

  /**
   * Streak de forme — compare la moyenne EFF des N derniers matchs à la moyenne saison.
   * Les logs doivent être triés du plus récent au plus ancien.
   * @param {Array<{eff:number}>} logs
   * @param {number} [window=3] - Fenêtre de matchs récents
   * @returns {{status:'hot'|'cold'|'steady', delta:number, recentAvg:number, seasonAvg:number}}
   */
  hotColdStreak(logs, window = 3) {
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
  // F1 — WOBA BASKETBALL
  // ---------------------------------------------------------------------------

  /**
   * WOBA Basketball (Weighted On-Base Average adapté) — valeur offensive nette par possession.
   * Formule : (PTS + AST×1.5 + ORB×0.7 − TOV×1.5 − FGmiss×0.4 − FTmiss×0.15) / poss
   * Repères : < 0.25 faible · 0.30–0.40 correct · > 0.45 élite.
   * @param {number} pts
   * @param {number} ast
   * @param {number} oreb
   * @param {number} tov
   * @param {number} fga  - Total FGA (2PA + 3PA)
   * @param {number} fgm  - Total FGM (2PM + 3PM)
   * @param {number} fta
   * @param {number} ftm
   * @returns {number} WOBA (0–~0.7 en pratique)
   */
  woba(pts, ast, oreb, tov, fga, fgm, fta, ftm) {
    const value = pts + ast * 1.5 + oreb * 0.7;
    const cost = tov * 1.5 + (fga - fgm) * 0.4 + (fta - ftm) * 0.15;
    const poss = fga + this.CONSTANTS.FTA_WEIGHT * fta + tov;
    return this.safe(value - cost, poss);
  },

  // ---------------------------------------------------------------------------
  // F5 — PROFIL DE FATIGUE PAR QUART-TEMPS
  // ---------------------------------------------------------------------------

  /**
   * Profil de fatigue — détecte la tendance et le point de rupture par quart-temps.
   * Utilise une régression linéaire sur l'EFF normalisée à 10 minutes par quart.
   * @param {Array<{q:number, eff:number, min:number}>} qStats - Stats par quart (q = 1..4+)
   * @returns {{trend:'improving'|'declining'|'stable', breakpoint:number|null, slope:number, data:Array}|null}
   */
  fatigueProfile(qStats) {
    if (!qStats || qStats.length < 3) return null;
    const sorted = [...qStats].sort((a, b) => a.q - b.q);
    const effs = sorted.map((q) => (q.min > 0 ? (q.eff / q.min) * 10 : 0));
    const n = effs.length;
    if (n < 2) return null;
    // Régression linéaire (pente)
    const meanX = (n - 1) / 2;
    const meanY = effs.reduce((s, v) => s + v, 0) / n;
    let num = 0,
      den = 0;
    effs.forEach((v, i) => {
      num += (i - meanX) * (v - meanY);
      den += (i - meanX) * (i - meanX);
    });
    const slope = den > 0 ? num / den : 0;
    // Quart de rupture : chute maximale entre deux quarts consécutifs
    let breakpoint = null,
      maxDrop = 0;
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
  // F3 — K-MEANS CLUSTERING
  // ---------------------------------------------------------------------------

  /**
   * K-Means — regroupe des vecteurs numériques en k clusters.
   * Initialisation via k-means++ simplifié (dispersion maximale).
   * @param {number[][]} points  - Tableau de vecteurs de même dimension
   * @param {number}     k       - Nombre de clusters
   * @param {number}     [maxIter=40]
   * @returns {number[]} assignments — indice de cluster pour chaque point (même ordre que points)
   */
  kMeansCluster(points, k, maxIter = 40) {
    if (!points || points.length < k) {
      return (points || []).map((_, i) => i % Math.max(k, 1));
    }
    const dims = points[0].length;
    // Init k-means++ : choisir k centroïdes les plus éloignés les uns des autres
    const cidx = [0];
    while (cidx.length < k) {
      let best = -1,
        bestDist = -1;
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
        let best = 0,
          bestDist = Infinity;
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
  // F2 — ADJUSTED PLUS/MINUS (APM)
  // ---------------------------------------------------------------------------

  /**
   * Adjusted Plus/Minus — lisse le +/- brut vers la moyenne équipe
   * proportionnellement au volume de minutes (régression bayésienne).
   * Corrige les biais liés aux petits échantillons et à la qualité des coéquipiers.
   * @param {number} playerPM       - +/- moyen par match du joueur
   * @param {number} playerMinTotal - Minutes totales saison du joueur
   * @param {number} teamAvgPM      - Moyenne +/- de l'équipe (toutes rotations)
   * @param {number} teamMinTotal   - Somme des minutes de tous les joueurs
   * @param {number} [k=2.5]        - Conservatisme (↑ = plus proche de la moyenne)
   * @returns {number} APM arrondi à 1 décimale
   */
  adjustedPlusMinus(playerPM, playerMinTotal, teamAvgPM, teamMinTotal, k = 2.5) {
    if (playerMinTotal <= 0) return 0;
    const minPerSlot = teamMinTotal / 5 || playerMinTotal;
    const w = playerMinTotal / (playerMinTotal + k * minPerSlot);
    const adjusted = teamAvgPM + (playerPM - teamAvgPM) * w;
    return Math.round(adjusted * 10) / 10;
  },
};
