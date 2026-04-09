import React, { useState, useMemo } from 'react';
import { useUIStore } from './src/stores/ui-store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { generateReport } from './src/live/coach-report.js';

function recalcMinutes(actions, starters, maxQ) {
  const playTime = {};
  const QT_DUR = 600;
  for (let q = 1; q <= maxQ; q++) {
    const starterIds = (starters[q] || []).map((id) => String(parseInt(id)));
    const onCourt = new Set(starterIds);
    starterIds.forEach((pid) => {
      if (playTime[pid] === undefined) playTime[pid] = 0;
    });

    const qSubs = actions
      .filter((a) => (a.q || 1) === q && a.type === 'SUB' && parseInt(a.pid ?? a.playerId) < 1000)
      .map((a) => ({ ...a, time: a.time || 0 }))
      .sort((a, b) => b.time - a.time);

    let lastTime = QT_DUR;
    qSubs.forEach((sub) => {
      const duration = lastTime - sub.time;
      if (duration > 0) {
        onCourt.forEach((pid) => {
          if (playTime[pid] === undefined) playTime[pid] = 0;
          playTime[pid] += duration;
        });
      }
      const { outId, inId } = window.normalizeSub(sub);
      if (outId) onCourt.delete(outId);
      if (inId) {
        onCourt.add(inId);
        if (playTime[inId] === undefined) playTime[inId] = 0;
      }
      lastTime = sub.time;
    });
    if (lastTime > 0) {
      onCourt.forEach((pid) => {
        if (playTime[pid] === undefined) playTime[pid] = 0;
        playTime[pid] += lastTime;
      });
    }
  }
  const result = {};
  Object.entries(playTime).forEach(([pid, sec]) => {
    result[pid] = Math.round(sec / 60);
  });
  return result;
}

function CoachReportPanel({ game, players }) {
  const report = React.useMemo(() => {
    if (game.coachReport) return game.coachReport;
    if (!game.actions?.length) return null;

    const statePlayers = {};
    for (const [pid, ps] of Object.entries(game.playerStats || {})) {
      const player = players.find((p) => String(p.id) === String(pid));
      statePlayers[pid] = {
        id: Number(pid),
        team: 'home',
        name: player?.name || `#${pid}`,
        number: player?.number || pid,
        stats: {
          pts: ps.pts || 0,
          fga: ps.fga || 0,
          fgm: ps.fgm || 0,
          fg3a: ps.threePA || 0,
          fg3m: ps.threePM || 0,
          fta: ps.fta || 0,
          ftm: ps.ftm || 0,
          oreb: ps.oreb || 0,
          dreb: ps.dreb || 0,
          ast: ps.ast || 0,
          stl: ps.stl || 0,
          blk: ps.blk || 0,
          tov: ps.tov || 0,
          fouls: ps.pf || 0,
          plusMinus: ps.plusMinus || 0,
          min: (ps.minutes || 0) * 60,
          foulDrawn: ps.foulDrawn || 0,
        },
      };
    }
    for (const [pid, ps] of Object.entries(game.opponentPlayerStats || {})) {
      statePlayers[pid] = {
        id: Number(pid),
        team: 'away',
        name: ps.name || `#${pid}`,
        number: ps.number || pid,
        stats: {
          pts: ps.pts || 0,
          fga: ps.fga || 0,
          fgm: ps.fgm || 0,
          fg3a: ps.threePA || 0,
          fg3m: ps.threePM || 0,
          fta: ps.fta || 0,
          ftm: ps.ftm || 0,
          oreb: ps.oreb || 0,
          dreb: ps.dreb || 0,
          ast: ps.ast || 0,
          stl: ps.stl || 0,
          blk: ps.blk || 0,
          tov: ps.tov || 0,
          fouls: ps.pf || 0,
          plusMinus: ps.plusMinus || 0,
          min: (ps.minutes || 0) * 60,
          foulDrawn: ps.foulDrawn || 0,
        },
      };
    }
    const state = {
      players: statePlayers,
      actions: game.actions,
      scoreHistory: game.scoreHistory || [],
      match: { quarter: 4, date: game.date, opponent: game.opponent },
      starters: game.starters || {},
      teamFouls: game.teamFouls || { home: [], away: [] },
    };
    return generateReport('final', state);
  }, [game, players]);

  if (!report) return null;

  const ts = report.teamStats;
  const poss = report.possession;
  const totalFGM = ts.fgm + ts.threePM;
  const totalFGA = ts.fga + ts.threePA;

  // Phase 1: quarter breakdown
  const totalHome = report.scoreByQuarter.reduce((s, q) => s + q.home, 0);
  const totalAway = report.scoreByQuarter.reduce((s, q) => s + q.away, 0);
  const quarterDiffs = report.scoreByQuarter.map((q) => q.home - q.away);
  const bestQDiff = Math.max(...quarterDiffs);
  const worstQDiff = Math.min(...quarterDiffs);

  // Phase 2: indicator cards
  const possCount = totalFGA + 0.44 * ts.fta + ts.tov - ts.oreb;
  const tovPct = possCount > 0 ? Math.round((ts.tov / possCount) * 100) : 0;
  const oppDreb = Object.values(game.opponentPlayerStats || {}).reduce(
    (s, p) => s + (p.dreb || 0),
    0
  );
  const orebPct =
    ts.oreb + oppDreb > 0 ? Math.round((ts.oreb / (ts.oreb + oppDreb)) * 100) : 0;
  const indicators = [
    {
      key: 'ftPct',
      label: 'FT%',
      value: ts.ftPct,
      unit: '%',
      level: ts.ftPct >= 78 ? 'good' : ts.ftPct <= 60 ? 'bad' : 'warn',
      gaugePct: Math.min(100, ts.ftPct),
    },
    {
      key: 'tovPct',
      label: 'TOV%',
      value: tovPct,
      unit: '%',
      level: tovPct <= 12 ? 'good' : tovPct >= 18 ? 'bad' : 'warn',
      gaugePct: Math.max(0, 100 - (tovPct / 25) * 100),
    },
    {
      key: 'fouls',
      label: 'Fautes',
      value: ts.pf,
      unit: '',
      level: ts.pf <= 4 ? 'good' : ts.pf >= 8 ? 'bad' : 'warn',
      gaugePct: Math.max(0, 100 - (ts.pf / 12) * 100),
    },
    {
      key: 'orebPct',
      label: 'OREB%',
      value: orebPct,
      unit: '%',
      level: orebPct >= 35 ? 'good' : orebPct <= 20 ? 'bad' : 'warn',
      gaugePct: Math.min(100, (orebPct / 50) * 100),
    },
  ];

  // Phase 5: tug-of-war percentages
  const tugTotal = poss.totalCost + poss.totalGain;
  const costPct = tugTotal > 0 ? (poss.totalCost / tugTotal) * 100 : 50;
  const gainPct = tugTotal > 0 ? (poss.totalGain / tugTotal) * 100 : 50;

  // Phase 6: players split
  const positiveAlerts = report.individualAlerts.filter((a) => a.type === 'positive');
  const negativeAlerts = report.individualAlerts.filter((a) => a.type === 'negative');

  const TONE_ICONS = {
    fire: '\u{1F525}',
    warning: '\u26A0\uFE0F',
    snowflake: '\u2744\uFE0F',
    balance: '\u2696\uFE0F',
  };
  const AWARD_ICONS = {
    mvp: '\u{1F3C6}',
    hustle: '\u{1F4AA}',
    plusMinus: '\u{1F4CA}',
    scorer: '\u{1F3AF}',
    passer: '\u{1F170}\uFE0F',
    defender: '\u{1F6E1}\uFE0F',
  };
  const AWARD_LABELS = {
    mvp: 'MVP',
    hustle: "Travailleur de l'ombre",
    plusMinus: 'Roi du +/-',
    scorer: 'Meilleur scoreur',
    passer: 'Meilleur passeur',
    defender: 'Meilleur defenseur',
  };

  return (
    <div className="space-y-4">
      {/* Tone */}
      <div className="text-center py-2">
        <span className="text-2xl">{TONE_ICONS[report.tone.icon] || ''}</span>{' '}
        <span className="text-lg font-extrabold text-white">{report.tone.label}</span>
      </div>

      {/* Phase 1 — Score & Quarter Breakdown */}
      <div>
        <div className="text-center mb-2">
          <span className="mr-score-final">{totalHome} — {totalAway}</span>
        </div>
        <div className="flex gap-1 mb-2" style={{ height: '10px' }}>
          {report.scoreByQuarter.map((q, i) => (
            <div
              key={q.q}
              className="flex-1 rounded"
              style={{
                backgroundColor:
                  quarterDiffs[i] > 0 && quarterDiffs[i] === bestQDiff
                    ? 'var(--accent)'
                    : quarterDiffs[i] < 0 && quarterDiffs[i] === worstQDiff
                    ? 'rgba(239,68,68,0.3)'
                    : 'var(--bg-4)',
              }}
            />
          ))}
        </div>
        <div className="flex gap-1">
          {report.scoreByQuarter.map((q) => (
            <div key={q.q} className="flex-1 text-center">
              <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-3)' }}>
                {q.q <= 4 ? `Q${q.q}` : `OT${q.q - 4}`}
              </div>
              <div className="text-[11px] font-extrabold" style={{ color: 'var(--home)' }}>
                {q.home}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                {q.away}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase 2 — Indicator Cards */}
      <div className="grid grid-cols-2 gap-2">
        {indicators.map((ind) => (
          <div
            key={ind.key}
            className="mr-indicator-card"
            style={{
              backgroundColor:
                ind.level === 'good'
                  ? 'rgba(52,211,153,0.10)'
                  : ind.level === 'bad'
                  ? 'rgba(248,113,113,0.10)'
                  : 'rgba(249,115,22,0.10)',
            }}
          >
            <div
              className="mr-indicator-value"
              style={{
                color:
                  ind.level === 'good'
                    ? 'var(--made)'
                    : ind.level === 'bad'
                    ? 'var(--miss)'
                    : 'var(--accent)',
              }}
            >
              {ind.value}{ind.unit}
            </div>
            <div className="mr-indicator-label">{ind.label}</div>
            <div className="sc-stat-bar-bg">
              <div
                className="sc-stat-bar-fill"
                style={{
                  width: `${ind.gaugePct}%`,
                  backgroundColor:
                    ind.level === 'good'
                      ? 'var(--made)'
                      : ind.level === 'bad'
                      ? 'var(--miss)'
                      : 'var(--accent)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Phase 3 — Recommandations */}
      {report.recommendations.length > 0 && (
        <div className="mr-callout">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: '1rem' }}>💡</span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--accent)' }}
            >
              Recommandations
            </span>
          </div>
          {report.recommendations.map((r, i) => (
            <div key={i} className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Phase 4 — Stats Equipe */}
      <window.Card className="p-3">
        <div className="sc-section-label mb-2">Stats equipe</div>
        <div className="flex gap-0">
          {/* Tir */}
          <div className="flex-1 flex flex-col px-1">
            <div
              className="text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--accent)' }}
            >
              Tir
            </div>
            {[
              { label: 'FG', value: `${totalFGM}/${totalFGA}`, pct: ts.fgPct, max: 65 },
              { label: '3PT', value: `${ts.threePM}/${ts.threePA}`, pct: ts.threePct, max: 50 },
              { label: 'LF', value: `${ts.ftm}/${ts.fta}`, pct: ts.ftPct, max: 100 },
            ].map(({ label, value, pct, max }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>
                    {label}
                  </span>
                  <span className="text-[10px] font-extrabold" style={{ color: 'var(--text-1)' }}>
                    {value}
                  </span>
                </div>
                <div className="text-[9px] text-right mb-1" style={{ color: 'var(--text-3)' }}>
                  {pct}%
                </div>
                <div className="sc-stat-bar-bg">
                  <div
                    className="sc-stat-bar-fill"
                    style={{ width: `${Math.min(100, (pct / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mr-stat-divider" />

          {/* Reb / PD */}
          <div className="flex-1 flex flex-col px-1">
            <div
              className="text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--data)' }}
            >
              Reb/PD
            </div>
            {[
              { label: 'REB', value: ts.reb, sub: `${ts.oreb}o+${ts.dreb}d`, pct: ts.reb, max: 55 },
              { label: 'PD', value: ts.ast, sub: '', pct: ts.ast, max: 30 },
              { label: 'INT', value: ts.stl, sub: '', pct: ts.stl, max: 15 },
            ].map(({ label, value, sub, pct, max }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>
                    {label}
                  </span>
                  <span className="text-[10px] font-extrabold" style={{ color: 'var(--text-1)' }}>
                    {value}
                  </span>
                </div>
                <div className="text-[9px] text-right mb-1" style={{ color: 'var(--text-3)' }}>
                  {sub || '\u00A0'}
                </div>
                <div className="sc-stat-bar-bg">
                  <div
                    className="sc-stat-bar-fill"
                    style={{
                      width: `${Math.min(100, (pct / max) * 100)}%`,
                      backgroundColor: 'var(--data)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mr-stat-divider" />

          {/* BP / Fautes */}
          <div className="flex-1 flex flex-col px-1">
            <div
              className="text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--miss)' }}
            >
              BP/Fts
            </div>
            {[
              { label: 'BP', value: ts.tov, pct: Math.max(0, 15 - ts.tov), max: 15 },
              { label: 'FTE', value: ts.pf, pct: Math.max(0, 15 - ts.pf), max: 15 },
              { label: 'CTR', value: ts.blk, pct: ts.blk, max: 10 },
            ].map(({ label, value, pct, max }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>
                    {label}
                  </span>
                  <span className="text-[10px] font-extrabold" style={{ color: 'var(--text-1)' }}>
                    {value}
                  </span>
                </div>
                <div className="mb-1">&nbsp;</div>
                <div className="sc-stat-bar-bg">
                  <div
                    className="sc-stat-bar-fill"
                    style={{
                      width: `${Math.min(100, (pct / max) * 100)}%`,
                      backgroundColor: 'var(--miss)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </window.Card>

      {/* Phase 5 — Bilan possession */}
      <window.Card className="p-3">
        <div className="sc-section-label mb-3">Bilan possession</div>
        {/* Tug-of-war bar */}
        <div className="mr-tug-of-war mb-4" style={{ backgroundColor: 'var(--bg-4)' }}>
          <div
            style={{
              width: `${costPct}%`,
              backgroundColor: 'rgba(248,113,113,0.50)',
              borderRadius: '9999px 0 0 9999px',
            }}
          />
          <div
            style={{
              width: `${gainPct}%`,
              backgroundColor: 'rgba(52,211,153,0.50)',
              borderRadius: '0 9999px 9999px 0',
            }}
          />
          <div
            className="mr-tug-badge"
            style={{
              color:
                poss.net > 0 ? 'var(--made)' : poss.net < 0 ? 'var(--miss)' : 'var(--text-3)',
            }}
          >
            {poss.net >= 0 ? '+' : ''}
            {poss.net} pts
          </div>
        </div>
        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--miss)' }}
            >
              ↙ Coûts ({poss.totalCost} pts)
            </div>
            {[
              { icon: '💸', label: 'Pertes', value: poss.tovCost },
              { icon: '🚫', label: 'Fautes', value: poss.foulCost },
              { icon: '🔄', label: 'RO adv', value: poss.oppOrebCost },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex justify-between items-center py-0.5">
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {icon} {label}
                </span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--miss)' }}>
                  -{value}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--made)' }}
            >
              Gains ({poss.totalGain} pts) ↗
            </div>
            {[
              { icon: '✊', label: 'Interceptions', value: poss.stlGain },
              { icon: '💪', label: '2e chance', value: poss.orebGain },
              { icon: '🎯', label: 'LF gagnés', value: poss.lfGain },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex justify-between items-center py-0.5">
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {icon} {label}
                </span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--made)' }}>
                  +{value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </window.Card>

      {/* Phase 6 — Joueurs */}
      {report.individualAlerts.length > 0 && (
        <window.Card className="p-3">
          <div className="sc-section-label mb-2">Joueurs</div>

          {positiveAlerts.length > 0 && (
            <>
              <div
                className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--made)' }}
              >
                ▲ Performances
              </div>
              {positiveAlerts.map((a, i) => (
                <div key={i} className="mr-player-card mr-player-card--positive">
                  <div className="text-xs font-bold" style={{ color: 'var(--made)' }}>
                    {a.message}
                  </div>
                  {a.impactDetail && (
                    <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {a.impactDetail}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {positiveAlerts.length > 0 && negativeAlerts.length > 0 && (
            <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />
          )}

          {negativeAlerts.length > 0 && (
            <>
              <div
                className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--miss)' }}
              >
                ▼ À surveiller
              </div>
              {negativeAlerts.map((a, i) => (
                <div key={i} className="mr-player-card mr-player-card--negative">
                  <div className="text-xs font-bold" style={{ color: 'var(--miss)' }}>
                    {a.message}
                  </div>
                  {a.impactDetail && (
                    <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {a.impactDetail}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </window.Card>
      )}

      {/* Phase 7 — Awards */}
      {report.awards?.length > 0 && (
        <window.Card className="p-3">
          <div className="sc-section-label mb-2">Awards</div>
          <div className="flex flex-wrap gap-2">
            {report.awards.map((a) => (
              <div key={a.type} className="mr-award-card">
                <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-3)' }}>
                  {AWARD_LABELS[a.type] || a.type}
                </div>
                <div className="mr-award-icon">{AWARD_ICONS[a.type] || '\u{1F3C5}'}</div>
                <div className="text-xs font-extrabold" style={{ color: 'var(--text-1)' }}>
                  #{a.number} {a.name}
                </div>
                <div className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                  {a.stat} {a.value > 0 && a.stat === '+/-' ? '+' : ''}
                  {a.value}
                </div>
              </div>
            ))}
          </div>
        </window.Card>
      )}

      {/* Phase 8 — Perturbateur Adverse */}
      {report.disruptor && (
        <div className="mr-disruptor-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="mr-disruptor-badge">⚠ Perturbateur Adverse</span>
          </div>
          <div className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
            #{report.disruptor.number} {report.disruptor.name}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--miss)' }}>
            {report.disruptor.pts} pts —{' '}
            EFF {report.disruptor.eff > 0 ? '+' : ''}{report.disruptor.eff}
          </div>
        </div>
      )}
    </div>
  );
}

const calculateAverageMinutes = (playerStats) => {
  const active = Object.values(playerStats).filter((s) => (s.minutes || 0) > 0);
  if (active.length === 0) return 20;
  return active.reduce((sum, s) => sum + (s.minutes || 0), 0) / active.length;
};

const _isHomePlayer = (pid, homePlayers) => homePlayers.some((p) => p.id === pid);

const _reconstructScoreAtIndex = (actions, idx, homePlayers) => {
  let home = 0,
    away = 0;
  for (let i = 0; i <= idx; i++) {
    const a = actions[i];
    if (!a) continue;
    const isHome = _isHomePlayer(a.pid, homePlayers);
    if (a.type === 'SHOT' && a.made) {
      if (isHome) home += a.val;
      else away += a.val;
    }
    if (a.type === 'FT' && (a.ftMade || 0) > 0) {
      if (isHome) home += a.ftMade;
      else away += a.ftMade;
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
    quarters = [4, 5], // Q4 + OT
    timeWindow = 120, // 2 dernières minutes (secondes)
    maxDiff = 5, // écart max au score
  } = options;

  const clutchActions = [];

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (!quarters.includes(a.q)) continue;
    if (a.time === undefined || a.time > timeWindow) continue;

    // Score AVANT cette action
    const score =
      i > 0 ? _reconstructScoreAtIndex(actions, i - 1, homePlayers) : { home: 0, away: 0, diff: 0 };
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

  const pa = clutchActions.filter((a) => a.pid === playerId);
  if (!pa.length) return null;

  let pts = 0,
    totalFga = 0,
    totalFgm = 0,
    fta = 0,
    ftm = 0,
    tov = 0,
    ast = 0;
  let threePA = 0,
    threePM = 0;

  pa.forEach((a) => {
    if (_isFieldGoalAttempt(a)) {
      totalFga++;
      if (_isThreePointAttempt(a)) threePA++;
      if (_isFieldGoalMade(a)) {
        totalFgm++;
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
    if (a.type === 'OREB' || a.type === 'DREB') {
      /* pas comptés ici */
    }
    if (a.astId === playerId || (a.type === 'SHOT' && a.made && a.astId === playerId)) {
      // L'assist est loggué sur l'action du tireur avec astId
    }
  });

  // Compter les assists : le playerId apparaît comme astId sur des tirs réussis
  clutchActions.forEach((a) => {
    if (a.astId === playerId && _isFieldGoalMade(a)) ast++;
  });

  return {
    pts,
    fga: totalFga,
    fgm: totalFgm,
    fgPct: totalFga > 0 ? Math.round((totalFgm / totalFga) * 100) : 0,
    threePA,
    threePM,
    threePct: threePA > 0 ? Math.round((threePM / threePA) * 100) : 0,
    fta,
    ftm,
    ftPct: fta > 0 ? Math.round((ftm / fta) * 100) : 0,
    tov,
    ast,
    actions: pa.length,
  };
};

/**
 * Clutch Rating simplifié :
 * (PTS * 1.5 + AST * 1.2 - TOV * 1.5) / actions clutch, normalisé 0-100
 */
const calcClutchRating = (clutchStats) => {
  if (!clutchStats || !clutchStats.actions) return 0;
  const raw =
    (clutchStats.pts * 1.5 + clutchStats.ast * 1.2 - clutchStats.tov * 1.5) / clutchStats.actions;
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

  const homeIds = new Set(homePlayers.map((p) => p.id));
  const segments = { on: [], off: [] };

  actions.forEach((a) => {
    if (!a.onCourt) return;
    segments[a.onCourt.includes(playerId) ? 'on' : 'off'].push(a);
  });

  const calcSegment = (segActions) => {
    let pts = 0,
      ptsConceded = 0;
    let totalFga = 0,
      totalFgm = 0,
      fta = 0,
      tov = 0,
      orb = 0;
    let oppFga = 0,
      oppFgm = 0,
      oppFta = 0,
      oppTov = 0,
      oppOrb = 0;
    let playerStl = 0,
      playerBlk = 0,
      playerDreb = 0,
      playerPf = 0;
    let playerFga = 0,
      playerFgm = 0,
      playerFta = 0,
      playerTov = 0,
      playerAst = 0;

    segActions.forEach((a) => {
      const isHome = homeIds.has(a.pid);
      const isPlayer = a.pid === playerId;

      if (a.type === 'SHOT') {
        if (isHome) {
          totalFga++;
          if (a.made) {
            totalFgm++;
            pts += a.val;
          }
          if (isPlayer) {
            playerFga++;
            if (a.made) playerFgm++;
          }
        } else {
          oppFga++;
          if (a.made) {
            oppFgm++;
            ptsConceded += a.val;
          }
        }
      }
      if (a.type === 'FT') {
        if (isHome) {
          fta += a.ftAtt || 0;
          pts += a.ftMade || 0;
          if (isPlayer) playerFta += a.ftAtt || 0;
        } else {
          oppFta += a.ftAtt || 0;
          ptsConceded += a.ftMade || 0;
        }
      }
      if (a.type === 'TOV') {
        if (isHome) {
          tov++;
          if (isPlayer) playerTov++;
        } else oppTov++;
      }
      if (a.type === 'OREB') {
        if (isHome) orb++;
        else oppOrb++;
      }
      if (a.type === 'DREB') {
        if (isHome && isPlayer) playerDreb++;
      }
      if (a.type === 'STL') {
        if (isHome && isPlayer) playerStl++;
      }
      if (a.type === 'BLK') {
        if (isHome && isPlayer) playerBlk++;
      }
      if (a.type === 'FOUL') {
        if (isHome && isPlayer) playerPf++;
      }
      if (a.astId === playerId && a.type === 'SHOT' && a.made) playerAst++;
    });

    const poss = Math.max(window.StatsEngine.possSimple(totalFga, fta, tov, orb), 1);
    const oppPoss = Math.max(window.StatsEngine.possSimple(oppFga, oppFta, oppTov, oppOrb), 1);
    const avgPoss = (poss + oppPoss) / 2 || 1;

    const ortg = Math.round((pts / avgPoss) * 100);
    const baseDrtg = Math.round((ptsConceded / avgPoss) * 100);

    const defContrib =
      avgPoss > 0 ? ((playerStl * 1.8 + playerBlk * 1.2 + playerDreb * 0.4) / avgPoss) * 100 : 0;
    const defPenalty = avgPoss > 0 ? ((playerPf * 0.7) / avgPoss) * 100 : 0;
    const oppFgPct = oppFga > 0 ? oppFgm / oppFga : 0.42;
    const oppContestAdj = (oppFgPct - 0.42) * 30;
    const dpr = Math.max(0, Math.round(baseDrtg - defContrib + defPenalty + oppContestAdj));

    const playerPoss = playerFga + 0.44 * playerFta + playerTov;
    const usageRate = Math.round((playerPoss / avgPoss) * 100);

    // Nombre total d'actions individuelles du joueur dans ce segment
    const playerActions =
      playerFga + playerAst + playerStl + playerBlk + playerDreb + playerTov + playerPf;
    const involvementRate = avgPoss > 0 ? playerActions / avgPoss : 0;

    return {
      pts,
      ptsConceded,
      poss: Math.round(avgPoss),
      ortg,
      drtg: baseDrtg,
      dpr,
      defContrib: Math.round(defContrib * 10) / 10,
      defPenalty: Math.round(defPenalty * 10) / 10,
      oppFgPct: Math.round(oppFgPct * 100),
      playerStl,
      playerBlk,
      playerDreb,
      playerPf,
      playerFga,
      playerFgm,
      playerTov,
      playerAst,
      usageRate,
      playerActions,
      involvementRate,
      actions: segActions.length,
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
  const K_on = K_BASE / (1 + on.involvementRate * 2);
  const K_off = K_BASE / (1 + off.involvementRate * 2);

  const weightON = on.poss / (on.poss + K_on);
  const weightOFF = off.poss / (off.poss + K_off);

  const netOn = Math.round(netOn_raw * weightON);
  const netOff = Math.round(netOff_raw * weightOFF);
  const netDiff = Math.round(netDiff_raw * weightON);

  return {
    on,
    off,
    netOn,
    netOff,
    netDiff,
    netOn_raw: Math.round(netOn_raw),
    netOff_raw: Math.round(netOff_raw),
    netDiff_raw: Math.round(netDiff_raw),
    weightON: Math.round(weightON * 100),
    weightOFF: Math.round(weightOFF * 100),
    K_on: Math.round(K_on * 10) / 10,
    K_off: Math.round(K_off * 10) / 10,
    usageRate: on.usageRate,
  };
};
function MomentumChart({ scoreHistory, actions, players: matchPlayers, game }) {
  const [highlightPid, setHighlightPid] = useState(null);

  const getPlayerName = (id) => {
    const p = (matchPlayers || []).find((p) => p.id === id);
    return p ? `#${p.number} ${p.name}` : `#${id}`;
  };

  const homePlayers = (matchPlayers || []).filter((p) => p.id < 1000);

  const chartData = useMemo(() => {
    // --- Fallback : reconstruire scoreHistory depuis actions ---
    let history = scoreHistory;
    if ((!history || history.length < 2) && actions && actions.length > 0) {
      history = buildScoreHistoryFromActions(actions, matchPlayers || []);
    }
    if (!history || history.length === 0) return { data: [], runs: [] };

    const qLen = game?.quarterLength || game?.qLength || 600; // secondes par défaut

    const timeline = history.map((sh, i) => {
      const q = sh.q || 1;
      const minute =
        sh.time != null ? Math.round(((q - 1) * qLen + (qLen - sh.time)) / 6) / 10 : i * 0.5; // Fallback si pas de chrono

      return {
        idx: i,
        time: sh.time != null ? sh.time : i,
        q: q,
        minute: minute,
        diff: (sh.home || 0) - (sh.away || 0),
        home: sh.home || 0,
        away: sh.away || 0,
        label: sh.q ? `Q${sh.q}` : `#${i}`,
        onCourt: sh.onCourt ?? null,
      };
    });

    // --- Détection des runs (>=6 pts consécutifs sans réponse) ---
    const runs = window.detectRuns(history, matchPlayers || []);

    return { data: timeline, runs };
  }, [scoreHistory, actions, matchPlayers, game]);

  const playerSegments = useMemo(() => {
    if (highlightPid === null || !chartData.data.length) return [];
    const segments = [];
    let segStart = null;
    chartData.data.forEach((pt) => {
      const isOnCourt = Array.isArray(pt.onCourt) && pt.onCourt.includes(highlightPid);
      if (isOnCourt && segStart === null) segStart = pt.minute;
      if (!isOnCourt && segStart !== null) {
        segments.push({ x1: segStart, x2: pt.minute });
        segStart = null;
      }
    });
    if (segStart !== null) {
      segments.push({ x1: segStart, x2: chartData.data[chartData.data.length - 1].minute });
    }
    return segments;
  }, [chartData.data, highlightPid]);

  if (!chartData.data.length) return null;

  const maxAbs = Math.max(10, ...chartData.data.map((d) => Math.abs(d.diff)));

  return (
    <div>
      <h4 className="text-sm text-blue-400 uppercase font-bold mb-2 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Momentum
      </h4>
      {chartData.runs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {chartData.runs.map((r, i) => (
            <span
              key={i}
              className={`px-2 py-1 rounded text-[10px] font-bold ${
                r.team === 'home' ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'
              }`}
            >
              {r.text}
            </span>
          ))}
        </div>
      )}
      {homePlayers.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-500">Surligner :</span>
          <select
            className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 rounded px-1 py-0.5"
            value={highlightPid ?? ''}
            onChange={(e) => setHighlightPid(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— joueur —</option>
            {homePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.number} {p.name}
              </option>
            ))}
          </select>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis
              dataKey="minute"
              type="number"
              domain={[0, 'auto']}
              stroke="#a0a0b0"
              fontSize={10}
              tickFormatter={(m) => `${Math.floor(m)}'`}
              ticks={(() => {
                const qLen = game?.quarterLength || game?.qLength || 600;
                const qMin = qLen / 60;
                const maxQ = Math.max(...(chartData.data || []).map((h) => h.q || 1), 4);
                return Array.from({ length: maxQ }, (_, i) => (i + 1) * qMin);
              })()}
            />
            {(() => {
              const qLen = game?.quarterLength || game?.qLength || 600;
              const maxQ = Math.max(...(chartData.data || []).map((h) => h.q || 1), 4);
              return Array.from({ length: maxQ - 1 }, (_, i) => (
                <ReferenceLine
                  key={`q${i + 1}`}
                  x={((i + 1) * qLen) / 60}
                  stroke="#50506a"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              ));
            })()}
            <YAxis
              stroke="#a0a0b0"
              fontSize={10}
              domain={[-maxAbs, maxAbs]}
              tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
            />
            <ReferenceLine y={0} stroke="#50506a" strokeWidth={2} />
            {playerSegments.map((seg, i) => (
              <ReferenceArea key={i} x1={seg.x1} x2={seg.x2} fill="#FF6B35" fillOpacity={0.12} />
            ))}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                const homeOnCourt = Array.isArray(d.onCourt)
                  ? d.onCourt.filter((id) => id < 1000).map((id) => getPlayerName(id))
                  : [];

                const m = d.minute || 0;
                const minLabel = `${Math.floor(m)}'${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;

                return (
                  <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs">
                    <div className="text-slate-400">
                      Q{d.q} — {minLabel}
                    </div>
                    <div className="text-blue-400">Home: {d.home}</div>
                    <div className="text-red-400">Away: {d.away}</div>
                    <div className={`font-bold ${d.diff >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      Diff: {d.diff > 0 ? '+' : ''}
                      {d.diff}
                    </div>
                    {homeOnCourt.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-slate-600">
                        <div className="text-slate-500 mb-0.5">Sur le terrain :</div>
                        {homeOnCourt.map((name, i) => (
                          <div key={i} className="text-slate-300">
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="diff"
              stroke="#3b82f6"
              fill="url(#gradHome)"
              fillOpacity={1}
              baseValue={0}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-2">
        <span className="text-blue-400 flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-2.5 h-2.5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 4l8 16H4L12 4z" />
          </svg>
          Home mene
        </span>
        <span className="text-red-400 flex items-center gap-1">
          Adversaire mene
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-2.5 h-2.5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 20L4 4h16L12 20z" />
          </svg>
        </span>
      </div>
    </div>
  );
}
function VideoPlayByPlay({ game, players }) {
  const [playerFilter, setPlayerFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [playFilter, setPlayFilter] = useState('all');
  const [activeVideo, setActiveVideo] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedActions, setSelectedActions] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const availableQuarters = useMemo(() => {
    if (!game.actions) return [];
    const qs = [...new Set(game.actions.map((a) => a.q || 1))].sort((a, b) => a - b);
    return qs;
  }, [game.actions]);

  const availablePlays = useMemo(() => {
    if (!game.actions) return [];
    const plays = [...new Set(game.actions.map((a) => a.play).filter(Boolean))].sort();
    return plays;
  }, [game.actions]);

  const filteredActions = useMemo(() => {
    if (!game.actions) return [];
    let acts = game.actions.filter((a) => a.type !== 'SUB');
    if (playerFilter !== 'all') {
      const fp = parseInt(playerFilter);
      acts = acts.filter((a) => (a.pid ?? a.playerId) === fp);
    }
    if (typeFilter !== 'all') {
      acts = acts.filter((a) => a.type === typeFilter);
    }
    if (quarterFilter !== 'all') {
      const qf = parseInt(quarterFilter);
      acts = acts.filter((a) => (a.q || 1) === qf);
    }
    if (playFilter !== 'all') {
      acts = acts.filter((a) => a.play === playFilter);
    }
    return acts.sort((a, b) => {
      if ((a.q || 1) !== (b.q || 1)) return (a.q || 1) - (b.q || 1);
      return (b.time || 0) - (a.time || 0);
    });
  }, [game.actions, playerFilter, typeFilter, quarterFilter, playFilter]);

  const homePlayers = players.filter((p) => game.playerStats && game.playerStats[p.id]);

  const exportSelectedClips = () => {
    const selected = filteredActions.filter((a) => selectedActions.has(a.id));
    if (selected.length === 0) return;

    const hasVideo = game.videoUrl && game.videoSettings;
    const headers = ['Joueur', 'Numero', 'Action', 'Quart', 'Chrono', 'Systeme'];
    if (hasVideo) headers.push('Timestamp_Video', 'Lien_YouTube');

    const rows = selected.map((a) => {
      const pid = a.pid ?? a.playerId;
      const isHome = typeof pid === 'number' ? pid < 1000 : false;
      const player = isHome ? players.find((p) => p.id === pid) : null;
      const num = player ? player.number : pid >= 1000 ? pid - 1000 : '?';
      const name = player ? player.name : 'Adversaire';
      const timeMin = Math.floor((a.time || 0) / 60);
      const timeSec = (a.time || 0) % 60;
      const timeStr = `Q${a.q || 1} ${timeMin}:${timeSec.toString().padStart(2, '0')}`;

      let desc = a.type;
      if (a.type === 'SHOT') desc = `Tir ${a.val}pts ${a.made ? 'OK' : 'rate'}`;
      else if (a.type === 'FT') desc = `LF ${a.ftMade || 0}/${a.ftAtt || 0}`;
      else if (a.type === 'FOUL') desc = 'Faute';
      else if (a.type === 'TOV') desc = 'Perte';
      else if (a.type === 'STL') desc = 'Interception';
      else if (a.type === 'BLK') desc = 'Contre';

      const row = [name, num, desc, `Q${a.q || 1}`, timeStr, a.play || ''];
      if (hasVideo) {
        const link = getYouTubeLink(a, game.videoUrl, game.videoSettings, game.actions);
        const tMatch = link ? link.match(/[?&]t=(\d+)/) : null;
        const tSec = tMatch ? parseInt(tMatch[1]) : '';
        row.push(tSec, link || '');
      }
      return row;
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
      '\n'
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clips_${game.opponent || 'match'}_${game.date || ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClipExport = async () => {
    const selected = filteredActions.filter((a) => selectedActions.has(a.id));
    if (selected.length === 0 || !game.videoUrl || !game.videoSettings) return;

    setExporting(true);
    setExportResult(null);

    try {
      const result = await requestClipExport(game.videoUrl, game.videoSettings, selected);
      setExportResult(result);
    } catch (err) {
      alert('Erreur export clips: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const toggleSelection = (actionId) => {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedActions.size === filteredActions.length) {
      setSelectedActions(new Set());
    } else {
      setSelectedActions(new Set(filteredActions.map((a) => a.id)));
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm text-purple-400 uppercase font-bold flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Play-by-Play {game.videoUrl ? '& Video' : ''}
        </h4>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => {
              setSelectMode((s) => !s);
              setSelectedActions(new Set());
            }}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
              selectMode
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {selectMode ? 'Annuler selection' : 'Selectionner'}
          </button>
          {selectMode && selectedActions.size > 0 && (
            <>
              <button
                onClick={exportSelectedClips}
                className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-500"
              >
                Exporter {selectedActions.size} clip{selectedActions.size > 1 ? 's' : ''} (CSV)
              </button>
              {CLIP_SERVER_URL && game.videoUrl && game.videoSettings && (
                <button
                  onClick={handleClipExport}
                  disabled={exporting}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                    exporting
                      ? 'bg-slate-600 text-slate-400 cursor-wait'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                  }`}
                >
                  {exporting
                    ? 'Decoupe en cours...'
                    : `Exporter ${selectedActions.size} clip${selectedActions.size > 1 ? 's' : ''} (Video)`}
                </button>
              )}
            </>
          )}
          <span className="text-xs text-slate-500">{filteredActions.length} actions</span>
        </div>
      </div>

      {/* LECTEUR VIDEO INLINE */}
      {activeVideo && game.videoUrl && (
        <div className="mb-3 relative">
          <div className="aspect-video w-full max-w-2xl mx-auto bg-black rounded-lg overflow-hidden">
            <iframe
              src={getYouTubeEmbedUrl(game.videoUrl, activeVideo.seconds)}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              frameBorder="0"
            />
          </div>
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded hover:bg-black/90 cursor-pointer transition-colors duration-200"
          >
            Fermer
          </button>
        </div>
      )}

      {/* RESULTATS EXPORT CLIPS */}
      {exportResult && exportResult.clips && (
        <div className="mb-3 p-3 bg-green-950/30 border border-green-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-green-400 font-bold">
              {exportResult.clips.length} clip{exportResult.clips.length > 1 ? 's' : ''} pret
              {exportResult.clips.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setExportResult(null)}
              className="text-[10px] text-slate-400 hover:text-white cursor-pointer transition-colors duration-200"
            >
              Fermer
            </button>
          </div>
          <div className="space-y-1">
            {exportResult.clips.map((clip, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate flex-1">{clip.label}</span>
                <a
                  href={clip.downloadUrl}
                  download
                  className="px-2 py-0.5 bg-green-600/30 text-green-300 rounded text-[10px] font-bold hover:bg-green-600/50 shrink-0 ml-2"
                >
                  Telecharger
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTRES */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={quarterFilter}
          onChange={(e) => setQuarterFilter(e.target.value)}
          className="bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1"
        >
          <option value="all">Tous les QT</option>
          {availableQuarters.map((q) => (
            <option key={q} value={q}>
              {q <= 4 ? `Q${q}` : `OT${q - 4}`}
            </option>
          ))}
        </select>
        <select
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          className="bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1"
        >
          <option value="all">Tous les joueurs</option>
          {homePlayers.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.number} {p.name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1"
        >
          <option value="all">Toutes actions</option>
          <option value="SHOT">Tirs</option>
          <option value="FT">Lancers francs</option>
          <option value="FOUL">Fautes</option>
          <option value="TOV">Pertes</option>
          <option value="STL">Interceptions</option>
          <option value="BLK">Contres</option>
          <option value="REB">Rebonds</option>
        </select>
        {availablePlays.length > 0 && (
          <select
            value={playFilter}
            onChange={(e) => setPlayFilter(e.target.value)}
            className="bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1"
          >
            <option value="all">Tous systemes</option>
            {availablePlays.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* SELECT ALL (en mode selection) */}
      {selectMode && filteredActions.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={toggleSelectAll}
            className="text-[10px] text-slate-400 hover:text-white underline"
          >
            {selectedActions.size === filteredActions.length
              ? 'Tout deselectionner'
              : 'Tout selectionner'}
          </button>
        </div>
      )}

      {/* LISTE DES ACTIONS */}
      <div className="max-h-80 overflow-y-auto bg-slate-900 rounded-lg border border-slate-700">
        {filteredActions.length === 0 && (
          <div className="text-center text-slate-500 text-xs py-4">Aucune action</div>
        )}
        {filteredActions.map((a, i) => {
          const pid = a.pid ?? a.playerId;
          const isHome = typeof pid === 'number' ? pid < 1000 : false;
          const player = isHome ? players.find((p) => p.id === pid) : null;
          const num = player ? player.number : pid >= 1000 ? pid - 1000 : '?';
          const name = player ? player.name : 'Adv';
          const timeMin = Math.floor((a.time || 0) / 60);
          const timeSec = (a.time || 0) % 60;
          const timeStr = `Q${a.q || 1} ${timeMin}:${timeSec.toString().padStart(2, '0')}`;

          const hasVideo = game.videoUrl && game.videoSettings;
          const link = hasVideo ? getYouTubeLink(a, game.videoUrl, game.videoSettings) : null;
          const tMatch = link ? link.match(/[?&]t=(\d+)/) : null;
          const tSec = tMatch ? parseInt(tMatch[1]) : 0;

          let desc = a.type;
          if (a.type === 'SHOT') desc = `Tir ${a.val}pts ${a.made ? 'OK' : 'rate'}`;
          else if (a.type === 'FT') desc = `LF ${a.ftMade || 0}/${a.ftAtt || 0}`;
          else if (a.type === 'FOUL') desc = 'Faute';
          else if (a.type === 'TOV') desc = 'Perte';
          else if (a.type === 'STL') desc = 'Interception';
          else if (a.type === 'BLK') desc = 'Contre';

          const isSelected = selectedActions.has(a.id);

          return (
            <div
              key={a.id || i}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b border-slate-800 transition-colors ${
                isSelected ? 'bg-orange-950/30' : isHome ? 'bg-blue-950/20' : 'bg-red-950/20'
              } ${activeVideo?.actionId === a.id ? 'ring-1 ring-purple-500' : ''}`}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(a.id)}
                  className="w-3 h-3 shrink-0 accent-orange-500"
                />
              )}
              <span className="text-slate-500 font-mono w-16 shrink-0">{timeStr}</span>
              <span className={`font-bold ${isHome ? 'text-blue-400' : 'text-red-400'}`}>
                #{num}
              </span>
              <span className="flex-1 text-slate-300">
                {desc}
                {a.play && <span className="ml-1 text-[10px] text-teal-400/70">({a.play})</span>}
              </span>
              {link && !selectMode && (
                <button
                  onClick={() => setActiveVideo({ seconds: tSec, actionId: a.id })}
                  className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-[10px] font-bold hover:bg-purple-600/50 transition-colors duration-200 shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7L8 5z" />
                  </svg>
                  Video
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- A6 : Panneau de configuration video (admin) ---
function VideoSettingsPanel({ game }) {
  const [videoUrl, setVideoUrl] = useState(game.videoUrl || '');
  const [offsets, setOffsets] = useState(
    game.videoSettings?.offsets || {
      q1: { start: 0, end: 0 },
      q2: { start: 0, end: 0 },
      q3: { start: 0, end: 0 },
      q4: { start: 0, end: 0 },
    }
  );
  const [leadTimes, setLeadTimes] = useState(
    game.videoSettings?.leadTimes || {
      shot: 6,
      foul: 3,
      turnover: 5,
      default: 2,
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!window.db) {
      alert('Firebase non connecte');
      return;
    }
    setSaving(true);
    try {
      game.videoUrl = videoUrl;
      game.videoSettings = { offsets, leadTimes };
      await window.DB.saveGame(game);
      setSaved(true);
      setTimeout(function () {
        setSaved(false);
      }, 2000);
    } catch {
      alert('Erreur sauvegarde');
    }
    setSaving(false);
  };

  const updateOffset = (qt, field, val) => {
    setOffsets((prev) => ({ ...prev, [qt]: { ...prev[qt], [field]: parseInt(val) || 0 } }));
  };

  const inputCls = 'bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1 w-20';

  return (
    <div className="mt-4">
      <window.Card className="p-4 border-l-4 border-purple-500">
        <h4 className="text-sm text-purple-400 uppercase font-bold mb-3 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Config Video
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
              URL Video YouTube
            </label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1.5"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
              Offsets par Quart-Temps (secondes video)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['q1', 'q2', 'q3', 'q4'].map((qt) => (
                <div key={qt} className="bg-slate-900/50 rounded p-2 border border-slate-700">
                  <div className="text-[10px] text-slate-400 font-bold mb-1">
                    {qt.toUpperCase()}
                  </div>
                  <div className="flex gap-1 items-center text-[10px]">
                    <span className="text-slate-500">Debut:</span>
                    <input
                      type="number"
                      value={offsets[qt]?.start || 0}
                      onChange={(e) => updateOffset(qt, 'start', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex gap-1 items-center text-[10px] mt-1">
                    <span className="text-slate-500">Fin:</span>
                    <input
                      type="number"
                      value={offsets[qt]?.end || 0}
                      onChange={(e) => updateOffset(qt, 'end', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
              Anticipation (secondes)
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'shot', label: 'Tir' },
                { key: 'foul', label: 'Faute' },
                { key: 'turnover', label: 'Perte' },
                { key: 'default', label: 'Defaut' },
              ].map((lt) => (
                <div key={lt.key} className="flex items-center gap-1 text-[10px]">
                  <span className="text-slate-400">{lt.label}:</span>
                  <input
                    type="number"
                    value={leadTimes[lt.key] || 0}
                    onChange={(e) =>
                      setLeadTimes((prev) => ({ ...prev, [lt.key]: parseInt(e.target.value) || 0 }))
                    }
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded"
          >
            {saving ? 'Sauvegarde...' : saved ? 'Sauvegarde !' : 'Sauvegarder la configuration'}
          </button>
        </div>
      </window.Card>
    </div>
  );
}

function ClutchPanel({ game, players }) {
  if (!game?.actions?.length || !game.actions[0].onCourt || game.actions[0].time === undefined) {
    return React.createElement(
      'div',
      { className: 'text-center text-slate-500 text-sm py-8' },
      '⏱️ Données clutch non disponibles (match sans timeline détaillée)'
    );
  }

  const clutchActions = filterClutchActions(game.actions, players);
  if (!clutchActions || !clutchActions.length) {
    return React.createElement(
      'div',
      { className: 'text-center text-slate-500 text-sm py-8' },
      'Aucune action en situation clutch détectée (Q4/OT, 2 dernières min, écart ≤5 pts)'
    );
  }

  const clutchData = players
    .map((p) => {
      const stats = calcClutchStats(clutchActions, p.id);
      if (!stats) return null;
      const rating = calcClutchRating(stats);
      return { player: p, stats, rating };
    })
    .filter(Boolean)
    .sort((a, b) => b.rating - a.rating);

  if (!clutchData.length) {
    return React.createElement(
      'div',
      { className: 'text-center text-slate-500 text-sm py-8' },
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

  return React.createElement(
    'div',
    { className: 'space-y-4' },
    // Header
    React.createElement(
      'div',
      { className: 'flex items-center justify-between' },
      React.createElement(
        'h4',
        { className: 'text-sm text-orange-400 uppercase font-bold' },
        '🔥 Clutch Performance'
      ),
      React.createElement(
        'span',
        { className: 'text-xs text-slate-500' },
        clutchActions.length + ' actions clutch (Q4/OT, 2 dernières min, ≤5 pts)'
      )
    ),

    // Tableau
    React.createElement(
      'div',
      { className: 'overflow-x-auto' },
      React.createElement(
        'table',
        { className: 'w-full text-xs' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            { className: 'border-b border-slate-700 text-slate-400' },
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
        React.createElement(
          'tbody',
          { className: 'divide-y divide-slate-800' },
          clutchData.map(({ player, stats, rating }) =>
            React.createElement(
              'tr',
              { key: player.id, className: 'hover:bg-slate-800/50' },
              React.createElement(
                'td',
                { className: 'p-2 font-bold text-white' },
                '#' + player.number + ' ' + player.name
              ),
              React.createElement(
                'td',
                { className: 'p-2 text-center' },
                React.createElement(
                  'span',
                  {
                    className: `inline-block px-2 py-0.5 rounded border text-xs font-bold ${getRatingBg(rating)} ${getRatingColor(rating)}`,
                  },
                  rating
                )
              ),
              React.createElement(
                'td',
                { className: 'p-2 text-center font-bold text-orange-400' },
                stats.pts
              ),
              React.createElement(
                'td',
                { className: 'p-2 text-center' },
                stats.fgm + '-' + stats.fga,
                React.createElement(
                  'span',
                  { className: 'text-slate-500 ml-1' },
                  '(' + stats.fgPct + '%)'
                )
              ),
              React.createElement(
                'td',
                { className: 'p-2 text-center text-slate-400' },
                stats.threePM + '-' + stats.threePA
              ),
              React.createElement(
                'td',
                { className: 'p-2 text-center text-slate-400' },
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
function OnOffPanel({ game, players }) {
  const MIN_POSSESSIONS = 10;
  const [sortKey, setSortKey] = useState('netDiff');
  const [sortDir, setSortDir] = useState(-1);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  if (!game?.actions?.length || !game.actions[0].onCourt || game.actions[0].time === undefined) {
    return React.createElement(
      'div',
      { className: 'text-center text-slate-500 text-sm py-8' },
      '📊 Données ON/OFF non disponibles (match sans lineup tracking)'
    );
  }

  const impacts = players
    .filter((p) => {
      const ps = game.playerStats?.[p.id];
      return ps && (ps.minutes || 0) > 0;
    })
    .map((p) => {
      const impact = calcOnOffImpact(game.actions, p.id, players);
      if (!impact) return null;
      return { player: p, ...impact };
    })
    .filter((i) => i && i.on.poss + i.off.poss >= MIN_POSSESSIONS);

  if (!impacts.length) {
    return React.createElement(
      'div',
      { className: 'text-center text-slate-500 text-sm py-8' },
      'Aucune donnée ON/OFF calculable (trop peu de possessions)'
    );
  }

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d * -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const sorted = [...impacts].sort((a, b) => {
    const map = { netDiff: 'netDiff', netOn: 'netOn', netOff: 'netOff', dpr: 'on' };
    let va, vb;
    if (sortKey === 'dpr') {
      va = a.on.dpr;
      vb = b.on.dpr;
    } else {
      va = a[sortKey];
      vb = b[sortKey];
    }
    return (va - vb) * sortDir;
  });

  const maxAbsNetDiff = Math.max(1, ...impacts.map((i) => Math.abs(i.netDiff)));

  const SortHeader = ({ label, sortKeyVal }) =>
    React.createElement(
      'th',
      {
        className: 'p-2 text-center cursor-pointer hover:text-orange-400 select-none',
        onClick: () => toggleSort(sortKeyVal),
      },
      label + (sortKey === sortKeyVal ? (sortDir === -1 ? ' ▼' : ' ▲') : '')
    );

  return React.createElement(
    'div',
    { className: 'space-y-4' },

    // HEADER
    React.createElement(
      'div',
      { className: 'flex items-center justify-between' },
      React.createElement(
        'h4',
        { className: 'text-sm text-orange-400 uppercase font-bold' },
        '📈 Impact ON/OFF'
      ),
      React.createElement(
        'span',
        { className: 'text-xs text-slate-500' },
        'Ratings pour 100 possessions — cliquer un joueur pour le détail DPR'
      )
    ),

    // TABLEAU
    React.createElement(
      'div',
      { className: 'overflow-x-auto' },
      React.createElement(
        'table',
        { className: 'w-full text-xs' },

        // THEAD
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            { className: 'border-b border-slate-700 text-slate-400' },
            React.createElement('th', { className: 'p-2 text-left' }, 'Joueur'),
            React.createElement('th', { className: 'p-2 text-center', colSpan: 2 }, 'ON Court'),
            React.createElement('th', { className: 'p-2 text-center', colSpan: 2 }, 'OFF Court'),
            React.createElement('th', { className: 'p-2 text-center text-[10px]' }, 'Déf'),
            SortHeader({ label: 'Net ON', sortKeyVal: 'netOn' }),
            SortHeader({ label: 'Net OFF', sortKeyVal: 'netOff' }),
            SortHeader({ label: 'Diff', sortKeyVal: 'netDiff' })
          ),
          React.createElement(
            'tr',
            { className: 'border-b border-slate-800 text-slate-500 text-[10px]' },
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
        React.createElement(
          'tbody',
          { className: 'divide-y divide-slate-800' },
          sorted.flatMap(
            ({
              player,
              on,
              off,
              netDiff,
              netOn,
              netOff,
              netDiff_raw,
              netOn_raw,
              netOff_raw,
              weightON,
              weightOFF,
              K_on,
            }) => {
              const isExpanded = expandedPlayer === player.id;
              const rows = [];

              // Ligne principale
              rows.push(
                React.createElement(
                  'tr',
                  {
                    key: player.id,
                    className:
                      'hover:bg-slate-800/50 cursor-pointer' +
                      (isExpanded ? ' bg-slate-800/30' : ''),
                    onClick: () => setExpandedPlayer(isExpanded ? null : player.id),
                  },
                  // Nom + poss + usage
                  React.createElement(
                    'td',
                    { className: 'p-2 font-bold text-white whitespace-nowrap' },
                    React.createElement('span', null, '#' + player.number + ' ' + player.name),
                    React.createElement(
                      'span',
                      { className: 'text-[10px] text-slate-500 ml-1' },
                      '(' +
                        on.poss +
                        '/' +
                        off.poss +
                        ' poss • Usg ' +
                        on.usageRate +
                        '% • Fiab. ' +
                        weightON +
                        '%)'
                    ),
                    React.createElement(
                      'span',
                      { className: 'text-[10px] text-slate-600 ml-1' },
                      isExpanded ? '▲' : '▼'
                    )
                  ),

                  // ON ORtg
                  React.createElement(
                    'td',
                    { className: 'p-2 text-center text-green-400 font-mono' },
                    on.ortg
                  ),
                  // ON DPR
                  React.createElement(
                    'td',
                    { className: 'p-2 text-center text-red-400 font-mono' },
                    on.dpr
                  ),
                  // OFF ORtg
                  React.createElement(
                    'td',
                    { className: 'p-2 text-center text-green-400/60 font-mono' },
                    off.ortg
                  ),
                  // OFF DPR
                  React.createElement(
                    'td',
                    { className: 'p-2 text-center text-red-400/60 font-mono' },
                    off.dpr
                  ),

                  // STL / BLK / DREB
                  React.createElement(
                    'td',
                    { className: 'p-2 text-center text-slate-300 font-mono text-[10px]' },
                    on.playerStl + '/' + on.playerBlk + '/' + on.playerDreb
                  ),

                  // Net ON
                  React.createElement(
                    'td',
                    {
                      className:
                        'p-2 text-center font-bold font-mono ' +
                        (netOn >= 0 ? 'text-green-400' : 'text-red-400'),
                    },
                    (netOn > 0 ? '+' : '') + netOn
                  ),

                  // Net OFF
                  React.createElement(
                    'td',
                    {
                      className:
                        'p-2 text-center font-mono ' +
                        (netOff >= 0 ? 'text-green-400/60' : 'text-red-400/60'),
                    },
                    (netOff > 0 ? '+' : '') + netOff
                  ),

                  // Net Diff badge
                  React.createElement(
                    'td',
                    { className: 'p-2 text-center' },
                    React.createElement(
                      'span',
                      {
                        className:
                          'inline-block px-2 py-0.5 rounded font-bold ' +
                          (netDiff > 0
                            ? 'bg-green-500/20 text-green-400'
                            : netDiff < 0
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-slate-700 text-slate-400'),
                      },
                      (netDiff > 0 ? '+' : '') + netDiff
                    )
                  )
                )
              );

              // Ligne de détail DPR (expandable)
              if (isExpanded) {
                rows.push(
                  React.createElement(
                    'tr',
                    {
                      key: player.id + '_detail',
                      className: 'bg-slate-900/60',
                    },
                    React.createElement(
                      'td',
                      { colSpan: 9, className: 'px-4 py-3' },
                      React.createElement(
                        'div',
                        { className: 'flex flex-wrap gap-4 text-[11px]' },

                        // DPR Breakdown ON
                        React.createElement(
                          'div',
                          { className: 'bg-slate-800 rounded-lg p-3 flex-1 min-w-[200px]' },
                          React.createElement(
                            'div',
                            { className: 'text-orange-400 font-bold mb-2 text-xs' },
                            '🛡️ DPR ON Court — Décomposition'
                          ),
                          React.createElement(
                            'div',
                            { className: 'space-y-1' },
                            React.createElement(
                              'div',
                              { className: 'flex justify-between' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Base DRtg (pts encaissés)'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-red-400 font-mono' },
                                on.drtg
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                '− Contrib (STL×1.8 + BLK×1.2 + DREB×0.4)'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-green-400 font-mono' },
                                '−' + on.defContrib
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                '+ Pénalité fautes (PF×0.7)'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-red-400 font-mono' },
                                '+' + on.defPenalty
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Adv. FG% quand ON'
                              ),
                              React.createElement(
                                'span',
                                {
                                  className:
                                    'font-mono ' +
                                    (on.oppFgPct > 42 ? 'text-red-400' : 'text-green-400'),
                                },
                                on.oppFgPct + '%'
                              )
                            ),
                            React.createElement(
                              'div',
                              {
                                className:
                                  'flex justify-between border-t border-slate-700 pt-1 mt-1',
                              },
                              React.createElement(
                                'span',
                                { className: 'text-white font-bold' },
                                'DPR final'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-white font-bold font-mono' },
                                on.dpr
                              )
                            )
                          )
                        ),

                        // Stats défensives individuelles
                        React.createElement(
                          'div',
                          { className: 'bg-slate-800 rounded-lg p-3 min-w-[140px]' },
                          React.createElement(
                            'div',
                            { className: 'text-orange-400 font-bold mb-2 text-xs' },
                            '📊 Actions défensives'
                          ),
                          React.createElement(
                            'div',
                            { className: 'space-y-1' },
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Interceptions'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-cyan-400 font-mono font-bold' },
                                on.playerStl
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Contres'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-cyan-400 font-mono font-bold' },
                                on.playerBlk
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Reb. déf.'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-cyan-400 font-mono font-bold' },
                                on.playerDreb
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Fautes'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-red-400 font-mono font-bold' },
                                on.playerPf
                              )
                            )
                          )
                        ),

                        // Usage offensif
                        React.createElement(
                          'div',
                          { className: 'bg-slate-800 rounded-lg p-3 min-w-[140px]' },
                          React.createElement(
                            'div',
                            { className: 'text-orange-400 font-bold mb-2 text-xs' },
                            '🎯 Shrinkage (fiabilité)'
                          ),
                          React.createElement(
                            'div',
                            { className: 'space-y-1' },
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Poss ON'
                              ),
                              React.createElement(
                                'span',
                                { className: 'font-mono text-white' },
                                on.poss
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Actions individuelles'
                              ),
                              React.createElement(
                                'span',
                                { className: 'font-mono text-white' },
                                on.playerActions
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Taux implication'
                              ),
                              React.createElement(
                                'span',
                                {
                                  className:
                                    'font-mono ' +
                                    (on.involvementRate >= 0.3
                                      ? 'text-green-400'
                                      : on.involvementRate >= 0.15
                                        ? 'text-yellow-400'
                                        : 'text-red-400'),
                                },
                                Math.round(on.involvementRate * 100) + '%'
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'K adapté (base 30)'
                              ),
                              React.createElement(
                                'span',
                                { className: 'font-mono text-cyan-400' },
                                K_on
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Poids final'
                              ),
                              React.createElement(
                                'span',
                                {
                                  className:
                                    'font-mono font-bold ' +
                                    (weightON >= 50 ? 'text-green-400' : 'text-yellow-400'),
                                },
                                weightON + '%'
                              )
                            ),
                            React.createElement(
                              'div',
                              {
                                className:
                                  'flex justify-between gap-4 border-t border-slate-700 pt-1 mt-1',
                              },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Net Diff brut'
                              ),
                              React.createElement(
                                'span',
                                { className: 'font-mono text-slate-300' },
                                (netDiff_raw > 0 ? '+' : '') + netDiff_raw
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-white font-bold' },
                                'Net Diff ajusté'
                              ),
                              React.createElement(
                                'span',
                                {
                                  className:
                                    'font-mono font-bold ' +
                                    (netDiff >= 0 ? 'text-green-400' : 'text-red-400'),
                                },
                                (netDiff > 0 ? '+' : '') + netDiff
                              )
                            )
                          )
                        ),

                        // Profil offensif
                        React.createElement(
                          'div',
                          { className: 'bg-slate-800 rounded-lg p-3 min-w-[140px]' },
                          React.createElement(
                            'div',
                            { className: 'text-orange-400 font-bold mb-2 text-xs' },
                            '⚡ Profil offensif ON'
                          ),
                          React.createElement(
                            'div',
                            { className: 'space-y-1' },
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Usage Rate'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-yellow-400 font-mono font-bold' },
                                on.usageRate + '%'
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement('span', { className: 'text-slate-400' }, 'Tirs'),
                              React.createElement(
                                'span',
                                { className: 'font-mono text-white' },
                                on.playerFgm + '-' + on.playerFga
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Passes D.'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-blue-400 font-mono font-bold' },
                                on.playerAst
                              )
                            ),
                            React.createElement(
                              'div',
                              { className: 'flex justify-between gap-4' },
                              React.createElement(
                                'span',
                                { className: 'text-slate-400' },
                                'Pertes'
                              ),
                              React.createElement(
                                'span',
                                { className: 'text-red-400 font-mono font-bold' },
                                on.playerTov
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                );
              }

              return rows;
            }
          )
        )
      )
    ),

    // BAR CHART HORIZONTAL (Net Diff)
    React.createElement(
      'div',
      { className: 'mt-4' },
      React.createElement(
        'h5',
        { className: 'text-xs text-slate-400 mb-2 uppercase' },
        'Net Rating Différentiel (ON − OFF)'
      ),
      React.createElement(
        'div',
        { className: 'space-y-1' },
        sorted.map(({ player, netDiff }) => {
          const pct = (Math.abs(netDiff) / maxAbsNetDiff) * 100;
          const isPositive = netDiff >= 0;
          return React.createElement(
            'div',
            {
              key: player.id,
              className: 'flex items-center gap-2 h-7',
            },
            React.createElement(
              'span',
              {
                className: 'text-[10px] text-slate-400 w-20 text-right truncate',
              },
              '#' + player.number + ' ' + player.name.split(' ')[0]
            ),

            React.createElement(
              'div',
              { className: 'flex-1 flex items-center h-full' },
              React.createElement(
                'div',
                {
                  className: 'relative h-full flex items-center',
                  style: { width: '100%' },
                },
                React.createElement('div', {
                  className: 'absolute left-1/2 top-0 bottom-0 w-px bg-slate-600',
                  style: { transform: 'translateX(-50%)' },
                }),
                isPositive
                  ? React.createElement('div', {
                      className: 'absolute h-4 bg-green-500/60 rounded-r',
                      style: { left: '50%', width: pct / 2 + '%' },
                    })
                  : React.createElement('div', {
                      className: 'absolute h-4 bg-red-500/60 rounded-l',
                      style: { right: '50%', width: pct / 2 + '%' },
                    })
              )
            ),

            React.createElement(
              'span',
              {
                className:
                  'text-[10px] font-bold w-8 ' + (isPositive ? 'text-green-400' : 'text-red-400'),
              },
              (netDiff > 0 ? '+' : '') + netDiff
            )
          );
        })
      )
    )
  );
}
function GameDetailsModal({ game, isOpen, onClose, players, isAdmin }) {
  if (!game) return null;
  const debugMode = useUIStore((s) => s.debugMode);
  const [viewMode, setViewMode] = useState('classic');
  const [showMinutesDebug, setShowMinutesDebug] = useState(false);
  const [quarterFilter, setQuarterFilter] = useState('TOTAL');
  const [playFilter, setPlayFilter] = useState('ALL');
  const [gameNotes, setGameNotes] = useState(game.coachNotes || '');

  const statsData = React.useMemo(() => {
    const pStats = game.playerStats || {};
    const opp = game.opponentStats || {};

    let subMinutes = null;
    if (game.actions?.length && game.starters) {
      const qSet = new Set(game.actions.map((a) => a.q || 1));
      [1, 2, 3, 4].forEach((q) => qSet.add(q));
      const maxQ = Math.max(...qSet);
      subMinutes = recalcMinutes(game.actions, game.starters || {}, maxQ);
    }
    // --- Flag : le match a-t-il un play-by-play ? ---
    const hasPBP = Array.isArray(game.actions) && game.actions.length > 0;

    // --- Détection : foulDrawn / blkAgainst sont-ils trackés dans ce match ? ---
    // On regarde si au moins un joueur a ces champs non-nuls
    let hasFoulDrawnData = false;
    let hasBlkAgainstData = false;
    Object.values(pStats).forEach((s) => {
      if ((s.foulDrawn || 0) > 0) hasFoulDrawnData = true;
      if ((s.blkAgainst || 0) > 0) hasBlkAgainstData = true;
    });
    // Si le match a un PBP, on considère que ces stats sont trackées même si toutes à 0
    if (hasPBP) {
      hasFoulDrawnData = true;
      hasBlkAgainstData = true;
    }

    let T_FGM = 0,
      T_FGA = 0,
      T_3PM = 0,
      T_FTM = 0,
      T_FTA = 0,
      T_ORB = 0,
      T_DRB = 0;
    let T_AST = 0,
      T_STL = 0,
      T_BLK = 0,
      T_TOV = 0,
      T_PF = 0,
      T_PTS = 0,
      T_MP = 0;
    let T_FD = 0,
      T_BLK_AG = 0;

    Object.values(pStats).forEach((s) => {
      const pid = Object.keys(pStats).find((key) => pStats[key] === s);
      const playerMin =
        subMinutes && subMinutes[pid] !== undefined ? subMinutes[pid] : s.minutes || 0;
      T_FGM += (s.fgm || 0) + (s.threePM || 0);
      T_FGA += (s.fga || 0) + (s.threePA || 0);
      T_3PM += s.threePM || 0;
      T_FTM += s.ftm || 0;
      T_FTA += s.fta || 0;
      T_ORB += s.oreb || 0;
      T_DRB += s.dreb || 0;
      T_AST += s.ast || 0;
      T_STL += s.stl || 0;
      T_BLK += s.blk || 0;
      T_TOV += s.tov || 0;
      T_PF += s.pf || 0;
      T_PTS += s.pts || 0;
      T_MP += playerMin;
      T_FD += s.foulDrawn || 0;
      T_BLK_AG += s.blkAgainst || 0;
    });

    const O_PTS = game.awayScore || 0;
    const O_FGM = opp.fgm || 0;
    const O_FGA = opp.fga || O_FGM + T_DRB;
    const O_FTM = opp.ftm || 0;
    const O_FTA = opp.fta || 0;
    const O_ORB = opp.oreb || 0;
    const O_TRB = opp.reb || O_ORB + T_DRB;
    const O_TOV = opp.tov || 0;

    const Team_Poss = T_FGA + 0.44 * T_FTA - T_ORB + T_TOV;
    const Team_ORtg = Team_Poss > 0 ? (T_PTS / Team_Poss) * 100 : 0;
    const Team_DRtg = Team_Poss > 0 ? (O_PTS / Team_Poss) * 100 : 0;

    const rawPlayers = Object.entries(pStats)
      .map(([pid, s]) => {
        const hasActivity =
          (s.pts || 0) > 0 ||
          (s.fgm || 0) > 0 ||
          (s.fga || 0) > 0 ||
          (s.threePA || 0) > 0 ||
          (s.fta || 0) > 0 ||
          (s.oreb || 0) > 0 ||
          (s.dreb || 0) > 0 ||
          (s.ast || 0) > 0 ||
          (s.stl || 0) > 0 ||
          (s.blk || 0) > 0 ||
          (s.tov || 0) > 0 ||
          (s.pf || 0) > 0 ||
          (s.minutes || 0) > 0;
        if (!hasActivity) return null;

        const MP = subMinutes && subMinutes[pid] !== undefined ? subMinutes[pid] : s.minutes || 0;
        const FGM = (s.fgm || 0) + (s.threePM || 0);
        const FGA = (s.fga || 0) + (s.threePA || 0);
        const eFG = window.StatsEngine.eFG(FGM, s.threePM || 0, FGA);
        const TS = window.StatsEngine.TS(s.pts || 0, FGA, s.fta || 0);

        const gamePIEDenom =
          T_PTS +
          O_PTS +
          (T_FGM + O_FGM) +
          (T_FTM + O_FTM) -
          (T_FGA + O_FGA) -
          (T_FTA + O_FTA) +
          (T_DRB + (O_TRB - O_ORB)) +
          0.5 * (T_ORB + O_ORB) +
          (T_AST + (opp.ast || 0)) +
          T_STL +
          0.5 * T_BLK -
          (T_PF + (opp.fouls || 0)) -
          (T_TOV + O_TOV);
        const playerPIENum =
          (s.pts || 0) +
          FGM +
          (s.ftm || 0) -
          FGA -
          (s.fta || 0) +
          (s.dreb || 0) +
          0.5 * (s.oreb || 0) +
          (s.ast || 0) +
          (s.stl || 0) +
          0.5 * (s.blk || 0) -
          (s.pf || 0) -
          (s.tov || 0);
        const pie = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;

        const evalStat =
          (s.pts || 0) +
          (s.oreb || 0) +
          (s.dreb || 0) +
          (s.ast || 0) +
          (s.stl || 0) +
          (s.blk || 0) -
          (FGA - FGM + ((s.fta || 0) - (s.ftm || 0)) + (s.tov || 0));

        const player = players.find((p) => p.id === parseInt(pid));

        return {
          id: pid,
          name: player ? player.name : `#${pid}`,
          minutes: MP,
          pts: s.pts || 0,
          ast: s.ast || 0,
          reb: (s.oreb || 0) + (s.dreb || 0),
          stl: s.stl || 0,
          blk: s.blk || 0,
          tov: s.tov || 0,
          pf: s.pf || 0,
          fgm: FGM,
          fga: FGA,
          twoPM: s.fgm || 0,
          twoPA: s.fga || 0,
          threePM: s.threePM || 0,
          threePA: s.threePA || 0,
          ftm: s.ftm || 0,
          fta: s.fta || 0,
          oreb: s.oreb || 0,
          dreb: s.dreb || 0,
          plusMinus: s.plusMinus || 0,
          eFG: eFG.toFixed(1),
          TS: TS.toFixed(1),
          PIE: pie.toFixed(1),
          eff: evalStat,
          // --- NOUVELLES STATS ---
          foulDrawn: s.foulDrawn || 0,
          blkAgainst: s.blkAgainst || 0,
        };
      })
      .filter((p) => p !== null);

    return {
      team: {
        poss: Team_Poss.toFixed(1),
        ORtg: Team_ORtg.toFixed(1),
        DRtg: Team_DRtg.toFixed(1),
        Net: (Team_ORtg - Team_DRtg).toFixed(1),
        // Totaux pour ligne TOTAL
        T_FD,
        T_BLK_AG,
        T_PTS,
        T_FGM,
        T_FGA,
        T_3PM,
        T_FTM,
        T_FTA,
        T_ORB,
        T_DRB,
        T_AST,
        T_STL,
        T_BLK,
        T_TOV,
        T_PF,
        T_MP,
      },
      players: rawPlayers,
      hasPBP,
      hasFoulDrawnData,
      hasBlkAgainstData,
    };
  }, [game, players]);

  const quarterStatsData = React.useMemo(() => {
    if (quarterFilter === 'TOTAL' || !game.actions?.length) return null;
    const qNum = parseInt(quarterFilter);
    const qActions = game.actions.filter((a) => (a.q || 1) === qNum);

    const pStatsMap = {};
    if (game.playerStats) {
      Object.entries(game.playerStats).forEach(([id, ps]) => {
        // FIX 3 : Resoudre le nom depuis le roster (players prop)
        const rosterPlayer = players.find((p) => p.id === parseInt(id));
        pStatsMap[id] = {
          id,
          name: rosterPlayer
            ? `#${rosterPlayer.number} ${rosterPlayer.name}`
            : `#${ps.number || id} ${ps.name || ''}`.trim(),
          minutes: '-',
          pts: 0,
          fgm: 0,
          fga: 0,
          fg3m: 0,
          fg3a: 0,
          ftm: 0,
          fta: 0,
          oreb: 0,
          dreb: 0,
          reb: 0,
          ast: 0,
          stl: 0,
          blk: 0,
          tov: 0,
          pf: 0,
          foulDrawn: 0,
          blkAgainst: 0,
          plusMinus: 0,
        };
      });
    }

    // Aggregation des actions du quarter
    qActions.forEach((a) => {
      const pid = String(a.pid);
      if (pStatsMap[pid]) {
        const s = pStatsMap[pid];
        if (a.type === 'SHOT') {
          if (a.val === 3) {
            s.fg3a++;
            if (a.made) {
              s.fg3m++;
              s.pts += 3;
            }
          } else {
            s.fga++;
            if (a.made) {
              s.fgm++;
              s.pts += a.val;
            }
          }
        }
        if (a.type === 'FT') {
          s.ftm += a.ftMade || 0;
          s.fta += a.ftAtt || 0;
          s.pts += a.ftMade || 0;
        }
        if (a.type === 'OREB') {
          s.oreb++;
          s.reb++;
        }
        if (a.type === 'DREB') {
          s.dreb++;
          s.reb++;
        }
        if (a.type === 'STL') s.stl++;
        if (a.type === 'TOV') s.tov++;
        if (a.type === 'BLK') s.blk++;
        if (a.type === 'FOUL') s.pf++;
      }
      if (a.type === 'SHOT' && a.made && a.astId && pStatsMap[String(a.astId)]) {
        pStatsMap[String(a.astId)].ast++;
      }
      if (a.type === 'FOUL' && a.victim && pStatsMap[String(a.victim)]) {
        pStatsMap[String(a.victim)].foulDrawn++;
      }
      if (a.type === 'BLK' && a.victim && pStatsMap[String(a.victim)]) {
        pStatsMap[String(a.victim)].blkAgainst++;
      }
      if (pStatsMap[pid]) {
        if (a.type === 'PAINT_TOUCH')
          pStatsMap[pid].paintTouch = (pStatsMap[pid].paintTouch || 0) + 1;
        if (a.type === 'DEFLECTION')
          pStatsMap[pid].deflections = (pStatsMap[pid].deflections || 0) + 1;
        if (a.type === 'BOXOUT') pStatsMap[pid].boxOuts = (pStatsMap[pid].boxOuts || 0) + 1;
        if (a.type === 'BLOWBY') pStatsMap[pid].blowBys = (pStatsMap[pid].blowBys || 0) + 1;
        if (a.type === 'TOV' && a.unforced)
          pStatsMap[pid].unforcedTov = (pStatsMap[pid].unforcedTov || 0) + 1;
      }
      if (a.type === 'SHOT' && a.made && a.hockeyAssistId && pStatsMap[String(a.hockeyAssistId)]) {
        pStatsMap[String(a.hockeyAssistId)].hockeyAst =
          (pStatsMap[String(a.hockeyAssistId)].hockeyAst || 0) + 1;
      }
      if ((a.type === 'SHOT' && a.made) || (a.type === 'FT' && (a.ftMade || 0) > 0)) {
        const pts = a.type === 'SHOT' ? a.val : a.ftMade;
        const scorerIsHome = parseInt(a.pid) < 1000;
        if (a.onCourt) {
          a.onCourt.forEach((id) => {
            const sid = String(id);
            if (pStatsMap[sid]) {
              const pIsHome = parseInt(id) < 1000;
              pStatsMap[sid].plusMinus += scorerIsHome === pIsHome ? pts : -pts;
            }
          });
        }
      }
    });

    // FIX 4 : Calcul du temps de jeu par quarter via starters/SUBs
    const QT_DUR = 600;
    if (game.starters && game.starters[qNum]) {
      const parseId = (v) => {
        const n = parseInt(v);
        return isNaN(n) ? v : n;
      };
      const starterIds = (game.starters[qNum] || []).map((id) => String(parseId(id)));
      const onCourt = new Set(starterIds);
      starterIds.forEach((pid) => {
        if (pStatsMap[pid]) pStatsMap[pid].minutes = 0;
      });

      const qSubs = game.actions
        .filter(
          (a) => (a.q || 1) === qNum && a.type === 'SUB' && parseInt(a.pid ?? a.playerId) < 1000
        )
        .map((a) => ({ ...a, time: a.time || 0 }))
        .sort((a, b) => b.time - a.time);

      let lastTime = QT_DUR;
      qSubs.forEach((sub) => {
        const duration = lastTime - sub.time;
        if (duration > 0) {
          onCourt.forEach((pid) => {
            if (pStatsMap[pid] && typeof pStatsMap[pid].minutes === 'number')
              pStatsMap[pid].minutes += duration;
          });
        }
        const pIn = String(parseId(sub.pid ?? sub.playerId));
        const pOut = sub.subOut ? String(parseId(sub.subOut)) : null;
        if (pOut) onCourt.delete(pOut);
        if (pIn) {
          onCourt.add(pIn);
          if (pStatsMap[pIn] && pStatsMap[pIn].minutes === '-') pStatsMap[pIn].minutes = 0;
        }
        lastTime = sub.time;
      });
      if (lastTime > 0) {
        onCourt.forEach((pid) => {
          if (pStatsMap[pid] && typeof pStatsMap[pid].minutes === 'number')
            pStatsMap[pid].minutes += lastTime;
        });
      }
      // Convertir secondes -> minutes
      Object.values(pStatsMap).forEach((s) => {
        if (typeof s.minutes === 'number') s.minutes = Math.round(s.minutes / 60);
      });
    }

    const qPlayers = Object.values(pStatsMap)
      .filter((s) => parseInt(s.id) < 1000)
      .map((s) => {
        const tFgm = s.fgm + s.fg3m,
          tFga = s.fga + s.fg3a;
        return {
          ...s,
          totalFgm: tFgm,
          totalFga: tFga,
          twoPM: s.fgm,
          twoPA: s.fga,
          threePM: s.fg3m,
          threePA: s.fg3a,
          eff: s.pts + s.reb + s.ast + s.stl + s.blk - (tFga - tFgm + (s.fta - s.ftm) + s.tov),
        };
      })
      .sort((a, b) => b.pts - a.pts);

    const T = {
      pts: 0,
      fgm: 0,
      fga: 0,
      fg3m: 0,
      fg3a: 0,
      ftm: 0,
      fta: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      tov: 0,
      pf: 0,
    };
    qPlayers.forEach((s) => {
      T.pts += s.pts;
      T.fgm += s.totalFgm;
      T.fga += s.totalFga;
      T.fg3m += s.fg3m;
      T.fg3a += s.fg3a;
      T.ftm += s.ftm;
      T.fta += s.fta;
      T.reb += s.reb;
      T.ast += s.ast;
      T.stl += s.stl;
      T.blk += s.blk;
      T.tov += s.tov;
      T.pf += s.pf;
    });
    return { players: qPlayers, team: T };
  }, [game, quarterFilter, players]);
  const playAnalysis = React.useMemo(() => {
    if (!game.actions?.length) return null;
    const tagged = game.actions.filter((a) => a.play);
    if (tagged.length === 0) return null;

    const plays = {};
    tagged.forEach((a) => {
      if (!plays[a.play])
        plays[a.play] = {
          name: a.play,
          actions: [],
          shots: 0,
          fgm: 0,
          fg3m: 0,
          pts: 0,
          tov: 0,
          fta: 0,
          ftm: 0,
        };
      const p = plays[a.play];
      p.actions.push(a);
      if (a.type === 'SHOT') {
        p.shots++;
        if (a.made) {
          p.fgm++;
          p.pts += a.val;
          if (a.val === 3) p.fg3m++;
        }
      }
      if (a.type === 'FT') {
        p.fta += a.ftAtt || 0;
        p.ftm += a.ftMade || 0;
        p.pts += a.ftMade || 0;
      }
      if (a.type === 'TOV') p.tov++;
    });

    return Object.values(plays)
      .map((p) => {
        const poss = p.shots + p.tov + 0.44 * p.fta;
        const eFG = p.shots > 0 ? (((p.fgm + 0.5 * p.fg3m) / p.shots) * 100).toFixed(1) : '-';
        const ppp = poss > 0 ? (p.pts / poss).toFixed(2) : '-';
        return { ...p, poss: Math.round(poss), eFG, ppp };
      })
      .sort((a, b) => b.poss - a.poss);
  }, [game]);
  // --- RENDU ---
  return (
    <window.Modal isOpen={isOpen} onClose={onClose} title={`Vs ${game.opponent}`} size="max-w-6xl">
      <div className="space-y-4 md:space-y-6">
        {/* 1 — Momentum Chart */}
        {((game.scoreHistory && game.scoreHistory.length > 1) ||
          (game.actions && game.actions.length > 0)) && (
          <window.Card className="p-4">
            <MomentumChart
              scoreHistory={game.scoreHistory}
              actions={game.actions}
              players={players}
              game={game}
            />
          </window.Card>
        )}

        {/* 2 — Score + Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <window.Card className="p-4 text-center col-span-1 md:col-span-2">
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <div>
                <div className="text-3xl md:text-5xl font-black text-white">{game.homeScore}</div>
                <div className="text-xs text-slate-400 uppercase mt-1">Champagne</div>
              </div>
              <span className="text-xl md:text-2xl text-slate-600 font-bold">-</span>
              <div>
                <div className="text-3xl md:text-5xl font-black text-red-400">{game.awayScore}</div>
                <div className="text-xs text-slate-400 uppercase mt-1">{game.opponent}</div>
              </div>
            </div>
          </window.Card>
          <window.Card className="p-3 md:p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-end">
                <span className="text-slate-400 text-xs">Poss:</span>{' '}
                <span className="text-white font-mono">{statsData.team.poss}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-400 text-xs">NetRtg:</span>{' '}
                <span
                  className={`${parseFloat(statsData.team.Net) >= 0 ? 'text-green-400' : 'text-red-400'} font-mono font-bold text-xs`}
                >
                  {statsData.team.Net}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-purple-300 text-xs">ORtg:</span>{' '}
                <span className="text-white font-mono">{statsData.team.ORtg}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-red-300 text-xs">DRtg:</span>{' '}
                <span className="text-white font-mono">{statsData.team.DRtg}</span>
              </div>
            </div>
          </window.Card>
        </div>

        {/* 3 — Coach Report */}
        {game.actions?.length > 0 && <CoachReportPanel game={game} players={players} />}

        {/* 4 — Bannière avertissement stats manquantes */}
        {(!statsData.hasFoulDrawnData || !statsData.hasBlkAgainstData) && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-amber-300">
            <span>⚠️</span>
            <span>
              Match importé sans play-by-play —
              {!statsData.hasFoulDrawnData && !statsData.hasBlkAgainstData
                ? ' Fautes provoquées (FP) et contres subis (CS) non disponibles.'
                : !statsData.hasFoulDrawnData
                  ? ' Fautes provoquées (FP) non disponibles.'
                  : ' Contres subis (CS) non disponibles.'}
            </span>
          </div>
        )}
        {game.actions?.length > 0 && (
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700 mb-3">
            {['TOTAL', '1', '2', '3', '4'].map((q) => (
              <button
                key={q}
                onClick={() => setQuarterFilter(q)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
                  quarterFilter === q
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {q === 'TOTAL' ? 'TOTAL' : `Q${q}`}
              </button>
            ))}
          </div>
        )}
        {/* --- TABLEAU JOUEURS --- */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <h4 className="text-orange-400 font-bold text-sm uppercase flex items-center gap-2">
              <window.Icon path={window.Icons.Users} className="w-4 h-4" />
              <span>Joueurs ({statsData.players.length})</span>
            </h4>
            <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('classic')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode === 'classic' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Classique
              </button>
              <button
                onClick={() => setViewMode('advanced')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode === 'advanced' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Avance
              </button>
              <button
                className={`px-3 py-1 rounded text-xs font-bold border ${showMinutesDebug ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                onClick={() => setShowMinutesDebug(!showMinutesDebug)}
              >
                Debug
              </button>
            </div>
          </div>
          <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-800 text-white uppercase font-semibold text-[10px] md:text-xs">
                <tr>
                  <th className="p-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    Joueur
                  </th>
                  <th className="p-3 text-center">MIN</th>
                  {viewMode === 'classic' ? (
                    <>
                      <th className="p-3 text-center text-orange-400 font-bold">PTS</th>
                      <th className="p-3 text-center">2PT</th>
                      <th className="p-3 text-center">3PT</th>
                      <th className="p-3 text-center">LF</th>
                      <th className="p-3 text-center font-bold text-white">REB</th>
                      <th className="p-3 text-center text-[10px]">RO</th>
                      <th className="p-3 text-center text-[10px]">RD</th>
                      <th className="p-3 text-center">PD</th>
                      <th className="p-3 text-center">INT</th>
                      <th className="p-3 text-center">CTR</th>
                      {statsData.hasBlkAgainstData && (
                        <th
                          className="p-3 text-center text-orange-300 text-[10px]"
                          title="Contres subis"
                        >
                          CS
                        </th>
                      )}
                      <th className="p-3 text-center text-red-400">BP</th>
                      <th className="p-3 text-center text-red-400">FTE</th>
                      {statsData.hasFoulDrawnData && (
                        <th
                          className="p-3 text-center text-cyan-400 text-[10px]"
                          title="Fautes provoquées"
                        >
                          FP
                        </th>
                      )}
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
                      <th className="p-3 text-center text-yellow-400 font-bold border-l border-slate-700">
                        +/-
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(quarterStatsData ? quarterStatsData.players : statsData.players).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] truncate max-w-[100px] md:max-w-none">
                      {p.name}
                    </td>
                    <td className="p-3 text-center text-slate-500 font-mono">{p.minutes}</td>
                    {viewMode === 'classic' ? (
                      <>
                        <td className="p-3 text-center font-bold text-orange-400">{p.pts}</td>
                        <td className="p-3 text-center">
                          {p.twoPM || p.fgm || 0}/{p.twoPA || p.fga || 0}
                        </td>
                        <td className="p-3 text-center">
                          {p.threePM || 0}/{p.threePA || 0}
                        </td>
                        <td className="p-3 text-center">
                          {p.ftm || 0}/{p.fta || 0}
                        </td>
                        <td className="p-3 text-center font-bold text-white">{p.reb}</td>
                        <td className="p-3 text-center text-[10px]">{p.oreb}</td>
                        <td className="p-3 text-center text-[10px]">{p.dreb}</td>
                        <td className="p-3 text-center">{p.ast}</td>
                        <td className="p-3 text-center">{p.stl}</td>
                        <td className="p-3 text-center">{p.blk}</td>
                        {statsData.hasBlkAgainstData && (
                          <td className="p-3 text-center text-orange-300">{p.blkAgainst}</td>
                        )}
                        <td className="p-3 text-center text-red-400">{p.tov}</td>
                        <td className="p-3 text-center text-red-400">{p.pf}</td>
                        {statsData.hasFoulDrawnData && (
                          <td className="p-3 text-center text-cyan-400">{p.foulDrawn}</td>
                        )}
                        <td
                          className={`p-3 text-center font-bold ${p.plusMinus >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {p.plusMinus > 0 ? '+' : ''}
                          {p.plusMinus}
                        </td>
                        <td className="p-3 text-center font-bold text-green-400">{p.eff}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-center font-bold text-orange-400">{p.pts}</td>
                        <td className="p-3 text-center text-blue-300">{p.eFG || '-'}</td>
                        <td className="p-3 text-center text-purple-300">{p.TS || '-'}</td>
                        <td className="p-3 text-center text-cyan-400 font-bold">
                          {p.PIE || p.eff}
                        </td>
                        <td className="p-3 text-center">{p.ast}</td>
                        <td className="p-3 text-center text-red-400">{p.tov}</td>
                        <td
                          className={`p-3 text-center text-yellow-400 font-bold border-l border-slate-700 ${p.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {p.plusMinus > 0 ? '+' : ''}
                          {p.plusMinus}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {playAnalysis && playAnalysis.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm text-teal-400 uppercase font-bold mb-3 flex items-center gap-2">
              <span>📋</span> Analyse par Système de jeu
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="p-2">Système</th>
                    <th className="p-2 text-center">Poss</th>
                    <th className="p-2 text-center">Tirs</th>
                    <th className="p-2 text-center text-green-400">eFG%</th>
                    <th className="p-2 text-center text-orange-400">Pts/Poss</th>
                    <th className="p-2 text-center text-red-400">BP</th>
                    <th className="p-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {playAnalysis.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-800/50">
                      <td className="p-2 font-bold text-teal-300">{p.name}</td>
                      <td className="p-2 text-center">{p.poss}</td>
                      <td className="p-2 text-center">
                        {p.fgm}/{p.shots}
                      </td>
                      <td className="p-2 text-center text-green-400">{p.eFG}%</td>
                      <td className="p-2 text-center font-bold text-orange-400">{p.ppp}</td>
                      <td className="p-2 text-center text-red-400">{p.tov}</td>
                      <td className="p-2 text-center font-bold text-white">{p.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 8 — Rotation Chart */}
      {game.actions?.length > 0 &&
        game.starters &&
        Object.keys(game.starters).length > 0 &&
        debugMode && window.RotationChart && <window.RotationChart game={game} players={players} />}

      {/* 9 — Clutch Performance */}
      <ClutchPanel game={game} players={players} />

      {/* 10 — On/Off Impact */}
      <OnOffPanel game={game} players={players} />

      {/* 11 — Notes coach */}
      {isAdmin && (
        <div className="mt-3">
          <textarea
            value={gameNotes}
            onChange={(e) => setGameNotes(e.target.value)}
            onBlur={() => {
              if (window.db && game.id) {
                game.coachNotes = gameNotes;
                window.DB.saveGame(game).catch(() => {});
              }
            }}
            placeholder="Notes du coach..."
            className="bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 p-3 w-full min-h-[80px] outline-none focus:border-orange-500"
          />
        </div>
      )}

      {/* 12 — Video PBP */}
      {game.actions?.length > 0 && isAdmin && <VideoSettingsPanel game={game} />}
      {game.actions?.length > 0 && <VideoPlayByPlay game={game} players={players} />}
    </window.Modal>
  );
}

window.GameDetailsModal = GameDetailsModal;
