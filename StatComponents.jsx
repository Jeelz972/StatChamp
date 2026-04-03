// StatComponents.jsx — Composants visuels partagés pour les tableaux et dashboards
// Expose via window.StatComponents pour les fichiers non-ESM
import React from 'react';

// ---------------------------------------------------------------------------
// getStatLevel — niveaux de performance par stat
// ---------------------------------------------------------------------------
const THRESHOLDS = {
  fg_pct:     { elite: 50,  good: 43,  average: 36,  below: 28,  inverted: false },
  two_pct:    { elite: 55,  good: 47,  average: 40,  below: 30,  inverted: false },
  three_pct:  { elite: 40,  good: 35,  average: 28,  below: 20,  inverted: false },
  ft_pct:     { elite: 80,  good: 70,  average: 60,  below: 50,  inverted: false },
  ts_pct:     { elite: 58,  good: 52,  average: 46,  below: 40,  inverted: false },
  efg_pct:    { elite: 56,  good: 50,  average: 44,  below: 37,  inverted: false },
  ast:        { elite: 6,   good: 4,   average: 2.5, below: 1,   inverted: false },
  tov:        { elite: 1.5, good: 2.5, average: 3.5, below: 4.5, inverted: true  },
  stl:        { elite: 2.5, good: 1.5, average: 1,   below: 0.5, inverted: false },
  blk:        { elite: 2,   good: 1,   average: 0.5, below: 0.2, inverted: false },
  plus_minus: { elite: 8,   good: 3,   average: -2,  below: -6,  inverted: false },
  eval:       { elite: 18,  good: 12,  average: 7,   below: 3,   inverted: false },
  pts:        { elite: 18,  good: 12,  average: 7,   below: 3,   inverted: false },
  reb:        { elite: 8,   good: 5,   average: 3,   below: 1.5, inverted: false },
  oreb:       { elite: 3,   good: 1.5, average: 0.7, below: 0.3, inverted: false },
  pf:         { elite: 1.5, good: 2.5, average: 3.5, below: 4.5, inverted: true  },
  net_rtg:    { elite: 8,   good: 3,   average: -2,  below: -6,  inverted: false },
  ortg:       { elite: 115, good: 105, average: 95,  below: 85,  inverted: false },
  drtg:       { elite: 85,  good: 95,  average: 105, below: 115, inverted: true  },
  woba:       { elite: 0.45,good: 0.35,average: 0.25,below: 0.15,inverted: false },
  game_score: { elite: 15,  good: 10,  average: 5,   below: 2,   inverted: false },
  pie:        { elite: 18,  good: 12,  average: 7,   below: 3,   inverted: false },
  pir:        { elite: 20,  good: 12,  average: 5,   below: 0,   inverted: false },
  adj_pm:     { elite: 5,   good: 2,   average: -1,  below: -3,  inverted: false },
};

export function getStatLevel(stat, value) {
  const t = THRESHOLDS[stat];
  if (!t) return 'average';
  const v = parseFloat(value) || 0;
  if (t.inverted) {
    if (v <= t.elite)   return 'elite';
    if (v <= t.good)    return 'good';
    if (v <= t.average) return 'average';
    if (v <= t.below)   return 'below';
    return 'poor';
  }
  if (v >= t.elite)   return 'elite';
  if (v >= t.good)    return 'good';
  if (v >= t.average) return 'average';
  if (v >= t.below)   return 'below';
  return 'poor';
}

export function getStatColor(level) {
  const map = {
    elite:   'var(--accent)',
    good:    'var(--made)',
    average: 'var(--text-2)',
    below:   'var(--sys-warn)',
    poor:    'var(--miss)',
  };
  return map[level] || map.average;
}

// ---------------------------------------------------------------------------
// StatCell — valeur + couleur conditionnelle + barre optionnelle en fond
// ---------------------------------------------------------------------------
export function StatCell({ value, stat, format = 'dec1', showBar = false, barMax = 0 }) {
  const v = parseFloat(value) || 0;
  const level = getStatLevel(stat, v);
  const color = getStatColor(level);

  let display;
  if (format === 'pct')       display = v.toFixed(1) + '%';
  else if (format === 'int')  display = String(Math.round(v));
  else if (format === 'plusminus') display = (v > 0 ? '+' : '') + v.toFixed(1);
  else if (format === 'dec2') display = v.toFixed(2);
  else                        display = v.toFixed(1);

  if (!showBar || barMax <= 0) {
    return <span className="stat-num" style={{ color, fontWeight: 700 }}>{display}</span>;
  }

  const barPct = Math.min((v / barMax) * 100, 100);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: barPct + '%', background: color, opacity: 0.13,
        borderRadius: '3px', pointerEvents: 'none',
      }} />
      <span className="stat-num" style={{ color, fontWeight: 700, position: 'relative', paddingRight: '4px' }}>
        {display}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// TrendIndicator — flèche directionnelle avec delta numérique
// ---------------------------------------------------------------------------
export function TrendIndicator({ delta, inverted = false, suffix = '' }) {
  const d = parseFloat(delta) || 0;
  if (Math.abs(d) < 0.05) return <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>—</span>;
  const isPos = inverted ? d < 0 : d > 0;
  const color = isPos ? 'var(--made)' : 'var(--miss)';
  return (
    <span className="stat-num" style={{ fontSize: '10px', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
      {isPos ? '▲' : '▼'} {d > 0 ? '+' : ''}{d.toFixed(1)}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PercentRing — anneau SVG avec couleur conditionnelle
// ---------------------------------------------------------------------------
export function PercentRing({ value, stat, size = 36, label }) {
  const v = Math.max(0, Math.min(100, parseFloat(value) || 0));
  const level = stat ? getStatLevel(stat, v) : 'average';
  const color = getStatColor(level);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (v / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span className="stat-num" style={{ fontSize: size > 44 ? '11px' : '9px', fontWeight: 700, color, lineHeight: 1 }}>
          {Math.round(v)}
        </span>
        {label && <span style={{ fontSize: '7px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MiniSparkline — courbe inline SVG
// ---------------------------------------------------------------------------
export function MiniSparkline({ data, width = 48, height = 16 }) {
  if (!data || data.length < 2) return null;
  const nums = data.map(v => parseFloat(v) || 0);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const w = width - 2;
  const h = height - 4;
  const pts = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * w + 1;
    const y = height - ((v - min) / range) * h - 2;
    return `${x},${y}`;
  }).join(' ');
  const last = pts.split(' ').pop().split(',');
  const trend = nums[nums.length - 1] - nums[0];
  const color = trend > range * 0.1 ? 'var(--made)' : trend < -range * 0.1 ? 'var(--miss)' : 'var(--text-3)';
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', verticalAlign: 'middle', display: 'inline-block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r="2" fill={color} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// GsTooltip — bulle d'aide hover/tap
// ---------------------------------------------------------------------------
export function GsTooltip({ text, children }) {
  const [show, setShow] = React.useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(v => !v)}
    >
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-3)', border: '1px solid var(--border-strong)',
          color: 'var(--text-2)', fontSize: '11px', borderRadius: 'var(--r-md)',
          padding: '6px 10px', whiteSpace: 'normal', maxWidth: '200px', lineHeight: 1.5,
          zIndex: 300, pointerEvents: 'none', textAlign: 'left', minWidth: '150px',
          boxShadow: 'var(--shadow-elevated)', fontWeight: 400,
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

// Expose globalement pour les fichiers non-ESM
if (typeof window !== 'undefined') {
  window.StatComponents = { getStatLevel, getStatColor, StatCell, TrendIndicator, PercentRing, MiniSparkline, GsTooltip };
}
