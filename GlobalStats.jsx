// GlobalStats.js — Composant React (JSX, nécessite Babel)
// Dépendances : React, Recharts (globales), window.StatsEngine
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDataStore } from './src/stores/data-store';
import { calcImpactStatsByPlayer } from './src/utils/calc-impact-stats.js';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Scatter,
  ScatterChart,
  ZAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

// Accent color pour les props SVG Recharts (var(--accent) ne se résout pas en attributs SVG)
const ACCENT = '#FF6B35';

// ============================================================
// 1. VolumeEfficiencyMatrix
// ============================================================
function VolumeEfficiencyMatrix({ players }) {
  const POS_COLORS = {
    PG: '#FF6B35',
    SG: '#3b82f6',
    SF: '#22c55e',
    PF: '#a855f7',
    C: '#ef4444',
    G: '#FF6B35',
    F: '#22c55e',
  };

  const data = useMemo(() => {
    const pts = players
      .filter((p) => p.gamesPlayed > 0 && p.avg)
      .map((p) => {
        const a = p.avg;
        return {
          name: p.info.name,
          pos: p.info.pos || 'G',
          fgaPg: parseFloat(a.fga) || 0,
          ts: parseFloat(a.TS) || 0,
          minPg: parseFloat(a.min) || 0,
          color: POS_COLORS[p.info.pos] || '#a0a0b0',
        };
      });

    if (pts.length === 0) return { points: [], medFga: 0, medTs: 0 };

    const fgaVals = pts.map((d) => d.fgaPg);
    const tsVals = pts.map((d) => d.ts);
    const sortedFga = [...fgaVals].sort((a, b) => a - b);
    const sortedTs = [...tsVals].sort((a, b) => a - b);
    const median = (arr) => {
      if (arr.length === 0) return 0;
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    };

    return { points: pts, medFga: median(sortedFga), medTs: median(sortedTs) };
  }, [players]);

  if (!data.points || data.points.length === 0) {
    return (
      <div className="text-slate-500 text-xs text-center p-8 bg-slate-900/30 rounded-lg border border-dashed border-slate-700">
        Données insuffisantes (nécessite au moins 1 match enregistré)
      </div>
    );
  }

  const positions = [...new Set(data.points.map((d) => d.pos))];

  return (
    <div className="space-y-3">
      <h4 className="text-xs text-slate-400 uppercase font-bold flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        Volume vs Efficacité (TS%)
      </h4>
      <div className="flex flex-wrap gap-3 mb-2">
        {positions.map((pos) => (
          <span key={pos} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: POS_COLORS[pos] || '#a0a0b0' }}
            />
            {pos}
          </span>
        ))}
      </div>
      <div className="h-72 bg-slate-900/50 rounded-lg p-2 border border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
            <XAxis
              type="number"
              dataKey="fgaPg"
              name="FGA/m"
              stroke="#50506a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="number"
              dataKey="ts"
              name="TS%"
              stroke="#50506a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <ZAxis type="number" dataKey="minPg" range={[50, 400]} />
            <ReferenceLine
              x={data.medFga}
              stroke="#3a3a5a"
              strokeDasharray="3 3"
              label={{ value: 'Médiane Vol.', fill: '#3a3a5a', fontSize: 11, position: 'top' }}
            />
            <ReferenceLine
              y={data.medTs}
              stroke="#3a3a5a"
              strokeDasharray="3 3"
              label={{ value: 'Médiane Eff.', fill: '#3a3a5a', fontSize: 11, position: 'right' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-2xl text-[11px]">
                    <div className="font-bold text-white mb-1">{d.name}</div>
                    <div className="text-slate-400">
                      FGA/match: <span className="text-white">{d.fgaPg}</span>
                    </div>
                    <div className="text-slate-400">
                      True Shooting: <span className="text-green-400">{d.ts}%</span>
                    </div>
                    <div className="text-slate-400">
                      Minutes/m: <span className="text-white">{d.minPg}</span>
                    </div>
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
// 3. GhostSeasonChart
// ============================================================
function GhostSeasonChart({ logs, currentGame }) {
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const categories = ['pts', 'reb', 'ast', 'stl', 'blk'];
    let cumulative = {};
    categories.forEach((c) => (cumulative[c] = 0));

    return logs.map((log, i) => {
      const entry = { game: i + 1, opponent: log.opponent || `M${i + 1}` };
      categories.forEach((c) => {
        cumulative[c] += log[c] || 0;
        entry[`avg_${c}`] = Math.round((cumulative[c] / (i + 1)) * 10) / 10;
        entry[`val_${c}`] = log[c] || 0;
      });
      entry.avgComposite =
        Math.round(
          (entry.avg_pts +
            entry.avg_reb * 1.2 +
            entry.avg_ast * 1.5 +
            entry.avg_stl * 2 +
            entry.avg_blk * 2) *
            10
        ) / 10;
      entry.valComposite =
        Math.round(
          (entry.val_pts +
            entry.val_reb * 1.2 +
            entry.val_ast * 1.5 +
            entry.val_stl * 2 +
            entry.val_blk * 2) *
            10
        ) / 10;
      entry.isSelected = currentGame != null && i === currentGame;
      return entry;
    });
  }, [logs, currentGame]);

  const [metric, setMetric] = useState('composite');
  const metrics = [
    { key: 'composite', label: 'Global', color: '#FF6B35' },
    { key: 'pts', label: 'PTS', color: '#FF6B35' },
    { key: 'reb', label: 'REB', color: '#3b82f6' },
    { key: 'ast', label: 'AST', color: '#22c55e' },
  ];

  if (chartData.length === 0)
    return <div className="text-slate-500 text-sm text-center p-4">Pas de données</div>;

  const avgKey = metric === 'composite' ? 'avgComposite' : `avg_${metric}`;
  const valKey = metric === 'composite' ? 'valComposite' : `val_${metric}`;
  const activeColor = metrics.find((m) => m.key === metric)?.color || '#FF6B35';

  return (
    <div>
      <h4 className="text-xs text-slate-400 uppercase mb-2">Courbe Fantôme — Saison vs Match</h4>
      <div className="flex gap-1 mb-2">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${metric === m.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            style={
              metric === m.key
                ? {
                    backgroundColor: m.color + '30',
                    color: m.color,
                    border: `1px solid ${m.color}`,
                  }
                : { border: '1px solid transparent' }
            }
          >
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
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis dataKey="opponent" stroke="#a0a0b0" fontSize={10} />
            <YAxis stroke="#a0a0b0" fontSize={10} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs">
                    <div className="font-bold text-white">{d.opponent}</div>
                    <div style={{ color: activeColor }}>Match: {d[valKey]}</div>
                    <div className="text-slate-400">Moy. cumulée: {d[avgKey]}</div>
                    <div
                      className={`text-[10px] ${d[valKey] >= d[avgKey] ? 'text-green-400' : 'text-red-400'}`}
                    >
                      Écart: {d[valKey] >= d[avgKey] ? '+' : ''}
                      {Math.round((d[valKey] - d[avgKey]) * 10) / 10}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={avgKey}
              stroke="none"
              fill="url(#ghostGrad)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={avgKey}
              name="Moy. cumulée"
              stroke="#50506a"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={valKey}
              name="Match"
              stroke={activeColor}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const above = payload[valKey] >= payload[avgKey];
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.isSelected ? 6 : 3}
                    fill={above ? '#22c55e' : '#ef4444'}
                    stroke={payload.isSelected ? '#fff' : 'none'}
                    strokeWidth={payload.isSelected ? 2 : 0}
                  />
                );
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
function ArchetypeRadar({ player, allPlayers }) {
  const MIN_CRITERIA = {
    scoring: 5.0,
    playmaking: 1.5,
    rebounding: 3.0,
    defense: 0.8,
    shooting: 20,
  };

  const radarData = useMemo(() => {
    if (!player || !player.info || !allPlayers || allPlayers.length === 0) return [];
    const eligible = allPlayers.filter((p) => p.gamesPlayed > 0 && p.total && p.info);
    if (eligible.length === 0) return [];

    const rawStats = eligible.map((p) => {
      const gp = p.gamesPlayed;
      const t = p.total;
      const totalFGA = (t.fga || 0) + (t.threePA || 0);
      const tsa = totalFGA + 0.44 * (t.fta || 0);
      const threePAr = totalFGA > 0 ? (t.threePA || 0) / totalFGA : 0;
      const rawShootingScore = tsa > 0 ? ((t.pts || 0) / (2 * tsa)) * 100 : 0;
      const adjustedShooting = rawShootingScore * (0.8 + 0.2 * threePAr);

      return {
        id: p.info.id,
        scoring: (t.pts || 0) / gp,
        playmaking: (t.ast || 0) / gp,
        defense: ((t.stl || 0) / gp) * 1.5 + ((t.blk || 0) / gp) * 1.2,
        rebounding: (t.reb || 0) / gp,
        shooting: adjustedShooting,
      };
    });

    const playerRaw = rawStats.find((r) => r.id === player.info.id);
    if (!playerRaw) return [];

    const axes = ['scoring', 'playmaking', 'defense', 'rebounding', 'shooting'];
    const labels = {
      scoring: 'Scoring',
      playmaking: 'Playmaking',
      defense: 'Defense',
      rebounding: 'Rebounding',
      shooting: 'Shooting',
    };

    return axes.map((axis) => {
      const vals = rawStats.map((r) => r[axis]);
      const min = Math.min(...vals);
      const max = Math.max(...vals);

      let difficultyBuffer = 1.15;
      if (axis === 'scoring') difficultyBuffer = 1.25;
      if (axis === 'shooting') difficultyBuffer = 1.1;

      const theoreticalMax = max * difficultyBuffer;
      const range = theoreticalMax - min;

      let normalized = 50;
      if (range > 0) normalized = ((playerRaw[axis] - min) / range) * 99;

      return {
        axis: labels[axis],
        id: axis,
        score: Math.round(Math.max(0, Math.min(99, normalized))),
        raw: Math.round(playerRaw[axis] * 10) / 10,
      };
    });
  }, [player, allPlayers]);

  const archetypeInfo = useMemo(() => {
    if (!radarData || radarData.length === 0) return { name: 'N/A', avg: 0, color: 'slate' };
    const avgScore = Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length);
    let sorted = [...radarData].sort((a, b) => b.score - a.score);

    sorted = sorted.filter((stat) => stat.raw >= MIN_CRITERIA[stat.id]);
    if (sorted.length === 0) {
      const bestPotential = [...radarData].sort((a, b) => b.score - a.score)[0];
      let prospectName = 'Espoir';
      if (avgScore < 15) prospectName = 'Débutant';
      else {
        switch (bestPotential.id) {
          case 'scoring':
            prospectName = 'Attaquant en Herbe';
            break;
          case 'playmaking':
            prospectName = 'Apprenti Meneur';
            break;
          case 'defense':
            prospectName = 'Prospect Défensif';
            break;
          case 'rebounding':
            prospectName = 'Intérieur en Formation';
            break;
          case 'shooting':
            prospectName = 'Shooteur en Réglage';
            break;
        }
      }
      return { name: prospectName, avg: avgScore, color: 'slate' };
    }

    const t1 = sorted[0];
    const t2 = sorted[1] || { axis: 'None', score: 0 };
    let typeName = 'Polyvalent';
    let colorTheme = 'slate';

    if (avgScore > 75) {
      typeName = 'Superstar Complète';
      colorTheme = 'fuchsia';
    } else {
      switch (t1.id) {
        case 'scoring':
          colorTheme = 'orange';
          if (t2.id === 'shooting' && t2.score > 60) typeName = 'Sniper Offensif';
          else if (t2.id === 'playmaking' && t2.score > 60) typeName = 'Hélio-Créateur';
          else if (t2.id === 'defense' && t2.score > 60) typeName = 'Two-Way Scorer';
          else if (t2.id === 'rebounding' && t2.score > 60) typeName = 'Intérieur Dominant';
          else typeName = 'Scoreur Volume';
          break;
        case 'playmaking':
          colorTheme = 'emerald';
          if (t2.id === 'defense' && t2.score > 60) typeName = 'Général de Défense';
          else if (t2.id === 'scoring' && t2.score > 60) typeName = 'Maestro Offensif';
          else if (t2.id === 'rebounding') typeName = 'Point Forward';
          else typeName = 'Distributeur Pur';
          break;
        case 'defense':
          colorTheme = 'blue';
          if (t2.id === 'rebounding' && t2.score > 60) typeName = 'Ancre Défensive';
          else if (t2.id === 'shooting' && t2.score > 60) typeName = '3 & D Premium';
          else if (t2.id === 'playmaking') typeName = 'Connecteur Défensif';
          else typeName = 'Spécialiste Lock-down';
          break;
        case 'rebounding':
          colorTheme = 'indigo';
          if (t2.id === 'defense' && t2.score > 60) typeName = 'Nettoyeur de Raquette';
          else if (t2.id === 'scoring' && t2.score > 60) typeName = 'Monstre de la Peinture';
          else if (t2.id === 'playmaking') typeName = 'Pivot-Passeur';
          else typeName = 'Rebondeur de Devoir';
          break;
        case 'shooting':
          colorTheme = 'cyan';
          if (t2.id === 'scoring' && t2.score > 60) typeName = 'Micro-Onde';
          else if (t2.id === 'defense') typeName = '3 & D';
          else typeName = 'Spécialiste Corner';
          break;
        default:
          typeName = 'Role Player';
      }
    }
    return { name: typeName, avg: avgScore, color: colorTheme };
  }, [radarData]);

  if (radarData.length === 0)
    return <div className="text-slate-500 text-sm text-center p-4">Pas de données</div>;

  const getBadgeStyle = (color) => {
    const styles = {
      orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
      emerald: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
      blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
      indigo: 'bg-indigo-900/30 text-indigo-400 border-indigo-800',
      rose: 'bg-rose-900/30 text-rose-400 border-rose-800',
      fuchsia: 'bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-800',
      cyan: 'bg-cyan-900/30 text-cyan-400 border-cyan-800',
      slate: 'bg-slate-700/30 text-slate-400 border-slate-600',
    };
    return styles[color] || styles.slate;
  };

  const getRadarColor = (color) => {
    const colors = {
      orange: '#FF6B35',
      emerald: '#34d399',
      blue: '#60a5fa',
      indigo: '#818cf8',
      rose: '#fb7185',
      fuchsia: '#e879f9',
      cyan: '#22d3ee',
      slate: '#a0a0b0',
    };
    return colors[color] || '#a0a0b0';
  };

  const activeColor = getRadarColor(archetypeInfo.color);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs text-slate-400 uppercase">Profil Coach</h4>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getBadgeStyle(archetypeInfo.color)}`}
          >
            {archetypeInfo.name}
          </span>
          <span className="text-xs text-slate-500">OVR {archetypeInfo.avg}</span>
        </div>
      </div>
      <div className="h-64 bg-slate-900/50 rounded-lg p-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="70%">
            <PolarGrid stroke="#2a2a4a" />
            <PolarAngleAxis
              dataKey="axis"
              stroke="#a0a0b0"
              fontSize={10}
              tick={{ fill: '#a0a0b0' }}
            />
            <PolarRadiusAxis
              stroke="#2a2a4a"
              fontSize={9}
              domain={[0, 99]}
              tickCount={4}
              angle={30}
            />
            <Radar
              name="Stats"
              dataKey="score"
              stroke={activeColor}
              fill={activeColor}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs z-50 relative">
                    <div className="font-bold text-white mb-1">{d.axis}</div>
                    <div style={{ color: activeColor }} className="mb-0.5">
                      Note: <span className="font-bold text-base">{d.score}</span>/99
                    </div>
                    <div className="text-slate-400">
                      Brut: <span className="text-white">{d.raw}</span>
                    </div>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {radarData.map((d) => (
          <span key={d.axis} className="text-[10px] text-slate-400 flex items-center gap-1">
            {d.axis}:{' '}
            <span
              className={`font-bold ${d.score >= 70 ? 'text-green-400' : d.score >= 40 ? 'text-orange-400' : 'text-red-400'}`}
            >
              {d.score}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Helpers visuels joueur — modal detail
// ===========================================

// Retourne une classe Tailwind de couleur selon le niveau de performance
function getStatColor(value, statType) {
  const SC = window.StatComponents || {};
  const level = SC.getStatLevel ? SC.getStatLevel(statType, value) : 'average';
  const map = {
    elite:   'text-orange-400',
    good:    'text-green-400',
    average: 'text-slate-300',
    below:   'text-orange-400',
    poor:    'text-red-400',
  };
  return map[level] || 'text-slate-300';
}

// Retourne une classe bg-* Tailwind pour les barres de progression
function getBarColor(value, statType) {
  const SC = window.StatComponents || {};
  const level = SC.getStatLevel ? SC.getStatLevel(statType, value) : 'average';
  if (level === 'elite' || level === 'good') return 'bg-green-500';
  if (level === 'average') return 'bg-slate-400';
  if (level === 'below') return 'bg-orange-500';
  return 'bg-red-500';
}

// ─────────────────────────────────────────────────────────────────────────────
// Système de badges avancé — U18 centre de formation
// ─────────────────────────────────────────────────────────────────────────────
function getAdvancedPlayerBadges(player, teamAvgStats) {
  const a  = player.avg  || {};
  const gp = player.gamesPlayed || 1;
  const pos = (player.info?.pos || '').toUpperCase();

  const n = (v) => parseFloat(v) || 0;

  // Métriques per-game (champs string → float)
  const min      = n(a.min);
  const pts      = n(a.pts);
  const reb      = n(a.reb);
  const dreb     = n(a.dreb);
  const ast      = n(a.ast);
  const stl      = n(a.stl);
  const blk      = n(a.blk);
  const tov      = n(a.tov);
  const pf       = n(a.pf);
  const PIE      = n(a.PIE);
  const TS       = n(a.TS);
  const eFG      = n(a.eFG);
  const DRtg     = n(a.DRtg);
  const costFoul = n(a.costFoul);
  const threePct = n(a.threePct);
  const ftPct    = n(a.ftPct);

  // avg.fga/threePA/fta sont des cumuls saison → ramenés en per-game
  const fgaPerGame    = n(a.fga)     / gp;
  const threeAPerGame = n(a.threePA) / gp;
  const ftaPerGame    = n(a.fta)     / gp;

  // Fallbacks U18 si teamAvgStats absent
  const ta = teamAvgStats || {};
  const tPIE      = n(ta.PIE)           || 10;
  const tTS       = n(ta.TS)            || 50;
  const tDRtg     = n(ta.DRtg)          || 105;
  const tStlBlk   = n(ta.stlBlk)       || 2;
  const tDreb     = n(ta.dreb)          || 3;
  const tCostFoul = n(ta.costFoul)      || 2;
  const tFgaFta   = n(ta.fgaFtaPerGame) || 8;
  const tMin      = n(ta.min)           || 15;

  const allBadges = [];

  // ── BADGES DE PERFORMANCE ─────────────────────────────────────────────────

  // 1. Moteur Collectif
  if (min >= 10 && PIE >= Math.max(tPIE + 4, 14)) {
    allBadges.push({
      id: 'moteur', category: 'perf', area: 'impact',
      label: 'Moteur Collectif', icon: '⚡',
      colorClass: 'text-emerald-400 border-emerald-400/40',
      bgColorClass: 'bg-emerald-500/10',
      description: 'Impact global excellent. Tu rends tes coéquipiers meilleurs quand tu es sur le terrain.',
    });
  }

  // 2. Général du Parquet
  const astTovRatio = tov > 0.1 ? ast / tov : ast * 5;
  if (min >= 10 && ast >= 4 && astTovRatio >= 2.5) {
    allBadges.push({
      id: 'general', category: 'perf', area: 'playmaking',
      label: 'Général du Parquet', icon: '🎖️',
      colorClass: 'text-violet-400 border-violet-400/40',
      bgColorClass: 'bg-violet-500/10',
      description: 'Excellente vision de jeu et gestion propre. Vrai QI Basket à la création.',
    });
  }

  // 3. Lockdown Defender
  const stlBlkTotal = stl + blk;
  if (min >= 10 && stlBlkTotal >= Math.max(tStlBlk * 1.6, 2.5) && DRtg > 0 && DRtg <= tDRtg - 6 && pf <= 3) {
    allBadges.push({
      id: 'lockdown', category: 'perf', area: 'defense',
      label: 'Lockdown Defender', icon: '🛡️',
      colorClass: 'text-indigo-400 border-indigo-400/40',
      bgColorClass: 'bg-indigo-500/10',
      description: 'Grosse pression défensive et dissuasion sans faire de fautes inutiles.',
    });
  }

  // 4. Aspirateur de Rebonds
  const rebPerMin = min > 0 ? reb / min : 0;
  if (min >= 10 && rebPerMin >= 0.42) {
    allBadges.push({
      id: 'aspirateur', category: 'perf', area: 'rebounding',
      label: 'Aspirateur de Rebonds', icon: '🏀',
      colorClass: 'text-cyan-400 border-cyan-400/40',
      bgColorClass: 'bg-cyan-500/10',
      description: 'Domination dans les airs. Tu sécurises les possessions et offres des secondes chances.',
    });
  }

  // 5. Aimant à Ligne
  const ftRate = fgaPerGame > 0 ? ftaPerGame / fgaPerGame : 0;
  if (min >= 10 && ftRate >= 0.40 && ftPct >= 65) {
    allBadges.push({
      id: 'aimant', category: 'perf', area: 'agression',
      label: 'Aimant à Ligne', icon: '✊',
      colorClass: 'text-teal-400 border-teal-400/40',
      bgColorClass: 'bg-teal-500/10',
      description: 'Tu agresses le cercle, provoques des fautes et punis sur la ligne. Très rentable.',
    });
  }

  // 6. Sniper d'Élite
  if (min >= 8 && threeAPerGame >= 3 && threePct >= 38) {
    allBadges.push({
      id: 'sniper', category: 'perf', area: 'shooting3',
      label: "Sniper d'Élite", icon: '🎯',
      colorClass: 'text-indigo-300 border-indigo-300/40',
      bgColorClass: 'bg-indigo-400/10',
      description: 'Spacing précieux. Ta fiabilité de loin étire la défense adverse.',
    });
  }

  // 7. Finition Chirurgicale
  if (min >= 10 && eFG >= 55 && TS >= 57 && fgaPerGame >= 4) {
    allBadges.push({
      id: 'finition', category: 'perf', area: 'shooting_eff',
      label: 'Finition Chirurgicale', icon: '💎',
      colorClass: 'text-emerald-300 border-emerald-300/40',
      bgColorClass: 'bg-emerald-400/10',
      description: 'Sélection de tirs parfaite. Tu ne gaspilles quasiment aucune munition.',
    });
  }

  // 8. Micro-Onde
  const ptsPerMin = min > 0 ? pts / min : 0;
  if (min >= 5 && min < 22 && ptsPerMin >= 0.65) {
    allBadges.push({
      id: 'microonde', category: 'perf', area: 'scoring_rate',
      label: 'Micro-Onde', icon: '🔥',
      colorClass: 'text-cyan-300 border-cyan-300/40',
      bgColorClass: 'bg-cyan-400/10',
      description: 'Impact offensif immédiat en sortie de banc. Tu mets le feu à la défense.',
    });
  }

  // ── BADGES DE DÉVELOPPEMENT ───────────────────────────────────────────────
  // Pas de badge dev si un badge perf couvre déjà la même zone
  const perfAreas = new Set(allBadges.map((b) => b.area));

  // 9. Volume à Canaliser
  if (!perfAreas.has('shooting_eff') && !perfAreas.has('scoring_rate') &&
      fgaPerGame >= 8 && TS < tTS - 5) {
    allBadges.push({
      id: 'volume', category: 'dev', area: 'shooting_eff',
      label: 'Volume à Canaliser', icon: '📊',
      colorClass: 'text-amber-400 border-amber-400/40',
      bgColorClass: 'bg-amber-500/10',
      description: "Tu prends tes responsabilités, mais ta sélection de tir doit s'améliorer. Cherche le 'good to great shot'.",
    });
  }

  // 10. Création Risquée
  if (!perfAreas.has('playmaking') && ast >= 3 && tov >= 2.5 && astTovRatio < 1.5) {
    allBadges.push({
      id: 'creation_risquee', category: 'dev', area: 'playmaking',
      label: 'Création Risquée', icon: '⚠️',
      colorClass: 'text-slate-300 border-slate-300/40',
      bgColorClass: 'bg-slate-500/10',
      description: 'Bonnes intentions à la création, mais trop de points offerts sur pertes de balle. Simplifie tes choix.',
    });
  }

  // 11. Intensité Mal Maîtrisée
  if (!perfAreas.has('defense') && pf >= 4 && costFoul >= tCostFoul * 1.5) {
    allBadges.push({
      id: 'intensite', category: 'dev', area: 'fouls',
      label: 'Intensité Mal Maîtrisée', icon: '💥',
      colorClass: 'text-orange-400 border-orange-400/40',
      bgColorClass: 'bg-orange-500/10',
      description: "Grosse débauche d'énergie, mais tes fautes donnent des points faciles. Défends avec tes appuis, pas tes mains.",
    });
  }

  // 12. Oubli du Box-Out (intérieur ou gros temps de jeu)
  const isInterior = pos === 'PF' || pos === 'C' || pos === 'A4' || pos === 'A5';
  if (!perfAreas.has('rebounding') && min >= 10 &&
      (isInterior || min >= tMin * 0.9) && dreb < Math.max(tDreb * 0.6, 2)) {
    allBadges.push({
      id: 'boxout', category: 'dev', area: 'rebounding',
      label: 'Oubli du Box-Out', icon: '📦',
      colorClass: 'text-yellow-400 border-yellow-400/40',
      bgColorClass: 'bg-yellow-500/10',
      description: 'Ne regarde pas le ballon voler. Fais ton écran de retard (box-out) systématiquement.',
    });
  }

  // 13. Ballon Collant
  const hasCreationRisquee = allBadges.some((b) => b.id === 'creation_risquee');
  if (!perfAreas.has('playmaking') && !hasCreationRisquee &&
      fgaPerGame >= 6 && tov >= 2 && ast <= 1.5) {
    allBadges.push({
      id: 'ballon_collant', category: 'dev', area: 'ball_movement',
      label: 'Ballon Collant', icon: '🫙',
      colorClass: 'text-slate-400 border-slate-400/40',
      bgColorClass: 'bg-slate-500/10',
      description: "Attention à ne pas stopper le mouvement de la balle. Lâche le ballon plus vite pour déséquilibrer la défense.",
    });
  }

  // 14. Passivité Offensive
  const fgaFtaPerGame = fgaPerGame + ftaPerGame;
  if (!perfAreas.has('agression') && !perfAreas.has('scoring_rate') &&
      min >= 15 && fgaFtaPerGame < tFgaFta * 0.5) {
    allBadges.push({
      id: 'passivite', category: 'dev', area: 'agression',
      label: 'Passivité Offensive', icon: '😴',
      colorClass: 'text-amber-300 border-amber-300/40',
      bgColorClass: 'bg-amber-400/10',
      description: "Ne refuse pas les tirs ouverts ! L'équipe a besoin que tu sois une menace pour créer des espaces.",
    });
  }

  // 15. Gaspillage aux Lancers
  const hasPassivite = allBadges.some((b) => b.id === 'passivite');
  if (!perfAreas.has('agression') && !hasPassivite && ftaPerGame >= 4 && ftPct < 60) {
    allBadges.push({
      id: 'gaspillage_lf', category: 'dev', area: 'ft',
      label: 'Gaspillage aux Lancers', icon: '🎪',
      colorClass: 'text-yellow-300 border-yellow-300/40',
      bgColorClass: 'bg-yellow-400/10',
      description: 'Tu fais le plus dur en agressant le cercle. Isole-toi dans ta bulle et travaille ta routine aux lancers francs.',
    });
  }

  // Perf en priorité, max 4 badges
  const perfBadges = allBadges.filter((b) => b.category === 'perf');
  const devBadges  = allBadges.filter((b) => b.category === 'dev');
  return [...perfBadges, ...devBadges].slice(0, 4);
}

// Records de saison depuis les logs match par match
function getSeasonHighs(logs) {
  if (!logs || logs.length < 2) return [];
  const ICON_PATHS = {
    target:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    zap:       'M13 2L3 14h9l-1 8L21 10h-9l1-8',
    arrowUpDown: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
    star:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    crosshair: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3v4m0 6v4M2 12h4m6 0h4',
    shield:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  };
  const mkIcon = (key) => (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[key] || ICON_PATHS.star} />
    </svg>
  );
  const defs = [
    { key: 'pts',    label: 'Points',          icon: 'zap' },
    { key: 'reb',    label: 'Rebonds',          icon: 'arrowUpDown' },
    { key: 'ast',    label: 'Passes',           icon: 'target' },
    { key: 'eff',    label: 'Évaluation',       icon: 'star' },
    { key: 'stl',    label: 'Interceptions',    icon: 'shield' },
    { key: 'threePM',label: '3-Points marqués', icon: 'crosshair' },
  ];
  return defs.map((d) => {
    const best = logs.reduce((mx, log) => (log[d.key] || 0) > (mx[d.key] || 0) ? log : mx, logs[0]);
    return { ...d, iconSvg: mkIcon(d.icon), value: best[d.key] || 0, opponent: best.opponent || '—', date: best.date || '' };
  }).filter((d) => d.value > 0);
}

// ===========================================
// Helpers GlobalStats
// ===========================================
function getTeamBadges(trendsData, filteredGames) {
  const badges = [];
  if (!trendsData || !filteredGames.length) return badges;
  const winPct = trendsData.wins / filteredGames.length;
  const diff = parseFloat(trendsData.avgs.pts) - parseFloat(trendsData.avgs.conceded);
  if (winPct >= 0.7) badges.push({ label: 'DOMINANTS', color: 'var(--made)' });
  else if (winPct >= 0.5) badges.push({ label: 'ÉQUILIBRÉS', color: 'var(--accent)' });
  else badges.push({ label: 'EN DIFFICULTÉ', color: 'var(--miss)' });
  if (diff >= 8) badges.push({ label: '+' + diff.toFixed(1) + ' DIFF', color: 'var(--made)' });
  else if (diff <= -8) badges.push({ label: diff.toFixed(1) + ' DIFF', color: 'var(--miss)' });
  if (trendsData.streak) {
    const n = parseInt(trendsData.streak.slice(1)) || 0;
    if (trendsData.streak.startsWith('W') && n >= 3) badges.push({ label: 'SUR LANCÉE', color: 'var(--accent)' });
    if (trendsData.streak.startsWith('L') && n >= 3) badges.push({ label: 'SÉRIE NOIRE', color: 'var(--miss)' });
  }
  return badges;
}

function generateTeamImpactStatement(trendsData, fourFactorsData, filteredGames) {
  if (!trendsData || !filteredGames.length) return '';
  const wins = trendsData.wins;
  const total = filteredGames.length;
  const winPct = Math.round((wins / total) * 100);
  const diff = (parseFloat(trendsData.avgs.pts) - parseFloat(trendsData.avgs.conceded)).toFixed(1);
  const sign = parseFloat(diff) >= 0 ? '+' : '';
  let statement = `${wins}V-${total - wins}D (${winPct}%) · Différentiel ${sign}${diff} pts/match`;
  if (fourFactorsData && fourFactorsData.team) {
    const efg = parseFloat(fourFactorsData.team.eFG);
    if (efg >= 54) statement += ' · Tir élite';
    else if (efg <= 44) statement += ' · Tir à améliorer';
  }
  return statement;
}

const FF_LABELS = {
  eFG: { label: 'eFG%', desc: 'Tir ajusté (3pts valent 1.5x)', good: 54, unit: '%' },
  TOV: { label: 'BP%', desc: 'Balles perdues / 100 possessions', good: 14, inverted: true, unit: '%' },
  OREB: { label: 'RO%', desc: 'Taux rebond offensif', good: 28, unit: '%' },
  FTR: { label: 'LF/Tir', desc: 'Lancers tentés / tirs tentés', good: 25, unit: '' },
};

function getPlayerRank(player, allPlayers, stat) {
  if (!allPlayers || allPlayers.length < 2) return null;
  const sorted = [...allPlayers]
    .filter((p) => p.gamesPlayed > 0)
    .sort((a, b) => (parseFloat(b.avg[stat]) || 0) - (parseFloat(a.avg[stat]) || 0));
  const idx = sorted.findIndex((p) => p.info.id === player.info.id);
  return idx >= 0 ? idx + 1 : null;
}

// ===========================================
// GLOBAL STATS (Composant Principal)
// ===========================================
function GlobalStats({ players, games, phases, isAdmin }) {
  const { StatCell, PercentRing, MiniSparkline, GsTooltip } = window.StatComponents || {};
  const [filterPhase, setFilterPhase] = useState('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVolumeMatrix, setShowVolumeMatrix] = useState(false);
  const [activeTab, setActiveTab] = useState('players');
  const [playerNotes, setPlayerNotes] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [sortBy, setSortBy] = useState('pts');
  const [sortDir, setSortDir] = useState('desc');
  const [minGames, setMinGames] = useState(0);
  const [per36, setPer36] = useState(false);

  const gamesKey = useMemo(() => {
    return (
      games.length +
      ':' +
      games.map((g) => g.id + '_' + (g.homeScore || 0) + '_' + (g.awayScore || 0)).join(',')
    );
  }, [games]);

  useEffect(() => {
    setFilterPhase('ALL');
  }, [phases]);

  const filteredGames = useMemo(() => {
    const isFinal = (g) => !g.status || g.status === 'final';
    if (filterPhase === 'ALL') return games.filter(isFinal);
    return games.filter((g) => g.phase === filterPhase && isFinal(g));
  }, [games, filterPhase]);

  const teamTrendsData = useMemo(() => {
    const sorted = [...filteredGames].sort(
      (a, b) => window.parseDate(a.date) - window.parseDate(b.date)
    );

    const initStats = () => ({
      pts: 0,
      conceded: 0,
      fgm: 0,
      fga: 0,
      threePM: 0,
      threePA: 0,
      ftm: 0,
      fta: 0,
      reb: 0,
      oreb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      tov: 0,
      pf: 0,
    });

    let global = initStats();
    let winsStats = { ...initStats(), count: 0 };
    let lossStats = { ...initStats(), count: 0 };

    const data = sorted.map((g) => {
      let stats = initStats();
      Object.values(g.playerStats).forEach((s) => {
        stats.pts += s.pts || 0;
        stats.fgm += (s.fgm || 0) + (s.threePM || 0);
        stats.fga += (s.fga || 0) + (s.threePA || 0);
        stats.threePM += s.threePM || 0;
        stats.threePA += s.threePA || 0;
        stats.ftm += s.ftm || 0;
        stats.fta += s.fta || 0;
        stats.reb += (s.oreb || 0) + (s.dreb || 0);
        stats.oreb += s.oreb || 0;
        stats.ast += s.ast || 0;
        stats.stl += s.stl || 0;
        stats.blk += s.blk || 0;
        stats.tov += s.tov || 0;
        stats.pf += s.pf || 0;
      });

      Object.keys(global).forEach((k) => {
        if (stats[k] !== undefined) global[k] += stats[k];
      });
      global.conceded += g.awayScore || 0;

      const totalPoss = window.StatsEngine.possSimple(stats.fga, stats.fta, stats.tov, stats.oreb);
      const ortg = window.StatsEngine.safe(stats.pts, totalPoss, 100);
      const drtg = window.StatsEngine.safe(g.awayScore || 0, totalPoss, 100);
      const isWin = (g.homeScore || 0) > (g.awayScore || 0);

      const target = isWin ? winsStats : lossStats;
      target.count++;
      target.conceded += g.awayScore || 0;
      Object.keys(stats).forEach((k) => {
        if (target[k] !== undefined) target[k] += stats[k];
      });

      return {
        date: g.date,
        opponent: g.opponent,
        isWin,
        score: g.homeScore || 0,
        conceded: g.awayScore || 0,
        ORtg: parseFloat(ortg.toFixed(1)),
        DRtg: parseFloat(drtg.toFixed(1)),
        NetRtg: parseFloat((ortg - drtg).toFixed(1)),
        ...stats,
        fgPct: window.StatsEngine.safe(stats.fgm, stats.fga, 100).toFixed(1),
        threePct: window.StatsEngine.safe(stats.threePM, stats.threePA, 100).toFixed(1),
      };
    });

    const calcAvg = (source, count) => {
      if (count === 0) return {};
      return {
        pts: (source.pts / count).toFixed(1),
        conceded: (source.conceded / count).toFixed(1),
        reb: (source.reb / count).toFixed(1),
        ast: (source.ast / count).toFixed(1),
        stl: (source.stl / count).toFixed(1),
        blk: (source.blk / count).toFixed(1),
        tov: (source.tov / count).toFixed(1),
        pf: (source.pf / count).toFixed(1),
        fgPct: window.StatsEngine.safe(source.fgm, source.fga, 100).toFixed(1),
        threePct: window.StatsEngine.safe(source.threePM, source.threePA, 100).toFixed(1),
        ftPct: window.StatsEngine.safe(source.ftm, source.fta, 100).toFixed(1),
        fgm: (source.fgm / count).toFixed(1),
        fga: (source.fga / count).toFixed(1),
        threePM: (source.threePM / count).toFixed(1),
        threePA: (source.threePA / count).toFixed(1),
        stl: (source.stl / count).toFixed(1),
        blk: (source.blk / count).toFixed(1),
        pf: (source.pf / count).toFixed(1),
        tov: (source.tov / count).toFixed(1),
      };
    };

    const avgs = calcAvg(global, data.length || 1);
    const winAvgs = calcAvg(winsStats, winsStats.count);
    const lossAvgs = calcAvg(lossStats, lossStats.count);

    const analysis = [];
    if (lossStats.count > 0 && winsStats.count > 0) {
      const diffs = [
        {
          label: 'Défense (Pts Encaissés)',
          val: parseFloat(lossAvgs.conceded) - parseFloat(winAvgs.conceded),
          type: 'negative_more_is_bad',
          unit: 'pts',
        },
        {
          label: 'Attaque (Scoring)',
          val: parseFloat(winAvgs.pts) - parseFloat(lossAvgs.pts),
          type: 'positive_less_is_bad',
          unit: 'pts',
        },
        {
          label: 'Pertes de balle',
          val: parseFloat(lossAvgs.tov) - parseFloat(winAvgs.tov),
          type: 'negative_more_is_bad',
          unit: 'bp',
        },
        {
          label: 'Adresse Globale',
          val: parseFloat(winAvgs.fgPct) - parseFloat(lossAvgs.fgPct),
          type: 'positive_less_is_bad',
          unit: '%',
        },
        {
          label: 'Adresse 3-Pts',
          val: parseFloat(winAvgs.threePct) - parseFloat(lossAvgs.threePct),
          type: 'positive_less_is_bad',
          unit: '%',
        },
        {
          label: 'Rebonds',
          val: parseFloat(winAvgs.reb) - parseFloat(lossAvgs.reb),
          type: 'positive_less_is_bad',
          unit: 'reb',
        },
        {
          label: 'Création (Passes)',
          val: parseFloat(winAvgs.ast) - parseFloat(lossAvgs.ast),
          type: 'positive_less_is_bad',
          unit: 'pd',
        },
      ];
      analysis.push(
        ...diffs
          .map((d) => ({ ...d, impact: Math.abs(d.val), raw: d.val }))
          .sort((a, b) => b.impact - a.impact)
          .slice(0, 3)
      );
    }

    const streak = data.length > 0 ? (data[data.length - 1].isWin ? 'W' : 'L') : '-';
    return {
      data,
      avgs,
      winAvgs,
      lossAvgs,
      wins: winsStats.count,
      losses: lossStats.count,
      streak,
      analysis,
    };
  }, [filteredGames]);

  const fourFactorsData = useMemo(() => {
    if (filteredGames.length === 0) return null;

    const SE = window.StatsEngine;
    const init = () => ({
      fgm: 0,
      fga: 0,
      threePM: 0,
      fta: 0,
      ftm: 0,
      tov: 0,
      oreb: 0,
      oppDreb: 0,
    });
    let all = init();
    let oppAll = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0 };
    let teamDreb = 0;
    let winS = { ...init(), count: 0 };
    let lossS = { ...init(), count: 0 };
    let winTeamDreb = 0,
      lossTeamDreb = 0;
    let winOpp = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0 };
    let lossOpp = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0 };

    filteredGames.forEach((g) => {
      let tm = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0, dreb: 0 };
      Object.values(g.playerStats).forEach((s) => {
        tm.fgm += (s.fgm || 0) + (s.threePM || 0);
        tm.fga += (s.fga || 0) + (s.threePA || 0);
        tm.threePM += s.threePM || 0;
        tm.fta += s.fta || 0;
        tm.ftm += s.ftm || 0;
        tm.tov += s.tov || 0;
        tm.oreb += s.oreb || 0;
        tm.dreb += s.dreb || 0;
      });

      const estOpp = SE.estimateOpponent(g.awayScore || 0);
      const opp = g.opponentStats || {};
      const gOppDreb = opp.reb ? Math.round(opp.reb * 0.7) : estOpp.dreb;
      const gOppOreb = opp.oreb || estOpp.oreb;
      const gOppFgm = opp.fgm || estOpp.fgm;
      const gOppFga = opp.fga || estOpp.fga;
      const gOppFta = opp.fta || estOpp.fta;
      const gOppFtm = opp.ftm || estOpp.ftm;
      const gOppTov = opp.tov || estOpp.tov;
      const gOppThreePM = opp.threePM || Math.round(gOppFgm * 0.3);

      ['fgm', 'fga', 'threePM', 'fta', 'ftm', 'tov', 'oreb'].forEach((k) => (all[k] += tm[k]));
      all.oppDreb += gOppDreb;
      teamDreb += tm.dreb;

      oppAll.fgm += gOppFgm;
      oppAll.fga += gOppFga;
      oppAll.fta += gOppFta;
      oppAll.ftm += gOppFtm;
      oppAll.tov += gOppTov;
      oppAll.oreb += gOppOreb;
      oppAll.threePM += gOppThreePM;

      const isWin = (g.homeScore || 0) > (g.awayScore || 0);
      const target = isWin ? winS : lossS;
      target.count++;
      ['fgm', 'fga', 'threePM', 'fta', 'ftm', 'tov', 'oreb'].forEach((k) => (target[k] += tm[k]));
      target.oppDreb += gOppDreb;

      const tOpp = isWin ? winOpp : lossOpp;
      tOpp.fgm += gOppFgm;
      tOpp.fga += gOppFga;
      tOpp.fta += gOppFta;
      tOpp.ftm += gOppFtm;
      tOpp.tov += gOppTov;
      tOpp.oreb += gOppOreb;
      tOpp.threePM += gOppThreePM;

      if (isWin) {
        winTeamDreb += tm.dreb;
      } else {
        lossTeamDreb += tm.dreb;
      }
    });

    const team = SE.fourFactors(all);
    const oppFF = SE.fourFactors({ ...oppAll, oppDreb: teamDreb });
    const winFF = winS.count > 0 ? SE.fourFactors(winS) : null;
    const lossFF = lossS.count > 0 ? SE.fourFactors(lossS) : null;

    const radarData = [
      { factor: 'eFG%', team: team.eFG, opp: oppFF.eFG },
      { factor: 'TOV%', team: team.tovPct, opp: oppFF.tovPct },
      { factor: 'OREB%', team: team.orebPct, opp: oppFF.orebPct },
      { factor: 'FT Rate', team: team.ftRate, opp: oppFF.ftRate },
    ];

    return { team, opp: oppFF, winFF, lossFF, radarData };
  }, [filteredGames]);
  const aggregated = useMemo(() => {
    const stats = {};
    players.forEach((p) => {
      stats[p.id] = {
        info: p,
        gamesPlayed: 0,
        total: {
          pts: 0,
          reb: 0,
          oreb: 0,
          dreb: 0,
          ast: 0,
          stl: 0,
          blk: 0,
          tov: 0,
          min: 0,
          eff: 0,
          fgm: 0,
          fga: 0,
          threePM: 0,
          threePA: 0,
          ftm: 0,
          fta: 0,
          pf: 0,
          plusMinus: 0,
          pie: 0,
          pir: 0,
          foulDrawn: 0,
          blkAgainst: 0,
          costTov: 0,
          costFoul: 0,
          unpunishedErrors: 0,
          stlGain: 0,
          orebGain: 0,
          lfGain: 0,
        },
        totalMinPlayed: 0,
        weightedORtg: 0,
        weightedDRtg: 0,
        logs: [],
        records: {
          pts: 0,
          reb: 0,
          ast: 0,
          stl: 0,
          blk: 0,
          eff: 0,
          threePM: 0,
          pir: -999,
          min: 0,
          fgm: 0,
          fga: 0,
          ftm: 0,
          fta: 0,
          threePA: 0,
          oreb: 0,
          dreb: 0,
          tov: 0,
          pf: 0,
          plusMinus: -999,
          foulDrawn: 0,
        },
      };
    });

    const GT = { MP: 0 };

    filteredGames.forEach((g) => {
      let gamePTS = 0,
        gameFGM = 0,
        gameFTM = 0,
        gameFGA = 0,
        gameFTA = 0;
      let gameDRB = 0,
        gameORB = 0,
        gameAST = 0,
        gameSTL = 0,
        gameBLK = 0,
        gamePF = 0,
        gameTO = 0;

      Object.values(g.playerStats).forEach((s) => {
        const min = s.minutes || 0;
        GT.MP += min;
        gamePTS += s.pts || 0;
        gameFGM += (s.fgm || 0) + (s.threePM || 0);
        gameFTM += s.ftm || 0;
        gameFGA += (s.fga || 0) + (s.threePA || 0);
        gameFTA += s.fta || 0;
        gameDRB += s.dreb || 0;
        gameORB += s.oreb || 0;
        gameAST += s.ast || 0;
        gameSTL += s.stl || 0;
        gameBLK += s.blk || 0;
        gamePF += s.pf || 0;
        gameTO += s.tov || 0;
      });

      const oppPTS = g.awayScore || 0;
      const estOpp = window.StatsEngine.estimateOpponent(oppPTS);
      const opp = g.opponentStats || {};
      const oppFGM = opp.fgm || estOpp.fgm;
      const oppFTM = opp.ftm || estOpp.ftm;
      const oppFGA = opp.fga || estOpp.fga;
      const oppFTA = opp.fta || estOpp.fta;
      const oppDRB = opp.reb ? Math.round(opp.reb * 0.7) : estOpp.dreb;
      const oppORB = opp.oreb || estOpp.oreb;
      const oppTOV = opp.tov || estOpp.tov;

      gamePTS += oppPTS;
      gameFGM += oppFGM;
      gameFTM += oppFTM;
      gameFGA += oppFGA;
      gameFTA += oppFTA;
      gameDRB += oppDRB;
      gameORB += oppORB;
      gameAST += opp.ast || 0;
      gameSTL += opp.stl || 0;
      gameBLK += opp.blk || 0;
      gamePF += opp.fouls || 0;
      gameTO += oppTOV;

      const gamePIEDenom =
        gamePTS +
        gameFGM +
        gameFTM -
        gameFGA -
        gameFTA +
        gameDRB +
        0.5 * gameORB +
        gameAST +
        gameSTL +
        0.5 * gameBLK -
        gamePF -
        gameTO;
      const teamPoss =
        gameFGA - oppFGA + 0.44 * (gameFTA - oppFTA) - (gameORB - oppORB) + (gameTO - oppTOV);
      const teamORtg_Game = teamPoss > 0 ? ((gamePTS - oppPTS) / teamPoss) * 100 : 0;
      const teamDRtg_Game = teamPoss > 0 ? (oppPTS / teamPoss) * 100 : 0;

      // Gains générés — calculés par match, avant la boucle joueur pour injection dans les logs
      const gainsByPid = (g.actions && Array.isArray(g.actions))
        ? calcImpactStatsByPlayer(g.actions, players)
        : {};

      Object.entries(g.playerStats).forEach(([pid, s]) => {
        const id = parseInt(pid);
        if ((s.minutes || 0) > 0 && stats[id]) {
          const t = stats[id].total;
          const playerMin = s.minutes || 0;
          // oreb + dreb car PlayerGameStats n'expose pas de champ reb combiné
          const reb = (s.oreb || 0) + (s.dreb || 0);

          stats[id].gamesPlayed += 1;
          stats[id].totalMinPlayed += playerMin;
          stats[id].weightedORtg += teamORtg_Game * playerMin;
          stats[id].weightedDRtg += teamDRtg_Game * playerMin;

          t.pts += s.pts || 0;
          t.reb += reb;
          t.oreb += s.oreb || 0;
          t.dreb += s.dreb || 0;
          t.ast += s.ast || 0;
          t.stl += s.stl || 0;
          t.blk += s.blk || 0;
          t.tov += s.tov || 0;
          t.min += playerMin;
          t.fgm += s.fgm || 0;
          t.fga += s.fga || 0;
          t.threePM += s.threePM || 0;
          t.threePA += s.threePA || 0;
          t.ftm += s.ftm || 0;
          t.fta += s.fta || 0;
          t.pf += s.pf || 0;
          t.plusMinus += s.plusMinus || 0;

          const playerFGA = (s.fga || 0) + (s.threePA || 0);
          const playerFGM = (s.fgm || 0) + (s.threePM || 0);

          const evalStat =
            (s.pts || 0) +
            reb +
            (s.ast || 0) +
            (s.stl || 0) +
            (s.blk || 0) -
            (playerFGA - playerFGM + ((s.fta || 0) - (s.ftm || 0)) + (s.tov || 0));
          t.eff += evalStat;

          const missedFG = playerFGA - playerFGM;
          const missedFT = (s.fta || 0) - (s.ftm || 0);
          const foulDrawn = s.foulDrawn || 0;
          const blkAgainst = s.blkAgainst || 0;

          const pir =
            (s.pts || 0) +
            reb +
            (s.ast || 0) +
            (s.stl || 0) +
            (s.blk || 0) +
            foulDrawn -
            (missedFG + missedFT + (s.tov || 0) + blkAgainst + (s.pf || 0));

          t.pir += pir;
          t.foulDrawn += foulDrawn;
          t.blkAgainst += blkAgainst;

          const playerPIENum =
            (s.pts || 0) +
            playerFGM +
            (s.ftm || 0) -
            playerFGA -
            (s.fta || 0) +
            (s.dreb || 0) +
            0.5 * (s.oreb || 0) +
            (s.ast || 0) +
            (s.stl || 0) +
            0.5 * (s.blk || 0) -
            (s.pf || 0) -
            (s.tov || 0);
          const playerPIE = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;
          t.pie += playerPIE;

          const matchGains = gainsByPid[id] ?? { stlGain: 0, orebGain: 0, lfGain: 0 };
          t.stlGain  += matchGains.stlGain;
          t.orebGain += matchGains.orebGain;
          t.lfGain   += matchGains.lfGain;

          const rec = stats[id].records;
          const currentStats = {
            pts: s.pts,
            reb,
            ast: s.ast,
            stl: s.stl,
            blk: s.blk,
            eff: evalStat,
            threePM: s.threePM,
            pir: pir,
            min: s.minutes,
            fgm: playerFGM,
            fga: playerFGA,
            ftm: s.ftm,
            fta: s.fta,
            threePA: s.threePA,
            oreb: s.oreb,
            dreb: s.dreb,
            tov: s.tov,
            pf: s.pf,
            plusMinus: s.plusMinus,
            foulDrawn: foulDrawn,
          };

          Object.keys(currentStats).forEach((key) => {
            const val = currentStats[key] || 0;
            if (val > rec[key] || (key === 'plusMinus' && rec[key] === -999)) {
              rec[key] = val;
              rec[key + 'Date'] = g.date;
              rec[key + 'Opp'] = g.opponent;
            }
          });

          stats[id].logs.push({
            date: g.date,
            opponent: g.opponent,
            phase: g.phase,
            min: s.minutes,
            pts: s.pts || 0,
            reb,
            oreb: s.oreb || 0,
            dreb: s.dreb || 0,
            stlGain:  matchGains.stlGain,
            orebGain: matchGains.orebGain,
            lfGain:   matchGains.lfGain,
            ast: s.ast || 0,
            stl: s.stl || 0,
            blk: s.blk || 0,
            tov: s.tov || 0,
            pf: s.pf || 0,
            plusMinus: s.plusMinus || 0,
            fgm: playerFGM,
            fga: playerFGA,
            threePM: s.threePM || 0,
            threePA: s.threePA || 0,
            ftm: s.ftm || 0,
            fta: s.fta || 0,
            eff: evalStat,
            pir: pir,
            eFG: parseFloat(
              window.StatsEngine.eFG(playerFGM, s.threePM || 0, playerFGA).toFixed(1)
            ),
            TS: parseFloat(window.StatsEngine.TS(s.pts || 0, playerFGA, s.fta || 0).toFixed(1)),
            PIE: parseFloat(playerPIE.toFixed(1)),
            ORtg: parseFloat(
              window.StatsEngine.safe(s.pts || 0, window.StatsEngine.possSimple(playerFGA, s.fta || 0, s.tov || 0, 0), 100).toFixed(1)
            ),
            DRtg: parseFloat(teamDRtg_Game.toFixed(1)),
          });
        }
      });

      // Coût des erreurs — sliding window sur les actions du match
      if (g.actions && Array.isArray(g.actions)) {
        const homeIdSet = new Set(
          Object.keys(g.playerStats)
            .map((id) => parseInt(id))
            .filter((id) => id < 1000 && stats[id])
        );
        for (let i = 0; i < g.actions.length; i++) {
          const a = g.actions[i];
          const pid = a.pid;
          if (pid === undefined || pid === null || !homeIdSet.has(pid)) continue;

          const isTov = a.type === 'TOV';
          const isFoul =
            a.type === 'FOUL' &&
            (!a.foulType || a.foulType === 'PERSONAL' || a.foulType === 'OFFENSIVE');
          if (!isTov && !isFoul) continue;

          let ptsConceded = 0;
          const WINDOW = 6;

          for (let j = i + 1; j < g.actions.length && j <= i + WINDOW; j++) {
            const b = g.actions[j];
            const bPid = b.pid ?? -1;
            const bIsOpp = bPid >= 1000;
            const bIsHome = bPid >= 0 && bPid < 1000;

            if (bIsOpp) {
              if (b.type === 'SHOT' && b.made) {
                ptsConceded += b.val || 2;
                break;
              }
              if (b.type === 'FT') {
                ptsConceded += b.ftMade || 0;
                break;
              }
              if (b.type === 'TOV') break;
            } else if (bIsHome) {
              if (b.type === 'SHOT' || b.type === 'DREB' || b.type === 'OREB') break;
            }
          }

          const t = stats[pid].total;
          if (ptsConceded > 0) {
            if (isTov) t.costTov += ptsConceded;
            else t.costFoul += ptsConceded;
          } else {
            t.unpunishedErrors += 1;
          }
        }
      }
    });

    const activePlayers = Object.values(stats).filter((p) => p.gamesPlayed > 0);
    return activePlayers.map((p) => {
      const t = p.total;
      const gp = p.gamesPlayed || 1;
      const ORtg = p.weightedORtg / p.totalMinPlayed || 100;
      const DRtg = p.weightedDRtg / p.totalMinPlayed || 100;

      p.logs.sort((a, b) => window.parseDate(a.date) - window.parseDate(b.date));

      const totalFGA = t.fga + t.threePA;
      const totalFGM = t.fgm + t.threePM;
      const twoFGA = t.fga;
      const twoFGM = t.fgm;
      const winLogs = p.logs.filter((l) => {
        const g = filteredGames.find((g2) => g2.date === l.date && g2.opponent === l.opponent);
        return g && parseInt(g.homeScore) > parseInt(g.awayScore);
      });
      const lossLogs = p.logs.filter((l) => {
        const g = filteredGames.find((g2) => g2.date === l.date && g2.opponent === l.opponent);
        return g && parseInt(g.homeScore) < parseInt(g.awayScore);
      });
      const calcSplitAvg = (logs) => {
        const n = logs.length;
        if (n === 0) return null;
        const s = (k) => logs.reduce((a, c) => a + (c[k] || 0), 0);
        const totalFGA = s('fga') + s('threePA');
        const totalFGM = s('fgm') + s('threePM');
        return {
          gp: n,
          pts: (s('pts') / n).toFixed(1),
          reb: (s('reb') / n).toFixed(1),
          ast: (s('ast') / n).toFixed(1),
          stl: (s('stl') / n).toFixed(1),
          tov: (s('tov') / n).toFixed(1),
          fgPct: totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : '0.0',
          threePct: s('threePA') > 0 ? ((s('threePM') / s('threePA')) * 100).toFixed(1) : '0.0',
          eff: (s('eff') / n).toFixed(1),
          plusMinus: (s('plusMinus') / n).toFixed(1),
          min: (s('min') / n).toFixed(1),
        };
      };
      const splitWL = { win: calcSplitAvg(winLogs), loss: calcSplitAvg(lossLogs) };
      return {
        ...p,
        splitWL,
        stats: {
          fgm: parseFloat(twoFGM.toFixed(1)),
          fga: parseFloat(twoFGA.toFixed(1)),
          threePM: parseFloat(t.threePM.toFixed(1)),
          threePA: parseFloat(t.threePA.toFixed(1)),
          ftm: parseFloat(t.ftm.toFixed(1)),
          fta: parseFloat(t.fta.toFixed(1)),
        },
        avg: {
          min: (t.min / gp).toFixed(1),
          pts: (t.pts / gp).toFixed(1),
          reb: (t.reb / gp).toFixed(1),
          oreb: (t.oreb / gp).toFixed(1),
          dreb: (t.dreb / gp).toFixed(1),
          ast: (t.ast / gp).toFixed(1),
          stl: (t.stl / gp).toFixed(1),
          blk: (t.blk / gp).toFixed(1),
          tov: (t.tov / gp).toFixed(1),
          pf: (t.pf / gp).toFixed(1),
          plusMinus: (t.plusMinus / gp).toFixed(1),
          eff: (t.eff / gp).toFixed(1),
          pir: (t.pir / gp).toFixed(1),
          twoPct: twoFGA > 0 ? ((twoFGM / twoFGA) * 100).toFixed(1) : '0.0',
          fgm: totalFGM,
          fga: totalFGA,
          fgPct: totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : '0.0',
          threePM: t.threePM,
          threePA: t.threePA,
          threePct: t.threePA > 0 ? ((t.threePM / t.threePA) * 100).toFixed(1) : '0.0',
          ftm: t.ftm,
          fta: t.fta,
          ftPct: t.fta > 0 ? ((t.ftm / t.fta) * 100).toFixed(1) : '0.0',
          eFG: window.StatsEngine.eFG(totalFGM, t.threePM, totalFGA).toFixed(1),
          TS: window.StatsEngine.TS(t.pts, totalFGA, t.fta).toFixed(1),
          ORtg: ORtg.toFixed(1),
          DRtg: DRtg.toFixed(1),
          netRtg: (ORtg - DRtg).toFixed(1),
          PIE: (t.pie / gp).toFixed(1),
          costTov: (t.costTov / gp).toFixed(1),
          costFoul: (t.costFoul / gp).toFixed(1),
          unpunishedErrors: (t.unpunishedErrors / gp).toFixed(1),
          stlGain: parseFloat((t.stlGain / gp).toFixed(1)),
          orebGain: parseFloat((t.orebGain / gp).toFixed(1)),
          lfGain: parseFloat((t.lfGain / gp).toFixed(1)),
          totalGain: parseFloat(((t.stlGain + t.orebGain + t.lfGain) / gp).toFixed(1)),
          floorImpact: t.min >= 8 && t.min > 0
            ? parseFloat((t.plusMinus / t.min * 40).toFixed(1))
            : null,
        },
      };
    });
  }, [players, filteredGames]);

  // F4 + F1 + F2 : enrichissement post-agrégation (streak)
  const aggregatedEnriched = useMemo(() => {
    if (!aggregated || aggregated.length === 0) return aggregated;
    const teamAvgPM    = aggregated.reduce((s, p) => s + parseFloat(p.avg.plusMinus || 0), 0) / aggregated.length;
    const teamMinTotal = aggregated.reduce((s, p) => s + parseFloat(p.avg.min || 0) * (p.gamesPlayed || 1), 0);
    return aggregated.map((p) => {
      const t          = p.total;
      const totalFGA   = t.fga + t.threePA;
      const totalFGM   = t.fgm + t.threePM;
      const streak     = window.StatsEngine.hotColdStreak(
        (p.logs || []).slice().sort((a, b) => window.parseDate(b.date) - window.parseDate(a.date))
      );
      return {
        ...p,
        streak,
        avg: {
          ...p.avg,
        },
      };
    });
  }, [aggregated]);

  const combosData = useMemo(() => {
    const MIN_POSS = 10;
    const homeIds = new Set(players.map((p) => p.id));
    const duoMap = {};
    const trioMap = {};

    filteredGames.forEach((g) => {
      if (!g.actions || !g.actions.length || !g.actions[0].onCourt) return;
      g.actions.forEach((a) => {
        if (!a.onCourt) return;
        const homeOnCourt = a.onCourt.filter((id) => homeIds.has(id)).sort((x, y) => x - y);
        if (homeOnCourt.length < 2) return;

        const isHome = homeIds.has(a.pid);
        const pts = a.type === 'SHOT' && a.made ? a.val : a.type === 'FT' ? a.ftMade || 0 : 0;
        const ptsConceded =
          !isHome && a.type === 'SHOT' && a.made
            ? a.val
            : !isHome && a.type === 'FT'
              ? a.ftMade || 0
              : 0;
        const ptsScored = isHome && pts > 0 ? pts : 0;

        const isFGA = a.type === 'SHOT' ? 1 : 0;
        const isFTA = a.type === 'FT' ? a.ftAtt || 0 : 0;
        const isTOV = a.type === 'TOV' && isHome ? 1 : 0;
        const isOREB = a.type === 'OREB' && isHome ? 1 : 0;

        const oppFGA = !isHome && a.type === 'SHOT' ? 1 : 0;
        const oppFTA = !isHome && a.type === 'FT' ? a.ftAtt || 0 : 0;
        const oppTOV = a.type === 'TOV' && !isHome ? 1 : 0;
        const oppOREB = a.type === 'OREB' && !isHome ? 1 : 0;

        const accumulate = (map, key) => {
          if (!map[key])
            map[key] = {
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
          const m = map[key];
          m.actions++;
          m.pts += ptsScored;
          m.ptsConceded += ptsConceded;
          m.fga += isHome ? isFGA : 0;
          m.fta += isHome ? isFTA : 0;
          m.tov += isTOV;
          m.orb += isOREB;
          m.oppFga += oppFGA;
          m.oppFta += oppFTA;
          m.oppTov += oppTOV;
          m.oppOrb += oppOREB;
        };

        // Duos
        for (let i = 0; i < homeOnCourt.length; i++) {
          for (let j = i + 1; j < homeOnCourt.length; j++) {
            accumulate(duoMap, homeOnCourt[i] + '-' + homeOnCourt[j]);
          }
        }
        // Trios
        for (let i = 0; i < homeOnCourt.length; i++) {
          for (let j = i + 1; j < homeOnCourt.length; j++) {
            for (let k = j + 1; k < homeOnCourt.length; k++) {
              accumulate(trioMap, homeOnCourt[i] + '-' + homeOnCourt[j] + '-' + homeOnCourt[k]);
            }
          }
        }
      });
    });

    const processMap = (map, maxResults) => {
      return Object.entries(map)
        .map(([key, data]) => {
          const ids = key.split('-').map(Number);
          const poss = Math.max(1, data.fga + 0.44 * data.fta + data.tov - data.orb);
          const oppPoss = Math.max(1, data.oppFga + 0.44 * data.oppFta + data.oppTov - data.oppOrb);
          const avgPoss = (poss + oppPoss) / 2;
          if (avgPoss < MIN_POSS) return null;

          const ortg = Math.round((data.pts / avgPoss) * 100);
          const drtg = Math.round((data.ptsConceded / avgPoss) * 100);
          const netRtg = ortg - drtg;
          const pm = data.pts - data.ptsConceded;

          const names = ids.map((id) => {
            const p = players.find((pl) => pl.id === id);
            return p ? '#' + p.number + ' ' + p.name.split(' ')[0] : '#' + id;
          });
          return {
            key,
            ids,
            names,
            poss: Math.round(avgPoss),
            ortg,
            drtg,
            netRtg,
            pm,
            actions: data.actions,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.netRtg - a.netRtg)
        .slice(0, maxResults);
    };

    return {
      duos: processMap(duoMap, 10),
      trios: processMap(trioMap, 5),
      hasData: filteredGames.some(
        (g) => g.actions && g.actions.length > 0 && !!g.actions[0].onCourt
      ),
    };
  }, [filteredGames, players]);

  // Composant partagé : badge delta W/L (▲/▼ coloré)
  const TrendBadge = ({ delta, invert = false }) => {
    const d = parseFloat(delta) || 0;
    const positive = invert ? d < 0 : d > 0;
    if (Math.abs(d) < 0.05) return <span style={{ color: '#64748b', fontSize: '10px' }}>—</span>;
    return (
      <span style={{ fontSize: '10px', fontWeight: 700, color: positive ? '#34d399' : '#f87171' }}>
        {positive ? '▲' : '▼'} {d > 0 ? '+' : ''}{d.toFixed(1)}
      </span>
    );
  };
  // Composant partagé : barre de pourcentage avec marqueur seuil
  const PercentBar = ({ pct, benchmark, color }) => {
    const val = Math.min(parseFloat(pct) || 0, 100);
    const bm = Math.min(benchmark || 0, 100);
    const fillColor = color === 'orange' ? '#f97316' : color === 'blue' ? '#3b82f6' : '#22c55e';
    return (
      <svg viewBox="0 0 100 8" style={{ width: '100%', height: '8px', display: 'block', marginTop: '8px', borderRadius: '99px', overflow: 'visible' }}>
        <rect x="0" y="0" width="100" height="8" rx="4" fill="#1e293b" />
        <rect x="0" y="0" width={val} height="8" rx="4" fill={fillColor} opacity="0.85" />
        {bm > 0 && <line x1={bm} y1="-2" x2={bm} y2="10" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 1" />}
      </svg>
    );
  };
  // Composant partagé : badge record de saison
  const SeasonHighBadge = () => (
    <span style={{ fontSize: '9px', fontWeight: 700, color: '#fbbf24', marginLeft: '3px', verticalAlign: 'middle', letterSpacing: '0.03em' }} title="Record de saison">★</span>
  );

  return (
    <div className="space-y-4 h-full flex flex-col pb-20 md:pb-0">
      <window.Card className="p-2 md:p-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded p-2 text-sm"
            >
              <option value="ALL">Toutes les phases</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mb-4">
              {[
                { key: 'players', label: 'Stats Joueurs' },
                { key: 'team', label: 'Analyse Équipe' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${
                    activeTab === tab.key
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'bg-slate-800/50 text-slate-500 border border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Le bouton toggle viewMode a été supprimé ici */}
            <button
              onClick={() => setShowVolumeMatrix(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors border border-slate-700"
            >
              Volume/Eff.
            </button>
          </div>
        </div>

        {activeTab === 'players' &&
          (() => {
            const filtered = aggregatedEnriched.filter((p) => {
              const matchName = p.info.name.toLowerCase().includes(searchFilter.toLowerCase());
              const matchPos = posFilter === 'all' || p.info.pos === posFilter;
              const matchMin = minGames === 0 || p.gamesPlayed >= minGames;
              return matchName && matchPos && matchMin;
            });
            const handleSort = (col) => {
              if (sortBy === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
              else {
                setSortBy(col);
                setSortDir('desc');
              }
            };
            const sorted = [...filtered].sort((a, b) => {
              let va, vb;
              if (sortBy === 'name') {
                va = a.info.name.toLowerCase();
                vb = b.info.name.toLowerCase();
                return sortDir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
              }
              if (sortBy === 'gp') {
                va = a.gamesPlayed || 0;
                vb = b.gamesPlayed || 0;
              } else {
                va = parseFloat(a.avg[sortBy]) || 0;
                vb = parseFloat(b.avg[sortBy]) || 0;
              }
              return sortDir === 'desc' ? vb - va : va - vb;
            });
            const teamAvgEff = sorted.length > 0
              ? sorted.reduce((s, p) => s + (parseFloat(p.avg.eff) || 0), 0) / sorted.length
              : 0;
            const maxPts = sorted.length > 0 ? Math.max(...sorted.map((p) => parseFloat(p.avg.pts) || 0)) : 1;
            const maxReb = sorted.length > 0 ? Math.max(...sorted.map((p) => parseFloat(p.avg.reb) || 0)) : 1;
            const maxEval = sorted.length > 0 ? Math.max(...sorted.map((p) => parseFloat(p.avg.eff) || 0)) : 1;
            const RANK_STATS = ['pts', 'reb', 'ast'];
            const rankMaps = {};
            RANK_STATS.forEach((stat) => {
              const byVal = [...sorted].sort((a, b) => (parseFloat(b.avg[stat]) || 0) - (parseFloat(a.avg[stat]) || 0));
              rankMaps[stat] = {};
              byVal.forEach((p, i) => { rankMaps[stat][p.info.id] = i + 1; });
            });
            const arrow = (col) => (sortBy === col ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '');
            const per36Val = (total, totalMin) => {
              if (!per36 || !totalMin || parseFloat(totalMin) === 0) return parseFloat(total) || 0;
              return parseFloat(((parseFloat(total) / parseFloat(totalMin)) * 36).toFixed(1));
            };
            const thStyle = 'cursor-pointer hover:text-orange-400 transition-colors';
            const exportCSV = () => {
              const headers = [
                'Joueur',
                'Poste',
                'MJ',
                'MIN',
                'PTS',
                'FG%',
                '3P%',
                'LF%',
                'REB',
                'PD',
                'INT',
                'BP',
                '+/-',
                'EVAL',
              ];
              const rows = sorted.map((p) => [
                p.info.name,
                p.info.pos || '',
                p.gamesPlayed,
                p.avg.min,
                p.avg.pts,
                p.avg.fgPct,
                p.avg.threePct,
                p.avg.ftPct,
                p.avg.reb,
                p.avg.ast,
                p.avg.stl,
                p.avg.tov,
                p.avg.plusMinus,
                p.avg.eff,
              ]);
              const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'stats_joueurs.csv';
              a.click();
              URL.revokeObjectURL(a.href);
            };
            const Sparkline = ({ logs }) => {
              const pts = (logs || []).slice(-5).map((l) => l.pts || 0);
              if (pts.length < 2) return <span className="text-slate-600">—</span>;
              const max = Math.max(...pts, 1);
              const scale = 18 / max;
              const trend = pts[pts.length - 1] - pts[0];
              const points = pts.map((v, i) => `${i * 15},${19 - v * scale}`).join(' ');
              return (
                <svg
                  viewBox="0 0 60 20"
                  style={{
                    width: '60px',
                    height: '20px',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                  }}
                >
                  <polyline
                    fill="none"
                    stroke={trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#94a3b8'}
                    strokeWidth="1.5"
                    points={points}
                  />
                </svg>
              );
            };
            return (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 w-36"
                  />
                  <div className="flex gap-1">
                    {['all', 'PG', 'SG', 'SF', 'PF', 'C'].map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setPosFilter(pos)}
                        className={`px-2 py-1 text-xs rounded font-bold transition-colors ${posFilter === pos ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}
                      >
                        {pos === 'all' ? 'ALL' : pos}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-500">Min. MJ</label>
                    <input
                      type="number"
                      min={0}
                      value={minGames}
                      onChange={(e) => setMinGames(Number(e.target.value))}
                      className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                    />
                  </div>
                  <button
                    onClick={() => setPer36((v) => !v)}
                    className={`text-xs px-3 py-1 rounded border transition-colors ${per36 ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    Per-36
                  </button>
                  <button
                    onClick={exportCSV}
                    className="ml-auto px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors border border-slate-700 font-bold"
                    title="Exporter en CSV"
                  >
                    📊 CSV
                  </button>
                  <span className="text-xs text-slate-600">
                    {sorted.length} joueur{sorted.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="overflow-auto flex-1 relative custom-scrollbar">
                  <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap border-collapse">
                    <thead className="bg-slate-900 text-white uppercase text-xs sticky top-0 z-20">
                      <tr className="bg-slate-950 border-b border-slate-700">
                        <th
                          className={`p-3 sticky left-0 bg-slate-950 z-30 min-w-[120px] text-left font-bold ${thStyle}`}
                          onClick={() => handleSort('name')}
                        >
                          Joueur{arrow('name')}
                        </th>
                        <th
                          className={`p-3 text-center w-12 text-slate-400 ${thStyle}`}
                          onClick={() => handleSort('gp')}
                        >
                          MJ{arrow('gp')}
                        </th>
                        <th
                          className={`p-3 text-center w-12 text-slate-400 ${thStyle}`}
                          onClick={() => handleSort('min')}
                        >
                          MIN{arrow('min')}
                        </th>
                        <th
                          className={`p-3 text-center text-orange-400 font-bold ${thStyle}`}
                          onClick={() => handleSort('pts')}
                        >
                          PTS{arrow('pts')}
                        </th>
                        <th
                          className={`p-3 text-center ${thStyle}`}
                          onClick={() => handleSort('fgPct')}
                        >
                          FG%{arrow('fgPct')}
                        </th>
                        <th
                          className={`p-3 text-center text-blue-400 ${thStyle}`}
                          onClick={() => handleSort('threePct')}
                        >
                          3P%{arrow('threePct')}
                        </th>
                        <th
                          className={`p-3 text-center text-slate-400 ${thStyle}`}
                          onClick={() => handleSort('ftPct')}
                        >
                          LF%{arrow('ftPct')}
                        </th>
                        <th
                          className={`p-3 text-center font-bold ${thStyle}`}
                          onClick={() => handleSort('reb')}
                        >
                          REB{arrow('reb')}
                        </th>
                        <th
                          className={`p-3 text-center ${thStyle}`}
                          onClick={() => handleSort('ast')}
                        >
                          PD{arrow('ast')}
                        </th>
                        <th
                          className={`p-3 text-center ${thStyle}`}
                          onClick={() => handleSort('stl')}
                        >
                          INT{arrow('stl')}
                        </th>
                        <th
                          className={`p-3 text-center text-red-400 ${thStyle}`}
                          onClick={() => handleSort('tov')}
                        >
                          BP{arrow('tov')}
                        </th>
                        <th
                          className={`p-3 text-center font-bold ${thStyle}`}
                          onClick={() => handleSort('plusMinus')}
                        >
                          +/-{arrow('plusMinus')}
                        </th>
                        <th
                          className="p-3 text-center text-slate-500 text-[10px]"
                          style={{ minWidth: '70px' }}
                        >
                          FORME
                        </th>
                        <th
                          className={`p-3 text-center text-green-400 font-bold ${thStyle}`}
                          onClick={() => handleSort('eff')}
                        >
                          EVAL{arrow('eff')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {sorted.map((p) => (
                        <tr
                          key={p.info.id}
                          onClick={() => setSelectedPlayer(p)}
                          className="hover:bg-slate-800 cursor-pointer transition-colors odd:bg-slate-900 even:bg-slate-800/40"
                        >
                          <td className="p-3 font-medium text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                                {p.info.number}
                              </div>
                              {p.info.name}
                              {p.info.status === 'injured' && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block ml-1"
                                  title="Blessé"
                                ></span>
                              )}
                              {p.info.status === 'doubtful' && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block ml-1"
                                  title="Douteux"
                                ></span>
                              )}
                              {p.info.status === 'rest' && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block ml-1"
                                  title="Repos"
                                ></span>
                              )}
                              {parseFloat(p.avg.pf) >= 3.5 && (
                                <span
                                  style={{ fontSize: '9px', fontWeight: 700, color: '#fb923c', border: '1px solid #fb923c', borderRadius: '3px', padding: '0 3px', lineHeight: '14px', display: 'inline-block', marginLeft: '4px' }}
                                  title={`${p.avg.pf} fautes/match — risque disqualification`}
                                >FTR</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center text-slate-400">{p.gamesPlayed}</td>
                          <td className="p-3 text-center text-slate-500">{p.avg.min}</td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={per36Val(p.avg.pts, p.avg.min)} stat="pts" format="dec1" showBar barMax={maxPts} /> : <span className="font-bold text-orange-400">{per36Val(p.avg.pts, p.avg.min).toFixed(1)}</span>}
                            {rankMaps.pts?.[p.info.id] <= 3 && <span className="ml-1 text-[9px] text-yellow-500">#{rankMaps.pts[p.info.id]}</span>}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={p.avg.fgPct} stat="fg_pct" format="pct" /> : <span>{p.avg.fgPct}%</span>}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={p.avg.threePct} stat="three_pct" format="pct" /> : <span>{p.avg.threePct}%</span>}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell && p.stats.fta > 0 ? <StatCell value={p.avg.ftPct} stat="ft_pct" format="pct" /> : <span className="text-slate-500">{p.avg.ftPct}%</span>}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={per36Val(p.avg.reb, p.avg.min)} stat="reb" format="dec1" showBar barMax={maxReb} /> : <span className="font-bold text-white">{per36Val(p.avg.reb, p.avg.min).toFixed(1)}</span>}
                            {rankMaps.reb?.[p.info.id] <= 3 && <span className="ml-1 text-[9px] text-yellow-500">#{rankMaps.reb[p.info.id]}</span>}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={per36Val(p.avg.ast, p.avg.min)} stat="ast" format="dec1" /> : per36Val(p.avg.ast, p.avg.min).toFixed(1)}
                            {rankMaps.ast?.[p.info.id] <= 3 && <span className="ml-1 text-[9px] text-yellow-500">#{rankMaps.ast[p.info.id]}</span>}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={per36Val(p.avg.stl, p.avg.min)} stat="stl" format="dec1" /> : per36Val(p.avg.stl, p.avg.min).toFixed(1)}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={per36Val(p.avg.tov, p.avg.min)} stat="tov" format="dec1" /> : per36Val(p.avg.tov, p.avg.min).toFixed(1)}
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={p.avg.plusMinus} stat="plus_minus" format="plusminus" /> : <span className={parseFloat(p.avg.plusMinus) >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{parseFloat(p.avg.plusMinus) > 0 ? '+' : ''}{p.avg.plusMinus}</span>}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <Sparkline logs={p.logs} />
                              {p.streak && p.streak.status !== 'steady' && (
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${p.streak.status === 'hot' ? 'bg-orange-900/50 text-orange-400 border border-orange-700/50' : 'bg-blue-900/50 text-blue-400 border border-blue-700/50'}`}>
                                  {p.streak.status === 'hot' ? 'EN FORME' : 'CREUX'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {StatCell ? <StatCell value={p.avg.eff} stat="eval" format="dec1" showBar barMax={maxEval} /> : <span className={`font-bold ${parseFloat(p.avg.eff) >= teamAvgEff + 2 ? 'text-green-400' : parseFloat(p.avg.eff) <= teamAvgEff - 2 ? 'text-red-400' : 'text-slate-300'}`}>{p.avg.eff}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
      </window.Card>
      {selectedPlayer && (
        <window.Modal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          title={
            <>
              <window.Icon path={window.Icons.Trophy} className="text-yellow-400" />{' '}
              {selectedPlayer?.info.name}
              {selectedPlayer?.info.status === 'injured' && (
                <span
                  className="w-3 h-3 rounded-full bg-red-500 inline-block ml-2"
                  title="Blessé"
                ></span>
              )}
              {selectedPlayer?.info.status === 'doubtful' && (
                <span
                  className="w-3 h-3 rounded-full bg-yellow-500 inline-block ml-2"
                  title="Douteux"
                ></span>
              )}
              {selectedPlayer?.info.status === 'rest' && (
                <span
                  className="w-3 h-3 rounded-full bg-slate-400 inline-block ml-2"
                  title="Repos"
                ></span>
              )}
            </>
          }
          size="max-w-5xl"
        >
          <div id="player-report-content" className="space-y-5">

            {/* ── S1 HERO HEADER ────────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* Ligne 1 : Identité + badge X-Factor */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-white">{selectedPlayer.info.name}</span>
                  <button
                    onClick={async () => {
                      const { default: html2canvas } = await import('html2canvas');
                      const { default: jsPDF } = await import('jspdf');
                      const el = document.getElementById('player-report-content');
                      if (!el) return;
                      const canvas = await html2canvas(el, { backgroundColor: '#0a0f1e', scale: 2 });
                      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                      const imgData = canvas.toDataURL('image/png');
                      const w = pdf.internal.pageSize.getWidth();
                      const h = (canvas.height * w) / canvas.width;
                      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
                      const name = selectedPlayer.info.name.replace(/\s+/g, '_');
                      const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
                      pdf.save(`rapport-${name}-${date}.pdf`);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Export PDF
                  </button>
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>
                    #{selectedPlayer.info.number} · {selectedPlayer.info.pos || '—'}
                  </span>
                  {selectedPlayer.info.status === 'injured'  && <span className="w-2.5 h-2.5 rounded-full bg-red-500    inline-block" title="Blessé" />}
                  {selectedPlayer.info.status === 'doubtful' && <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" title="Douteux" />}
                  {selectedPlayer.info.status === 'rest'     && <span className="w-2.5 h-2.5 rounded-full bg-slate-400  inline-block" title="Repos" />}
                </div>
                {(() => {
                  const qualPlayers = (aggregatedEnriched || []).filter(
                    (p) => p.gamesPlayed > 0 && parseFloat(p.avg.min || 0) > 5
                  );
                  const ct = qualPlayers.length;
                  const teamAvg = ct > 0 ? {
                    PIE:    qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.PIE)      || 0), 0) / ct,
                    TS:     qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.TS)       || 0), 0) / ct,
                    DRtg:   qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.DRtg)     || 0), 0) / ct,
                    stlBlk: qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.stl) || 0) + (parseFloat(p.avg.blk) || 0), 0) / ct,
                    dreb:   qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.dreb)     || 0), 0) / ct,
                    costFoul: qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.costFoul) || 0), 0) / ct,
                    fgaFtaPerGame: qualPlayers.reduce((s, p) => {
                      const g = p.gamesPlayed || 1;
                      return s + ((parseFloat(p.avg.fga) || 0) + (parseFloat(p.avg.fta) || 0)) / g;
                    }, 0) / ct,
                    min: qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.min) || 0), 0) / ct,
                  } : {};
                  const badges = getAdvancedPlayerBadges(selectedPlayer, teamAvg);
                  if (!badges.length) return null;
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {badges.map((b) => (
                        <span key={b.id} className="relative group">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border cursor-default ${b.colorClass} ${b.bgColorClass}`}>
                            <span aria-hidden="true">{b.icon}</span>
                            <span>{b.label}</span>
                          </span>
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-center text-xs leading-relaxed text-slate-200 shadow-xl opacity-0 invisible transition-all duration-150 group-hover:opacity-100 group-hover:visible">
                            {b.description}
                          </span>
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Ligne 2 : 4 Hero Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Points',     val: selectedPlayer.avg.pts, stat: 'pts', logs: (selectedPlayer.logs || []).map(l => l.pts) },
                  { label: 'Rebonds',    val: selectedPlayer.avg.reb, stat: 'reb', logs: (selectedPlayer.logs || []).map(l => l.reb) },
                  { label: 'Passes',     val: selectedPlayer.avg.ast, stat: 'ast', logs: (selectedPlayer.logs || []).map(l => l.ast) },
                  { label: 'Évaluation', val: selectedPlayer.avg.eff, stat: 'eval', logs: (selectedPlayer.logs || []).map(l => l.eff) },
                ].map((kpi) => {
                  const SC = window.StatComponents || {};
                  const color = getStatColor(parseFloat(kpi.val) || 0, kpi.stat);
                  return (
                    <div key={kpi.label} className="rounded-lg p-4 border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                      <div className="text-xs uppercase font-semibold tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>{kpi.label}</div>
                      <div className={`text-2xl font-bold stat-num ${color}`}>{(parseFloat(kpi.val) || 0).toFixed(1)}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>/match</span>
                        {SC.MiniSparkline && kpi.logs.length >= 2 && (
                          <SC.MiniSparkline data={kpi.logs} width={44} height={12} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── S2 DETAIL TIR & ACTIVITÉ ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

              {/* 2A : Jauges de tir */}
              <div className="md:col-span-3 rounded-lg p-4 border space-y-4" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-3)' }}>Adresses au tir</div>
                {[
                  { label: 'Tir global',     val: selectedPlayer.avg.fgPct,    stat: 'fg_pct',    made: selectedPlayer.stats.fgm,    att: selectedPlayer.stats.fga },
                  { label: 'À 3 points',     val: selectedPlayer.avg.threePct, stat: 'three_pct', made: selectedPlayer.stats.threePM, att: selectedPlayer.stats.threePA },
                  { label: 'Lancers francs', val: selectedPlayer.avg.ftPct,    stat: 'ft_pct',    made: selectedPlayer.stats.ftm,    att: selectedPlayer.stats.fta },
                ].map((sh) => {
                  const textColor = getStatColor(parseFloat(sh.val) || 0, sh.stat);
                  const barColor  = getBarColor(parseFloat(sh.val) || 0, sh.stat);
                  const pct       = Math.min(parseFloat(sh.val) || 0, 100);
                  return (
                    <div key={sh.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>{sh.label}</span>
                        <span className={`text-sm font-bold stat-num ${textColor}`}>{sh.val}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sh.made}-{sh.att}</div>
                    </div>
                  );
                })}
              </div>

              {/* 2B : Impact Défensif */}
              {(() => {
                const qualPlayers = aggregated.filter(p => p.gamesPlayed > 0 && parseFloat(p.avg.min || 0) > 5);
                const teamAvgStl  = qualPlayers.length > 0 ? qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.stl) || 0), 0) / qualPlayers.length : 0;
                const teamAvgBlk  = qualPlayers.length > 0 ? qualPlayers.reduce((s, p) => s + (parseFloat(p.avg.blk) || 0), 0) / qualPlayers.length : 0;
                return (
                  <div className="md:col-span-2 rounded-lg p-4 border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                    <div className="text-xs uppercase font-bold tracking-wider mb-4" style={{ color: 'var(--text-3)' }}>Impact Défensif</div>
                    <div className="space-y-4">
                      {[
                        { label: 'Interceptions', val: selectedPlayer.avg.stl, stat: 'stl', teamAvg: teamAvgStl,
                          icon: <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8L21 10h-9l1-8"/></svg> },
                        { label: 'Contres', val: selectedPlayer.avg.blk, stat: 'blk', teamAvg: teamAvgBlk,
                          icon: <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                      ].map((d) => {
                        const textColor = getStatColor(parseFloat(d.val) || 0, d.stat);
                        const aboveAvg  = (parseFloat(d.val) || 0) > d.teamAvg;
                        return (
                          <div key={d.label} className="flex items-center gap-3">
                            <span style={{ color: 'var(--text-3)' }}>{d.icon}</span>
                            <div>
                              <div className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>{d.label}</div>
                              <div className={`text-xl font-bold stat-num ${textColor}`}>
                                {d.val}
                                {aboveAvg && <span className="text-xs ml-1" style={{ color: 'var(--accent)' }}>★</span>}
                              </div>
                              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>moy équipe : {d.teamAvg.toFixed(1)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── S3 IMPACT W/L ─────────────────────────────────────────────── */}
            {selectedPlayer.splitWL?.win && selectedPlayer.splitWL?.loss && (
              <div className="rounded-lg p-4 border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                  Impact&nbsp;
                  <span style={{ color: 'var(--made)' }}>Victoires</span>
                  &nbsp;/&nbsp;
                  <span style={{ color: 'var(--miss)' }}>Défaites</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                    <thead>
                      <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
                        <th className="p-2 text-left font-normal">Stat</th>
                        <th className="p-2 text-center font-normal">En W ({selectedPlayer.splitWL.win.gp}m)</th>
                        <th className="p-2 text-center font-normal">En L ({selectedPlayer.splitWL.loss.gp}m)</th>
                        <th className="p-2 text-center font-bold" style={{ color: 'var(--text-2)' }}>Δ W-L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Points',         wk: 'pts',        invert: false },
                        { label: 'Rebonds',         wk: 'reb',        invert: false },
                        { label: 'Passes',          wk: 'ast',        invert: false },
                        { label: 'Évaluation',      wk: 'eff',        invert: false },
                        { label: '+/-',             wk: 'plusMinus',  invert: false },
                        { label: 'FG%',             wk: 'fgPct',      invert: false, suffix: '%' },
                        { label: '3P%',             wk: 'threePct',   invert: false, suffix: '%' },
                        { label: 'Balles perdues',  wk: 'tov',        invert: true },
                      ].map((row, ri) => {
                        const wVal  = parseFloat(selectedPlayer.splitWL.win[row.wk])  || 0;
                        const lVal  = parseFloat(selectedPlayer.splitWL.loss[row.wk]) || 0;
                        const delta = wVal - lVal;
                        const favorable   = row.invert ? delta < 0 : delta > 0;
                        const deltaColor  = Math.abs(delta) < 0.1 ? 'var(--text-3)' : favorable ? 'var(--made)' : 'var(--miss)';
                        const sign        = delta > 0 ? '+' : '';
                        const isDeltaRow  = ri === 7;
                        return (
                          <tr key={row.label} className="border-b" style={{ borderColor: 'var(--border)', background: isDeltaRow ? 'var(--bg-2)' : 'transparent' }}>
                            <td className="p-2 text-xs" style={{ color: 'var(--text-3)' }}>{row.label}</td>
                            <td className="p-2 text-center" style={{ color: 'rgba(52,211,153,0.8)' }}>{wVal.toFixed(1)}{row.suffix || ''}</td>
                            <td className="p-2 text-center" style={{ color: 'rgba(248,113,113,0.8)' }}>{lVal.toFixed(1)}{row.suffix || ''}</td>
                            <td className="p-2 text-center font-bold" style={{ color: deltaColor }}>{sign}{delta.toFixed(1)}{row.suffix || ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── S3.5 COÛT DES ERREURS ─────────────────────────────────────── */}
            {selectedPlayer.gamesPlayed > 0 && (
              <div className="rounded-lg p-4 border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                  Coût des erreurs&nbsp;
                  <span className="font-normal lowercase" style={{ color: 'var(--text-3)' }}>(Moyenne / Total)</span>
                </div>
                <div className="space-y-1">
                  {[
                    {
                      label: 'Points encaissés sur BP',
                      avg: selectedPlayer.avg.costTov,
                      total: selectedPlayer.total.costTov,
                      color: 'var(--miss)',
                    },
                    {
                      label: 'Points encaissés sur Fautes',
                      avg: selectedPlayer.avg.costFoul,
                      total: selectedPlayer.total.costFoul,
                      color: 'var(--miss)',
                    },
                    {
                      label: 'Erreurs sans conséquence',
                      avg: selectedPlayer.avg.unpunishedErrors,
                      total: selectedPlayer.total.unpunishedErrors,
                      color: 'var(--made)',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-2 border-b"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>{row.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold stat-num" style={{ color: row.color }}>
                          {row.avg}/m
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          (Total&nbsp;: {row.total})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── S3.6 GAINS GÉNÉRÉS ───────────────────────────────────────── */}
            {selectedPlayer.gamesPlayed > 0 && (
              <div className="rounded-lg p-4 border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                <div className="text-xs uppercase font-bold tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                  Gains générés&nbsp;
                  <span className="font-normal lowercase" style={{ color: 'var(--text-3)' }}>(Moyenne / Total)</span>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Pts après interception',    avg: selectedPlayer.avg.stlGain,  total: selectedPlayer.total.stlGain },
                    { label: 'Pts sur rebond offensif',   avg: selectedPlayer.avg.orebGain, total: selectedPlayer.total.orebGain },
                    { label: 'LF gagnés sur faute adv',   avg: selectedPlayer.avg.lfGain,   total: selectedPlayer.total.lfGain },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>{row.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold stat-num" style={{ color: 'var(--made)' }}>
                          +{row.avg ?? 0}/m
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          (Total&nbsp;: {row.total ?? 0})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── S4 RECORDS DE LA SAISON ───────────────────────────────────── */}
            {(selectedPlayer.logs || []).length >= 3 && (
              <div className="space-y-2">
                <div className="text-sm uppercase font-bold tracking-wider" style={{ color: 'var(--text-3)' }}>Records de la Saison</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {getSeasonHighs(selectedPlayer.logs).map((sh) => {
                    const isTeamBest = aggregated.every(p =>
                      p.info.id === selectedPlayer.info.id ||
                      Math.max(0, ...(p.logs || []).map(l => l[sh.key] || 0)) <= sh.value
                    );
                    return (
                      <div key={sh.key} className="rounded-lg p-3 border"
                        style={{ background: 'var(--bg-3)', borderColor: isTeamBest ? 'rgba(249,115,22,0.4)' : 'var(--border)' }}
                      >
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-3)' }}>
                          {sh.iconSvg}
                          <span className="text-xs">{sh.label}</span>
                          {isTeamBest && <span className="ml-auto text-[10px] font-bold" style={{ color: 'var(--accent)' }}>TOP</span>}
                        </div>
                        <div className="text-lg font-bold text-white stat-num">{sh.value}</div>
                        <div className="text-xs" style={{ color: 'var(--text-3)' }}>vs {sh.opponent}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── S5 STATS AVANCÉES (repliée) ───────────────────────────────── */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 w-full text-left py-2 border-t"
                style={{ color: 'var(--text-2)', borderColor: 'var(--border)', background: 'none', outline: 'none', cursor: 'pointer' }}
              >
                <svg className="w-4 h-4 flex-shrink-0" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
                <span className="text-sm">Statistiques avancées</span>
              </button>

              {showAdvanced && (
                <div className="space-y-4">

                  {/* Grille stats avancées avec tooltips */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'PIR',    val: selectedPlayer.avg.pir,       stat: 'pir',       tooltip: "Performance Index Rating : évaluation globale de l'impact du joueur par match (formule FIBA)" },
                      { label: 'PIE',    val: selectedPlayer.avg.PIE,        stat: 'pie',       suffix: '%', tooltip: "Player Impact Estimate : part du joueur dans la production statistique totale quand il est sur le terrain" },
                      { label: '+/-',    val: selectedPlayer.avg.plusMinus,  stat: 'plus_minus', pm: true, tooltip: "Différentiel de score de l'équipe quand ce joueur est sur le terrain" },
                      { label: 'ORtg',   val: selectedPlayer.avg.ORtg,       stat: 'ortg',       tooltip: "Rating offensif : points produits par 100 possessions" },
                      { label: 'DRtg',   val: selectedPlayer.avg.DRtg,       stat: 'drtg',       tooltip: "Rating défensif : points encaissés par 100 possessions (bas = bon)" },
                      { label: 'NetRtg', val: selectedPlayer.avg.netRtg,     stat: 'net_rtg',    pm: true, tooltip: "Différentiel offensif/défensif sur 100 possessions" },
                      { label: 'Floor Impact', val: selectedPlayer.avg.floorImpact, stat: null, fmt: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '—', tooltip: "Différentiel de score de l'équipe normalisé sur 40 min de jeu du joueur (min. 8 min ON)" },
                      { label: 'MIN/m',  val: selectedPlayer.avg.min,        stat: null,         tooltip: "Minutes moyennes par match" },
                      { label: 'FTE/m',  val: selectedPlayer.avg.pf,         stat: 'pf',         tooltip: "Fautes commises par match" },
                      { label: 'RO/m',   val: selectedPlayer.avg.oreb,       stat: 'oreb',       tooltip: "Rebonds offensifs par match : secondes chances créées" },
                      { label: 'RD/m',   val: selectedPlayer.avg.dreb,       stat: null,         tooltip: "Rebonds défensifs par match : possessions sécurisées" },
                    ].map((item) => {
                      const color   = item.stat ? getStatColor(parseFloat(item.val) || 0, item.stat) : 'text-slate-300';
                      const v       = parseFloat(item.val) || 0;
                      const display = item.fmt  ? item.fmt(item.val)
                                    : item.dec3 ? v.toFixed(3)
                                    : item.pm   ? (v > 0 ? '+' : '') + v.toFixed(1)
                                    :             v.toFixed(1) + (item.suffix || '');
                      return (
                        <div key={item.label} className="rounded-lg p-3 border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{item.label}</span>
                            <div className="relative group ml-auto cursor-help flex-shrink-0">
                              <svg className="w-3 h-3" style={{ color: 'var(--text-3)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path strokeLinecap="round" d="M12 16v-4M12 8h.01"/>
                              </svg>
                              <div className="absolute bottom-full right-0 mb-1 w-44 rounded p-2 text-xs z-50 shadow-lg pointer-events-none invisible group-hover:visible"
                                style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                                {item.tooltip}
                              </div>
                            </div>
                          </div>
                          <div className={`text-lg font-bold stat-num ${color}`}>{display}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Graphiques Recharts */}
                  {(selectedPlayer.logs || []).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold">Scoring & Éval par match</h4>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedPlayer.logs}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                              <XAxis dataKey="opponent" stroke="#a0a0b0" fontSize={10} hide />
                              <YAxis stroke="#a0a0b0" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#1e1e3a', border: '1px solid #3a3a5a', borderRadius: '8px' }} />
                              <Line type="monotone" dataKey="pts" name="Points" stroke="#FF6B35" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="eff" name="Éval"   stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                              <ReferenceLine y={parseFloat(selectedPlayer.avg.pts)} stroke="#FF6B35" strokeDasharray="4 2" strokeOpacity={0.45}
                                label={{ value: `Moy ${selectedPlayer.avg.pts}`, fill: '#FF6B35', fontSize: 9, position: 'insideTopRight' }} />
                              <ReferenceLine y={parseFloat(selectedPlayer.avg.eff)} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.45}
                                label={{ value: `Moy ${selectedPlayer.avg.eff}`, fill: '#22c55e', fontSize: 9, position: 'insideBottomRight' }} />
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
                              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                              <XAxis dataKey="opponent" stroke="#a0a0b0" fontSize={10} hide />
                              <YAxis stroke="#a0a0b0" fontSize={10} domain={['auto', 'auto']} />
                              <Tooltip contentStyle={{ backgroundColor: '#1e1e3a', border: '1px solid #3a3a5a', borderRadius: '8px' }} />
                              <Line type="monotone" dataKey="ORtg" name="ORtg" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="DRtg" name="DRtg" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                              <ReferenceLine y={parseFloat(selectedPlayer.avg.ORtg)} stroke="#a855f7" strokeDasharray="4 2" strokeOpacity={0.45}
                                label={{ value: `Moy ${selectedPlayer.avg.ORtg}`, fill: '#a855f7', fontSize: 9, position: 'insideTopRight' }} />
                              <ReferenceLine y={parseFloat(selectedPlayer.avg.DRtg)} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.45}
                                label={{ value: `Moy ${selectedPlayer.avg.DRtg}`, fill: '#ef4444', fontSize: 9, position: 'insideBottomRight' }} />
                              <Legend />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <GhostSeasonChart logs={selectedPlayer.logs} currentGame={null} />
                      <ArchetypeRadar player={selectedPlayer} allPlayers={aggregated} />
                      <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 md:col-span-2">
                        <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold">Évolution PIR</h4>
                        <div className="h-32 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedPlayer.logs.map((l, i) => ({ name: l.opponent || `M${i + 1}`, pir: l.pir || 0 }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: '11px' }} />
                              <Line type="monotone" dataKey="pir" name="PIR" stroke="#a78bfa" strokeWidth={2} dot={{ r: 2 }} />
                              <ReferenceLine y={parseFloat(selectedPlayer.avg.pir)} stroke="#a78bfa" strokeDasharray="4 2" strokeOpacity={0.45}
                                label={{ value: `Moy ${selectedPlayer.avg.pir}`, fill: '#a78bfa', fontSize: 9, position: 'insideTopRight' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tableau match par match */}
                  {(selectedPlayer.logs || []).length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase mb-2 font-bold tracking-wider" style={{ color: 'var(--text-3)' }}>
                        Match par match ({selectedPlayer.gamesPlayed} matchs)
                      </h4>
                      <div className="overflow-x-auto rounded-lg border max-h-64" style={{ background: 'var(--bg-1)', borderColor: 'var(--border)' }}>
                        <table className="w-full text-xs text-slate-300 whitespace-nowrap">
                          <thead className="bg-slate-800 text-white uppercase text-[10px] sticky top-0 z-10">
                            <tr>
                              <th className="p-2 text-left sticky left-0 bg-slate-800 z-20">Adversaire</th>
                              <th className="p-2 text-center text-slate-500">Phase</th>
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
                                <td className="p-2 text-center text-slate-500 text-[10px]">
                                  {phases.find((p) => p.id === log.phase)?.name ?? ''}
                                </td>
                                <td className="p-2 text-center">
                                  <span className="text-green-400">{log.score}</span>
                                  <span className="text-slate-600"> - </span>
                                  <span className="text-red-400">{log.conceded}</span>
                                </td>
                                <td className="p-2 text-center text-slate-500">{log.min}</td>
                                <td className="p-2 text-center font-bold text-orange-400">{log.pts}{log.pts > 0 && log.pts === selectedPlayer.records.pts && <SeasonHighBadge />}</td>
                                <td className="p-2 text-center">{log.reb}{log.reb > 0 && log.reb === selectedPlayer.records.reb && <SeasonHighBadge />}</td>
                                <td className="p-2 text-center">{log.ast}{log.ast > 0 && log.ast === selectedPlayer.records.ast && <SeasonHighBadge />}</td>
                                <td className="p-2 text-center">{log.stl}</td>
                                <td className="p-2 text-center text-red-400">{log.tov}</td>
                                <td className={`p-2 text-center font-bold ${log.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{log.plusMinus > 0 ? '+' : ''}{log.plusMinus}</td>
                                <td className="p-2 text-center text-purple-400">{log.ORtg}</td>
                                <td className="p-2 text-center text-red-400">{log.DRtg}</td>
                                <td className="p-2 text-center font-bold text-green-400">{log.eff}{log.eff > 0 && log.eff === selectedPlayer.records.eff && <SeasonHighBadge />}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Notes coach */}
                  <div className="rounded-lg p-4 border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs uppercase font-bold mb-2" style={{ color: 'var(--text-3)' }}>Notes du Coach</h4>
                    <textarea
                      value={playerNotes}
                      onChange={(e) => setPlayerNotes(e.target.value)}
                      onBlur={() => {
                        if (!selectedPlayer) return;
                        const roster = useDataStore.getState().players;
                        const updated = roster.map((p) =>
                          String(p.id) === String(selectedPlayer.info.id)
                            ? { ...p, coachNotes: playerNotes }
                            : p
                        );
                        useDataStore.getState().setPlayers(updated);
                        window.DB.saveRoster(updated).catch(console.error);
                      }}
                      placeholder="Notes du coach..."
                      className="bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 p-3 w-full min-h-[80px] outline-none focus:border-orange-500"
                    />
                  </div>

                </div>
              )}
            </div>

          </div>
        </window.Modal>
      )}
      {activeTab === 'team' && (
        <>
          <div className="space-y-4 mb-8">
            {/* Header cliquable pour toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-orange-400 uppercase flex items-center gap-2">
                <window.Icon path={window.Icons.TrendingUp} className="w-4 h-4" />
                Analyse Équipe
              </h3>
              <button
                onClick={() => setActiveTab('players')}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                title="Retour aux stats joueurs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {filteredGames.length > 0 && (
              <div className="space-y-4">
                {/* --- IMPACT STATEMENT + BADGES --- */}
                {(() => {
                  const badges = getTeamBadges(teamTrendsData, filteredGames);
                  const statement = generateTeamImpactStatement(teamTrendsData, fourFactorsData, filteredGames);
                  return (
                    <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-slate-400 flex-1 min-w-0">{statement}</span>
                      <div className="flex flex-wrap gap-2">
                        {badges.map((b, i) => (
                          <span key={i} className="sc-badge text-[10px]" style={{ color: b.color, borderColor: b.color }}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* --- BANDEAU BILAN --- */}
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                  {[
                    { label: 'Victoires', value: teamTrendsData.wins, color: 'text-green-400' },
                    { label: 'Défaites', value: teamTrendsData.losses, color: 'text-red-400' },
                    {
                      label: 'Win%',
                      value:
                        filteredGames.length > 0
                          ? Math.round((teamTrendsData.wins / filteredGames.length) * 100) + '%'
                          : '-',
                      color: 'text-white',
                    },
                    {
                      label: 'Série',
                      value: teamTrendsData.streak,
                      color: teamTrendsData.streak.startsWith('W')
                        ? 'text-green-400'
                        : teamTrendsData.streak.startsWith('L')
                          ? 'text-red-400'
                          : 'text-slate-400',
                    },
                    { label: 'Pts/m', value: teamTrendsData.avgs.pts, color: 'text-orange-400' },
                    {
                      label: 'Encaissés/m',
                      value: teamTrendsData.avgs.conceded,
                      color: 'text-red-400',
                    },
                    {
                      label: 'Diff moy',
                      value: (
                        parseFloat(teamTrendsData.avgs.pts) -
                        parseFloat(teamTrendsData.avgs.conceded)
                      ).toFixed(1),
                      color:
                        parseFloat(teamTrendsData.avgs.pts) -
                          parseFloat(teamTrendsData.avgs.conceded) >=
                        0
                          ? 'text-green-400'
                          : 'text-red-400',
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/50"
                    >
                      <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{item.label}</div>
                    </div>
                  ))}
                </div>
                {fourFactorsData && (
                  <window.Card className="p-4">
                    <h4 className="text-xs text-slate-400 uppercase font-bold mb-3 flex items-center gap-2">
                      <window.Icon path={window.Icons.TrendingUp} className="w-3.5 h-3.5" />
                      Four Factors (Dean Oliver)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {[
                        {
                          label: 'eFG%',
                          desc: 'Efficacite tirs',
                          team: fourFactorsData.team.eFG,
                          opp: fourFactorsData.opp.eFG,
                          higherIsBetter: true,
                        },
                        {
                          label: 'TOV%',
                          desc: 'Taux pertes balle',
                          team: fourFactorsData.team.tovPct,
                          opp: fourFactorsData.opp.tovPct,
                          higherIsBetter: false,
                        },
                        {
                          label: 'OREB%',
                          desc: 'Rebonds offensifs',
                          team: fourFactorsData.team.orebPct,
                          opp: fourFactorsData.opp.orebPct,
                          higherIsBetter: true,
                        },
                        {
                          label: 'FT Rate',
                          desc: 'Acces LF',
                          team: fourFactorsData.team.ftRate,
                          opp: fourFactorsData.opp.ftRate,
                          higherIsBetter: true,
                        },
                      ].map((f, i) => {
                        const diff = f.higherIsBetter ? f.team - f.opp : f.opp - f.team;
                        const isGood = diff > 0;
                        return (
                          <div
                            key={i}
                            className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50"
                          >
                            <div className="text-[10px] text-slate-500 uppercase mb-1">
                              {f.label}
                            </div>
                            <div className="text-xs text-slate-600 mb-2">{f.desc}</div>
                            <div className="flex items-end justify-between">
                              <div>
                                <div
                                  className={`text-lg font-bold ${isGood ? 'text-green-400' : 'text-red-400'}`}
                                >
                                  {f.team}%
                                </div>
                                <div className="text-[10px] text-slate-500">Equipe</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-slate-400">{f.opp}%</div>
                                <div className="text-[10px] text-slate-600">Adv.</div>
                              </div>
                            </div>
                            <div
                              className={`mt-2 text-[10px] font-medium text-center rounded py-0.5 ${isGood ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
                            >
                              {isGood ? '+' : ''}
                              {(f.higherIsBetter ? f.team - f.opp : f.opp - f.team).toFixed(1)}
                            </div>
                            {/* Dual bar: équipe vs adversaire */}
                            <div className="mt-2 space-y-1">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '8px', color: '#64748b', width: '24px', textAlign: 'right', flexShrink: 0 }}>EQ</span>
                                <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(parseFloat(f.team) || 0, 100)}%`, height: '100%', background: isGood ? '#34d399' : '#f87171', borderRadius: '99px' }} />
                                </div>
                                <span style={{ fontSize: '8px', color: '#64748b', width: '20px', flexShrink: 0 }}>{f.team}%</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '8px', color: '#64748b', width: '24px', textAlign: 'right', flexShrink: 0 }}>ADV</span>
                                <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(parseFloat(f.opp) || 0, 100)}%`, height: '100%', background: '#475569', borderRadius: '99px' }} />
                                </div>
                                <span style={{ fontSize: '8px', color: '#64748b', width: '20px', flexShrink: 0 }}>{f.opp}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {fourFactorsData.radarData.length === 4 && (
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30 mb-4">
                        <h5 className="text-[10px] text-slate-500 uppercase mb-2 font-bold">
                          Radar comparatif
                        </h5>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              data={fourFactorsData.radarData}
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                            >
                              <PolarGrid stroke="#2a2a4a" />
                              <PolarAngleAxis
                                dataKey="factor"
                                tick={{ fill: '#a0a0b0', fontSize: 11 }}
                              />
                              <PolarRadiusAxis tick={{ fill: '#505070', fontSize: 9 }} />
                              <Radar
                                name="Equipe"
                                dataKey="team"
                                stroke="#FF6B35"
                                fill="#FF6B35"
                                fillOpacity={0.25}
                                strokeWidth={2}
                              />
                              <Radar
                                name="Adversaire"
                                dataKey="opp"
                                stroke="#ef4444"
                                fill="#ef4444"
                                fillOpacity={0.1}
                                strokeWidth={2}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1e1e3a',
                                  border: '1px solid #3a3a5a',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {fourFactorsData.winFF && fourFactorsData.lossFF && (
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                        <h5 className="text-[10px] text-slate-500 uppercase mb-2 font-bold">
                          Four Factors — <span className="text-green-400">Victoires</span> vs{' '}
                          <span className="text-red-400">Defaites</span>
                        </h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-slate-300">
                            <thead>
                              <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase">
                                <th className="p-2 text-left">Factor</th>
                                <th className="p-2 text-center text-green-400">
                                  W ({teamTrendsData.wins}m)
                                </th>
                                <th className="p-2 text-center text-red-400">
                                  L ({teamTrendsData.losses}m)
                                </th>
                                <th className="p-2 text-center">Diff</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {[
                                {
                                  label: 'eFG%',
                                  win: fourFactorsData.winFF.eFG,
                                  loss: fourFactorsData.lossFF.eFG,
                                  higherIsBetter: true,
                                },
                                {
                                  label: 'TOV%',
                                  win: fourFactorsData.winFF.tovPct,
                                  loss: fourFactorsData.lossFF.tovPct,
                                  higherIsBetter: false,
                                },
                                {
                                  label: 'OREB%',
                                  win: fourFactorsData.winFF.orebPct,
                                  loss: fourFactorsData.lossFF.orebPct,
                                  higherIsBetter: true,
                                },
                                {
                                  label: 'FT Rate',
                                  win: fourFactorsData.winFF.ftRate,
                                  loss: fourFactorsData.lossFF.ftRate,
                                  higherIsBetter: true,
                                },
                              ].map((r, i) => {
                                const rawDiff = r.higherIsBetter ? r.win - r.loss : r.loss - r.win;
                                return (
                                  <tr key={i} className="hover:bg-slate-800/40">
                                    <td className="p-2 text-left font-medium text-slate-400">
                                      {r.label}
                                    </td>
                                    <td className="p-2 text-center text-green-400">{r.win}%</td>
                                    <td className="p-2 text-center text-red-400">{r.loss}%</td>
                                    <td
                                      className={`p-2 text-center font-bold ${rawDiff > 0 ? 'text-green-400' : rawDiff < 0 ? 'text-red-400' : 'text-slate-500'}`}
                                    >
                                      {rawDiff > 0 ? '+' : ''}
                                      {rawDiff.toFixed(1)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </window.Card>
                )}
                {/* --- TABLEAU COMPARATIF W/L --- */}
                {teamTrendsData.wins > 0 && teamTrendsData.losses > 0 && (
                  <window.Card className="p-4">
                    <h4 className="text-xs text-slate-400 uppercase font-bold mb-3 flex items-center gap-2">
                      <span className="text-green-400">W</span> vs{' '}
                      <span className="text-red-400">L</span> — Comparatif
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-slate-300">
                        <thead>
                          <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase">
                            <th className="p-2 text-left">Stat</th>
                            <th className="p-2 text-center text-green-400">
                              Victoires ({teamTrendsData.wins}m)
                            </th>
                            <th className="p-2 text-center text-red-400">
                              Défaites ({teamTrendsData.losses}m)
                            </th>
                            <th className="p-2 text-center">Diff</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {(() => {
                            const w = teamTrendsData.winAvgs;
                            const l = teamTrendsData.lossAvgs;
                            const rows = [
                              {
                                label: 'Points marqués',
                                win: w.pts,
                                loss: l.pts,
                                higherIsBetter: true,
                              },
                              {
                                label: 'Points encaissés',
                                win: w.conceded,
                                loss: l.conceded,
                                higherIsBetter: false,
                              },
                              {
                                label: 'FG%',
                                win: w.fgPct + '%',
                                loss: l.fgPct + '%',
                                diff: (parseFloat(w.fgPct) - parseFloat(l.fgPct)).toFixed(1) + '%',
                                higherIsBetter: true,
                              },
                              {
                                label: '3P%',
                                win: w.threePct + '%',
                                loss: l.threePct + '%',
                                diff:
                                  (parseFloat(w.threePct) - parseFloat(l.threePct)).toFixed(1) +
                                  '%',
                                higherIsBetter: true,
                              },
                              {
                                label: 'LF%',
                                win: w.ftPct + '%',
                                loss: l.ftPct + '%',
                                diff: (parseFloat(w.ftPct) - parseFloat(l.ftPct)).toFixed(1) + '%',
                                higherIsBetter: true,
                              },
                              { label: 'Rebonds', win: w.reb, loss: l.reb, higherIsBetter: true },
                              { label: 'Passes D.', win: w.ast, loss: l.ast, higherIsBetter: true },
                              {
                                label: 'Interceptions',
                                win: w.stl,
                                loss: l.stl,
                                higherIsBetter: true,
                              },
                              {
                                label: 'Balles perdues',
                                win: w.tov,
                                loss: l.tov,
                                higherIsBetter: false,
                              },
                              { label: 'Fautes', win: w.pf, loss: l.pf, higherIsBetter: false },
                            ];

                            const withDiff = rows.map((r) => {
                              const wVal = parseFloat(r.win);
                              const lVal = parseFloat(r.loss);
                              const rawDiff = r.diff || (wVal - lVal).toFixed(1);
                              const numDiff = parseFloat(rawDiff);
                              const isGood = r.higherIsBetter ? numDiff >= 0 : numDiff <= 0;
                              return {
                                ...r,
                                rawDiff,
                                numDiff,
                                isGood,
                                absImpact: Math.abs(numDiff),
                              };
                            });

                            withDiff.sort((a, b) => b.absImpact - a.absImpact);

                            return withDiff.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-800/50">
                                <td className="p-2 text-left font-medium text-white text-xs">
                                  {r.label}
                                </td>
                                <td className="p-2 text-center text-green-400 font-mono">
                                  {r.win}
                                </td>
                                <td className="p-2 text-center text-red-400 font-mono">{r.loss}</td>
                                <td
                                  className={`p-2 text-center font-bold font-mono ${r.isGood ? 'text-green-400' : 'text-red-400'}`}
                                >
                                  {parseFloat(r.rawDiff) > 0 ? '+' : ''}
                                  {r.rawDiff}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </window.Card>
                )}

                {/* --- GRAPHIQUE NET RATING PAR MATCH --- */}
                {teamTrendsData.data.length > 1 && (
                  <window.Card className="p-4">
                    <h4 className="text-xs text-slate-400 uppercase mb-3 font-bold">
                      Différentiel par match
                    </h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={teamTrendsData.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
                          <XAxis
                            dataKey="opponent"
                            stroke="#a0a0b0"
                            fontSize={10}
                            angle={-45}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis stroke="#a0a0b0" fontSize={10} />
                          <ReferenceLine y={0} stroke="#50506a" strokeDasharray="3 3" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e1e3a',
                              border: '1px solid #3a3a5a',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="NetRtg" name="Diff Pts" radius={[4, 4, 0, 0]}>
                            {teamTrendsData.data.map((entry, index) => (
                              <Cell key={index} fill={entry.NetRtg >= 0 ? '#22c55e' : '#ef4444'} />
                            ))}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </window.Card>
                )}
              </div>
            )}
          </div>
          {combosData.hasData && (combosData.duos.length > 0 || combosData.trios.length > 0) && (
            <window.Card className="p-4 mb-8">
              <h4 className="text-xs text-slate-400 uppercase font-bold mb-4 flex items-center gap-2">
                <window.Icon path={window.Icons.Users} className="w-4 h-4 text-purple-400" />
                Meilleures Combinaisons
                <span className="text-[10px] text-slate-600 font-normal ml-2">
                  (matchs avec play-by-play uniquement)
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DUOS */}
                {combosData.duos.length > 0 && (
                  <div>
                    <h5 className="text-xs text-purple-400 uppercase font-bold mb-2">Duos</h5>
                    <div className="space-y-1">
                      {combosData.duos.map((d, i) => (
                        <div
                          key={d.key}
                          className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        >
                          <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white font-medium truncate">
                              {d.names.join(' + ')}
                            </div>
                            <div className="text-[10px] text-slate-500">{d.poss} poss</div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-bold ${d.netRtg >= 0 ? 'text-green-400' : 'text-red-400'}`}
                            >
                              {d.netRtg > 0 ? '+' : ''}
                              {d.netRtg}
                            </div>
                            <div className="text-[10px] text-slate-500">Net Rtg</div>
                          </div>
                          <div className="text-right ml-2">
                            <div
                              className={`text-xs font-mono ${d.pm >= 0 ? 'text-green-400' : 'text-red-400'}`}
                            >
                              {d.pm > 0 ? '+' : ''}
                              {d.pm}
                            </div>
                            <div className="text-[10px] text-slate-500">+/-</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TRIOS */}
                {combosData.trios.length > 0 && (
                  <div>
                    <h5 className="text-xs text-cyan-400 uppercase font-bold mb-2">Trios</h5>
                    <div className="space-y-1">
                      {combosData.trios.map((d, i) => (
                        <div
                          key={d.key}
                          className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        >
                          <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white font-medium truncate">
                              {d.names.join(' + ')}
                            </div>
                            <div className="text-[10px] text-slate-500">{d.poss} poss</div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-bold ${d.netRtg >= 0 ? 'text-green-400' : 'text-red-400'}`}
                            >
                              {d.netRtg > 0 ? '+' : ''}
                              {d.netRtg}
                            </div>
                            <div className="text-[10px] text-slate-500">Net Rtg</div>
                          </div>
                          <div className="text-right ml-2">
                            <div
                              className={`text-xs font-mono ${d.pm >= 0 ? 'text-green-400' : 'text-red-400'}`}
                            >
                              {d.pm > 0 ? '+' : ''}
                              {d.pm}
                            </div>
                            <div className="text-[10px] text-slate-500">+/-</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </window.Card>
          )}
        </>
      )}
      <window.Modal
        isOpen={showVolumeMatrix}
        onClose={() => setShowVolumeMatrix(false)}
        title={
          <>
            <window.Icon path={window.Icons.Chart} /> Matrice Volume / Efficacité
          </>
        }
        size="max-w-3xl"
      >
        <VolumeEfficiencyMatrix players={aggregated} />
      </window.Modal>
    </div>
  );
}

window.GlobalStats = GlobalStats;
