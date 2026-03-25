// reportPlayer.js
// Version : "Direct Client-Side AI" (Sans PHP)
// Dépendances : React, TailwindCSS
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';

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

function getStatLevel(statKey, value) {
  const B = getBenchmarks();
  switch (statKey) {
    case 'TS': return value >= B.ts_elite ? 'elite' : value >= B.ts_good ? 'good' : value < B.ts_bad ? 'bad' : 'avg';
    case 'eFG': return value >= 55 ? 'elite' : value >= 48 ? 'good' : value < 42 ? 'bad' : 'avg';
    case 'fgPct': return value >= 50 ? 'elite' : value >= 43 ? 'good' : value < 38 ? 'bad' : 'avg';
    case 'threePct': return value >= B.threePct_good + 3 ? 'elite' : value >= B.threePct_good ? 'good' : value < B.threePct_good - 8 ? 'bad' : 'avg';
    case 'ftPct': return value >= 80 ? 'elite' : value >= 68 ? 'good' : value < 55 ? 'bad' : 'avg';
    case 'ast': return value >= B.ast_good ? 'elite' : value >= B.ast_good * 0.6 ? 'good' : 'avg';
    case 'reb': return value >= B.reb_dom ? 'elite' : value >= B.reb_dom * 0.7 ? 'good' : 'avg';
    case 'stl': return value >= 2.0 ? 'elite' : value >= 1.2 ? 'good' : 'avg';
    case 'blk': return value >= 2.0 ? 'elite' : value >= 0.8 ? 'good' : 'avg';
    case 'plusMinus': return value >= 8 ? 'elite' : value >= 3 ? 'good' : value < -3 ? 'bad' : 'avg';
    case 'netRtg': return value >= 10 ? 'elite' : value >= 3 ? 'good' : value < -5 ? 'bad' : 'avg';
    case 'usage': return value >= B.usage_high ? 'elite' : value >= B.usage_low ? 'good' : 'avg';
    default: return 'avg';
  }
}

function levelColor(level) {
  switch (level) {
    case 'elite': return 'var(--made)';
    case 'good': return 'var(--data)';
    case 'bad': return 'var(--miss)';
    default: return 'var(--text-2)';
  }
}

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
    const a = playerStats.avg;
    const dreb = (a.reb || 0) - (a.oreb || 0);
    const OIS = window.StatsEngine.OIS(
      a.pts, a.ast, a.oreb, a.fte || 0, a.tov,
      a.fga || 0, a.fgm || 0, a.fta || 0, a.ftm || 0
    );
    const DIS = window.StatsEngine.DIS(a.stl, a.blk, dreb, a.fouls || 0, a.plusMinus || 0);
    return window.StatsEngine.impactTotal(OIS, DIS, a.min || 1);
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

  // U1 — Sélection dynamique des 4 stats hero selon percentile
  generateHeroStats: function (player, allPlayers) {
    var a = player.avg;
    var rotation = (allPlayers || []).filter(function (x) {
      return x && x.avg && (x.avg.min || 0) >= 10 && x.logs && x.logs.length >= 2;
    });
    var candidates = [
      { label: 'PTS', value: a.pts || 0, icon: 'scoring', key: 'pts' },
      { label: 'REB', value: a.reb || 0, icon: 'rebound', key: 'reb' },
      { label: 'AST', value: a.ast || 0, icon: 'assist', key: 'ast' },
      { label: 'STL', value: a.stl || 0, icon: 'steal', key: 'stl' },
      { label: 'BLK', value: a.blk || 0, icon: 'block', key: 'blk' },
      { label: 'EVAL', value: a.eff || 0, icon: 'impact', key: 'eff' },
    ];
    candidates.forEach(function (c) {
      if (rotation.length < 3) { c.percentile = 50; return; }
      var vals = rotation.map(function (p) { return p.avg[c.key] || 0; }).sort(function (a, b) { return a - b; });
      var below = vals.filter(function (v) { return v < c.value; }).length;
      c.percentile = Math.round((below / Math.max(1, vals.length - 1)) * 100);
    });
    candidates.sort(function (a, b) { return b.percentile - a.percentile; });
    return candidates.slice(0, 4);
  },

  // U2 — Phrase d'impact en français depuis On/Off et W/L
  generateImpactStatement: function (player, games, roster) {
    if (!player.logs || player.logs.length < 3) return null;
    var name = player.name || 'Ce joueur';
    var onOff = AnalysisEngine.calcOnOffAggregated(games || [], player.id, roster || []);
    if (onOff && Math.abs(onOff.netDiff) >= 5) {
      var sign = onOff.netDiff > 0 ? '+' : '';
      return 'Impact décisif\u00a0: l\'équipe performe à ' + sign + onOff.netDiff + '\u00a0pts/100 poss quand ' + name + ' est sur le terrain.';
    }
    var wins = player.logs.filter(function (l) { return l.isWin; });
    var losses = player.logs.filter(function (l) { return !l.isWin; });
    var avg = function (arr, key) {
      if (!arr.length) return 0;
      return arr.reduce(function (s, l) { return s + (l[key] || 0); }, 0) / arr.length;
    };
    if (wins.length >= 2 && losses.length >= 2) {
      var wPts = avg(wins, 'pts');
      var lPts = avg(losses, 'pts');
      if (wPts - lPts > 5) {
        return name + ' marque ' + wPts.toFixed(1) + '\u00a0pts en victoire contre ' + lPts.toFixed(1) + ' en défaite. Sa présence fait basculer les matchs.';
      }
    }
    return name + ' apporte une contribution régulière avec ' + (player.avg.eff || 0).toFixed(1) + '\u00a0d\'évaluation par match.';
  },

  // U3 — Records de la saison depuis player.logs
  getSeasonHighs: function (player) {
    if (!player.logs || player.logs.length === 0) return [];
    var fields = [
      { stat: 'PTS', key: 'pts' }, { stat: 'REB', key: 'reb' }, { stat: 'AST', key: 'ast' },
      { stat: 'STL', key: 'stl' }, { stat: 'BLK', key: 'blk' }, { stat: 'EVAL', key: 'eff' },
      { stat: '+/-', key: 'plusMinus' }, { stat: '3PM', key: 'threem' },
    ];
    var highs = [];
    fields.forEach(function (f) {
      var best = null;
      player.logs.forEach(function (log) {
        var val = log[f.key] || 0;
        if (!best || val > best.value) best = { stat: f.stat, value: val, date: log.date || '', opponent: log.opponent || '' };
      });
      if (best && best.value > 0) highs.push(best);
    });
    highs.sort(function (a, b) { return b.value - a.value; });
    return highs.slice(0, 6);
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

// --- HELPERS VISUELS ---

function calcOVR(fp) {
  if (!fp) return 0;
  var dims = ['volume','efficiency','shooting','creation','rebounding','interior','defense','impact'];
  var weights = { volume:0.15, efficiency:0.18, shooting:0.10, creation:0.12, rebounding:0.10, interior:0.08, defense:0.15, impact:0.12 };
  var total = 0;
  dims.forEach(function(d) { total += (fp[d] || 0) * (weights[d] || 0.125); });
  return Math.round(total);
}

function calcTeamAvgFp(allPlayers, games) {
  var rotation = (allPlayers || []).filter(function(x) {
    return x && x.avg && (x.avg.min || 0) >= 12 && x.logs && x.logs.length >= 3;
  });
  if (rotation.length < 2) return null;
  var fps = rotation.map(function(p) { return AnalysisEngine.computeFingerprint(p, rotation, games); });
  var dims = ['volume','efficiency','shooting','creation','rebounding','interior','defense','impact'];
  var avg = {};
  dims.forEach(function(d) {
    avg[d] = fps.reduce(function(s, fp) { return s + (fp[d] || 0); }, 0) / fps.length;
  });
  return avg;
}

function calcWLSplits(player) {
  var logs = player.logs || [];
  var wins = logs.filter(function(l) { return l.isWin; });
  var losses = logs.filter(function(l) { return !l.isWin; });
  var avg = function(arr, key) {
    if (!arr.length) return 0;
    return arr.reduce(function(s, l) { return s + (l[key] || 0); }, 0) / arr.length;
  };
  var keys = ['pts','reb','ast','eff','plusMinus'];
  var stats = {};
  keys.forEach(function(k) {
    var w = avg(wins, k), l = avg(losses, k);
    stats[k] = { w: w, l: l, delta: w - l };
  });
  return { wins: wins.length, losses: losses.length, stats: stats };
}

// PercentRing — anneau SVG avec valeur centrée
function PercentRing({ value, size = 64, color = 'var(--accent)', label }) {
  var r = (size - 8) / 2;
  var circ = 2 * Math.PI * r;
  var pct = Math.max(0, Math.min(100, value || 0));
  var dash = (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, fontSize: size > 55 ? '14px' : '11px', color: 'var(--text-1)', lineHeight: 1 }}>
          {Math.round(pct)}
        </span>
        {label && <span style={{ fontSize: '7px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>}
      </div>
    </div>
  );
}

// TrendIndicator — flèche + delta coloré
function TrendIndicator({ delta, suffix = '', invert = false }) {
  if (delta === undefined || delta === null) return null;
  var isPos = invert ? delta < 0 : delta > 0;
  var neutral = Math.abs(delta) < 0.05;
  var color = neutral ? 'var(--text-3)' : isPos ? 'var(--made)' : 'var(--miss)';
  var arrow = neutral ? '—' : delta > 0 ? '▲' : '▼';
  return (
    <span style={{ color, fontFamily: 'Fira Code, monospace', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {arrow} {delta > 0 ? '+' : ''}{delta.toFixed(1)}{suffix}
    </span>
  );
}

// MiniSparkline — graphique ligne SVG compact
function MiniSparkline({ data, width = 60, height = 22, color = 'var(--accent)' }) {
  if (!data || data.length < 2) return null;
  var min = Math.min.apply(null, data);
  var max = Math.max.apply(null, data);
  var range = max - min || 1;
  var pts = data.map(function(v, i) {
    var x = (i / (data.length - 1)) * width;
    var y = height - ((v - min) / range) * (height - 4) - 2;
    return x + ',' + y;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// HeroIcon — icône SVG inline par type
function HeroIcon({ name, size = 20 }) {
  var paths = {
    scoring: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    rebound: 'M4 4h16v2l-8 8-8-8V4zm0 16v-2l8-8 8 8v2H4z',
    assist: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    steal: 'M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
    block: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z',
    impact: 'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--accent)" style={{ opacity: 0.7 }}>
      <path d={paths[name] || paths.impact} />
    </svg>
  );
}

// Tooltip — hover/tap
function Tooltip({ text, children }) {
  var [show, setShow] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', cursor: 'help' }}
      onMouseEnter={function() { setShow(true); }}
      onMouseLeave={function() { setShow(false); }}
      onClick={function() { setShow(function(v) { return !v; }); }}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          padding: '7px 10px', borderRadius: 'var(--r-md)', background: 'var(--bg-3)',
          border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-elevated)',
          fontSize: '11px', color: 'var(--text-2)', whiteSpace: 'normal', maxWidth: '210px',
          zIndex: 200, pointerEvents: 'none', textAlign: 'left', lineHeight: 1.5, minWidth: '160px',
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// FingerprintRadar8D — SVG 8 axes avec polygone de référence équipe
function FingerprintRadar8D({ fp, teamAvgFp }) {
  if (!fp) return null;
  var dims = ['volume','efficiency','shooting','creation','rebounding','interior','defense','impact'];
  var labels = ['VOL','EFF','TIR','CREA','REB','INT','DEF','IMP'];
  var cx = 85, cy = 85, r = 60;
  var angle = function(i) { return (Math.PI * 2 * i / 8) - Math.PI / 2; };
  var pt = function(i, val) {
    var a = angle(i);
    var dist = (Math.max(0, Math.min(100, val)) / 100) * r;
    return [cx + Math.cos(a) * dist, cy + Math.sin(a) * dist];
  };
  var polyStr = function(getFn) {
    return dims.map(function(d, i) { return pt(i, getFn(d)).join(','); }).join(' ');
  };
  return (
    <svg viewBox="0 0 170 170" style={{ width: '100%', maxWidth: '200px', height: 'auto' }}>
      {[0.25, 0.5, 0.75, 1].map(function(k, idx) {
        var pts = dims.map(function(_, i) {
          var a = angle(i);
          return (cx + Math.cos(a) * r * k) + ',' + (cy + Math.sin(a) * r * k);
        }).join(' ');
        return <polygon key={idx} points={pts}
          fill={idx % 2 ? 'rgba(13,13,24,0.5)' : 'rgba(26,26,42,0.5)'}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />;
      })}
      {dims.map(function(_, i) {
        var [px, py] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}
      {teamAvgFp && (
        <polygon points={polyStr(function(d) { return teamAvgFp[d] || 0; })}
          fill="rgba(129,140,248,0.08)" stroke="rgba(129,140,248,0.35)" strokeWidth="1" strokeDasharray="3,2" />
      )}
      <polygon points={polyStr(function(d) { return fp[d] || 0; })}
        fill="rgba(249,115,22,0.12)" stroke="var(--accent)" strokeWidth="1.8" />
      {dims.map(function(d, i) {
        var [px, py] = pt(i, fp[d] || 0);
        return <circle key={i} cx={px} cy={py} r="2.5" fill="var(--accent)" />;
      })}
      {dims.map(function(_, i) {
        var a = angle(i);
        var lx = cx + Math.cos(a) * (r + 13);
        var ly = cy + Math.sin(a) * (r + 12);
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
          fontSize="7.5" fontWeight="bold" fill="var(--text-3)">{labels[i]}</text>;
      })}
    </svg>
  );
}

// ExpertTabs — onglets niveau 4
function ExpertTabs({ player, allPlayers, propGames, propRoster, propPhases, propSeasons,
  onOff, phaseProgression, compareSeasonId, setCompareSeasonId }) {
  var [tab, setTab] = React.useState('metrics');
  var [trendStat, setTrendStat] = React.useState('eff');
  var a = player.avg;
  var B = getBenchmarks();
  var gp = player.logs.length;

  var TABS = [
    { id: 'metrics', label: 'Métriques avancées' },
    { id: 'trends', label: 'Tendances' },
    { id: 'logs', label: 'Match par match' },
  ];

  var TOOLTIPS = {
    ORtg: 'Points produits par l\'équipe pour 100 possessions quand ce joueur est sur le terrain.',
    DRtg: 'Points encaissés par l\'équipe pour 100 possessions quand ce joueur est sur le terrain.',
    NetRtg: 'Différence entre ORtg et DRtg. Positif = l\'équipe marque plus qu\'elle n\'encaisse.',
    'TS%': 'Efficacité au tir réelle, prenant en compte les 2pts, 3pts et lancers francs.',
    'eFG%': 'Pourcentage de tir ajusté pour valoriser les 3 points.',
    'USG%': 'Pourcentage des possessions de l\'équipe utilisées par ce joueur.',
    PIE: 'Part du joueur dans les stats totales produites sur le terrain.',
    GameScore: 'Score de performance global du match (formule Hollinger).',
    'AST%': '% des tirs de l\'équipe assistés par ce joueur quand il est sur le terrain.',
    'TOV%': '% des possessions de ce joueur terminées par une perte de balle.',
  };

  var avgGameScore = player.logs.reduce(function(s, l) {
    return s + window.StatsEngine.gameScore(l.pts, l.fgm, l.fga, l.ftm, l.fta, l.oreb,
      Math.max(0, (l.reb || 0) - (l.oreb || 0)), l.stl, l.ast, l.blk, l.fouls || 0, l.tov);
  }, 0) / Math.max(gp, 1);

  var wobaVal = a.woba != null ? a.woba : window.StatsEngine.woba(a.pts, a.ast, a.oreb, a.tov, a.fga, a.fgm, a.fta, a.ftm);

  var METRICS = [
    { label: 'ORtg', value: onOff ? onOff.on.ortg : null, tip: 'ORtg', fmt: function(v) { return v != null ? v.toFixed(0) : '—'; } },
    { label: 'DRtg', value: onOff ? onOff.on.drtg : null, tip: 'DRtg', fmt: function(v) { return v != null ? v.toFixed(0) : '—'; } },
    { label: 'NetRtg', value: a.netRtg, tip: 'NetRtg', statKey: 'netRtg', fmt: function(v) { return (v > 0 ? '+' : '') + (v || 0).toFixed(1); } },
    { label: 'TS%', value: a.TS, tip: 'TS%', statKey: 'TS', fmt: function(v) { return (v || 0).toFixed(1) + '%'; } },
    { label: 'eFG%', value: a.eFG, tip: 'eFG%', statKey: 'eFG', fmt: function(v) { return (v || 0).toFixed(1) + '%'; } },
    { label: 'USG%', value: a.usage, tip: 'USG%', statKey: 'usage', fmt: function(v) { return (v || 0).toFixed(1) + '%'; } },
    { label: 'AST%', value: a.astPct, tip: 'AST%', fmt: function(v) { return (v || 0).toFixed(1) + '%'; } },
    { label: 'TOV%', value: a.tovPct, tip: 'TOV%', fmt: function(v) { return (v || 0).toFixed(1) + '%'; } },
    { label: 'GameScore', value: avgGameScore, tip: 'GameScore', fmt: function(v) { return (v || 0).toFixed(2); } },
    { label: 'WOBA', value: wobaVal, tip: null, fmt: function(v) { return (v || 0).toFixed(3); } },
  ];

  var TREND_COLORS = {
    pts:  { stroke: '#FF6B35', fill: '#FF6B35' },
    reb:  { stroke: '#22C55E', fill: '#22C55E' },
    ast:  { stroke: '#3B82F6', fill: '#3B82F6' },
    stl:  { stroke: '#A855F7', fill: '#A855F7' },
    blk:  { stroke: '#EAB308', fill: '#EAB308' },
    tov:  { stroke: '#EF4444', fill: '#EF4444' },
    eval: { stroke: '#06B6D4', fill: '#06B6D4' },
    min:  { stroke: '#64748B', fill: '#64748B' },
  };
  var METRIC_LABELS = { pts: 'Points', reb: 'Rebonds', ast: 'Passes', stl: 'Interceptions', blk: 'Contres', tov: 'Balles perdues', eval: 'Evaluation', min: 'Minutes' };
  var ALL_METRICS = Object.keys(TREND_COLORS);
  var DEFAULT_VISIBLE = ['pts', 'reb', 'ast', 'eval'];
  var RIGHT_AXIS_METRICS = ['stl', 'blk', 'tov'];
  var [visibleMetrics, setVisibleMetrics] = React.useState(DEFAULT_VISIBLE);
  var toggleMetric = function(key) {
    setVisibleMetrics(function(prev) { return prev.includes(key) ? prev.filter(function(k) { return k !== key; }) : prev.concat(key); });
  };
  var trendData = player.logs.slice().reverse().map(function(l) {
    return { opponent: l.opponent || '?', pts: l.pts || 0, reb: l.reb || 0, ast: l.ast || 0, stl: l.stl || 0, blk: l.blk || 0, tov: l.tov || 0, eval: l.eff || 0, min: l.min || 0 };
  });
  var avgPts = a.pts || 0;

  var bestLogIdx = player.logs.reduce(function(best, l, i) {
    return (l.eff || 0) > ((player.logs[best] && player.logs[best].eff) || 0) ? i : best;
  }, 0);

  return (
    <div>
      {/* Onglets */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        {TABS.map(function(t) {
          var active = tab === t.id;
          return (
            <button key={t.id} onClick={function() { setTab(t.id); }}
              className="flex-1 text-xs font-bold py-2 px-3 rounded-lg uppercase tracking-wide"
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-3)',
                transition: 'background var(--t-fast), color var(--t-fast)',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Métriques */}
      {tab === 'metrics' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {METRICS.map(function(m) {
            var level = m.statKey ? getStatLevel(m.statKey, m.value || 0) : 'avg';
            var color = levelColor(level);
            var displayVal = m.fmt(m.value);
            return (
              <div key={m.label} className="sc-stat-block" style={{ padding: '14px 12px', textAlign: 'center' }}>
                <div className="mb-2">
                  {m.tip ? (
                    <Tooltip text={TOOLTIPS[m.tip] || m.tip}>
                      <span className="sc-section-label" style={{ borderBottom: '1px dotted var(--text-3)', cursor: 'help' }}>
                        {m.label}
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="sc-section-label">{m.label}</span>
                  )}
                </div>
                <div className="sc-stat-value text-xl font-black" style={{ color: m.value != null ? color : 'var(--text-3)' }}>
                  {displayVal}
                </div>
                {m.statKey && m.value != null && level !== 'avg' && (
                  <div className="text-[9px] mt-1 font-bold uppercase" style={{ color }}>
                    {level === 'elite' ? 'ÉLITE' : level === 'good' ? 'BON' : 'FAIBLE'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Tendances */}
      {tab === 'trends' && (
        <div className="space-y-4">
          {/* Graphique multi-courbes */}
          <div className="sc-card" style={{ padding: '16px 20px' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
              Évolution par match — {gp} matchs
            </div>
            {trendData.length < 3 ? (
              <div className="text-xs italic py-8 text-center" style={{ color: 'var(--text-3)' }}>
                Pas assez de matchs pour afficher la tendance (minimum 3).
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                {/* Légende cliquable */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                  {ALL_METRICS.map(function(key) {
                    var active = visibleMetrics.includes(key);
                    return (
                      <button key={key} onClick={function() { toggleMetric(key); }}
                        className="flex items-center gap-1.5 text-xs transition-opacity"
                        style={{ opacity: active ? 1 : 0.35, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', backgroundColor: TREND_COLORS[key].stroke, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-3)' }}>{METRIC_LABELS[key]}</span>
                      </button>
                    );
                  })}
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 30, bottom: 0, left: -5 }}>
                    <defs>
                      {ALL_METRICS.map(function(key) {
                        return (
                          <linearGradient key={key} id={'grad-rp-' + key} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={TREND_COLORS[key].fill} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={TREND_COLORS[key].fill} stopOpacity={0}/>
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="opponent" stroke="var(--text-3)" fontSize={9} height={65} angle={-35} textAnchor="end" />
                    <YAxis yAxisId="left" stroke="var(--text-3)" fontSize={10} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-3)" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                      labelStyle={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}
                      formatter={function(value, name) { return [Number(value).toFixed(1), METRIC_LABELS[name] || name]; }}
                      labelFormatter={function(label) { return 'vs ' + label; }}
                    />
                    {visibleMetrics.includes('pts') && <Area yAxisId="left" type="monotone" dataKey="pts" stroke="#FF6B35" fill="url(#grad-rp-pts)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-1)', stroke: '#FF6B35' }} activeDot={{ r: 6 }} />}
                    {visibleMetrics.includes('reb') && <Area yAxisId="left" type="monotone" dataKey="reb" stroke="#22C55E" fill="url(#grad-rp-reb)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-1)', stroke: '#22C55E' }} activeDot={{ r: 6 }} />}
                    {visibleMetrics.includes('ast') && <Area yAxisId="left" type="monotone" dataKey="ast" stroke="#3B82F6" fill="url(#grad-rp-ast)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-1)', stroke: '#3B82F6' }} activeDot={{ r: 6 }} />}
                    {visibleMetrics.includes('eval') && <Area yAxisId="left" type="monotone" dataKey="eval" stroke="#06B6D4" fill="url(#grad-rp-eval)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-1)', stroke: '#06B6D4' }} activeDot={{ r: 6 }} />}
                    {visibleMetrics.includes('stl') && <Area yAxisId="right" type="monotone" dataKey="stl" stroke="#A855F7" fill="url(#grad-rp-stl)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-1)', stroke: '#A855F7' }} activeDot={{ r: 5 }} />}
                    {visibleMetrics.includes('blk') && <Area yAxisId="right" type="monotone" dataKey="blk" stroke="#EAB308" fill="url(#grad-rp-blk)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-1)', stroke: '#EAB308' }} activeDot={{ r: 5 }} />}
                    {visibleMetrics.includes('tov') && <Area yAxisId="right" type="monotone" dataKey="tov" stroke="#EF4444" fill="url(#grad-rp-tov)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-1)', stroke: '#EF4444' }} activeDot={{ r: 5 }} />}
                    {visibleMetrics.includes('min') && <Area yAxisId="left" type="monotone" dataKey="min" stroke="#64748B" fill="url(#grad-rp-min)" strokeWidth={1.5} dot={{ r: 3, strokeWidth: 1, fill: 'var(--bg-1)', stroke: '#64748B' }} strokeDasharray="4 3" />}
                    {visibleMetrics.includes('pts') && avgPts > 0 && (
                      <ReferenceLine yAxisId="left" y={avgPts} stroke="#FF6B35" strokeDasharray="5 5" strokeOpacity={0.4}>
                        <Label value={'Moy: ' + avgPts.toFixed(1)} position="right" fill="#FF6B35" fontSize={10} />
                      </ReferenceLine>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {/* Phase progression */}
          {phaseProgression && (
            <div className="sc-card" style={{ padding: '16px 20px' }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Progression par phase</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left py-1.5 pr-3" style={{ color: 'var(--text-3)' }}>Phase</th>
                      <th className="text-center px-2" style={{ color: 'var(--text-3)' }}>MJ</th>
                      {['PTS','REB','AST','EFF','USG%'].map(function(h) {
                        return <th key={h} className="text-center px-2" style={{ color: 'var(--text-3)' }}>{h}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {phaseProgression.map(function(ph, idx) {
                      var prev = idx > 0 ? phaseProgression[idx - 1] : null;
                      var keys = ['pts','reb','ast','eff','usage'];
                      return (
                        <tr key={ph.phaseId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td className="py-1.5 pr-3 font-bold" style={{ color: 'var(--text-1)' }}>{ph.phaseName}</td>
                          <td className="text-center px-2" style={{ color: 'var(--text-2)' }}>{ph.gp}</td>
                          {keys.map(function(k) {
                            var v = ph.avg[k] || 0;
                            var delta = prev ? v - (prev.avg[k] || 0) : null;
                            return (
                              <td key={k} className="text-center px-2 py-1.5">
                                <div className="sc-stat-value font-bold" style={{ color: 'var(--text-1)' }}>{v.toFixed(1)}</div>
                                {delta !== null && Math.abs(delta) >= 0.1 && <TrendIndicator delta={delta} />}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Comparaison saisons */}
          {propSeasons && propSeasons.length > 0 && (
            <div className="sc-card" style={{ padding: '16px 20px' }}>
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Comparaison saisons</div>
                <select value={compareSeasonId} onChange={function(e) { setCompareSeasonId(e.target.value); }}
                  style={{ background: 'var(--bg-3)', color: 'var(--text-1)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)', padding: '4px 8px', fontSize: '11px' }}>
                  <option value="">— Choisir une saison —</option>
                  {propSeasons.map(function(s) {
                    return <option key={s.id} value={s.id}>{s.name} ({(s.games || []).length} matchs)</option>;
                  })}
                </select>
              </div>
              {compareSeasonId && (function() {
                var comp = AnalysisEngine.calcSeasonComparison(player, propSeasons.find(function(s) { return s.id === compareSeasonId; }));
                if (!comp) return <div className="text-xs italic" style={{ color: 'var(--text-3)' }}>Joueur introuvable dans cette saison.</div>;
                var KEYS = ['pts','reb','ast','eff','usage','fgPct','threePct'];
                var LABELS = ['PTS','REB','AST','EFF','USG%','FG%','3P%'];
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th className="text-left py-1.5 pr-3" style={{ color: 'var(--text-3)' }}>Saison</th>
                          {LABELS.map(function(l) { return <th key={l} className="text-center px-2" style={{ color: 'var(--text-3)' }}>{l}</th>; })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td className="py-1.5 pr-3 font-bold" style={{ color: 'var(--sys-warn)' }}>{comp.archivedName}</td>
                          {KEYS.map(function(k) { return <td key={k} className="text-center px-2 sc-stat-value" style={{ color: 'var(--text-2)' }}>{(comp.archivedAvg[k] || 0).toFixed(1)}</td>; })}
                        </tr>
                        <tr>
                          <td className="py-1.5 pr-3 font-bold" style={{ color: 'var(--accent)' }}>Actuelle</td>
                          {KEYS.map(function(k) {
                            var d = comp.deltas[k] || 0;
                            return (
                              <td key={k} className="text-center px-2 py-1.5">
                                <div className="sc-stat-value font-bold" style={{ color: 'var(--text-1)' }}>{(player.avg[k] || 0).toFixed(1)}</div>
                                {Math.abs(d) >= 0.1 && <TrendIndicator delta={d} />}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tab: Match par match */}
      {tab === 'logs' && (
        <div className="sc-card overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead className="sticky-header" style={{ background: 'var(--bg-2)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date','Adv','MIN','PTS','REB','AST','STL','BLK','TOV','FG%','3P%','+/-','EFF'].map(function(h) {
                    return <th key={h} className="text-center py-2 px-2 sc-section-label first:text-left">{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {player.logs.map(function(g, i) {
                  var fgPct = g.fga > 0 ? ((g.fgm / g.fga) * 100).toFixed(0) : '—';
                  var threePct = g.threea > 0 ? ((g.threem / g.threea) * 100).toFixed(0) : '—';
                  var isBest = i === bestLogIdx;
                  return (
                    <tr key={i} className="sc-table-row" style={{
                      background: isBest ? 'var(--accent-ghost)' : i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft: isBest ? '2px solid var(--accent)' : undefined,
                    }}>
                      <td className="py-1.5 px-2 text-left" style={{ color: 'var(--text-3)' }}>{g.date}</td>
                      <td className="py-1.5 px-2 text-center font-medium" style={{ color: 'var(--text-1)' }}>{g.opponent}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: 'var(--text-3)' }}>{g.min}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value font-bold" style={{ color: g.pts >= 20 ? 'var(--accent)' : 'var(--text-1)' }}>{g.pts}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: 'var(--data-light)' }}>{g.reb}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: 'var(--made)' }}>{g.ast}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: 'var(--text-2)' }}>{g.stl}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: 'var(--text-2)' }}>{g.blk}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: g.tov >= 4 ? 'var(--miss)' : 'var(--text-3)' }}>{g.tov}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: 'var(--text-2)' }}>{fgPct}{fgPct !== '—' ? '%' : ''}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value" style={{ color: 'var(--data)' }}>{threePct}{threePct !== '—' ? '%' : ''}</td>
                      <td className="py-1.5 px-2 text-center sc-stat-value font-bold" style={{ color: g.plusMinus > 0 ? 'var(--made)' : g.plusMinus < 0 ? 'var(--miss)' : 'var(--text-3)' }}>
                        {g.plusMinus > 0 ? '+' : ''}{g.plusMinus}
                      </td>
                      <td className="py-1.5 px-2 text-center sc-stat-value font-bold" style={{ color: 'var(--sys-warn)' }}>{g.eff}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [expertTab, setExpertTab] = React.useState('metrics'); // eslint-disable-line no-unused-vars
  const [activeLevel, setActiveLevel] = React.useState(4);
  const [reportFilter, setReportFilter] = React.useState('all');

  const filteredGames = React.useMemo(() => {
    const gs = propGames || [];
    if (reportFilter === 'all') return gs;
    if (reportFilter === 'last5') return gs.slice(-5);
    if (reportFilter === 'last10') return gs.slice(-10);
    if (reportFilter === 'prep') return gs.filter(function(g) { return !g.phase || g.phase === 'preparation' || g.phase === 'preseason'; });
    return gs.filter(function(g) { return g.phase === reportFilter; });
  }, [propGames, reportFilter]);

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
    if (propRoster) setPlayers(AnalysisEngine.processPlayerData(filteredGames, propRoster));
  }, [filteredGames, propRoster]);

  React.useEffect(() => {
    setCompareSeasonId('');
    setActiveLevel(4);
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
        className="flex flex-col font-sans min-h-full"
        style={{ background: 'var(--bg-0)', color: 'var(--text-1)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4 flex justify-between items-center shrink-0"
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
        <div className="p-5">
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

  // --- VUE DETAIL — 4 niveaux de lecture progressifs ---
  var p = players.find(function (x) { return x.id === selectedId; });
  if (!p || p.logs.length === 0) {
    return (
      <div className="flex flex-col font-sans" style={{ background: 'var(--bg-0)' }}>
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={function() { setSelectedId(null); }} className="sc-btn-ghost px-2 py-1.5 text-sm">← Retour</button>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-slate-400 text-sm">Aucun match disponible sur cette période.</div>
          <button onClick={function() { setReportFilter('all'); }} className="mt-3 text-xs text-orange-400 underline">Réinitialiser le filtre</button>
        </div>
      </div>
    );
  }

  var arch = AnalysisEngine.getArchetype(p, players, propGames);
  var swot = AnalysisEngine.getSWOT(p);
  // --- Pre-computations detail view ---
  var a = p.avg;
  var gp = p.logs.length;
  var fp = AnalysisEngine.computeFingerprint(p, players, propGames);
  var ovr = calcOVR(fp);
  var heroStats = AnalysisEngine.generateHeroStats(p, players);
  var impactStatement = AnalysisEngine.generateImpactStatement(p, propGames || [], propRoster || []);
  var seasonHighs = AnalysisEngine.getSeasonHighs(p);
  var teamAvgFp = calcTeamAvgFp(players, propGames);
  var wlSplits = calcWLSplits(p);
  var onOff = AnalysisEngine.calcOnOffAggregated(propGames || [], p.id, propRoster || []);
  var phaseProgression = AnalysisEngine.calcPhaseProgression(p, propGames || [], propPhases || []);
  var streakData = window.StatsEngine ? window.StatsEngine.hotColdStreak(p.logs.map(function(l) { return l.eff; })) : null;
  var totalFGA = a.fga + a.threea;
  var totalFGM = a.fgm + a.threem;
  var fgPctGlobal = totalFGA > 0 ? (totalFGM / totalFGA) * 100 : 0;
  var teamAvgStl = players.length > 1 ? players.reduce(function(s, x) { return s + ((x.avg && x.avg.stl) || 0); }, 0) / players.length : 0;
  var teamAvgBlk = players.length > 1 ? players.reduce(function(s, x) { return s + ((x.avg && x.avg.blk) || 0); }, 0) / players.length : 0;
  var reliabilityLabel = gp >= 10 ? 'Solide' : gp >= 5 ? 'Limité' : 'Trop peu de données';

  var LEVEL_SECTIONS = [
    { id: 1, label: 'Vue rapide' },
    { id: 2, label: 'Profil' },
    { id: 3, label: 'Impact' },
    { id: 4, label: 'Expert' },
  ];

  return (
    <div className="flex flex-col font-sans" style={{ background: 'var(--bg-0)' }}>
      {/* Header sticky */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 glass-strong" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={function() { setSelectedId(null); }} className="sc-btn-ghost px-2 py-1.5 text-sm">
          ← Retour
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-lg leading-tight" style={{ color: 'var(--text-1)' }}>
              {p.number ? '#' + p.number + ' ' : ''}{p.name}
            </span>
            <span className="sc-badge text-[10px]" style={{ color: arch.color, borderColor: arch.border, background: arch.bg }}>
              {arch.name}
            </span>
            {streakData && streakData.streak >= 3 && (
              <span className="sc-badge" style={{ color: 'var(--made)', borderColor: 'var(--made)', background: 'rgba(52,211,153,0.08)' }}>
                {streakData.streak} en forme
              </span>
            )}
            {streakData && streakData.streak <= -3 && (
              <span className="sc-badge" style={{ color: 'var(--miss)', borderColor: 'var(--miss)', background: 'rgba(248,113,113,0.08)' }}>
                Passage difficile
              </span>
            )}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {gp} match{gp > 1 ? 's' : ''} · {reliabilityLabel}{p.pos ? ' · ' + p.pos : ''}
          </div>
        </div>
        <button
          onClick={function() { exportPlayerPDF(p); }}
          disabled={isExportingPDF}
          className="sc-btn-ghost text-xs px-3 py-1.5"
        >
          {isExportingPDF ? 'Export...' : 'PDF'}
        </button>
      </div>

      {/* Nav niveaux */}
      <div className="sticky top-[57px] z-40 px-4 py-2 flex gap-1 overflow-x-auto no-scrollbar" style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}>
        {LEVEL_SECTIONS.map(function(s) {
          var active = activeLevel >= s.id;
          return (
            <button key={s.id} onClick={function() { setActiveLevel(s.id); }}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
              style={{
                background: active ? 'var(--accent)' : 'var(--bg-2)',
                color: active ? '#fff' : 'var(--text-3)',
                border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                transition: 'all var(--t-fast)', cursor: 'pointer',
              }}>
              N{s.id} — {s.label}
            </button>
          );
        })}
      </div>

      {/* Filtre période */}
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap" style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Période :</span>
        <select
          value={reportFilter}
          onChange={function(e) { setReportFilter(e.target.value); }}
          className="bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-1)] rounded-lg px-3 py-1 text-xs"
        >
          <option value="all">Toute la saison</option>
          {(propPhases || []).map(function(ph) { return <option key={ph.id} value={ph.id}>{ph.name}</option>; })}
          <option value="prep">Matchs de préparation</option>
          <option value="last5">5 derniers matchs</option>
          <option value="last10">10 derniers matchs</option>
        </select>
        {reportFilter !== 'all' && (
          <span className="text-[10px] text-slate-500">
            ({filteredGames.length} match{filteredGames.length > 1 ? 's' : ''})
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 px-4 py-5 max-w-6xl mx-auto w-full space-y-5">

        {/* ═══ NIVEAU 1 — HERO ═══ */}
        <div className="sc-card p-5" id="level-1" style={{ borderTop: '3px solid var(--accent)', overflow: 'hidden', position: 'relative' }}>
          {/* Accent glow top-right */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div className="flex items-start gap-5 flex-wrap">
            {/* Photo + OVR ring */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              {p.photo ? (
                <img src={p.photo} alt={p.name} className="w-16 h-16 rounded-full object-cover" style={{ border: '2px solid var(--accent)' }} />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(249,115,22,0.08) 100%)', border: '2px solid rgba(249,115,22,0.4)', color: 'var(--accent)' }}>
                  {(p.name || '?')[0]}
                </div>
              )}
              <PercentRing value={ovr} size={56} color="var(--accent)" label="OVR" />
            </div>

            {/* Hero stats */}
            <div className="flex-1 min-w-0">
              <div className="text-sm mb-3 leading-snug" style={{ color: 'var(--text-2)' }}>
                {arch.desc}
              </div>
              {arch.nbaComp && arch.nbaComp.best && arch.nbaComp.best.name && (
                <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Comp NBA</span>
                  <span className="font-black text-sm" style={{ color: 'var(--accent)' }}>{arch.nbaComp.best.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{arch.nbaComp.best.similarity}%</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {heroStats.map(function(h) {
                  var statColor = h.percentile >= 80 ? 'var(--accent)' : h.percentile >= 60 ? 'var(--made)' : 'var(--text-1)';
                  return (
                    <div key={h.key} className="sc-stat-block text-center" style={{ borderColor: h.percentile >= 80 ? 'rgba(249,115,22,0.3)' : h.percentile >= 60 ? 'rgba(52,211,153,0.2)' : undefined }}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <HeroIcon name={h.icon} size={13} />
                        <span className="sc-section-label">{h.label}</span>
                      </div>
                      <div className="sc-stat-value text-xl font-black" style={{ color: statColor }}>
                        {typeof h.value === 'number' ? h.value.toFixed(1) : h.value}
                      </div>
                      <div className="mt-1 flex justify-center">
                        <PercentRing value={h.percentile} size={28} color={levelColor(h.percentile >= 80 ? 'elite' : h.percentile >= 60 ? 'good' : 'avg')} />
                      </div>
                      <div className="text-[9px] mt-0.5 font-bold" style={{ color: statColor, opacity: 0.75 }}>
                        Top {Math.round(100 - h.percentile)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tags archétype */}
            {arch.tags && arch.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 w-full pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                {arch.tags.map(function(tag) {
                  return (
                    <span key={tag} className="sc-badge" style={{ color: arch.color, borderColor: arch.border, background: arch.bg }}>
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ NIVEAU 2 — PROFIL ═══ */}
        {activeLevel >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="level-2">
            {/* Radar fingerprint */}
            <div className="sc-card p-5" style={{ borderTop: '3px solid var(--data)' }}>
              <div className="sc-section-label--accent sc-section-label mb-3">Empreinte 8 dimensions</div>
              <div className="flex items-center gap-4">
                <FingerprintRadar8D fp={fp} teamAvgFp={teamAvgFp} />
                <div className="flex-1 space-y-1.5">
                  {fp && ['volume','efficiency','shooting','creation','rebounding','interior','defense','impact'].map(function(d) {
                    var dimLabels = { volume:'VOL', efficiency:'EFF', shooting:'TIR', creation:'CREA', rebounding:'REB', interior:'INT', defense:'DEF', impact:'IMP' };
                    var val = fp[d] || 0;
                    var barColor = val >= 70 ? 'var(--accent)' : val >= 40 ? 'var(--data)' : 'rgba(255,255,255,0.12)';
                    var numColor = val >= 70 ? 'var(--accent)' : val >= 40 ? 'var(--data)' : 'var(--text-3)';
                    return (
                      <div key={d}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span style={{ color: val >= 70 ? 'var(--text-1)' : 'var(--text-3)' }}>{dimLabels[d]}</span>
                          <span style={{ color: numColor, fontFamily: 'Fira Code, monospace', fontWeight: 700 }}>{Math.round(val)}</span>
                        </div>
                        <div className="sc-progress">
                          <div className="sc-progress__fill" style={{ width: val + '%', background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                  {teamAvgFp && (
                    <div className="text-[9px] mt-2 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                      <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="rgba(129,140,248,0.5)" strokeWidth="1.5" strokeDasharray="3,2" /></svg>
                      Moyenne équipe
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shooting profile */}
            <div className="sc-card p-5 space-y-4" style={{ borderTop: '3px solid var(--made)' }}>
              <div className="sc-section-label--accent sc-section-label">Profil de tir</div>
              <div className="flex justify-around flex-wrap gap-3">
                {[
                  { label: 'FG%', value: fgPctGlobal, color: 'var(--accent)' },
                  { label: '3P%', value: a.threePct || 0, color: 'var(--data)' },
                  { label: 'FT%', value: a.ftPct || 0, color: 'var(--made)' },
                  { label: 'TS%', value: a.TS || 0, color: 'var(--sys-warn)' },
                ].map(function(ring) {
                  return (
                    <div key={ring.label} className="text-center">
                      <PercentRing value={ring.value} size={64} color={ring.color} />
                      <div className="sc-section-label mt-1">{ring.label}</div>
                    </div>
                  );
                })}
              </div>
              {p.shotProfile && p.shotProfile.totalShots > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Zones de tir</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(function() {
                      var zones = [
                        { label: 'Raquette', val: p.shotProfile.paintPct },
                        { label: 'Mi-dist', val: p.shotProfile.midPct },
                        { label: 'Corner', val: p.shotProfile.cornerPct },
                        { label: 'Au-dessus', val: p.shotProfile.abPct },
                      ];
                      var maxVal = Math.max.apply(null, zones.map(function(z) { return z.val || 0; }));
                      return zones.map(function(z) {
                        var isPrimary = (z.val || 0) === maxVal && maxVal > 0;
                        return (
                          <div key={z.label} className="sc-stat-block text-center py-2" style={isPrimary ? { borderColor: 'rgba(249,115,22,0.35)', background: 'rgba(249,115,22,0.06)' } : {}}>
                            <div className="sc-stat-value text-base font-bold" style={{ color: isPrimary ? 'var(--accent)' : 'var(--text-1)' }}>{(z.val || 0).toFixed(0)}%</div>
                            <div className="text-[9px] mt-0.5" style={{ color: isPrimary ? 'var(--accent)' : 'var(--text-3)', opacity: isPrimary ? 0.8 : 1 }}>{z.label}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Hustle / Défense</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'STL', val: a.stl, teamAvg: teamAvgStl, icon: 'steal' },
                    { label: 'BLK', val: a.blk, teamAvg: teamAvgBlk, icon: 'block' },
                    { label: 'DRB', val: (a.reb || 0) - (a.oreb || 0), teamAvg: null, icon: 'rebound' },
                  ].map(function(h) {
                    var aboveAvg = h.teamAvg !== null && h.val > h.teamAvg;
                    return (
                      <div key={h.label} className="sc-stat-block text-center">
                        <HeroIcon name={h.icon} size={14} />
                        <div className="sc-stat-value text-base font-bold mt-1" style={{ color: aboveAvg ? 'var(--made)' : 'var(--text-1)' }}>
                          {(h.val || 0).toFixed(1)}
                        </div>
                        <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>{h.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ NIVEAU 3 — IMPACT ═══ */}
        {activeLevel >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="level-3">
            {/* Impact statement + W/L */}
            <div className="sc-card p-5" style={{ borderTop: '3px solid var(--accent)' }}>
              <div className="sc-section-label--accent sc-section-label mb-4">Impact équipe</div>
              {impactStatement && (
                <div className="mb-4 p-3 rounded-xl text-sm font-medium leading-snug" style={{ background: 'var(--accent-ghost)', border: '1px solid var(--border-accent)', color: 'var(--text-1)' }}>
                  {impactStatement}
                </div>
              )}
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Victoires vs Défaites</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="sc-stat-block text-center" style={{ background: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.25)' }}>
                  <div className="sc-stat-value text-2xl font-black" style={{ color: 'var(--made)' }}>{wlSplits.wins}</div>
                  <div className="sc-section-label mt-0.5" style={{ color: 'var(--made)', opacity: 0.7 }}>Victoires</div>
                </div>
                <div className="sc-stat-block text-center" style={{ background: 'rgba(248,113,113,0.07)', borderColor: 'rgba(248,113,113,0.25)' }}>
                  <div className="sc-stat-value text-2xl font-black" style={{ color: 'var(--miss)' }}>{wlSplits.losses}</div>
                  <div className="sc-section-label mt-0.5" style={{ color: 'var(--miss)', opacity: 0.7 }}>Défaites</div>
                </div>
              </div>
              {wlSplits.wins + wlSplits.losses > 0 && (
                <div className="space-y-1.5">
                  {['pts','reb','ast','eff'].map(function(k) {
                    var s = wlSplits.stats[k];
                    if (!s) return null;
                    var wlLabels = { pts:'PTS', reb:'REB', ast:'AST', eff:'EFF' };
                    return (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-8 sc-section-label">{wlLabels[k]}</span>
                        <span className="font-bold" style={{ color: 'var(--made)' }}>{s.w.toFixed(1)}</span>
                        <span style={{ color: 'var(--text-3)' }}>/</span>
                        <span className="font-bold" style={{ color: 'var(--miss)' }}>{s.l.toFixed(1)}</span>
                        <TrendIndicator delta={s.delta} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Season highs + SWOT */}
            <div className="sc-card p-5 space-y-4" style={{ borderTop: '3px solid var(--sys-warn)' }}>
              {seasonHighs.length > 0 && (
                <div>
                  <div className="sc-section-label--accent sc-section-label mb-3">Records saison</div>
                  <div className="grid grid-cols-3 gap-2">
                    {seasonHighs.slice(0, 6).map(function(sh) {
                      return (
                        <div key={sh.stat} className="sc-stat-block text-center">
                          <div className="sc-stat-value text-base font-black" style={{ color: 'var(--accent)' }}>{sh.value}</div>
                          <div className="sc-section-label mt-0.5">{sh.label}</div>
                          {sh.date && <div className="text-[9px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{sh.date}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {swot && (
                <div>
                  <div className="sc-section-label--accent sc-section-label mb-3">Analyse SWOT</div>
                  <div className="space-y-2">
                    {swot.strengths && swot.strengths.length > 0 && (
                      <div className="rounded-lg p-3" style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.28)' }}>
                        <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--made)' }}>Points forts</div>
                        {swot.strengths.slice(0, 2).map(function(s, i) {
                          return <div key={i} className="text-xs leading-snug mb-1" style={{ color: 'var(--text-1)' }}>{s.text || s}</div>;
                        })}
                      </div>
                    )}
                    {swot.improvements && swot.improvements.length > 0 && (
                      <div className="rounded-lg p-3" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.28)' }}>
                        <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--miss)' }}>Axes d'amélioration</div>
                        {swot.improvements.slice(0, 2).map(function(s, i) {
                          return <div key={i} className="text-xs leading-snug mb-1" style={{ color: 'var(--text-1)' }}>{s.text || s}</div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ NIVEAU 4 — EXPERT ═══ */}
        {activeLevel >= 4 && (
          <div className="sc-card p-5" id="level-4" style={{ borderTop: '3px solid var(--data)' }}>
            <div className="sc-section-label--accent sc-section-label mb-4">Analyse experte</div>
            <ExpertTabs
              player={p}
              allPlayers={players}
              propGames={propGames}
              propRoster={propRoster}
              propPhases={propPhases}
              propSeasons={propSeasons}
              onOff={onOff}
              phaseProgression={phaseProgression}
              compareSeasonId={compareSeasonId}
              setCompareSeasonId={setCompareSeasonId}
            />
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
};


window.PlayerReportModule = PlayerReportModule;
