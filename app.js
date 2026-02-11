// ==========================================
// ZONE DE CONFIGURATION AUTOMATIQUE
// ==========================================
const PRECONFIGURED_FIREBASE = {apiKey: "AIzaSyBaA99che1oz9BHc23IhiFoY-nK0xvg4q4",
    authDomain: "statu18elite.firebaseapp.com",
    projectId: "statu18elite",
    storageBucket: "statu18elite.firebasestorage.app",
    messagingSenderId: "862850988986",
    appId: "1:862850988986:web:935de245b5c13e29f6fb83",
    measurementId: "G-ZDBRV7JEPN"
};

const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const months = { 'janv': 0, 'jan': 0, 'janvier': 0, 'fevr': 1, 'fev': 1, 'fevrier': 1, 'mars': 2, 'mar': 2, 'avr': 3, 'avril': 3, 'mai': 4, 'juin': 5, 'juil': 6, 'jul': 6, 'juillet': 6, 'aout': 7, 'sept': 8, 'sep': 8, 'septembre': 8, 'oct': 9, 'octobre': 9, 'nov': 10, 'novembre': 10, 'dec': 11, 'decembre': 11 };
    const match = dateStr.match(/(\d{1,2})\s+([a-z\u00e9\u00fb\u00f4]+)\.?\s+(\d{4})/i);
    if (match) {
        const m = months[match[2].toLowerCase().replace('.', '').normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
        if (m !== undefined) return new Date(match[3], m, match[1]);
    }
    const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) return new Date(slash[3], slash[2] - 1, slash[1]);
    return new Date(dateStr);
};

// ===========================================
// FONCTIONS DE CALCUL DES RATINGS AVANCES
// ===========================================

const calculateHGI = (playerStats, allGames, playerId, weights = { PT: 0.35, RP: 0.40, SI: 0.25 }) => {
    const stats = playerStats;
    if (!stats) return { total: 0, PT: 0, RP: 0, SI: 0 };
    const threePct = (stats.threePA || 0) > 0 ? (stats.threePM || 0) / stats.threePA : 0;
    const PT = (threePct * (stats.threePA || 0)) * 1.5;
    const driveAtt = stats.driveAtt || 0;
    const driveMade = stats.driveMade || 0;
    const drivePct = driveAtt > 0 ? driveMade / driveAtt : 0;
    const RP = driveAtt * drivePct;
    const SI = calculateSpacingImpact(allGames, playerId);
    const total = (weights.PT * PT) + (weights.RP * RP) + (weights.SI * SI);
    return {
        total: Math.round(total * 10) / 10,
        PT: Math.round(PT * 10) / 10,
        RP: Math.round(RP * 10) / 10,
        SI: Math.round(SI * 10) / 10
    };
};

const calculateSpacingImpact = (games, playerId) => {
    let onFGM = 0, onFGA = 0, on3PM = 0;
    let offFGM = 0, offFGA = 0, off3PM = 0;
    games.forEach(game => {
        if (!game.actions || !game.playerStats) return;
        game.actions.forEach(action => {
            if (action.type !== 'SHOT') return;
            const shooterId = action.playerId || action.pid;
            if (!shooterId || shooterId >= 1000) return;
            const onCourt = action.onCourt || [];
            const playerOnCourt = onCourt.includes(playerId) || onCourt.includes(String(playerId));
            const made = action.made ? 1 : 0;
            const is3 = action.val === 3;
            if (playerOnCourt) { onFGA++; onFGM += made; if (is3 && made) on3PM++; }
            else { offFGA++; offFGM += made; if (is3 && made) off3PM++; }
        });
    });
    const onEFG = onFGA >= 10 ? ((onFGM + 0.5 * on3PM) / onFGA) * 100 : 0;
    const offEFG = offFGA >= 10 ? ((offFGM + 0.5 * off3PM) / offFGA) * 100 : 0;
    if (onFGA < 10 || offFGA < 10) return 0;
    return onEFG - offEFG;
};

const estimateOpponentStats = (game) => {
    const opp = game.opponentStats || {};
    const pts = game.awayScore || opp.pts || 0;
    let T_DRB = 0;
    Object.values(game.playerStats || {}).forEach(s => { T_DRB += (s.dreb || 0); });
    return {
        pts, fgm: opp.fgm || Math.round(pts * 0.38), fga: opp.fga || Math.round(pts * 0.85),
        ftm: opp.ftm || Math.round(pts * 0.15), fta: opp.fta || Math.round(pts * 0.2),
        oreb: opp.oreb || (opp.reb ? Math.round(opp.reb * 0.3) : Math.round(pts * 0.12)),
        dreb: opp.dreb || (opp.reb ? Math.round(opp.reb * 0.7) : Math.round(pts * 0.3)),
        reb: opp.reb || Math.round(pts * 0.4),
        tov: opp.tov || Math.round(pts * 0.1),
        fouls: opp.fouls || 0,
        ast: opp.ast || 0, blk: opp.blk || 0
    };
};

const calculateAverageMinutes = (playerStats) => {
    const active = Object.values(playerStats).filter(s => (s.minutes || 0) > 0);
    if (active.length === 0) return 20;
    return active.reduce((sum, s) => sum + (s.minutes || 0), 0) / active.length;
};

// 1. Game Score (Hollinger)
const calcGameScore = (s) => {
    const FGM = (s.fgm || 0) + (s.threePM || 0);
    const FGA = (s.fga || 0) + (s.threePA || 0);
    const FTM = s.ftm || 0, FTA = s.fta || 0;
    const PTS = s.pts || 0;
    const OREB = s.oreb || 0, DREB = s.dreb || 0;
    const STL = s.stl || 0, AST = s.ast || 0, BLK = s.blk || 0;
    const PF = s.pf || 0, TOV = s.tov || 0;

    return PTS + 0.4 * FGM - 0.7 * FGA - 0.4 * (FTA - FTM)
         + 0.7 * OREB + 0.3 * DREB + STL + 0.7 * AST
         + 0.7 * BLK - 0.4 * PF - TOV;
};

// 2. Hustle Index — normalisé par 36 min si minutes > 0
const calcHustleIndex = (s) => {
    const raw = (s.oreb || 0) * 1.5
              + (s.stl || 0) * 1.2
              + (s.blk || 0) * 1.0
              + (s.chargesTaken || 0) * 2.0;
    const min = s.minutes || s.min || 0;
    if (min <= 0) return raw;
    return (raw / min) * 36;
};

// 3. Consistency — écart-type de l'EFF sur les logs
const calcConsistency = (logs) => {
    if (!logs || logs.length < 2) return null;
    const values = logs.map(l => l.eff || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
};

// 4. Estimated Points Created (simplifié U18)
// EPC = AST * avgPtsPerAssist + OREB * 0.7 + FTDrawn * 0.4
// avgPtsPerAssist estimé à ~2.0 pour U18 (proche de la valeur médiane FIBA jeunes)
const calcEPC = (s, teamStats) => {
    const AST = s.ast || 0;
    const OREB = s.oreb || 0;
    const FTA = s.fta || 0;

    const teamPTS = teamStats.pts || 0;
    const teamFTM = teamStats.ftm || 0;
    const teamFGA = teamStats.fga || 1;
    const teamAST = teamStats.ast || 1;

    // Points produits par les tirs assistés (hors LF) / nombre d'assists équipe
    const avgPtsPerAssist = teamAST > 0
        ? ((teamPTS - teamFTM) / teamFGA) * 2 * (1 / (teamAST / (teamAST + 1)))
        : 2.0;
    // Simplification : on borne à [1.5, 2.8] pour rester réaliste en U18
    const clampedAvg = Math.max(1.5, Math.min(2.8, avgPtsPerAssist));

    return AST * clampedAvg + OREB * 0.7 + FTA * 0.4;
};

// 5. Floor General — ratio AST/TOV + pourcentages
const calcFloorGeneral = (s, teamStats) => {
    const AST = s.ast || 0, TOV = s.tov || 0;
    const min = s.minutes || s.min || 0;
    const teamMin = (teamStats && teamStats.minutes) || 200;
    const teamFGM = (teamStats && teamStats.fgm) || 1;
    const teamPoss = (teamStats && (teamStats.fga + 0.44 * (teamStats.fta || 0) + (teamStats.tov || 0))) || 1;

    const ratio = AST / (TOV || 1);
    const minPct = min / (teamMin / 5 || 1);
    const astPct = teamFGM > 0 && min > 0
        ? (AST / (((teamFGM / (teamMin || 1)) * min * 5) - (AST > teamFGM ? teamFGM : AST) || 1)) * 100
        : 0;
    const tovPct = teamPoss > 0 && min > 0
        ? (TOV / (((teamPoss / (teamMin || 1)) * min * 5) || 1)) * 100
        : 0;

    return {
        ratio: parseFloat(ratio.toFixed(2)),
        astPct: parseFloat(Math.min(astPct, 100).toFixed(1)),
        tovPct: parseFloat(Math.min(tovPct, 100).toFixed(1))
    };
};

// 6. Dirty Work Index — normalisé per 36 min
const calcDirtyWork = (s) => {
    const raw = (s.oreb || 0) * 2
              + (s.dreb || 0) * 0.5
              + (s.stl || 0) * 1.5
              + (s.blk || 0) * 1.5
              + (s.chargesTaken || 0) * 3
              + (s.deflections || 0) * 1;
    const min = s.minutes || s.min || 0;
    if (min <= 0) return raw;
    return parseFloat(((raw / min) * 36).toFixed(1));
};


const calculateDeanOliverRatings = ({
    MP, PTS, FGM, FGA, ThreePM, FTM, FTA, ORB, DRB, AST, STL, BLK, TOV, PF,
    Team_PTS, Team_FGM, Team_FGA, Team_ThreePM, Team_FTM, Team_FTA,
    Team_ORB, Team_DRB, Team_AST, Team_STL, Team_BLK, Team_TOV, Team_PF, Team_MP,
    Opp_PTS, Opp_FGM, Opp_FGA, Opp_FTM, Opp_FTA, Opp_ORB, Opp_DRB, Opp_TOV,
    Opp_MP, avgMinutes, k = 1.5
}) => {
    if (MP === 0 || Team_MP === 0) return { ORtg: 0, DRtg: 0, netRtg: 0 };

    const Team_Poss = Team_FGA + 0.44 * Team_FTA - Team_ORB + Team_TOV;
    const Team_ORB_Pct = (Team_ORB + Opp_DRB) > 0 ? Team_ORB / (Team_ORB + Opp_DRB) : 0;
    const Team_Play_Pct = Team_FGA > 0 ? Team_FGM / Team_FGA : 0;
    const FT_Scoring = FTA > 0 ? (1 - Math.pow(1 - (FTM / FTA), 2)) * 0.4 * FTA : 0;
    const Team_FT_Scoring = Team_FTA > 0 ? (1 - Math.pow(1 - (Team_FTM / Team_FTA), 2)) * 0.4 * Team_FTA : 0;
    const Team_Scoring_Poss = Team_FGM + Team_FT_Scoring;
    const Team_ORB_Weight = Team_Scoring_Poss > 0 ? ((1 - Team_ORB_Pct) * Team_Play_Pct) / ((1 - Team_ORB_Pct) * Team_Play_Pct + Team_ORB_Pct * (1 - Team_Play_Pct)) : 0;

    const qAST_t1 = (MP / (Team_MP / 5)) * (1.14 * ((Team_AST - AST) / (Team_FGM || 1)));
    const qAST_t2 = ((((Team_AST / Team_MP) * MP * 5 - AST) / ((Team_FGM / Team_MP) * MP * 5 - FGM || 1)) * (1 - (MP / (Team_MP / 5))));
    const qAST = Math.min(Math.max(qAST_t1 + qAST_t2, 0), 1) || 0;

    const FG_Part = FGM * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
    const AST_Part = 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) * AST;
    const ScPoss_Factor = Team_Scoring_Poss > 0 ? 1 - (Team_ORB / Team_Scoring_Poss) * Team_ORB_Weight * Team_Play_Pct : 1;
    const ScPoss = (FG_Part + AST_Part + FT_Scoring) * ScPoss_Factor + ORB * Team_ORB_Weight * Team_Play_Pct;
    const FGxPoss = (FGA - FGM) * (1 - 1.07 * Team_ORB_Pct);
    const FTxPoss = Math.pow(1 - (FTM / (FTA || 1)), 2) * 0.4 * FTA;
    const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;

    const PProd_FG = 2 * (FGM + 0.5 * ThreePM) * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
    const PProd_AST = 2 * ((Team_FGM - FGM + 0.5 * (Team_ThreePM - ThreePM)) / (Team_FGM - FGM || 1)) * 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) * AST;
    const Team_Pts_Per_Score = Team_Scoring_Poss > 0 ? Team_PTS / Team_Scoring_Poss : 2;
    const PProd_ORB = ORB * Team_ORB_Weight * Team_Play_Pct * Team_Pts_Per_Score;
    const PProd = (PProd_FG + PProd_AST + FTM) * ScPoss_Factor + PProd_ORB;
    const ORtg_ind = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;

    const DOR_Pct = (Opp_ORB + Team_DRB) > 0 ? Opp_ORB / (Opp_ORB + Team_DRB) : 0;
    const DFG_Pct = Opp_FGA > 0 ? Opp_FGM / Opp_FGA : 0.45;
    const FMwt_D = DFG_Pct * (1 - DOR_Pct);
    const FMwt = (FMwt_D + (1 - DFG_Pct) * DOR_Pct) > 0 ? FMwt_D / (FMwt_D + (1 - DFG_Pct) * DOR_Pct) : 0.5;
    const Stops1 = STL + BLK * FMwt * (1 - 1.07 * DOR_Pct) + DRB * (1 - FMwt);
    const Stops2_P1 = Team_MP > 0 ? ((Opp_FGA - Opp_FGM - Team_BLK) / Team_MP) * FMwt * (1 - 1.07 * DOR_Pct) : 0;
    const Stops2_P2 = Team_MP > 0 ? ((Opp_TOV - Team_STL) / Team_MP) : 0;
    const Stops2_P3 = Team_PF > 0 && Opp_FTA > 0 ? (PF / Team_PF) * 0.4 * Opp_FTA * Math.pow(1 - (Opp_FTM / Opp_FTA), 2) : 0;
    const Stops = Stops1 + (Stops2_P1 + Stops2_P2) * MP + Stops2_P3;
    const Stop_Pct = (Team_Poss * MP) > 0 ? (Stops * (Opp_MP || Team_MP)) / (Team_Poss * MP) : 0;
    const Team_DRtg = Team_Poss > 0 ? 100 * (Opp_PTS / Team_Poss) : 100;
    const Opp_FT_Scoring = Opp_FTA > 0 ? (1 - Math.pow(1 - (Opp_FTM / Opp_FTA), 2)) * 0.4 * Opp_FTA : 0;
    const D_Pts_per_ScPoss = (Opp_FGM + Opp_FT_Scoring) > 0 ? Opp_PTS / (Opp_FGM + Opp_FT_Scoring) : 2;
    const DRtg_ind = Team_DRtg + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg);

    const Team_ORtg = Team_Poss > 0 ? 100 * (Team_PTS / Team_Poss) : 100;
    const Min_moy = avgMinutes || (Team_MP / 5);
    const C = k * Min_moy;
    const w = MP / (MP + C);
    const ORtg = Team_ORtg + (ORtg_ind - Team_ORtg) * w;
    const DRtg = Team_DRtg + (DRtg_ind - Team_DRtg) * w;

    return {
        ORtg: isFinite(ORtg) ? ORtg : Team_ORtg,
        DRtg: isFinite(DRtg) ? DRtg : Team_DRtg,
        netRtg: isFinite(ORtg - DRtg) ? ORtg - DRtg : 0
    };
};


const _isHomePlayer = (pid, homePlayers) => homePlayers.some(p => p.id === pid);

const _reconstructScoreAtIndex = (actions, idx, homePlayers) => {
    let home = 0, away = 0;
    for (let i = 0; i <= idx; i++) {
        const a = actions[i];
        if (!a) continue;
        const isHome = _isHomePlayer(a.pid, homePlayers);
        if (a.type === 'SHOT' && a.made) {
            if (isHome) home += a.val; else away += a.val;
        }
        if (a.type === 'FT' && (a.ftMade || 0) > 0) {
            if (isHome) home += a.ftMade; else away += a.ftMade;
        }
    }
    return { home, away, diff: home - away };
};

const _getPointsFromAction = (action) => {
    if (action.type === 'SHOT' && action.made) return action.val || 0;
    if (action.type === 'FT') return action.ftMade || 0;
    return 0;
};

const _isScoringAction = (action) => _getPointsFromAction(action) > 0;

const _isFieldGoalAttempt = (action) => action.type === 'SHOT';
const _isFieldGoalMade = (action) => action.type === 'SHOT' && action.made;
const _isFreeThrowAttempt = (action) => action.type === 'FT';
const _isFreeThrowMade = (action) => action.type === 'FT' && (action.ftMade || 0) > 0;
const _isTurnover = (action) => action.type === 'TOV';
const _isThreePointAttempt = (action) => action.type === 'SHOT' && action.val === 3;
const _isThreePointMade = (action) => action.type === 'SHOT' && action.made && action.val === 3;


// ===========================================
// 1. CLUTCH ANALYSIS
// ===========================================

/**
 * Filtre les actions en situation clutch.
 * Défaut : Q4 + OT, 2 dernières minutes (≤120s), écart ≤ 5 points.
 * Retourne null si les actions n'ont pas le format requis.
 */
const filterClutchActions = (actions, homePlayers, options = {}) => {
    if (!actions?.length || !actions[0].onCourt || actions[0].time === undefined) return null;

    const {
        quarters = [4, 5],       // Q4 + OT
        timeWindow = 120,        // 2 dernières minutes (secondes)
        maxDiff = 5              // écart max au score
    } = options;

    const clutchActions = [];

    for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        if (!quarters.includes(a.q)) continue;
        if (a.time === undefined || a.time > timeWindow) continue;

        // Score AVANT cette action
        const score = i > 0 ? _reconstructScoreAtIndex(actions, i - 1, homePlayers) : { home: 0, away: 0, diff: 0 };
        if (Math.abs(score.diff) > maxDiff) continue;

        clutchActions.push({ ...a, _scoreBefore: score });
    }

    return clutchActions;
};

/**
 * Calcule les stats clutch d'un joueur sur les actions filtrées.
 * Retourne { pts, fga, fgm, fgPct, threePA, threePM, fta, ftm, ftPct, tov, ast, actions }
 */
const calcClutchStats = (clutchActions, playerId) => {
    if (!clutchActions?.length) return null;

    const pa = clutchActions.filter(a => a.pid === playerId);
    if (!pa.length) return null;

    let pts = 0, fga = 0, fgm = 0, fta = 0, ftm = 0, tov = 0, ast = 0;
    let threePA = 0, threePM = 0;

    pa.forEach(a => {
        if (_isFieldGoalAttempt(a)) {
            fga++;
            if (_isThreePointAttempt(a)) threePA++;
            if (_isFieldGoalMade(a)) {
                fgm++;
                pts += a.val;
                if (_isThreePointMade(a)) threePM++;
            }
        }
        if (a.type === 'FT') {
            fta += a.ftAtt || 0;
            ftm += a.ftMade || 0;
            pts += a.ftMade || 0;
        }
        if (_isTurnover(a)) tov++;
        if (a.type === 'OREB' || a.type === 'DREB') { /* pas comptés ici */ }
        if (a.astId === playerId || (a.type === 'SHOT' && a.made && a.astId === playerId)) {
            // L'assist est loggué sur l'action du tireur avec astId
        }
    });

    // Compter les assists : le playerId apparaît comme astId sur des tirs réussis
    clutchActions.forEach(a => {
        if (a.astId === playerId && _isFieldGoalMade(a)) ast++;
    });

    return {
        pts, fga, fgm,
        fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
        threePA, threePM,
        threePct: threePA > 0 ? Math.round((threePM / threePA) * 100) : 0,
        fta, ftm,
        ftPct: fta > 0 ? Math.round((ftm / fta) * 100) : 0,
        tov, ast,
        actions: pa.length
    };
};

/**
 * Clutch Rating simplifié :
 * (PTS * 1.5 + AST * 1.2 - TOV * 1.5) / actions clutch, normalisé 0-100
 */
const calcClutchRating = (clutchStats) => {
    if (!clutchStats || !clutchStats.actions) return 0;
    const raw = (clutchStats.pts * 1.5 + clutchStats.ast * 1.2 - clutchStats.tov * 1.5) / clutchStats.actions;
    return Math.max(0, Math.min(100, Math.round(raw * 15)));
};


// ===========================================
// 2. ON/OFF IMPACT
// ===========================================

/**
 * Calcule l'impact ON/OFF d'un joueur.
 * Segmente toutes les actions en ON court / OFF court.
 * Retourne { on: { pts, ptsConceded, poss, ortg, drtg }, off: { ... }, netDiff }
 * Retourne null si données insuffisantes.
 */
const calcOnOffImpact = (actions, playerId, homePlayers) => {
    if (!actions?.length || !actions[0].onCourt || actions[0].time === undefined) return null;

    const homeIds = new Set(homePlayers.map(p => p.id));
    const segments = { on: [], off: [] };

    actions.forEach(a => {
        if (!a.onCourt) return;
        segments[a.onCourt.includes(playerId) ? 'on' : 'off'].push(a);
    });

    const calcSegment = (segActions) => {
        let pts = 0, ptsConceded = 0;
        let fga = 0, fgm = 0, fta = 0, tov = 0, orb = 0;
        let oppFga = 0, oppFgm = 0, oppFta = 0, oppTov = 0, oppOrb = 0;
        let playerStl = 0, playerBlk = 0, playerDreb = 0, playerPf = 0;
        let playerFga = 0, playerFgm = 0, playerFta = 0, playerTov = 0, playerAst = 0;

        segActions.forEach(a => {
            const isHome = homeIds.has(a.pid);
            const isPlayer = a.pid === playerId;

            if (a.type === 'SHOT') {
                if (isHome) {
                    fga++; if (a.made) { fgm++; pts += a.val; }
                    if (isPlayer) { playerFga++; if (a.made) playerFgm++; }
                } else {
                    oppFga++; if (a.made) { oppFgm++; ptsConceded += a.val; }
                }
            }
            if (a.type === 'FT') {
                if (isHome) {
                    fta += a.ftAtt || 0; pts += a.ftMade || 0;
                    if (isPlayer) playerFta += a.ftAtt || 0;
                } else {
                    oppFta += a.ftAtt || 0; ptsConceded += a.ftMade || 0;
                }
            }
            if (a.type === 'TOV') {
                if (isHome) { tov++; if (isPlayer) playerTov++; }
                else oppTov++;
            }
            if (a.type === 'OREB') { if (isHome) orb++; else oppOrb++; }
            if (a.type === 'DREB') { if (isHome && isPlayer) playerDreb++; }
            if (a.type === 'STL')  { if (isHome && isPlayer) playerStl++; }
            if (a.type === 'BLK')  { if (isHome && isPlayer) playerBlk++; }
            if (a.type === 'FOUL') { if (isHome && isPlayer) playerPf++; }
            if (a.astId === playerId && a.type === 'SHOT' && a.made) playerAst++;
        });

        const poss = Math.max(fga + 0.44 * fta + tov - orb, 1);
        const oppPoss = Math.max(oppFga + 0.44 * oppFta + oppTov - oppOrb, 1);
        const avgPoss = (poss + oppPoss) / 2 || 1;

        const ortg = Math.round((pts / avgPoss) * 100);
        const baseDrtg = Math.round((ptsConceded / avgPoss) * 100);

        const defContrib = avgPoss > 0
            ? ((playerStl * 1.8 + playerBlk * 1.2 + playerDreb * 0.4) / avgPoss) * 100
            : 0;
        const defPenalty = avgPoss > 0
            ? ((playerPf * 0.7) / avgPoss) * 100
            : 0;
        const oppFgPct = oppFga > 0 ? oppFgm / oppFga : 0.42;
        const oppContestAdj = (oppFgPct - 0.42) * 30;
        const dpr = Math.max(0, Math.round(baseDrtg - defContrib + defPenalty + oppContestAdj));

        const playerPoss = playerFga + 0.44 * playerFta + playerTov;
        const usageRate = Math.round((playerPoss / avgPoss) * 100);

        // Nombre total d'actions individuelles du joueur dans ce segment
        const playerActions = playerFga + playerAst + playerStl + playerBlk + playerDreb + playerTov + playerPf;
        const involvementRate = avgPoss > 0 ? playerActions / avgPoss : 0;

        return {
            pts, ptsConceded, poss: Math.round(avgPoss),
            ortg, drtg: baseDrtg, dpr,
            defContrib: Math.round(defContrib * 10) / 10,
            defPenalty: Math.round(defPenalty * 10) / 10,
            oppFgPct: Math.round(oppFgPct * 100),
            playerStl, playerBlk, playerDreb, playerPf,
            playerFga, playerFgm, playerTov, playerAst,
            usageRate, playerActions, involvementRate,
            actions: segActions.length
        };
    };

    const on = calcSegment(segments.on);
    const off = calcSegment(segments.off);

    const netOn_raw = on.ortg - on.dpr;
    const netOff_raw = off.ortg - off.dpr;
    const netDiff_raw = netOn_raw - netOff_raw;

    // --- SHRINKAGE ADAPTATIF PAR JOUEUR ---
    // K_base = 30 (référence U18 ~65-75 poss/match)
    // K_joueur = K_base / (1 + involvementRate × 2)
    //   → joueur très impliqué (0.5 actions/poss) : K = 30/2 = 15 → converge vite
    //   → joueur fantôme (0.05 actions/poss) : K = 30/1.1 = 27 → forte régression
    const K_BASE = 30;
    const K_on  = K_BASE / (1 + on.involvementRate * 2);
    const K_off = K_BASE / (1 + off.involvementRate * 2);

    const weightON  = on.poss  / (on.poss  + K_on);
    const weightOFF = off.poss / (off.poss + K_off);

    const netOn  = Math.round(netOn_raw  * weightON);
    const netOff = Math.round(netOff_raw * weightOFF);
    const netDiff = Math.round(netDiff_raw * weightON);

    return {
        on, off,
        netOn, netOff, netDiff,
        netOn_raw: Math.round(netOn_raw),
        netOff_raw: Math.round(netOff_raw),
        netDiff_raw: Math.round(netDiff_raw),
        weightON: Math.round(weightON * 100),
        weightOFF: Math.round(weightOFF * 100),
        K_on: Math.round(K_on * 10) / 10,
        K_off: Math.round(K_off * 10) / 10,
        usageRate: on.usageRate
    };
};



// ==========================================
const { useState, useEffect, useMemo } = React;
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area, ComposedChart, ReferenceLine, Cell, ScatterChart, Scatter, ZAxis } = window.Recharts || {};
const generateId = () => Math.random().toString(36).substr(2, 9);
const defaultPlayers = [{ id: 1, name: "Joueur 1", number: 4, pos: "PG" }, { id: 2, name: "Joueur 2", number: 5, pos: "SG" }];
const DEFAULT_PHASES = [{ id: "phase1", name: "Phase 1" }, { id: "phase2", name: "Phase 2" }];

// --- FIX #2 : fgm/fga = 2PT ONLY. 3PT dans threePM/threePA ---
const recalculateGameStats = (actions, players) => {
    const pStats = {};
    players.forEach(p => { pStats[p.id] = { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, pf: 0, minutes: 0, plusMinus: 0, threePM: 0, threePA: 0 }; });
    const oppStats = { pts: 0, reb: 0, ast: 0, tov: 0, fouls: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, oreb: 0 };
    let home = 0, away = 0;
    actions.forEach(act => {
        const { type, playerId, consequence, onCourt } = act;
        let ptsScored = 0, ptsConceded = 0;
        if (playerId === 'OPP') {
            if (type === 'FGM1') { oppStats.pts++; oppStats.ftm++; oppStats.fta++; away++; ptsConceded = 1; }
            if (type === 'FGA1') oppStats.fta++;
            if (type === 'FGM2') { oppStats.pts += 2; oppStats.fgm++; oppStats.fga++; away += 2; ptsConceded = 2; }
            if (type === 'FGA2') oppStats.fga++;
            if (type === 'FGM3') { oppStats.pts += 3; oppStats.fgm++; oppStats.fga++; away += 3; ptsConceded = 3; }
            if (type === 'FGA3') oppStats.fga++;
            if (type === 'OREB') { oppStats.reb++; oppStats.oreb++; }
            if (type === 'DREB') oppStats.reb++;
            if (type === 'AST') oppStats.ast++;
            if (type === 'TOV') oppStats.tov++;
            if (type === 'PF') oppStats.fouls++;
            if (consequence?.includes('score')) { const val = parseInt(consequence.split('_')[1]); home += val; ptsScored = val; }
        } else if (pStats[playerId]) {
            const ps = pStats[playerId];
            if (type === 'FGM1') { ps.pts++; ps.ftm++; ps.fta++; home++; ptsScored = 1; }
            if (type === 'FGA1') ps.fta++;
            // FIX: fgm/fga = 2PT seulement
            if (type === 'FGM2') { ps.pts += 2; ps.fgm++; ps.fga++; home += 2; ptsScored = 2; }
            if (type === 'FGA2') ps.fga++;
            // FIX: 3PT ne touche PAS fgm/fga, seulement threePM/threePA
            if (type === 'FGM3') { ps.pts += 3; ps.threePM++; ps.threePA++; home += 3; ptsScored = 3; }
            if (type === 'FGA3') ps.threePA++;
            if (type === 'OREB') { ps.reb++; ps.oreb++; }
            if (type === 'DREB') { ps.reb++; ps.dreb++; }
            if (type === 'AST') ps.ast++;
            if (type === 'STL') ps.stl++;
            if (type === 'BLK') ps.blk++;
            if (type === 'TOV') ps.tov++;
            if (type === 'PF') ps.pf++;
            if (consequence?.includes('score')) { const val = parseInt(consequence.split('_')[1]); away += val; ptsConceded = val; }
        }
        if (onCourt?.length) onCourt.forEach(pid => { if (pStats[pid]) pStats[pid].plusMinus += ptsScored - ptsConceded; });
    });
    return { playerStats: pStats, opponentStats: oppStats, homeScore: home, awayScore: away };
};

const saveDataToCloud = (db, collection, data) => {
    if (!db) return Promise.resolve();
    return db.collection("team_data").doc(collection).set({ list: data });
};

// --- ICONS ---
const Icon = ({ path, className }) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>;
const Icons = {
    Play: "M5 3l14 9-14 9V3z", Pause: "M10 9v6 M14 9v6", Trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    Chart: "M18 20V10 M12 20V4 M6 20v-6", Plus: "M12 5v14M5 12h14", Eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    Check: "M20 6L9 17l-5-5", Edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    Upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12", Cloud: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
    Filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z", Layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    Users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    TrendingUp: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6", Trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 22V9 M14 22V9 M8 9h8a4 4 0 0 0 4-4V4H4v1a4 4 0 0 0 4 4z",
    Target: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    Settings: "M12.22 2h-.44a2 2 0 0 1-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    Clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }) => <div className={`bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden ${className}`}>{children}</div>;
const Button = ({ onClick, children, variant = "primary", className = "", size = "md", disabled = false }) => {
    const base = "font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer";
    const variants = { primary: "bg-orange-500 hover:bg-orange-600 text-white", secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200", danger: "bg-red-600 hover:bg-red-700 text-white", success: "bg-green-600 hover:bg-green-700 text-white", ghost: "bg-transparent hover:bg-slate-700 text-slate-400" };
    const sizes = { sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-lg" };
    return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50' : ''}`}>{children}</button>;
};

const Modal = ({ isOpen, onClose, title, children, size = "max-w-4xl" }) => {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" style={{ zIndex: 999999 }}>
            <div className={`bg-slate-800 rounded-xl border border-slate-600 w-full ${size} shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2 truncate pr-2">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl sm:text-3xl leading-none cursor-pointer shrink-0 w-8 h-8 flex items-center justify-center">&times;</button>
                </div>
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>
            </div>
        </div>,
        document.body
    );
};

// --- PARSE HTML ---
const parseHTMLStats = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const date = doc.querySelector('#game-date span.detail')?.textContent || new Date().toLocaleDateString();
    let homeName = doc.querySelector('#team-names-container .left span.detail')?.textContent || "Nous";
    let awayName = doc.querySelector('#team-names-container .right span.detail')?.textContent || "Adversaire";
    let homeScore = parseInt(doc.querySelector('#team-score-left .title')?.textContent || "0");
    let awayScore = parseInt(doc.querySelector('#team-score-right .title')?.textContent || "0");
    let opponentName = awayName, myScore = homeScore, oppScore = awayScore;
    if (homeName.toLowerCase().includes("champagne") || homeName.toLowerCase().includes("basket")) {
        opponentName = awayName; myScore = homeScore; oppScore = awayScore;
    } else if (awayName.toLowerCase().includes("champagne") || awayName.toLowerCase().includes("basket")) {
        opponentName = homeName; myScore = awayScore; oppScore = homeScore;
    }
    const table = doc.querySelector('table#stats');
    const rawPlayers = [];
    let opponentStats = { pts: 0, reb: 0, ast: 0, tov: 0, fouls: 0, fga: 0, oreb: 0, fta: 0 };
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, i) => {
            if (i === 0) return;
            const cells = row.querySelectorAll('td');
            if (cells.length < 17) return;
            const nameCell = cells[0].textContent.trim();
            if (nameCell.includes(opponentName)) { opponentStats = { pts: parseInt(cells[16].textContent) || 0 }; return; }
            if (!nameCell.startsWith('#')) return;
            const parts = nameCell.split(' ');
            const number = parseInt(parts[0].replace('#', ''));
            const name = parts.slice(1).join(' ');
            const parseSplit = (txt) => { if (!txt || txt === '-') return { made: 0, att: 0 }; const [m, a] = txt.split('-'); return { made: parseInt(m) || 0, att: parseInt(a) || 0 }; };
            const fg = parseSplit(cells[1].textContent);
            const tp = parseSplit(cells[3].textContent);
            const ft = parseSplit(cells[5].textContent);
            // fgm/fga = 2PT only (on soustrait les 3PT du total FG)
            const stats = {
                fgm: fg.made - tp.made, fga: fg.att - tp.att,
                ftm: ft.made, fta: ft.att,
                pts: parseInt(cells[16].textContent) || 0,
                reb: (parseInt(cells[7].textContent) || 0) + (parseInt(cells[8].textContent) || 0),
                oreb: parseInt(cells[7].textContent) || 0,
                dreb: parseInt(cells[8].textContent) || 0,
                ast: parseInt(cells[13].textContent) || 0,
                stl: parseInt(cells[10].textContent) || 0,
                blk: parseInt(cells[12].textContent) || 0,
                tov: parseInt(cells[11].textContent) || 0,
                pf: parseInt(cells[9].textContent) || 0,
                minutes: parseInt(cells[15].textContent) || 0,
                plusMinus: parseInt(cells[14].textContent) || 0,
                threePM: tp.made, threePA: tp.att
            };
            rawPlayers.push({ name, number, stats });
        });
    }
    return { meta: { date, opponent: opponentName, homeScore: myScore, awayScore: oppScore }, rawPlayers, opponentStats };
};


// ============================================================
// 1. VolumeEfficiencyMatrix
// ============================================================
// ScatterChart : X = FGA/match (volume), Y = TS% (efficacité)
// Taille point = minutes jouées, couleur = position
// Quadrants délimités par ReferenceLine aux médianes

function VolumeEfficiencyMatrix({ players }) {
    const POS_COLORS = { PG: '#f97316', SG: '#3b82f6', SF: '#22c55e', PF: '#a855f7', C: '#ef4444', G: '#f97316', F: '#22c55e' };

    const data = useMemo(() => {
        // Correction de la condition de filtrage pour correspondre à l'objet 'aggregated' de app.js
        const pts = players
            .filter(p => p.gamesPlayed > 0 && p.avg) 
            .map(p => {
                const a = p.avg; // Utilisation des moyennes déjà calculées dans app.js
                return { 
                    name: p.info.name, 
                    pos: p.info.pos || 'G', 
                    fgaPg: parseFloat(a.fga) || 0, 
                    ts: parseFloat(a.TS) || 0, 
                    minPg: parseFloat(a.min) || 0, 
                    color: POS_COLORS[p.info.pos] || '#94a3b8' 
                };
            });

        if (pts.length === 0) return { points: [], medFga: 0, medTs: 0 };

        const fgaVals = pts.map(d => d.fgaPg);
        const tsVals = pts.map(d => d.ts);
        const sortedFga = [...fgaVals].sort((a, b) => a - b);
        const sortedTs = [...tsVals].sort((a, b) => a - b);
        const median = arr => {
            if (arr.length === 0) return 0;
            const mid = Math.floor(arr.length / 2);
            return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
        };

        return { points: pts, medFga: median(sortedFga), medTs: median(sortedTs) };
    }, [players]);

    if (!data.points || data.points.length === 0) {
        return <div className="text-slate-500 text-xs text-center p-8 bg-slate-900/30 rounded-lg border border-dashed border-slate-700">Données insuffisantes (nécessite au moins 1 match enregistré)</div>;
    }

    const positions = [...new Set(data.points.map(d => d.pos))];

    return (
        <div className="space-y-3">
            <h4 className="text-xs text-slate-400 uppercase font-bold flex items-center gap-2">
                <span className="text-orange-500">🎯</span> Volume vs Efficacité (TS%)
            </h4>
            <div className="flex flex-wrap gap-3 mb-2">
                {positions.map(pos => (
                    <span key={pos} className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: POS_COLORS[pos] || '#94a3b8' }} />
                        {pos}
                    </span>
                ))}
            </div>
            <div className="h-72 bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis type="number" dataKey="fgaPg" name="FGA/m" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis type="number" dataKey="ts" name="TS%" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                        <ZAxis type="number" dataKey="minPg" range={[50, 400]} />
                        <ReferenceLine x={data.medFga} stroke="#475569" strokeDasharray="3 3" label={{ value: 'Médiane Vol.', fill: '#475569', fontSize: 8, position: 'top' }} />
                        <ReferenceLine y={data.medTs} stroke="#475569" strokeDasharray="3 3" label={{ value: 'Médiane Eff.', fill: '#475569', fontSize: 8, position: 'right' }} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-2xl text-[11px]">
                                        <div className="font-bold text-white mb-1">{d.name}</div>
                                        <div className="text-slate-400">FGA/match: <span className="text-white">{d.fgaPg}</span></div>
                                        <div className="text-slate-400">True Shooting: <span className="text-green-400">{d.ts}%</span></div>
                                        <div className="text-slate-400">Minutes/m: <span className="text-white">{d.minPg}</span></div>
                                    </div>
                                );
                            }}
                        />
                        <Scatter data={data.points}>
                            {data.points.map((entry, i) => (
                                <Cell key={i} fill={entry.color} stroke="#0f172a" strokeWidth={1} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}


// ============================================================
// 2. MomentumChart
// ============================================================
// AreaChart : différentiel de score (home - away) au fil du temps
// Annotations pour runs ≥ 6-0, zones colorées home/away

function MomentumChart({ scoreHistory, actions }) {
    const chartData = useMemo(() => {
        if (!scoreHistory || scoreHistory.length === 0) return { data: [], runs: [] };

        const timeline = scoreHistory.map((sh, i) => ({
            idx: i,
            time: sh.time != null ? sh.time : i,
            q: sh.q || 1,
            diff: (sh.home || 0) - (sh.away || 0),
            home: sh.home || 0,
            away: sh.away || 0,
            label: sh.q ? `Q${sh.q}` : ''
        }));

        // Détection des runs ≥ 6-0
        const runs = [];
        let runStart = 0, runHome = 0, runAway = 0;
        for (let i = 1; i < timeline.length; i++) {
            const dHome = timeline[i].home - timeline[i - 1].home;
            const dAway = timeline[i].away - timeline[i - 1].away;
            if (dHome > 0 && dAway === 0) {
                if (runAway > 0) { runStart = i; runHome = 0; runAway = 0; }
                runHome += dHome;
            } else if (dAway > 0 && dHome === 0) {
                if (runHome > 0) { runStart = i; runHome = 0; runAway = 0; }
                runAway += dAway;
            } else {
                if (runHome >= 6) runs.push({ idx: Math.floor((runStart + i - 1) / 2), text: `${runHome}-0 run`, team: 'home' });
                if (runAway >= 6) runs.push({ idx: Math.floor((runStart + i - 1) / 2), text: `0-${runAway} run`, team: 'away' });
                runStart = i; runHome = 0; runAway = 0;
            }
        }
        if (runHome >= 6) runs.push({ idx: Math.floor((runStart + timeline.length - 1) / 2), text: `${runHome}-0 run`, team: 'home' });
        if (runAway >= 6) runs.push({ idx: Math.floor((runStart + timeline.length - 1) / 2), text: `0-${runAway} run`, team: 'away' });

        return { data: timeline, runs };
    }, [scoreHistory]);

    if (chartData.data.length === 0) return <div className="text-slate-500 text-sm text-center p-4">Pas de données de score</div>;

    const maxAbs = Math.max(...chartData.data.map(d => Math.abs(d.diff)), 5);

    return (
        <div>
            <h4 className="text-xs text-slate-400 uppercase mb-2">Momentum — Différentiel de Score</h4>
            {chartData.runs.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {chartData.runs.map((r, i) => (
                        <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.team === 'home' ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'}`}>
                            {r.text}
                        </span>
                    ))}
                </div>
            )}
            <div className="h-56 bg-slate-900/50 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.data} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                        <defs>
                            <linearGradient id="gradHome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradAway" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="idx" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => {
                            const pt = chartData.data[v];
                            return pt ? `Q${pt.q}` : '';
                        }} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={[-maxAbs, maxAbs]} tickFormatter={v => v > 0 ? `+${v}` : v} />
                        <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
                        <Tooltip content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs">
                                    <div className="text-slate-400">Q{d.q}</div>
                                    <div className="text-blue-400">Home: {d.home}</div>
                                    <div className="text-red-400">Away: {d.away}</div>
                                    <div className={`font-bold ${d.diff >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        Diff: {d.diff > 0 ? '+' : ''}{d.diff}
                                    </div>
                                </div>
                            );
                        }} />
                        <Area type="monotone" dataKey="diff" stroke="#3b82f6" fill="url(#gradHome)" fillOpacity={1}
                            baseValue={0} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-2">
                <span className="text-blue-400">▲ Home mène</span>
                <span className="text-red-400">▼ Adversaire mène</span>
            </div>
        </div>
    );
}


// ============================================================
// 3. GhostSeasonChart
// ============================================================
// ComposedChart : Line 1 = moyenne cumulée, Line 2 = match sélectionné
// Area entre les deux pour visualiser l'écart

function GhostSeasonChart({ logs, currentGame }) {
    const chartData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        const categories = ['pts', 'reb', 'ast', 'stl', 'blk'];
        let cumulative = {};
        categories.forEach(c => cumulative[c] = 0);

        return logs.map((log, i) => {
            const entry = { game: i + 1, opponent: log.opponent || `M${i + 1}` };
            categories.forEach(c => {
                cumulative[c] += (log[c] || 0);
                entry[`avg_${c}`] = Math.round((cumulative[c] / (i + 1)) * 10) / 10;
                entry[`val_${c}`] = log[c] || 0;
            });
            // Score composite pour la vue principale
            entry.avgComposite = Math.round((entry.avg_pts + entry.avg_reb * 1.2 + entry.avg_ast * 1.5 + entry.avg_stl * 2 + entry.avg_blk * 2) * 10) / 10;
            entry.valComposite = Math.round((entry.val_pts + entry.val_reb * 1.2 + entry.val_ast * 1.5 + entry.val_stl * 2 + entry.val_blk * 2) * 10) / 10;
            entry.isSelected = currentGame != null && i === currentGame;
            return entry;
        });
    }, [logs, currentGame]);

    const [metric, setMetric] = useState('composite');
    const metrics = [
        { key: 'composite', label: 'Global', color: '#f97316' },
        { key: 'pts', label: 'PTS', color: '#f97316' },
        { key: 'reb', label: 'REB', color: '#3b82f6' },
        { key: 'ast', label: 'AST', color: '#22c55e' },
    ];

    if (chartData.length === 0) return <div className="text-slate-500 text-sm text-center p-4">Pas de données</div>;

    const avgKey = metric === 'composite' ? 'avgComposite' : `avg_${metric}`;
    const valKey = metric === 'composite' ? 'valComposite' : `val_${metric}`;
    const activeColor = metrics.find(m => m.key === metric)?.color || '#f97316';

    return (
        <div>
            <h4 className="text-xs text-slate-400 uppercase mb-2">Courbe Fantôme — Saison vs Match</h4>
            <div className="flex gap-1 mb-2">
                {metrics.map(m => (
                    <button key={m.key} onClick={() => setMetric(m.key)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${metric === m.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        style={metric === m.key ? { backgroundColor: m.color + '30', color: m.color, border: `1px solid ${m.color}` } : { border: '1px solid transparent' }}>
                        {m.label}
                    </button>
                ))}
            </div>
            <div className="h-56 bg-slate-900/50 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                        <defs>
                            <linearGradient id="ghostGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={activeColor} stopOpacity={0.15} />
                                <stop offset="100%" stopColor={activeColor} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs">
                                    <div className="font-bold text-white">{d.opponent}</div>
                                    <div style={{ color: activeColor }}>Match: {d[valKey]}</div>
                                    <div className="text-slate-400">Moy. cumulée: {d[avgKey]}</div>
                                    <div className={`text-[10px] ${d[valKey] >= d[avgKey] ? 'text-green-400' : 'text-red-400'}`}>
                                        Écart: {d[valKey] >= d[avgKey] ? '+' : ''}{Math.round((d[valKey] - d[avgKey]) * 10) / 10}
                                    </div>
                                </div>
                            );
                        }} />
                        <Area type="monotone" dataKey={avgKey} stroke="none" fill="url(#ghostGrad)" isAnimationActive={false} />
                        <Line type="monotone" dataKey={avgKey} name="Moy. cumulée" stroke="#64748b" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey={valKey} name="Match" stroke={activeColor} strokeWidth={2}
                            dot={(props) => {
                                const { cx, cy, payload } = props;
                                const above = payload[valKey] >= payload[avgKey];
                                return <circle cx={cx} cy={cy} r={payload.isSelected ? 6 : 3} fill={above ? '#22c55e' : '#ef4444'} stroke={payload.isSelected ? '#fff' : 'none'} strokeWidth={payload.isSelected ? 2 : 0} />;
                            }}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}


// ============================================================
// 4. ArchetypeRadar
// ============================================================
// RadarChart 5 axes : Scoring, Playmaking, Defense, Rebounding, Shooting
// Notes 0-99 calculées par normalisation sur l'effectif

function ArchetypeRadar({ player, allPlayers }) {
    const radarData = useMemo(() => {
        if (!player || !allPlayers || allPlayers.length === 0) return [];

        const eligible = allPlayers.filter(p => p.gamesPlayed > 0 && p.total);
        if (eligible.length === 0) return [];

        // Calcul des raw stats par match pour chaque joueur
        const rawStats = eligible.map(p => {
            const gp = p.gamesPlayed;
            const t = p.total;
            const totalFGA = (t.fga || 0) + (t.threePA || 0);
            const totalFGM = (t.fgm || 0) + (t.threePM || 0);
            const tsa = totalFGA + 0.44 * (t.fta || 0);
            return {
                id: p.info.id,
                scoring: (t.pts || 0) / gp,
                playmaking: ((t.ast || 0) / gp) - ((t.tov || 0) / gp) * 0.5,
                defense: ((t.stl || 0) / gp) * 1.5 + ((t.blk || 0) / gp) * 1.2,
                rebounding: ((t.reb || 0) / gp),
                shooting: tsa > 0 ? ((t.pts || 0) / (2 * tsa)) * 100 : 0
            };
        });

        const axes = ['scoring', 'playmaking', 'defense', 'rebounding', 'shooting'];
        const labels = { scoring: 'Scoring', playmaking: 'Playmaking', defense: 'Defense', rebounding: 'Rebounding', shooting: 'Shooting' };

        const playerRaw = rawStats.find(r => r.id === player.info.id);
        if (!playerRaw) return [];

        return axes.map(axis => {
            const vals = rawStats.map(r => r[axis]);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const range = max - min;
            const normalized = range > 0 ? Math.round(((playerRaw[axis] - min) / range) * 99) : 50;
            return { axis: labels[axis], score: Math.max(0, Math.min(99, normalized)), raw: Math.round(playerRaw[axis] * 10) / 10 };
        });
    }, [player, allPlayers]);

    if (radarData.length === 0) return <div className="text-slate-500 text-sm text-center p-4">Pas de données</div>;

    const avgScore = Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length);
    const archetype = (() => {
        const sorted = [...radarData].sort((a, b) => b.score - a.score);
        const top = sorted[0].axis;
        const second = sorted[1].axis;
        if (top === 'Scoring' && second === 'Shooting') return 'Sniper';
        if (top === 'Scoring') return 'Scoreur';
        if (top === 'Playmaking') return 'Meneur créateur';
        if (top === 'Defense') return 'Défenseur';
        if (top === 'Rebounding') return 'Intérieur';
        if (top === 'Shooting') return 'Shooteur';
        return 'Polyvalent';
    })();

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs text-slate-400 uppercase">Archétype Joueur</h4>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-400 border border-orange-800">{archetype}</span>
                    <span className="text-xs text-slate-500">OVR {avgScore}</span>
                </div>
            </div>
            <div className="h-64 bg-slate-900/50 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="axis" stroke="#94a3b8" fontSize={11} />
                        <PolarRadiusAxis stroke="#334155" fontSize={9} domain={[0, 99]} tickCount={4} />
                        <Radar dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
                        <Tooltip content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs">
                                    <div className="font-bold text-white">{d.axis}</div>
                                    <div className="text-orange-400">Note: <span className="font-bold">{d.score}</span>/99</div>
                                    <div className="text-slate-400">Valeur: {d.raw}</div>
                                </div>
                            );
                        }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {radarData.map(d => (
                    <span key={d.axis} className="text-[10px] text-slate-400">
                        {d.axis}: <span className={`font-bold ${d.score >= 70 ? 'text-green-400' : d.score >= 40 ? 'text-orange-400' : 'text-red-400'}`}>{d.score}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
// --- LIVE TRACKER ---
function LiveTracker({ players, onSaveGame, initialGame, phases, selectedPhase }) {
    const [gameState, setGameState] = useState({ quarter: 1, opponent: "Adversaire", actions: [], phase: selectedPhase });
    const [gameTime, setGameTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [onCourt, setOnCourt] = useState([]);
    const [accumulatedMinutes, setAccumulatedMinutes] = useState({});
    const [derived, setDerived] = useState(recalculateGameStats([], players));
    const [modal, setModal] = useState({ type: null, data: null });

    useEffect(() => { if (initialGame) setGameState(prev => ({ ...prev, ...initialGame })); }, [initialGame]);
    useEffect(() => { setDerived(recalculateGameStats(gameState.actions, players)); }, [gameState.actions, players]);
    useEffect(() => {
        let interval;
        if (isTimerRunning) { interval = setInterval(() => { setGameTime(p => p + 1); setAccumulatedMinutes(prev => { const next = { ...prev }; onCourt.forEach(id => next[id] = (next[id] || 0) + 1); return next; }); }, 1000); }
        return () => clearInterval(interval);
    }, [isTimerRunning, onCourt]);

    const registerAction = (actionType, player, extraData = {}) => {
        const newAction = { id: generateId(), type: actionType, playerId: player === 'opponent' ? 'OPP' : player.id, playerName: player === 'opponent' ? 'Adversaire' : player.name, q: gameState.quarter, consequence: extraData.consequence, onCourt: [...onCourt] };
        setGameState(prev => ({ ...prev, actions: [...prev.actions, newAction] }));
        setModal({ type: null, data: null });
    };

    const finalizeGame = () => {
        const finalStats = { ...derived.playerStats };
        Object.keys(accumulatedMinutes).forEach(pid => { if (finalStats[pid]) finalStats[pid].minutes += Math.round(accumulatedMinutes[pid] / 60); });
        onSaveGame({ ...gameState, ...derived, playerStats: finalStats });
    };

    return (
        <div className="flex flex-col h-full gap-4 relative">
            <div className="bg-slate-800 p-2 flex justify-between items-center rounded-lg border border-slate-700">
                <div className="flex items-center gap-4">
                    <Button size="sm" className={isTimerRunning ? "bg-red-500" : "bg-green-500"} onClick={() => setIsTimerRunning(!isTimerRunning)}><Icon path={isTimerRunning ? Icons.Pause : Icons.Play} /> {isTimerRunning ? "Stop" : "Start"}</Button>
                    <div className="font-mono text-xl text-white font-bold">{Math.floor(gameTime / 60).toString().padStart(2, '0')}:{(gameTime % 60).toString().padStart(2, '0')}</div>
                </div>
                <div className="flex items-center gap-4">
                    <select value={gameState.phase} onChange={(e) => setGameState(p => ({ ...p, phase: e.target.value }))} className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600">
                        {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                    </select>
                    <span className="text-xs text-slate-400">Terrain: <span className={onCourt.length === 5 ? "text-green-400" : "text-orange-400"}>{onCourt.length}/5</span></span>
                </div>
            </div>
            <Card className="bg-slate-900 p-4 flex justify-between items-center sticky top-0 z-10 border-b-4 border-orange-500">
                <div className="text-4xl font-bold text-white">{derived.homeScore}</div>
                <div className="flex flex-col items-center"><div className="text-xl font-bold text-orange-500">Q{gameState.quarter}</div><div className="flex gap-2 mt-1"><button onClick={() => setGameState(p => ({ ...p, quarter: Math.max(1, p.quarter - 1) }))} className="text-xs text-slate-500 hover:text-white">-</button><button onClick={() => setGameState(p => ({ ...p, quarter: p.quarter + 1 }))} className="text-xs text-slate-500 hover:text-white">+</button></div></div>
                <div className="text-4xl font-bold text-red-500">{derived.awayScore}</div>
            </Card>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-3 pb-20">
                {players.map(player => {
                    const pStats = derived.playerStats[player.id] || { pts: 0, plusMinus: 0 };
                    const isOnCourt = onCourt.includes(player.id);
                    return (
                        <div key={player.id} className={`relative p-3 rounded-xl border shadow-md transition-all ${isOnCourt ? 'bg-slate-800 border-orange-500' : 'bg-slate-800/60 border-slate-700 opacity-80'}`}>
                            <div className="absolute top-2 right-2"><input type="checkbox" checked={isOnCourt} onChange={() => { if (onCourt.includes(player.id)) setOnCourt(p => p.filter(x => x !== player.id)); else if (onCourt.length < 5) setOnCourt(p => [...p, player.id]); }} className="w-5 h-5 accent-orange-500 cursor-pointer" /></div>
                            <div onClick={() => setModal({ type: "ACTION_MENU", data: player })} className="cursor-pointer">
                                <div className="flex justify-between pr-6"><span className={`font-bold truncate ${isOnCourt ? 'text-white' : 'text-slate-400'}`}>{player.name}</span><span className="text-xs text-slate-500">#{player.number}</span></div>
                                <div className="text-xs mt-2 space-x-2 text-slate-300"><span>Pts: <b className="text-white">{pStats.pts}</b></span><span>+/-: <b className={pStats.plusMinus >= 0 ? "text-green-400" : "text-red-400"}>{pStats.plusMinus > 0 ? '+' : ''}{pStats.plusMinus}</b></span></div>
                            </div>
                        </div>
                    );
                })}
                <div onClick={() => setModal({ type: "ACTION_MENU", data: "opponent" })} className="bg-red-900/40 p-3 rounded-xl border border-red-700 hover:border-red-500 cursor-pointer flex items-center justify-center"><span className="font-bold text-red-200">{gameState.opponent.toUpperCase()}</span></div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 p-4 border-t border-slate-800 flex justify-end z-20 gap-2"><Button variant="secondary" onClick={() => setModal({ type: "STATS" })}><Icon path={Icons.Eye} /> Stats</Button><Button variant="success" onClick={finalizeGame}><Icon path={Icons.Check} /> Finir</Button></div>
            <Modal isOpen={modal.type === "ACTION_MENU"} onClose={() => setModal({ type: null })} title={modal.data?.name || "Adversaire"} size="max-w-md">
                <div className="grid grid-cols-3 gap-3">
                    <Button className="bg-green-600 h-12" onClick={() => registerAction("FGM2", modal.data)}>+2</Button><Button className="bg-green-600 h-12" onClick={() => registerAction("FGM3", modal.data)}>+3</Button><Button className="bg-green-600 h-12" onClick={() => registerAction("FGM1", modal.data)}>+1 LF</Button>
                    <Button className="bg-red-500 h-10" onClick={() => registerAction("FGA2", modal.data)}>Miss 2</Button><Button className="bg-red-500 h-10" onClick={() => registerAction("FGA3", modal.data)}>Miss 3</Button><Button className="bg-red-500 h-10" onClick={() => registerAction("FGA1", modal.data)}>Miss LF</Button>
                    <div className="col-span-3 h-px bg-slate-600 my-1"></div>
                    <Button className="bg-blue-600" onClick={() => registerAction("DREB", modal.data)}>Reb D</Button><Button className="bg-blue-500" onClick={() => registerAction("OREB", modal.data)}>Reb O</Button><Button className="bg-purple-600" onClick={() => registerAction("AST", modal.data)}>Passe</Button>
                    <Button className="bg-yellow-600" onClick={() => modal.data !== 'opponent' ? setModal({ type: "CONSEQ_STL", data: modal.data }) : registerAction("STL", "opponent")}>Int</Button><Button className="bg-orange-600" onClick={() => modal.data !== 'opponent' ? setModal({ type: "CONSEQ_TOV", data: modal.data }) : registerAction("TOV", "opponent")}>BP</Button><Button className="bg-slate-600" onClick={() => registerAction("BLK", modal.data)}>Contre</Button>
                    <Button variant="danger" className="col-span-3 mt-2" onClick={() => registerAction("PF", modal.data)}>Faute</Button>
                </div>
            </Modal>
            <Modal isOpen={modal.type === "CONSEQ_TOV"} onClose={() => setModal({ type: null })} title="Consequence ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_2" })} className="bg-red-600">Adv +2</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_3" })} className="bg-red-600">Adv +3</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "CONSEQ_STL"} onClose={() => setModal({ type: null })} title="Suite ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("STL", modal.data, { consequence: "score_2" })} className="bg-green-600">Nous +2</Button><Button onClick={() => registerAction("STL", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "STATS"} onClose={() => setModal({ type: null })} title="Stats Live"><table className="w-full text-left text-xs text-slate-300"><thead className="bg-slate-700 text-white"><tr><th className="p-2">Joueur</th><th className="p-2">Pts</th><th className="p-2">+/-</th><th className="p-2">Fte</th></tr></thead><tbody className="divide-y divide-slate-700">{players.map(p => { const s = derived.playerStats[p.id] || {}; return <tr key={p.id}><td className="p-2 font-bold">{p.name}</td><td className="p-2">{s.pts}</td><td className={`p-2 font-bold ${(s.plusMinus||0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.plusMinus}</td><td className="p-2 text-red-400">{s.pf}</td></tr>; })}</tbody></table></Modal>
        </div>
    );
}

// ===========================================
// GLOBAL STATS
// ===========================================
function GlobalStats({ players, games, phases, isAdmin }) {
    const [filterPhase, setFilterPhase] = React.useState('all');
    const [selectedPlayer, setSelectedPlayer] = React.useState(null);
    const [showTeamTrends, setShowTeamTrends] = React.useState(false);
    const [showVolumeMatrix, setShowVolumeMatrix] = useState(false);
    const [viewMode, setViewMode] = React.useState('classic'); // 'classic' or 'advanced'

    // Filtrage des matchs
   const filteredGames = React.useMemo(() => {
    const isFinal = g => !g.status || g.status === 'final';
    if (filterPhase === 'all') return games.filter(isFinal);
    return games.filter(g => g.phase === filterPhase && isFinal(g));
}, [games, filterPhase]);

    // --- 1. CALCULS DES TENDANCES ET ANALYSE DÉFAITES ---
    const teamTrendsData = React.useMemo(() => {
        const sorted = [...filteredGames].sort((a, b) => parseDate(a.date) - parseDate(b.date));
        
        // Initialisation des accumulateurs
        const initStats = () => ({ 
            pts: 0, conceded: 0, 
            fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, 
            reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 
        });

        let global = initStats();
        let winsStats = { ...initStats(), count: 0 };
        let lossStats = { ...initStats(), count: 0 };

        const data = sorted.map((g) => {
            let stats = initStats();
            
            // Somme des stats des joueurs pour ce match
            Object.values(g.playerStats).forEach(s => {
                stats.pts += (s.pts||0); 
                stats.fgm += (s.fgm||0)+(s.threePM||0); // FGM inclut généralement 3PM dans les boxscores complets, ici on additionne si séparé
                stats.fga += (s.fga||0)+(s.threePA||0);
                stats.threePM += (s.threePM||0); stats.threePA += (s.threePA||0);
                stats.ftm += (s.ftm||0); stats.fta += (s.fta||0);
                stats.reb += (s.oreb||0)+(s.dreb||0);
                stats.ast += (s.ast||0); stats.stl += (s.stl||0); stats.blk += (s.blk||0);
                stats.tov += (s.tov||0); stats.pf += (s.pf||0);
            });

            // Aggrégation Globale
            Object.keys(global).forEach(k => { if(stats[k] !== undefined) global[k] += stats[k]; });
            global.conceded += (g.awayScore||0);

            // Calculs avancés par match
            const totalPoss = stats.fga + 0.44*stats.fta - (stats.reb*0.3) + stats.tov; 
            const ortg = totalPoss > 0 ? (stats.pts/totalPoss)*100 : 0;
            const drtg = totalPoss > 0 ? ((g.awayScore||0)/totalPoss)*100 : 0;
            const isWin = (g.homeScore||0) > (g.awayScore||0);

            // Aggrégation Victoires / Défaites
            const target = isWin ? winsStats : lossStats;
            target.count++;
            target.conceded += (g.awayScore||0);
            Object.keys(stats).forEach(k => { if(target[k] !== undefined) target[k] += stats[k]; });

            return {
                date: g.date, opponent: g.opponent, isWin,
                score: g.homeScore||0, conceded: g.awayScore||0,
                ORtg: parseFloat(ortg.toFixed(1)), DRtg: parseFloat(drtg.toFixed(1)), NetRtg: parseFloat((ortg-drtg).toFixed(1)),
                ...stats,
                fgPct: stats.fga > 0 ? ((stats.fgm/stats.fga)*100).toFixed(1) : 0,
                threePct: stats.threePA > 0 ? ((stats.threePM/stats.threePA)*100).toFixed(1) : 0
            };
        });

        // Fonction utilitaire pour calculer les moyennes
        const calcAvg = (source, count) => {
            if (count === 0) return {};
            return {
                pts: (source.pts/count).toFixed(1), conceded: (source.conceded/count).toFixed(1),
                reb: (source.reb/count).toFixed(1), ast: (source.ast/count).toFixed(1),
                stl: (source.stl/count).toFixed(1), blk: (source.blk/count).toFixed(1),
                tov: (source.tov/count).toFixed(1), pf: (source.pf/count).toFixed(1),
                fgPct: source.fga > 0 ? ((source.fgm/source.fga)*100).toFixed(1) : 0,
                threePct: source.threePA > 0 ? ((source.threePM/source.threePA)*100).toFixed(1) : 0,
                ftPct: source.fta > 0 ? ((source.ftm/source.fta)*100).toFixed(1) : 0,
                fgm: (source.fgm/count).toFixed(1), fga: (source.fga/count).toFixed(1),
                threePM: (source.threePM/count).toFixed(1), threePA: (source.threePA/count).toFixed(1)
            };
        };

        const avgs = calcAvg(global, data.length || 1);
        const winAvgs = calcAvg(winsStats, winsStats.count);
        const lossAvgs = calcAvg(lossStats, lossStats.count);

        // ANALYSE DES DÉFAITES (Comparaison Différentielle)
        const analysis = [];
        if (lossStats.count > 0 && winsStats.count > 0) {
            // Calcul des deltas (Combien fait-on de MOINS en défaite par rapport à la victoire)
            // Positif = On est moins bon en défaite. Négatif = On est meilleur en défaite (rare mais possible)
            
            const diffs = [
                { label: "Défense (Pts Encaissés)", val: parseFloat(lossAvgs.conceded) - parseFloat(winAvgs.conceded), type: 'negative_more_is_bad', unit: 'pts' },
                { label: "Attaque (Scoring)", val: parseFloat(winAvgs.pts) - parseFloat(lossAvgs.pts), type: 'positive_less_is_bad', unit: 'pts' },
                { label: "Pertes de balle", val: parseFloat(lossAvgs.tov) - parseFloat(winAvgs.tov), type: 'negative_more_is_bad', unit: 'bp' },
                { label: "Adresse Globale", val: parseFloat(winAvgs.fgPct) - parseFloat(lossAvgs.fgPct), type: 'positive_less_is_bad', unit: '%' },
                { label: "Adresse 3-Pts", val: parseFloat(winAvgs.threePct) - parseFloat(lossAvgs.threePct), type: 'positive_less_is_bad', unit: '%' },
                { label: "Rebonds", val: parseFloat(winAvgs.reb) - parseFloat(lossAvgs.reb), type: 'positive_less_is_bad', unit: 'reb' },
                { label: "Création (Passes)", val: parseFloat(winAvgs.ast) - parseFloat(lossAvgs.ast), type: 'positive_less_is_bad', unit: 'pd' },
            ];

            // On trie par impact (valeur absolue la plus grande)
            analysis.push(...diffs
                .map(d => ({ ...d, impact: Math.abs(d.val), raw: d.val }))
                .sort((a, b) => b.impact - a.impact)
                .slice(0, 3) // Top 3 des causes
            );
        }

        const streak = data.length > 0 ? (data[data.length-1].isWin ? "W" : "L") : "-";

        return { data, avgs, winAvgs, lossAvgs, wins: winsStats.count, losses: lossStats.count, streak, analysis };
    }, [filteredGames]);

    // Aggrégation des joueurs (inchangée mais nécessaire pour le tableau)
    const aggregated = React.useMemo(() => {
        const agg = {};
        players.forEach(p => {
            agg[p.id] = { 
                info: p, gamesPlayed: 0, 
                stats: { pts:0, fgm:0, fga:0, threePM:0, threePA:0, ftm:0, fta:0, oreb:0, dreb:0, reb:0, ast:0, stl:0, blk:0, tov:0, pf:0, minutes:0, plusMinus: 0 },logs: []            };
                
            });
const GT = { FGM:0, FGA:0, ThreePM:0, FTM:0, FTA:0, ORB:0, DRB:0,
                 AST:0, STL:0, BLK:0, TOV:0, PF:0, PTS:0, MP:0 };

       filteredGames.forEach(g => {
        Object.values(g.playerStats).forEach(s => {
            GT.FGM += (s.fgm||0) + (s.threePM||0);
            GT.FGA += (s.fga||0) + (s.threePA||0);
            GT.ThreePM += (s.threePM||0);
            GT.FTM += (s.ftm||0); GT.FTA += (s.fta||0);
            GT.ORB += (s.oreb||0); GT.DRB += (s.dreb||0);
            GT.AST += (s.ast||0); GT.STL += (s.stl||0);
            GT.BLK += (s.blk||0); GT.TOV += (s.tov||0);
            GT.PF += (s.pf||0); GT.PTS += (s.pts||0);
            GT.MP += (s.minutes||0);
        });
            Object.entries(g.playerStats).forEach(([pid, stats]) => {
                if (!agg[pid]) return;
                const hasActivity = (stats.pts||0) > 0 || (stats.fgm||0) > 0 || (stats.fga||0) > 0 ||
                    (stats.threePA||0) > 0 || (stats.fta||0) > 0 || (stats.oreb||0) > 0 || (stats.dreb||0) > 0 ||
                    (stats.ast||0) > 0 || (stats.stl||0) > 0 || (stats.blk||0) > 0 || (stats.tov||0) > 0 ||
                    (stats.pf||0) > 0 || (stats.minutes||0) > 0;
                if (!hasActivity) return;
                agg[pid].gamesPlayed++;
                Object.keys(agg[pid].stats).forEach(k => {
                    agg[pid].stats[k] += (stats[k] || 0);
                });
                agg[pid].stats.reb = agg[pid].stats.oreb + agg[pid].stats.dreb;

                const reb = (stats.oreb||0) + (stats.dreb||0);
                const missedFG = ((stats.fga||0)+(stats.threePA||0)) - ((stats.fgm||0)+(stats.threePM||0));
                const missedFT = (stats.fta||0) - (stats.ftm||0);
                const eff = (stats.pts||0) + reb + (stats.ast||0) + (stats.stl||0) + (stats.blk||0) - missedFG - missedFT - (stats.tov||0);
                
                agg[pid].logs.push({
                    date: g.date,
                    opponent: g.opponent,
                    isWin: (g.homeScore || 0) > (g.awayScore || 0),
                    score: g.homeScore,
                    conceded: g.awayScore,
                    min: stats.minutes || 0,
                    pts: stats.pts || 0,
                    reb: reb,
                    ast: stats.ast || 0,
                    stl: stats.stl || 0,
                    tov: stats.tov || 0,
                    plusMinus: stats.plusMinus || 0,
                    eff: eff,
                    ORtg: 0, // Optionnel si vous n'avez pas le calcul complexe
                    DRtg: 0  // Optionnel
                });
            });
        });
        const k_formation = 1.8;
const impact_individuel = 0.30;
       // Remplacer TOUT le bloc : return Object.values(agg).filter(...).map(...).sort(...)

return Object.values(agg)
    .filter(p => p.gamesPlayed > 0)
    .map(p => {
        const gp = p.gamesPlayed;
        const t = p.stats;

        // ── Totaux tirs (2pts + 3pts combinés) ──
        const totalFGM = (t.fgm || 0) + (t.threePM || 0);
        const totalFGA = (t.fga || 0) + (t.threePA || 0);const totalTeamMinutes = GT.MP || 1;
        const activePlayersCount = Object.values(agg).filter(x => x.gamesPlayed > 0).length || 1;
        const teamPossessions = (GT.FGA + 0.44 * GT.FTA - GT.ORB + GT.TOV) || 1;


        // ── Pourcentages avancés ──
        const fgPct = totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : "0.0";
        const threePct = (t.threePA || 0) > 0 ? ((t.threePM / t.threePA) * 100).toFixed(1) : "0.0";
        const ftPct = (t.fta || 0) > 0 ? ((t.ftm / t.fta) * 100).toFixed(1) : "0.0";
        const fg2M = totalFGM - (t.threePM || 0);
        const fg2A = totalFGA - (t.threePA || 0);
        const twoPct = fg2A > 0 ? ((fg2M / fg2A) * 100).toFixed(1) : "0.0";
        const eFG = totalFGA > 0 ? (((totalFGM + 0.5 * (t.threePM || 0)) / totalFGA) * 100).toFixed(1) : "0.0";
        const ts = (totalFGA + 0.44 * (t.fta || 0)) > 0
            ? (((t.pts || 0) / (2 * (totalFGA + 0.44 * (t.fta || 0)))) * 100).toFixed(1) : "0.0";

        // ── EFF saison (somme des EFF match par match) ──
        const totalEff = p.logs.reduce((sum, l) => sum + (l.eff || 0), 0);

        // ── PIE saison ──
        const pieNum = (t.pts || 0) + totalFGM + (t.ftm || 0) - totalFGA - (t.fta || 0)
                     + (t.dreb || 0) + 0.5 * (t.oreb || 0) + (t.ast || 0)
                     + (t.stl || 0) + 0.5 * (t.blk || 0) - (t.pf || 0) - (t.tov || 0);
        const pieDenom = GT.PTS + GT.FGM + GT.FTM - GT.FGA - GT.FTA
                       + GT.DRB + 0.5 * GT.ORB + GT.AST + GT.STL
                       + 0.5 * GT.BLK - GT.PF - GT.TOV;
        const pie = pieDenom !== 0 ? ((pieNum / pieDenom) * 100) : 0;

       // ── 2. CALCULS DEAN OLIVER (ADAPTATION FORMATION U18) ──
        const qAST_term1 = (t.minutes / (totalTeamMinutes / 5)) * (1.14 * ((GT.AST - t.ast) / (GT.FGM || 1)));
        const qAST_term2 = ((((GT.AST / totalTeamMinutes) * t.minutes * 5 - t.ast) / ((GT.FGM / totalTeamMinutes) * t.minutes * 5 - totalFGM || 1)) * (1 - (t.minutes / (totalTeamMinutes / 5))));
        const qAST = Math.max(0, qAST_term1 + qAST_term2);
        
        const Team_ORB_Pct = GT.ORB / (GT.ORB + (GT.Opp_TRB - GT.Opp_ORB) || 1);
        const Team_Scoring_Poss = GT.FGM + (1 - Math.pow(1 - (GT.FTM / (GT.FTA || 1)), 2)) * 0.4 * GT.FTA;
        const Team_Play_Pct = Team_Scoring_Poss / (GT.FGA + 0.4 * GT.FTA + GT.TOV || 1);
        const Team_ORB_Weight = ((1 - Team_ORB_Pct) * Team_Play_Pct) / ((1 - Team_ORB_Pct) * Team_Play_Pct + Team_ORB_Pct * (1 - Team_Play_Pct) || 1);
        
        const FG_Part = totalFGM * (1 - 0.5 * (((t.pts || 0) - (t.ftm || 0)) / (2 * totalFGA || 1)) * qAST);
        const AST_Part = 0.5 * (((GT.PTS - GT.FTM) - ((t.pts || 0) - (t.ftm || 0))) / (2 * (GT.FGA - totalFGA) || 1)) * (t.ast || 0);
        const FT_Part = (1 - Math.pow(1 - ((t.ftm || 0) / ((t.fta || 1) || 1)), 2)) * 0.4 * (t.fta || 0);
        const ORB_Part = (t.oreb || 0) * Team_ORB_Weight * Team_Play_Pct;
        
        const ScPoss = (FG_Part + AST_Part + FT_Part) * (1 - (GT.ORB / (Team_Scoring_Poss || 1)) * Team_ORB_Weight * Team_Play_Pct) + ORB_Part;
        const TotPoss = ScPoss + (totalFGA - totalFGM) * (1 - 1.07 * Team_ORB_Pct) + Math.pow(1 - ((t.ftm || 0) / ((t.fta || 1) || 1)), 2) * 0.4 * (t.fta || 0) + (t.tov || 0);
        
        const PProd_FG = 2 * (totalFGM + 0.5 * (t.threePM || 0)) * (1 - 0.5 * (((t.pts || 0) - (t.ftm || 0)) / (2 * totalFGA || 1)) * qAST);
        const PProd_AST = 2 * ((GT.FGM - totalFGM + 0.5 * (GT.ThreePM - (t.threePM || 0))) / (GT.FGM - totalFGM || 1)) * 0.5 * (((GT.PTS - GT.FTM) - ((t.pts || 0) - (t.ftm || 0))) / (2 * (GT.FGA - totalFGA) || 1)) * (t.ast || 0);
        const PProd_ORB = (t.oreb || 0) * Team_ORB_Weight * Team_Play_Pct * (GT.PTS / (Team_Scoring_Poss || 1));
        const PProd = (PProd_FG + PProd_AST + (t.ftm || 0)) * (1 - (GT.ORB / (Team_Scoring_Poss || 1)) * Team_ORB_Weight * Team_Play_Pct) + PProd_ORB;
        
        const ORtg_Raw = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;

        // DRtg avec Stops (Impact individuel renforcé à 0.30 pour la formation)
        const DOR_Pct = GT.Opp_ORB / (GT.Opp_ORB + GT.DRB || 1);
        const DFG_Pct = GT.Opp_FGM / (GT.Opp_FGA || 1);
        const FMwt = (DFG_Pct * (1 - DOR_Pct)) / (DFG_Pct * (1 - DOR_Pct) + (1 - DFG_Pct) * DOR_Pct || 1);
        const Stops1 = (t.stl || 0) + (t.blk || 0) * FMwt * (1 - 1.07 * DOR_Pct) + (t.dreb || 0) * (1 - FMwt);
        const Stops2 = (((GT.Opp_FGA - GT.Opp_FGM - GT.BLK) / totalTeamMinutes) * FMwt * (1 - 1.07 * DOR_Pct) + ((GT.Opp_TOV - GT.STL) / totalTeamMinutes)) * t.minutes + (t.pf / (GT.PF || 1)) * 0.4 * GT.Opp_FTA * Math.pow(1 - (GT.Opp_FTM / (GT.Opp_FTA || 1)), 2);
        
        const Stop_Pct = ((Stops1 + Stops2) * totalTeamMinutes) / (teamPossessions * t.minutes || 1);
        const D_Pts_per_ScPoss = GT.Opp_PTS / (GT.Opp_FGM + (1 - Math.pow(1 - (GT.Opp_FTM / (GT.Opp_FTA || 1)), 2)) * 0.4 * GT.Opp_FTA || 1);
        const Team_DRtg = (GT.Opp_PTS / teamPossessions) * 100;
        
        const DRtg_Raw = Team_DRtg + 0.30 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg);

        // ── 3. PONDÉRATION "FORMATION" (k=1.8 pour lisser le déchet technique) ──
        const weight = t.minutes / (t.minutes + (1.8 * (totalTeamMinutes / activePlayersCount)));
        const ORtg = (GT.PTS / teamPossessions) * 100 + (ORtg_Raw - (GT.PTS / teamPossessions) * 100) * weight;
        const DRtg = Team_DRtg + ((DRtg_Raw || Team_DRtg) - Team_DRtg) * weight;


        // ── Métriques avancées Sprint A ──
        const seasonStats = {
            pts: t.pts || 0, oreb: t.oreb || 0, dreb: t.dreb || 0,
            stl: t.stl || 0, blk: t.blk || 0, ast: t.ast || 0,
            tov: t.tov || 0, pf: t.pf || 0,
            fgm: t.fgm || 0, fga: t.fga || 0,
            threePM: t.threePM || 0, threePA: t.threePA || 0,
            ftm: t.ftm || 0, fta: t.fta || 0,
            minutes: t.minutes || 0,
            chargesTaken: t.chargesTaken || 0,
            deflections: t.deflections || 0
        };
        const teamStatsForAdvanced = {
            pts: GT.PTS, ftm: GT.FTM, fga: GT.FGA, fta: GT.FTA,
            ast: GT.AST, tov: GT.TOV, fgm: GT.FGM,
            minutes: GT.MP, oreb: GT.ORB
        };

        const gameScore = parseFloat(calcGameScore(seasonStats).toFixed(1));
        const hustleIndex = parseFloat(calcHustleIndex(seasonStats).toFixed(1));
        const consistency = calcConsistency(p.logs);
        const epc = parseFloat(calcEPC(seasonStats, teamStatsForAdvanced).toFixed(1));
        const floorGeneral = calcFloorGeneral(seasonStats, teamStatsForAdvanced);
        const dirtyWork = calcDirtyWork(seasonStats);

        return {
            ...p,
            avg: {
                min: ((t.minutes || 0) / gp).toFixed(1),
                pts: ((t.pts || 0) / gp).toFixed(1),
                reb: ((t.reb || 0) / gp).toFixed(1),
                oreb: ((t.oreb || 0) / gp).toFixed(1),
                dreb: ((t.dreb || 0) / gp).toFixed(1),
                ast: ((t.ast || 0) / gp).toFixed(1),
                stl: ((t.stl || 0) / gp).toFixed(1),
                blk: ((t.blk || 0) / gp).toFixed(1),
                tov: ((t.tov || 0) / gp).toFixed(1),
                pf: ((t.pf || 0) / gp).toFixed(1),
                plusMinus: ((t.plusMinus || 0) / gp).toFixed(1),
                eff: (totalEff / gp).toFixed(1),
                fgm: totalFGM,
                fga: totalFGA,
                fgPct,
                threePM: t.threePM || 0,
                threePA: t.threePA || 0,
                threePct,
                ftm: t.ftm || 0,
                fta: t.fta || 0,
                ftPct,
                twoPct, 
                eFG,
                TS: ts,
                ORtg: ORtg.toFixed(1),
                DRtg: DRtg.toFixed(1),
                netRtg: (ORtg - DRtg).toFixed(1),
                PIE: pie.toFixed(1)
            },
            advanced: {
                gameScore,
                hustleIndex,
                consistency: consistency !== null ? parseFloat(consistency.toFixed(2)) : null,
                epc,
                floorGeneral,
                dirtyWork
            }
        };
    })
    .sort((a, b) => parseFloat(b.avg.pts) - parseFloat(a.avg.pts));
    }, [filteredGames, players]);

    return (
        <div className="space-y-4 h-full flex flex-col pb-20 md:pb-0">
            <Card className="p-2 md:p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                        <select 
                            value={filterPhase} 
                            onChange={(e) => setFilterPhase(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-slate-200 text-sm rounded p-2"
                        >
                            <option value="all">Toute la saison</option>
                            {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button 
                            onClick={() => setViewMode(viewMode === 'classic' ? 'advanced' : 'classic')}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs uppercase text-slate-300 border border-slate-700 transition-colors"
                        >
                            {viewMode === 'classic' ? 'Vue Avancée' : 'Vue Classique'}
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => setShowVolumeMatrix(true)}><Icon path={Icons.Chart} /> Volume/Eff.</Button>

                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setShowTeamTrends(true)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded shadow-lg text-sm flex items-center gap-2 transition-all"
                        >
                            <Icon path={Icons.TrendingUp} /> Analyse & Tendances
                        </button>
                    </div>
                </div>
                
                {/* TABLEAU PRINCIPAL AVEC EN-TÊTES GROUPÉS */}
                <div className="overflow-auto flex-1 relative custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap border-collapse">
                        <thead className="bg-slate-900 text-white uppercase text-xs sticky top-0 z-20">
                            {/* Ligne de groupe */}
                            <tr className="bg-slate-950 border-b border-slate-700">
                                <th className="p-1 sticky left-0 bg-slate-950 z-30 min-w-[120px]"></th>
                                <th colSpan="2" className="p-1 text-center border-r border-slate-700 text-slate-500">Général</th>
                                {viewMode === 'classic' ? (
                                    <>
                                        <th colSpan="3" className="p-1 text-center border-r border-slate-700 text-orange-400 bg-orange-900/10">Scoring</th>
                                        <th colSpan="4" className="p-1 text-center border-r border-slate-700 text-blue-400 bg-blue-900/10">Pourcentages</th>
                                        <th colSpan="3" className="p-1 text-center border-r border-slate-700 text-purple-400 bg-purple-900/10">Rebonds</th>
                                        <th colSpan="4" className="p-1 text-center border-r border-slate-700 text-yellow-400 bg-yellow-900/10">Activité</th>
                                        <th colSpan="2" className="p-1 text-center text-green-400 bg-green-900/10">Impact</th>
                                    </>
                                ) : (
                                    <th colSpan="8" className="p-1 text-center text-indigo-400">Métriques Avancées</th>
                                )}
                            </tr>
                            <tr className="bg-slate-900 shadow-md">
                                <th className="p-3 sticky left-0 bg-slate-900 z-30 border-r border-slate-700 font-bold">Joueur</th>
                                <th className="p-3 text-center w-12 text-slate-400">MJ</th>
                                <th className="p-3 text-center w-12 border-r border-slate-700 text-slate-400">MIN</th>
                                {viewMode === 'classic' ? (
                                    <>
                                        <th className="p-3 text-center text-orange-400 font-bold bg-slate-800/50">PTS</th>
                                        <th className="p-3 text-center text-slate-400">TIR</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-slate-400">LF</th>
                                        
                                        <th className="p-3 text-center">FG%</th>
                                        <th className="p-3 text-center text-xs text-slate-500">2P%</th>
                                        <th className="p-3 text-center">3P%</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-slate-500">LF%</th>
                                        
                                        <th className="p-3 text-center font-bold">REB</th>
                                        <th className="p-3 text-center text-[10px] text-slate-500">RO</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-[10px] text-slate-500">RD</th>
                                        
                                        <th className="p-3 text-center">PD</th>
                                        <th className="p-3 text-center">INT</th>
                                        <th className="p-3 text-center">CTR</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-red-400">BP</th>
                                        
                                        <th className="p-3 text-center">+/-</th>
                                        <th className="p-3 text-center font-black text-green-400">EVAL</th>
                                    </>
                                ) : (
                                    <>
                                        {/* Placeholders pour le mode avancé si non implémenté complètement */}
                                        <th className="p-3 text-center">TS%</th>
                                        <th className="p-3 text-center">eFG%</th>
                                        <th className="p-3 text-center">USG%</th>
                                        <th className="p-3 text-center">ORtg</th>
                                        <th className="p-3 text-center">DRtg</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {aggregated.map(p => (
                                <tr key={p.info.id} onClick={() => setSelectedPlayer(p)} className="hover:bg-slate-800 cursor-pointer transition-colors odd:bg-slate-900 even:bg-slate-800/40">
                                    <td className="p-3 font-medium text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">{p.info.number}</div>
                                            {p.info.name}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-slate-400">{p.gamesPlayed}</td>
                                    <td className="p-3 text-center border-r border-slate-800 text-slate-500">{p.avg.min}</td>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <td className="p-3 text-center font-bold text-orange-400 bg-orange-500/5">{p.avg.pts}</td>
                                           <td className="p-3 text-center text-xs text-slate-400">{p.stats.fgm+p.stats.threePM}-{p.stats.fga+p.stats.threePA}</td>
                                            <td className="p-3 text-center text-xs border-r border-slate-800 text-slate-500">{p.stats.ftm}-{p.stats.fta}</td>
                                            
                                            <td className={`p-3 text-center font-medium ${parseFloat(p.avg.fgPct)>=45?'text-green-400':parseFloat(p.avg.fgPct)<35?'text-red-400':'text-yellow-500'}`}>{p.avg.fgPct}%</td>
                                            <td className="p-3 text-center text-xs text-slate-600">{p.avg.twoPct}%</td>
                                            <td className={`p-3 text-center ${parseFloat(p.avg.threePct)>=33?'text-blue-400':'text-slate-500'}`}>{p.avg.threePct}%</td>
                                            <td className="p-3 text-center border-r border-slate-800 text-xs text-slate-500">{p.avg.ftPct}%</td>
                                            
                                            <td className="p-3 text-center font-bold text-white">{p.avg.reb}</td>
                                            <td className="p-3 text-center text-xs text-slate-600">{p.avg.oreb}</td>
                                            <td className="p-3 text-center text-xs text-slate-600 border-r border-slate-800">{p.avg.dreb}</td>
                                            
                                            <td className="p-3 text-center">{p.avg.ast}</td>
                                            <td className="p-3 text-center">{p.avg.stl}</td>
                                            <td className="p-3 text-center">{p.avg.blk}</td>
                                            <td className="p-3 text-center border-r border-slate-800 text-red-400">{p.avg.tov}</td>
                                            
                                            <td className={`p-3 text-center font-bold ${parseFloat(p.avg.plusMinus)>=0?'text-green-500':'text-red-500'}`}>{p.avg.plusMinus > 0 ? '+' : ''}{p.avg.plusMinus}</td>
                                            <td className="p-3 text-center font-black text-green-400 text-lg">{p.avg.eff}</td>
                                        </>
                                    ) : (
                                        <td colSpan="8" className="p-3 text-center text-slate-600 text-xs italic">Données avancées en développement</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* MODAL ANALYSE EQUIPE */}
            <Modal isOpen={showTeamTrends} onClose={() => setShowTeamTrends(false)} title={<><Icon path={Icons.TrendingUp} /> Analyse Saison & Facteurs Clés</>} size="max-w-6xl">
                <div className="space-y-6">
                    {/* EN-TÊTE BILAN */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-green-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Bilan Global</div>
                            <div className="text-3xl font-black text-white flex items-baseline gap-2">
                                {teamTrendsData.wins}V - {teamTrendsData.losses}D
                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${((teamTrendsData.wins/(teamTrendsData.wins+teamTrendsData.losses))*100) >= 50 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                    {((teamTrendsData.wins / (teamTrendsData.data.length||1))*100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Série actuelle: <span className="text-white font-bold">{teamTrendsData.streak}</span></div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-orange-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Moyenne Points</div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-3xl font-black text-white">{teamTrendsData.avgs.pts}</div>
                                    <div className="text-[10px] text-slate-400">Marqués</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-red-400">{teamTrendsData.avgs.conceded}</div>
                                    <div className="text-[10px] text-slate-400">Encaissés</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-blue-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Adresses (FG / 3PT / LF)</div>
                            <div className="grid grid-cols-3 gap-2 text-center h-full items-center">
                                <div><div className="text-xl font-bold text-white">{teamTrendsData.avgs.fgPct}%</div><div className="text-[10px] text-slate-500">Global</div></div>
                                <div className="border-x border-slate-700"><div className="text-xl font-bold text-blue-400">{teamTrendsData.avgs.threePct}%</div><div className="text-[10px] text-slate-500">3 Pts</div></div>
                                <div><div className="text-xl font-bold text-slate-300">{teamTrendsData.avgs.ftPct}%</div><div className="text-[10px] text-slate-500">Lancers</div></div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-purple-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Moyennes / Match</div>
                            <div className="grid grid-cols-4 gap-1 text-center text-sm h-full items-center">
                                <div><div className="font-bold text-white">{teamTrendsData.avgs.reb}</div><div className="text-[9px] text-slate-500">REB</div></div>
                                <div><div className="font-bold text-white">{teamTrendsData.avgs.ast}</div><div className="text-[9px] text-slate-500">PD</div></div>
                                <div><div className="font-bold text-white">{teamTrendsData.avgs.stl}</div><div className="text-[9px] text-slate-500">INT</div></div>
                                <div><div className="font-bold text-red-400">{teamTrendsData.avgs.tov}</div><div className="text-[9px] text-slate-500">BP</div></div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION ANALYSE DES DÉFAITES */}
                    {teamTrendsData.losses > 0 && teamTrendsData.analysis.length > 0 && (
                        <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl animate-fade-in">
                            <h3 className="text-red-400 font-bold uppercase text-sm mb-4 flex items-center gap-2">
                                <Icon path={Icons.TrendingUp} className="rotate-180 w-5 h-5" /> 
                                Analyse : Pourquoi perdons-nous ? (Différentiel Victoires vs Défaites)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {teamTrendsData.analysis.map((item, idx) => (
                                    <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex flex-col justify-between shadow-sm hover:border-red-800 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-slate-200 font-bold">{item.label}</div>
                                            <div className="bg-red-900/40 text-red-300 text-xs px-2 py-0.5 rounded uppercase font-bold">-{item.impact.toFixed(1)} {item.unit}</div>
                                        </div>
                                        
                                        <div className="space-y-2 mt-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Moy. en Victoire</span>
                                                <span className="text-green-400 font-mono">
                                                    {item.unit === '%' ? teamTrendsData.winAvgs[item.label.includes('3') ? 'threePct' : 'fgPct'] : 
                                                     item.label.includes('Défense') ? teamTrendsData.winAvgs.conceded :
                                                     item.label.includes('Attaque') ? teamTrendsData.winAvgs.pts :
                                                     item.label.includes('Pertes') ? teamTrendsData.winAvgs.tov :
                                                     item.label.includes('Rebonds') ? teamTrendsData.winAvgs.reb : teamTrendsData.winAvgs.ast}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Moy. en Défaite</span>
                                                <span className="text-red-400 font-mono">
                                                    {item.unit === '%' ? teamTrendsData.lossAvgs[item.label.includes('3') ? 'threePct' : 'fgPct'] : 
                                                     item.label.includes('Défense') ? teamTrendsData.lossAvgs.conceded :
                                                     item.label.includes('Attaque') ? teamTrendsData.lossAvgs.pts :
                                                     item.label.includes('Pertes') ? teamTrendsData.lossAvgs.tov :
                                                     item.label.includes('Rebonds') ? teamTrendsData.lossAvgs.reb : teamTrendsData.lossAvgs.ast}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="text-[10px] text-slate-500 mt-3 italic border-t border-slate-800 pt-2">
                                            {item.type === 'negative_more_is_bad' 
                                                ? "En défaite, nous concédons/perdons beaucoup plus de ballons/points." 
                                                : "En défaite, notre production s'effondre significativement."}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GRAPHIQUE NET RATING */}
                    <div className="h-64 bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-lg">
                         <h4 className="text-xs text-slate-400 uppercase mb-4 font-bold tracking-wider">Régularité (Net Rating par match)</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <ComposedChart data={teamTrendsData.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={60} tick={{fill: '#94a3b8'}} />
                                <YAxis stroke="#94a3b8" fontSize={10} tick={{fill: '#94a3b8'}} />
                                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                                <Tooltip 
                                    contentStyle={{backgroundColor:'#1e293b', border:'1px solid #475569', borderRadius:'8px', color: '#f8fafc'}} 
                                    itemStyle={{color: '#f8fafc'}}
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                />
                                <Bar dataKey="NetRtg" name="Différentiel Pts" radius={[4, 4, 0, 0]}>
                                    {teamTrendsData.data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.NetRtg >= 0 ? '#22c55e' : '#ef4444'} />))}
                                </Bar>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Modal>
            
            {/* Modal Joueur existante */}
           

{selectedPlayer && (
    <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={<><Icon path={Icons.Trophy} className="text-yellow-400" /> {selectedPlayer?.info.name}</>} size="max-w-5xl">
        <div className="space-y-6">

            {/* EN-TÊTE — 5 STATS CLÉS */}
            <div className="grid grid-cols-5 gap-2 bg-slate-900 p-4 rounded-lg">
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Points</div>
                    <div className="text-2xl font-black text-white">{selectedPlayer.avg.pts}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Rebonds</div>
                    <div className="text-2xl font-black text-white">{selectedPlayer.avg.reb}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Passes</div>
                    <div className="text-2xl font-black text-white">{selectedPlayer.avg.ast}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Éval</div>
                    <div className="text-2xl font-black text-green-400">{selectedPlayer.avg.eff}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">+/-</div>
                    <div className={`text-2xl font-black ${parseFloat(selectedPlayer.avg.plusMinus) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(selectedPlayer.avg.plusMinus) > 0 ? '+' : ''}{selectedPlayer.avg.plusMinus}
                    </div>
                </div>
            </div>

            {/* MÉTRIQUES AVANCÉES — ORtg / DRtg / NetRtg / MIN */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase">ORtg</div>
                    <div className="text-lg font-bold text-purple-400">{selectedPlayer.avg.ORtg}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase">DRtg</div>
                    <div className="text-lg font-bold text-red-400">{selectedPlayer.avg.DRtg}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase">NetRtg</div>
                    <div className={`text-lg font-bold ${parseFloat(selectedPlayer.avg.netRtg) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(selectedPlayer.avg.netRtg) > 0 ? '+' : ''}{selectedPlayer.avg.netRtg}
                    </div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase">Min/Match</div>
                    <div className="text-lg font-bold text-white">{selectedPlayer.avg.min}</div>
                </div>
            </div>

            {/* SHOOTING SPLITS */}
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <h4 className="text-xs text-slate-400 uppercase mb-3 font-bold tracking-wider">Adresses</h4>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: '2 Points', pct: selectedPlayer.avg.twoPct, made: selectedPlayer.stats.fgm, att: selectedPlayer.stats.fga, color: 'orange' },
                        { label: '3 Points', pct: selectedPlayer.avg.threePct, made: selectedPlayer.stats.threePM, att: selectedPlayer.stats.threePA, color: 'blue' },
                        { label: 'Lancers F.', pct: selectedPlayer.avg.ftPct, made: selectedPlayer.stats.ftm, att: selectedPlayer.stats.fta, color: 'green' }
                    ].map(sh => (
                        <div key={sh.label} className="text-center">
                            <div className="text-xs text-slate-500 mb-1">{sh.label}</div>
                            <div className={`text-2xl font-black text-${sh.color}-400`}>{sh.pct}%</div>
                            <div className="text-[10px] text-slate-500">{sh.made}/{sh.att}</div>
                            <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                                <div className={`h-full rounded-full bg-${sh.color}-500 transition-all`}
                                     style={{ width: `${Math.min(parseFloat(sh.pct) || 0, 100)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ACTIVITÉ — INT / CTR / BP / FTE */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-800 p-2 rounded text-center">
                    <div className="text-[10px] text-slate-500">INT</div>
                    <div className="text-lg font-bold text-yellow-400">{selectedPlayer.avg.stl}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded text-center">
                    <div className="text-[10px] text-slate-500">CTR</div>
                    <div className="text-lg font-bold text-orange-400">{selectedPlayer.avg.blk}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded text-center">
                    <div className="text-[10px] text-slate-500">BP</div>
                    <div className="text-lg font-bold text-red-400">{selectedPlayer.avg.tov}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded text-center">
                    <div className="text-[10px] text-slate-500">FTE</div>
                    <div className="text-lg font-bold text-red-300">{selectedPlayer.avg.pf}</div>
                </div>
            </div>

            {/* GRAPHIQUES */}
            {(selectedPlayer.logs || []).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold">Scoring & Éval par match</h4>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedPlayer.logs}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} hide />
                                <YAxis stroke="#94a3b8" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="pts" name="Points" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="eff" name="Éval" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                                <Legend />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold">ORtg / DRtg par match</h4>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedPlayer.logs}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} hide />
                                <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="ORtg" name="ORtg" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="DRtg" name="DRtg" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                <Legend />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold">ORtg / DRtg par match</h4>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <GhostSeasonChart logs={selectedPlayer.logs} currentGame={null} />
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold">ORtg / DRtg par match</h4>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ArchetypeRadar player={selectedPlayer} allPlayers={aggregated} />
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            )}

            {/* GAME LOGS */}
            {(selectedPlayer.logs || []).length > 0 && (
            <div>
                <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold tracking-wider">
                    Match par match ({selectedPlayer.gamesPlayed} matchs)
                </h4>
                <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700 max-h-64">
                    <table className="w-full text-xs text-slate-300 whitespace-nowrap">
                        <thead className="bg-slate-800 text-white uppercase text-[10px] sticky top-0 z-10">
                            <tr>
                                <th className="p-2 text-left sticky left-0 bg-slate-800 z-20">Adversaire</th>
                                <th className="p-2 text-center">Score</th>
                                <th className="p-2 text-center">MIN</th>
                                <th className="p-2 text-center text-orange-400">PTS</th>
                                <th className="p-2 text-center">REB</th>
                                <th className="p-2 text-center">PD</th>
                                <th className="p-2 text-center">INT</th>
                                <th className="p-2 text-center text-red-400">BP</th>
                                <th className="p-2 text-center">+/-</th>
                                <th className="p-2 text-center text-purple-400">ORtg</th>
                                <th className="p-2 text-center text-red-400">DRtg</th>
                                <th className="p-2 text-center text-green-400">EVAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {(selectedPlayer.logs || []).map((log, i) => (
                                <tr key={i} className={`transition-colors ${log.isWin ? 'bg-green-900/5 hover:bg-green-900/15' : 'bg-red-900/5 hover:bg-red-900/15'}`}>
                                    <td className="p-2 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${log.isWin ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {log.opponent}
                                    </td>
                                    <td className="p-2 text-center">
                                        <span className="text-green-400">{log.score}</span>
                                        <span className="text-slate-600"> - </span>
                                        <span className="text-red-400">{log.conceded}</span>
                                    </td>
                                    <td className="p-2 text-center text-slate-500">{log.min}</td>
                                    <td className="p-2 text-center font-bold text-orange-400">{log.pts}</td>
                                    <td className="p-2 text-center">{log.reb}</td>
                                    <td className="p-2 text-center">{log.ast}</td>
                                    <td className="p-2 text-center">{log.stl}</td>
                                    <td className="p-2 text-center text-red-400">{log.tov}</td>
                                    <td className={`p-2 text-center font-bold ${log.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {log.plusMinus > 0 ? '+' : ''}{log.plusMinus}
                                    </td>
                                    <td className="p-2 text-center text-purple-400">{log.ORtg}</td>
                                    <td className="p-2 text-center text-red-400">{log.DRtg}</td>
                                    <td className="p-2 text-center font-bold text-green-400">{log.eff}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
    </Modal>
)}
<Modal isOpen={showVolumeMatrix} onClose={() => setShowVolumeMatrix(false)} title={<><Icon path={Icons.Chart} /> Matrice Volume / Efficacité</>} size="max-w-3xl">
                <VolumeEfficiencyMatrix players={aggregated} />
            </Modal>
        </div>
    );
}

// --- IMPORT REVIEW MODAL ---
function ImportReviewModal({ importData, currentPlayers, phases, onConfirm, onCancel }) {
    const [mapping, setMapping] = useState({});
    const [selectedPhase, setSelectedPhase] = useState(phases[0]?.id || 'phase1');

    useEffect(() => {
        const initialMap = {};
        importData.rawPlayers.forEach((imp, idx) => {
            const match = currentPlayers.find(p => p.number === imp.number);
            initialMap[idx] = match ? match.id : "NEW";
        });
        setMapping(initialMap);
    }, [importData, currentPlayers]);

    const handleFinalize = () => {
        const finalGameStats = {};
        const newPlayersList = [...currentPlayers];
        let maxId = currentPlayers.length > 0 ? Math.max(...currentPlayers.map(p => p.id)) : 0;
        importData.rawPlayers.forEach((imp, idx) => {
            const choice = mapping[idx];
            let pid;
            if (choice === "NEW") { maxId++; pid = maxId; newPlayersList.push({ id: pid, name: imp.name, number: imp.number, pos: "G" }); }
            else if (choice === "SKIP") return;
            else pid = parseInt(choice);
            finalGameStats[pid] = imp.stats;
        });
        onConfirm({ id: generateId(), ...importData.meta, phase: selectedPhase, playerStats: finalGameStats, opponentStats: importData.opponentStats, actions: [] }, newPlayersList);
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h4 className="text-orange-500 font-bold mb-2">Match: {importData.meta.opponent}</h4>
                <div className="text-white text-sm mb-4">Score: {importData.meta.homeScore} - {importData.meta.awayScore}</div>
                <div className="bg-slate-800 p-3 rounded border border-orange-500/50">
                    <label className="block text-sm font-semibold text-orange-400 mb-2"><Icon path={Icons.Layers} className="inline mr-2" />Phase</label>
                    <div className="flex flex-wrap gap-2">
                        {phases.map(ph => (
                            <label key={ph.id} className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${selectedPhase === ph.id ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                <input type="radio" name="phase" value={ph.id} checked={selectedPhase === ph.id} onChange={(e) => setSelectedPhase(e.target.value)} className="hidden" />
                                {ph.name}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <div className="overflow-y-auto max-h-[40vh] space-y-2">
                {importData.rawPlayers.map((imp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                        <div className="w-1/3"><div className="text-white font-bold text-sm">#{imp.number} {imp.name}</div><div className="text-xs text-slate-400">{imp.stats.pts} pts</div></div>
                        <div className="flex-1">
                            <select className="w-full bg-slate-900 text-white text-sm p-2 rounded border border-slate-600" value={mapping[idx] || "NEW"} onChange={(e) => setMapping({ ...mapping, [idx]: e.target.value })}>
                                <option value="NEW">+ Creer</option><option value="SKIP">Ignorer</option>
                                {currentPlayers.map(p => <option key={p.id} value={p.id}>#{p.number} - {p.name}</option>)}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-700"><Button variant="ghost" onClick={onCancel}>Annuler</Button><Button variant="success" onClick={handleFinalize}>Confirmer</Button></div>
        </div>
    );
}

// --- MODALE DETAILS MATCH ---
function GameDetailsModal({ game, isOpen, onClose, players }) {
    if (!game) return null;
    const [viewMode, setViewMode] = useState('classic');

    const statsData = React.useMemo(() => {
        const pStats = game.playerStats || {};
        const opp = game.opponentStats || {};
        let T_FGM=0, T_FGA=0, T_3PM=0, T_FTM=0, T_FTA=0, T_ORB=0, T_DRB=0, T_AST=0, T_STL=0, T_BLK=0, T_TOV=0, T_PF=0, T_PTS=0, T_MP=0;
        Object.values(pStats).forEach(s => {
            T_FGM += (s.fgm||0)+(s.threePM||0); T_FGA += (s.fga||0)+(s.threePA||0); T_3PM += (s.threePM||0);
            T_FTM += (s.ftm||0); T_FTA += (s.fta||0); T_ORB += (s.oreb||0); T_DRB += (s.dreb||0);
            T_AST += (s.ast||0); T_STL += (s.stl||0); T_BLK += (s.blk||0); T_TOV += (s.tov||0);
            T_PF += (s.pf||0); T_PTS += (s.pts||0); T_MP += (s.minutes||0);
        });
        const O_PTS = game.awayScore||0;
        const O_FGM = opp.fgm||0; const O_FGA = opp.fga||(O_FGM+T_DRB);
        const O_FTM = opp.ftm||0; const O_FTA = opp.fta||0;
        const O_ORB = opp.oreb||0; const O_TRB = (opp.reb||(O_ORB+T_DRB));
        const O_TOV = opp.tov||0; const O_MP = T_MP;
        const Team_Poss = T_FGA + 0.44*T_FTA - T_ORB + T_TOV;
        const Team_ORtg = Team_Poss > 0 ? (T_PTS/Team_Poss)*100 : 0;
        const Team_DRtg = Team_Poss > 0 ? (O_PTS/Team_Poss)*100 : 0;

        const rawPlayers = Object.entries(pStats).map(([pid, s]) => {
            const hasActivity = (s.pts||0) > 0 || (s.fgm||0) > 0 || (s.fga||0) > 0 || (s.threePA||0) > 0 || (s.fta||0) > 0 || (s.oreb||0) > 0 || (s.dreb||0) > 0 || (s.ast||0) > 0 || (s.stl||0) > 0 || (s.blk||0) > 0 || (s.tov||0) > 0 || (s.pf||0) > 0 || (s.minutes||0) > 0;
            if (!hasActivity) return null;
            const MP = s.minutes||0;
            const FGM = (s.fgm||0)+(s.threePM||0); const FGA = (s.fga||0)+(s.threePA||0);
            const eFG = FGA > 0 ? ((FGM + 0.5*(s.threePM||0))/FGA)*100 : 0;
            const TS = (FGA + 0.44*(s.fta||0)) > 0 ? ((s.pts||0)/(2*(FGA + 0.44*(s.fta||0))))*100 : 0;
            const gamePIEDenom = (T_PTS + O_PTS) + (T_FGM + O_FGM) + (T_FTM + O_FTM) - (T_FGA + O_FGA) - (T_FTA + O_FTA) + (T_DRB + (O_TRB-O_ORB)) + (0.5 * (T_ORB + O_ORB)) + (T_AST + (opp.ast||0)) + (T_STL) + (0.5 * T_BLK) - (T_PF + (opp.fouls||0)) - (T_TOV + O_TOV);
            const playerPIENum = (s.pts||0) + FGM + (s.ftm||0) - FGA - (s.fta||0) + (s.dreb||0) + (0.5*(s.oreb||0)) + (s.ast||0) + (s.stl||0) + (0.5*(s.blk||0)) - (s.pf||0) - (s.tov||0);
            const pie = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;
            const evalStat = ((s.pts||0)+(s.oreb||0)+(s.dreb||0)+(s.ast||0)+(s.stl||0)+(s.blk||0)) - ((FGA-FGM)+((s.fta||0)-(s.ftm||0))+(s.tov||0));
            const player = players.find(p => p.id === parseInt(pid));
            return {
                id: pid, name: player ? player.name : `#${pid}`, minutes: MP,
                pts: s.pts||0, ast: s.ast||0, reb: (s.oreb||0)+(s.dreb||0), stl: s.stl||0, blk: s.blk||0, tov: s.tov||0, pf: s.pf||0,
                fgm: FGM, fga: FGA, twoPM: s.fgm||0, twoPA: s.fga||0, threePM: s.threePM||0, threePA: s.threePA||0,
                ftm: s.ftm||0, fta: s.fta||0, oreb: s.oreb||0, dreb: s.dreb||0,
                plusMinus: s.plusMinus||0, eFG: eFG.toFixed(1), TS: TS.toFixed(1), PIE: pie.toFixed(1), eff: evalStat
            };
        }).filter(p => p !== null);
        return { team: { poss: Team_Poss.toFixed(1), ORtg: Team_ORtg.toFixed(1), DRtg: Team_DRtg.toFixed(1), Net: (Team_ORtg-Team_DRtg).toFixed(1) }, players: rawPlayers };
    }, [game, players]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vs ${game.opponent}`} size="max-w-6xl">
            <div className="space-y-4 md:space-y-6">
                {game.scoreHistory && game.scoreHistory.length > 1 && (
                    <Card className="p-4">
                        <MomentumChart scoreHistory={game.scoreHistory} actions={game.actions || []} />
                    </Card>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="lg:col-span-2 bg-slate-900 p-3 rounded-lg flex justify-between items-center border border-slate-700 relative overflow-hidden shadow-inner">
                        <div className="text-center z-10 w-1/3"><div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">Nous</div><div className="text-3xl md:text-5xl font-black text-green-400 leading-none mt-1">{game.homeScore}</div></div>
                        <div className="flex flex-col items-center z-10 px-2 text-center w-1/3 border-x border-slate-800"><div className="text-[10px] md:text-xs text-slate-500">{game.date}</div><div className="text-sm md:text-lg font-bold text-white uppercase tracking-wider leading-tight mt-1">{game.opponent}</div></div>
                        <div className="text-center z-10 w-1/3"><div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">Eux</div><div className="text-3xl md:text-5xl font-black text-red-400 leading-none mt-1">{game.awayScore}</div></div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-transparent to-red-500 opacity-50"></div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/50 flex flex-col justify-center">
                        <div className="text-[10px] text-slate-400 uppercase mb-2 text-center border-b border-slate-700 pb-1 font-semibold">Efficacite Collective</div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div className="flex justify-between items-end"><span className="text-slate-400 text-xs">Poss:</span> <span className="text-white font-mono font-bold">{statsData.team.poss}</span></div>
                            <div className="flex justify-between items-end"><span className="text-slate-400 text-xs">NetRtg:</span> <span className={`${parseFloat(statsData.team.Net)>=0?'text-green-400':'text-red-400'} font-mono font-bold text-xs`}>{statsData.team.Net}</span></div>
                            <div className="flex justify-between items-end"><span className="text-purple-300 text-xs">ORtg:</span> <span className="text-white font-mono">{statsData.team.ORtg}</span></div>
                            <div className="flex justify-between items-end"><span className="text-red-300 text-xs">DRtg:</span> <span className="text-white font-mono">{statsData.team.DRtg}</span></div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                        <h4 className="text-orange-400 font-bold text-sm uppercase flex items-center gap-2"><Icon path={Icons.Users} className="w-4 h-4"/> <span>Joueurs ({statsData.players.length})</span></h4>
                        <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 w-full sm:w-auto">
                            <button onClick={() => setViewMode('classic')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode==='classic'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Classique</button>
                            <button onClick={() => setViewMode('advanced')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode==='advanced'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Avance</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
                        <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-800 text-white uppercase font-semibold text-[10px] md:text-xs">
                                <tr>
                                    <th className="p-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Joueur</th>
                                    <th className="p-3 text-center">MIN</th>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <th className="p-3 text-center text-orange-400 font-bold">PTS</th>
                                            <th className="p-3 text-center">2PT</th><th className="p-3 text-center">3PT</th><th className="p-3 text-center">LF</th>
                                            <th className="p-3 text-center font-bold text-white">REB</th>
                                            <th className="p-3 text-center text-[10px]">RO</th><th className="p-3 text-center text-[10px]">RD</th>
                                            <th className="p-3 text-center">PD</th><th className="p-3 text-center">INT</th><th className="p-3 text-center">CTR</th>
                                            <th className="p-3 text-center text-red-400">BP</th><th className="p-3 text-center text-red-400">FTE</th>
                                            <th className="p-3 text-center font-bold">+/-</th>
                                            <th className="p-3 text-center text-green-400 font-bold">EVAL</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-3 text-center text-orange-400 font-bold">PTS</th>
                                            <th className="p-3 text-center text-blue-300">eFG%</th>
                                            <th className="p-3 text-center text-purple-300">TS%</th>
                                            <th className="p-3 text-center text-cyan-400 font-bold">PIE</th>
                                            <th className="p-3 text-center">PD</th>
                                            <th className="p-3 text-center text-red-400">BP</th>
                                            <th className="p-3 text-center text-yellow-400 font-bold border-l border-slate-700">+/-</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {statsData.players.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] truncate max-w-[100px] md:max-w-none">{p.name}</td>
                                        <td className="p-3 text-center text-slate-500 font-mono">{p.minutes}</td>
                                        {viewMode === 'classic' ? (
                                            <>
                                                <td className="p-3 text-center font-bold text-orange-400">{p.pts}</td>
                                                <td className="p-3 text-center">{p.twoPM}-{p.twoPA}</td>
                                                <td className="p-3 text-center">{p.threePM}-{p.threePA}</td>
                                                <td className="p-3 text-center">{p.ftm}-{p.fta}</td>
                                                <td className="p-3 text-center font-bold text-white">{p.reb}</td>
                                                <td className="p-3 text-center text-[10px] text-slate-500">{p.oreb}</td>
                                                <td className="p-3 text-center text-[10px] text-slate-500">{p.dreb}</td>
                                                <td className="p-3 text-center">{p.ast}</td>
                                                <td className="p-3 text-center">{p.stl}</td>
                                                <td className="p-3 text-center">{p.blk}</td>
                                                <td className="p-3 text-center text-red-400">{p.tov}</td>
                                                <td className="p-3 text-center text-red-400">{p.pf}</td>
                                                <td className={`p-3 text-center font-bold ${p.plusMinus>=0?'text-green-400':'text-red-400'}`}>{p.plusMinus>0?'+':''}{p.plusMinus}</td>
                                                <td className="p-3 text-center font-bold text-green-400">{p.eff}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-3 text-center font-bold text-orange-400">{p.pts}</td>
                                                <td className="p-3 text-center text-blue-300 font-mono">{p.eFG}%</td>
                                                <td className="p-3 text-center text-purple-300 font-mono">{p.TS}%</td>
                                                <td className="p-3 text-center text-cyan-400 font-mono font-bold">{p.PIE}%</td>
                                                <td className="p-3 text-center">{p.ast}</td>
                                                <td className="p-3 text-center text-red-400">{p.tov}</td>
                                                <td className={`p-3 text-center font-bold font-mono border-l border-slate-700 ${parseFloat(p.plusMinus)>=0?'text-green-400':'text-red-400'}`}>{parseFloat(p.plusMinus)>0?'+':''}{p.plusMinus}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Play-by-Play */}
                {game.actions && game.actions.length > 0 ? (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm text-orange-400 uppercase font-bold flex items-center gap-2"><span>&#128269;</span> Play-by-Play</h4>
                            <span className="text-xs text-slate-500">{game.actions.length} actions</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto bg-slate-900 rounded-lg border border-slate-700">
                            {game.actions.slice().reverse().map((a, i) => {
                                const isHome = a.pid < 1000;
                                const timeMin = Math.floor((a.time || 0) / 60);
                                const timeSec = (a.time || 0) % 60;
                                const timeStr = `Q${a.q || 1} ${timeMin}:${timeSec.toString().padStart(2, '0')}`;
                                let playerNum = '?', playerName = '';
                                if (isHome) { const player = players.find(p => p.id === a.pid); if (player) { playerNum = player.number; playerName = player.name; } }
                                else { if (game.opponentPlayerStats && game.opponentPlayerStats[a.pid]) { const op = game.opponentPlayerStats[a.pid]; playerNum = op.number || (a.pid - 1000); playerName = op.name || `Adv ${playerNum}`; } else { playerNum = a.pid - 1000; playerName = 'Adversaire'; } }
                                let icon = '', desc = a.type, color = 'text-slate-300';
                                if (a.type === 'SHOT') { icon = a.made ? '+' : 'x'; desc = `Tir ${a.val}pts ${a.made ? 'reussi' : 'rate'}`; if (a.astId) { const passer = players.find(p => p.id === a.astId); desc += passer ? ` (passe #${passer.number} ${passer.name})` : ` (passe #${a.astId})`; } color = a.made ? 'text-green-400' : 'text-red-400'; }
                                else if (a.type === 'OREB') { desc = 'Rebond offensif'; color = 'text-purple-400'; }
                                else if (a.type === 'DREB') { desc = 'Rebond defensif'; color = 'text-blue-400'; }
                                else if (a.type === 'STL') { desc = 'Interception'; color = 'text-yellow-400'; }
                                else if (a.type === 'BLK') { desc = 'Contre'; color = 'text-orange-400'; }
                                else if (a.type === 'TOV') { desc = 'Perte de balle'; color = 'text-red-400'; }
                                else if (a.type === 'FOUL') { let victimInfo = ''; if (a.victim) { if (a.victim < 1000) { const victim = players.find(p => p.id === a.victim); if (victim) victimInfo = `sur #${victim.number} ${victim.name}`; } else { victimInfo = `sur #${a.victim - 1000}`; } } desc = `Faute ${victimInfo}`; color = 'text-red-400'; }
                                else if (a.type === 'FT') { desc = `Lancers francs: ${a.ftMade||0}/${a.ftAtt||0}`; color = (a.ftMade||0) > 0 ? 'text-green-400' : 'text-slate-400'; }
                                else if (a.type === 'SUB') { let inPlayerInfo = ''; if (a.inId < 1000) { const inP = players.find(p => p.id === a.inId); if (inP) inPlayerInfo = `#${inP.number} ${inP.name}`; } else { inPlayerInfo = `#${a.inId - 1000}`; } desc = `Sort -> ${inPlayerInfo} entre`; color = 'text-cyan-400'; }
                                return (
                                    <div key={i} className={`flex items-center gap-3 px-3 py-2 border-b border-slate-800 text-xs hover:bg-slate-800/50 ${isHome ? 'border-l-2 border-l-blue-500' : 'border-l-2 border-l-red-500'}`}>
                                        <span className="text-slate-500 font-mono w-16 shrink-0 text-[10px]">{timeStr}</span>
                                        <span className={`font-bold shrink-0 ${isHome ? 'text-blue-400' : 'text-red-400'}`}>#{playerNum} <span className="font-normal text-slate-300">{playerName}</span></span>
                                        <span className={`flex-1 ${color} text-right`}>{desc}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 text-center text-slate-500 text-sm py-6 bg-slate-900/50 rounded-lg border border-slate-700/50">Match importe sans play-by-play detaille</div>
                )}
            </div>
{/* CLUTCH ANALYSIS */}
                <ClutchPanel game={game} players={players} />

                {/* ON/OFF IMPACT */}
                <OnOffPanel game={game} players={players} />
        </Modal>
    );
}

function ClutchPanel({ game, players }) {
    if (!game?.actions?.length || !game.actions[0].onCourt || game.actions[0].time === undefined) {
        return React.createElement('div', { className: 'text-center text-slate-500 text-sm py-8' },
            '⏱️ Données clutch non disponibles (match sans timeline détaillée)'
        );
    }

    const clutchActions = filterClutchActions(game.actions, players);
    if (!clutchActions || !clutchActions.length) {
        return React.createElement('div', { className: 'text-center text-slate-500 text-sm py-8' },
            'Aucune action en situation clutch détectée (Q4/OT, 2 dernières min, écart ≤5 pts)'
        );
    }

    const clutchData = players.map(p => {
        const stats = calcClutchStats(clutchActions, p.id);
        if (!stats) return null;
        const rating = calcClutchRating(stats);
        return { player: p, stats, rating };
    }).filter(Boolean).sort((a, b) => b.rating - a.rating);

    if (!clutchData.length) {
        return React.createElement('div', { className: 'text-center text-slate-500 text-sm py-8' },
            'Aucun joueur actif en situation clutch'
        );
    }

    const getRatingColor = (r) => {
        if (r >= 70) return 'text-green-400';
        if (r >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getRatingBg = (r) => {
        if (r >= 70) return 'bg-green-500/20 border-green-500/40';
        if (r >= 40) return 'bg-yellow-500/20 border-yellow-500/40';
        return 'bg-red-500/20 border-red-500/40';
    };

    return React.createElement('div', { className: 'space-y-4' },
        // Header
        React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('h4', { className: 'text-sm text-orange-400 uppercase font-bold' }, '🔥 Clutch Performance'),
            React.createElement('span', { className: 'text-xs text-slate-500' },
                clutchActions.length + ' actions clutch (Q4/OT, 2 dernières min, ≤5 pts)')
        ),

        // Tableau
        React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'w-full text-xs' },
                React.createElement('thead', null,
                    React.createElement('tr', { className: 'border-b border-slate-700 text-slate-400' },
                        React.createElement('th', { className: 'p-2 text-left' }, 'Joueur'),
                        React.createElement('th', { className: 'p-2 text-center' }, 'Rating'),
                        React.createElement('th', { className: 'p-2 text-center' }, 'PTS'),
                        React.createElement('th', { className: 'p-2 text-center' }, 'FG'),
                        React.createElement('th', { className: 'p-2 text-center' }, '3PT'),
                        React.createElement('th', { className: 'p-2 text-center' }, 'FT'),
                        React.createElement('th', { className: 'p-2 text-center' }, 'AST'),
                        React.createElement('th', { className: 'p-2 text-center' }, 'TOV')
                    )
                ),
                React.createElement('tbody', { className: 'divide-y divide-slate-800' },
                    clutchData.map(({ player, stats, rating }) =>
                        React.createElement('tr', { key: player.id, className: 'hover:bg-slate-800/50' },
                            React.createElement('td', { className: 'p-2 font-bold text-white' },
                                '#' + player.number + ' ' + player.name
                            ),
                            React.createElement('td', { className: 'p-2 text-center' },
                                React.createElement('span', {
                                    className: `inline-block px-2 py-0.5 rounded border text-xs font-bold ${getRatingBg(rating)} ${getRatingColor(rating)}`
                                }, rating)
                            ),
                            React.createElement('td', { className: 'p-2 text-center font-bold text-orange-400' }, stats.pts),
                            React.createElement('td', { className: 'p-2 text-center' },
                                stats.fgm + '-' + stats.fga,
                                React.createElement('span', { className: 'text-slate-500 ml-1' }, '(' + stats.fgPct + '%)')
                            ),
                            React.createElement('td', { className: 'p-2 text-center text-slate-400' },
                                stats.threePM + '-' + stats.threePA
                            ),
                            React.createElement('td', { className: 'p-2 text-center text-slate-400' },
                                stats.ftm + '-' + stats.fta
                            ),
                            React.createElement('td', { className: 'p-2 text-center text-blue-400' }, stats.ast),
                            React.createElement('td', { className: 'p-2 text-center text-red-400' }, stats.tov)
                        )
                    )
                )
            )
        )
    );
}


// ===========================================
// 4. COMPOSANT OnOffPanel
// ===========================================

function OnOffPanel({ game, players }) {
    const MIN_POSSESSIONS = 10;
    const [sortKey, setSortKey] = useState('netDiff');
    const [sortDir, setSortDir] = useState(-1);
    const [expandedPlayer, setExpandedPlayer] = useState(null);

    if (!game?.actions?.length || !game.actions[0].onCourt || game.actions[0].time === undefined) {
        return React.createElement('div', { className: 'text-center text-slate-500 text-sm py-8' },
            '📊 Données ON/OFF non disponibles (match sans lineup tracking)'
        );
    }

    const impacts = players
        .filter(p => {
            const ps = game.playerStats?.[p.id];
            return ps && (ps.minutes || 0) > 0;
        })
        .map(p => {
            const impact = calcOnOffImpact(game.actions, p.id, players);
            if (!impact) return null;
            return { player: p, ...impact };
        })
        .filter(i => i && (i.on.poss + i.off.poss) >= MIN_POSSESSIONS);

    if (!impacts.length) {
        return React.createElement('div', { className: 'text-center text-slate-500 text-sm py-8' },
            'Aucune donnée ON/OFF calculable (trop peu de possessions)'
        );
    }

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d * -1);
        else { setSortKey(key); setSortDir(-1); }
    };

    const sorted = [...impacts].sort((a, b) => {
        const map = { netDiff: 'netDiff', netOn: 'netOn', netOff: 'netOff', dpr: 'on' };
        let va, vb;
        if (sortKey === 'dpr') { va = a.on.dpr; vb = b.on.dpr; }
        else { va = a[sortKey]; vb = b[sortKey]; }
        return (va - vb) * sortDir;
    });

    const maxAbsNetDiff = Math.max(1, ...impacts.map(i => Math.abs(i.netDiff)));

    const SortHeader = ({ label, sortKeyVal }) =>
        React.createElement('th', {
            className: 'p-2 text-center cursor-pointer hover:text-orange-400 select-none',
            onClick: () => toggleSort(sortKeyVal)
        }, label + (sortKey === sortKeyVal ? (sortDir === -1 ? ' ▼' : ' ▲') : ''));

    return React.createElement('div', { className: 'space-y-4' },

        // HEADER
        React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('h4', { className: 'text-sm text-orange-400 uppercase font-bold' },
                '📈 Impact ON/OFF'),
            React.createElement('span', { className: 'text-xs text-slate-500' },
                'Ratings pour 100 possessions — cliquer un joueur pour le détail DPR')
        ),

        // TABLEAU
        React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'w-full text-xs' },

                // THEAD
                React.createElement('thead', null,
                    React.createElement('tr', { className: 'border-b border-slate-700 text-slate-400' },
                        React.createElement('th', { className: 'p-2 text-left' }, 'Joueur'),
                        React.createElement('th', { className: 'p-2 text-center', colSpan: 2 }, 'ON Court'),
                        React.createElement('th', { className: 'p-2 text-center', colSpan: 2 }, 'OFF Court'),
                        React.createElement('th', { className: 'p-2 text-center text-[10px]' }, 'Déf'),
                        SortHeader({ label: 'Net ON', sortKeyVal: 'netOn' }),
                        SortHeader({ label: 'Net OFF', sortKeyVal: 'netOff' }),
                        SortHeader({ label: 'Diff', sortKeyVal: 'netDiff' })
                    ),
                    React.createElement('tr', { className: 'border-b border-slate-800 text-slate-500 text-[10px]' },
                        React.createElement('th', null),
                        React.createElement('th', { className: 'p-1 text-center' }, 'ORtg'),
                        React.createElement('th', { className: 'p-1 text-center' }, 'DPR'),
                        React.createElement('th', { className: 'p-1 text-center' }, 'ORtg'),
                        React.createElement('th', { className: 'p-1 text-center' }, 'DPR'),
                        React.createElement('th', { className: 'p-1 text-center' }, 'STL/BLK/DR'),
                        React.createElement('th', null),
                        React.createElement('th', null),
                        React.createElement('th', null)
                    )
                ),

                // TBODY
                React.createElement('tbody', { className: 'divide-y divide-slate-800' },
                    sorted.flatMap(({ player, on, off, netDiff, netOn, netOff, netDiff_raw, netOn_raw, netOff_raw, weightON, weightOFF, K_on }) => {
                        const isExpanded = expandedPlayer === player.id;
                        const rows = [];

                        // Ligne principale
                        rows.push(
                            React.createElement('tr', {
                                key: player.id,
                                className: 'hover:bg-slate-800/50 cursor-pointer' + (isExpanded ? ' bg-slate-800/30' : ''),
                                onClick: () => setExpandedPlayer(isExpanded ? null : player.id)
                            },
                                // Nom + poss + usage
                                React.createElement('td', { className: 'p-2 font-bold text-white whitespace-nowrap' },
                                    React.createElement('span', null, '#' + player.number + ' ' + player.name),
                                    React.createElement('span', { className: 'text-[10px] text-slate-500 ml-1' },
                                        '(' + on.poss + '/' + off.poss + ' poss • Usg ' + on.usageRate + '% • Fiab. ' + weightON + '%)'
                                    ),
                                    React.createElement('span', { className: 'text-[10px] text-slate-600 ml-1' },
                                        isExpanded ? '▲' : '▼')
                                ),

                                // ON ORtg
                                React.createElement('td', { className: 'p-2 text-center text-green-400 font-mono' }, on.ortg),
                                // ON DPR
                                React.createElement('td', { className: 'p-2 text-center text-red-400 font-mono' }, on.dpr),
                                // OFF ORtg
                                React.createElement('td', { className: 'p-2 text-center text-green-400/60 font-mono' }, off.ortg),
                                // OFF DPR
                                React.createElement('td', { className: 'p-2 text-center text-red-400/60 font-mono' }, off.dpr),

                                // STL / BLK / DREB
                                React.createElement('td', { className: 'p-2 text-center text-slate-300 font-mono text-[10px]' },
                                    on.playerStl + '/' + on.playerBlk + '/' + on.playerDreb),

                                // Net ON
                                React.createElement('td', {
                                    className: 'p-2 text-center font-bold font-mono ' + (netOn >= 0 ? 'text-green-400' : 'text-red-400')
                                }, (netOn > 0 ? '+' : '') + netOn),

                                // Net OFF
                                React.createElement('td', {
                                    className: 'p-2 text-center font-mono ' + (netOff >= 0 ? 'text-green-400/60' : 'text-red-400/60')
                                }, (netOff > 0 ? '+' : '') + netOff),

                                // Net Diff badge
                                React.createElement('td', { className: 'p-2 text-center' },
                                    React.createElement('span', {
                                        className: 'inline-block px-2 py-0.5 rounded font-bold ' +
                                            (netDiff > 0 ? 'bg-green-500/20 text-green-400' :
                                             netDiff < 0 ? 'bg-red-500/20 text-red-400' :
                                             'bg-slate-700 text-slate-400')
                                    }, (netDiff > 0 ? '+' : '') + netDiff)
                                )
                            )
                        );

                        // Ligne de détail DPR (expandable)
                        if (isExpanded) {
                            rows.push(
                                React.createElement('tr', {
                                    key: player.id + '_detail',
                                    className: 'bg-slate-900/60'
                                },
                                    React.createElement('td', { colSpan: 9, className: 'px-4 py-3' },
                                        React.createElement('div', { className: 'flex flex-wrap gap-4 text-[11px]' },

                                            // DPR Breakdown ON
                                            React.createElement('div', { className: 'bg-slate-800 rounded-lg p-3 flex-1 min-w-[200px]' },
                                                React.createElement('div', { className: 'text-orange-400 font-bold mb-2 text-xs' }, '🛡️ DPR ON Court — Décomposition'),
                                                React.createElement('div', { className: 'space-y-1' },
                                                    React.createElement('div', { className: 'flex justify-between' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Base DRtg (pts encaissés)'),
                                                        React.createElement('span', { className: 'text-red-400 font-mono' }, on.drtg)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between' },
                                                        React.createElement('span', { className: 'text-slate-400' }, '− Contrib (STL×1.8 + BLK×1.2 + DREB×0.4)'),
                                                        React.createElement('span', { className: 'text-green-400 font-mono' }, '−' + on.defContrib)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between' },
                                                        React.createElement('span', { className: 'text-slate-400' }, '+ Pénalité fautes (PF×0.7)'),
                                                        React.createElement('span', { className: 'text-red-400 font-mono' }, '+' + on.defPenalty)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Adv. FG% quand ON'),
                                                        React.createElement('span', {
                                                            className: 'font-mono ' + (on.oppFgPct > 42 ? 'text-red-400' : 'text-green-400')
                                                        }, on.oppFgPct + '%')
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between border-t border-slate-700 pt-1 mt-1' },
                                                        React.createElement('span', { className: 'text-white font-bold' }, 'DPR final'),
                                                        React.createElement('span', { className: 'text-white font-bold font-mono' }, on.dpr)
                                                    )
                                                )
                                            ),

                                            // Stats défensives individuelles
                                            React.createElement('div', { className: 'bg-slate-800 rounded-lg p-3 min-w-[140px]' },
                                                React.createElement('div', { className: 'text-orange-400 font-bold mb-2 text-xs' }, '📊 Actions défensives'),
                                                React.createElement('div', { className: 'space-y-1' },
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Interceptions'),
                                                        React.createElement('span', { className: 'text-cyan-400 font-mono font-bold' }, on.playerStl)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Contres'),
                                                        React.createElement('span', { className: 'text-cyan-400 font-mono font-bold' }, on.playerBlk)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Reb. déf.'),
                                                        React.createElement('span', { className: 'text-cyan-400 font-mono font-bold' }, on.playerDreb)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Fautes'),
                                                        React.createElement('span', { className: 'text-red-400 font-mono font-bold' }, on.playerPf)
                                                    )
                                                )
                                            ),

                                            // Usage offensif
                                            React.createElement('div', { className: 'bg-slate-800 rounded-lg p-3 min-w-[140px]' },
                                                React.createElement('div', { className: 'text-orange-400 font-bold mb-2 text-xs' }, '🎯 Shrinkage (fiabilité)'),
                                                React.createElement('div', { className: 'space-y-1' },
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Poss ON'),
                                                        React.createElement('span', { className: 'font-mono text-white' }, on.poss)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Actions individuelles'),
                                                        React.createElement('span', { className: 'font-mono text-white' }, on.playerActions)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Taux implication'),
                                                        React.createElement('span', { className: 'font-mono ' + (on.involvementRate >= 0.3 ? 'text-green-400' : on.involvementRate >= 0.15 ? 'text-yellow-400' : 'text-red-400') },
                                                            Math.round(on.involvementRate * 100) + '%')
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'K adapté (base 30)'),
                                                        React.createElement('span', { className: 'font-mono text-cyan-400' }, K_on)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Poids final'),
                                                        React.createElement('span', { className: 'font-mono font-bold ' + (weightON >= 50 ? 'text-green-400' : 'text-yellow-400') }, weightON + '%')
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4 border-t border-slate-700 pt-1 mt-1' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Net Diff brut'),
                                                        React.createElement('span', { className: 'font-mono text-slate-300' }, (netDiff_raw > 0 ? '+' : '') + netDiff_raw)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-white font-bold' }, 'Net Diff ajusté'),
                                                        React.createElement('span', { className: 'font-mono font-bold ' + (netDiff >= 0 ? 'text-green-400' : 'text-red-400') }, (netDiff > 0 ? '+' : '') + netDiff)
                                                    )
                                                )
                                            ),

                                            // Profil offensif
                                            React.createElement('div', { className: 'bg-slate-800 rounded-lg p-3 min-w-[140px]' },
                                                React.createElement('div', { className: 'text-orange-400 font-bold mb-2 text-xs' }, '⚡ Profil offensif ON'),
                                                React.createElement('div', { className: 'space-y-1' },
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Usage Rate'),
                                                        React.createElement('span', { className: 'text-yellow-400 font-mono font-bold' }, on.usageRate + '%')
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Tirs'),
                                                        React.createElement('span', { className: 'font-mono text-white' }, on.playerFgm + '-' + on.playerFga)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Passes D.'),
                                                        React.createElement('span', { className: 'text-blue-400 font-mono font-bold' }, on.playerAst)
                                                    ),
                                                    React.createElement('div', { className: 'flex justify-between gap-4' },
                                                        React.createElement('span', { className: 'text-slate-400' }, 'Pertes'),
                                                        React.createElement('span', { className: 'text-red-400 font-mono font-bold' }, on.playerTov)
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            );
                        }

                        return rows;
                    })
                )
            )
        ),

        // BAR CHART HORIZONTAL (Net Diff)
        React.createElement('div', { className: 'mt-4' },
            React.createElement('h5', { className: 'text-xs text-slate-400 mb-2 uppercase' },
                'Net Rating Différentiel (ON − OFF)'),
            React.createElement('div', { className: 'space-y-1' },
                sorted.map(({ player, netDiff }) => {
                    const pct = Math.abs(netDiff) / maxAbsNetDiff * 100;
                    const isPositive = netDiff >= 0;
                    return React.createElement('div', {
                        key: player.id, className: 'flex items-center gap-2 h-7'
                    },
                        React.createElement('span', {
                            className: 'text-[10px] text-slate-400 w-20 text-right truncate'
                        }, '#' + player.number + ' ' + player.name.split(' ')[0]),

                        React.createElement('div', { className: 'flex-1 flex items-center h-full' },
                            React.createElement('div', {
                                className: 'relative h-full flex items-center',
                                style: { width: '100%' }
                            },
                                React.createElement('div', {
                                    className: 'absolute left-1/2 top-0 bottom-0 w-px bg-slate-600',
                                    style: { transform: 'translateX(-50%)' }
                                }),
                                isPositive
                                    ? React.createElement('div', {
                                        className: 'absolute h-4 bg-green-500/60 rounded-r',
                                        style: { left: '50%', width: (pct / 2) + '%' }
                                    })
                                    : React.createElement('div', {
                                        className: 'absolute h-4 bg-red-500/60 rounded-l',
                                        style: { right: '50%', width: (pct / 2) + '%' }
                                    })
                            )
                        ),

                        React.createElement('span', {
                            className: 'text-[10px] font-bold w-8 ' + (isPositive ? 'text-green-400' : 'text-red-400')
                        }, (netDiff > 0 ? '+' : '') + netDiff)
                    );
                })
            )
        )
    );
}

// --- HISTORY ---
function History({ games, players, setGames, phases, onEditGame, onImportClick, onMultiImport, isAdmin }) {
    const [selectedGame, setSelectedGame] = useState(null);
    const [editingPBP, setEditingPBP] = useState(null);
    const sortedGames = useMemo(() => [...games].sort((a, b) => parseDate(b.date) - parseDate(a.date)), [games]);

    return (
        <div className="space-y-4 pb-20 md:pb-0">
            {isAdmin && (
                <div className="flex justify-end gap-2 no-print flex-wrap">
                    <a href="live.html" className="font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"><Icon path={Icons.Play} /> Nouveau Match</a>
                    <Button variant="secondary" onClick={onMultiImport}><Icon path={Icons.Upload} /> Multi-Import</Button>
                    <Button variant="primary" onClick={onImportClick}><Icon path={Icons.Upload} /> Importer</Button>
                </div>
            )}
            {sortedGames.length === 0 && <div className="text-center text-slate-500 py-10">Aucun match enregistre</div>}
            {sortedGames.map(g => (
                <Card key={g.id} className="p-0 overflow-hidden group hover:border-orange-500/50 transition-colors">
                    <div className="flex justify-between items-stretch">
                        <div className="flex-1 p-3 md:p-4 cursor-pointer group-hover:bg-slate-800/80 transition-colors" onClick={() => setSelectedGame(g)}>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>{g.date}</span>
                                {g.phase && <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs">{phases.find(p => p.id === g.phase)?.name}</span>}
                            </div>
                            <div className="text-lg md:text-xl font-bold text-white mt-1">
                                <span className="text-green-400">{g.homeScore}</span> - <span className="text-red-400">{g.awayScore}</span>
                                <span className="text-slate-300 ml-2 text-base font-normal truncate max-w-[150px] md:max-w-none inline-block align-bottom">vs {g.opponent}</span>
                            </div>
                            <div className="text-xs text-orange-500/0 group-hover:text-orange-500 transition-all mt-2 flex items-center gap-1"><Icon path={Icons.Eye} className="w-3 h-3"/> Voir stats</div>
                        </div>
                        {isAdmin && (
                            <div className="flex flex-col justify-center gap-2 p-2 bg-slate-900/50 border-l border-slate-700">
                                {g.actions?.length > 0 && (<Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingPBP(g); }}><Icon path={Icons.Edit} /> PBP</Button>)}
                                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm("Supprimer ?")) { const newG = games.filter(x => x.id !== g.id); setGames(newG); if (window.db) saveDataToCloud(window.db, "games", newG); } }}><Icon path={Icons.Trash} /></Button>
                            </div>
                        )}
                    </div>
                </Card>
            ))}
            <GameDetailsModal game={selectedGame} isOpen={!!selectedGame} onClose={() => setSelectedGame(null)} players={players} />
            {editingPBP && window.PlayByPlayEditor && (
                <PlayByPlayEditor game={editingPBP} players={players}
                    onSave={async (updatedGame) => { const idx = games.findIndex(g => g.id === updatedGame.id); if (idx < 0) return; const newGames = [...games]; newGames[idx] = updatedGame; setGames(newGames); if (window.db) { await window.db.collection('team_data').doc('games').set({ list: newGames }); } setEditingPBP(null); }}
                    onClose={() => setEditingPBP(null)} />
            )}
        </div>
    );
}

// --- SETTINGS ---
function Settings({ players, onUpdatePlayers, phases, onUpdatePhases, firebaseConfig, setFirebaseConfig }) {
    const [localConfig, setLocalConfig] = useState(JSON.stringify(firebaseConfig, null, 2) || "");
    const [newPhaseName, setNewPhaseName] = useState("");
    return (
        <div className="space-y-6">
            <Card className="p-6 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-white mb-4"><Icon path={Icons.Layers} /> Phases</h3>
                <div className="space-y-3">
                    {phases.map((ph, i) => (
                        <div key={ph.id} className="flex items-center gap-3 bg-slate-900 p-3 rounded border border-slate-700">
                            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</div>
                            <input className="flex-1 bg-transparent text-white font-semibold outline-none" value={ph.name} onChange={(e) => { const np = [...phases]; np[i].name = e.target.value; onUpdatePhases(np); }} />
                            <button onClick={() => { if (phases.length > 1 && confirm("Supprimer ?")) onUpdatePhases(phases.filter(p => p.id !== ph.id)); }} className="text-red-500 p-2"><Icon path={Icons.Trash} /></button>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-4">
                        <input type="text" value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)} placeholder="Nouvelle phase..." className="flex-1 bg-slate-900 text-white px-4 py-2 rounded border border-slate-600" onKeyPress={(e) => { if (e.key === 'Enter' && newPhaseName.trim()) { onUpdatePhases([...phases, { id: `phase_${generateId()}`, name: newPhaseName.trim() }]); setNewPhaseName(""); } }} />
                        <Button variant="success" onClick={() => { if (newPhaseName.trim()) { onUpdatePhases([...phases, { id: `phase_${generateId()}`, name: newPhaseName.trim() }]); setNewPhaseName(""); } }}><Icon path={Icons.Plus} /></Button>
                    </div>
                </div>
            </Card>
            <Card className="p-6 border-l-4 border-purple-500">
                <h3 className="text-lg font-bold text-white mb-4"><Icon path={Icons.Cloud} /> Firebase</h3>
                <textarea className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono h-32 mb-2" value={localConfig} onChange={(e) => setLocalConfig(e.target.value)} />
                <Button onClick={() => { try { setFirebaseConfig(JSON.parse(localConfig)); alert("OK"); } catch (e) { alert("Erreur JSON"); } }} variant="secondary" size="sm">Sauvegarder</Button>
            </Card>
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Effectif</h2><Button onClick={() => onUpdatePlayers([...players, { id: Math.max(0, ...players.map(p => p.id)) + 1, name: "Nouveau", number: 0, pos: "G" }])} variant="success"><Icon path={Icons.Plus} /></Button></div>
            <div className="grid gap-3">
                {players.map((p, i) => (
                    <Card key={p.id} className="p-3 flex gap-3 items-center">
                        <input className="w-12 h-12 bg-slate-700 rounded-full text-center font-bold outline-none" value={p.number} onChange={(e) => { const np = [...players]; np[i].number = parseInt(e.target.value) || 0; onUpdatePlayers(np); }} />
                        <input className="flex-1 bg-transparent text-white font-bold outline-none" value={p.name} onChange={(e) => { const np = [...players]; np[i].name = e.target.value; onUpdatePlayers(np); }} />
                        <input className="w-16 bg-transparent text-slate-400 text-sm outline-none" value={p.pos} onChange={(e) => { const np = [...players]; np[i].pos = e.target.value; onUpdatePlayers(np); }} />
                        <button onClick={() => onUpdatePlayers(players.filter(x => x.id !== p.id))} className="text-red-500 p-2"><Icon path={Icons.Trash} /></button>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// --- LOGIN MODAL ---
function LoginModal({ isOpen, onLogin, onClose }) {
    const [pwd, setPwd] = useState("");
    const [error, setError] = useState(false);
    if (!isOpen) return null;
    const handleLogin = () => { if (pwd === "coach2025") { onLogin(); onClose(); } else setError(true); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Acces Coach" size="max-w-sm">
            <div className="space-y-4 p-2">
                <p className="text-sm text-slate-400">Veuillez entrer le mot de passe.</p>
                <input type="password" className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500" placeholder="Mot de passe..." value={pwd} onChange={(e) => { setPwd(e.target.value); setError(false); }} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
                {error && <div className="text-red-500 text-xs">Mot de passe incorrect</div>}
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={handleLogin}>Se connecter</Button></div>
            </div>
        </Modal>
    );
}

// --- MAIN APP ---
function App() {
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem('statchamp_admin') === 'true');
    const [showLogin, setShowLogin] = useState(false);
    const [view, setView] = useState("global_stats");
    const [players, setPlayers] = useState([]);
    const [games, setGames] = useState([]);
    const [phases, setPhases] = useState(DEFAULT_PHASES);
    const [activeGame, setActiveGame] = useState(null);
    const [firebaseConfig, setFirebaseConfig] = useState(null);
    const [db, setDb] = useState(null);
    const [importData, setImportData] = useState(null);
    const [multiImportQueue, setMultiImportQueue] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const isPlayerMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'player', []);

    useEffect(() => {
        const savedFbConfig = localStorage.getItem('basket_firebase_config');
        const savedPhases = localStorage.getItem('basket_phases');
        if (savedPhases) try { setPhases(JSON.parse(savedPhases)); } catch (e) { }
        if (PRECONFIGURED_FIREBASE.apiKey && !savedFbConfig) setFirebaseConfig(PRECONFIGURED_FIREBASE);
        else if (savedFbConfig) try { setFirebaseConfig(JSON.parse(savedFbConfig)); } catch (e) { }
        if (!savedFbConfig && !PRECONFIGURED_FIREBASE.apiKey) {
            setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers);
            setGames(JSON.parse(localStorage.getItem('basket_games')) || []);
            setIsDataLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (firebaseConfig && window.firebase) {
            try {
                if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
                const database = firebase.firestore();
                setDb(database); window.db = database;
                database.collection("team_data").doc("roster").onSnapshot(doc => { if (doc.exists && doc.data().list) setPlayers(doc.data().list); else setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers); setIsDataLoaded(true); });
                database.collection("team_data").doc("games").onSnapshot(doc => { if (doc.exists && doc.data().list) setGames(doc.data().list); else setGames(JSON.parse(localStorage.getItem('basket_games')) || []); });
                database.collection("team_data").doc("phases").onSnapshot(doc => { if (doc.exists && doc.data().list) setPhases(doc.data().list); });
            } catch (e) { console.error("Firebase:", e); setIsDataLoaded(true); }
        }
    }, [firebaseConfig]);

    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_players', JSON.stringify(players)); }, [players, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_games', JSON.stringify(games)); }, [games, isDataLoaded]);
    useEffect(() => { localStorage.setItem('basket_phases', JSON.stringify(phases)); }, [phases]);
    useEffect(() => { if (firebaseConfig) localStorage.setItem('basket_firebase_config', JSON.stringify(firebaseConfig)); }, [firebaseConfig]);

    const handleSaveGame = (gameState) => {
        if (!isAdmin) return;
        const gameId = activeGame?.id || generateId();
        const newGame = { ...gameState, id: gameId, date: activeGame?.date || new Date().toLocaleDateString() };
        const newGamesList = games.some(g => g.id === gameId) ? games.map(g => g.id === gameId ? newGame : g) : [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) saveDataToCloud(window.db, "games", newGamesList);
        setActiveGame(null); setView('history');
    };

    const handleUpdatePhases = (newPhases) => { if (!isAdmin) return; setPhases(newPhases); if (window.db && !isPlayerMode) saveDataToCloud(window.db, "phases", newPhases); };
    const handleSettingsUpdate = (newPlayers) => { if (!isAdmin) return; setPlayers(newPlayers); if (window.db && !isPlayerMode) saveDataToCloud(window.db, "roster", newPlayers); };
    const performLogin = () => { setIsAdmin(true); localStorage.setItem('statchamp_admin', 'true'); setView('live'); };
    const performLogout = () => { setIsAdmin(false); localStorage.removeItem('statchamp_admin'); setView('global_stats'); };
    const handleFileImport = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setImportData(parseHTMLStats(ev.target.result)); reader.readAsText(file); e.target.value = null; };
    const handleMultiFileImport = (e) => { const files = Array.from(e.target.files); if (files.length === 0) return; const queue = []; let processed = 0; files.forEach(file => { const reader = new FileReader(); reader.onload = (ev) => { queue.push(parseHTMLStats(ev.target.result)); processed++; if (processed === files.length) setMultiImportQueue(queue); }; reader.readAsText(file); }); e.target.value = null; };

    const confirmImport = async (newGame, updatedPlayers) => {
        setPlayers(updatedPlayers);
        const newGamesList = [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) {
            try { await saveDataToCloud(window.db, "roster", updatedPlayers); await saveDataToCloud(window.db, "games", newGamesList); alert("Importe !"); }
            catch (e) { console.error("Firebase write error:", e); alert("Erreur Firebase : " + e.message); }
        } else { alert("Importe (local uniquement)"); }
        setImportData(null); setView('history');
    };

    const confirmMultiImport = async (newGame, updatedPlayers) => {
        setPlayers(updatedPlayers);
        const newGamesList = [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) {
            try { await saveDataToCloud(window.db, "roster", updatedPlayers); await saveDataToCloud(window.db, "games", newGamesList); alert("Importe !"); }
            catch (e) { console.error("Firebase write error:", e); alert("Erreur Firebase : " + e.message); }
        } else { alert("Importe (local uniquement)"); }
        setImportData(null); setView('history');
    };

    if (isPlayerMode) return <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col font-sans text-slate-200"><header className="h-16 bg-slate-900 flex items-center px-6"><h1 className="font-bold text-lg text-white">Stats</h1><span className="ml-auto text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Mode Joueur</span></header><div className="flex-1 p-4 overflow-y-auto"><GlobalStats players={players} games={games} phases={phases} /></div></div>;

    return (
        <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
            {isAdmin && (<><input type="file" accept=".html" id="html-upload" onChange={handleFileImport} className="hidden" /><input type="file" accept=".html" id="multi-upload" onChange={handleMultiFileImport} multiple className="hidden" /></>)}
            {importData && <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 10000 }}><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-4">Import</h2><ImportReviewModal importData={importData} currentPlayers={players} phases={phases} onConfirm={confirmImport} onCancel={() => setImportData(null)} /></div></div>}
            {multiImportQueue.length > 0 && <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 10000 }}><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-2">Multi-Import ({multiImportQueue.length} restant{multiImportQueue.length > 1 ? 's' : ''})</h2><ImportReviewModal importData={multiImportQueue[0]} currentPlayers={players} phases={phases} onConfirm={confirmMultiImport} onCancel={() => setMultiImportQueue([])} /></div></div>}
            <LoginModal isOpen={showLogin} onLogin={performLogin} onClose={() => setShowLogin(false)} />
            <nav className="bg-slate-900 border-r border-slate-800 w-full md:w-20 flex md:flex-col items-center justify-between md:pt-6 p-2 shrink-0" style={{ zIndex: 40 }}>
                <div className="flex md:flex-col items-center gap-2 md:gap-4 w-full justify-evenly md:justify-start">
                    <div className="mb-0 md:mb-4 p-2 bg-orange-600 rounded-xl text-white font-black text-xl cursor-default">BP</div>
                    <button onClick={() => setView("global_stats")} className={`p-3 rounded-xl transition-all ${view === "global_stats" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Stats"><Icon path={Icons.Chart} /></button>
                    {isAdmin && <button onClick={() => window.location.href = 'live.html'} className="p-3 rounded-xl transition-all text-slate-500 hover:text-orange-500 hover:bg-slate-800" title="Live Tracker"><Icon path={Icons.Play} /></button>}
                    <button onClick={() => setView("history")} className={`p-3 rounded-xl transition-all ${view === "history" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Historique"><Icon path={Icons.Clipboard} /></button>
                    {isAdmin && <button onClick={() => setView("settings")} className={`p-3 rounded-xl transition-all ${view === "settings" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Config"><Icon path={Icons.Settings} /></button>}
                </div>
                <div className="mt-auto hidden md:block pb-4">
                    {isAdmin ? <button onClick={performLogout} className="p-3 text-red-500 hover:bg-slate-800 rounded-xl" title="Deconnexion"><Icon path={Icons.Users} /></button> : <button onClick={() => setShowLogin(true)} className="p-3 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl" title="Connexion"><Icon path={Icons.Users} /></button>}
                </div>
                <div className="md:hidden">{isAdmin ? <button onClick={performLogout} className="p-3 text-red-500"><Icon path={Icons.Users} /></button> : <button onClick={() => setShowLogin(true)} className="p-3 text-slate-600"><Icon path={Icons.Users} /></button>}</div>
            </nav>
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0" style={{ zIndex: 30 }}>
                    <h1 className="font-bold text-lg text-white">{view === 'live' && "Live"}{view === 'global_stats' && "Stats"}{view === 'history' && "Historique"}{view === 'settings' && "Parametres"}</h1>
                    <div className="ml-auto flex items-center gap-3">
                        {!isAdmin && <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">Public</span>}
                        {isAdmin && <span className="text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Admin</span>}
                        {window.db && <span className="text-xs text-green-400 flex items-center gap-1"><Icon path={Icons.Cloud} className="w-3 h-3" /> Synchro</span>}
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto" style={{ zIndex: 10 }}>
                    {view === 'global_stats' && <GlobalStats players={players} games={games} phases={phases} isAdmin={isAdmin}/>}
                    {view === 'history' && <History games={games} players={players} setGames={setGames} phases={phases} isAdmin={isAdmin} onEditGame={(g) => { setActiveGame(g); setView('live'); }} onImportClick={() => document.getElementById('html-upload').click()} onMultiImport={() => document.getElementById('multi-upload').click()} />}
                    {view === 'settings' && isAdmin && <Settings players={players} onUpdatePlayers={handleSettingsUpdate} phases={phases} onUpdatePhases={handleUpdatePhases} firebaseConfig={firebaseConfig} setFirebaseConfig={setFirebaseConfig} />}
                    {!isAdmin && (view === 'live' || view === 'settings') && <div className="h-full flex flex-col items-center justify-center text-slate-500"><Icon path={Icons.Users} className="w-16 h-16 mb-4 opacity-20" /><p>Acces reserve au coach.</p><button onClick={() => setShowLogin(true)} className="mt-4 text-orange-500 hover:underline">Se connecter</button></div>}
                </div>
            </main>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);