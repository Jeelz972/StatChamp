// reportPlayer.js
// Version : "Direct Client-Side AI" (Sans PHP)
// Dépendances : React, TailwindCSS

// --- CONFIGURATION ---

// --- UTILITAIRE : Gestion des Dates ---
var parseFrenchDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

// =================================================================================
// 2. MOTEUR D'ANALYSE STATISTIQUE
// =================================================================================

const LEVEL_BENCHMARKS = {
  NBA: {
    id: 'NBA',
    label: 'NBA',
    ts_elite: 62,
    ts_good: 57,
    ts_bad: 52,
    usage_high: 28,
    usage_low: 15,
    ast_good: 6,
    astTov_good: 2.8,
    astTov_bad: 1.5,
    oreb_good: 2.0,
    reb_dom: 10,
    def_active: 2.5,
    pf36_warn: 4.0,
    pf36_bad: 5.0,
    threePct_good: 37,
    trend_delta: 3,
  },
  Euroleague: {
    id: 'Euroleague',
    label: 'Euroleague',
    ts_elite: 60,
    ts_good: 55,
    ts_bad: 50,
    usage_high: 26,
    usage_low: 14,
    ast_good: 5,
    astTov_good: 2.5,
    astTov_bad: 1.3,
    oreb_good: 2.0,
    reb_dom: 9,
    def_active: 2.5,
    pf36_warn: 4.0,
    pf36_bad: 5.0,
    threePct_good: 36,
    trend_delta: 3,
  },
  Eurocup: {
    id: 'Eurocup',
    label: 'Eurocup',
    ts_elite: 59,
    ts_good: 54,
    ts_bad: 49,
    usage_high: 25,
    usage_low: 14,
    ast_good: 5,
    astTov_good: 2.3,
    astTov_bad: 1.2,
    oreb_good: 2.0,
    reb_dom: 9,
    def_active: 2.3,
    pf36_warn: 4.2,
    pf36_bad: 5.2,
    threePct_good: 35,
    trend_delta: 3,
  },
  LNB: {
    id: 'LNB',
    label: 'Betclic Élite',
    ts_elite: 58,
    ts_good: 53,
    ts_bad: 48,
    usage_high: 25,
    usage_low: 14,
    ast_good: 4.5,
    astTov_good: 2.2,
    astTov_bad: 1.2,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.2,
    pf36_warn: 4.2,
    pf36_bad: 5.5,
    threePct_good: 34,
    trend_delta: 3,
  },
  ProB: {
    id: 'ProB',
    label: 'Pro B',
    ts_elite: 57,
    ts_good: 52,
    ts_bad: 47,
    usage_high: 25,
    usage_low: 14,
    ast_good: 4.5,
    astTov_good: 2.2,
    astTov_bad: 1.2,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.2,
    pf36_warn: 4.2,
    pf36_bad: 5.5,
    threePct_good: 34,
    trend_delta: 3,
  },
  NM1: {
    id: 'NM1',
    label: 'NM1',
    ts_elite: 56,
    ts_good: 51,
    ts_bad: 46,
    usage_high: 25,
    usage_low: 14,
    ast_good: 4.5,
    astTov_good: 2.2,
    astTov_bad: 1.2,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.2,
    pf36_warn: 4.2,
    pf36_bad: 5.5,
    threePct_good: 34,
    trend_delta: 3,
  },
  NM2: {
    id: 'NM2',
    label: 'NM2',
    ts_elite: 56,
    ts_good: 51,
    ts_bad: 46,
    usage_high: 24,
    usage_low: 13,
    ast_good: 4,
    astTov_good: 2.0,
    astTov_bad: 1.1,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.0,
    pf36_warn: 4.5,
    pf36_bad: 5.5,
    threePct_good: 33,
    trend_delta: 4,
  },
  U21_Elite: {
    id: 'U21_Elite',
    label: 'U21 Élite',
    ts_elite: 58, // Top 10% des scoreurs du championnat (ex: Fodzo, Boisdur)
    ts_good: 52, // Moyenne d'efficacité globale (Team FG% ~44, 3P% ~31)
    ts_bad: 46, // Seuil de faible rendement offensif
    usage_high: 25, // Responsabilité de leader (1ère/2ème option offensive)
    usage_low: 14, // Joueur de rotation / Role player
    ast_good: 4.5, // Profil créateur (Top 15 des passeurs de la ligue)
    astTov_good: 1.8, // Ratio de sécurité optimal pour le rythme U21
    astTov_bad: 0.8, // Perte de contrôle du jeu (plus de TOV que d'AST)
    oreb_good: 2.4, // Impact fort au rebond offensif (profil intérieur actif)
    reb_dom: 8.5, // Seuil de domination statistique au rebond total
    def_active: 2.5, // Activité cumulée (Interceptions + Contres par match)
    pf36_warn: 4.2, // Alerte gestion des fautes rapportée à 36 min
    pf36_bad: 5.5, // Indiscipline défensive récurrente
    threePct_good: 34, // Fiabilité extérieure supérieure (Moyenne ligue ~31%)
    trend_delta: 5,
  },
  U18_Elite: {
    id: 'U18_Elite',
    label: 'U18 Élite',
    ts_elite: 56, // Top tiers d'efficacité (inférieur à l'U21, tir moins régulier)
    ts_good: 50, // Moyenne correcte pour la catégorie
    ts_bad: 44, // Seuil critique de rendement offensif
    usage_high: 25, // Responsabilité majeure (joueur à 15-20+ tirs/match)
    usage_low: 15, // Joueur de rotation / Complément
    ast_good: 4.5, // Excellent créateur (Moyenne haute pour les meneurs U18)
    astTov_good: 1.6, // Ratio de sécurité (plus bas qu'en U21 dû au nombre de TOV élevé)
    astTov_bad: 0.7, // Perte de contrôle fréquente (plus de turnovers que de passes)
    oreb_good: 2.5, // Impact fort au rebond offensif (plus d'opportunités en U18)
    reb_dom: 8.5, // Seuil de domination physique au rebond
    def_active: 2.5, // Activité (Stl + Blk) ; reflète l'intensité défensive U18
    pf36_warn: 4.5, // Alerte fautes rapide (fréquent en formation)
    pf36_bad: 5.8, // Indiscipline défensive marquée
    threePct_good: 31, // Réussite extérieure "Good" (Moyenne ligue ~28-30%)
    trend_delta: 5, // Seuil de fluctuation de performance
  },
};

let CURRENT_LEVEL = 'U18_Elite';
const getBenchmarks = () => LEVEL_BENCHMARKS[CURRENT_LEVEL] || LEVEL_BENCHMARKS['U18_Elite'];

// Classification de zone simplifiée pour le fingerprint
// Utilise les mêmes coordonnées que ShotChart.js (nx=depth 0-14, ny=sideline 0-15)
function classifyShotZone(nx, ny, val) {
  if (nx === undefined || ny === undefined) {
    return val === 3 ? 'three_ab' : 'paint';
  }
  if (nx > 14) {
    nx = 28 - nx;
    ny = 15 - ny;
  }
  var d = Math.sqrt((nx - 1.575) * (nx - 1.575) + (ny - 7.5) * (ny - 7.5));
  if (nx < 5.8 && ny > 5.05 && ny < 9.95) return 'paint';
  if (d > 6.75 || ny <= 0.9 || ny >= 14.1) {
    return ny <= 0.9 || ny >= 14.1 ? 'three_corner' : 'three_ab';
  }
  return 'mid';
}

const AnalysisEngine = {
  _estimatePoss: (teamTotals, oppTotals) => {
    return window.StatsEngine.possAdvanced(teamTotals, oppTotals);
  },

  // F5 — Calcul des stats par quart-temps pour un joueur (parsing play-by-play)
  computeQuarterStats: function (playerId, games) {
    var qMap = {};
    if (!games || !Array.isArray(games)) return null;
    games.forEach(function (g) {
      if (!g.actions || !g.actions.length) return;
      g.actions.forEach(function (a) {
        var pid = a.pid;
        if (Number(pid) !== Number(playerId) && String(pid) !== String(playerId)) return;
        var q = a.q || a.quarter || 0;
        if (!q || q > 4) return; // ignore OT pour la fatigue
        if (!qMap[q])
          qMap[q] = {
            q: q,
            pts: 0,
            fgm: 0,
            fga: 0,
            fta: 0,
            ftm: 0,
            tov: 0,
            reb: 0,
            stl: 0,
            blk: 0,
            min: 0,
          };
        var m = qMap[q];
        if (a.type === 'SHOT') {
          m.fga++;
          if (a.made) {
            m.fgm++;
            m.pts += a.val || 2;
          }
        }
        if (a.type === 'FT') {
          m.fta += a.ftAtt || 1;
          m.ftm += a.ftMade || 0;
          m.pts += a.ftMade || 0;
        }
        if (a.type === 'TOV') m.tov++;
        if (a.type === 'REB' || a.type === 'OREB' || a.type === 'DREB') m.reb++;
        if (a.type === 'STL') m.stl++;
        if (a.type === 'BLK') m.blk++;
        if (a.type === 'MIN' && a.val) m.min += a.val;
      });
    });
    var qStats = Object.values(qMap);
    if (qStats.length < 3) return null;
    // Estimer les minutes si non tracées : on divise les minutes totales du joueur par matchs × quarts
    var totalMinutes = 0;
    if (games) {
      games.forEach(function (g) {
        var raw = g.players || g.playerStats;
        if (!raw) return;
        var list = Array.isArray(raw) ? raw : Object.values(raw);
        list.forEach(function (s) {
          if (Number(s.id) === Number(playerId) || String(s.id) === String(playerId)) {
            totalMinutes += parseFloat(s.min || s.minutes || 0);
          }
        });
      });
    }
    var minPerQ = totalMinutes > 0 ? totalMinutes / (qStats.length * (games.length || 1)) : 2.5;
    qStats.forEach(function (q) {
      if (q.min === 0) q.min = minPerQ;
    });
    // Calculer EFF par quart
    qStats.forEach(function (q) {
      q.eff = window.StatsEngine.EFF(
        q.pts,
        q.reb,
        0,
        q.stl,
        q.blk,
        q.fga,
        q.fgm,
        q.fta,
        q.ftm,
        q.tov
      );
    });
    return window.StatsEngine.fatigueProfile(qStats);
  },

  // F3 — Clustering dynamique des rôles dans l'équipe (k-means sur fingerprint 6D)
  computeSquadClusters: function (player, allPlayers, games) {
    var eligible = (allPlayers || []).filter(function (p) {
      return p && p.logs && p.logs.length >= 3 && p.avg && (p.avg.min || 0) >= 10;
    });
    if (eligible.length < 4) return null;
    var fps = eligible.map(function (p) {
      return AnalysisEngine.computeFingerprint(p, eligible, games);
    });
    var vectors = fps
      .map(function (fp) {
        if (!fp) return null;
        return [
          fp.volume || 0,
          fp.efficiency || 0,
          fp.shooting || 0,
          fp.creation || 0,
          fp.rebounding || 0,
          fp.defense || 0,
        ];
      })
      .filter(Boolean);
    if (vectors.length < 4) return null;
    var k = Math.min(4, Math.floor(vectors.length / 2));
    var eligibleFp = eligible.filter(function (_, i) {
      return fps[i] !== null;
    });
    var assignments = window.StatsEngine.kMeansCluster(vectors, k);
    var playerIdx = eligibleFp.findIndex(function (p) {
      return Number(p.id) === Number(player.id) || String(p.id) === String(player.id);
    });
    if (playerIdx === -1) return null;
    var playerCluster = assignments[playerIdx];
    var clusterMembers = eligibleFp.filter(function (_, i) {
      return assignments[i] === playerCluster;
    });
    var clusterVecs = vectors.filter(function (_, i) {
      return assignments[i] === playerCluster;
    });
    var dims = ['volume', 'efficiency', 'shooting', 'creation', 'rebounding', 'defense'];
    var centroid = dims.map(function (_, di) {
      return (
        clusterVecs.reduce(function (s, v) {
          return s + v[di];
        }, 0) / clusterVecs.length
      );
    });
    var sortedDims = dims.slice().sort(function (a, b) {
      return centroid[dims.indexOf(b)] - centroid[dims.indexOf(a)];
    });
    var LABELS = {
      'volume+efficiency': 'Scoreur Dominant',
      'volume+creation': 'Moteur Offensif',
      'volume+shooting': 'Scoreur Extérieur',
      'volume+interior': 'Force Intérieure',
      'rebounding+defense': 'Ancre Défensive',
      'defense+rebounding': 'Ancre Défensive',
      'shooting+efficiency': 'Spacer Élite',
      'creation+efficiency': 'Maestro',
      'efficiency+shooting': 'Tireur Clinique',
      'creation+volume': 'Moteur Offensif',
    };
    var key = sortedDims[0] + '+' + sortedDims[1];
    var label =
      LABELS[key] || 'Profil ' + sortedDims[0].charAt(0).toUpperCase() + sortedDims[0].slice(1);
    return {
      label: label,
      topDim: sortedDims[0],
      members: clusterMembers.map(function (p) {
        return { id: p.id, name: p.name, number: p.number };
      }),
      size: clusterMembers.length,
    };
  },
  _impact: (playerStats) => {
    const Ois =
      playerStats.avg.pts +
      playerStats.avg.ast * 1.5 +
      playerStats.avg.reb * 1.2 +
      playerStats.avg.oreb * 1.2 +
      playerStats.avg.fte * 1.2 -
      playerStats.avg.tov * 1.5;
    const Dis =
      playerStats.avg.stl * 2 +
      playerStats.avg.blk * 2 +
      playerStats.avg.dreb -
      playerStats.avg.fouls * 0.7 +
      playerStats.avg.plusMinus * 0.3;
    const Impact = playerStats.avg.min > 0 ? ((Ois + Dis) / playerStats.avg.min) * 40 : 0;
    return Impact;
  },
  _calcPlayerNetRtg: (playerStat, teamTotals, oppTotals, teamMin) => {
    const pMin = parseFloat(playerStat.min || playerStat.minutes || 0);
    const poss = window.StatsEngine.possAdvanced(teamTotals, oppTotals);
    const pm = parseFloat(playerStat.plusMinus || 0);
    return window.StatsEngine.playerNetRtg(pm, poss, pMin, teamMin);
  },

  /**
   * Agrège les stats ON/OFF court d'un joueur sur tous les matchs PBP.
   * Ne prend en compte que les matchs ayant actions[0].onCourt défini.
   */
  calcOnOffAggregated: (games, playerId, roster) => {
    if (!games || !roster) return null;

    const homeIds = new Set(roster.map(p => p.id || parseInt(p.id)));
    const agg = {
      on:  { pts: 0, ptsConceded: 0, fga: 0, fta: 0, tov: 0, orb: 0, oppFga: 0, oppFta: 0, oppTov: 0, oppOrb: 0 },
      off: { pts: 0, ptsConceded: 0, fga: 0, fta: 0, tov: 0, orb: 0, oppFga: 0, oppFta: 0, oppTov: 0, oppOrb: 0 },
    };
    let gamesUsed = 0;

    games.forEach(game => {
      if (!game.actions || !game.actions.length) return;
      if (!game.actions[0].onCourt) return;
      gamesUsed++;

      game.actions.forEach(a => {
        if (!a.onCourt) return;
        const isHome = homeIds.has(a.pid);
        const playerOn = a.onCourt.includes(playerId) || a.onCourt.includes(Number(playerId));
        const seg = playerOn ? agg.on : agg.off;

        if (a.type === 'SHOT') {
          if (isHome) { seg.fga++; if (a.made) seg.pts += a.val; }
          else        { seg.oppFga++; if (a.made) seg.ptsConceded += a.val; }
        }
        if (a.type === 'FT') {
          if (isHome) { seg.fta += (a.ftAtt || 0); seg.pts += (a.ftMade || 0); }
          else        { seg.oppFta += (a.ftAtt || 0); seg.ptsConceded += (a.ftMade || 0); }
        }
        if (a.type === 'TOV') { if (isHome) seg.tov++; else seg.oppTov++; }
        if (a.type === 'OREB') { if (isHome) seg.orb++; else seg.oppOrb++; }
      });
    });

    if (gamesUsed === 0) return null;

    const calcRatings = (s) => {
      const poss    = Math.max(1, s.fga + 0.44 * s.fta + s.tov - s.orb);
      const oppPoss = Math.max(1, s.oppFga + 0.44 * s.oppFta + s.oppTov - s.oppOrb);
      const avgP    = (poss + oppPoss) / 2 || 1;
      return {
        pts: s.pts,
        ptsConceded: s.ptsConceded,
        poss: Math.round(avgP),
        ortg: Math.round((s.pts / avgP) * 100),
        drtg: Math.round((s.ptsConceded / avgP) * 100),
      };
    };

    const on  = calcRatings(agg.on);
    const off = calcRatings(agg.off);
    return {
      on,
      off,
      netOn:   on.ortg - on.drtg,
      netOff:  off.ortg - off.drtg,
      netDiff: (on.ortg - on.drtg) - (off.ortg - off.drtg),
      gamesUsed,
    };
  },

  /**
   * Calcule les moyennes d'un joueur par phase.
   */
  calcPhaseProgression: (player, phases, games) => {
    if (!phases || phases.length < 2 || !player.logs || player.logs.length === 0) return null;
    if (!games) return null;

    const gamePhaseMap = {};
    games.forEach(g => {
      if (g.phase) gamePhaseMap[g.date + '||' + (g.opponent || '')] = g.phase;
    });

    const phaseMap = {};
    phases.forEach(ph => { phaseMap[ph.id] = { id: ph.id, name: ph.name, logs: [] }; });

    player.logs.forEach(log => {
      const key = log.date + '||' + log.opponent;
      const phId = gamePhaseMap[key];
      if (phId && phaseMap[phId]) phaseMap[phId].logs.push(log);
    });

    const results = Object.values(phaseMap)
      .filter(ph => ph.logs.length > 0)
      .map(ph => {
        const n = ph.logs.length;
        const s = (k) => ph.logs.reduce((a, l) => a + (l[k] || 0), 0);
        const totalFga = s('fga'), totalFgm = s('fgm');
        const totalThreea = s('threea'), totalThreem = s('threem');
        const totalFta = s('fta'), totalFtm = s('ftm');
        const totalPts = s('pts');
        return {
          phaseId: ph.id,
          phaseName: ph.name,
          gp: n,
          avg: {
            pts:      s('pts') / n,
            reb:      s('reb') / n,
            ast:      s('ast') / n,
            stl:      s('stl') / n,
            blk:      s('blk') / n,
            tov:      s('tov') / n,
            eff:      s('eff') / n,
            usage:    s('usage') / n,
            min:      s('min') / n,
            fgPct:    totalFga > 0 ? (totalFgm / totalFga * 100) : 0,
            threePct: totalThreea > 0 ? (totalThreem / totalThreea * 100) : 0,
            ftPct:    totalFta > 0 ? (totalFtm / totalFta * 100) : 0,
            TS:       window.StatsEngine.TS(totalPts, totalFga, totalFta),
          },
        };
      });

    const phaseOrder = phases.map(ph => ph.id);
    results.sort((a, b) => phaseOrder.indexOf(a.phaseId) - phaseOrder.indexOf(b.phaseId));

    return results.length >= 2 ? results : null;
  },

  /**
   * Compare les stats d'un joueur entre la saison courante et une saison archivée.
   * Matching par id identique uniquement.
   */
  calcSeasonComparison: (currentPlayer, archivedSeason) => {
    if (!archivedSeason || !archivedSeason.roster || !archivedSeason.games) return null;

    const archRoster = archivedSeason.roster;
    const archPlayer = archRoster.find(r =>
      r.id === currentPlayer.id ||
      String(r.id) === String(currentPlayer.id) ||
      Number(r.id) === Number(currentPlayer.id)
    );
    if (!archPlayer) return null;

    const archPlayers = AnalysisEngine.processPlayerData(archivedSeason.games, archRoster);
    const archProcessed = archPlayers.find(ap =>
      ap.id === currentPlayer.id ||
      String(ap.id) === String(currentPlayer.id) ||
      Number(ap.id) === Number(currentPlayer.id)
    );
    if (!archProcessed || !archProcessed.logs || archProcessed.logs.length === 0) return null;

    const KEYS = ['pts','reb','ast','stl','blk','tov','eff','usage','min','fgPct','threePct','ftPct','TS'];
    const deltas = {};
    KEYS.forEach(k => {
      deltas[k] = (currentPlayer.avg[k] || 0) - (archProcessed.avg[k] || 0);
    });

    return {
      archivedName: archivedSeason.name || 'Archive',
      archivedGp: archProcessed.logs.length,
      archivedAvg: archProcessed.avg,
      deltas,
    };
  },

  // --- PROCESSEUR PRINCIPAL ---
  processPlayerData: (games, roster) => {
    if (!roster || !Array.isArray(roster)) return [];

    const gameContext = {};
    if (games && Array.isArray(games)) {
      games.forEach((game) => {
        const rawData = game.players || game.playerStats;
        if (!rawData) return;
        const list = Array.isArray(rawData) ? rawData : Object.values(rawData);
        const team = { min: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, tov: 0, oreb: 0, dreb: 0 };
        list.forEach((s) => {
          team.min += parseFloat(s.min || s.minutes || 0);
          team.fga += parseFloat(s.fga || 0);
          team.fgm += parseFloat(s.fgm || 0);
          team.fta += parseFloat(s.fta || 0);
          team.ftm += parseFloat(s.ftm || 0);
          team.tov += parseFloat(s.tov || 0);
          team.oreb += parseFloat(s.oreb || 0);
          team.dreb += parseFloat(s.dreb || 0);
        });
        const opp = game.opponentStats || game.oppStats || null;
        gameContext[game.id] = { team, opp };
      });
    }

    const playerMap = {};
    roster.forEach((p) => (playerMap[p.id] = { ...p, logs: [] }));

    if (games && Array.isArray(games)) {
      const sortedGames = [...games].sort(
        (a, b) => parseFrenchDate(b.date) - parseFrenchDate(a.date)
      );
      sortedGames.forEach((game) => {
        const rawData = game.players || game.playerStats;
        if (!rawData) return;
        const ctx = gameContext[game.id] || {
          team: { min: 200, fga: 50, fta: 10, tov: 10, oreb: 0, dreb: 0, fgm: 20, ftm: 5 },
          opp: null,
        };
        let matchStats = Array.isArray(rawData)
          ? rawData
          : Object.keys(rawData).map((key) => ({ ...rawData[key], id: rawData[key].id || key }));

        matchStats.forEach((stat) => {
          if (!playerMap[stat.id]) {
            playerMap[stat.id] = {
              id: stat.id,
              name: stat.name || `#${stat.number}`,
              number: stat.number,
              logs: [],
            };
          }
          const min = parseFloat(stat.min || stat.minutes || 0);
          const pts = parseFloat(stat.pts || 0);
          const fga = parseFloat(stat.fga || 0);
          const fouls = parseFloat(stat.fouls || stat.pf || 0);

          if (min > 0 || pts > 0 || fouls > 0 || fga > 0) {
            const reb =
              parseFloat(stat.reb || 0) > 0
                ? parseFloat(stat.reb)
                : parseFloat(stat.oreb || 0) + parseFloat(stat.dreb || 0);
            const ast = parseFloat(stat.ast || 0);
            const stl = parseFloat(stat.stl || 0);
            const blk = parseFloat(stat.blk || 0);
            const tov = parseFloat(stat.tov || 0);
            const fgm = parseFloat(stat.fgm || 0);
            const fta = parseFloat(stat.fta || 0);
            const ftm = parseFloat(stat.ftm || 0);
            const oreb = parseFloat(stat.oreb || 0);
            const threea = parseFloat(stat.threea || stat.threePA || 0);
            const threem = parseFloat(stat.threem || stat.threePM || 0);
            const eff = window.StatsEngine.EFF(pts, reb, ast, stl, blk, fga, fgm, fta, ftm, tov);
            // Usage%
            const teamPoss = window.StatsEngine.possSimple(
              ctx.team.fga,
              ctx.team.fta,
              ctx.team.tov,
              0
            );
            const usage = window.StatsEngine.usageRate(fga, fta, tov, min, ctx.team.min, teamPoss);
            const netRtg = AnalysisEngine._calcPlayerNetRtg(stat, ctx.team, ctx.opp, ctx.team.min);
            playerMap[stat.id].logs.push({
              date: game.date || '',
              rawDate: parseFrenchDate(game.date),
              opponent: game.opponent || 'N/A',
              isWin: parseInt(game.homeScore) > parseInt(game.awayScore),
              pts,
              reb,
              ast,
              stl,
              blk,
              tov,
              fga,
              fgm,
              fta,
              ftm,
              threea,
              threem,
              oreb,
              min,
              fouls,
              plusMinus: parseFloat(stat.plusMinus || 0),
              eff,
              usage,
              netRtg,
              _hasFteData: stat.foulDrawn !== undefined,
              foulDrawn: parseFloat(stat.foulDrawn || 0),
            });
            // Accumuler les totaux team pour AST%/TOV% agrégés
            if (!playerMap[stat.id]._teamAgg) {
              playerMap[stat.id]._teamAgg = { teamMin: 0, teamFgm: 0 };
            }
            playerMap[stat.id]._teamAgg.teamMin += ctx.team.min;
            playerMap[stat.id]._teamAgg.teamFgm += ctx.team.fgm;
          }
        });
      });
    }

    return Object.values(playerMap)
      .map((p) => {
        p.logs.sort((a, b) => b.rawDate - a.rawDate);
        const gp = p.logs.length;
        if (gp === 0)
          return {
            ...p,
            avg: {
              pts: 0,
              reb: 0,
              ast: 0,
              eff: 0,
              min: 0,
              usage: 0,
              TS: 0,
              eFG: 0,
              threePAr: 0,
              FTr: 0,
              astTov: 0,
              pf36: 0,
              netRtg: 0,
              fgPct: 0,
              threePct: 0,
              ftPct: 0,
              threea: 0,
              oreb: 0,
              stl: 0,
              blk: 0,
              tov: 0,
              fouls: 0,
              plusMinus: 0,
              impactTotal: 0,
              fte: 0,
              threem: 0,
              fga: 0,
              fgm: 0,
              fta: 0,
              ftm: 0,
              astPct: 0,
              tovPct: 0,
            },
          };
        const sum = (k) => p.logs.reduce((acc, c) => acc + (c[k] || 0), 0);
        const avg = {
          pts: sum('pts') / gp,
          reb: sum('reb') / gp,
          ast: sum('ast') / gp,
          stl: sum('stl') / gp,
          blk: sum('blk') / gp,
          tov: sum('tov') / gp,
          min: sum('min') / gp,
          eff: sum('eff') / gp,
          plusMinus: sum('plusMinus') / gp,
          oreb: sum('oreb') / gp,
          fouls: sum('fouls') / gp,
          usage: sum('usage') / gp,
          netRtg: sum('netRtg') / gp,
          fga: sum('fga'),
          fgm: sum('fgm'),
          threea: sum('threea'),
          threem: sum('threem'),
          fta: sum('fta'),
          ftm: sum('ftm'),
        };
        avg.fgPct = window.StatsEngine.safe(avg.fgm, avg.fga, 100);
        avg.threePct = window.StatsEngine.safe(avg.threem, avg.threea, 100);
        avg.ftPct = window.StatsEngine.safe(avg.ftm, avg.fta, 100);
        avg.threePAr = window.StatsEngine.threePAr(avg.threea, avg.fga);
        avg.FTr = window.StatsEngine.FTr(avg.fta, avg.fga);
        avg.TS = window.StatsEngine.TS(sum('pts'), avg.fga + avg.threea, avg.fta);
        avg.eFG = window.StatsEngine.eFG(avg.fgm, avg.threem, avg.fga);
        avg.astTov = window.StatsEngine.astTovRatio(avg.ast, avg.tov);
        avg.pf36 = window.StatsEngine.per36(avg.fouls, avg.min);
        // AST% et TOV% agrégés sur totaux
        const totalAst = sum('ast');
        const totalFga = sum('fga');
        const totalFta = sum('fta');
        const totalTov = sum('tov');
        const totalFgm = sum('fgm');
        const totalMin = sum('min');
        const tmAgg = p._teamAgg || { teamMin: 0, teamFgm: 0 };
        avg.astPct = Math.min(window.StatsEngine.astPct(
          totalAst, totalMin, tmAgg.teamMin, tmAgg.teamFgm, totalFgm
        ), 100);
        avg.tovPct = Math.min(window.StatsEngine.tovPct(totalTov, totalFga, totalFta), 100);
        // FTE
        const trackedLogs = p.logs.filter((l) => l._hasFteData);
        const untrackedLogs = p.logs.filter((l) => !l._hasFteData);
        let totalFte;
        if (trackedLogs.length > 0) {
          const trackedFte = trackedLogs.reduce((a, l) => a + (l.foulDrawn || 0), 0);
          const trackedMin = trackedLogs.reduce((a, l) => a + (l.min || 0), 0);
          const ftePerMin = trackedMin > 0 ? trackedFte / trackedMin : 0;
          const estimatedFte = untrackedLogs.reduce((a, l) => a + ftePerMin * (l.min || 0), 0);
          totalFte = trackedFte + estimatedFte;
        } else {
          totalFte = sum('fta') / 2;
        }
        avg.fte = totalFte / gp;
        // Impact Total
        const dreb_pg = avg.reb - avg.oreb;
        const OIS = window.StatsEngine.OIS(
          avg.pts,
          avg.ast,
          avg.oreb,
          avg.fte,
          avg.tov,
          avg.fga,
          avg.fgm,
          avg.fta,
          avg.ftm
        );
        const DIS = window.StatsEngine.DIS(avg.stl, avg.blk, dreb_pg, avg.fouls, avg.plusMinus);
        avg.impactTotal = window.StatsEngine.impactTotal(OIS, DIS, avg.min);
        if ((avg.netRtg || 0) < 0 && (avg.plusMinus || 0) < 0) {
          avg.impactTotal = Math.min(avg.impactTotal, 95);
        }

        // --- SHOT PROFILE (zones de tir) ---
        var shotProfile = { paint: 0, mid: 0, three_corner: 0, three_ab: 0, total: 0 };
        if (games && Array.isArray(games)) {
          games.forEach(function (g) {
            if (!g.actions || !g.actions.length) return;
            g.actions.forEach(function (a) {
              if (a.type !== 'SHOT') return;
              var aPid = a.pid;
              if (aPid !== p.id && aPid !== Number(p.id) && Number(aPid) !== Number(p.id)) return;
              var zone = classifyShotZone(a.x, a.y, a.val);
              shotProfile[zone] = (shotProfile[zone] || 0) + 1;
              shotProfile.total++;
            });
          });
        }
        var sp = {
          paintPct:
            shotProfile.total > 0 ? Math.round((shotProfile.paint / shotProfile.total) * 100) : 0,
          midPct:
            shotProfile.total > 0 ? Math.round((shotProfile.mid / shotProfile.total) * 100) : 0,
          cornerPct:
            shotProfile.total > 0
              ? Math.round((shotProfile.three_corner / shotProfile.total) * 100)
              : 0,
          abPct:
            shotProfile.total > 0
              ? Math.round((shotProfile.three_ab / shotProfile.total) * 100)
              : 0,
          totalShots: shotProfile.total,
        };
        window.console.log(
          `Player ${p.name} ois= ${OIS} miss ttt = ${(avg.fga - avg.fgm + (avg.fta - avg.ftm)) * 0.8}dis= ${DIS} tir tt= ${avg.fga} ts=${avg.TS} calcul TS% ${window.StatsEngine.TS(avg.pts, avg.fga, avg.fta)} efg=${avg.eFG} 3PAr=${avg.threePAr} FTr=${avg.FTr} astTov=${avg.astTov}`
        );
        return { ...p, avg, shotProfile: sp };
      })
      .sort((a, b) => b.avg.eff - a.avg.eff);
  },

  // --- ARCHETYPE ---
  // --- FINGERPRINT (8 dimensions) ---
  computeFingerprint: function (p, allPlayers, games) {
    var avg = p.avg || p;
    var gp = (p.logs && p.logs.length) || 1;
    var B = getBenchmarks();

    var rotation =
      Array.isArray(allPlayers) && allPlayers.length > 0
        ? allPlayers.filter(function (x) {
            return x && x.avg && x.avg.min >= 12 && x.logs && x.logs.length >= 3;
          })
        : [];

    var pct = function (valueFn) {
      if (rotation.length < 3) return -1;
      var vals = rotation.map(valueFn).sort(function (a, b) {
        return a - b;
      });
      var myVal = valueFn(p);
      var below = 0;
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] < myVal) below++;
      }
      return Math.round((below / Math.max(1, vals.length - 1)) * 100);
    };

    var threeaPerGame = (avg.threea || 0) / gp;
    var fgaPerGame = (avg.fga || 0) / gp;
    var stlBlk = (avg.stl || 0) + (avg.blk || 0);

    var raw = {};

    // Facteur d'ajustement global (Ex: 0.85 réduit toutes les notes finales de 15% maximum)
    // Modifie cette valeur selon le niveau réel de la ligue (ex: 0.70 pour un niveau amateur)
    var NON_ELITE_FACTOR = 0.85;

    // 1. VOLUME
    var usagePct = pct(function (x) {
      return x.avg.usage || 0;
    });
    // Retrait du modérateur *0.8 sur le dénominateur pour exiger un vrai usage élite
    var ptsNorm = Math.min(100, ((avg.pts || 0) / B.usage_high) * 90);
    var volumeRaw =
      usagePct >= 0
        ? Math.round(usagePct * 0.6 + ptsNorm * 0.4)
        : Math.round(Math.min(100, ((avg.usage || 0) / B.usage_high) * 70)); // 80 -> 70
    raw.volume = Math.round(volumeRaw * NON_ELITE_FACTOR);

    // 2. EFFICIENCY
    var tsRange = B.ts_elite - B.ts_bad;
    // Réduction des multiplicateurs de base pour que l'efficacité moyenne donne une note plus basse
    var tsNorm =
      tsRange > 0 ? Math.min(100, Math.max(0, (((avg.TS || 0) - B.ts_bad) / tsRange) * 85)) : 50;
    var efgNorm = Math.min(100, (avg.eFG || 0) * 1.2); // 1.5 -> 1.2
    raw.efficiency = Math.round((tsNorm * 0.7 + efgNorm * 0.3) * NON_ELITE_FACTOR);

    // 3. SHOOTING
    // Exige 7 tirs à 3pts/match au lieu de 5 pour atteindre les 100% de volume
    var threeVolScore = Math.min(100, (threeaPerGame / 7) * 100);
    // Plage de pourcentage plus sévère (réduit l'impact d'un % correct avec peu de volume)
    var threePctScore = Math.min(
      100,
      Math.max(0, (((avg.threePct || 0) - (B.threePct_good - 5)) / 25) * 100)
    );
    var threeParScore = Math.min(100, ((avg.threePAr || 0) / 0.6) * 100); // Exige 60% au lieu de 50%
    var shootingRaw = Math.round(threeVolScore * 0.35 + threePctScore * 0.4 + threeParScore * 0.25);
    // Pénalité plus forte si très peu de tirs (max 20 au lieu de 30)
    shootingRaw = threeaPerGame < 1 ? Math.min(20, shootingRaw) : shootingRaw;
    raw.shooting = Math.round(shootingRaw * NON_ELITE_FACTOR);

    // 4. CREATION
    // Les passes et l'Ast/Tov ratio rapportent moins de points
    var astNorm = Math.min(100, ((avg.ast || 0) / B.ast_good) * 65); // 80 -> 65
    var ratioNorm = Math.min(100, ((avg.astTov || 0) / B.astTov_good) * 55); // 70 -> 55
    var createRaw = Math.round(astNorm * 0.6 + ratioNorm * 0.4);
    createRaw = (avg.ast || 0) < 1.0 ? Math.min(15, createRaw) : createRaw; // 25 -> 15
    raw.creation = Math.round(createRaw * NON_ELITE_FACTOR);

    // 5. REBOUNDING
    var rebNorm = Math.min(100, ((avg.reb || 0) / B.reb_dom) * 70); // 85 -> 70
    var orebBonus = Math.min(15, ((avg.oreb || 0) / B.oreb_good) * 15); // 20 -> 15
    raw.rebounding = Math.round(Math.min(100, rebNorm + orebBonus) * NON_ELITE_FACTOR);

    // 6. INTERIOR
    var ftrNorm = Math.min(100, ((avg.FTr || 0) / 0.6) * 50); // 0.5->0.6, 60->50
    var orebNorm = Math.min(100, ((avg.oreb || 0) / B.oreb_good) * 40); // 50->40
    var twoPtProportion = fgaPerGame > 0 ? fgaPerGame / (fgaPerGame + threeaPerGame) : 0.5;
    var twoPtNorm = twoPtProportion * 50; // 60->50
    raw.interior = Math.round(
      Math.min(100, ftrNorm * 0.35 + orebNorm * 0.3 + twoPtNorm * 0.35) * NON_ELITE_FACTOR
    );

    // 7. DEFENSE
    var defNorm = Math.min(100, (stlBlk / B.def_active) * 60); // 75->60
    // La pénalité pour les fautes commence plus tôt et frappe plus fort
    var foulPenalty =
      (avg.pf36 || 0) > B.pf36_warn - 0.5
        ? Math.min(25, ((avg.pf36 - (B.pf36_warn - 0.5)) / 2) * 25)
        : 0;
    var defPct = pct(function (x) {
      return (x.avg.stl || 0) + (x.avg.blk || 0);
    });
    var defenseRaw =
      defPct >= 0
        ? Math.max(0, defPct * 0.4 + defNorm * 0.6 - foulPenalty) // Plus de poids sur la norme absolue
        : Math.max(0, defNorm - foulPenalty);
    raw.defense = Math.round(defenseRaw * NON_ELITE_FACTOR);

    // 8. IMPACT
    // Echelles étendues pour qu'il soit plus dur d'avoir un bon netRtg ou une bonne éval
    var netNorm = Math.min(100, Math.max(0, (((avg.netRtg || 0) + 10) / 35) * 85));
    var pmNorm = Math.min(100, Math.max(0, (((avg.plusMinus || 0) + 5) / 25) * 85));
    var effNorm = Math.min(100, ((avg.eff || 0) / 25) * 85); // Exige une éval de 25+ (au lieu de 20)
    raw.impact = Math.round((netNorm * 0.35 + pmNorm * 0.25 + effNorm * 0.4) * NON_ELITE_FACTOR);

    var dims = [
      'volume',
      'efficiency',
      'shooting',
      'creation',
      'rebounding',
      'interior',
      'defense',
      'impact',
    ];
    var fp = {};
    dims.forEach(function (d) {
      fp[d] = Math.max(0, Math.min(100, raw[d] || 0));
    });
    return fp;
  },

  // Similarité cosinus entre deux fingerprints
  _cosineSim: function (a, b) {
    var dims = [
      'volume',
      'efficiency',
      'shooting',
      'creation',
      'rebounding',
      'interior',
      'defense',
      'impact',
    ];
    var dotProduct = 0,
      normA = 0,
      normB = 0;
    dims.forEach(function (d) {
      var va = a[d] || 0,
        vb = b[d] || 0;
      dotProduct += va * vb;
      normA += va * va;
      normB += vb * vb;
    });
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },

  // Similarité shot profile
  _shotSim: function (a, b) {
    if (!a || !b || a.totalShots < 10) return 0;
    var keys = ['paintPct', 'midPct', 'cornerPct', 'abPct'];
    var dot = 0,
      nA = 0,
      nB = 0;
    keys.forEach(function (k) {
      var va = a[k] || 0,
        vb = b[k] || 0;
      dot += va * vb;
      nA += va * va;
      nB += vb * vb;
    });
    if (nA === 0 || nB === 0) return 0;
    return dot / (Math.sqrt(nA) * Math.sqrt(nB));
  },
  // Extrait les vecteurs Style et Production depuis un joueur traité par processPlayerData
  extractPlayerStyleAndProd: function (player) {
    var avg = player.avg;
    if (!avg) return null;

    var prod = {
      pts: avg.pts || 0,
      reb: avg.reb || 0,
      ast: avg.ast || 0,
      stl: avg.stl || 0,
      blk: avg.blk || 0,
      tov: avg.tov || 0,
      TS: avg.TS || 0,
      usage: avg.usage || 0,
      eff: avg.eff || 0,
    };

    var style = {
      astRatio: prod.ast / Math.max(1, prod.ast + prod.pts),
      rebRatio: prod.reb / Math.max(1, prod.reb + prod.ast + prod.pts),
      defRatio: (prod.stl + prod.blk) / Math.max(1, prod.stl + prod.blk + prod.ast + prod.reb),
      threePAr: avg.threePAr || 0,
      ftRate: avg.FTr || 0,
      usageNorm: (avg.usage || 0) / 35,
    };

    return { style: style, prod: prod };
  },

  // Trouver le meilleur match NBA (Double Axe + Entonnoir)
  findNBAComparison: function (fingerprint, shotProfile, player) {
    var self = this;
    var profiles = window.NBA_PROFILES || [];

    // Guard : pas de base NBA ou pas de joueur
    if (profiles.length === 0 || !player || !player.avg) {
      return {
        best: { name: null, similarity: 0, desc: '' },
        second: { name: null, similarity: 0, desc: '' },
        styleTwin: null,
        top5: [],
        isAnomaly: false,
        shotMatchUsed: false,
      };
    }

    // Extraire les vecteurs du joueur analysé
    var playerVec = self.extractPlayerStyleAndProd(player);
    if (!playerVec) {
      return {
        best: { name: null, similarity: 0, desc: '' },
        second: { name: null, similarity: 0, desc: '' },
        styleTwin: null,
        top5: [],
        isAnomaly: false,
        shotMatchUsed: false,
      };
    }

    // ═══ AXE 1 : STYLE (Similarité Cosinus sur vecteurs style) ═══
    var STYLE_KEYS = ['astRatio', 'rebRatio', 'defRatio', 'threePAr', 'ftRate', 'usageNorm'];

    function cosineOnKeys(vecA, vecB, keys) {
      var dot = 0,
        magA = 0,
        magB = 0;
      keys.forEach(function (k) {
        var a = vecA[k] || 0,
          b = vecB[k] || 0;
        dot += a * b;
        magA += a * a;
        magB += b * b;
      });
      magA = Math.sqrt(magA);
      magB = Math.sqrt(magB);
      return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
    }

    var styleRanking = [];
    profiles.forEach(function (nba) {
      if (!nba.style) return;
      var sim = cosineOnKeys(playerVec.style, nba.style, STYLE_KEYS);
      styleRanking.push({ name: nba.name, desc: nba.desc || '', similarity: sim });
    });
    styleRanking.sort(function (a, b) {
      return b.similarity - a.similarity;
    });

    var styleTwin = styleRanking.length > 0 ? styleRanking[0] : null;

    // ═══ AXE 2 : PRODUCTION (Distance Euclidienne normalisée) ═══
    var PROD_KEYS = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'TS', 'usage', 'eff'];
    var NORM = { pts: 35, reb: 15, ast: 12, stl: 3, blk: 3, tov: 5, TS: 70, usage: 35, eff: 35 };

    function euclideanNorm(vecA, vecB) {
      var sum = 0;
      PROD_KEYS.forEach(function (k) {
        var a = (vecA[k] || 0) / NORM[k];
        var b = (vecB[k] || 0) / NORM[k];
        sum += (a - b) * (a - b);
      });
      return Math.sqrt(sum);
    }

    var prodRanking = [];
    profiles.forEach(function (nba) {
      if (!nba.prod) return;
      var dist = euclideanNorm(playerVec.prod, nba.prod);
      prodRanking.push({
        name: nba.name,
        desc: nba.desc || '',
        dist: dist,
        shot: nba.shot || null,
      });
    });
    prodRanking.sort(function (a, b) {
      return a.dist - b.dist;
    });

    // ═══ ENTONNOIR : Top 5 Production ═══
    var top5 = prodRanking.slice(0, 5);

    // ═══ FILTRE SHOT PROFILE (départage dans le Top 5) ═══
    var primaryMatch = top5[0] || null;
    var isAnomaly = false;
    var shotMatchUsed = false;

    var hasShotData = shotProfile && shotProfile.totalShots >= 10;

    if (hasShotData && top5.length > 0) {
      var SHOT_ANOMALY_THRESHOLD = 0.25;

      var top5WithShot = top5.map(function (nba) {
        var sSim = nba.shot ? self._shotSim(shotProfile, nba.shot) : 0;
        return { name: nba.name, desc: nba.desc, dist: nba.dist, shotSim: sSim };
      });

      var top5ByShotSim = top5WithShot.slice().sort(function (a, b) {
        return b.shotSim - a.shotSim;
      });

      var bestShotInTop5 = top5ByShotSim[0];

      if (bestShotInTop5.shotSim < SHOT_ANOMALY_THRESHOLD) {
        isAnomaly = true;
      } else {
        primaryMatch = bestShotInTop5;
        shotMatchUsed = true;
      }
    }

    // ═══ CONSTRUCTION DU RETOUR ═══
    var prodDist = primaryMatch ? primaryMatch.dist : 999;
    var prodSimilarity = Math.max(0, Math.round((1 - Math.min(prodDist / 2.0, 1)) * 100));

    var secondMatch = top5[1] || null;
    var secondSimilarity = 0;
    if (secondMatch) {
      secondSimilarity = Math.max(0, Math.round((1 - Math.min(secondMatch.dist / 2.0, 1)) * 100));
    }

    return {
      best: {
        name: primaryMatch ? primaryMatch.name : null,
        similarity: prodSimilarity,
        desc: primaryMatch ? primaryMatch.desc : '',
      },
      second: {
        name: secondMatch ? secondMatch.name : null,
        similarity: secondSimilarity,
        desc: secondMatch ? secondMatch.desc : '',
      },
      styleTwin: styleTwin
        ? {
            name: styleTwin.name,
            similarity: Math.round(styleTwin.similarity * 100),
            desc: styleTwin.desc,
          }
        : null,
      top5: top5.map(function (p) {
        return {
          name: p.name,
          dist: Math.round(p.dist * 1000) / 1000,
        };
      }),
      isAnomaly: isAnomaly,
      shotMatchUsed: shotMatchUsed,
    };
  },

  // --- ARCHETYPE (basé sur fingerprint) ---
  getArchetype: function (p, allPlayers, games) {
    var EMPTY = {
      name: 'Non Évalué',
      desc: 'Données manquantes.',
      secondary: null,
      tags: [],
      color: 'text-slate-500',
      border: 'border-slate-700',
      bg: 'bg-slate-800',
      tier: -1,
      fingerprint: null,
      nbaComp: null,
    };
    if (!p) return EMPTY;
    var avg = p.avg || p;
    if (!avg || typeof avg !== 'object' || (avg.pts === undefined && avg.reb === undefined))
      return { ...EMPTY, desc: 'Pas de données.' };

    var gp = (p.logs && p.logs.length) || 0;
    var B = getBenchmarks();

    if (gp < 3) {
      return {
        name: 'En Observation',
        desc: gp + ' match' + (gp > 1 ? 's' : '') + ' — profil non stabilisé.',
        secondary: null,
        tags: [],
        color: 'text-slate-500',
        border: 'border-slate-600',
        bg: 'bg-slate-800/50',
        tier: 0,
        fingerprint: null,
        nbaComp: null,
      };
    }

    var fp = AnalysisEngine.computeFingerprint(p, allPlayers || [], games);
    var sp = p.shotProfile || null;
    var nbaComp = AnalysisEngine.findNBAComparison(fp, sp, p);

    if ((avg.min || 0) < 12) {
      return AnalysisEngine._classifyDevelopment(avg, gp, fp, nbaComp, B);
    }

    return AnalysisEngine._classifyFromFingerprint(fp, avg, gp, nbaComp, B);
  },

  // Classification développement (tier 4)
  _classifyDevelopment: function (avg, gp, fp, nbaComp, B) {
    var per30 = function (stat) {
      return (avg.min || 0) > 0 ? (stat / avg.min) * 30 : 0;
    };
    var p30 = {
      pts: per30(avg.pts || 0),
      ast: per30(avg.ast || 0),
      stl: per30(avg.stl || 0),
      blk: per30(avg.blk || 0),
      reb: per30(avg.reb || 0),
      oreb: per30(avg.oreb || 0),
    };

    var tags = [];
    if (p30.pts >= 10 && (avg.TS || 0) >= B.ts_good) tags.push('Finit');
    if ((avg.threePct || 0) >= B.threePct_good - 3) tags.push('Tire');
    if (p30.ast >= 3) tags.push('Crée');
    if (p30.stl + p30.blk >= 2.5) tags.push('Défend');
    if (p30.reb >= 8) tags.push('Rebond');
    if (p30.oreb >= 2.5) tags.push('Hustle');
    tags = tags.slice(0, 3);

    var dims = [
      'volume',
      'efficiency',
      'shooting',
      'creation',
      'rebounding',
      'interior',
      'defense',
      'impact',
    ];
    var sorted = dims.slice().sort(function (a, b) {
      return (fp[b] || 0) - (fp[a] || 0);
    });
    var top = sorted[0];
    var sec = sorted[1];

    var PROSPECT_MAP = {
      volume: {
        name: 'Prospect Scoreur',
        color: 'text-orange-300',
        border: 'border-orange-500/50',
        bg: 'bg-orange-900/15',
      },
      efficiency: {
        name: 'Prospect Efficace',
        color: 'text-green-300',
        border: 'border-green-500/50',
        bg: 'bg-green-900/15',
      },
      shooting: {
        name: 'Prospect Tireur',
        color: 'text-cyan-300',
        border: 'border-cyan-500/50',
        bg: 'bg-cyan-900/15',
      },
      creation: {
        name: 'Prospect Créateur',
        color: 'text-indigo-300',
        border: 'border-indigo-500/50',
        bg: 'bg-indigo-900/15',
      },
      rebounding: {
        name: 'Prospect Intérieur',
        color: 'text-blue-300',
        border: 'border-blue-500/50',
        bg: 'bg-blue-900/15',
      },
      interior: {
        name: 'Prospect Peinture',
        color: 'text-blue-300',
        border: 'border-blue-500/50',
        bg: 'bg-blue-900/15',
      },
      defense: {
        name: 'Prospect Défensif',
        color: 'text-red-300',
        border: 'border-red-500/50',
        bg: 'bg-red-900/15',
      },
      impact: {
        name: 'Prospect Impact',
        color: 'text-yellow-300',
        border: 'border-yellow-500/50',
        bg: 'bg-yellow-900/15',
      },
    };

    var DIM_LABELS = {
      volume: 'Volume offensif',
      efficiency: 'Efficacité',
      shooting: 'Tir extérieur',
      creation: 'Création',
      rebounding: 'Rebond',
      interior: 'Jeu intérieur',
      defense: 'Défense',
      impact: 'Impact collectif',
    };

    var prospect = PROSPECT_MAP[top] || PROSPECT_MAP.volume;
    var bestScore = fp[top] || 0;

    if (bestScore < 25) {
      // Check hustle before defaulting to "En Construction"
      if (p30.oreb >= 2.5 || p30.stl >= 2.0) {
        return {
          name: 'Énergie de Banc',
          desc: 'Intensité sur courtes rotations.',
          secondary: DIM_LABELS[top] || null,
          tags: tags,
          color: 'text-rose-300',
          border: 'border-rose-500/50',
          bg: 'bg-rose-900/15',
          tier: 4,
          fingerprint: fp,
          nbaComp: nbaComp,
        };
      }
      return {
        name: 'En Construction',
        desc: 'Pas encore de profil identifiable.',
        secondary: null,
        tags: tags,
        color: 'text-slate-400',
        border: 'border-slate-500',
        bg: 'bg-slate-800/50',
        tier: 4,
        fingerprint: fp,
        nbaComp: nbaComp,
      };
    }

    return {
      name: prospect.name,
      desc: 'Profil émergent, dimension dominante : ' + (DIM_LABELS[top] || top) + '.',
      secondary: (fp[sec] || 0) >= 30 ? DIM_LABELS[sec] : null,
      tags: tags,
      color: prospect.color,
      border: prospect.border,
      bg: prospect.bg,
      tier: 4,
      fingerprint: fp,
      nbaComp: nbaComp,
    };
  },

  // Classification principale (tiers 1-3)
  _classifyFromFingerprint: function (fp, avg, gp, nbaComp, B) {
    var threeaPerGame = (avg.threea || 0) / (gp || 1);

    // 1. GÉNÉRATION DES TAGS (Propre, sans cascade de if)
    var tags = [
      fp.shooting >= 55 && threeaPerGame >= 2 && (avg.threePct || 0) >= 30 ? 'Tire' : null,
      fp.creation >= 55 && (avg.ast || 0) >= 2 ? 'Crée' : null,
      fp.defense >= 55 ? 'Défend' : null,
      fp.rebounding >= 55 ? 'Rebond' : null,
      fp.efficiency >= 65 && fp.volume >= 40 ? 'Finit' : null,
      fp.interior >= 60 && (avg.oreb || 0) >= B.oreb_good * 0.7 ? 'Hustle' : null,
      (avg.FTr || 0) >= 0.3 ? 'Provoque' : null,
      fp.impact >= 65 ? 'Impact+' : null,
    ]
      .filter(Boolean)
      .slice(0, 3); // Garde uniquement les valides, limite à 3

    var DIM_LABELS = {
      volume: 'Volume offensif',
      efficiency: 'Efficacité',
      shooting: 'Tir extérieur',
      creation: 'Création',
      rebounding: 'Rebond',
      interior: 'Jeu intérieur',
      defense: 'Défense',
      impact: 'Impact collectif',
    };

    var ARCHETYPE_MATRIX = {
      'volume+efficiency': {
        name: 'Alpha Scorer',
        tier: 1,
        color: 'text-orange-400',
        border: 'border-orange-500',
        bg: 'bg-orange-900/20',
        desc: 'Première option, ultra-efficace.',
      },
      'volume+shooting': {
        name: "Scoreur d'Élite",
        tier: 1,
        color: 'text-orange-400',
        border: 'border-orange-500',
        bg: 'bg-orange-900/20',
        desc: 'Scoreur à haut volume extérieur.',
      },
      'volume+creation': {
        name: 'Moteur Offensif',
        tier: 1,
        color: 'text-amber-400',
        border: 'border-amber-500',
        bg: 'bg-amber-900/20',
        desc: 'Crée pour lui et les autres.',
      },
      'volume+defense': {
        name: 'Two-Way Star',
        tier: 1,
        color: 'text-purple-400',
        border: 'border-purple-500',
        bg: 'bg-purple-900/20',
        desc: 'Domine des deux côtés du terrain.',
      },
      'volume+interior': {
        name: 'Force Intérieure',
        tier: 1,
        color: 'text-blue-400',
        border: 'border-blue-500',
        bg: 'bg-blue-900/20',
        desc: 'Puissance au poste, finition au cercle.',
      },
      'volume+rebounding': {
        name: 'Double-Double Machine',
        tier: 1,
        color: 'text-amber-300',
        border: 'border-amber-400',
        bg: 'bg-amber-900/15',
        desc: 'Scoring + présence au rebond.',
      },
      'volume+impact': {
        name: 'Franchise Player',
        tier: 1,
        color: 'text-yellow-400',
        border: 'border-yellow-500',
        bg: 'bg-yellow-900/20',
        desc: 'Le jeu tourne autour de lui.',
      },
      'efficiency+shooting': {
        name: 'Sniper Clinique',
        tier: 2,
        color: 'text-cyan-400',
        border: 'border-cyan-500',
        bg: 'bg-cyan-900/20',
        desc: 'Ultra-efficace, choix de tirs parfaits.',
      },
      'efficiency+creation': {
        name: 'Maestro',
        tier: 2,
        color: 'text-indigo-400',
        border: 'border-indigo-500',
        bg: 'bg-indigo-900/20',
        desc: 'Efficace et créateur, zéro déchet.',
      },
      'efficiency+interior': {
        name: 'Finisseur',
        tier: 2,
        color: 'text-green-400',
        border: 'border-green-500',
        bg: 'bg-green-900/20',
        desc: 'Convertit tout près du cercle.',
      },
      'efficiency+defense': {
        name: 'Two-Way Efficient',
        tier: 2,
        color: 'text-teal-400',
        border: 'border-teal-500',
        bg: 'bg-teal-900/20',
        desc: 'Rendement offensif élevé, présence défensive.',
      },
      'efficiency+rebounding': {
        name: 'Paint Beast',
        tier: 2,
        color: 'text-blue-400',
        border: 'border-blue-500',
        bg: 'bg-blue-900/20',
        desc: 'Finition + ancrage intérieur.',
      },
      'efficiency+impact': {
        name: 'Couteau Suisse',
        tier: 2,
        color: 'text-emerald-400',
        border: 'border-emerald-500',
        bg: 'bg-emerald-900/20',
        desc: 'Efficace partout, impact maximal.',
      },
      'shooting+creation': {
        name: 'Combo Guard',
        tier: 2,
        color: 'text-violet-400',
        border: 'border-violet-500',
        bg: 'bg-violet-900/20',
        desc: "Tire et crée depuis l'extérieur.",
      },
      'shooting+defense': {
        name: '3-and-D',
        tier: 2,
        color: 'text-teal-400',
        border: 'border-teal-500',
        bg: 'bg-teal-900/20',
        desc: 'Tire et défend. Profil moderne.',
      },
      'shooting+interior': {
        name: 'Stretch',
        tier: 3,
        color: 'text-pink-400',
        border: 'border-pink-500',
        bg: 'bg-pink-900/20',
        desc: 'Grand qui écarte le jeu.',
      },
      'shooting+rebounding': {
        name: 'Stretch Big',
        tier: 3,
        color: 'text-pink-400',
        border: 'border-pink-500',
        bg: 'bg-pink-900/20',
        desc: 'Pivot qui tire et rebondit.',
      },
      'shooting+impact': {
        name: "Sniper d'Impact",
        tier: 2,
        color: 'text-cyan-400',
        border: 'border-cyan-500',
        bg: 'bg-cyan-900/20',
        desc: 'Tireur qui change le match.',
      },
      'creation+defense': {
        name: 'Floor General',
        tier: 2,
        color: 'text-indigo-500',
        border: 'border-indigo-600',
        bg: 'bg-indigo-900/20',
        desc: 'Dirige le jeu des deux côtés.',
      },
      'creation+rebounding': {
        name: 'Point Forward',
        tier: 2,
        color: 'text-indigo-300',
        border: 'border-indigo-400',
        bg: 'bg-indigo-900/20',
        desc: "Crée depuis le poste d'ailier.",
      },
      'creation+interior': {
        name: 'Pivot Créateur',
        tier: 2,
        color: 'text-violet-400',
        border: 'border-violet-500',
        bg: 'bg-violet-900/20',
        desc: 'Playmaking depuis le poste bas.',
      },
      'creation+impact': {
        name: "Chef d'Orchestre",
        tier: 2,
        color: 'text-indigo-400',
        border: 'border-indigo-500',
        bg: 'bg-indigo-900/20',
        desc: 'Le collectif brille avec lui.',
      },
      'rebounding+defense': {
        name: 'Ancre Intérieure',
        tier: 2,
        color: 'text-blue-500',
        border: 'border-blue-600',
        bg: 'bg-blue-900/20',
        desc: 'Pilier de la raquette, verrou défensif.',
      },
      'rebounding+interior': {
        name: 'Raquette Dominante',
        tier: 2,
        color: 'text-blue-400',
        border: 'border-blue-500',
        bg: 'bg-blue-900/20',
        desc: 'Contrôle la peinture.',
      },
      'rebounding+impact': {
        name: 'Guerrier',
        tier: 3,
        color: 'text-rose-400',
        border: 'border-rose-500',
        bg: 'bg-rose-900/20',
        desc: 'Énergie, rebonds et hustle.',
      },
      'interior+defense': {
        name: 'Rim Protector',
        tier: 2,
        color: 'text-blue-500',
        border: 'border-blue-600',
        bg: 'bg-blue-900/20',
        desc: 'Protection de cercle, dissuasion.',
      },
      'interior+impact': {
        name: 'Lob Threat',
        tier: 3,
        color: 'text-blue-300',
        border: 'border-blue-400',
        bg: 'bg-blue-900/15',
        desc: 'Finisseur près du cercle, alley-oop.',
      },
      'defense+impact': {
        name: 'Lockdown',
        tier: 2,
        color: 'text-red-500',
        border: 'border-red-600',
        bg: 'bg-red-900/20',
        desc: 'Spécialiste défensif, change le match.',
      },
      'impact+efficiency': {
        name: 'Glue Guy',
        tier: 3,
        color: 'text-emerald-400',
        border: 'border-emerald-500',
        bg: 'bg-emerald-900/20',
        desc: "Fait le liant, l'équipe tourne mieux.",
      },
      'impact+defense': {
        name: 'Connective Tissue',
        tier: 3,
        color: 'text-emerald-300',
        border: 'border-emerald-400',
        bg: 'bg-emerald-900/15',
        desc: 'Connecteur, impact sans stats.',
      },
      'impact+creation': {
        name: 'Facilitateur',
        tier: 3,
        color: 'text-emerald-400',
        border: 'border-emerald-500',
        bg: 'bg-emerald-900/20',
        desc: 'Rend tout le monde meilleur.',
      },
      'impact+rebounding': {
        name: 'Blue Collar',
        tier: 3,
        color: 'text-slate-300',
        border: 'border-slate-400',
        bg: 'bg-slate-700/50',
        desc: "Travailleur de l'ombre, impact réel.",
      },
    };

    // 2. MOTEUR D'ÉVALUATION (Tout le monde participe)
    var candidates = [];

    // On calcule le score de chaque archétype "normal"
    Object.keys(ARCHETYPE_MATRIX).forEach(function (key) {
      var dimsToScore = key.split('+');
      var score = (fp[dimsToScore[0]] || 0) + (fp[dimsToScore[1]] || 0);

      var arch = Object.assign({}, ARCHETYPE_MATRIX[key]);
      arch.score = score;
      arch.primaryTraits = dimsToScore; // On mémorise les traits qui définissent cet archétype
      candidates.push(arch);
    });

    // On injecte les "Exceptions" dans l'arène avec leurs propres formules mathématiques
    candidates.push({
      name: 'Croqueur',
      tier: 1,
      color: 'text-red-400',
      border: 'border-red-500',
      bg: 'bg-red-900/20',
      desc: 'Volume élevé, rendement insuffisant.',
      score: fp.volume >= 70 && fp.efficiency < 35 ? fp.volume * 2.5 : 0, // Score massif pour forcer la sélection si les conditions sont réunies
      primaryTraits: ['volume'],
    });

    candidates.push({
      name: 'Spot-Up',
      tier: 3,
      color: 'text-sky-400',
      border: 'border-sky-500',
      bg: 'bg-sky-900/20',
      desc: 'Fiable en catch & shoot.',
      score: fp.shooting >= 45 && threeaPerGame >= 2 ? fp.shooting * 1.5 + 40 : 0,
      primaryTraits: ['shooting'],
    });

    candidates.push({
      name: '3-and-D',
      tier: 2,
      color: 'text-teal-400',
      border: 'border-teal-500',
      bg: 'bg-teal-900/20',
      desc: 'Tireur fiable et défenseur solide.',
      score:
        fp.shooting >= 50 && fp.defense >= 50 && (avg.threePct || 0) >= 33 && threeaPerGame >= 1.5
          ? fp.shooting + fp.defense + 30
          : 0,
      primaryTraits: ['shooting', 'defense'],
    });

    // 3. SÉLECTION DU VAINQUEUR
    candidates.sort(function (a, b) {
      return b.score - a.score;
    });
    var match = candidates[0];

    // 4. GESTION DES FALLBACKS (Si le joueur n'a aucune stat marquante)
    var dims = Object.keys(DIM_LABELS);
    var avgScore =
      dims.reduce(function (a, d) {
        return a + (fp[d] || 0);
      }, 0) / dims.length;

    // Seuil de 90 (équivalent à 45 + 45 pour les deux stats principales)
    if (match.score < 90) {
      if (avgScore >= 35) {
        match = {
          name: 'Relayeur',
          tier: 3,
          color: 'text-slate-300',
          border: 'border-slate-400',
          bg: 'bg-slate-700/50',
          desc: 'Tient le terrain, apporte de la stabilité.',
          primaryTraits: [],
        };
      } else {
        match = {
          name: 'Rotation',
          tier: 3,
          color: 'text-slate-400',
          border: 'border-slate-500',
          bg: 'bg-slate-900',
          desc: 'Joueur de collectif.',
          primaryTraits: [],
        };
      }
    }

    // 5. CALCUL INTELLIGENT DU TRAIT SECONDAIRE
    // Au lieu de prendre aveuglément la 2ème meilleure stat, on cherche la meilleure stat
    // qui N'EST PAS DÉJÀ INCLUSE dans la définition de l'archétype principal.
    var sortedDims = dims.slice().sort(function (a, b) {
      return (fp[b] || 0) - (fp[a] || 0);
    });
    var bestSecondaryDim = null;

    for (var i = 0; i < sortedDims.length; i++) {
      if (match.primaryTraits.indexOf(sortedDims[i]) === -1) {
        bestSecondaryDim = sortedDims[i];
        break;
      }
    }
    var secondary =
      bestSecondaryDim && fp[bestSecondaryDim] >= 40 ? DIM_LABELS[bestSecondaryDim] : null;

    return {
      name: match.name,
      desc: match.desc,
      secondary: secondary,
      tags: tags,
      color: match.color,
      border: match.border,
      bg: match.bg,
      tier: match.tier,
      fingerprint: fp,
      nbaComp: nbaComp,
    };
  },

  // --- SWOT ---
  getSWOT: (p) => {
    const s = [],
      w = [],
      a = p.avg;
    const B = getBenchmarks();
    if (p.logs.length === 0) return { strengths: [], weaknesses: [] };
    if (a.TS > B.ts_elite) s.push(`Scoreur Élite (TS% ${a.TS.toFixed(0)}%)`);
    else if (a.TS > B.ts_good) s.push(`Efficace (TS% ${a.TS.toFixed(0)}%)`);
    if (a.astTov > B.astTov_good && a.ast > 2)
      s.push(`Gestionnaire Sûr (Ratio ${a.astTov.toFixed(1)})`);
    if (a.oreb > B.oreb_good) s.push('Guerrier Rebond Offensif');
    if (a.FTr > 0.35) s.push('Provoque des Fautes');
    if (a.netRtg > 8) s.push(`Impact Victoire (+/-)`);
    if (a.threePct > B.threePct_good && a.threea > 2) s.push('Spacer (3 pts)');
    if (a.TS < B.ts_bad && a.usage > B.usage_low + 5) w.push('Inefficace pour son volume');
    if (a.astTov < B.astTov_bad && a.ast > 1) w.push('Prise de décision (Pertes de balle)');
    if (a.pf36 > B.pf36_warn) w.push(`Foul Trouble (${a.pf36.toFixed(1)}/36m)`);
    return { strengths: s, weaknesses: w };
  },

  // --- FALLBACK NARRATIVE ---
  getFallbackNarrative: (p) => {
    const a = p.avg;
    const gp = p.logs.length;
    if (!a || gp === 0) return 'Pas assez de données pour établir un profil.';
    const B = getBenchmarks();
    const arch = AnalysisEngine.getArchetype(p, [], null);
    const parts = [];
    parts.push(`Profil ${arch.name} sur ${gp} match${gp > 1 ? 's' : ''} (réf. ${B.label}).`);
    if (a.usage > B.usage_high) {
      if (a.TS > B.ts_elite)
        parts.push(
          `Première option offensive crédible : ${a.pts.toFixed(1)} pts à ${a.TS.toFixed(0)}% TS, ratio volume/efficacité au-dessus du lot pour le niveau.`
        );
      else if (a.TS > B.ts_bad)
        parts.push(
          `Gros volume (USG ${a.usage.toFixed(0)}%) mais efficacité perfectible (${a.TS.toFixed(0)}% TS). Tendance croqueur.`
        );
      else
        parts.push(
          `Volume de tir élevé (USG ${a.usage.toFixed(0)}%) pour une efficacité insuffisante (${a.TS.toFixed(0)}% TS, seuil ${B.label} : ${B.ts_good}%). Doit apprendre à choisir ses tirs.`
        );
    } else if (a.usage > B.usage_low) {
      if (a.TS > B.ts_elite)
        parts.push(
          `Scoreur efficace dans l'ombre : ${a.pts.toFixed(1)} pts à ${a.TS.toFixed(0)}% TS sur volume modéré.`
        );
      else if (a.TS < B.ts_bad)
        parts.push(
          `Production offensive limitée (${a.pts.toFixed(1)} pts, ${a.TS.toFixed(0)}% TS). Doit contribuer autrement.`
        );
    } else {
      if (a.TS > B.ts_elite + 2)
        parts.push(
          `Finisseur discret mais redoutable : convertit à ${a.TS.toFixed(0)}% TS sur faible volume.`
        );
      else parts.push(`Rôle offensif mineur (USG ${a.usage.toFixed(0)}%).`);
    }
    if (a.threePAr > 0.5 && a.threePct > B.threePct_good)
      parts.push(
        `Menace extérieure confirmée (${a.threePct.toFixed(0)}% à 3pts, rate ${a.threePAr.toFixed(2)}).`
      );
    else if (a.threePAr > 0.4 && a.threePct < B.threePct_good - 4)
      parts.push(
        `Shoot trop de 3pts (rate ${a.threePAr.toFixed(2)}) pour son adresse (${a.threePct.toFixed(0)}%, réf. ${B.label} : ${B.threePct_good}%). Sélection à revoir.`
      );
    if (a.ast > B.ast_good && a.astTov > B.astTov_good)
      parts.push(
        `Gestionnaire de balle sûr (${a.ast.toFixed(1)} ast, ratio ${a.astTov.toFixed(1)}).`
      );
    else if (a.ast > B.ast_good * 0.75 && a.astTov < B.astTov_bad)
      parts.push(
        `Crée du jeu (${a.ast.toFixed(1)} ast) mais perd trop de ballons (ratio ${a.astTov.toFixed(1)}). Discipline à travailler.`
      );
    else if (a.astTov < 1.0 && a.tov > 1.5)
      parts.push(`Pertes de balle préoccupantes (ratio Ast/TO ${a.astTov.toFixed(1)}).`);
    if (a.oreb > B.oreb_good)
      parts.push(`Présence au rebond offensif (${a.oreb.toFixed(1)}/match). Seconde chance.`);
    if (a.reb > B.reb_dom) parts.push(`Dominant au rebond (${a.reb.toFixed(1)}/match).`);
    if (a.netRtg > 10)
      parts.push(
        `Impact collectif fort : l'équipe performe nettement mieux avec lui sur le terrain.`
      );
    else if (a.netRtg < -8)
      parts.push(`Impact collectif négatif : le groupe souffre sur ses minutes.`);
    if (a.stl + (a.blk || 0) > B.def_active)
      parts.push(
        `Activité défensive notable (${a.stl.toFixed(1)} int + ${(a.blk || 0).toFixed(1)} ctr).`
      );
    if (a.pf36 > B.pf36_bad)
      parts.push(
        `Problème de fautes récurrent (${a.pf36.toFixed(1)}/36m). Risque de foul trouble.`
      );
    else if (a.pf36 > B.pf36_warn)
      parts.push(`Discipline limite (${a.pf36.toFixed(1)} fautes/36m).`);
    if (gp >= 5) {
      const last3 = p.logs.slice(0, 3);
      const recentPts = last3.reduce((s, l) => s + l.pts, 0) / 3;
      const diff = recentPts - a.pts;
      if (diff > B.trend_delta)
        parts.push(
          `Montée en puissance récente (+${diff.toFixed(1)} pts sur les 3 derniers matchs).`
        );
      else if (diff < -B.trend_delta)
        parts.push(`En baisse de régime sur les 3 derniers matchs (${diff.toFixed(1)} pts).`);
    }
    // --- Bloc Comparaison NBA ---
    if (arch.nbaComp && arch.nbaComp.best && arch.nbaComp.best.name) {
      var comp = arch.nbaComp;
      var primary = comp.best.name;
      var twin = comp.styleTwin ? comp.styleTwin.name : null;

      if (comp.isAnomaly) {
        parts.push(
          'Profil atypique : produit au niveau de ' +
            primary +
            (twin ? ', mais dans un style proche de ' + twin : '') +
            '. Carte de tir non standard pour cette catégorie de production.'
        );
      } else if (twin && twin !== primary) {
        parts.push(
          'Comparable à ' +
            primary +
            ' en production' +
            (comp.shotMatchUsed ? ' (carte de tir validée)' : '') +
            ', style de jeu orienté ' +
            twin +
            '.'
        );
      } else {
        parts.push(
          'Match global avec ' + primary + ' (' + comp.best.similarity + '% de correspondance).'
        );
      }
    }
    return parts.join(' ');
  },
};

// =================================================================================
// 3. COMPOSANTS VISUELS
// =================================================================================
const ScoutingRadar = ({ avg }) => {
  const MAX = { pts: 22, reb: 11, ast: 7, def: 4.5, eff: 20 };
  const val = (v, m) => Math.min((v || 0) / m, 1);
  const stats = [
    { l: 'SCO', v: val(avg.pts, MAX.pts) },
    { l: 'REB', v: val(avg.reb, MAX.reb) },
    { l: 'AST', v: val(avg.ast, MAX.ast) },
    { l: 'DEF', v: val(avg.stl + avg.blk, MAX.def) },
    { l: 'EFF', v: val(avg.eff, MAX.eff) },
  ];
  const c = 60,
    r = 40;
  const poly = (d, f) =>
    d
      .map((s, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2,
          v = f ? f(s.v) : r;
        return `${c + Math.cos(a) * v},${c + Math.sin(a) * v}`;
      })
      .join(' ');
  return (
    <svg viewBox="0 0 120 120" className="w-full h-40 filter drop-shadow-lg">
      {[0.2, 0.4, 0.6, 0.8, 1].map((k, i) => (
        <polygon
          key={i}
          points={poly(stats, () => r * k)}
          fill={i % 2 ? '#0f172a' : '#1e1e3a'}
          stroke="#334155"
          strokeWidth="0.5"
        />
      ))}
      <polygon
        points={poly(stats, () => r * 0.5)}
        fill="none"
        stroke="rgba(100,116,139,0.3)"
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <polygon
        points={poly(stats, (v) => r * v)}
        fill="rgba(212,165,116,0.4)"
        stroke="#d4a574"
        strokeWidth="2"
      />
      {stats.map((s, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return (
          <text
            key={i}
            x={c + Math.cos(a) * (r + 14)}
            y={c + Math.sin(a) * (r + 10)}
            fontSize="7"
            fontWeight="bold"
            fill="#94a3b8"
            textAnchor="middle"
          >
            {s.l}
          </text>
        );
      })}
    </svg>
  );
};

function calcFiveManLineups(playerId, games, roster) {
  const MIN_POSS = 8;
  const homeIds = new Set(roster.map((p) => p.id || parseInt(p.id)));
  const lineupMap = {};
  games.forEach((game) => {
    if (!game.actions || !game.actions.length || !game.actions[0].onCourt) return;
    game.actions.forEach((a) => {
      if (!a.onCourt) return;
      const homeOnCourt = a.onCourt.filter((id) => homeIds.has(id)).sort((x, y) => x - y);
      if (homeOnCourt.length !== 5 || !homeOnCourt.includes(playerId)) return;
      const key = homeOnCourt.join('-');
      if (!lineupMap[key])
        lineupMap[key] = {
          ids: homeOnCourt,
          actions: 0,
          pts: 0,
          ptsConceded: 0,
          fga: 0,
          fta: 0,
          tov: 0,
          orb: 0,
          oppFga: 0,
          oppFta: 0,
          oppTov: 0,
          oppOrb: 0,
        };
      const m = lineupMap[key];
      const isHome = homeIds.has(a.pid);
      m.actions++;
      if (a.type === 'SHOT') {
        if (isHome) {
          m.fga++;
          if (a.made) m.pts += a.val;
        } else {
          m.oppFga++;
          if (a.made) m.ptsConceded += a.val;
        }
      }
      if (a.type === 'FT') {
        if (isHome) {
          m.fta += a.ftAtt || 0;
          m.pts += a.ftMade || 0;
        } else {
          m.oppFta += a.ftAtt || 0;
          m.ptsConceded += a.ftMade || 0;
        }
      }
      if (a.type === 'TOV') {
        if (isHome) m.tov++;
        else m.oppTov++;
      }
      if (a.type === 'OREB') {
        if (isHome) m.orb++;
        else m.oppOrb++;
      }
    });
  });
  const results = Object.values(lineupMap)
    .map((m) => {
      const poss = Math.max(1, window.StatsEngine.possSimple(m.fga, m.fta, m.tov, m.orb));
      const oppPoss = Math.max(
        1,
        window.StatsEngine.possSimple(m.oppFga, m.oppFta, m.oppTov, m.oppOrb)
      );
      const avgPoss = (poss + oppPoss) / 2;
      if (avgPoss < MIN_POSS) return null;
      const ortg = Math.round((m.pts / avgPoss) * 100);
      const drtg = Math.round((m.ptsConceded / avgPoss) * 100);
      const names = m.ids.map((id) => {
        const p = roster.find((r) => (r.id || parseInt(r.id)) === id);
        return p ? '#' + (p.number || '?') : '#' + id;
      });
      return {
        ids: m.ids,
        names,
        poss: Math.round(avgPoss),
        ortg,
        drtg,
        netRtg: ortg - drtg,
        pm: m.pts - m.ptsConceded,
        lowSample: avgPoss < 20,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.netRtg - a.netRtg);
  return { best: results.slice(0, 5), worst: results.slice(-5).reverse(), total: results.length };
}

// =================================================================================
// 4. COMPOSANT PRINCIPAL
// =================================================================================
const PlayerReportModule = ({ currentUser, onClose, games: propGames, roster: propRoster, phases: propPhases, seasons: propSeasons }) => {
  const [players, setPlayers] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [aiNarrative, setAiNarrative] = React.useState(null);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);
  const [compareSeasonId, setCompareSeasonId] = React.useState('');

  const exportPlayerPDF = async (player) => {
    if (!window.html2canvas || !window.jspdf) {
      alert('Librairies PDF non chargees (html2canvas / jsPDF).');
      return;
    }
    setIsExportingPDF(true);
    try {
      const container = document.querySelector('.max-w-6xl');
      if (!container) {
        alert('Conteneur introuvable');
        setIsExportingPDF(false);
        return;
      }
      const canvas = await window.html2canvas(container, {
        backgroundColor: '#0C0C12',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 16;
      const imgH = (canvas.height / canvas.width) * imgW;
      if (imgH <= pageH - 16) {
        pdf.addImage(imgData, 'PNG', 8, 8, imgW, imgH);
      } else {
        const pageImgH = pageH - 16;
        const totalPages = Math.ceil(imgH / pageImgH);
        for (let pg = 0; pg < totalPages; pg++) {
          if (pg > 0) pdf.addPage();
          const srcY = ((pg * pageImgH) / imgH) * canvas.height;
          const srcH = (pageImgH / imgH) * canvas.height;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = Math.min(srcH, canvas.height - srcY);
          const tCtx = tempCanvas.getContext('2d');
          tCtx.drawImage(
            canvas,
            0,
            srcY,
            canvas.width,
            tempCanvas.height,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
          );
          const pageImg = tempCanvas.toDataURL('image/png');
          const drawH = (tempCanvas.height / canvas.width) * imgW;
          pdf.addImage(pageImg, 'PNG', 8, 8, imgW, drawH);
        }
      }
      const safeName = (player.name || 'joueur').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${safeName}_rapport.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('Erreur export PDF.');
    }
    setIsExportingPDF(false);
  };

  React.useEffect(() => {
    if (propRoster) setPlayers(AnalysisEngine.processPlayerData(propGames || [], propRoster));
  }, [propGames, propRoster]);

  React.useEffect(() => {
    setCompareSeasonId('');
  }, [selectedId]);

  React.useEffect(() => {
    setAiNarrative(null);
    if (!selectedId) return;
    if (!players || players.length === 0) return;
    const player = players.find(
      (p) =>
        p.id === selectedId ||
        String(p.id) === String(selectedId) ||
        Number(p.id) === Number(selectedId)
    );
    if (!player || !player.logs || player.logs.length === 0) return;
    setAiNarrative(AnalysisEngine.getFallbackNarrative(player));
  }, [selectedId, players]);

  if (!currentUser || (currentUser.role !== 'coach' && currentUser.role !== 'admin')) return null;

  // --- LISTE DES JOUEURS ---
  if (!selectedId) {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col font-sans"
        style={{ background: 'var(--bg-0)', color: 'var(--text-1)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex justify-between items-center z-10 shrink-0"
          style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-[10px] text-white shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h1
                className="text-base font-black uppercase tracking-tight"
                style={{ color: 'var(--text-1)' }}
              >
                Scouting <span style={{ color: 'var(--accent)' }}>Pro</span>
              </h1>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {players.length} profils analysés
              </p>
            </div>
          </div>
          <button onClick={onClose} className="sc-btn-ghost">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fermer
          </button>
        </div>

        {/* Grille joueurs */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {players.map((p) => {
              const arch = AnalysisEngine.getArchetype(p, players, propGames);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="text-left relative overflow-hidden group flex flex-col cursor-pointer"
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--accent-ghost)',
                    borderRadius: 'var(--r-lg)',
                    padding: '16px 16px 14px',
                    boxShadow: 'var(--shadow-card)',
                    transition:
                      'border-color var(--t-base), box-shadow var(--t-base), transform var(--t-base)',
                  }}
                  onMouseEnter={function (e) {
                    e.currentTarget.style.borderLeftColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={function (e) {
                    e.currentTarget.style.borderLeftColor = 'var(--accent-ghost)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {p.photo && (
                    <div
                      className="absolute inset-0 opacity-[0.07] group-hover:opacity-[0.13] transition-opacity bg-cover bg-center"
                      style={{ backgroundImage: 'url(' + p.photo + ')', filter: 'grayscale(100%)' }}
                    ></div>
                  )}
                  <div
                    className="absolute right-2 bottom-1 font-black pointer-events-none select-none"
                    style={{
                      fontSize: '4.5rem',
                      lineHeight: 1,
                      opacity: 0.04,
                      color: 'var(--text-1)',
                      fontFamily: 'Fira Code, monospace',
                    }}
                  >
                    {p.number}
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className="text-base font-bold truncate pr-2"
                        style={{ color: 'var(--text-1)' }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="text-[10px] shrink-0 font-mono"
                        style={{ color: 'var(--text-3)' }}
                      >
                        #{p.number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <div
                        className={`sc-badge ${arch.border} ${arch.color} ${arch.bg}`}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {arch.name}
                      </div>
                      {(function () {
                        var streak = window.StatsEngine.hotColdStreak(p.logs);
                        if (!streak || streak.status === 'steady') return null;
                        var isHot = streak.status === 'hot';
                        return (
                          <span
                            className={
                              'text-[9px] font-black px-1.5 py-0.5 rounded-full ' +
                              (isHot
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-blue-500/20 text-blue-400')
                            }
                          >
                            {isHot ? 'EN FORME' : 'CREUX'}
                          </span>
                        );
                      })()}
                    </div>

                    {arch.nbaComp && arch.nbaComp.best && arch.nbaComp.best.name ? (
                      <div
                        className="text-[9px] mb-3 flex items-center gap-1"
                        style={{ color: 'var(--text-3)' }}
                      >
                        <span>~</span>
                        <span style={{ color: 'var(--accent-light)' }} className="font-medium">
                          {arch.nbaComp.best.name}
                        </span>
                        <span>({arch.nbaComp.best.similarity}%)</span>
                      </div>
                    ) : (
                      <div className="mb-3"></div>
                    )}

                    <div
                      className="flex items-end mt-auto pt-3"
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                      <div className="flex-1 text-center">
                        <div className="sc-section-label mb-0.5">PTS</div>
                        <div
                          className="sc-stat-value text-[15px]"
                          style={{ color: 'var(--text-1)' }}
                        >
                          {p.avg.pts.toFixed(1)}
                        </div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="sc-section-label mb-0.5">EFF</div>
                        <div
                          className="sc-stat-value text-[15px]"
                          style={{ color: 'var(--sys-warn)' }}
                        >
                          {p.avg.eff.toFixed(1)}
                        </div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="sc-section-label mb-0.5">USG</div>
                        <div
                          className="sc-stat-value text-[15px]"
                          style={{ color: 'var(--text-2)' }}
                        >
                          {p.avg.usage.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // REMPLACEMENT : Tout le bloc "VUE DETAIL" dans PlayerReportModule
  // Commence après : if (!selectedId) { return (...) } — la liste joueurs reste inchangée
  // Se termine à la fin du return du composant PlayerReportModule
  // =============================================================================

  // --- VUE DETAIL ---
  var p = players.find(function (x) {
    return x.id === selectedId;
  });
  if (!p) return null;
  var arch = AnalysisEngine.getArchetype(p, players, propGames);
  var swot = AnalysisEngine.getSWOT(p);
  var narrativeText = aiNarrative || AnalysisEngine.getFallbackNarrative(p);
  var last5 = p.logs.slice(0, 5);

  // --- Precalculs detail ---
  var a = p.avg;
  var gp = p.logs.length;
  var B = getBenchmarks();
  var dreb = a.reb - a.oreb;
  var totalFGA = a.fga + a.threea;
  var totalFGM = a.fgm + a.threem;
  var fgPctGlobal = totalFGA > 0 ? (totalFGM / totalFGA) * 100 : 0;
  var per30 = function (stat) {
    return a.min > 0 ? (stat / a.min) * 30 : 0;
  };
  var p30 = {
    pts: per30(a.pts),
    reb: per30(a.reb),
    ast: per30(a.ast),
    stl: per30(a.stl),
    pf: per30(a.fouls),
  };

  // Analyse Coach
  var strengths = [];
  var improvements = [];
  if (a.TS > B.ts_elite)
    strengths.push({
      icon: '\u25B2',
      text:
        'Efficacit\u00e9 au scoring \u00e9lite (TS% ' +
        a.TS.toFixed(1) +
        '%). Excellent choix de tirs.',
    });
  else if (a.TS > B.ts_good)
    strengths.push({
      icon: '\u25B2',
      text: 'Bonne efficacit\u00e9 au scoring (TS% ' + a.TS.toFixed(1) + '%).',
    });
  if (a.astTov > B.astTov_good && a.ast > 2)
    strengths.push({
      icon: '\u25B2',
      text:
        'Gestionnaire fiable \u2014 ratio AST/TOV de ' +
        a.astTov.toFixed(1) +
        ' avec ' +
        a.ast.toFixed(1) +
        ' passes/match.',
    });
  if (a.threePct > B.threePct_good && a.threea > 2)
    strengths.push({
      icon: '\u25B2',
      text:
        'Menace \u00e0 3 points : ' +
        a.threePct.toFixed(1) +
        '% sur ' +
        a.threea.toFixed(1) +
        ' tent./match.',
    });
  if (p30.reb > 8 && strengths.length < 3)
    strengths.push({
      icon: '\u25B2',
      text:
        'Pr\u00e9sence au rebond : ' + p30.reb.toFixed(1) + ' rebonds projet\u00e9s sur 30 min.',
    });
  if (a.stl + a.blk > B.def_active && strengths.length < 3)
    strengths.push({
      icon: '\u25B2',
      text:
        'Activit\u00e9 d\u00e9fensive notable : ' +
        a.stl.toFixed(1) +
        ' INT + ' +
        a.blk.toFixed(1) +
        ' CTR/match.',
    });
  if (a.oreb > B.oreb_good && strengths.length < 3)
    strengths.push({
      icon: '\u25B2',
      text: 'Guerrier au rebond offensif (' + a.oreb.toFixed(1) + '/match).',
    });
  if (a.min < 20 && a.min > 5 && p30.pts > 15 && strengths.length < 3)
    strengths.push({
      icon: '\u25B2',
      text:
        'Impact fort rapport\u00e9 au temps de jeu : ' +
        p30.pts.toFixed(1) +
        ' PTS/30 min (' +
        a.min.toFixed(1) +
        ' min jou\u00e9es).',
    });
  if (a.plusMinus > 5 && strengths.length < 3)
    strengths.push({
      icon: '\u25B2',
      text: 'Impact collectif positif : +' + a.plusMinus.toFixed(1) + ' de +/- moyen.',
    });
  if (a.FTr > 0.35 && strengths.length < 3)
    strengths.push({
      icon: '\u25B2',
      text: 'Provoque des fautes r\u00e9guli\u00e8rement (FTr ' + a.FTr.toFixed(2) + ').',
    });
  if (a.netRtg > 8 && strengths.length < 3)
    strengths.push({
      icon: '\u25B2',
      text: "L'\u00e9quipe performe mieux avec lui (NetRtg +" + a.netRtg.toFixed(0) + ').',
    });

  if (p30.pf > 4.5)
    improvements.push({
      icon: '\u25BC',
      text:
        'Gestion des fautes \u2014 ' +
        p30.pf.toFixed(1) +
        ' fautes/30 min. Risque de foul trouble.',
    });
  else if (a.pf36 > B.pf36_warn)
    improvements.push({
      icon: '\u25BC',
      text: 'Discipline limite (' + a.pf36.toFixed(1) + ' fautes/36m, seuil: ' + B.pf36_warn + ').',
    });
  if (a.astTov < B.astTov_bad && a.tov > 1.5)
    improvements.push({
      icon: '\u25BC',
      text:
        'Ratio AST/TOV faible (' +
        a.astTov.toFixed(1) +
        '). R\u00e9duire les pertes (' +
        a.tov.toFixed(1) +
        '/match).',
    });
  if (a.TS < B.ts_bad && a.usage > B.usage_low + 5 && improvements.length < 2)
    improvements.push({
      icon: '\u25BC',
      text: 'Efficacit\u00e9 offensive insuffisante (TS% ' + a.TS.toFixed(1) + '%) pour le volume.',
    });
  if (a.ftPct < 60 && a.fta / Math.max(gp, 1) > 1.5 && improvements.length < 2)
    improvements.push({
      icon: '\u25BC',
      text: 'Lancer-franc \u00e0 travailler : ' + a.ftPct.toFixed(1) + '%. Points gratuits perdus.',
    });
  if (a.threePct < B.threePct_good - 5 && a.threea > 2 && improvements.length < 2)
    improvements.push({
      icon: '\u25BC',
      text:
        'Adresse ext\u00e9rieure insuffisante (' +
        a.threePct.toFixed(1) +
        '% sur ' +
        a.threea.toFixed(1) +
        ' tent./match).',
    });
  if (a.netRtg < -8 && improvements.length < 2)
    improvements.push({
      icon: '\u25BC',
      text:
        'Impact collectif n\u00e9gatif (NetRtg ' + a.netRtg.toFixed(0) + '). Le groupe souffre.',
    });
  var topS = strengths.slice(0, 3);
  var topI = improvements.slice(0, 2);

  // --- Helpers visuels ---
  var StatCard = function (props) {
    return React.createElement(
      'div',
      {
        className: 'relative group',
        style: {
          background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))',
          border: '1px solid rgba(100,116,139,0.3)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
          minWidth: '0',
        },
      },
      React.createElement('div', {
        className:
          'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity',
        style: {
          background:
            'linear-gradient(135deg, ' +
            (props.accentColor || 'rgba(34,211,238,0.08)') +
            ', transparent)',
          borderRadius: '16px',
        },
      }),
      React.createElement(
        'div',
        { className: 'relative z-10' },
        React.createElement(
          'div',
          {
            className: 'text-xs font-bold uppercase tracking-widest mb-2',
            style: { color: props.labelColor || '#94a3b8' },
          },
          props.label
        ),
        React.createElement(
          'div',
          {
            className: 'font-black leading-none',
            style: { fontSize: props.fontSize || '2.5rem', color: props.valueColor || '#ffffff' },
          },
          props.value
        ),
        props.sub &&
          React.createElement(
            'div',
            { className: 'text-xs mt-2', style: { color: '#64748b' } },
            props.sub
          )
      )
    );
  };

  var ProgressBar = function (props) {
    var pct = Math.min(Math.max(props.value || 0, 0), 100);
    var barColor = props.color || '#22d3ee';
    return React.createElement(
      'div',
      { className: 'flex items-center gap-3 py-1.5' },
      React.createElement(
        'div',
        {
          className: 'w-20 text-xs font-bold uppercase tracking-wide text-right shrink-0',
          style: { color: '#94a3b8' },
        },
        props.label
      ),
      React.createElement(
        'div',
        {
          className: 'flex-1 h-2.5 rounded-full overflow-hidden',
          style: { background: 'rgba(30,41,59,0.8)' },
        },
        React.createElement('div', {
          className: 'h-full rounded-full transition-all duration-700',
          style: {
            width: pct + '%',
            background: 'linear-gradient(90deg, ' + barColor + ', ' + barColor + 'cc)',
          },
        })
      ),
      React.createElement(
        'div',
        { className: 'w-16 text-sm font-bold text-right shrink-0', style: { color: barColor } },
        props.display || pct.toFixed(1) + '%'
      )
    );
  };

  var SectionTitle = function (props) {
    return React.createElement(
      'div',
      { className: 'flex items-center gap-3 mb-5' },
      React.createElement(
        'div',
        {
          className: 'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black',
          style: { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff' },
        },
        props.num
      ),
      React.createElement(
        'h3',
        { className: 'text-sm font-bold uppercase tracking-widest text-slate-300' },
        props.title
      ),
      props.badge &&
        React.createElement(
          'span',
          {
            className: 'ml-auto text-xs font-mono px-2 py-0.5 rounded',
            style: {
              background: 'rgba(15,23,42,0.8)',
              color: '#64748b',
              border: '1px solid rgba(51,65,85,0.5)',
            },
          },
          props.badge
        )
    );
  };

  // --- Impact color ---
  var impactColor =
    a.impactTotal > 110
      ? '#60a5fa'
      : a.impactTotal > 85
        ? '#34d399'
        : a.impactTotal > 59
          ? '#ffffff'
          : '#f87171';
  var tsColor =
    a.TS > B.ts_elite
      ? '#34d399'
      : a.TS > B.ts_good
        ? '#22d3ee'
        : a.TS < B.ts_bad
          ? '#f87171'
          : '#f59e0b';
  var efgColor =
    a.eFG > 55 ? '#34d399' : a.eFG > 48 ? '#22d3ee' : a.eFG < 42 ? '#f87171' : '#f59e0b';
  var usageColor =
    a.usage > B.usage_high ? '#f97316' : a.usage > B.usage_low ? '#22d3ee' : '#94a3b8';

  // --- Data reliability ---
  var reliabilityLabel =
    gp >= 15
      ? 'FIABLE'
      : gp >= 8
        ? 'ACCEPTABLE'
        : gp >= 3
          ? 'PRUDENCE (LOW SAMPLE)'
          : 'TRES FAIBLE ECHANTILLON';
  var reliabilityColor = gp >= 15 ? '#34d399' : gp >= 8 ? '#f59e0b' : '#f87171';

  return React.createElement(
    'div',
    {
      className: 'fixed inset-0 z-[60] overflow-y-auto font-sans text-slate-200',
      style: { background: 'linear-gradient(180deg, #050a18 0%, #0a0e1a 30%, #0f172a 100%)' },
    },

    // ========== STICKY NAV ==========
    React.createElement(
      'div',
      {
        className: 'sticky top-0 z-50 print:hidden',
        style: {
          background: 'rgba(5,10,24,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(51,65,85,0.4)',
        },
      },
      React.createElement(
        'div',
        { className: 'max-w-7xl mx-auto px-4 py-3 flex justify-between items-center' },
        React.createElement(
          'button',
          {
            onClick: function () {
              setSelectedId(null);
            },
            className:
              'flex items-center gap-2 text-slate-400 hover:text-white font-bold uppercase text-xs tracking-widest transition-colors',
          },
          React.createElement('span', { style: { fontSize: '18px' } }, '\u2190'),
          'Retour'
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-3' },
          React.createElement(
            'span',
            {
              className: 'text-xs font-bold uppercase tracking-widest',
              style: { color: '#f97316' },
            },
            'STAT'
          ),
          React.createElement(
            'span',
            { className: 'text-xs font-bold uppercase tracking-widest text-white' },
            'CHAMP'
          ),
          React.createElement('span', { className: 'text-slate-600 mx-2' }, '|'),
          React.createElement('span', { className: 'text-xs text-slate-500' }, 'Profil Joueur')
        ),
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement(
            'button',
            {
              onClick: function () {
                window.print();
              },
              className:
                'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all',
              style: {
                background: 'rgba(30,41,59,0.6)',
                color: '#94a3b8',
                border: '1px solid rgba(51,65,85,0.4)',
              },
            },
            'Imprimer'
          ),
          React.createElement(
            'button',
            {
              onClick: function () {
                exportPlayerPDF(p);
              },
              disabled: isExportingPDF,
              className:
                'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all',
              style: {
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#fff',
                opacity: isExportingPDF ? 0.5 : 1,
              },
            },
            isExportingPDF ? 'Export...' : 'PDF'
          )
        )
      )
    ),

    // ========== HERO HEADER ==========
    React.createElement(
      'div',
      {
        className: 'relative overflow-hidden',
        style: {
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          borderBottom: '1px solid rgba(99,102,241,0.2)',
        },
      },
      // Background glow
      React.createElement('div', {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        },
      }),
      p.photo &&
        React.createElement('div', {
          className: 'absolute inset-0 opacity-5',
          style: {
            backgroundImage: 'url(' + p.photo + ')',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(30px) grayscale(100%)',
          },
        }),

      React.createElement(
        'div',
        { className: 'relative z-10 max-w-7xl mx-auto px-4 py-8' },
        React.createElement(
          'div',
          { className: 'flex flex-col md:flex-row items-start md:items-center gap-6' },

          // Photo
          p.photo
            ? React.createElement(
                'div',
                {
                  className: 'w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shrink-0',
                  style: {
                    border: '3px solid rgba(99,102,241,0.4)',
                    boxShadow: '0 0 30px rgba(99,102,241,0.15)',
                  },
                },
                React.createElement('img', {
                  src: p.photo,
                  className: 'w-full h-full object-cover',
                })
              )
            : React.createElement(
                'div',
                {
                  className:
                    'w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center shrink-0',
                  style: {
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                    border: '3px solid rgba(99,102,241,0.3)',
                  },
                },
                React.createElement(
                  'span',
                  { className: 'text-3xl font-black text-slate-500' },
                  '#' + (p.number || '?')
                )
              ),

          // Infos
          React.createElement(
            'div',
            { className: 'flex-1 min-w-0' },
            React.createElement(
              'div',
              { className: 'flex items-center gap-3 mb-1' },
              React.createElement(
                'span',
                {
                  className: 'text-xs font-bold uppercase tracking-widest',
                  style: { color: '#94a3b8' },
                },
                'Profil Joueur'
              ),
              React.createElement(
                'span',
                {
                  className: 'text-xs font-bold px-2 py-0.5 rounded-full',
                  style: {
                    background: 'rgba(99,102,241,0.15)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.3)',
                  },
                },
                '#' + (p.number || '?')
              )
            ),
            React.createElement(
              'h1',
              {
                className:
                  'text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none mb-2',
              },
              p.name
            ),
            React.createElement(
              'div',
              { className: 'flex flex-wrap items-center gap-3' },
              // Archetype badge
              React.createElement(
                'span',
                {
                  className: 'text-xs font-bold px-3 py-1 rounded-full',
                  style: {
                    background: arch.bg || 'rgba(30,41,59,0.5)',
                    color: arch.color ? arch.color.replace('text-', '') : '#94a3b8',
                    border:
                      '1px solid ' +
                      (arch.border
                        ? arch.border.replace('border-', '').replace('/50', '')
                        : 'rgba(71,85,105,0.5)'),
                  },
                },
                (arch.name || 'Inconnu').toUpperCase()
              ),
              // Data reliability
              React.createElement(
                'span',
                {
                  className: 'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded',
                  style: {
                    color: reliabilityColor,
                    background: reliabilityColor + '15',
                    border: '1px solid ' + reliabilityColor + '30',
                  },
                },
                'DATA: ' + reliabilityLabel
              ),
              // NBA Comp
              arch.nbaComp &&
                arch.nbaComp.best &&
                arch.nbaComp.best.name &&
                React.createElement(
                  'span',
                  {
                    className: 'text-xs px-2 py-0.5 rounded',
                    style: {
                      background: 'rgba(249,115,22,0.1)',
                      color: '#fb923c',
                      border: '1px solid rgba(249,115,22,0.25)',
                    },
                  },
                  'Comp. NBA: ' +
                    arch.nbaComp.best.name +
                    ' (' +
                    arch.nbaComp.best.similarity +
                    '%)'
                )
            )
          ),

          // Minutes badge (right side)
          React.createElement(
            'div',
            {
              className: 'hidden md:flex flex-col items-center shrink-0',
              style: {
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(51,65,85,0.4)',
                borderRadius: '16px',
                padding: '16px 24px',
                backdropFilter: 'blur(8px)',
              },
            },
            React.createElement(
              'div',
              { className: 'text-3xl font-black text-white' },
              a.min.toFixed(1)
            ),
            React.createElement(
              'div',
              { className: 'text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1' },
              'MIN/MATCH'
            ),
            React.createElement('div', { className: 'text-xs text-slate-500 mt-1' }, gp + ' matchs')
          )
        )
      )
    ),

    // ========== MAIN CONTENT ==========
    React.createElement(
      'div',
      { className: 'max-w-7xl mx-auto px-4 py-6 space-y-6', id: 'player-report-content' },

      // ========== DEBUG PANEL (TEMPORAIRE) ==========
      React.createElement(
        'div',
        {
          style: {
            background: 'rgba(220,38,38,0.1)',
            border: '2px solid #dc2626',
            borderRadius: '12px',
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#fca5a5',
          },
        },
        React.createElement(
          'div',
          { style: { color: '#fff', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' } },
          'DEBUG STATS — ' + p.name + ' (id: ' + p.id + ')'
        ),
        React.createElement(
          'div',
          { style: { marginBottom: '12px', color: '#fbbf24' } },
          'GP (logs.length): ' + gp
        ),

        // avg bruts
        React.createElement(
          'div',
          { style: { fontWeight: 'bold', color: '#fff', marginBottom: '4px' } },
          'p.avg (valeurs brutes) :'
        ),
        React.createElement(
          'table',
          { style: { borderCollapse: 'collapse', width: '100%', marginBottom: '12px' } },
          React.createElement(
            'thead',
            null,
            React.createElement(
              'tr',
              null,
              ['Champ', 'Valeur avg', 'Type attendu'].map(function (h) {
                return React.createElement(
                  'th',
                  {
                    key: h,
                    style: {
                      textAlign: 'left',
                      padding: '2px 8px',
                      borderBottom: '1px solid #dc2626',
                      color: '#f87171',
                    },
                  },
                  h
                );
              })
            )
          ),
          React.createElement(
            'tbody',
            null,
            [
              { k: 'fga', v: a.fga, t: 'CUMUL saison' },
              { k: 'fgm', v: a.fgm, t: 'CUMUL saison' },
              { k: 'threea', v: a.threea, t: '??? (sum ou sum/gp)' },
              { k: 'threem', v: a.threem, t: 'CUMUL saison' },
              { k: 'fta', v: a.fta, t: 'CUMUL saison' },
              { k: 'ftm', v: a.ftm, t: 'CUMUL saison' },
              { k: 'pts', v: a.pts, t: 'MOY /match' },
              { k: 'reb', v: a.reb, t: 'MOY /match' },
              { k: 'ast', v: a.ast, t: 'MOY /match' },
              { k: 'min', v: a.min, t: 'MOY /match' },
              { k: 'threePct', v: a.threePct, t: 'calcule: threem/threea*100' },
              { k: 'eFG', v: a.eFG, t: 'calcule' },
              { k: 'TS', v: a.TS, t: 'calcule' },
            ].map(function (row) {
              return React.createElement(
                'tr',
                { key: row.k },
                React.createElement(
                  'td',
                  { style: { padding: '2px 8px', color: '#fbbf24' } },
                  row.k
                ),
                React.createElement(
                  'td',
                  { style: { padding: '2px 8px', color: '#fff', fontWeight: 'bold' } },
                  typeof row.v === 'number' ? row.v.toFixed(4) : String(row.v)
                ),
                React.createElement(
                  'td',
                  { style: { padding: '2px 8px', color: '#94a3b8' } },
                  row.t
                )
              );
            })
          )
        ),

        // Logs detail (3 premiers + dernier)
        React.createElement(
          'div',
          { style: { fontWeight: 'bold', color: '#fff', marginBottom: '4px' } },
          'Logs bruts (3 premiers + dernier) :'
        ),
        React.createElement(
          'table',
          { style: { borderCollapse: 'collapse', width: '100%', marginBottom: '12px' } },
          React.createElement(
            'thead',
            null,
            React.createElement(
              'tr',
              null,
              [
                '#',
                'Date',
                'Adv',
                'threea',
                'threem',
                'fga',
                'fgm',
                'fta',
                'ftm',
                'pts',
                'min',
              ].map(function (h) {
                return React.createElement(
                  'th',
                  {
                    key: h,
                    style: {
                      textAlign: 'left',
                      padding: '2px 6px',
                      borderBottom: '1px solid #dc2626',
                      color: '#f87171',
                      fontSize: '10px',
                    },
                  },
                  h
                );
              })
            )
          ),
          React.createElement(
            'tbody',
            null,
            (function () {
              var logsToShow = [];
              if (p.logs.length <= 5) {
                logsToShow = p.logs.map(function (l, i) {
                  return { log: l, idx: i };
                });
              } else {
                logsToShow = p.logs.slice(0, 3).map(function (l, i) {
                  return { log: l, idx: i };
                });
                logsToShow.push({ log: null, idx: -1 }); // separator
                logsToShow.push({ log: p.logs[p.logs.length - 1], idx: p.logs.length - 1 });
              }
              return logsToShow.map(function (item) {
                if (!item.log)
                  return React.createElement(
                    'tr',
                    { key: 'sep' },
                    React.createElement(
                      'td',
                      { colSpan: 11, style: { padding: '2px 6px', color: '#475569' } },
                      '...'
                    )
                  );
                var l = item.log;
                return React.createElement(
                  'tr',
                  { key: item.idx },
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#94a3b8' } },
                    item.idx
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#94a3b8' } },
                    l.date
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#94a3b8' } },
                    l.opponent
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#fbbf24', fontWeight: 'bold' } },
                    l.threea
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#22d3ee' } },
                    l.threem
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#fff' } },
                    l.fga
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#fff' } },
                    l.fgm
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#fff' } },
                    l.fta
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#fff' } },
                    l.ftm
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#f97316' } },
                    l.pts
                  ),
                  React.createElement(
                    'td',
                    { style: { padding: '2px 6px', color: '#94a3b8' } },
                    l.min
                  )
                );
              });
            })()
          )
        ),

        // Sommes calculees
        React.createElement(
          'div',
          { style: { fontWeight: 'bold', color: '#fff', marginBottom: '4px' } },
          'Sommes recalculees ici :'
        ),
        (function () {
          var sums = { threea: 0, threem: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, pts: 0 };
          p.logs.forEach(function (l) {
            sums.threea += l.threea || 0;
            sums.threem += l.threem || 0;
            sums.fga += l.fga || 0;
            sums.fgm += l.fgm || 0;
            sums.fta += l.fta || 0;
            sums.ftm += l.ftm || 0;
            sums.pts += l.pts || 0;
          });
          return React.createElement(
            'div',
            { style: { display: 'flex', gap: '16px', flexWrap: 'wrap' } },
            Object.keys(sums).map(function (k) {
              var mismatch = false;
              if (k === 'pts') mismatch = Math.abs(sums[k] / gp - a.pts) > 0.01;
              else mismatch = Math.abs(sums[k] - a[k]) > 0.01;
              return React.createElement(
                'div',
                { key: k, style: { color: mismatch ? '#ff0000' : '#34d399' } },
                'sum(' + k + ')=' + sums[k].toFixed(1),
                mismatch ? ' MISMATCH vs avg.' + k + '=' + a[k].toFixed(1) : ' OK'
              );
            })
          );
        })(),

        // Clefs presentes dans le premier log
        p.logs.length > 0 &&
          React.createElement(
            'div',
            { style: { marginTop: '8px' } },
            React.createElement(
              'span',
              { style: { fontWeight: 'bold', color: '#fff' } },
              'Clefs log[0]: '
            ),
            React.createElement(
              'span',
              { style: { color: '#94a3b8', wordBreak: 'break-all' } },
              Object.keys(p.logs[0]).join(', ')
            )
          )
      ),

      // ========== MAIN STATS ROW ==========
      React.createElement(
        'div',
        { className: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4' },
        React.createElement(StatCard, {
          label: 'PTS',
          value: a.pts.toFixed(1),
          valueColor: '#ffffff',
          sub: 'par match',
          accentColor: 'rgba(249,115,22,0.08)',
          fontSize: '2.8rem',
        }),
        React.createElement(StatCard, {
          label: 'REB',
          value: a.reb.toFixed(1),
          valueColor: '#22d3ee',
          sub: a.oreb.toFixed(1) + ' OFF / ' + dreb.toFixed(1) + ' DEF',
          accentColor: 'rgba(34,211,238,0.08)',
        }),
        React.createElement(StatCard, {
          label: 'AST',
          value: a.ast.toFixed(1),
          valueColor: '#34d399',
          sub: 'Ratio: ' + a.astTov.toFixed(1),
          accentColor: 'rgba(52,211,153,0.08)',
        }),
        React.createElement(StatCard, {
          label: 'EVAL',
          value: a.eff.toFixed(1),
          valueColor: a.eff > 12 ? '#facc15' : a.eff > 6 ? '#ffffff' : '#f87171',
          sub: 'PIR: ' + (a.pir || 0).toFixed(1),
          accentColor: 'rgba(250,204,21,0.08)',
        }),
        React.createElement(StatCard, {
          label: 'IMPACT',
          value: a.impactTotal.toFixed(0),
          valueColor: impactColor,
          sub: 'OIS + DIS',
          accentColor: impactColor + '12',
          fontSize: '2.2rem',
        })
      ),

      // ========== DUAL PANEL : RADAR + ADVANCED METRICS ==========
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },

        // Radar
        React.createElement(
          'div',
          {
            style: {
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
              border: '1px solid rgba(100,116,139,0.25)',
              borderRadius: '16px',
              padding: '24px',
            },
          },
          React.createElement(SectionTitle, { num: '1', title: 'Empreinte' }),
          React.createElement(ScoutingRadar, { avg: a }),
          // Fingerprint mini-bars
          arch.fingerprint &&
            React.createElement(
              'div',
              { className: 'mt-4 space-y-1.5' },
              Object.keys(arch.fingerprint).map(function (dim) {
                var val = arch.fingerprint[dim] || 0;
                var dimLabels = {
                  volume: 'VOL',
                  efficiency: 'EFF',
                  shooting: 'TIR',
                  creation: 'CREA',
                  rebounding: 'REB',
                  interior: 'INT',
                  defense: 'DEF',
                  impact: 'IMP',
                };
                var dimColor =
                  val >= 70 ? '#34d399' : val >= 45 ? '#22d3ee' : val >= 25 ? '#f59e0b' : '#64748b';
                return React.createElement(
                  'div',
                  { key: dim, className: 'flex items-center gap-2' },
                  React.createElement(
                    'span',
                    {
                      className: 'text-[9px] font-bold w-8 text-right',
                      style: { color: '#64748b' },
                    },
                    dimLabels[dim] || dim
                  ),
                  React.createElement(
                    'div',
                    {
                      className: 'flex-1 h-1.5 rounded-full overflow-hidden',
                      style: { background: 'rgba(15,23,42,0.8)' },
                    },
                    React.createElement('div', {
                      className: 'h-full rounded-full',
                      style: { width: val + '%', background: dimColor },
                    })
                  ),
                  React.createElement(
                    'span',
                    { className: 'text-[9px] font-bold w-6', style: { color: dimColor } },
                    val
                  )
                );
              })
            )
        ),

        // Advanced Metrics
        React.createElement(
          'div',
          {
            className: 'lg:col-span-2',
            style: {
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
              border: '1px solid rgba(100,116,139,0.25)',
              borderRadius: '16px',
              padding: '24px',
            },
          },
          React.createElement(SectionTitle, {
            num: '2',
            title: 'Efficacit\u00e9 Offensive',
            badge: gp + ' matchs',
          }),

          // Impact Total highlight
          React.createElement(
            'div',
            {
              className: 'mb-6 flex items-center justify-between p-4 rounded-xl',
              style: {
                background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(34,211,238,0.08))',
                border: '1px solid rgba(99,102,241,0.2)',
              },
            },
            React.createElement(
              'div',
              null,
              React.createElement(
                'div',
                {
                  className: 'text-xs font-bold uppercase tracking-widest',
                  style: { color: '#818cf8' },
                },
                'Impact Total'
              ),
              React.createElement(
                'div',
                { className: 'text-[10px] mt-0.5', style: { color: '#64748b' } },
                'Elite \u2265 110 \u2022 Bon \u2265 85 \u2022 Correct \u2265 60'
              )
            ),
            React.createElement(
              'div',
              { className: 'text-3xl font-black', style: { color: impactColor } },
              a.impactTotal.toFixed(1)
            )
          ),

          // Progress bars
          React.createElement(
            'div',
            { className: 'space-y-1' },
            React.createElement(ProgressBar, {
              label: 'eFG%',
              value: a.eFG,
              display: a.eFG.toFixed(1) + '%',
              color: efgColor,
            }),
            React.createElement(ProgressBar, {
              label: 'TS%',
              value: a.TS,
              display: a.TS.toFixed(1) + '%',
              color: tsColor,
            }),
            React.createElement(ProgressBar, {
              label: 'Usage',
              value: a.usage,
              display: a.usage.toFixed(1) + '%',
              color: usageColor,
            }),
            React.createElement(ProgressBar, {
              label: 'FG%',
              value: fgPctGlobal,
              display: fgPctGlobal.toFixed(1) + '%',
              color: fgPctGlobal > 50 ? '#34d399' : fgPctGlobal > 42 ? '#22d3ee' : '#f87171',
            }),
            React.createElement(ProgressBar, {
              label: '3PT%',
              value: a.threePct,
              display: a.threePct.toFixed(1) + '%',
              color:
                a.threePct > B.threePct_good ? '#34d399' : a.threePct > 28 ? '#f59e0b' : '#f87171',
            }),
            React.createElement(ProgressBar, {
              label: 'LF%',
              value: a.ftPct,
              display: a.ftPct.toFixed(1) + '%',
              color: a.ftPct > 75 ? '#34d399' : a.ftPct > 60 ? '#f59e0b' : '#f87171',
            }),
            React.createElement(ProgressBar, {
              label: 'FTr',
              value: a.FTr * 100,
              display: a.FTr.toFixed(2),
              color: a.FTr > 0.35 ? '#34d399' : '#94a3b8',
            })
          ),

          // Shooting splits row
          React.createElement(
            'div',
            {
              className: 'grid grid-cols-4 gap-3 mt-5 pt-4',
              style: { borderTop: '1px solid rgba(51,65,85,0.3)' },
            },
            React.createElement(
              'div',
              { className: 'text-center' },
              React.createElement(
                'div',
                { className: 'text-lg font-black text-white' },
                totalFGM.toFixed(0) + '-' + totalFGA.toFixed(0)
              ),
              React.createElement(
                'div',
                { className: 'text-[9px] text-slate-500 uppercase font-bold' },
                'FG (cum.)'
              )
            ),
            React.createElement(
              'div',
              { className: 'text-center' },
              React.createElement(
                'div',
                { className: 'text-lg font-black', style: { color: '#22d3ee' } },
                a.threem.toFixed(0) + '-' + a.threea.toFixed(0)
              ),
              React.createElement(
                'div',
                { className: 'text-[9px] text-slate-500 uppercase font-bold' },
                '3PT (cum.)'
              )
            ),
            React.createElement(
              'div',
              { className: 'text-center' },
              React.createElement(
                'div',
                { className: 'text-lg font-black text-white' },
                a.ftm.toFixed(0) + '-' + a.fta.toFixed(0)
              ),
              React.createElement(
                'div',
                { className: 'text-[9px] text-slate-500 uppercase font-bold' },
                'FT (cum.)'
              )
            ),
            React.createElement(
              'div',
              { className: 'text-center' },
              React.createElement(
                'div',
                { className: 'text-lg font-black', style: { color: '#f59e0b' } },
                a.tov.toFixed(1)
              ),
              React.createElement(
                'div',
                { className: 'text-[9px] text-slate-500 uppercase font-bold' },
                'TOV/m'
              )
            )
          )
        )
      ),

      // ========== SECTION 3 : DEFENSE & HUSTLE ==========
      React.createElement(
        'div',
        {
          style: {
            background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
            border: '1px solid rgba(100,116,139,0.25)',
            borderRadius: '16px',
            padding: '24px',
          },
        },
        React.createElement(SectionTitle, { num: '3', title: 'Impact D\u00e9fensif & Hustle' }),
        React.createElement(
          'div',
          { className: 'grid grid-cols-3 md:grid-cols-6 gap-4' },
          [
            { l: 'STL', v: a.stl.toFixed(1), c: a.stl > 1.5 ? '#34d399' : '#fff' },
            { l: 'BLK', v: a.blk.toFixed(1), c: a.blk > 1.0 ? '#34d399' : '#fff' },
            { l: 'OREB', v: a.oreb.toFixed(1), c: a.oreb > B.oreb_good ? '#34d399' : '#fff' },
            {
              l: 'PF',
              v: a.fouls.toFixed(1),
              c: a.fouls > 3.5 ? '#f87171' : a.fouls > 2.5 ? '#f59e0b' : '#fff',
              sub: a.pf36.toFixed(1) + '/36m',
            },
            {
              l: 'NET RTG',
              v: (a.netRtg > 0 ? '+' : '') + a.netRtg.toFixed(0),
              c: a.netRtg > 0 ? '#34d399' : a.netRtg < 0 ? '#f87171' : '#94a3b8',
            },
            {
              l: 'STL+BLK',
              v: (a.stl + a.blk).toFixed(1),
              c: a.stl + a.blk > B.def_active ? '#22d3ee' : '#fff',
            },
          ].map(function (item) {
            return React.createElement(
              'div',
              {
                key: item.l,
                className: 'text-center p-3 rounded-xl',
                style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)' },
              },
              React.createElement(
                'div',
                { className: 'text-2xl font-black', style: { color: item.c } },
                item.v
              ),
              React.createElement(
                'div',
                {
                  className: 'text-[10px] font-bold uppercase tracking-wide mt-1',
                  style: { color: '#64748b' },
                },
                item.l
              ),
              item.sub &&
                React.createElement(
                  'div',
                  { className: 'text-[9px] mt-0.5', style: { color: '#475569' } },
                  item.sub
                )
            );
          })
        )
      ),

      // ========== SECTION 4 : PER 30 ==========
      React.createElement(
        'div',
        {
          style: {
            background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
            border: '1px solid rgba(100,116,139,0.25)',
            borderRadius: '16px',
            padding: '24px',
          },
        },
        React.createElement(SectionTitle, {
          num: '4',
          title: 'Projection Titulaire FIBA (Per 30)',
          badge: a.min.toFixed(1) + ' min/m',
        }),
        a.min < 10 &&
          React.createElement(
            'div',
            {
              className: 'mb-4 px-3 py-2 rounded-lg text-xs',
              style: {
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: '#f59e0b',
              },
            },
            'Faible \u00e9chantillon (' +
              a.min.toFixed(1) +
              ' min/match). Projections \u00e0 consid\u00e9rer avec prudence.'
          ),
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 md:grid-cols-5 gap-4' },
          [
            { l: 'PTS/30', v: p30.pts.toFixed(1), c: p30.pts > 18 ? '#f97316' : '#fff' },
            { l: 'REB/30', v: p30.reb.toFixed(1), c: p30.reb > 8 ? '#22d3ee' : '#fff' },
            { l: 'AST/30', v: p30.ast.toFixed(1), c: p30.ast > 5 ? '#34d399' : '#fff' },
            { l: 'STL/30', v: p30.stl.toFixed(1), c: p30.stl > 2 ? '#34d399' : '#fff' },
            {
              l: 'PF/30',
              v: p30.pf.toFixed(1),
              c: p30.pf > 4.5 ? '#f87171' : p30.pf > 3.5 ? '#f59e0b' : '#fff',
              sub: 'r\u00e9el: ' + a.fouls.toFixed(1),
            },
          ].map(function (item) {
            return React.createElement(
              'div',
              {
                key: item.l,
                className: 'text-center p-4 rounded-xl',
                style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)' },
              },
              React.createElement(
                'div',
                { className: 'text-2xl font-black', style: { color: item.c } },
                item.v
              ),
              React.createElement(
                'div',
                {
                  className: 'text-[10px] font-bold uppercase tracking-wide mt-1',
                  style: { color: '#64748b' },
                },
                item.l
              ),
              item.sub &&
                React.createElement(
                  'div',
                  { className: 'text-[9px] mt-0.5', style: { color: '#475569' } },
                  item.sub
                )
            );
          })
        )
      ),

      // ========== SECTION 5 : ANALYSE DU COACH ==========
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
        // Forces
        React.createElement(
          'div',
          {
            className: 'relative overflow-hidden',
            style: {
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
              border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: '16px',
              padding: '24px',
            },
          },
          React.createElement('div', {
            className: 'absolute top-0 right-0 w-32 h-32 pointer-events-none',
            style: { background: 'radial-gradient(circle, rgba(34,197,94,0.06), transparent)' },
          }),
          React.createElement(SectionTitle, { num: '5', title: 'Points Forts' }),
          topS.length > 0
            ? React.createElement(
                'div',
                { className: 'space-y-3' },
                topS.map(function (s, i) {
                  return React.createElement(
                    'div',
                    {
                      key: i,
                      className: 'flex gap-3 p-3 rounded-xl text-sm',
                      style: {
                        background: 'rgba(34,197,94,0.06)',
                        border: '1px solid rgba(34,197,94,0.12)',
                      },
                    },
                    React.createElement(
                      'span',
                      { className: 'shrink-0 font-bold', style: { color: '#34d399' } },
                      s.icon
                    ),
                    React.createElement('span', { style: { color: '#d1d5db' } }, s.text)
                  );
                })
              )
            : React.createElement(
                'p',
                { className: 'text-sm italic', style: { color: '#475569' } },
                'Pas de point fort marquant identifi\u00e9.'
              )
        ),
        // Progressions
        React.createElement(
          'div',
          {
            className: 'relative overflow-hidden',
            style: {
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
              border: '1px solid rgba(249,115,22,0.15)',
              borderRadius: '16px',
              padding: '24px',
            },
          },
          React.createElement('div', {
            className: 'absolute top-0 right-0 w-32 h-32 pointer-events-none',
            style: { background: 'radial-gradient(circle, rgba(249,115,22,0.06), transparent)' },
          }),
          React.createElement(
            'div',
            { className: 'flex items-center gap-3 mb-5' },
            React.createElement('div', { className: 'w-8 h-8' }),
            React.createElement(
              'h3',
              { className: 'text-sm font-bold uppercase tracking-widest text-slate-300' },
              'Axes de Progression'
            )
          ),
          topI.length > 0
            ? React.createElement(
                'div',
                { className: 'space-y-3' },
                topI.map(function (s, i) {
                  return React.createElement(
                    'div',
                    {
                      key: i,
                      className: 'flex gap-3 p-3 rounded-xl text-sm',
                      style: {
                        background: 'rgba(249,115,22,0.06)',
                        border: '1px solid rgba(249,115,22,0.12)',
                      },
                    },
                    React.createElement(
                      'span',
                      { className: 'shrink-0 font-bold', style: { color: '#f97316' } },
                      s.icon
                    ),
                    React.createElement('span', { style: { color: '#d1d5db' } }, s.text)
                  );
                })
              )
            : React.createElement(
                'p',
                { className: 'text-sm italic', style: { color: '#475569' } },
                'Aucun axe prioritaire identifi\u00e9.'
              )
        )
      ),

      // ========== NARRATIVE ==========
      React.createElement(
        'div',
        {
          style: {
            background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
            border: '1px solid rgba(100,116,139,0.25)',
            borderRadius: '16px',
            padding: '24px',
          },
        },
        React.createElement(
          'div',
          { className: 'flex items-center gap-2 mb-3' },
          React.createElement(
            'span',
            {
              className: 'text-xs font-bold uppercase tracking-widest',
              style: { color: '#94a3b8' },
            },
            'Note Scouting'
          )
        ),
        React.createElement(
          'p',
          { className: 'text-lg leading-relaxed font-medium', style: { color: '#e2e8f0' } },
          narrativeText
        )
      ),

      // ========== LAST 5 GAMES ==========
      React.createElement(
        'div',
        {
          style: {
            background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
            border: '1px solid rgba(100,116,139,0.25)',
            borderRadius: '16px',
            padding: '24px',
          },
        },
        React.createElement(
          'div',
          { className: 'flex items-center gap-2 mb-4' },
          React.createElement(
            'span',
            {
              className: 'text-xs font-bold uppercase tracking-widest',
              style: { color: '#94a3b8' },
            },
            '5 Derniers Matchs'
          )
        ),
        React.createElement(
          'div',
          { className: 'overflow-x-auto' },
          React.createElement(
            'table',
            { className: 'w-full text-sm' },
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                { style: { borderBottom: '1px solid rgba(51,65,85,0.4)' } },
                [
                  'Date',
                  'Adv.',
                  'MIN',
                  'PTS',
                  'REB',
                  'AST',
                  'STL',
                  'BLK',
                  'TOV',
                  'FG%',
                  '3P%',
                  '+/-',
                  'EFF',
                ].map(function (h) {
                  return React.createElement(
                    'th',
                    {
                      key: h,
                      className:
                        'text-[10px] font-bold uppercase tracking-wider text-right first:text-left px-2 py-2',
                      style: { color: '#475569' },
                    },
                    h
                  );
                })
              )
            ),
            React.createElement(
              'tbody',
              null,
              last5.map(function (g, i) {
                var gameFgPct = g.fga > 0 ? ((g.fgm / g.fga) * 100).toFixed(0) : '-';
                var game3Pct = g.threePA > 0 ? ((g.threePM / g.threePA) * 100).toFixed(0) : '-';
                return React.createElement(
                  'tr',
                  {
                    key: i,
                    className: 'transition-colors',
                    style: {
                      borderBottom: '1px solid rgba(30,41,59,0.5)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                    },
                  },
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-left', style: { color: '#94a3b8' } },
                    g.date
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right font-medium text-white' },
                    g.opponent
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right', style: { color: '#94a3b8' } },
                    g.min
                  ),
                  React.createElement(
                    'td',
                    {
                      className: 'px-2 py-2 text-xs text-right font-bold',
                      style: { color: g.pts >= 20 ? '#f97316' : '#fff' },
                    },
                    g.pts
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right', style: { color: '#22d3ee' } },
                    g.reb
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right', style: { color: '#34d399' } },
                    g.ast
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right text-white' },
                    g.stl
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right text-white' },
                    g.blk
                  ),
                  React.createElement(
                    'td',
                    {
                      className: 'px-2 py-2 text-xs text-right',
                      style: { color: g.tov >= 4 ? '#f87171' : '#94a3b8' },
                    },
                    g.tov
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right text-white' },
                    gameFgPct + '%'
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-2 py-2 text-xs text-right', style: { color: '#60a5fa' } },
                    game3Pct + '%'
                  ),
                  React.createElement(
                    'td',
                    {
                      className: 'px-2 py-2 text-xs text-right font-bold',
                      style: {
                        color:
                          g.plusMinus > 0 ? '#34d399' : g.plusMinus < 0 ? '#f87171' : '#94a3b8',
                      },
                    },
                    (g.plusMinus > 0 ? '+' : '') + g.plusMinus
                  ),
                  React.createElement(
                    'td',
                    {
                      className: 'px-2 py-2 text-xs text-right font-bold',
                      style: { color: '#facc15' },
                    },
                    g.eff
                  )
                );
              })
            )
          )
        )
      ),

      // ========== SHOT CHART ==========
      (function () {
        var ShotChartComp = window.ShotChart;
        if (!ShotChartComp || !propGames) return null;
        var rawPid = p.id;
        if (!rawPid) return null;
        var numPid = Number(rawPid);
        var playerShots = [];
        propGames.forEach(function (g) {
          if (!g.actions || !g.actions.length) return;
          g.actions.forEach(function (ac) {
            if (ac.type === 'SHOT' && (ac.pid === rawPid || ac.pid === numPid))
              playerShots.push(ac);
          });
        });
        if (playerShots.length === 0) return null;
        return React.createElement(
          'div',
          {
            style: {
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
              border: '1px solid rgba(100,116,139,0.25)',
              borderRadius: '16px',
              padding: '24px',
            },
          },
          React.createElement(SectionTitle, { num: '', title: 'Shot Chart' }),
          React.createElement(ShotChartComp, { shots: playerShots, playerName: p.name || '' })
        );
      })(),

      // ========== 5-MAN LINEUPS ==========
      (function () {
        var currentPlayerId = p.id;
        var lineups = calcFiveManLineups(currentPlayerId, propGames, propRoster);
        if (lineups.total === 0) return null;

        var renderLineup = function (lu, idx) {
          return React.createElement(
            'div',
            {
              key: idx,
              className: 'flex items-center gap-2 p-3 rounded-xl',
              style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.3)' },
            },
            React.createElement(
              'div',
              { className: 'flex-1 min-w-0' },
              React.createElement(
                'div',
                { className: 'text-xs text-white font-medium' },
                lu.names.join(' \u2022 ')
              ),
              React.createElement(
                'div',
                { className: 'flex items-center gap-2 mt-0.5' },
                React.createElement(
                  'span',
                  { className: 'text-[10px]', style: { color: '#64748b' } },
                  lu.poss + ' poss'
                ),
                lu.lowSample &&
                  React.createElement(
                    'span',
                    {
                      className: 'text-[9px] px-1 rounded',
                      style: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
                    },
                    'Faible \u00e9ch.'
                  )
              )
            ),
            React.createElement(
              'div',
              { className: 'text-center px-2' },
              React.createElement(
                'div',
                { className: 'text-[10px]', style: { color: '#64748b' } },
                'ORtg'
              ),
              React.createElement(
                'div',
                { className: 'text-xs font-bold', style: { color: '#a78bfa' } },
                lu.ortg
              )
            ),
            React.createElement(
              'div',
              { className: 'text-center px-2' },
              React.createElement(
                'div',
                { className: 'text-[10px]', style: { color: '#64748b' } },
                'DRtg'
              ),
              React.createElement(
                'div',
                { className: 'text-xs font-bold', style: { color: '#f87171' } },
                lu.drtg
              )
            ),
            React.createElement(
              'div',
              { className: 'text-center px-2' },
              React.createElement(
                'div',
                {
                  className: 'text-sm font-bold',
                  style: { color: lu.netRtg >= 0 ? '#34d399' : '#f87171' },
                },
                (lu.netRtg > 0 ? '+' : '') + lu.netRtg
              ),
              React.createElement(
                'div',
                { className: 'text-[10px]', style: { color: '#64748b' } },
                'Net Rtg'
              )
            ),
            React.createElement(
              'div',
              { className: 'text-right ml-2' },
              React.createElement(
                'div',
                {
                  className: 'text-xs font-mono',
                  style: { color: lu.pm >= 0 ? '#34d399' : '#f87171' },
                },
                (lu.pm > 0 ? '+' : '') + lu.pm
              ),
              React.createElement(
                'div',
                { className: 'text-[10px]', style: { color: '#64748b' } },
                '+/-'
              )
            )
          );
        };

        return React.createElement(
          'div',
          {
            style: {
              background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.5))',
              border: '1px solid rgba(100,116,139,0.25)',
              borderRadius: '16px',
              padding: '24px',
            },
          },
          React.createElement(SectionTitle, {
            num: '',
            title: '5-Man Lineups',
            badge: lineups.total + ' combos',
          }),
          lineups.best.length > 0 &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'h4',
                {
                  className: 'text-xs font-bold uppercase tracking-widest mb-3',
                  style: { color: '#34d399' },
                },
                'Meilleurs Lineups'
              ),
              React.createElement(
                'div',
                { className: 'space-y-2 mb-5' },
                lineups.best.map(renderLineup)
              )
            ),
          lineups.worst.length > 0 &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'h4',
                {
                  className: 'text-xs font-bold uppercase tracking-widest mb-3',
                  style: { color: '#f87171' },
                },
                'Pires Lineups'
              ),
              React.createElement(
                'div',
                { className: 'space-y-2' },
                lineups.worst.map(renderLineup)
              )
            )
        );
      })(),

      // ON/OFF COURT IMPACT
      (() => {
        const onOff = AnalysisEngine.calcOnOffAggregated(propGames, p.id, propRoster);
        if (!onOff) return null;

        const fmtNet = (v) => (v > 0 ? '+' + v : '' + v);
        const diffColor = (v) => v >= 0 ? 'text-green-400' : 'text-red-400';

        return React.createElement(
          'div',
          { className: 'bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6' },
          // Header
          React.createElement(
            'div',
            { className: 'p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between' },
            React.createElement('h3', { className: 'text-xs font-bold text-slate-400 uppercase' }, 'Impact On/Off Court'),
            React.createElement('span', { className: 'text-[10px] text-slate-600' }, onOff.gamesUsed + ' matchs PBP')
          ),
          // Body
          React.createElement(
            'div',
            { className: 'p-4' },
            // Tableau ON vs OFF
            React.createElement(
              'div',
              { className: 'grid grid-cols-3 gap-2 text-center text-xs mb-4' },
              React.createElement('div', null),
              React.createElement('div', { className: 'font-bold text-green-400 uppercase text-[10px]' }, 'ON Court'),
              React.createElement('div', { className: 'font-bold text-red-400 uppercase text-[10px]' }, 'OFF Court'),

              React.createElement('div', { className: 'text-slate-500 text-right pr-2' }, 'ORtg'),
              React.createElement('div', { className: 'font-bold text-white' }, onOff.on.ortg),
              React.createElement('div', { className: 'font-bold text-white' }, onOff.off.ortg),

              React.createElement('div', { className: 'text-slate-500 text-right pr-2' }, 'DRtg'),
              React.createElement('div', { className: 'font-bold text-white' }, onOff.on.drtg),
              React.createElement('div', { className: 'font-bold text-white' }, onOff.off.drtg),

              React.createElement('div', { className: 'text-slate-500 text-right pr-2' }, 'Net'),
              React.createElement('div', { className: 'font-bold ' + diffColor(onOff.netOn) }, fmtNet(onOff.netOn)),
              React.createElement('div', { className: 'font-bold ' + diffColor(onOff.netOff) }, fmtNet(onOff.netOff)),

              React.createElement('div', { className: 'text-slate-500 text-right pr-2' }, 'Poss'),
              React.createElement('div', { className: 'text-slate-300' }, onOff.on.poss),
              React.createElement('div', { className: 'text-slate-300' }, onOff.off.poss)
            ),
            // Différentiel
            React.createElement(
              'div',
              { className: 'text-center p-3 rounded-lg bg-slate-950 border border-slate-800' },
              React.createElement('div', { className: 'text-[10px] text-slate-500 uppercase mb-1' }, 'Différentiel Net'),
              React.createElement('div', { className: 'text-2xl font-black ' + diffColor(onOff.netDiff) }, fmtNet(onOff.netDiff)),
              React.createElement(
                'div',
                { className: 'text-[10px] text-slate-600 mt-1' },
                "L'équipe est " + (onOff.netDiff >= 0 ? 'meilleure' : 'moins bonne') + ' de ' + Math.abs(onOff.netDiff) + ' pts/100 poss avec ce joueur'
              )
            ),
            // AST% / TOV%
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-3 mt-4' },
              React.createElement(
                'div',
                { className: 'bg-slate-950 rounded-lg p-3 text-center border border-slate-800' },
                React.createElement('div', { className: 'text-[10px] text-slate-500 uppercase' }, 'AST%'),
                React.createElement('div', { className: 'text-lg font-bold text-blue-400' }, (p.avg.astPct || 0).toFixed(1) + '%'),
                React.createElement('div', { className: 'text-[9px] text-slate-600' }, '% paniers équipe assistés')
              ),
              React.createElement(
                'div',
                { className: 'bg-slate-950 rounded-lg p-3 text-center border border-slate-800' },
                React.createElement('div', { className: 'text-[10px] text-slate-500 uppercase' }, 'TOV%'),
                React.createElement('div', { className: 'text-lg font-bold text-red-400' }, (p.avg.tovPct || 0).toFixed(1) + '%'),
                React.createElement('div', { className: 'text-[9px] text-slate-600' }, '% possessions en perte')
              )
            )
          )
        );
      })(),

      // PROGRESSION PAR PHASE
      (() => {
        const progression = AnalysisEngine.calcPhaseProgression(p, propPhases, propGames);
        if (!progression) return null;

        const STATS = [
          { key: 'pts',      label: 'PTS',  dec: 1 },
          { key: 'reb',      label: 'REB',  dec: 1 },
          { key: 'ast',      label: 'AST',  dec: 1 },
          { key: 'tov',      label: 'BP',   dec: 1, invert: true },
          { key: 'eff',      label: 'EFF',  dec: 1 },
          { key: 'min',      label: 'MIN',  dec: 1 },
          { key: 'usage',    label: 'USG%', dec: 1 },
          { key: 'fgPct',    label: 'FG%',  dec: 1 },
          { key: 'threePct', label: '3P%',  dec: 1 },
          { key: 'TS',       label: 'TS%',  dec: 1 },
        ];

        const deltaColor = (val, invert) => {
          if (Math.abs(val) < 0.05) return 'text-slate-500';
          const positive = invert ? val < 0 : val > 0;
          return positive ? 'text-green-400' : 'text-red-400';
        };

        return React.createElement(
          'div',
          { className: 'bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6' },
          React.createElement(
            'div',
            { className: 'p-4 bg-slate-950 border-b border-slate-800' },
            React.createElement('h3', { className: 'text-xs font-bold text-slate-400 uppercase' }, 'Progression par phase')
          ),
          React.createElement(
            'div',
            { className: 'p-4 overflow-x-auto' },
            React.createElement(
              'table',
              { className: 'w-full text-xs' },
              React.createElement(
                'thead',
                null,
                React.createElement(
                  'tr',
                  { className: 'border-b border-slate-800 text-slate-500' },
                  React.createElement('th', { className: 'text-left p-2' }, 'Phase'),
                  React.createElement('th', { className: 'text-center p-1 text-[10px]' }, 'MJ'),
                  ...STATS.map(s => React.createElement('th', { key: s.key, className: 'text-center p-1 text-[10px]' }, s.label))
                )
              ),
              React.createElement(
                'tbody',
                null,
                ...progression.map((ph, idx) => {
                  const prev = idx > 0 ? progression[idx - 1] : null;
                  return React.createElement(
                    'tr',
                    { key: ph.phaseId, className: 'border-b border-slate-800/50' },
                    React.createElement('td', { className: 'p-2 font-bold text-white whitespace-nowrap' }, ph.phaseName),
                    React.createElement('td', { className: 'text-center text-slate-400' }, ph.gp),
                    ...STATS.map(s => {
                      const val = ph.avg[s.key] || 0;
                      const delta = prev ? val - (prev.avg[s.key] || 0) : null;
                      return React.createElement(
                        'td',
                        { key: s.key, className: 'text-center p-1' },
                        React.createElement('div', { className: 'font-bold text-white' }, val.toFixed(s.dec)),
                        delta !== null && Math.abs(delta) >= 0.05
                          ? React.createElement(
                              'div',
                              { className: 'text-[9px] ' + deltaColor(delta, s.invert) },
                              (delta > 0 ? '+' : '') + delta.toFixed(s.dec)
                            )
                          : null
                      );
                    })
                  );
                })
              )
            )
          )
        );
      })(),

      // COMPARAISON INTER-SAISONS
      (() => {
        if (!propSeasons || propSeasons.length === 0) return null;

        const comparison = compareSeasonId
          ? AnalysisEngine.calcSeasonComparison(p, propSeasons.find(s => s.id === compareSeasonId))
          : null;

        const STATS = [
          { key: 'pts',      label: 'PTS',  dec: 1 },
          { key: 'reb',      label: 'REB',  dec: 1 },
          { key: 'ast',      label: 'AST',  dec: 1 },
          { key: 'tov',      label: 'BP',   dec: 1, invert: true },
          { key: 'eff',      label: 'EFF',  dec: 1 },
          { key: 'min',      label: 'MIN',  dec: 1 },
          { key: 'usage',    label: 'USG%', dec: 1 },
          { key: 'fgPct',    label: 'FG%',  dec: 1 },
          { key: 'threePct', label: '3P%',  dec: 1 },
          { key: 'ftPct',    label: 'LF%',  dec: 1 },
          { key: 'TS',       label: 'TS%',  dec: 1 },
        ];

        const deltaColor = (val, invert) => {
          if (Math.abs(val) < 0.05) return 'text-slate-500';
          return (invert ? val < 0 : val > 0) ? 'text-green-400' : 'text-red-400';
        };

        return React.createElement(
          'div',
          { className: 'bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6' },
          // Header
          React.createElement(
            'div',
            { className: 'p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2' },
            React.createElement('h3', { className: 'text-xs font-bold text-slate-400 uppercase' }, 'Comparaison saisons'),
            React.createElement(
              'select',
              {
                value: compareSeasonId,
                onChange: (e) => setCompareSeasonId(e.target.value),
                className: 'bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs',
              },
              React.createElement('option', { value: '' }, '-- Choisir une saison --'),
              ...propSeasons.map(s => React.createElement(
                'option',
                { key: s.id, value: s.id },
                s.name + ' (' + (s.games || []).length + ' matchs)'
              ))
            )
          ),
          // État vide
          !compareSeasonId && React.createElement(
            'div',
            { className: 'p-6 text-center text-slate-600 text-xs' },
            'Sélectionnez une saison archivée pour comparer.'
          ),
          // Joueur introuvable
          compareSeasonId && !comparison && React.createElement(
            'div',
            { className: 'p-6 text-center text-slate-600 text-xs' },
            'Joueur introuvable dans cette saison (id différent ou aucune stat).'
          ),
          // Tableau comparatif
          comparison && React.createElement(
            'div',
            { className: 'p-4 overflow-x-auto' },
            React.createElement(
              'table',
              { className: 'w-full text-xs' },
              React.createElement(
                'thead',
                null,
                React.createElement(
                  'tr',
                  { className: 'border-b border-slate-800 text-slate-500' },
                  React.createElement('th', { className: 'text-left p-2' }, 'Saison'),
                  React.createElement('th', { className: 'text-center p-1 text-[10px]' }, 'MJ'),
                  ...STATS.map(s => React.createElement('th', { key: s.key, className: 'text-center p-1 text-[10px]' }, s.label))
                )
              ),
              React.createElement(
                'tbody',
                null,
                // Saison archivée
                React.createElement(
                  'tr',
                  { className: 'border-b border-slate-800/50' },
                  React.createElement('td', { className: 'p-2 font-bold text-amber-400 whitespace-nowrap' }, comparison.archivedName),
                  React.createElement('td', { className: 'text-center text-slate-400' }, comparison.archivedGp),
                  ...STATS.map(s => React.createElement(
                    'td',
                    { key: s.key, className: 'text-center p-1 text-slate-300' },
                    (comparison.archivedAvg[s.key] || 0).toFixed(s.dec)
                  ))
                ),
                // Saison courante
                React.createElement(
                  'tr',
                  { className: 'border-b border-slate-800/50' },
                  React.createElement('td', { className: 'p-2 font-bold text-orange-400 whitespace-nowrap' }, 'Actuelle'),
                  React.createElement('td', { className: 'text-center text-slate-400' }, p.logs.length),
                  ...STATS.map(s => React.createElement(
                    'td',
                    { key: s.key, className: 'text-center p-1' },
                    React.createElement('div', { className: 'font-bold text-white' }, (p.avg[s.key] || 0).toFixed(s.dec)),
                    Math.abs(comparison.deltas[s.key] || 0) >= 0.05
                      ? React.createElement(
                          'div',
                          { className: 'text-[9px] ' + deltaColor(comparison.deltas[s.key], s.invert) },
                          (comparison.deltas[s.key] > 0 ? '+' : '') + (comparison.deltas[s.key] || 0).toFixed(s.dec)
                        )
                      : null
                  ))
                )
              )
            )
          )
        );
      })(),

      // Spacer bottom
      React.createElement('div', { className: 'h-8' })
    )
  );
};

window.PlayerReportModule = PlayerReportModule;
