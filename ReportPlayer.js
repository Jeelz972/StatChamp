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
  computeQuarterStats: function(playerId, games) {
    var qMap = {};
    if (!games || !Array.isArray(games)) return null;
    games.forEach(function(g) {
      if (!g.actions || !g.actions.length) return;
      g.actions.forEach(function(a) {
        var pid = a.pid;
        if (Number(pid) !== Number(playerId) && String(pid) !== String(playerId)) return;
        var q = a.q || a.quarter || 0;
        if (!q || q > 4) return; // ignore OT pour la fatigue
        if (!qMap[q]) qMap[q] = { q: q, pts: 0, fgm: 0, fga: 0, fta: 0, ftm: 0, tov: 0, reb: 0, stl: 0, blk: 0, min: 0 };
        var m = qMap[q];
        if (a.type === 'SHOT') {
          m.fga++;
          if (a.made) { m.fgm++; m.pts += a.val || 2; }
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
      games.forEach(function(g) {
        var raw = g.players || g.playerStats;
        if (!raw) return;
        var list = Array.isArray(raw) ? raw : Object.values(raw);
        list.forEach(function(s) {
          if (Number(s.id) === Number(playerId) || String(s.id) === String(playerId)) {
            totalMinutes += parseFloat(s.min || s.minutes || 0);
          }
        });
      });
    }
    var minPerQ = totalMinutes > 0 ? totalMinutes / (qStats.length * (games.length || 1)) : 2.5;
    qStats.forEach(function(q) { if (q.min === 0) q.min = minPerQ; });
    // Calculer EFF par quart
    qStats.forEach(function(q) {
      q.eff = window.StatsEngine.EFF(q.pts, q.reb, 0, q.stl, q.blk, q.fga, q.fgm, q.fta, q.ftm, q.tov);
    });
    return window.StatsEngine.fatigueProfile(qStats);
  },

  // F3 — Clustering dynamique des rôles dans l'équipe (k-means sur fingerprint 6D)
  computeSquadClusters: function(player, allPlayers, games) {
    var eligible = (allPlayers || []).filter(function(p) {
      return p && p.logs && p.logs.length >= 3 && p.avg && (p.avg.min || 0) >= 10;
    });
    if (eligible.length < 4) return null;
    var fps = eligible.map(function(p) {
      return AnalysisEngine.computeFingerprint(p, eligible, games);
    });
    var vectors = fps.map(function(fp) {
      if (!fp) return null;
      return [fp.volume || 0, fp.efficiency || 0, fp.shooting || 0, fp.creation || 0, fp.rebounding || 0, fp.defense || 0];
    }).filter(Boolean);
    if (vectors.length < 4) return null;
    var k = Math.min(4, Math.floor(vectors.length / 2));
    var eligibleFp = eligible.filter(function(_, i) { return fps[i] !== null; });
    var assignments = window.StatsEngine.kMeansCluster(vectors, k);
    var playerIdx = eligibleFp.findIndex(function(p) { return Number(p.id) === Number(player.id) || String(p.id) === String(player.id); });
    if (playerIdx === -1) return null;
    var playerCluster = assignments[playerIdx];
    var clusterMembers = eligibleFp.filter(function(_, i) { return assignments[i] === playerCluster; });
    var clusterVecs = vectors.filter(function(_, i) { return assignments[i] === playerCluster; });
    var dims = ['volume', 'efficiency', 'shooting', 'creation', 'rebounding', 'defense'];
    var centroid = dims.map(function(_, di) {
      return clusterVecs.reduce(function(s, v) { return s + v[di]; }, 0) / clusterVecs.length;
    });
    var sortedDims = dims.slice().sort(function(a, b) { return centroid[dims.indexOf(b)] - centroid[dims.indexOf(a)]; });
    var LABELS = {
      'volume+efficiency': 'Scoreur Dominant', 'volume+creation': 'Moteur Offensif',
      'volume+shooting': 'Scoreur Extérieur', 'volume+interior': 'Force Intérieure',
      'rebounding+defense': 'Ancre Défensive', 'defense+rebounding': 'Ancre Défensive',
      'shooting+efficiency': 'Spacer Élite', 'creation+efficiency': 'Maestro',
      'efficiency+shooting': 'Tireur Clinique', 'creation+volume': 'Moteur Offensif',
    };
    var key = sortedDims[0] + '+' + sortedDims[1];
    var label = LABELS[key] || ('Profil ' + sortedDims[0].charAt(0).toUpperCase() + sortedDims[0].slice(1));
    return {
      label: label,
      topDim: sortedDims[0],
      members: clusterMembers.map(function(p) { return { id: p.id, name: p.name, number: p.number }; }),
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
        const OIS = window.StatsEngine.OIS(avg.pts, avg.ast, avg.oreb, avg.fte, avg.tov);
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
          `Player ${p.name} tir toala= ${avg.fga} ts=${avg.TS} calcul TS% ${window.StatsEngine.TS(avg.pts, avg.fga, avg.fta)} efg=${avg.eFG} 3PAr=${avg.threePAr} FTr=${avg.FTr} astTov=${avg.astTov}`
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
      const oppPoss = Math.max(1, window.StatsEngine.possSimple(m.oppFga, m.oppFta, m.oppTov, m.oppOrb));
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
const PlayerReportModule = ({ currentUser, onClose, games: propGames, roster: propRoster }) => {
  const [players, setPlayers] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [aiNarrative, setAiNarrative] = React.useState(null);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

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
      <div className="fixed inset-0 z-[60] flex flex-col font-sans" style={{ background: 'var(--bg-0)', color: 'var(--text-1)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center z-10 shrink-0" style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-[10px] text-white shrink-0" style={{ background: 'var(--accent)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight" style={{ color: 'var(--text-1)' }}>
                Scouting <span style={{ color: 'var(--accent)' }}>Pro</span>
              </h1>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{players.length} profils analysés</p>
            </div>
          </div>
          <button onClick={onClose} className="sc-btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
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
                    transition: 'border-color var(--t-base), box-shadow var(--t-base), transform var(--t-base)',
                  }}
                  onMouseEnter={function(e) {
                    e.currentTarget.style.borderLeftColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={function(e) {
                    e.currentTarget.style.borderLeftColor = 'var(--accent-ghost)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {p.photo && (
                    <div className="absolute inset-0 opacity-[0.07] group-hover:opacity-[0.13] transition-opacity bg-cover bg-center" style={{ backgroundImage: 'url(' + p.photo + ')', filter: 'grayscale(100%)' }}></div>
                  )}
                  <div className="absolute right-2 bottom-1 font-black pointer-events-none select-none" style={{ fontSize: '4.5rem', lineHeight: 1, opacity: 0.04, color: 'var(--text-1)', fontFamily: 'Fira Code, monospace' }}>
                    {p.number}
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-base font-bold truncate pr-2" style={{ color: 'var(--text-1)' }}>{p.name}</span>
                      <span className="text-[10px] shrink-0 font-mono" style={{ color: 'var(--text-3)' }}>#{p.number}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <div className={`sc-badge ${arch.border} ${arch.color} ${arch.bg}`} style={{ alignSelf: 'flex-start' }}>
                        {arch.name}
                      </div>
                      {(function() {
                        var streak = window.StatsEngine.hotColdStreak(p.logs);
                        if (!streak || streak.status === 'steady') return null;
                        var isHot = streak.status === 'hot';
                        return (
                          <span className={'text-[9px] font-black px-1.5 py-0.5 rounded-full ' + (isHot ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400')}>
                            {isHot ? 'EN FORME' : 'CREUX'}
                          </span>
                        );
                      })()}
                    </div>

                    {arch.nbaComp && arch.nbaComp.best && arch.nbaComp.best.name ? (
                      <div className="text-[9px] mb-3 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                        <span>~</span>
                        <span style={{ color: 'var(--accent-light)' }} className="font-medium">{arch.nbaComp.best.name}</span>
                        <span>({arch.nbaComp.best.similarity}%)</span>
                      </div>
                    ) : <div className="mb-3"></div>}

                    <div className="flex items-end mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="flex-1 text-center">
                        <div className="sc-section-label mb-0.5">PTS</div>
                        <div className="sc-stat-value text-[15px]" style={{ color: 'var(--text-1)' }}>{p.avg.pts.toFixed(1)}</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="sc-section-label mb-0.5">EFF</div>
                        <div className="sc-stat-value text-[15px]" style={{ color: 'var(--sys-warn)' }}>{p.avg.eff.toFixed(1)}</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="sc-section-label mb-0.5">USG</div>
                        <div className="sc-stat-value text-[15px]" style={{ color: 'var(--text-2)' }}>{p.avg.usage.toFixed(0)}%</div>
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

  // --- VUE DETAIL ---
  const p = players.find((x) => x.id === selectedId);
  if (!p) return null;
  const arch = AnalysisEngine.getArchetype(p, players, propGames);
  const narrativeText = aiNarrative || AnalysisEngine.getFallbackNarrative(p);
  const last5 = p.logs.slice(0, 5);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto font-sans custom-scrollbar" style={{ background: 'var(--bg-0)', color: 'var(--text-1)' }}>
      {/* STICKY HEADER */}
      <div className="sticky top-0 backdrop-blur p-3 flex justify-between items-center z-50 print:hidden" style={{ background: 'rgba(6,6,9,0.92)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}>
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 font-bold uppercase text-xs cursor-pointer transition-colors duration-200"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={function(e){ e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={function(e){ e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Retour
        </button>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="sc-btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Imprimer
          </button>
          <button onClick={() => exportPlayerPDF(p)} disabled={isExportingPDF} className="sc-btn-accent" style={{ opacity: isExportingPDF ? 0.5 : 1 }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {isExportingPDF ? 'Export...' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5 pb-24 print:p-0">
        {/* HERO HEADER */}
        <section className="rounded-[var(--r-xl)] overflow-hidden relative" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-elevated)' }}>
          {p.photo && (
            <div className="absolute inset-0 z-0 opacity-30 bg-cover bg-top" style={{ backgroundImage: 'url(' + p.photo + ')', filter: 'grayscale(40%)' }}></div>
          )}
          <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(90deg, var(--bg-0) 45%, transparent 100%)' }}></div>
          {/* Border-left accent archétype */}
          <div className="absolute left-0 top-0 bottom-0 w-1 z-10" style={{ background: 'var(--accent)' }}></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6 p-7 pl-8">
            <div>
              <div className="flex items-baseline gap-3 mb-2">
                <h1 className="text-4xl font-black uppercase tracking-tight" style={{ color: 'var(--text-1)' }}>{p.name}</h1>
                <span className="text-xl font-mono" style={{ color: 'var(--text-3)' }}>#{p.number}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-lg font-bold uppercase tracking-wide ${arch.color}`}>{arch.name}</span>
                <span className="text-sm italic" style={{ color: 'var(--text-3)' }}>"{arch.desc}"</span>
              </div>
              {arch.secondary && (
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  Secondaire : <span style={{ color: 'var(--text-2)' }}>{arch.secondary}</span>
                </div>
              )}
              {arch.tags && arch.tags.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {arch.tags.map(function (t, i) {
                    return (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', border: '1px solid var(--border-strong)' }}>{t}</span>
                    );
                  })}
                </div>
              )}
              {(function() {
                var streak = window.StatsEngine.hotColdStreak(p.logs);
                if (streak.status === 'steady') return null;
                var isHot = streak.status === 'hot';
                return (
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${isHot ? 'bg-orange-900/60 text-orange-300 border border-orange-600/60' : 'bg-blue-900/60 text-blue-300 border border-blue-600/60'}`}>
                      {isHot ? 'EN FORME' : 'PASSAGE A VIDE'}
                    </span>
                    <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                      {isHot ? '+' : ''}{streak.delta} EFF sur 3 derniers matchs
                    </span>
                    <span className="text-[9px]" style={{ color: 'var(--text-4, var(--text-3))' }}>
                      ({streak.recentAvg} récent · {streak.seasonAvg} moy. saison)
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Stats hero block */}
            <div className="flex gap-5 p-4 rounded-[var(--r-lg)]" style={{ background: 'rgba(6,6,9,0.65)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
              {[
                { val: p.avg.pts.toFixed(1), label: 'PTS', color: 'var(--text-1)' },
                { val: p.avg.reb.toFixed(1), label: 'REB', color: 'var(--data-light)' },
                { val: p.avg.ast.toFixed(1), label: 'AST', color: 'var(--data)' },
                { val: p.avg.eff.toFixed(1), label: 'EFF', color: 'var(--sys-warn)' },
              ].map(function(s) {
                return (
                  <div key={s.label} className="text-center">
                    <div className="sc-stat-value text-3xl" style={{ color: s.color }}>{s.val}</div>
                    <div className="sc-section-label mt-1">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comparaison NBA — Double Axe */}
        {arch.nbaComp && arch.nbaComp.best && arch.nbaComp.best.name && (
          <div className="sc-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Comparaison NBA</div>
              {arch.nbaComp.isAnomaly && (
                <span className="text-[9px] bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-700/50 font-bold">
                  ATYPIQUE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] text-orange-500 font-bold uppercase w-12">Match</span>
              <span className="text-sm text-white font-semibold">{arch.nbaComp.best.name}</span>
              <span className="text-[10px] text-slate-600 ml-auto">
                {arch.nbaComp.best.similarity}%
                {arch.nbaComp.shotMatchUsed && (
                  <span className="text-green-600 ml-1" title="Validé par carte de tir">
                    ●
                  </span>
                )}
              </span>
            </div>

            {arch.nbaComp.styleTwin &&
              arch.nbaComp.styleTwin.name &&
              arch.nbaComp.styleTwin.name !== arch.nbaComp.best.name && (
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] text-purple-400 font-bold uppercase w-12">Style</span>
                  <span className="text-sm text-slate-300">{arch.nbaComp.styleTwin.name}</span>
                  <span className="text-[10px] text-slate-600 ml-auto">
                    {arch.nbaComp.styleTwin.similarity}%
                  </span>
                </div>
              )}

            {(() => {
              var comp = arch.nbaComp;
              var primary = comp.best.name;
              var twin = comp.styleTwin ? comp.styleTwin.name : null;
              var narrative = '';

              if (comp.isAnomaly) {
                narrative =
                  'Profil atypique — produit comme ' +
                  primary +
                  (twin ? ', style de jeu à la ' + twin : '') +
                  '. Carte de tir inclassable.';
              } else if (twin && twin !== primary) {
                narrative =
                  'Produit comme ' +
                  primary +
                  (comp.shotMatchUsed ? ' (tir validé)' : '') +
                  ', dans le style de ' +
                  twin +
                  '.';
              } else {
                narrative = 'Match complet avec ' + primary + '.';
              }
              return <div className="text-[11px] text-slate-400 mt-1 italic">{narrative}</div>;
            })()}

            {arch.nbaComp.top5 && arch.nbaComp.top5.length > 1 && (
              <details className="mt-2">
                <summary className="text-[9px] text-slate-600 cursor-pointer hover:text-slate-400">
                  Top 5 production
                </summary>
                <div className="mt-1 space-y-0.5">
                  {arch.nbaComp.top5.map(function (t, i) {
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span className="text-slate-700 w-3">{i + 1}.</span>
                        <span className="text-slate-400">{t.name}</span>
                        <span className="text-slate-700 ml-auto">{t.dist}</span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ADN du Joueur (fingerprint radar) */}
        {arch.fingerprint && (
          <div className="sc-card p-4">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">
              ADN du Joueur{' '}
              <span className="text-[8px] text-slate-600 font-normal normal-case ml-1">
                (mix percentile rotation + normes {getBenchmarks().label})
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(function () {
                var DIMENSION_TOOLTIPS = {
                  volume: 'Volume offensif — Quantité de tirs et responsabilité offensive',
                  efficiency: 'Efficacité — Rendement par rapport aux tirs pris (TS% + eFG%)',
                  shooting: 'Tir extérieur — Volume, pourcentage et fréquence à 3 points',
                  creation: 'Création — Passes décisives et ratio AST/TOV',
                  rebounding: 'Rebond — Total + bonus rebond offensif',
                  interior: 'Jeu intérieur — FTr, rebond offensif, proportion tirs à 2pts',
                  defense: 'Défense — Interceptions + contres, pénalité fautes',
                  impact: 'Impact collectif — Net Rating, +/-, évaluation globale',
                };
                return [
                  { key: 'volume', label: 'VOL' },
                  { key: 'efficiency', label: 'EFF' },
                  { key: 'shooting', label: 'SHOOT' },
                  { key: 'creation', label: 'CREA' },
                  { key: 'rebounding', label: 'REB' },
                  { key: 'interior', label: 'PAINT' },
                  { key: 'defense', label: 'DEF' },
                  { key: 'impact', label: 'IMP' },
                ].map(function (d) {
                  var score = arch.fingerprint[d.key] || 0;
                  var barColor =
                    score >= 70
                      ? 'bg-green-500'
                      : score >= 45
                        ? 'bg-orange-500'
                        : score >= 25
                          ? 'bg-yellow-500'
                          : 'bg-slate-600';
                  return (
                    <div
                      key={d.key}
                      className="text-center"
                      title={DIMENSION_TOOLTIPS[d.key] || ''}
                    >
                      <div className="text-[9px] text-slate-500">{d.label}</div>
                      <div className="text-sm font-bold text-white">{score}</div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full mt-0.5 overflow-hidden">
                        <div
                          className={barColor + ' h-full rounded-full'}
                          style={{ width: score + '%' }}
                        ></div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* NARRATIVE */}
        <div className="sc-card sc-card--accent p-5 relative overflow-hidden" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3 className="text-slate-400 font-bold uppercase text-xs mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Note Rapide
          </h3>
          <p className="text-slate-200 text-lg leading-relaxed font-medium">{narrativeText}</p>
        </div>

        {/* ============================================================ */}
        {/* TABLEAU DE BORD — 5 SECTIONS                                 */}
        {/* ============================================================ */}
        {(() => {
          const a = p.avg;
          const gp = p.logs.length;
          const B = getBenchmarks();
          const dreb = a.reb - a.oreb;
          const totalFGA = a.fga + a.threea;
          const totalFGM = a.fgm + a.threem;
          const fgPctGlobal = totalFGA > 0 ? (totalFGM / totalFGA) * 100 : 0;
          const per30 = (stat) => (a.min > 0 ? (stat / a.min) * 30 : 0);
          const p30 = {
            pts: per30(a.pts),
            reb: per30(a.reb),
            ast: per30(a.ast),
            stl: per30(a.stl),
            pf: per30(a.fouls),
          };

          // Analyse Coach
          const strengths = [];
          const improvements = [];
          const iconOk = <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mt-0.5 shrink-0 text-green-400" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>;
          const iconWarn = <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mt-0.5 shrink-0 text-orange-400" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>;
          if (a.TS > B.ts_elite)
            strengths.push({
              icon: iconOk,
              text: `Efficacité au scoring élite (TS% ${a.TS.toFixed(1)}%). Excellent choix de tirs.`,
            });
          else if (a.TS > B.ts_good)
            strengths.push({
              icon: iconOk,
              text: `Bonne efficacité au scoring (TS% ${a.TS.toFixed(1)}%).`,
            });
          if (a.astTov > B.astTov_good && a.ast > 2)
            strengths.push({
              icon: iconOk,
              text: `Gestionnaire fiable — ratio AST/TOV de ${a.astTov.toFixed(1)} avec ${a.ast.toFixed(1)} passes décisives/match.`,
            });
          if (a.threePct > B.threePct_good && a.threea > 2)
            strengths.push({
              icon: iconOk,
              text: `Menace à 3 points : ${a.threePct.toFixed(1)}% sur ${a.threea.toFixed(1)} tentatives/match.`,
            });
          if (p30.reb > 8 && strengths.length < 3)
            strengths.push({
              icon: iconOk,
              text: `Présence au rebond : ${p30.reb.toFixed(1)} rebonds projetés sur 30 min.`,
            });
          if (a.stl + a.blk > B.def_active && strengths.length < 3)
            strengths.push({
              icon: iconOk,
              text: `Activité défensive notable : ${a.stl.toFixed(1)} INT + ${a.blk.toFixed(1)} CTR/match.`,
            });
          if (a.oreb > B.oreb_good && strengths.length < 3)
            strengths.push({
              icon: iconOk,
              text: `Guerrier au rebond offensif (${a.oreb.toFixed(1)}/match).`,
            });
          if (a.min < 20 && a.min > 5 && p30.pts > 15 && strengths.length < 3)
            strengths.push({
              icon: iconOk,
              text: `Impact fort rapporté au temps de jeu : ${p30.pts.toFixed(1)} PTS projetés sur 30 min (${a.min.toFixed(1)} min jouées).`,
            });
          if (a.plusMinus > 5 && strengths.length < 3)
            strengths.push({
              icon: iconOk,
              text: `Impact collectif positif : +${a.plusMinus.toFixed(1)} de +/- moyen.`,
            });
          if (a.FTr > 0.35 && strengths.length < 3)
            strengths.push({
              icon: iconOk,
              text: `Provoque des fautes régulièrement (FTr ${a.FTr.toFixed(2)}).`,
            });
          if (a.netRtg > 8 && strengths.length < 3)
            strengths.push({
              icon: iconOk,
              text: `L'équipe performe nettement mieux avec lui (NetRtg +${a.netRtg.toFixed(0)}).`,
            });
          if (p30.pf > 4.5)
            improvements.push({
              icon: iconWarn,
              text: `Gestion des fautes à travailler — ${p30.pf.toFixed(1)} fautes projetées sur 30 min. Risque de foul trouble si temps de jeu élargi.`,
            });
          else if (a.pf36 > B.pf36_warn)
            improvements.push({
              icon: iconWarn,
              text: `Discipline : ${a.pf36.toFixed(1)} fautes/36 min, au-dessus du seuil d'alerte (${B.pf36_warn}).`,
            });
          if (a.astTov < B.astTov_bad && a.tov > 1.5)
            improvements.push({
              icon: iconWarn,
              text: `Ratio AST/TOV faible (${a.astTov.toFixed(1)}). Réduire les pertes de balle (${a.tov.toFixed(1)}/match).`,
            });
          if (a.TS < B.ts_bad && a.usage > B.usage_low + 5 && improvements.length < 2)
            improvements.push({
              icon: iconWarn,
              text: `Efficacité offensive insuffisante (TS% ${a.TS.toFixed(1)}%) pour le volume de tirs.`,
            });
          if (a.ftPct < 60 && a.fta / Math.max(gp, 1) > 1.5 && improvements.length < 2)
            improvements.push({
              icon: iconWarn,
              text: `Lancer-franc à travailler : ${a.ftPct.toFixed(1)}%. Points gratuits perdus.`,
            });
          if (a.threePct < B.threePct_good - 5 && a.threea > 2 && improvements.length < 2)
            improvements.push({
              icon: iconWarn,
              text: `Adresse extérieure insuffisante (${a.threePct.toFixed(1)}% à 3pts sur ${a.threea.toFixed(1)} tent./match).`,
            });
          if (a.netRtg < -8 && improvements.length < 2)
            improvements.push({
              icon: iconWarn,
              text: `Impact collectif négatif (NetRtg ${a.netRtg.toFixed(0)}). Le groupe souffre sur ses minutes.`,
            });
          const topS = strengths.slice(0, 3),
            topI = improvements.slice(0, 2);

          return (
            <React.Fragment>
              {/* S1 : VUE D'ENSEMBLE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 sc-card p-5 flex flex-col items-center">
                  <h3 className="sc-section-label mb-4 w-full">Empreinte</h3>
                  <ScoutingRadar avg={a} />
                </div>
                <div className="lg:col-span-2 sc-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="sc-section-label">Vue d'ensemble</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-4)', color: 'var(--text-3)' }}>{gp} matchs</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { val: a.eff.toFixed(1), label: 'PIR', color: a.eff > 12 ? 'var(--sys-warn)' : a.eff > 6 ? 'var(--text-1)' : 'var(--text-3)' },
                      { val: (a.plusMinus > 0 ? '+' : '') + a.plusMinus.toFixed(1), label: '+/-', color: a.plusMinus > 0 ? 'var(--made)' : a.plusMinus < 0 ? 'var(--miss)' : 'var(--text-3)' },
                      { val: a.min.toFixed(1), label: 'MIN', color: 'var(--data-light)' },
                    ].map(function(s) {
                      return (
                        <div key={s.label} className="sc-stat-block">
                          <div className="sc-stat-value text-3xl" style={{ color: s.color }}>{s.val}</div>
                          <div className="sc-section-label mt-1">{s.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-[var(--r-md)]" style={{ background: 'var(--data-ghost)', border: '1px solid rgba(129,140,248,0.15)' }}>
                    <div>
                      <div className="text-[11px] font-bold uppercase" style={{ color: 'var(--data)' }}>Impact Total</div>
                      <div className="sc-section-label mt-0.5">Elite ≥ 110 · Bon ≥ 85 · Correct ≥ 60</div>
                    </div>
                    <div className="sc-stat-value text-2xl" style={{ color: a.impactTotal > 110 ? 'var(--data-light)' : a.impactTotal > 85 ? 'var(--made)' : a.impactTotal > 59 ? 'var(--text-1)' : 'var(--miss)' }}>
                      {a.impactTotal.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* S2 : EFFICACITE OFFENSIVE */}
              <div className="sc-card p-5">
                <h3 className="sc-section-label mb-4" style={{ color: 'var(--accent)' }}>Efficacité Offensive</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-orange-400">{a.pts.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PTS</div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${fgPctGlobal > 50 ? 'text-green-400' : fgPctGlobal > 40 ? 'text-white' : 'text-red-400'}`}
                    >
                      {fgPctGlobal.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">FG%</div>
                    <div className="text-[9px] text-slate-600">
                      {totalFGM}/{totalFGA > 0 ? totalFGA.toFixed(0) : 0}
                    </div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.threePct > B.threePct_good ? 'text-green-400' : a.threePct > 30 ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.threePct.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">3P%</div>
                    <div className="text-[9px] text-slate-600">
                      {a.threem}/{a.threea}
                    </div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.ftPct > 75 ? 'text-green-400' : a.ftPct > 60 ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.ftPct.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">FT%</div>
                    <div className="text-[9px] text-slate-600">
                      {a.ftm}/{a.fta}
                    </div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.TS > B.ts_elite ? 'text-blue-400' : a.TS > B.ts_good ? 'text-green-400' : a.TS > B.ts_bad ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.TS.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">TS%</div>
                  </div>
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-white">{a.eFG.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">eFG%</div>
                  </div>
                  {(function() {
                    var wobaVal = window.StatsEngine.woba(a.pts, a.ast, a.oreb, a.tov, a.fga + a.threea, a.fgm + a.threem, a.fta, a.ftm);
                    var wobaColor = wobaVal >= 0.45 ? 'text-cyan-400' : wobaVal >= 0.30 ? 'text-white' : 'text-slate-400';
                    return (
                      <div className="sc-stat-block" title="WOBA — valeur offensive nette par possession. >0.45 élite · 0.30-0.40 correct · <0.25 faible">
                        <div className={`text-2xl font-black ${wobaColor}`}>{wobaVal.toFixed(3)}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">WOBA</div>
                        <div className="text-[9px] text-slate-600">{wobaVal >= 0.45 ? 'Elite' : wobaVal >= 0.30 ? 'Correct' : 'Faible'}</div>
                      </div>
                    );
                  })()}
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.usage > 30 ? 'text-red-400' : a.usage > 25 ? 'text-orange-400' : 'text-white'}`}
                    >
                      {a.usage.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">USG%</div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.astTov > B.astTov_good ? 'text-green-400' : a.astTov >= 1.5 ? 'text-white' : a.astTov >= 1.0 ? 'text-orange-400' : 'text-red-400'}`}
                    >
                      {a.astTov.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">AST/TOV</div>
                    <div className="text-[9px] text-slate-600">
                      {a.ast.toFixed(1)} / {a.tov.toFixed(1)}
                    </div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.FTr > 0.35 ? 'text-green-400' : a.FTr > 0.2 ? 'text-white' : 'text-slate-400'}`}
                    >
                      {a.FTr.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">FTr</div>
                  </div>
                </div>
              </div>

              {/* S3 : IMPACT DEFENSIF */}
              <div className="sc-card p-5">
                <h3 className="sc-section-label mb-4" style={{ color: 'var(--data)' }}>Impact Défensif & Hustle</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-white">{a.reb.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">TRB</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">
                      <span className="text-orange-400">{a.oreb.toFixed(1)} OFF</span>
                      {' / '}
                      <span className="text-blue-400">{dreb.toFixed(1)} DEF</span>
                    </div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.stl > 1.5 ? 'text-green-400' : 'text-white'}`}
                    >
                      {a.stl.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">STL</div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.blk > 1.0 ? 'text-green-400' : 'text-white'}`}
                    >
                      {a.blk.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">BLK</div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.fouls > 3.5 ? 'text-red-400' : a.fouls > 2.5 ? 'text-yellow-400' : 'text-white'}`}
                    >
                      {a.fouls.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PF</div>
                    <div className="text-[9px] text-slate-600">{a.pf36.toFixed(1)} /36m</div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${a.netRtg > 0 ? 'text-green-400' : a.netRtg < 0 ? 'text-red-400' : 'text-slate-400'}`}
                    >
                      {a.netRtg > 0 ? '+' : ''}
                      {a.netRtg.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Net Rtg</div>
                  </div>
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-white">
                      {(a.stl + a.blk).toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">STL+BLK</div>
                  </div>
                </div>
              </div>

              {/* F5 : PROFIL DE FATIGUE PAR QUART-TEMPS */}
              {(function() {
                var fatigue = AnalysisEngine.computeQuarterStats(p.id, propGames);
                if (!fatigue || !fatigue.quarters || fatigue.quarters.length < 2) return null;
                var trendLabel = fatigue.slope < -0.5 ? 'Déclin progressif' : fatigue.slope > 0.5 ? 'Montée en régime' : 'Profil stable';
                var trendColor = fatigue.slope < -0.5 ? 'text-red-400' : fatigue.slope > 0.5 ? 'text-green-400' : 'text-slate-400';
                var maxEff = Math.max.apply(null, fatigue.quarters.map(function(q) { return Math.abs(q.eff10); })) || 1;
                var qLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
                return (
                  <div className="sc-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="sc-section-label" style={{ color: 'var(--warning)' }}>Profil de Fatigue</h3>
                      <span className={'text-xs font-bold ' + trendColor}>{trendLabel}</span>
                    </div>
                    <div className="flex items-end gap-2 h-20 mb-3">
                      {fatigue.quarters.map(function(q, i) {
                        var pct = maxEff > 0 ? Math.max(4, Math.abs(q.eff10) / maxEff * 100) : 4;
                        var barColor = q.eff10 >= 0 ? 'var(--made)' : 'var(--miss)';
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-mono" style={{ color: 'var(--text-3)' }}>{q.eff10 >= 0 ? '+' : ''}{q.eff10.toFixed(1)}</span>
                            <div className="w-full rounded-t-sm" style={{ height: pct + '%', background: barColor, minHeight: '4px' }}></div>
                            <span className="text-[10px] text-slate-500 font-bold">{qLabels[i] || ('Q' + q.q)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {fatigue.breakpoint && (
                      <p className="text-[10px] text-slate-500">
                        Rupture détectée à <span className="text-amber-400 font-bold">{qLabels[(fatigue.breakpoint - 1)] || ('Q' + fatigue.breakpoint)}</span> — baisse d'efficacité après ce quart.
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600 mt-1">EFF/10 min par quart-temps — pente de régression : {fatigue.slope >= 0 ? '+' : ''}{fatigue.slope.toFixed(2)}</p>
                  </div>
                );
              })()}

              {/* F3 : PROFIL DE RÔLE (K-MEANS CLUSTERING) */}
              {(function() {
                var cluster = AnalysisEngine.computeSquadClusters(p, players, propGames);
                if (!cluster) return null;
                var dimColors = { volume: 'text-orange-400', efficiency: 'text-cyan-400', shooting: 'text-yellow-400', creation: 'text-purple-400', rebounding: 'text-blue-400', defense: 'text-green-400' };
                var dimColor = dimColors[cluster.topDim] || 'text-white';
                return (
                  <div className="sc-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="sc-section-label" style={{ color: 'var(--accent)' }}>Profil de Rôle — Clustering</h3>
                      <span className={'text-xs font-black uppercase px-2 py-0.5 rounded-full ' + dimColor} style={{ background: 'var(--bg-4)' }}>{cluster.label}</span>
                    </div>
                    <p className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>
                      Dimension dominante : <span className={'font-bold ' + dimColor}>{cluster.topDim}</span> — groupe de {cluster.size} joueur{cluster.size > 1 ? 's' : ''} au profil similaire.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cluster.members.map(function(m) {
                        var isSelf = Number(m.id) === Number(p.id) || String(m.id) === String(p.id);
                        return (
                          <span
                            key={m.id}
                            className={'text-[10px] font-mono px-2 py-0.5 rounded-full ' + (isSelf ? 'text-black font-black' : 'text-slate-300')}
                            style={{ background: isSelf ? 'var(--accent)' : 'var(--bg-4)' }}
                          >
                            #{m.number} {m.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* S4 : PER 30 */}
              <div className="sc-card p-5">
                <h3 className="sc-section-label mb-1" style={{ color: 'var(--made)' }}>Projection Titulaire FIBA</h3>
                <p className="text-[11px] mb-4" style={{ color: 'var(--text-3)' }}>
                  Statistiques projetées sur 30 minutes — (Stat / MIN) × 30.
                  {a.min < 10 && (
                    <span className="text-amber-400 ml-1 inline-flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                      Faible échantillon ({a.min.toFixed(1)} min/match).
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-5 gap-3">
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-orange-400">{p30.pts.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PTS</div>
                    <div className="text-[9px] text-slate-600">réel: {a.pts.toFixed(1)}</div>
                  </div>
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-blue-400">{p30.reb.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">REB</div>
                    <div className="text-[9px] text-slate-600">réel: {a.reb.toFixed(1)}</div>
                  </div>
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-purple-400">{p30.ast.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">AST</div>
                    <div className="text-[9px] text-slate-600">réel: {a.ast.toFixed(1)}</div>
                  </div>
                  <div className="sc-stat-block">
                    <div className="text-2xl font-black text-green-400">{p30.stl.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">STL</div>
                    <div className="text-[9px] text-slate-600">réel: {a.stl.toFixed(1)}</div>
                  </div>
                  <div className="sc-stat-block">
                    <div
                      className={`text-2xl font-black ${p30.pf > 4.5 ? 'text-red-400' : p30.pf > 3.5 ? 'text-yellow-400' : 'text-white'}`}
                    >
                      {p30.pf.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PF</div>
                    <div className="text-[9px] text-slate-600">réel: {a.fouls.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              {/* S5 : ANALYSE DU COACH */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="sc-card p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full pointer-events-none" style={{ background: 'rgba(52,211,153,0.04)' }}></div>
                  <h4 className="sc-section-label mb-3">Analyse du Coach</h4>
                  <h4 className="text-green-400 font-black uppercase text-sm mb-4 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
                    Points Forts
                  </h4>
                  {topS.length > 0 ? (
                    <div className="space-y-2">
                      {topS.map((s, i) => (
                        <div
                          key={i}
                          className="flex gap-3 text-slate-300 text-sm p-3 bg-slate-950/50 rounded-lg border border-green-900/20"
                        >
                          {s.icon}
                          <span>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm italic">
                      Pas de point fort marquant identifié.
                    </p>
                  )}
                </div>
                <div className="sc-card p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full pointer-events-none" style={{ background: 'rgba(249,115,22,0.04)' }}></div>
                  <h4 className="sc-section-label mb-3">&nbsp;</h4>
                  <h4 className="text-orange-400 font-black uppercase text-sm mb-4 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    Axes de Progression
                  </h4>
                  {topI.length > 0 ? (
                    <div className="space-y-2">
                      {topI.map((s, i) => (
                        <div
                          key={i}
                          className="flex gap-3 text-slate-300 text-sm p-3 bg-slate-950/50 rounded-lg border border-orange-900/20"
                        >
                          {s.icon}
                          <span>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm italic">
                      Aucun axe de progression critique détecté.
                    </p>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })()}

        {/* 5 DERNIERS MATCHS */}
        <div className="sc-card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="sc-section-label">5 Derniers Matchs</h3>
          </div>
          <table className="w-full text-sm text-left" style={{ color: 'var(--text-2)' }}>
            <thead style={{ background: 'var(--bg-0)' }}>
              <tr>
                {['Date','Adv','MIN','PTS','REB','AST','EFF','+/-'].map(function(h, i) {
                  return <th key={h} className={'p-3 sc-section-label ' + (i > 1 ? 'text-center' : '')}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {last5.map((l, i) => (
                <tr key={i} className="sc-table-row" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td className="p-3 text-xs font-mono" style={{ color: 'var(--text-3)' }}>{l.rawDate.toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 font-medium" style={{ color: 'var(--text-1)' }}>{l.opponent}</td>
                  <td className="p-3 text-center text-xs font-mono">{l.min}</td>
                  <td className="p-3 text-center font-bold sc-stat-value" style={{ color: 'var(--text-1)' }}>{l.pts}</td>
                  <td className="p-3 text-center sc-stat-value">{l.reb}</td>
                  <td className="p-3 text-center sc-stat-value">{l.ast}</td>
                  <td className="p-3 text-center font-bold sc-stat-value" style={{ color: 'var(--sys-warn)' }}>{l.eff.toFixed(0)}</td>
                  <td className="p-3 text-center font-bold sc-stat-value" style={{ color: l.plusMinus > 0 ? 'var(--made)' : l.plusMinus < 0 ? 'var(--miss)' : 'var(--text-3)' }}>
                    {l.plusMinus > 0 ? '+' : ''}{l.plusMinus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* SHOT CHART */}
          {(() => {
            const ShotChart = window.ShotChart;
            if (!ShotChart || !propGames) return null;
            const rawPid = p.id;
            if (!rawPid) return null;
            const numPid = Number(rawPid);
            const playerShots = [];
            propGames.forEach((g) => {
              if (!g.actions || !g.actions.length) return;
              g.actions.forEach((a) => {
                if (a.type === 'SHOT' && (a.pid === rawPid || a.pid === numPid))
                  playerShots.push(a);
              });
            });
            if (playerShots.length === 0) return null;
            return (
              <div className="mt-6">
                <ShotChart shots={playerShots} playerName={p.name || ''} />
              </div>
            );
          })()}
          {/* 5-MAN LINEUPS */}
          {(() => {
            const currentPlayerId = p.id;
            const lineups = calcFiveManLineups(currentPlayerId, propGames, propRoster);
            if (lineups.total === 0) return null;
            const renderLineup = (lu, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-slate-950/50 rounded border border-slate-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-medium">{lu.names.join(' ')}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">{lu.poss} poss</span>
                    {lu.lowSample && (
                      <span className="text-[9px] bg-amber-900/30 text-amber-400 px-1 rounded">
                        Faible éch.
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center px-2">
                  <div className="text-[10px] text-slate-500">ORtg</div>
                  <div className="text-xs font-bold text-purple-400">{lu.ortg}</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-[10px] text-slate-500">DRtg</div>
                  <div className="text-xs font-bold text-red-400">{lu.drtg}</div>
                </div>
                <div className="text-center px-2">
                  <div
                    className={`text-sm font-bold ${lu.netRtg >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {lu.netRtg > 0 ? '+' : ''}
                    {lu.netRtg}
                  </div>
                  <div className="text-[10px] text-slate-500">Net</div>
                </div>
              </div>
            );
            return (
              <div className="sc-card overflow-hidden mt-5">
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h3 className="sc-section-label">Lineups 5-Man</h3>
                  <span className="text-[10px] text-slate-600">
                    {lineups.total} combos analysés (matchs PBP uniquement)
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lineups.best.length > 0 && (
                    <div>
                      <h4 className="text-xs text-green-400 uppercase font-bold mb-2">
                        Meilleurs lineups
                      </h4>
                      <div className="space-y-1">{lineups.best.map(renderLineup)}</div>
                    </div>
                  )}
                  {lineups.worst.length > 0 && (
                    <div>
                      <h4 className="text-xs text-red-400 uppercase font-bold mb-2">
                        Pires lineups
                      </h4>
                      <div className="space-y-1">{lineups.worst.map(renderLineup)}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

window.PlayerReportModule = PlayerReportModule;
