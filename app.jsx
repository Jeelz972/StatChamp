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
import { canAccessView, isPublicMode, PUBLIC_BLOCKED_MESSAGE } from './src/auth/public-mode';

import { useDbSync } from './src/db/use-db-sync';
import { DB } from './src/db';
import { DebugOverlay } from './src/debug/DebugOverlay';
import Home from './Home.jsx';
import Settings from './Settings.jsx';
import SeasonSetup from './SeasonSetup.jsx';
import TeamPicker from './TeamPicker.jsx';
import { SetupPage } from './src/components/SetupPage';
import { RootAdminPanel } from './src/components/RootAdminPanel';
import Reports from './Reports.jsx';

// ==========================================
// ZONE DE CONFIGURATION AUTOMATIQUE
// ==========================================
const CLIP_SERVER_URL = 'https://clips.jeelz-software.ovh'; // Renseigner l'URL du VPS quand déployé, ex: 'https://clips.mondomaine.com'


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
window.detectRuns = detectRuns;

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
  isPublic = false,
}) {
  const [selectedGame, setSelectedGame] = useState(null);
  useEffect(() => {
    if (selectedGame) {
      const fresh = games.find((g) => g.id === selectedGame.id);
      if (fresh && fresh !== selectedGame) setSelectedGame(fresh);
    }
  }, [games]);
  const [editingPBP, setEditingPBP] = useState(null);
  const role = useAuthStore((s) => s.role);
  const allPhases = useDataStore((s) => s.phases);
  const editingPbpPhases = useMemo(
    () => (editingPBP?.seasonId
      ? allPhases.filter((p) => p.seasonId === editingPBP.seasonId)
      : phases),
    [editingPBP, allPhases, phases]
  );
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
              className={`flex-1 p-3 md:p-4 ${isPublic ? '' : 'cursor-pointer group-hover:bg-slate-800/80'} transition-colors`}
              onClick={() => { if (!isPublic) setSelectedGame(g); }}
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
              {!isPublic && (
                <div className="text-xs text-orange-500/0 group-hover:text-orange-500 transition-all mt-2 flex items-center gap-1">
                  <Icon path={Icons.Eye} className="w-3 h-3" /> Voir stats
                </div>
              )}
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
                {g.actions?.length > 0 && (role === 'coach' || role === 'root') && (
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

                      DB.deleteGame(g.id).catch(function (e) {
                        console.error('Delete game error:', e);
                      });
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
      <window.GameDetailsModal
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
          phases={editingPbpPhases}
          onSave={async (updatedGame) => {
            const idx = games.findIndex((g) => g.id === updatedGame.id);
            if (idx < 0) return;
            const newGames = [...games];
            newGames[idx] = updatedGame;
            setGames(newGames);

            await DB.saveGame(updatedGame);
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
  const [tab, setTab] = useState('coach'); // 'coach' | 'player'
  // Coach
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  // Player
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [playerCode, setPlayerCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const players = useDataStore((s) => s.players);
  const loginPlayer = useAuthStore((s) => s.loginPlayer);

  const filteredPlayers = players.filter(
    (p) =>
      playerSearch &&
      (p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
        p.number === playerSearch)
  );

  if (!isOpen) return null;

  const handleCoachLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Identifiant et mot de passe requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await onLogin(identifier.trim(), password.trim());
      if (ok) onClose();
      else setError('Identifiant ou mot de passe incorrect');
    } catch {
      setError('Identifiant ou mot de passe incorrect');
    }
    setLoading(false);
  };

  const handlePlayerLogin = async () => {
    if (!selectedPlayerId || !playerCode.trim()) {
      setError('Sélectionne ton nom et saisis ton code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await loginPlayer(selectedPlayerId, playerCode.trim());
      if (ok) onClose();
      else setError('Code incorrect');
    } catch {
      setError('Code incorrect');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connexion" size="max-w-sm">
      <div className="space-y-4 p-2">
        {/* Tabs */}
        <div className="flex rounded overflow-hidden border border-slate-700">
          {['coach', 'player'].map((t) => (
            <button
              key={t}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
              onClick={() => { setTab(t); setError(''); }}
            >
              {t === 'coach' ? 'Coach / Admin' : 'Joueur'}
            </button>
          ))}
        </div>

        {tab === 'coach' && (
          <>
            <input
              type="text"
              className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500 text-sm"
              placeholder="Identifiant (ex: root, coach)"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              onKeyPress={(e) => e.key === 'Enter' && handleCoachLogin()}
              autoComplete="username"
            />
            <input
              type="password"
              className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500 text-sm"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyPress={(e) => e.key === 'Enter' && handleCoachLogin()}
              autoComplete="current-password"
            />
          </>
        )}

        {tab === 'player' && (
          <>
            <div className="relative">
              <input
                type="text"
                className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500 text-sm"
                placeholder="Ton nom ou numéro"
                value={playerSearch}
                onChange={(e) => { setPlayerSearch(e.target.value); setSelectedPlayerId(null); setError(''); }}
              />
              {filteredPlayers.length > 0 && !selectedPlayerId && (
                <div className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded mt-1 max-h-40 overflow-y-auto">
                  {filteredPlayers.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700"
                      onClick={() => {
                        setSelectedPlayerId(p.id);
                        setPlayerSearch(`#${p.number} ${p.name}`);
                      }}
                    >
                      #{p.number} {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500 text-sm font-mono tracking-widest"
              placeholder="Code d'accès (ex: DUPONT-4821)"
              value={playerCode}
              onChange={(e) => { setPlayerCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyPress={(e) => e.key === 'Enter' && handlePlayerLogin()}
            />
          </>
        )}

        {error && <div className="text-red-400 text-xs">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={tab === 'coach' ? handleCoachLogin : handlePlayerLogin}
            disabled={loading}
          >
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
  const role = useAuthStore((s) => s.role);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const isPublic = isPublicMode(role);

  const { players, games, phases, seasons, playTypes, activeSeason } = useDataStore();
  const setGames = useDataStore((s) => s.setGames);
  const setPlayers = useDataStore((s) => s.setPlayers);
  const setPhases = useDataStore((s) => s.setPhases);
  const updateGame = useDataStore((s) => s.updateGame);
  const activeSeasonId = activeSeason?.id;
  const seasonGames = useMemo(
    () => activeSeasonId ? games.filter((g) => g.seasonId === activeSeasonId) : [],
    [games, activeSeasonId]
  );
  const seasonPhases = useMemo(
    () => activeSeasonId ? phases.filter((p) => p.seasonId === activeSeasonId) : [],
    [phases, activeSeasonId]
  );

  // A0 — Condition onboarding migration
  const needsSetup =
    players.length > 0 && !activeSeason && players.every((p) => !p.seasonIds?.length);

  const {
    view,
    setView,
    showLogin,
    setShowLogin,
    importData,
    setImportData,
    multiImportQueue,
    setMultiImportQueue,
    prepOpponent,
    setPrepOpponent,
    activeGame,
    setActiveGame,
  } = useUIStore();

  // Init DB sync — Supabase uniquement
  useDbSync();

  const [rootExists, setRootExists] = useState(null);

  useEffect(() => {
    const unsub = useAuthStore.getState().initSession();
    return unsub;
  }, []);

  useEffect(() => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    fetch(`${SUPABASE_URL}/rest/v1/rpc/check_root_exists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((exists) => setRootExists(exists === true))
      .catch(() => setRootExists(true));
  }, []);

  // Scroll reset when report opens
  useEffect(() => {
    if (view === 'report' && mainContentRef.current) mainContentRef.current.scrollTop = 0;
  }, [view]);

  // C8 — Mode public : si l'utilisateur tente une vue interdite, retour à l'accueil.
  useEffect(() => {
    if (isPublic && !canAccessView(role, view)) {
      setView('home');
    }
  }, [isPublic, role, view, setView]);

  const handleSaveGame = (gameState) => {
    if (!isAdmin) return;
    const gameId = activeGame?.id || generateId();
    const newGame = {
      ...gameState,
      id: gameId,
      date: activeGame?.date || new Date().toLocaleDateString(),
    };
    updateGame(newGame);
    if (!(role === 'player')) {
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
    if (!(role === 'player')) DB.savePhases(newPhases);
  };
  const handleSettingsUpdate = (newPlayers) => {
    if (!isAdmin) return;
    setPlayers(newPlayers);
    if (!(role === 'player')) DB.saveRoster(newPlayers);
  };
  const performLogin = async (identifier, password) => {
    const ok = await login(identifier, password);
    if (ok && !useAuthStore.getState().isRoot) setView('home');
    return ok;
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
    if (!(role === 'player')) {
      try {
        await DB.saveRoster(updatedPlayers);
        await DB.saveGame(newGame);
        alert('Importe !');
      } catch (e) {
        console.error('Import write error:', e);
        alert('Erreur import : ' + e.message);
      }
    }
    setImportData(null);
    setView('history');
  };

  const confirmMultiImport = async (newGame, updatedPlayers) => {
    setPlayers(updatedPlayers);
    const newGamesList = [newGame, ...games];
    setGames(newGamesList);
    if (!(role === 'player')) {
      try {
        await DB.saveRoster(updatedPlayers);
        await DB.saveGame(newGame);
        alert('Importe !');
      } catch (e) {
        console.error('Import write error:', e);
        alert('Erreur import : ' + e.message);
      }
    }
    setImportData(null);
    setView('history');
  };

  if (rootExists === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Chargement…</div>
      </div>
    );
  }
  if (rootExists === false) {
    return <SetupPage onComplete={() => setRootExists(true)} />;
  }

  if (role === 'player')
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
        <header className="h-16 bg-slate-900 flex items-center px-6">
          <h1 className="font-bold text-lg text-white">Stats</h1>
          <span className="ml-auto text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">
            Mode Joueur
          </span>
        </header>
        <div className="flex-1 p-4 overflow-y-auto">
          {window.GlobalStats && (
            <window.GlobalStats players={players} games={seasonGames} phases={seasonPhases} />
          )}
        </div>
      </div>
    );
  if (needsSetup && !isAdmin) {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-200">
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
          L'administrateur doit configurer la saison.
        </p>
      </div>
    );
  }
  if (needsSetup && isAdmin) {
    return (
      <div className="w-full h-screen bg-slate-950 overflow-y-auto font-sans text-slate-200">
        <SeasonSetup />
      </div>
    );
  }

  // B7 — Root sans équipe sélectionnée
  if (isRoot && !currentTeamId) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 font-sans text-slate-200">
        <TeamPicker />
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
          Sélectionnez une équipe via le menu en haut à droite.
        </p>
      </div>
    );
  }

  const ReportModule = window.PlayerReportModule;
  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
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
                  setView('report');
                } else {
                  alert("ERREUR : Le fichier reportPlayer.js n'est pas chargé.");
                  console.error('window.PlayerReportModule is undefined');
                }
              }}
              className={`sc-nav-item w-full ${view === 'report' ? 'active' : ''}`}
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

          {/* Administration (root only) */}
          {isRoot && (
            <button
              onClick={() => setView('admin')}
              className={`sc-nav-item w-full ${view === 'admin' ? 'active' : ''}`}
              title="Administration"
            >
              <Icon path={Icons.Users} />
              <span className="sc-nav-item__label hidden md:block">Admin</span>
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
            {view === 'report' && 'Rapport'}
            {view === 'home' && 'Accueil'}
            {view === 'live' && 'Live'}
            {view === 'global_stats' && 'Stats'}
            {view === 'history' && 'Historique'}
            {view === 'season' && 'Saison'}
            {view === 'scouting' && 'Scouting'}
            {view === 'gameprep' && 'Préparation'}
            {view === 'settings' && 'Paramètres'}
            {view === 'training' && 'Entrainement'}
            {view === 'reports' && 'Rapports'}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            {isPublic && (
              <button
                onClick={() => setShowLogin(true)}
                className="text-xs text-slate-300 px-2 py-1 bg-slate-800 rounded border border-slate-700 hover:border-orange-500 transition-colors"
                title={PUBLIC_BLOCKED_MESSAGE}
              >
                Mode public — Se connecter
              </button>
            )}
            {!isAdmin && !isPublic && (
              <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">
                Public
              </span>
            )}
            {isAdmin && (
              <span className="text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">
                Admin
              </span>
            )}
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Icon path={Icons.Cloud} className="w-3 h-3" /> Synchro
            </span>
          </div>
        </header>
        <div
          ref={mainContentRef}
          className={`flex-1 overflow-y-auto ${view === 'report' ? '' : 'p-3 md:p-4 xl:p-6'}`}
          style={{ zIndex: 10 }}
        >
          {view === 'report' && ReportModule && (
            <ReportModule
              currentUser={isAdmin ? { role: 'coach' } : { role: 'guest' }}
              onClose={() => setView('home')}
              games={games}
              roster={players}
              phases={phases}
              seasons={seasons}
            />
          )}
          {view === 'home' && <Home />}
          {view === 'global_stats' && window.GlobalStats && (
            <window.GlobalStats
              players={players}
              games={seasonGames}
              phases={seasonPhases}
              isAdmin={isAdmin}
            />
          )}
          {view === 'history' && (
            <History
              games={seasonGames}
              players={players}
              setGames={setGames}
              phases={seasonPhases}
              isAdmin={isAdmin}
              isPublic={isPublic}
              onEditGame={(g) => {
                setActiveGame(g);
                setView('live');
              }}
              onImportClick={() => document.getElementById('html-upload').click()}
              onMultiImport={() => document.getElementById('multi-upload').click()}
            />
          )}
          {view === 'settings' && isAdmin && <Settings />}
          {view === 'admin' && isRoot && <RootAdminPanel />}
          {view === 'season' && window.SeasonDashboard && (
            <window.SeasonDashboard
              games={seasonGames}
              players={players}
              phases={seasonPhases}
              seasons={seasons}
            />
          )}
          {view === 'scouting' && !prepOpponent && window.OpponentScouting && (
            <window.OpponentScouting
              games={games}
              onPrepare={(name) => {
                setPrepOpponent(name);
                setView('gameprep');
              }}
            />
          )}
          {view === 'gameprep' && prepOpponent && window.GamePrep && (
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

          {view === 'training' && window.TrainingShooter && (
            <window.TrainingShooter players={players} />
          )}

          {view === 'reports' && <Reports />}

          {!isAdmin && (view === 'live' || view === 'settings') && (
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
      <DebugOverlay />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
