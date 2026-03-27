import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // LIGNE À AJOUTER
import { createRoot } from 'react-dom/client';
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
import { useAuthStore, useDataStore, useUIStore } from './src/stores';
import { useFirebaseSync } from './src/db/use-firebase-sync';
import { DB } from './src/db/firebase';
import Home from './Home.jsx';
import Settings from './Settings.jsx';
import SeasonSetup from './SeasonSetup.jsx';
import TeamPicker from './TeamPicker.jsx';

// ==========================================
// ZONE DE CONFIGURATION AUTOMATIQUE
// ==========================================
const CLIP_SERVER_URL = 'https://clips.jeelz-software.ovh'; // Renseigner l'URL du VPS quand déployé, ex: 'https://clips.mondomaine.com'

const PRECONFIGURED_FIREBASE = {
  apiKey: 'AIzaSyBaA99che1oz9BHc23IhiFoY-nK0xvg4q4',
  authDomain: 'statu18elite.firebaseapp.com',
  projectId: 'statu18elite',
  storageBucket: 'statu18elite.firebasestorage.app',
  messagingSenderId: '862850988986',
  appId: '1:862850988986:web:935de245b5c13e29f6fb83',
  measurementId: 'G-ZDBRV7JEPN',
};

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const months = {
    janv: 0,
    jan: 0,
    janvier: 0,
    fevr: 1,
    fev: 1,
    fevrier: 1,
    mars: 2,
    mar: 2,
    avr: 3,
    avril: 3,
    mai: 4,
    juin: 5,
    juil: 6,
    jul: 6,
    juillet: 6,
    aout: 7,
    sept: 8,
    sep: 8,
    septembre: 8,
    oct: 9,
    octobre: 9,
    nov: 10,
    novembre: 10,
    dec: 11,
    decembre: 11,
  };
  const match = dateStr.match(/(\d{1,2})\s+([a-z\u00e9\u00fb\u00f4]+)\.?\s+(\d{4})/i);
  if (match) {
    const m =
      months[
        match[2]
          .toLowerCase()
          .replace('.', '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      ];
    if (m !== undefined) return new Date(match[3], m, match[1]);
  }
  const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return new Date(slash[3], slash[2] - 1, slash[1]);
  return new Date(dateStr);
};

function MinutesDebugPanel({ game, players }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const QT_DURATION = 600;

  const isOpponent = (pid) => {
    if (pid === 'OPP') return true;
    const n = typeof pid === 'number' ? pid : parseInt(pid);
    return !isNaN(n) && n >= 1000;
  };

  const parseId = (val) => {
    if (val === 'OPP') return 'OPP';
    const p = parseInt(val);
    return isNaN(p) ? val : p;
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const debugData = useMemo(() => {
    if (!game) return null;

    const actions = game.actions || [];
    const homeStarters = game.starters || {};
    const oppStarters = game.opponentStarters || {};
    const allSubs = actions.filter((a) => a.type === 'SUB');

    // Detect quarters
    const qSet = new Set(actions.map((a) => a.q || 1));
    [1, 2, 3, 4].forEach((q) => qSet.add(q));
    const quarters = Array.from(qSet).sort((a, b) => a - b);

    // Build player name map
    const names = {};
    if (game.playerStats) {
      Object.entries(game.playerStats).forEach(([id, s]) => {
        const p = players.find((x) => String(x.id) === String(id));
        names[id] = p ? `#${p.number} ${p.name}` : `#${id}`;
      });
    }
    if (game.opponentPlayerStats) {
      Object.entries(game.opponentPlayerStats).forEach(([id, s]) => {
        names[id] = `[OPP] #${s.number || parseInt(id) - 1000} ${s.name || ''}`.trim();
      });
    }

    // Simulate per-player per-quarter segments
    const playerSegments = {}; // pid -> [{q, start, end, duration}]
    const warnings = []; // [{pid, q, msg, severity}]

    function simulateTeam(startersData, belongsFn, teamLabel) {
      quarters.forEach((q) => {
        const starterIds = (startersData[q] || []).map(parseId);
        const onCourt = new Set(starterIds);

        if (starterIds.length === 0) {
          warnings.push({
            pid: null,
            q,
            msg: `${teamLabel} Q${q}: Aucun starter defini`,
            severity: 'error',
          });
          return;
        }
        if (starterIds.length !== 5) {
          warnings.push({
            pid: null,
            q,
            msg: `${teamLabel} Q${q}: ${starterIds.length} starters (attendu: 5)`,
            severity: 'warn',
          });
        }

        starterIds.forEach((pid) => {
          if (!playerSegments[pid]) playerSegments[pid] = [];
        });

        const qSubs = actions
          .filter(
            (a) => (a.q || 1) === q && a.type === 'SUB' && belongsFn(parseId(a.pid ?? a.playerId))
          )
          .map((a) => ({ ...a, time: a.time || 0 }))
          .sort((a, b) => b.time - a.time);

        let lastTime = QT_DURATION;

        qSubs.forEach((sub) => {
          const currentTime = sub.time;
          const duration = lastTime - currentTime;
          const pIn = parseId(sub.pid ?? sub.playerId);
          const pOut = parseId(sub.subOut);

          // Credit time to everyone on court
          if (duration > 0) {
            onCourt.forEach((p) => {
              if (!playerSegments[p]) playerSegments[p] = [];
              playerSegments[p].push({ q, start: lastTime, end: currentTime, duration });
            });
          } else if (duration < 0) {
            warnings.push({
              pid: pIn,
              q,
              msg: `Q${q} Duree negative: ${duration}s (lastTime=${fmt(lastTime)}, sub.time=${fmt(currentTime)})`,
              severity: 'error',
            });
          }

          // Validate sub
          if (pOut && !onCourt.has(pOut)) {
            warnings.push({
              pid: pOut,
              q,
              msg: `Q${q} ${fmt(currentTime)}: Sorti mais n'etait PAS sur le terrain`,
              severity: 'error',
            });
          }
          if (pIn && onCourt.has(pIn)) {
            warnings.push({
              pid: pIn,
              q,
              msg: `Q${q} ${fmt(currentTime)}: Entre mais etait DEJA sur le terrain`,
              severity: 'warn',
            });
          }

          if (pOut) onCourt.delete(pOut);
          if (pIn) {
            onCourt.add(pIn);
            if (!playerSegments[pIn]) playerSegments[pIn] = [];
          }

          lastTime = currentTime;
        });

        // Final segment -> 0:00
        if (lastTime > 0) {
          onCourt.forEach((p) => {
            if (!playerSegments[p]) playerSegments[p] = [];
            playerSegments[p].push({ q, start: lastTime, end: 0, duration: lastTime });
          });
        }
      });
    }

    simulateTeam(homeStarters, (pid) => !isOpponent(pid), 'DOM');
    simulateTeam(oppStarters, (pid) => isOpponent(pid), 'OPP');

    // Aggregate per player
    const playerResults = [];
    const allPids = new Set([
      ...Object.keys(game.playerStats || {}),
      ...Object.keys(playerSegments),
    ]);

    allPids.forEach((pidStr) => {
      const pid = parseId(pidStr);
      if (isOpponent(pid)) return; // Home only for clarity

      const segments = playerSegments[pidStr] || playerSegments[pid] || [];
      const calcSec = segments.reduce((sum, s) => sum + s.duration, 0);
      const calcMin = Math.round(calcSec / 60);
      const storedMin = game.playerStats?.[pidStr]?.minutes || 0;
      const diff = calcMin - storedMin;
      const name = names[pidStr] || names[pid] || `#${pidStr}`;
      const p = players.find((x) => String(x.id) === String(pidStr));
      const number = p?.number || pidStr;

      const perQ = {};
      quarters.forEach((q) => {
        const qSegs = segments.filter((s) => s.q === q);
        perQ[q] = {
          segments: qSegs,
          totalSec: qSegs.reduce((sum, s) => sum + s.duration, 0),
        };
      });

      const hasError =
        diff !== 0 ||
        warnings.some((w) => String(w.pid) === String(pidStr) || String(w.pid) === String(pid));

      playerResults.push({
        pid: pidStr,
        name,
        number,
        segments,
        perQ,
        calcSec,
        calcMin,
        storedMin,
        diff,
        hasError,
      });
    });

    playerResults.sort((a, b) => {
      if (a.hasError && !b.hasError) return -1;
      if (!a.hasError && b.hasError) return 1;
      return b.calcSec - a.calcSec;
    });

    return { playerResults, warnings, quarters, allSubs };
  }, [game, players]);

  if (!debugData) return null;
  if (!game?.actions?.length) {
    return React.createElement(
      'div',
      { className: 'text-center text-slate-500 text-sm py-4' },
      "Pas d'actions disponibles pour le debug minutes"
    );
  }

  const { playerResults, warnings, quarters, allSubs } = debugData;
  const displayed = showOnlyErrors ? playerResults.filter((p) => p.hasError) : playerResults;
  const errorCount = playerResults.filter((p) => p.hasError).length;
  const subCount = allSubs.length;

  // ---- RENDER HELPERS ----

  const renderTimelineBar = (perQ, q) => {
    const data = perQ[q];
    if (!data || data.segments.length === 0) {
      return React.createElement(
        'div',
        {
          className:
            'h-6 bg-slate-800 rounded border border-slate-700 flex items-center justify-center',
          title: `Q${q}: pas sur le terrain`,
        },
        React.createElement('span', { className: 'text-[9px] text-slate-600' }, '—')
      );
    }

    return React.createElement(
      'div',
      {
        className: 'h-6 bg-slate-800 rounded border border-slate-700 relative overflow-hidden',
        title: `Q${q}: ${fmt(data.totalSec)} (${data.segments.length} segment${data.segments.length > 1 ? 's' : ''})`,
      },
      data.segments.map((seg, i) => {
        const left = ((QT_DURATION - seg.start) / QT_DURATION) * 100;
        const width = (seg.duration / QT_DURATION) * 100;
        return React.createElement('div', {
          key: i,
          className: 'absolute top-0 bottom-0 bg-green-500/70 border-r border-green-400/50',
          style: { left: `${left}%`, width: `${Math.max(width, 1)}%` },
          title: `${fmt(seg.start)} -> ${fmt(seg.end)} = ${fmt(seg.duration)}`,
        });
      }),
      React.createElement(
        'span',
        {
          className:
            'absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white z-10 drop-shadow',
        },
        fmt(data.totalSec)
      )
    );
  };

  const renderSegmentDetail = (player) => {
    return React.createElement(
      'div',
      { className: 'mt-2 bg-slate-950 rounded p-3 border border-slate-700 text-[11px] font-mono' },
      quarters.map((q) => {
        const qData = player.perQ[q];
        if (!qData || qData.segments.length === 0) return null;
        return React.createElement(
          'div',
          { key: q, className: 'mb-2' },
          React.createElement(
            'div',
            { className: 'text-slate-500 font-bold mb-1' },
            `Q${q} — ${qData.segments.length} segment(s) — Total: ${fmt(qData.totalSec)}`
          ),
          qData.segments.map((seg, i) =>
            React.createElement(
              'div',
              { key: i, className: 'flex gap-3 text-slate-400 ml-3' },
              React.createElement('span', null, `Seg${i + 1}:`),
              React.createElement(
                'span',
                { className: 'text-cyan-400' },
                `${fmt(seg.start)} → ${fmt(seg.end)}`
              ),
              React.createElement(
                'span',
                { className: 'text-green-400 font-bold' },
                `= ${fmt(seg.duration)} (${seg.duration}s)`
              )
            )
          )
        );
      }),
      // Warnings for this player
      warnings
        .filter((w) => String(w.pid) === String(player.pid))
        .map((w, i) =>
          React.createElement(
            'div',
            {
              key: `w-${i}`,
              className: `mt-1 px-2 py-1 rounded text-[10px] font-bold ${w.severity === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'}`,
            },
            `⚠ ${w.msg}`
          )
        )
    );
  };

  // ---- MAIN RENDER ----
  return React.createElement(
    'div',
    { className: 'bg-slate-900 border border-slate-700 rounded-xl p-4' },
    // Header
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-4' },
      React.createElement(
        'div',
        null,
        React.createElement(
          'h3',
          { className: 'text-white font-bold text-sm flex items-center gap-2' },
          '🔍 Debug Temps de Jeu'
        ),
        React.createElement(
          'p',
          { className: 'text-slate-500 text-[11px] mt-1' },
          `${allSubs.length} SUBs detectes | ${playerResults.length} joueurs | ${errorCount} anomalie${errorCount > 1 ? 's' : ''}`
        )
      ),
      React.createElement(
        'div',
        { className: 'flex gap-2' },
        React.createElement(
          'button',
          {
            className: `px-3 py-1 rounded text-xs font-bold border ${showOnlyErrors ? 'bg-red-900/50 border-red-500 text-red-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`,
            onClick: () => setShowOnlyErrors(!showOnlyErrors),
          },
          showOnlyErrors ? `Erreurs (${errorCount})` : 'Filtrer erreurs'
        )
      )
    ),

    // Global warnings
    warnings.filter((w) => !w.pid).length > 0 &&
      React.createElement(
        'div',
        { className: 'mb-3 space-y-1' },
        warnings
          .filter((w) => !w.pid)
          .map((w, i) =>
            React.createElement(
              'div',
              {
                key: i,
                className: `px-3 py-1.5 rounded text-xs font-bold ${w.severity === 'error' ? 'bg-red-900/40 text-red-300 border border-red-700' : 'bg-yellow-900/40 text-yellow-300 border border-yellow-700'}`,
              },
              `⚠ ${w.msg}`
            )
          )
      ),

    // Quarter headers
    React.createElement(
      'div',
      {
        className: 'grid gap-1 mb-2',
        style: { gridTemplateColumns: `180px repeat(${quarters.length}, 1fr) 80px 80px 60px` },
      },
      React.createElement(
        'div',
        { className: 'text-[10px] text-slate-600 font-bold uppercase' },
        'Joueur'
      ),
      ...quarters.map((q) =>
        React.createElement(
          'div',
          { key: q, className: 'text-[10px] text-slate-600 font-bold text-center uppercase' },
          `Q${q}`
        )
      ),
      React.createElement(
        'div',
        { className: 'text-[10px] text-slate-600 font-bold text-center uppercase' },
        'Calcule'
      ),
      React.createElement(
        'div',
        { className: 'text-[10px] text-slate-600 font-bold text-center uppercase' },
        'Stocke'
      ),
      React.createElement(
        'div',
        { className: 'text-[10px] text-slate-600 font-bold text-center uppercase' },
        'Diff'
      )
    ),

    // Player rows
    React.createElement(
      'div',
      { className: 'space-y-1' },
      displayed.map((p) =>
        React.createElement(
          'div',
          { key: p.pid },
          React.createElement(
            'div',
            {
              className: `grid gap-1 items-center cursor-pointer rounded px-1 py-0.5 hover:bg-slate-800/50 ${p.hasError ? 'bg-red-950/30' : ''}`,
              style: {
                gridTemplateColumns: `180px repeat(${quarters.length}, 1fr) 80px 80px 60px`,
              },
              onClick: () => setExpandedPlayer(expandedPlayer === p.pid ? null : p.pid),
            },
            // Player name
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement('span', {
                className: `w-2 h-2 rounded-full ${p.hasError ? 'bg-red-500' : 'bg-green-500'}`,
              }),
              React.createElement(
                'span',
                { className: 'text-xs text-white font-semibold truncate' },
                p.name
              )
            ),
            // Timeline bars per Q
            ...quarters.map((q) =>
              React.createElement('div', { key: q }, renderTimelineBar(p.perQ, q))
            ),
            // Calculated
            React.createElement(
              'div',
              { className: 'text-center' },
              React.createElement(
                'span',
                { className: 'text-sm font-bold text-cyan-400' },
                `${p.calcMin}min`
              ),
              React.createElement(
                'div',
                { className: 'text-[9px] text-slate-500' },
                `(${p.calcSec}s)`
              )
            ),
            // Stored
            React.createElement(
              'div',
              { className: 'text-center' },
              React.createElement(
                'span',
                { className: 'text-sm font-bold text-slate-300' },
                `${p.storedMin}min`
              )
            ),
            // Diff
            React.createElement(
              'div',
              { className: 'text-center' },
              React.createElement(
                'span',
                {
                  className: `text-sm font-bold ${p.diff === 0 ? 'text-green-400' : Math.abs(p.diff) <= 1 ? 'text-yellow-400' : 'text-red-400'}`,
                },
                p.diff === 0 ? '✓' : `${p.diff > 0 ? '+' : ''}${p.diff}`
              )
            )
          ),
          // Expanded detail
          expandedPlayer === p.pid && renderSegmentDetail(p)
        )
      )
    ),

    // Legend
    React.createElement(
      'div',
      {
        className:
          'mt-4 pt-3 border-t border-slate-700 flex flex-wrap gap-4 text-[10px] text-slate-500',
      },
      React.createElement('span', null, '🟢 Vert = sur le terrain'),
      React.createElement('span', null, '⬛ Gris = hors terrain'),
      React.createElement('span', null, '✓ = stocke == calcule'),
      React.createElement('span', null, '🔴 = anomalie detectee'),
      React.createElement('span', null, 'Cliquer un joueur = detail des segments')
    )
  );
}
// ===========================================
// FONCTIONS DE CALCUL DES RATINGS AVANCES
// ===========================================
// --- UTILITAIRE : Recalcul minutes depuis les SUBs ---
const QT_DURATION_SEC = 600;

function recalcMinutesFromSubsUtil(actions, homeStartersData, oppStartersData, totalQTs) {
  const playTime = {};
  const maxQ = totalQTs || 4;

  const _parseId = (v) => {
    if (v === 'OPP') return 'OPP';
    const n = parseInt(v);
    return isNaN(n) ? v : n;
  };
  const _isOpp = (pid) => {
    if (pid === 'OPP') return true;
    const n = typeof pid === 'number' ? pid : parseInt(pid);
    return !isNaN(n) && n >= 1000;
  };

  function calcForTeam(startersData, belongsToTeam) {
    for (let q = 1; q <= maxQ; q++) {
      const starters = startersData && startersData[q] ? startersData[q].map(_parseId) : [];

      const onCourt = new Set(starters);
      starters.forEach((pid) => {
        if (playTime[pid] === undefined) playTime[pid] = 0;
      });

      const qSubs = actions
        .filter(
          (a) =>
            (a.q || 1) === q && a.type === 'SUB' && belongsToTeam(_parseId(a.pid ?? a.playerId))
        )
        .map((a) => ({ ...a, time: a.time || 0 }))
        .sort((a, b) => b.time - a.time);

      let lastTime = QT_DURATION_SEC;

      qSubs.forEach((sub) => {
        const currentTime = sub.time;
        const duration = lastTime - currentTime;

        if (duration > 0) {
          onCourt.forEach((p) => {
            if (playTime[p] === undefined) playTime[p] = 0;
            playTime[p] += duration;
          });
        }

        const pIn = _parseId(sub.pid ?? sub.playerId);
        const pOut = _parseId(sub.subOut);

        if (pOut) onCourt.delete(pOut);
        if (pIn) {
          onCourt.add(pIn);
          if (playTime[pIn] === undefined) playTime[pIn] = 0;
        }

        lastTime = currentTime;
      });

      if (lastTime > 0) {
        onCourt.forEach((p) => {
          if (playTime[p] === undefined) playTime[p] = 0;
          playTime[p] += lastTime;
        });
      }
    }
  }

  calcForTeam(homeStartersData, (pid) => !_isOpp(pid));
  calcForTeam(oppStartersData, (pid) => _isOpp(pid));

  const result = {};
  Object.entries(playTime).forEach(([pid, sec]) => {
    result[pid] = Math.round(sec / 60);
  });
  return result;
}
const calculateHGI = (
  playerStats,
  allGames,
  playerId,
  weights = { PT: 0.35, RP: 0.4, SI: 0.25 }
) => {
  const stats = playerStats;
  if (!stats) return { total: 0, PT: 0, RP: 0, SI: 0 };
  const threePct = (stats.threePA || 0) > 0 ? (stats.threePM || 0) / stats.threePA : 0;
  const PT = threePct * (stats.threePA || 0) * 1.5;
  const driveAtt = stats.driveAtt || 0;
  const driveMade = stats.driveMade || 0;
  const drivePct = driveAtt > 0 ? driveMade / driveAtt : 0;
  const RP = driveAtt * drivePct;
  const SI = calculateSpacingImpact(allGames, playerId);
  const total = weights.PT * PT + weights.RP * RP + weights.SI * SI;
  return {
    total: Math.round(total * 10) / 10,
    PT: Math.round(PT * 10) / 10,
    RP: Math.round(RP * 10) / 10,
    SI: Math.round(SI * 10) / 10,
  };
};

const calculateSpacingImpact = (games, playerId) => {
  let onFGM = 0,
    onFGA = 0,
    on3PM = 0;
  let offFGM = 0,
    offFGA = 0,
    off3PM = 0;
  games.forEach((game) => {
    if (!game.actions || !game.playerStats) return;
    game.actions.forEach((action) => {
      if (action.type !== 'SHOT') return;
      const shooterId = action.playerId || action.pid;
      if (!shooterId || shooterId >= 1000) return;
      const onCourt = action.onCourt || [];
      const playerOnCourt = onCourt.includes(playerId) || onCourt.includes(String(playerId));
      const made = action.made ? 1 : 0;
      const is3 = action.val === 3;
      if (playerOnCourt) {
        onFGA++;
        onFGM += made;
        if (is3 && made) on3PM++;
      } else {
        offFGA++;
        offFGM += made;
        if (is3 && made) off3PM++;
      }
    });
  });
  const onEFG = onFGA >= 10 ? window.StatsEngine.eFG(onFGM, on3PM, onFGA) : 0;
  const offEFG = offFGA >= 10 ? window.StatsEngine.eFG(offFGM, off3PM, offFGA) : 0;
  if (onFGA < 10 || offFGA < 10) return 0;
  return onEFG - offEFG;
};

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
    fga = 0,
    fgm = 0,
    fta = 0,
    ftm = 0,
    tov = 0,
    ast = 0;
  let threePA = 0,
    threePM = 0;

  pa.forEach((a) => {
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
    fga,
    fgm,
    fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
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
    let fga = 0,
      fgm = 0,
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
          fga++;
          if (a.made) {
            fgm++;
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

    const poss = Math.max(window.StatsEngine.possSimple(fga, fta, tov, orb), 1);
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

// ==========================================
const generateId = () => Math.random().toString(36).substr(2, 9);
const defaultPlayers = [
  { id: 1, name: 'Joueur 1', number: 4, pos: 'PG' },
  { id: 2, name: 'Joueur 2', number: 5, pos: 'SG' },
];
const DEFAULT_PHASES = [
  { id: 'phase1', name: 'Phase 1' },
  { id: 'phase2', name: 'Phase 2' },
];

// --- FIX #2 : fgm/fga = 2PT ONLY. 3PT dans threePM/threePA ---
const recalculateGameStats = (actions, players) => {
  const pStats = {};
  players.forEach((p) => {
    pStats[p.id] = {
      pts: 0,
      reb: 0,
      oreb: 0,
      dreb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      tov: 0,
      fga: 0,
      fgm: 0,
      fta: 0,
      ftm: 0,
      pf: 0,
      minutes: 0,
      plusMinus: 0,
      threePM: 0,
      threePA: 0,
    };
  });
  const oppStats = {
    pts: 0,
    reb: 0,
    ast: 0,
    tov: 0,
    fouls: 0,
    fga: 0,
    fgm: 0,
    fta: 0,
    ftm: 0,
    oreb: 0,
  };
  let home = 0,
    away = 0;
  actions.forEach((act) => {
    const { type, playerId, consequence, onCourt } = act;
    let ptsScored = 0,
      ptsConceded = 0;
    if (playerId === 'OPP') {
      if (type === 'FGM1') {
        oppStats.pts++;
        oppStats.ftm++;
        oppStats.fta++;
        away++;
        ptsConceded = 1;
      }
      if (type === 'FGA1') oppStats.fta++;
      if (type === 'FGM2') {
        oppStats.pts += 2;
        oppStats.fgm++;
        oppStats.fga++;
        away += 2;
        ptsConceded = 2;
      }
      if (type === 'FGA2') oppStats.fga++;
      if (type === 'FGM3') {
        oppStats.pts += 3;
        oppStats.fgm++;
        oppStats.fga++;
        away += 3;
        ptsConceded = 3;
      }
      if (type === 'FGA3') oppStats.fga++;
      if (type === 'OREB') {
        oppStats.reb++;
        oppStats.oreb++;
      }
      if (type === 'DREB') oppStats.reb++;
      if (type === 'AST') oppStats.ast++;
      if (type === 'TOV') oppStats.tov++;
      if (type === 'PF') oppStats.fouls++;
      if (consequence?.includes('score')) {
        const val = parseInt(consequence.split('_')[1]);
        home += val;
        ptsScored = val;
      }
    } else if (pStats[playerId]) {
      const ps = pStats[playerId];
      if (type === 'FGM1') {
        ps.pts++;
        ps.ftm++;
        ps.fta++;
        home++;
        ptsScored = 1;
      }
      if (type === 'FGA1') ps.fta++;
      // FIX: fgm/fga = 2PT seulement
      if (type === 'FGM2') {
        ps.pts += 2;
        ps.fgm++;
        ps.fga++;
        home += 2;
        ptsScored = 2;
      }
      if (type === 'FGA2') ps.fga++;
      // FIX: 3PT ne touche PAS fgm/fga, seulement threePM/threePA
      if (type === 'FGM3') {
        ps.pts += 3;
        ps.threePM++;
        ps.threePA++;
        home += 3;
        ptsScored = 3;
      }
      if (type === 'FGA3') ps.threePA++;
      if (type === 'OREB') {
        ps.reb++;
        ps.oreb++;
      }
      if (type === 'DREB') {
        ps.reb++;
        ps.dreb++;
      }
      if (type === 'AST') ps.ast++;
      if (type === 'STL') ps.stl++;
      if (type === 'BLK') ps.blk++;
      if (type === 'TOV') ps.tov++;
      if (type === 'PF') ps.pf++;
      if (consequence?.includes('score')) {
        const val = parseInt(consequence.split('_')[1]);
        away += val;
        ptsConceded = val;
      }
    }
    if (onCourt?.length)
      onCourt.forEach((pid) => {
        if (pStats[pid]) pStats[pid].plusMinus += ptsScored - ptsConceded;
      });
  });
  return { playerStats: pStats, opponentStats: oppStats, homeScore: home, awayScore: away };
};

/*const saveDataToCloud = (db, collection, data) => {
  if (!db) return Promise.resolve();
  return db.collection('team_data').doc(collection).set({ list: data });
};*/

// --- ICONS ---
const Icon = ({ path, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={path} />
  </svg>
);
const Icons = {
  Home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  Play: 'M5 3l14 9-14 9V3z',
  Pause: 'M10 9v6 M14 9v6',
  Trash: 'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  Chart: 'M18 20V10 M12 20V4 M6 20v-6',
  Plus: 'M12 5v14M5 12h14',
  Eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  Check: 'M20 6L9 17l-5-5',
  Edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  Upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  Cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
  Filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  Layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  Users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  TrendingUp: 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6',
  Trophy:
    'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 22V9 M14 22V9 M8 9h8a4 4 0 0 0 4-4V4H4v1a4 4 0 0 0 4 4z',
  Target:
    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  Settings:
    'M12.22 2h-.44a2 2 0 0 1-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  Clipboard:
    'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z',
  Activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
};

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  <div
    className={`bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden hover:border-orange-500/25 transition-colors ${className}`}
  >
    {children}
  </div>
);
const Button = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
  size = 'md',
  disabled = false,
}) => {
  const base =
    'font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer';
  const variants = {
    primary:
      'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-300 hover:to-orange-400 text-slate-950',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    ghost: 'bg-transparent hover:bg-slate-700 text-slate-400',
  };
  const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-lg' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50' : ''}`}
    >
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'max-w-4xl' }) => {
  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      style={{ zIndex: 999999 }}
    >
      <div
        className={`bg-slate-800 rounded-xl border border-slate-600 w-full ${size} shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col`}
      >
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-700 shrink-0">
          <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2 truncate pr-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl sm:text-3xl leading-none cursor-pointer shrink-0 w-8 h-8 flex items-center justify-center"
          >
            &times;
          </button>
        </div>
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body
  );
};
window.parseDate = parseDate;
window.Icons = Icons;
window.Icon = Icon;
window.Card = Card;
window.Button = Button;
window.Modal = Modal;
// --- PARSE HTML ---
const parseHTMLStats = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const date =
    doc.querySelector('#game-date span.detail')?.textContent || new Date().toLocaleDateString();
  let homeName =
    doc.querySelector('#team-names-container .left span.detail')?.textContent || 'Nous';
  let awayName =
    doc.querySelector('#team-names-container .right span.detail')?.textContent || 'Adversaire';
  let homeScore = parseInt(doc.querySelector('#team-score-left .title')?.textContent || '0');
  let awayScore = parseInt(doc.querySelector('#team-score-right .title')?.textContent || '0');
  let opponentName = awayName,
    myScore = homeScore,
    oppScore = awayScore;
  if (homeName.toLowerCase().includes('champagne') || homeName.toLowerCase().includes('basket')) {
    opponentName = awayName;
    myScore = homeScore;
    oppScore = awayScore;
  } else if (
    awayName.toLowerCase().includes('champagne') ||
    awayName.toLowerCase().includes('basket')
  ) {
    opponentName = homeName;
    myScore = awayScore;
    oppScore = homeScore;
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
      if (nameCell.includes(opponentName)) {
        opponentStats = { pts: parseInt(cells[16].textContent) || 0 };
        return;
      }
      if (!nameCell.startsWith('#')) return;
      const parts = nameCell.split(' ');
      const number = parseInt(parts[0].replace('#', ''));
      const name = parts.slice(1).join(' ');
      const parseSplit = (txt) => {
        if (!txt || txt === '-') return { made: 0, att: 0 };
        const [m, a] = txt.split('-');
        return { made: parseInt(m) || 0, att: parseInt(a) || 0 };
      };
      const fg = parseSplit(cells[1].textContent);
      const tp = parseSplit(cells[3].textContent);
      const ft = parseSplit(cells[5].textContent);
      // fgm/fga = 2PT only (on soustrait les 3PT du total FG)
      const stats = {
        fgm: fg.made - tp.made,
        fga: fg.att - tp.att,
        ftm: ft.made,
        fta: ft.att,
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
        threePM: tp.made,
        threePA: tp.att,
      };
      rawPlayers.push({ name, number, stats });
    });
  }
  return {
    meta: { date, opponent: opponentName, homeScore: myScore, awayScore: oppScore },
    rawPlayers,
    opponentStats,
  };
};

// --- Utilitaires A2 : buildScoreHistory + detectRuns ---
function buildScoreHistoryFromActions(actions, players) {
  const homePids = new Set(players.map((p) => p.id));
  let home = 0,
    away = 0;
  const history = [{ time: 600, q: 1, home: 0, away: 0, onCourt: null }];
  const sorted = [...actions].sort((a, b) => {
    if ((a.q || 1) !== (b.q || 1)) return (a.q || 1) - (b.q || 1);
    return (b.time || 0) - (a.time || 0);
  });
  sorted.forEach((a) => {
    const pid = a.pid ?? a.playerId;
    const isHome = homePids.has(pid) || (typeof pid === 'number' && pid < 1000);
    let pts = 0;
    if (a.type === 'SHOT' && a.made) pts = a.val || 2;
    if (a.type === 'FT' && (a.ftMade || 0) > 0) pts = a.ftMade;
    if (pts > 0) {
      if (isHome) home += pts;
      else away += pts;
      history.push({ time: a.time || 0, q: a.q || 1, home, away, onCourt: a.onCourt ?? null });
    }
  });
  return history;
}
window.buildScoreHistoryFromActions = buildScoreHistoryFromActions;

function detectRuns(history, players) {
  if (!history || history.length < 2) return [];
  const runs = [];
  let i = 1;
  while (i < history.length) {
    const startH = history[i - 1].home,
      startA = history[i - 1].away;
    // Check home run
    let j = i;
    while (j < history.length && history[j].away === startA) j++;
    const homeRun = history[j - 1].home - startH;
    if (homeRun >= 6) {
      const startQ = history[i - 1].q,
        endQ = history[j - 1].q;
      const startTime = history[i - 1].time,
        endTime = history[j - 1].time;
      const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
      runs.push({
        team: 'home',
        pts: homeRun,
        text: `Run ${homeRun}-0 Q${startQ} ${fmtT(startTime)} -> ${endQ !== startQ ? 'Q' + endQ + ' ' : ''}${fmtT(endTime)}`,
      });
      i = j;
      continue;
    }
    // Check away run
    j = i;
    while (j < history.length && history[j].home === startH) j++;
    const awayRun = history[j - 1].away - startA;
    if (awayRun >= 6) {
      const startQ = history[i - 1].q,
        endQ = history[j - 1].q;
      const startTime = history[i - 1].time,
        endTime = history[j - 1].time;
      const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
      runs.push({
        team: 'away',
        pts: awayRun,
        text: `Run 0-${awayRun} Q${startQ} ${fmtT(startTime)} -> ${endQ !== startQ ? 'Q' + endQ + ' ' : ''}${fmtT(endTime)}`,
      });
      i = j;
      continue;
    }
    i++;
  }
  return runs;
}

// --- A6 : Calcul timestamp YouTube ---
function getYouTubeLink(action, videoUrl, settings, allActions) {
  if (!settings || !settings.offsets || !videoUrl) return null;
  const qt = 'q' + (action.q || 1);
  const offset = settings.offsets[qt];
  if (!offset) return null;
  const leadTimes = settings.leadTimes || {};
  const aType = (action.type || '').toLowerCase();
  const leadTime = leadTimes[aType] || leadTimes['default'] || 2;
  const qtDuration = 600;
  const elapsedInQt = qtDuration - (action.time || 0);
  // --- STOPPAGE correction : sommer les durées d'arrêt antérieures dans ce QT ---
  let stoppageTotal = 0;
  if (allActions) {
    allActions.forEach(function (a) {
      if (a.type !== 'STOPPAGE' || !a.duration) return;
      if ((a.q || 1) !== (action.q || 1)) return;
      // STOPPAGE antérieure = chrono >= chrono action (temps décompte)
      if ((a.time || 0) >= (action.time || 0)) {
        stoppageTotal += a.duration;
      }
    });
  }
  let finalSeconds = offset.start + elapsedInQt + stoppageTotal - leadTime;
  finalSeconds = Math.max(finalSeconds, offset.start);
  const baseUrl = videoUrl.includes('?') ? videoUrl : videoUrl + '?';
  const separator = baseUrl.endsWith('?') ? '' : '&';
  return baseUrl + separator + 't=' + Math.floor(finalSeconds);
}

function getYouTubeEmbedUrl(videoUrl, seconds) {
  if (!videoUrl) return null;
  let videoId = null;
  // Format: https://www.youtube.com/watch?v=XXXXXXXXXXX
  const watchMatch = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  // Format: https://youtu.be/XXXXXXXXXXX
  if (!videoId) {
    const shortMatch = videoUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) videoId = shortMatch[1];
  }
  // Format: https://www.youtube.com/embed/XXXXXXXXXXX
  if (!videoId) {
    const embedMatch = videoUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) videoId = embedMatch[1];
  }
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(seconds || 0)}&autoplay=1&rel=0`;
}

async function requestClipExport(videoUrl, videoSettings, actions) {
  if (!CLIP_SERVER_URL) throw new Error('Serveur de clips non configure');

  const segments = actions
    .map((a) => {
      const link = getYouTubeLink(a, videoUrl, videoSettings);
      const tMatch = link ? link.match(/[?&]t=(\d+)/) : null;
      const start = tMatch ? parseInt(tMatch[1]) : 0;

      let label = a.type;
      if (a.type === 'SHOT') label = `Tir_${a.val}pts_${a.made ? 'OK' : 'rate'}`;
      else if (a.type === 'FT') label = `LF_${a.ftMade || 0}_${a.ftAtt || 0}`;
      const pid = a.pid ?? a.playerId;
      label = `Q${a.q || 1}_${label}_J${pid}`;

      return {
        start: Math.max(0, start),
        end: start + 12,
        label,
      };
    })
    .filter((s) => s.start >= 0);

  const resp = await fetch(`${CLIP_SERVER_URL}/api/clips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, segments }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(err.error || `Erreur ${resp.status}`);
  }

  return resp.json();
}

// ============================================================
// 2. MomentumChart
// ============================================================
// AreaChart : différentiel de score (home - away) au fil du temps
// Annotations pour runs ≥ 6-0, zones colorées home/away

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
    const runs = detectRuns(history, matchPlayers || []);

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
// --- IMPORT REVIEW MODAL ---
function ImportReviewModal({ importData, currentPlayers, phases, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState({});
  const [selectedPhase, setSelectedPhase] = useState(phases[0]?.id || 'phase1');

  useEffect(() => {
    const initialMap = {};
    importData.rawPlayers.forEach((imp, idx) => {
      const match = currentPlayers.find((p) => p.number === imp.number);
      initialMap[idx] = match ? match.id : 'NEW';
    });
    setMapping(initialMap);
  }, [importData, currentPlayers]);

  const handleFinalize = () => {
    const finalGameStats = {};
    const newPlayersList = [...currentPlayers];
    let maxId = currentPlayers.length > 0 ? Math.max(...currentPlayers.map((p) => p.id)) : 0;
    importData.rawPlayers.forEach((imp, idx) => {
      const choice = mapping[idx];
      let pid;
      if (choice === 'NEW') {
        maxId++;
        pid = maxId;
        newPlayersList.push({ id: pid, name: imp.name, number: imp.number, pos: 'G' });
      } else if (choice === 'SKIP') return;
      else pid = parseInt(choice);
      finalGameStats[pid] = imp.stats;
    });
    onConfirm(
      {
        id: generateId(),
        ...importData.meta,
        phase: selectedPhase,
        playerStats: finalGameStats,
        opponentStats: importData.opponentStats,
        actions: [],
      },
      newPlayersList
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-4 rounded border border-slate-700">
        <h4 className="text-orange-500 font-bold mb-2">Match: {importData.meta.opponent}</h4>
        <div className="text-white text-sm mb-4">
          Score: {importData.meta.homeScore} - {importData.meta.awayScore}
        </div>
        <div className="bg-slate-800 p-3 rounded border border-orange-500/50">
          <label className="block text-sm font-semibold text-orange-400 mb-2">
            <Icon path={Icons.Layers} className="inline mr-2" />
            Phase
          </label>
          <div className="flex flex-wrap gap-2">
            {phases.map((ph) => (
              <label
                key={ph.id}
                className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${selectedPhase === ph.id ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                <input
                  type="radio"
                  name="phase"
                  value={ph.id}
                  checked={selectedPhase === ph.id}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="hidden"
                />
                {ph.name}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[40vh] space-y-2">
        {importData.rawPlayers.map((imp, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700"
          >
            <div className="w-1/3">
              <div className="text-white font-bold text-sm">
                #{imp.number} {imp.name}
              </div>
              <div className="text-xs text-slate-400">{imp.stats.pts} pts</div>
            </div>
            <div className="flex-1">
              <select
                className="w-full bg-slate-900 text-white text-sm p-2 rounded border border-slate-600"
                value={mapping[idx] || 'NEW'}
                onChange={(e) => setMapping({ ...mapping, [idx]: e.target.value })}
              >
                <option value="NEW">+ Creer</option>
                <option value="SKIP">Ignorer</option>
                {currentPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.number} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="success" onClick={handleFinalize}>
          Confirmer
        </Button>
      </div>
    </div>
  );
}
// --- A6 : Lecture video PBP ---
// REMPLACER la fonction VideoPlayByPlay existante EN ENTIER par ce code.
// L'ancienne commence a : function VideoPlayByPlay({ game, players }) {
// et se termine au } juste avant : // --- S3 : Section Rapport IA ---

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
    } catch (e) {
      console.error('Video settings save error:', e);
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
      <Card className="p-4 border-l-4 border-purple-500">
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
      </Card>
    </div>
  );
}

// --- MODALE DETAILS MATCH ---

function GameDetailsModal({ game, isOpen, onClose, players, isAdmin }) {
  if (!game) return null;
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
      subMinutes = recalcMinutesFromSubsUtil(
        game.actions,
        game.starters || {},
        game.opponentStarters || {},
        maxQ
      );
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Vs ${game.opponent}`} size="max-w-6xl">
      <div className="space-y-4 md:space-y-6">
        {/* Momentum Chart */}
        {((game.scoreHistory && game.scoreHistory.length > 1) ||
          (game.actions && game.actions.length > 0)) && (
          <Card className="p-4">
            <MomentumChart
              scoreHistory={game.scoreHistory}
              actions={game.actions}
              players={players}
              game={game}
            />
          </Card>
        )}

        {/* Score + Ratings (inchangé) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="p-4 text-center col-span-1 md:col-span-2">
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
          </Card>
          <Card className="p-3 md:p-4">
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
          </Card>
        </div>
        {isAdmin && (
          <div className="mt-3">
            <textarea
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              onBlur={() => {
                if (window.db && game.id) {
                  game.coachNotes = gameNotes;
                  window.DB.saveGame(game).catch(function (e) {
                    console.error('Coach notes save error:', e);
                  });
                }
              }}
              placeholder="Notes du coach..."
              className="bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 p-3 w-full min-h-[80px] outline-none focus:border-orange-500"
            />
          </div>
        )}
        {/* --- BANNIÈRE AVERTISSEMENT STATS MANQUANTES --- */}
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
              <Icon path={Icons.Users} className="w-4 h-4" />
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

      {/* A1 — ROTATION CHART */}
      {game.actions?.length > 0 && game.starters && Object.keys(game.starters).length > 0 && window.RotationChart && (
        <window.RotationChart game={game} players={players} />
      )}
      {game.actions?.length > 0 && isAdmin && <VideoSettingsPanel game={game} />}
      {/* A6 — VIDEO PBP (affichage liens) */}
      {game.actions?.length > 0 && <VideoPlayByPlay game={game} players={players} />}
      {/* CLUTCH ANALYSIS */}
      <ClutchPanel game={game} players={players} />

      {/* COÛT DES ERREURS */}
      <ActionCostsPanel game={game} players={players} />

      {/* ON/OFF IMPACT */}
      <OnOffPanel game={game} players={players} />
    </Modal>
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

// ===========================================
// FONCTION PURE — calcActionCosts
// ===========================================

function calcActionCosts(actions, homePlayers) {
  const homeIds = new Set((homePlayers ?? []).map((p) => p.id));
  const isHome = (pid) => pid != null && (homeIds.has(pid) || pid < 1000);
  const isAway = (pid) => pid != null && pid >= 1000;

  let tovCost = 0;
  let foulCost = 0;
  let freeTovs = 0;
  let freeFouls = 0;

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];

    // --- TOV commis par un joueur Home ---
    if (a.type === 'TOV' && isHome(a.pid)) {
      let cost = 0;
      for (let j = i + 1; j < actions.length; j++) {
        const b = actions[j];
        // Changement de possession en faveur de Home → arrêt du comptage
        if (
          (b.type === 'DREB' && isHome(b.pid)) ||
          (b.type === 'SHOT' && isHome(b.pid)) ||
          (b.type === 'STL' && isHome(b.pid)) ||
          (b.type === 'TOV' && isHome(b.pid))
        )
          break;
        // Points adverses sur cette possession
        if (b.type === 'SHOT' && b.made && isAway(b.pid)) cost += b.val;
        if (b.type === 'FT' && isAway(b.pid)) cost += b.ftMade ?? 0;
      }
      if (cost > 0) tovCost += cost;
      else freeTovs++;
    }

    // --- FOUL PERSONAL commis par un joueur Home sur un joueur Away ---
    if (a.type === 'FOUL' && a.foulType === 'PERSONAL' && isHome(a.pid) && isAway(a.victimId)) {
      let cost = 0;
      for (let j = i + 1; j < actions.length; j++) {
        const b = actions[j];
        // Seuls les FT (et pauses neutres) sont attendus après une faute personnelle
        if (b.type !== 'FT' && b.type !== 'TIMEOUT' && b.type !== 'STOPPAGE' && b.type !== 'SUB')
          break;
        if (b.type === 'FT' && isAway(b.pid)) cost += b.ftMade ?? 0;
      }
      if (cost > 0) foulCost += cost;
      else freeFouls++;
    }
  }

  return { tovCost, foulCost, freeErrors: freeTovs + freeFouls };
}

// ===========================================
// COMPOSANT ActionCostsPanel
// ===========================================

function ActionCostsPanel({ game, players }) {
  if (!game?.actions?.length) return null;

  const { tovCost, foulCost, freeErrors } = calcActionCosts(game.actions, players);
  const totalCost = tovCost + foulCost;

  return (
    <Card className="p-4 border-l-4 border-red-500/60">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm text-red-400 uppercase font-bold tracking-wide">Coût des erreurs</h4>
        <span className="text-xs text-slate-500">Points encaissés sur TOV &amp; Fautes</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/60 rounded-lg p-3 text-center border border-red-900/40">
          <div className="text-2xl font-bold text-red-400">{tovCost}</div>
          <div className="text-xs text-slate-400 mt-1">Pertes de balle</div>
          <div className="text-[10px] text-slate-500">pts encaissés</div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-3 text-center border border-orange-900/40">
          <div className="text-2xl font-bold text-orange-400">{foulCost}</div>
          <div className="text-xs text-slate-400 mt-1">Fautes</div>
          <div className="text-[10px] text-slate-500">pts encaissés</div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-3 text-center border border-green-900/40">
          <div className="text-2xl font-bold text-green-400">{freeErrors}</div>
          <div className="text-xs text-slate-400 mt-1">Sans conséquence</div>
          <div className="text-[10px] text-slate-500">erreurs (0 pt)</div>
        </div>
      </div>
      {totalCost > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-2">
          <span className="text-xs text-slate-500">Total :</span>
          <span className="text-sm font-semibold text-red-300">
            {totalCost} pts offerts à l'adversaire
          </span>
        </div>
      )}
    </Card>
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

// --- HISTORY ---
function History({
  games,
  players,
  setGames,
  phases,
  onEditGame,
  onImportClick,
  onMultiImport,
  isAdmin,
}) {
  const [selectedGame, setSelectedGame] = useState(null);
  useEffect(() => {
    if (selectedGame) {
      const fresh = games.find((g) => g.id === selectedGame.id);
      if (fresh && fresh !== selectedGame) setSelectedGame(fresh);
    }
  }, [games]);
  const [editingPBP, setEditingPBP] = useState(null);
  const sortedGames = useMemo(
    () => [...games].sort((a, b) => parseDate(b.date) - parseDate(a.date)),
    [games]
  );

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {isAdmin && (
        <div className="flex justify-end gap-2 no-print flex-wrap">
          <a
            href="live.html"
            className="font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
          >
            <Icon path={Icons.Play} /> Nouveau Match
          </a>
          <Button variant="secondary" onClick={onMultiImport}>
            <Icon path={Icons.Upload} /> Multi-Import
          </Button>
          <Button variant="primary" onClick={onImportClick}>
            <Icon path={Icons.Upload} /> Importer
          </Button>
        </div>
      )}
      {sortedGames.length === 0 && (
        <div className="text-center text-slate-500 py-10">Aucun match enregistre</div>
      )}
      {sortedGames.map((g) => (
        <Card
          key={g.id}
          className="p-0 overflow-hidden group hover:border-orange-500/50 transition-colors"
        >
          <div className="flex justify-between items-stretch">
            <div
              className="flex-1 p-3 md:p-4 cursor-pointer group-hover:bg-slate-800/80 transition-colors"
              onClick={() => setSelectedGame(g)}
            >
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>{g.date}</span>
                {g.phase && (
                  <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs">
                    {phases.find((p) => p.id === g.phase)?.name}
                  </span>
                )}
              </div>
              <div className="text-lg md:text-xl font-bold text-white mt-1">
                <span className="text-green-400">{g.homeScore}</span> -{' '}
                <span className="text-red-400">{g.awayScore}</span>
                <span className="text-slate-300 ml-2 text-base font-normal truncate max-w-[150px] md:max-w-none inline-block align-bottom">
                  vs {g.opponent}
                </span>
              </div>
              <div className="text-xs text-orange-500/0 group-hover:text-orange-500 transition-all mt-2 flex items-center gap-1">
                <Icon path={Icons.Eye} className="w-3 h-3" /> Voir stats
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-col justify-center gap-2 p-2 bg-slate-900/50 border-l border-slate-700">
                {g.actions?.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Reprendre le match vs ${g.opponent} en live ?`)) {
                        var wk = sessionStorage.getItem('statchamp_wk') || '';
                        window.location.href =
                          'live.html?resume=' + g.id + '&wk=' + encodeURIComponent(wk);
                      }
                    }}
                  >
                    <Icon path={Icons.Play} /> Live
                  </Button>
                )}
                {g.actions?.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPBP(g);
                    }}
                  >
                    <Icon path={Icons.Edit} /> PBP
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Supprimer ?')) {
                      const newG = games.filter(function (x) {
                        return x.id !== g.id;
                      });
                      setGames(newG);
                      if (window.db) {
                        window.DB.deleteGame(g.id).catch(function (e) {
                          console.error('Delete game error:', e);
                        });
                      }
                    }
                  }}
                >
                  <Icon path={Icons.Trash} />
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
      <GameDetailsModal
        game={selectedGame}
        isOpen={!!selectedGame}
        onClose={() => setSelectedGame(null)}
        players={players}
        isAdmin={isAdmin}
      />
      {editingPBP && window.PlayByPlayEditor && (
        <PlayByPlayEditor
          game={editingPBP}
          players={players}
          onSave={async (updatedGame) => {
            const idx = games.findIndex((g) => g.id === updatedGame.id);
            if (idx < 0) return;
            const newGames = [...games];
            newGames[idx] = updatedGame;
            setGames(newGames);
            if (window.db) {
              await window.DB.saveGame(updatedGame);
            }
            setEditingPBP(null);
          }}
          onClose={() => setEditingPBP(null)}
        />
      )}
    </div>
  );
}

// Settings est désormais dans Settings.jsx (importé en haut)

// --- LOGIN MODAL (B8) ---
function LoginModal({ isOpen, onLogin, onClose }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;
  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Identifiant et mot de passe requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onLogin(identifier.trim(), password.trim());
      onClose();
    } catch {
      setError('Identifiant ou mot de passe incorrect');
      setLoading(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Accès Coach" size="max-w-sm">
      <div className="space-y-4 p-2">
        <input
          type="text"
          className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500"
          placeholder="Identifiant"
          value={identifier}
          onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          autoComplete="username"
        />
        <input
          type="password"
          className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          autoComplete="current-password"
        />
        {error && <div className="text-red-500 text-xs">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleLogin} disabled={loading}>
            {loading ? 'Vérification…' : 'Se connecter'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- MAIN APP ---
function App() {
  const mainContentRef = useRef(null);

  // Stores
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isRoot = useAuthStore((s) => s.isRoot);
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const isPlayerMode = useAuthStore((s) => s.isPlayerMode);
  const login = useAuthStore((s) => s.login);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const logout = useAuthStore((s) => s.logout);

  const { players, games, phases, seasons, playTypes, activeSeason } = useDataStore();
  const setGames = useDataStore((s) => s.setGames);
  const setPlayers = useDataStore((s) => s.setPlayers);
  const setPhases = useDataStore((s) => s.setPhases);
  const updateGame = useDataStore((s) => s.updateGame);

  // A3/A4 — Pre-filtrage par saison active
  const seasonFilteredGames = useMemo(() => {
    if (!activeSeason?.phases?.length) return games;
    return games.filter((g) => activeSeason.phases.includes(g.phase));
  }, [games, activeSeason]);

  const seasonFilteredPhases = useMemo(() => {
    if (!activeSeason?.phases?.length) return phases;
    return phases.filter((p) => activeSeason.phases.includes(p.id || p));
  }, [phases, activeSeason]);

  // A0 — Condition onboarding migration
  const needsSetup =
    players.length > 0 &&
    !activeSeason &&
    players.every((p) => !p.seasonIds?.length);

  const {
    view,
    setView,
    showLogin,
    setShowLogin,
    showReport,
    setShowReport,
    importData,
    setImportData,
    multiImportQueue,
    setMultiImportQueue,
    prepOpponent,
    setPrepOpponent,
    activeGame,
    setActiveGame,
  } = useUIStore();

  // Init Firebase + localStorage sync
  useFirebaseSync();

  // Restore session from localStorage on mount
  useEffect(() => { restoreSession(); }, []);

  // Scroll reset when report opens
  useEffect(() => {
    if (showReport && mainContentRef.current) mainContentRef.current.scrollTop = 0;
  }, [showReport]);

  const handleSaveGame = (gameState) => {
    if (!isAdmin) return;
    const gameId = activeGame?.id || generateId();
    const newGame = {
      ...gameState,
      id: gameId,
      date: activeGame?.date || new Date().toLocaleDateString(),
    };
    updateGame(newGame);
    if (window.db && !isPlayerMode) {
      DB.saveGame(newGame).catch(function (e) {
        console.error('Save game error:', e);
        alert('Erreur sauvegarde: ' + e.message);
      });
    }
    setActiveGame(null);
    setView('history');
  };

  const handleUpdatePhases = (newPhases) => {
    if (!isAdmin) return;
    setPhases(newPhases);
    if (window.db && !isPlayerMode) DB.savePhases(newPhases);
  };
  const handleSettingsUpdate = (newPlayers) => {
    if (!isAdmin) return;
    setPlayers(newPlayers);
    if (window.db && !isPlayerMode) DB.saveRoster(newPlayers);
  };
  const performLogin = async (identifier, password) => {
    const ok = await login(identifier, password);
    if (!ok) throw new Error('Identifiants invalides');
    if (!useAuthStore.getState().isRoot) setView('home');
  };
  const performLogout = () => {
    logout();
    setView('global_stats');
  };
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportData(parseHTMLStats(ev.target.result));
    reader.readAsText(file);
    e.target.value = null;
  };
  const handleMultiFileImport = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const queue = [];
    let processed = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        queue.push(parseHTMLStats(ev.target.result));
        processed++;
        if (processed === files.length) setMultiImportQueue(queue);
      };
      reader.readAsText(file);
    });
    e.target.value = null;
  };

  const confirmImport = async (newGame, updatedPlayers) => {
    setPlayers(updatedPlayers);
    const newGamesList = [newGame, ...games];
    setGames(newGamesList);
    if (window.db && !isPlayerMode) {
      try {
        await window.DB.saveRoster(updatedPlayers);
        await window.DB.saveGame(newGame);
        alert('Importe !');
      } catch (e) {
        console.error('Firebase write error:', e);
        alert('Erreur Firebase : ' + e.message);
      }
    } else {
      alert('Importe (local uniquement)');
    }
    setImportData(null);
    setView('history');
  };

  const confirmMultiImport = async (newGame, updatedPlayers) => {
    setPlayers(updatedPlayers);
    const newGamesList = [newGame, ...games];
    setGames(newGamesList);
    if (window.db && !isPlayerMode) {
      try {
        await window.DB.saveRoster(updatedPlayers);
        await window.DB.saveGame(newGame);
        alert('Importe !');
      } catch (e) {
        console.error('Firebase write error:', e);
        alert('Erreur Firebase : ' + e.message);
      }
    } else {
      alert('Importe (local uniquement)');
    }
    setImportData(null);
    setView('history');
  };

  if (isPlayerMode)
    return (
      <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
        <header className="h-16 bg-slate-900 flex items-center px-6">
          <h1 className="font-bold text-lg text-white">Stats</h1>
          <span className="ml-auto text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">
            Mode Joueur
          </span>
        </header>
        <div className="flex-1 p-4 overflow-y-auto">
          {window.GlobalStats && (
            <window.GlobalStats players={players} games={games} phases={phases} />
          )}
        </div>
      </div>
    );
  if (needsSetup && !isAdmin) {
    return (
      <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-200">
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
          L'administrateur doit configurer la saison.
        </p>
      </div>
    );
  }
  if (needsSetup && isAdmin) {
    return (
      <div className="max-w-5xl mx-auto h-screen bg-slate-950 overflow-y-auto font-sans text-slate-200">
        <SeasonSetup />
      </div>
    );
  }

  // B7 — Root sans équipe sélectionnée
  if (isRoot && !currentTeamId) {
    return (
      <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 font-sans text-slate-200">
        <TeamPicker />
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
          Sélectionnez une équipe via le menu en haut à droite.
        </p>
      </div>
    );
  }

  const ReportModule = window.PlayerReportModule;
  return (
    <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
      <TeamPicker />
      {isAdmin && (
        <>
          <input
            type="file"
            accept=".html"
            id="html-upload"
            onChange={handleFileImport}
            className="hidden"
          />
          <input
            type="file"
            accept=".html"
            id="multi-upload"
            onChange={handleMultiFileImport}
            multiple
            className="hidden"
          />
        </>
      )}
      {importData && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
          style={{ zIndex: 10000 }}
        >
          <div
            className="w-full max-w-2xl rounded-[14px] p-6"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-4">Import</h2>
            <ImportReviewModal
              importData={importData}
              currentPlayers={players}
              phases={phases}
              onConfirm={confirmImport}
              onCancel={() => setImportData(null)}
            />
          </div>
        </div>
      )}
      {multiImportQueue.length > 0 && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
          style={{ zIndex: 10000 }}
        >
          <div
            className="w-full max-w-2xl rounded-[14px] p-6"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              Multi-Import ({multiImportQueue.length} restant
              {multiImportQueue.length > 1 ? 's' : ''})
            </h2>
            <ImportReviewModal
              importData={multiImportQueue[0]}
              currentPlayers={players}
              phases={phases}
              onConfirm={confirmMultiImport}
              onCancel={() => setMultiImportQueue([])}
            />
          </div>
        </div>
      )}
      <LoginModal isOpen={showLogin} onLogin={performLogin} onClose={() => setShowLogin(false)} />
      <nav
        style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border)', zIndex: 40 }}
        className="w-full md:w-[68px] flex md:flex-col items-center justify-between md:py-5 px-2 md:px-0 shrink-0"
      >
        {/* Logo */}
        <div className="flex md:flex-col items-center gap-1 md:gap-3 w-full justify-evenly md:justify-start md:px-3">
          <div
            className="mb-0 md:mb-3 flex items-center justify-center w-9 h-9 rounded-[10px] text-white font-black text-sm tracking-tight cursor-default shrink-0"
            style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-accent)' }}
          >
            BP
          </div>

          {/* Accueil */}
          <button
            onClick={() => setView('home')}
            className={`sc-nav-item w-full ${view === 'home' ? 'active' : ''}`}
            title="Accueil"
          >
            <Icon path={Icons.Home} />
            <span className="sc-nav-item__label hidden md:block">Accueil</span>
          </button>

          {/* Stats */}
          <button
            onClick={() => setView('global_stats')}
            className={`sc-nav-item w-full ${view === 'global_stats' ? 'active' : ''}`}
            title="Stats"
          >
            <Icon path={Icons.Chart} />
            <span className="sc-nav-item__label hidden md:block">Stats</span>
          </button>

          {/* Live */}
          {isAdmin && (
            <button
              onClick={() => (window.location.href = 'live.html')}
              className="sc-nav-item w-full relative"
              title="Live Tracker"
            >
              <Icon path={Icons.Play} />
              <span className="sc-nav-item__label hidden md:block">Live</span>
              {(() => {
                const ts = parseInt(localStorage.getItem('liveMatchActive') || '0');
                const isActive = ts > 0 && Date.now() - ts < 7200000;
                return isActive ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '10px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--miss)',
                      animation: 'livePulse 1.5s ease-in-out infinite',
                    }}
                  />
                ) : null;
              })()}
            </button>
          )}

          {/* Historique */}
          <button
            onClick={() => setView('history')}
            className={`sc-nav-item w-full ${view === 'history' ? 'active' : ''}`}
            title="Historique"
          >
            <Icon path={Icons.Clipboard} />
            <span className="sc-nav-item__label hidden md:block">Matchs</span>
          </button>

          {/* Scouting Report */}
          {isAdmin && (
            <button
              onClick={() => {
                if (window.PlayerReportModule) {
                  setShowReport(true);
                } else {
                  alert("ERREUR : Le fichier reportPlayer.js n'est pas chargé.");
                  console.error('window.PlayerReportModule is undefined');
                }
              }}
              className={`sc-nav-item w-full ${showReport ? 'active' : ''}`}
              title="Scouting Report"
            >
              <Icon path={Icons.Target} />
              <span className="sc-nav-item__label hidden md:block">Scout</span>
            </button>
          )}

          {/* Saison */}
          <button
            onClick={() => {
              setView('season');
              setPrepOpponent(null);
            }}
            className={`sc-nav-item w-full ${view === 'season' ? 'active' : ''}`}
            title="Saison"
          >
            <Icon path={Icons.TrendingUp} />
            <span className="sc-nav-item__label hidden md:block">Saison</span>
          </button>

          {/* Scouting adversaire */}
          <button
            onClick={() => {
              setView('scouting');
              setPrepOpponent(null);
            }}
            className={`sc-nav-item w-full ${view === 'scouting' ? 'active' : ''}`}
            title="Scouting"
          >
            <Icon path={Icons.Target} />
            <span className="sc-nav-item__label hidden md:block">Adv.</span>
          </button>

          {/* Entrainement Tir */}
          {isAdmin && (
            <button
              onClick={() => setView('training')}
              className={`sc-nav-item w-full ${view === 'training' ? 'active' : ''}`}
              title="Entrainement Tir"
            >
              <Icon path={Icons.Activity} />
              <span className="sc-nav-item__label hidden md:block">Tir</span>
            </button>
          )}

          {/* Settings */}
          {isAdmin && (
            <button
              onClick={() => setView('settings')}
              className={`sc-nav-item w-full ${view === 'settings' ? 'active' : ''}`}
              title="Config"
            >
              <Icon path={Icons.Settings} />
              <span className="sc-nav-item__label hidden md:block">Config</span>
            </button>
          )}
        </div>

        {/* Auth — desktop */}
        <div className="mt-auto hidden md:flex flex-col items-center pb-3 px-3 w-full">
          {isAdmin ? (
            <button
              onClick={performLogout}
              className="sc-nav-item w-full"
              style={{ color: 'var(--text-2)' }}
              title="Déconnexion"
            >
              <Icon path={Icons.Users} />
              <span className="sc-nav-item__label hidden md:block">Quit</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="sc-nav-item w-full"
              title="Connexion"
            >
              <Icon path={Icons.Users} />
              <span className="sc-nav-item__label hidden md:block">Login</span>
            </button>
          )}
        </div>

        {/* Auth — mobile */}
        <div className="md:hidden">
          {isAdmin ? (
            <button
              onClick={performLogout}
              className="sc-nav-item"
              style={{ color: 'var(--text-2)' }}
            >
              <Icon path={Icons.Users} />
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="sc-nav-item">
              <Icon path={Icons.Users} />
            </button>
          )}
        </div>
      </nav>
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header
          className="h-14 flex items-center px-6 shrink-0"
          style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', zIndex: 30 }}
        >
          <h1 className="font-bold text-lg text-white">
            {showReport && 'Rapport'}
            {!showReport && view === 'home' && 'Accueil'}
            {!showReport && view === 'live' && 'Live'}
            {!showReport && view === 'global_stats' && 'Stats'}
            {!showReport && view === 'history' && 'Historique'}
            {!showReport && view === 'season' && 'Saison'}
            {!showReport && view === 'scouting' && 'Scouting'}
            {!showReport && view === 'gameprep' && 'Préparation'}
            {!showReport && view === 'settings' && 'Paramètres'}
            {!showReport && view === 'training' && 'Entrainement'}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            {!isAdmin && (
              <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">
                Public
              </span>
            )}
            {isAdmin && (
              <span className="text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">
                Admin
              </span>
            )}
            {window.db && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Icon path={Icons.Cloud} className="w-3 h-3" /> Synchro
              </span>
            )}
          </div>
        </header>
        <div ref={mainContentRef} className={`flex-1 overflow-y-auto ${showReport ? '' : 'p-4'}`} style={{ zIndex: 10 }}>
          {showReport && ReportModule && (
            <ReportModule
              currentUser={isAdmin ? { role: 'coach' } : { role: 'guest' }}
              onClose={() => setShowReport(false)}
              games={games}
              roster={players}
              phases={phases}
              seasons={seasons}
            />
          )}
          {!showReport && view === 'home' && <Home />}
          {!showReport && view === 'global_stats' && window.GlobalStats && (
            <window.GlobalStats players={players} games={seasonFilteredGames} phases={seasonFilteredPhases} isAdmin={isAdmin} />
          )}
          {!showReport && view === 'history' && (
            <History
              games={seasonFilteredGames}
              players={players}
              setGames={setGames}
              phases={seasonFilteredPhases}
              isAdmin={isAdmin}
              onEditGame={(g) => {
                setActiveGame(g);
                setView('live');
              }}
              onImportClick={() => document.getElementById('html-upload').click()}
              onMultiImport={() => document.getElementById('multi-upload').click()}
            />
          )}
          {!showReport && view === 'settings' && isAdmin && (
            <Settings />
          )}
          {!showReport && view === 'season' && window.SeasonDashboard && (
            <window.SeasonDashboard
              games={games}
              players={players}
              phases={phases}
              seasons={seasons}
            />
          )}
          {!showReport && view === 'scouting' && !prepOpponent && window.OpponentScouting && (
            <window.OpponentScouting
              games={games}
              onPrepare={(name) => {
                setPrepOpponent(name);
                setView('gameprep');
              }}
            />
          )}
          {!showReport && view === 'gameprep' && prepOpponent && window.GamePrep && (
            <window.GamePrep
              opponentName={prepOpponent}
              games={games}
              players={players}
              onBack={() => {
                setPrepOpponent(null);
                setView('scouting');
              }}
            />
          )}

          {!showReport && view === 'training' && window.TrainingShooter && (
            <window.TrainingShooter players={players} />
          )}

          {!showReport && !isAdmin && (view === 'live' || view === 'settings') && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Icon path={Icons.Users} className="w-16 h-16 mb-4 opacity-20" />
              <p>Acces reserve au coach.</p>
              <button
                onClick={() => setShowLogin(true)}
                className="mt-4 text-orange-500 hover:underline"
              >
                Se connecter
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
