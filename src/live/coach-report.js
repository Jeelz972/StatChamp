// src/live/coach-report.js
// Coach Report — calcul des donnees et rendu HTML pour live.html
// Consomme StatsEngine pour toutes les formules statistiques.

import { calcImpactStats } from '../utils/calc-impact-stats.js';

// ─── SEUILS & POIDS ────────────────────────────────────────────
const THRESHOLDS = {
  fgPct:    { min: 10, bad: 38, good: 48, weight: 5, label: 'FG%',       recBad: 'Chercher de meilleures positions de tir — travailler le mouvement de balle' },
  threePct: { min: 5,  bad: 28, good: 38, weight: 2, label: '3P%',       recBad: 'Reduire les tirs a 3 points forces — attaquer la peinture' },
  ftPct:    { min: 4,  bad: 60, good: 78, weight: 1, label: 'FT%',       recBad: 'Se concentrer sur les lancers francs' },
  tovPct:   { min: 10, bad: 18, good: 12, weight: 5, label: 'TOV%',      recBad: 'Reduire les pertes de balle — privilegier les passes courtes', inverted: true },
  orebPct:  { min: 6,  bad: 20, good: 35, weight: 3, label: 'OREB%',     recBad: 'Attaquer le rebond offensif' },
  astRatio: { min: 5,  bad: 40, good: 60, weight: 3, label: 'AST/FGM',   recBad: "Jouer plus collectif — chercher l'extra-pass" },
  fouls:    { min: 0,  bad: 8,  good: 4,  weight: 2, label: 'Fautes',    recBad: 'Reduire l\'agressivite defensive — eviter les fautes inutiles', inverted: true, absolute: true },
};

// ─── AGGREGATION ────────────────────────────────────────────────
export function aggregateTeamStats(players) {
  let fgm = 0, fga = 0, threePM = 0, threePA = 0, ftm = 0, fta = 0;
  let oreb = 0, dreb = 0, ast = 0, tov = 0, stl = 0, blk = 0, pf = 0;

  for (const p of Object.values(players)) {
    if (p.team !== 'home') continue;
    const s = p.stats;
    fgm += s.fgm;  fga += s.fga;
    threePM += s.fg3m;  threePA += s.fg3a;
    ftm += s.ftm;  fta += s.fta;
    oreb += s.oreb;  dreb += s.dreb;
    ast += s.ast;  tov += s.tov;
    stl += s.stl;  blk += s.blk;
    pf += s.fouls;
  }

  const totalFGM = fgm + threePM;
  const totalFGA = fga + threePA;
  const fgPct = totalFGA > 0 ? Math.round((totalFGM / totalFGA) * 100) : 0;
  const threePct = threePA > 0 ? Math.round((threePM / threePA) * 100) : 0;
  const ftPct = fta > 0 ? Math.round((ftm / fta) * 100) : 0;

  return {
    fgm, fga, fgPct,
    threePM, threePA, threePct,
    ftm, fta, ftPct,
    oreb, dreb, reb: oreb + dreb,
    ast, tov, stl, blk, pf,
  };
}

// ─── ANALYSE EQUIPE ─────────────────────────────────────────────
export function analyzeTeamAlerts(teamStats, oppStats) {
  const SE = typeof window !== 'undefined' && window.StatsEngine ? window.StatsEngine : null;
  const possSimple = SE
    ? SE.possSimple(teamStats.fga + teamStats.threePA, teamStats.fta, teamStats.tov, teamStats.oreb)
    : (teamStats.fga + teamStats.threePA) + 0.44 * teamStats.fta + teamStats.tov - teamStats.oreb;

  const totalFGM = teamStats.fgm + teamStats.threePM;
  const totalFGA = teamStats.fga + teamStats.threePA;
  const oppDreb = (oppStats && oppStats.dreb) || 0;

  const values = {
    fgPct:    { value: teamStats.fgPct, volume: totalFGA },
    threePct: { value: teamStats.threePct, volume: teamStats.threePA },
    ftPct:    { value: teamStats.ftPct, volume: teamStats.fta },
    tovPct:   { value: possSimple > 0 ? Math.round((teamStats.tov / possSimple) * 100) : 0, volume: possSimple },
    orebPct:  { value: (teamStats.oreb + oppDreb) > 0 ? Math.round((teamStats.oreb / (teamStats.oreb + oppDreb)) * 100) : 0, volume: teamStats.oreb + oppDreb },
    astRatio: { value: totalFGM > 0 ? Math.round((teamStats.ast / totalFGM) * 100) : 0, volume: totalFGM },
    fouls:    { value: teamStats.pf, volume: teamStats.pf },
  };

  const alerts = [];

  for (const [key, cfg] of Object.entries(THRESHOLDS)) {
    const { value, volume } = values[key];
    if (!cfg.absolute && volume < cfg.min) continue;

    const inverted = !!cfg.inverted;
    let level = null;
    let threshold = null;

    if (inverted) {
      if (value > cfg.bad) { level = 'problem'; threshold = cfg.bad; }
      else if (value < cfg.good) { level = 'good'; threshold = cfg.good; }
    } else {
      if (value < cfg.bad) { level = 'problem'; threshold = cfg.bad; }
      else if (value > cfg.good) { level = 'good'; threshold = cfg.good; }
    }

    if (level) {
      alerts.push({
        level,
        message: level === 'problem'
          ? `${cfg.label} a ${value}${cfg.absolute ? '' : '%'} (seuil: ${cfg.bad}${cfg.absolute ? '' : '%'})`
          : `${cfg.label} a ${value}${cfg.absolute ? '' : '%'} — excellent`,
        metric: key,
        value,
        threshold,
        weight: cfg.weight,
      });
    }
  }

  alerts.sort((a, b) => {
    const scoreA = a.weight * Math.abs(a.value - a.threshold);
    const scoreB = b.weight * Math.abs(b.value - b.threshold);
    return scoreB - scoreA;
  });

  return alerts;
}

// ─── TONE DU MATCH ──────────────────────────────────────────────
export function computeTone(net, fgPct, tovPct) {
  if (net > 0 && fgPct > 45 && tovPct < 15) return { label: 'Match maitrise', icon: 'fire' };
  if (net < 0 && tovPct > 18) return { label: 'Match brouillon', icon: 'warning' };
  if (fgPct < 35) return { label: "Manque d'agressivite", icon: 'snowflake' };
  return { label: 'Match equilibre', icon: 'balance' };
}

// ─── RECOMMANDATIONS ────────────────────────────────────────────
export function generateRecommendations(alerts) {
  const problems = alerts.filter(a => a.level === 'problem');

  const recs = [];
  for (const alert of problems) {
    const cfg = THRESHOLDS[alert.metric];
    if (cfg && cfg.recBad && recs.length < 3) {
      recs.push(cfg.recBad);
    }
  }
  return recs;
}

// ─── ANALYSE INDIVIDUELLE ───────────────────────────────────────
export function analyzeIndividuals(players, reportType, teamTovCost) {
  const SE = typeof window !== 'undefined' && window.StatsEngine ? window.StatsEngine : null;
  const homePlayers = Object.values(players).filter(p => p.team === 'home');
  const alerts = [];
  const foulThreshold = reportType === 'halftime' ? 2 : 5;

  const withEff = homePlayers.map(p => {
    const s = p.stats;
    const reb = s.oreb + s.dreb;
    const eff = SE
      ? SE.EFF(s.pts, reb, s.ast, s.stl, s.blk, s.fga + s.fg3a, s.fgm + s.fg3m, s.fta, s.ftm, s.tov)
      : s.pts + reb + s.ast + s.stl + s.blk - ((s.fga + s.fg3a) - (s.fgm + s.fg3m) + (s.fta - s.ftm) + s.tov);
    return { ...p, eff };
  });

  withEff.sort((a, b) => b.eff - a.eff);

  const top = withEff.filter(p => p.eff > 0).slice(0, 2);
  for (const p of top) {
    alerts.push({
      pid: p.id, name: p.name, number: p.number, type: 'positive',
      message: `#${p.number} ${p.name} — EFF ${p.eff > 0 ? '+' : ''}${p.eff}`,
      value: p.eff,
      impactDetail: `+/- : ${p.stats.plusMinus > 0 ? '+' : ''}${p.stats.plusMinus}`,
    });
  }

  for (const p of withEff) {
    const s = p.stats;
    if (p.eff < 0) {
      const totalFGA = s.fga + s.fg3a;
      const totalFGM = s.fgm + s.fg3m;
      const fgPct = totalFGA > 0 ? Math.round((totalFGM / totalFGA) * 100) : 0;
      if (totalFGA >= 5 && fgPct < 30) {
        const wastedPoss = totalFGA - totalFGM;
        alerts.push({
          pid: p.id, name: p.name, number: p.number, type: 'negative',
          message: `#${p.number} ${p.name} shoot a ${totalFGM}/${totalFGA} (${fgPct}%)`,
          value: p.eff,
          impactDetail: `${wastedPoss} possessions gachees — +/- : ${s.plusMinus > 0 ? '+' : ''}${s.plusMinus}`,
        });
        continue;
      }
      alerts.push({
        pid: p.id, name: p.name, number: p.number, type: 'negative',
        message: `#${p.number} ${p.name} en difficulte — EFF ${p.eff}`,
        value: p.eff,
        impactDetail: `+/- : ${s.plusMinus > 0 ? '+' : ''}${s.plusMinus}`,
      });
    }

    if (s.tov > 3) {
      const totalTeamTov = homePlayers.reduce((sum, pl) => sum + pl.stats.tov, 0);
      const playerTovShare = totalTeamTov > 0 ? s.tov / totalTeamTov : 0;
      const estimatedCost = Math.round(playerTovShare * teamTovCost);
      if (!alerts.find(a => a.pid === p.id && a.message.includes('ballon'))) {
        alerts.push({
          pid: p.id, name: p.name, number: p.number, type: 'negative',
          message: `#${p.number} ${p.name} a perdu ${s.tov} ballons`,
          value: s.tov,
          impactDetail: estimatedCost > 0 ? `~${estimatedCost} pts offerts a l'adversaire — +/- : ${s.plusMinus > 0 ? '+' : ''}${s.plusMinus}` : undefined,
        });
      }
    }
  }

  for (const p of homePlayers) {
    if (p.stats.fouls >= foulThreshold) {
      alerts.push({
        pid: p.id, name: p.name, number: p.number, type: 'negative',
        message: `#${p.number} ${p.name} — ${p.stats.fouls} faute${p.stats.fouls > 1 ? 's' : ''}`,
        value: p.stats.fouls,
      });
    }
  }

  return alerts;
}

// ─── AWARDS ─────────────────────────────────────────────────────
export function computeAwards(players) {
  const SE = typeof window !== 'undefined' && window.StatsEngine ? window.StatsEngine : null;
  const homePlayers = Object.values(players).filter(p => p.team === 'home' && p.stats.min > 0);
  if (!homePlayers.length) return [];

  const withMetrics = homePlayers.map(p => {
    const s = p.stats;
    const reb = s.oreb + s.dreb;
    const totalFGA = s.fga + s.fg3a;
    const totalFGM = s.fgm + s.fg3m;
    const minutes = s.min / 60;
    const eff = SE
      ? SE.EFF(s.pts, reb, s.ast, s.stl, s.blk, totalFGA, totalFGM, s.fta, s.ftm, s.tov)
      : s.pts + reb + s.ast + s.stl + s.blk - (totalFGA - totalFGM + (s.fta - s.ftm) + s.tov);
    const hustle = SE
      ? SE.hustleIndex(s.oreb, s.stl, s.blk, 0, minutes)
      : minutes > 0 ? ((s.oreb * 1.5 + s.stl * 1.2 + s.blk * 1.0) / minutes) * 36 : 0;
    const dis = SE
      ? SE.DIS(s.stl, s.blk, s.dreb, s.fouls, s.plusMinus)
      : s.stl * 2 + s.blk * 2 + s.dreb - s.fouls * 0.7 + s.plusMinus * 0.3;
    return { id: p.id, name: p.name, number: p.number, stats: s, eff, hustle, dis };
  });

  const best = (arr, key) => arr.reduce((a, b) => (key(a) >= key(b) ? a : b));

  const mvp = best(withMetrics, p => p.eff);
  const hustler = best(withMetrics, p => p.hustle);
  const pmKing = best(withMetrics, p => p.stats.plusMinus);
  const scorer = best(withMetrics, p => p.stats.pts);
  const passer = best(withMetrics, p => p.stats.ast);
  const defender = best(withMetrics, p => p.dis);

  return [
    { type: 'mvp', pid: mvp.id, name: mvp.name, number: mvp.number, stat: 'EFF', value: mvp.eff },
    { type: 'hustle', pid: hustler.id, name: hustler.name, number: hustler.number, stat: 'Hustle', value: Math.round(hustler.hustle * 10) / 10 },
    { type: 'plusMinus', pid: pmKing.id, name: pmKing.name, number: pmKing.number, stat: '+/-', value: pmKing.stats.plusMinus },
    { type: 'scorer', pid: scorer.id, name: scorer.name, number: scorer.number, stat: 'PTS', value: scorer.stats.pts },
    { type: 'passer', pid: passer.id, name: passer.name, number: passer.number, stat: 'AST', value: passer.stats.ast },
    { type: 'defender', pid: defender.id, name: defender.name, number: defender.number, stat: 'DIS', value: Math.round(defender.dis * 10) / 10 },
  ];
}

// ─── DISRUPTEUR ADVERSE ─────────────────────────────────────────
function computeDisruptor(players) {
  const SE = typeof window !== 'undefined' && window.StatsEngine ? window.StatsEngine : null;
  const awayPlayers = Object.values(players).filter(p => p.team === 'away' && p.stats.min > 0);
  if (!awayPlayers.length) return null;

  const withEff = awayPlayers.map(p => {
    const s = p.stats;
    const reb = s.oreb + s.dreb;
    const totalFGA = s.fga + s.fg3a;
    const totalFGM = s.fgm + s.fg3m;
    const eff = SE
      ? SE.EFF(s.pts, reb, s.ast, s.stl, s.blk, totalFGA, totalFGM, s.fta, s.ftm, s.tov)
      : s.pts + reb + s.ast + s.stl + s.blk - (totalFGA - totalFGM + (s.fta - s.ftm) + s.tov);
    return { pid: p.id, name: p.name, number: p.number, pts: s.pts, eff };
  });

  withEff.sort((a, b) => b.eff - a.eff);
  return withEff[0];
}

// ─── SCORE PAR QUART ────────────────────────────────────────────
function computeScoreByQuarter(actions, players, maxQ) {
  const qPts = {};
  for (let q = 1; q <= maxQ; q++) qPts[q] = { q, home: 0, away: 0 };

  for (const a of actions) {
    const p = players[a.pid];
    if (!p) continue;
    const q = a.q || 1;
    if (!qPts[q]) qPts[q] = { q, home: 0, away: 0 };
    if (a.type === 'SHOT' && a.made) qPts[q][p.team] += a.val;
    if (a.type === 'FT' && (a.ftMade || 0) > 0) qPts[q][p.team] += a.ftMade;
  }

  return Object.values(qPts);
}

// ─── GENERATE ───────────────────────────────────────────────────
export function generateReport(type, state) {
  const players = state.players;
  const actions = state.actions || [];
  const maxQ = Math.max(type === 'halftime' ? 2 : 4, state.match.quarter);
  const homePlayers = Object.values(players).filter(p => p.team === 'home');

  const teamStats = aggregateTeamStats(players);

  const awayPlayers = Object.values(players).filter(p => p.team === 'away');
  const oppDreb = awayPlayers.reduce((sum, p) => sum + p.stats.dreb, 0);
  const oppStats = { dreb: oppDreb };

  const impact = calcImpactStats(actions, homePlayers);
  const totalCost = impact.tovCost + impact.foulCost + impact.oppOrebCost;
  const totalGain = impact.stlGain + impact.orebGain + impact.lfGain;
  const net = totalGain - totalCost;

  const alerts = analyzeTeamAlerts(teamStats, oppStats);

  const totalFGA = teamStats.fga + teamStats.threePA;
  const SE = typeof window !== 'undefined' && window.StatsEngine ? window.StatsEngine : null;
  const poss = SE
    ? SE.possSimple(totalFGA, teamStats.fta, teamStats.tov, teamStats.oreb)
    : totalFGA + 0.44 * teamStats.fta + teamStats.tov - teamStats.oreb;
  const tovPct = poss > 0 ? Math.round((teamStats.tov / poss) * 100) : 0;

  const tone = computeTone(net, teamStats.fgPct, tovPct);
  const recommendations = generateRecommendations(alerts);
  const individualAlerts = analyzeIndividuals(players, type, impact.tovCost);
  const scoreByQuarter = computeScoreByQuarter(actions, players, maxQ);

  const report = {
    type,
    generatedAt: new Date().toISOString(),
    teamStats,
    scoreByQuarter,
    tone,
    recommendations,
    alerts,
    possession: { ...impact, totalCost, totalGain, net },
    individualAlerts,
  };

  if (type === 'final') {
    report.awards = computeAwards(players);
    report.disruptor = computeDisruptor(players);
  }

  return report;
}

// ─── ICONE TONE ─────────────────────────────────────────────────
const TONE_ICONS = {
  fire: '🔥',
  warning: '⚠️',
  snowflake: '❄️',
  balance: '⚖️',
};

const AWARD_ICONS = {
  mvp: '🏆',
  hustle: '💪',
  plusMinus: '📊',
  scorer: '🎯',
  passer: '🅰️',
  defender: '🛡️',
};

const AWARD_LABELS = {
  mvp: 'MVP',
  hustle: 'Travailleur de l\'ombre',
  plusMinus: 'Roi du +/-',
  scorer: 'Meilleur scoreur',
  passer: 'Meilleur passeur',
  defender: 'Meilleur defenseur',
};

// ─── RENDU HTML ─────────────────────────────────────────────────
function renderHTML(report) {
  const sc = report.scoreByQuarter;
  const ts = report.teamStats;
  const poss = report.possession;
  let html = '';

  // --- Score header ---
  html += '<div class="report-section">';
  html += '<div style="display:flex;gap:6px;margin-bottom:10px;">';
  sc.forEach(q => {
    const lbl = q.q <= 4 ? `Q${q.q}` : `OT${q.q - 4}`;
    html += `<div style="flex:1;text-align:center;background:var(--bg-4);border-radius:6px;padding:6px 4px;">` +
      `<div style="font-size:0.55rem;color:var(--text-muted);font-weight:700;">${lbl}</div>` +
      `<div style="font-size:0.9rem;font-weight:900;color:var(--home-color);">${q.home}</div>` +
      `<div style="font-size:0.9rem;font-weight:900;color:var(--away-color);">${q.away}</div></div>`;
  });
  const totalHome = sc.reduce((s, q) => s + q.home, 0);
  const totalAway = sc.reduce((s, q) => s + q.away, 0);
  html += `<div style="flex:1;text-align:center;background:var(--bg-3);border:1px solid var(--accent);border-radius:6px;padding:6px 4px;">` +
    `<div style="font-size:0.55rem;color:var(--accent);font-weight:700;">TOTAL</div>` +
    `<div style="font-size:0.9rem;font-weight:900;color:var(--home-color);">${totalHome}</div>` +
    `<div style="font-size:0.9rem;font-weight:900;color:var(--away-color);">${totalAway}</div></div>`;
  html += '</div></div>';

  // --- Tone ---
  html += `<div style="text-align:center;margin-bottom:12px;">` +
    `<span style="font-size:1.5rem;">${TONE_ICONS[report.tone.icon] || ''}</span> ` +
    `<span style="font-size:1rem;font-weight:800;color:var(--text-1);">${report.tone.label}</span></div>`;

  // --- Resume rapide (top 4 alerts) ---
  const topAlerts = report.alerts.slice(0, 4);
  if (topAlerts.length) {
    html += '<div class="report-section">';
    topAlerts.forEach(a => {
      const color = a.level === 'problem' ? '#ff4444' : '#22c55e';
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">` +
        `<span style="color:${color};font-size:0.9rem;">●</span>` +
        `<span style="color:var(--text-secondary);font-size:0.75rem;">${a.message}</span></div>`;
    });
    html += '</div>';
  }

  // --- Recommendations ---
  if (report.recommendations.length) {
    html += '<div class="report-section"><div class="report-title">Recommandations</div>';
    report.recommendations.forEach(r => {
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">` +
        `<span style="color:var(--accent);font-size:0.8rem;">→</span>` +
        `<span style="color:var(--text-secondary);font-size:0.75rem;">${r}</span></div>`;
    });
    html += '</div>';
  }

  // --- Stats globales ---
  html += '<div class="report-section"><div class="report-title">Stats equipe</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:0.7rem;">';
  const totalFGM = ts.fgm + ts.threePM;
  const totalFGA = ts.fga + ts.threePA;
  const statItems = [
    [`FG`, `${totalFGM}/${totalFGA} (${ts.fgPct}%)`],
    [`3PT`, `${ts.threePM}/${ts.threePA} (${ts.threePct}%)`],
    [`LF`, `${ts.ftm}/${ts.fta} (${ts.ftPct}%)`],
    [`REB`, `${ts.reb} (${ts.oreb}o + ${ts.dreb}d)`],
    [`PD`, `${ts.ast}`],
    [`BP`, `${ts.tov}`],
    [`INT`, `${ts.stl}`],
    [`CTR`, `${ts.blk}`],
    [`FTE`, `${ts.pf}`],
  ];
  statItems.forEach(([label, val]) => {
    html += `<div style="background:var(--bg-4);border-radius:6px;padding:6px 8px;text-align:center;">` +
      `<div style="font-size:0.55rem;color:var(--text-muted);font-weight:700;">${label}</div>` +
      `<div style="font-weight:800;color:var(--text-1);">${val}</div></div>`;
  });
  html += '</div></div>';

  // --- Bilan possession ---
  html += '<div class="report-section"><div class="report-title">Bilan possession</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.7rem;margin-bottom:8px;">';
  html += `<div><div style="color:#ff4444;font-weight:700;font-size:0.6rem;text-transform:uppercase;margin-bottom:4px;">Couts</div>` +
    `<div style="background:var(--bg-4);border-left:3px solid #ff4444;border-radius:0 6px 6px 0;padding:4px 8px;margin-bottom:2px;">BP: ${poss.tovCost} pts</div>` +
    `<div style="background:var(--bg-4);border-left:3px solid #ff4444;border-radius:0 6px 6px 0;padding:4px 8px;margin-bottom:2px;">Fautes: ${poss.foulCost} pts</div>` +
    `<div style="background:var(--bg-4);border-left:3px solid #ff4444;border-radius:0 6px 6px 0;padding:4px 8px;">RO adv: ${poss.oppOrebCost} pts</div></div>`;
  html += `<div><div style="color:#22c55e;font-weight:700;font-size:0.6rem;text-transform:uppercase;margin-bottom:4px;">Gains</div>` +
    `<div style="background:var(--bg-4);border-left:3px solid #22c55e;border-radius:0 6px 6px 0;padding:4px 8px;margin-bottom:2px;">INT: ${poss.stlGain} pts</div>` +
    `<div style="background:var(--bg-4);border-left:3px solid #22c55e;border-radius:0 6px 6px 0;padding:4px 8px;margin-bottom:2px;">2e chance: ${poss.orebGain} pts</div>` +
    `<div style="background:var(--bg-4);border-left:3px solid #22c55e;border-radius:0 6px 6px 0;padding:4px 8px;">LF: ${poss.lfGain} pts</div></div>`;
  html += '</div>';
  const netColor = poss.net > 0 ? '#22c55e' : poss.net < 0 ? '#ff4444' : 'var(--text-muted)';
  const netBg = poss.net > 0 ? 'rgba(34,197,94,0.1)' : poss.net < 0 ? 'rgba(255,68,68,0.1)' : 'var(--bg-4)';
  html += `<div style="display:flex;justify-content:space-between;align-items:center;background:${netBg};border-radius:6px;padding:8px 12px;">` +
    `<span style="font-size:0.65rem;color:var(--text-muted);">${poss.totalCost} concedes</span>` +
    `<span style="font-size:1rem;font-weight:900;color:${netColor};">${poss.net >= 0 ? '+' : ''}${poss.net} pts</span>` +
    `<span style="font-size:0.65rem;color:var(--text-muted);">${poss.totalGain} recuperes</span></div>`;
  html += '</div>';

  // --- Analyse individuelle ---
  if (report.individualAlerts.length) {
    html += '<div class="report-section"><div class="report-title">Joueurs</div>';
    report.individualAlerts.forEach(a => {
      const color = a.type === 'positive' ? '#22c55e' : '#ff4444';
      const borderColor = a.type === 'positive' ? '#22c55e' : '#ff4444';
      html += `<div style="background:var(--bg-4);border-left:3px solid ${borderColor};border-radius:0 6px 6px 0;padding:6px 10px;margin-bottom:4px;">` +
        `<div style="font-size:0.75rem;font-weight:700;color:${color};">${a.message}</div>`;
      if (a.impactDetail) {
        html += `<div style="font-size:0.65rem;color:var(--text-muted);">${a.impactDetail}</div>`;
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // --- Awards (final only) ---
  if (report.awards && report.awards.length) {
    html += '<div class="report-section"><div class="report-title">Awards</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">';
    report.awards.forEach(a => {
      html += `<div style="background:var(--bg-4);border-radius:8px;padding:10px;text-align:center;">` +
        `<div style="font-size:1.2rem;">${AWARD_ICONS[a.type] || '🏅'}</div>` +
        `<div style="font-size:0.55rem;color:var(--text-muted);">${AWARD_LABELS[a.type] || a.type}</div>` +
        `<div style="font-size:0.8rem;font-weight:800;color:var(--text-1);">#${a.number} ${a.name}</div>` +
        `<div style="font-size:0.65rem;color:var(--accent);">${a.stat} ${a.value > 0 && a.stat === '+/-' ? '+' : ''}${a.value}</div></div>`;
    });
    html += '</div></div>';
  }

  // --- Disruptor (final only) ---
  if (report.disruptor) {
    const d = report.disruptor;
    html += '<div class="report-section"><div class="report-title" style="color:var(--away-color);">Perturbateur adverse (scouting)</div>';
    html += `<div style="font-size:0.75rem;color:var(--text-secondary);">#${d.number} ${d.name} — ${d.pts} pts — EFF ${d.eff > 0 ? '+' : ''}${d.eff}</div>`;
    html += '</div>';
  }

  return html;
}

// ─── FACTORY (expose sur window) ────────────────────────────────
export function createCoachReport() {
  return {
    show(type) {
      const State = window.LiveState;
      const live = window._live || {};
      if (live.UI) live.UI.closeModal();

      const reportType = type || (State.match.quarter <= 2 ? 'halftime' : 'final');
      const report = generateReport(reportType, State);
      const html = renderHTML(report);

      document.getElementById('coachReportBody').innerHTML = html;

      // Add action buttons at bottom
      let buttonsHTML = '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px;padding-bottom:20px;">';
      buttonsHTML += '<button onclick="CoachReport.hide()" class="btn-mod" style="background:var(--bg-4);border:1px solid var(--border);color:var(--text-secondary);padding:8px 16px;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;">← Retour aux stats</button>';

      if (reportType === 'halftime') {
        const nextQ = State.match.quarter + 1;
        buttonsHTML += `<button onclick="CoachReport.hide(); GameEngine.startNextQuarter(${nextQ})" class="btn-mod success" style="background:var(--accent);border:none;color:white;padding:8px 16px;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;">Commencer Q${nextQ} →</button>`;
      } else {
        buttonsHTML += '<button onclick="CoachReport.hide(); GameEngine.startOT()" class="btn-mod" style="background:var(--bg-4);border:1px solid var(--border);color:var(--text-secondary);padding:8px 16px;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;">Prolongation (5 min)</button>';
        buttonsHTML += '<button onclick="CoachReport.hide(); GameEngine.saveToFirebase()" class="btn-mod success" style="background:#22c55e;border:none;color:white;padding:8px 16px;border-radius:8px;font-size:0.75rem;font-weight:700;cursor:pointer;">Sauvegarder</button>';
      }
      buttonsHTML += '</div>';

      document.getElementById('coachReportBody').innerHTML += buttonsHTML;
      document.getElementById('coachReport').classList.add('show');

      // Store last report for saveToFirebase
      this._lastReport = report;
    },
    hide() {
      document.getElementById('coachReport').classList.remove('show');
    },
    getLastReport() {
      return this._lastReport || null;
    },
  };
}

export { THRESHOLDS };
