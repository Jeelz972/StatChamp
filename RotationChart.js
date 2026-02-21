// RotationChart.js — Diagramme de rotation Gantt (SVG)
// Dépendances : React (global), window.Card, window.Icon, window.Icons
// Export : window.RotationChart

(function () {
  'use strict';
  const { useState, useMemo } = React;

  const QT_DURATION = 600; // 10 min en secondes

  function parseId(val) {
    if (val === 'OPP') return 'OPP';
    const n = parseInt(val);
    return isNaN(n) ? val : n;
  }

  function isOpponent(pid) {
    if (pid === 'OPP') return true;
    const n = typeof pid === 'number' ? pid : parseInt(pid);
    return !isNaN(n) && n >= 1000;
  }

  function calcIntervals(actions, starters, totalQTs) {
    const intervals = {};
    const maxQ = totalQTs || 4;

    for (let q = 1; q <= maxQ; q++) {
      const qStarters = starters && starters[q] ? starters[q].map(parseId) : [];

      const onCourt = new Set(qStarters);
      qStarters.forEach((pid) => {
        if (!intervals[pid]) intervals[pid] = [];
      });

      const qSubs = actions
        .filter(
          (a) => (a.q || 1) === q && a.type === 'SUB' && !isOpponent(parseId(a.pid ?? a.playerId))
        )
        .map((a) => ({ ...a, time: a.time || 0 }))
        .sort((a, b) => b.time - a.time);

      let lastTime = QT_DURATION;

      qSubs.forEach((sub) => {
        const currentTime = sub.time;
        if (lastTime > currentTime) {
          onCourt.forEach((p) => {
            if (!intervals[p]) intervals[p] = [];
            intervals[p].push({ q, start: lastTime, end: currentTime });
          });
        }

        const pIn = parseId(sub.pid ?? sub.playerId);
        const pOut = parseId(sub.subOut);

        if (pOut) onCourt.delete(pOut);
        if (pIn) {
          onCourt.add(pIn);
          if (!intervals[pIn]) intervals[pIn] = [];
        }

        lastTime = currentTime;
      });

      if (lastTime > 0) {
        onCourt.forEach((p) => {
          if (!intervals[p]) intervals[p] = [];
          intervals[p].push({ q, start: lastTime, end: 0 });
        });
      }
    }

    return intervals;
  }

  function RotationChart({ game, players }) {
    const [hoveredInterval, setHoveredInterval] = useState(null);

    const data = useMemo(() => {
      if (!game?.actions?.length || !game.starters) return null;

      const qSet = new Set(game.actions.map((a) => a.q || 1));
      [1, 2, 3, 4].forEach((q) => qSet.add(q));
      const maxQ = Math.max(...qSet);

      const intervals = calcIntervals(game.actions, game.starters, maxQ);

      // Filtrer uniquement les joueurs home qui ont des intervalles
      const homePlayers = players
        .filter((p) => intervals[p.id] && intervals[p.id].length > 0)
        .sort((a, b) => a.number - b.number);

      // Déterminer les titulaires Q1
      const q1Starters = (game.starters[1] || []).map(parseId);

      return { intervals, homePlayers, maxQ, q1Starters };
    }, [game, players]);

    if (!data || data.homePlayers.length === 0) {
      return (
        <div className="text-center text-slate-500 text-xs py-4 bg-slate-900/50 rounded-lg border border-slate-800">
          Pas de donnees de rotation disponibles
        </div>
      );
    }

    const { intervals, homePlayers, maxQ, q1Starters } = data;
    const totalSeconds = maxQ * QT_DURATION;
    const rowH = 28;
    const labelW = 90;
    const chartW = 700;
    const svgW = labelW + chartW + 10;
    const svgH = homePlayers.length * rowH + 30; // +30 for header

    const toX = (q, timeInQ) => {
      const elapsed = (q - 1) * QT_DURATION + (QT_DURATION - timeInQ);
      return labelW + (elapsed / totalSeconds) * chartW;
    };

    const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
      <div className="mt-4">
        <h4 className="text-sm text-cyan-400 uppercase font-bold mb-3 flex items-center gap-2">
          <span>&#128260;</span> Diagramme de Rotation
        </h4>
        <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3 overflow-x-auto">
          <svg width={svgW} height={svgH} style={{ minWidth: svgW, display: 'block' }}>
            {/* Header — Quarter labels */}
            {Array.from({ length: maxQ }, (_, i) => i + 1).map((q) => {
              const x1 = toX(q, QT_DURATION);
              const x2 = toX(q, 0);
              return (
                <g key={`hdr-${q}`}>
                  <text
                    x={(x1 + x2) / 2}
                    y={14}
                    fill="#a0a0b0"
                    fontSize={10}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {q <= 4 ? `Q${q}` : `OT${q - 4}`}
                  </text>
                  {/* Separator line */}
                  {q > 1 && (
                    <line
                      x1={x1}
                      y1={20}
                      x2={x1}
                      y2={svgH}
                      stroke="#3a3a5a"
                      strokeWidth={1}
                      strokeDasharray="4,3"
                    />
                  )}
                </g>
              );
            })}
            {/* Horizontal line under header */}
            <line
              x1={labelW}
              y1={22}
              x2={labelW + chartW}
              y2={22}
              stroke="#3a3a5a"
              strokeWidth={0.5}
            />

            {/* Player rows */}
            {homePlayers.map((player, idx) => {
              const y = 26 + idx * rowH;
              const isStarter = q1Starters.includes(player.id);
              const pIntervals = intervals[player.id] || [];
              const totalSec = pIntervals.reduce((s, iv) => s + (iv.start - iv.end), 0);
              const totalMin = Math.round(totalSec / 60);

              return (
                <g key={player.id}>
                  {/* Row background */}
                  {idx % 2 === 0 && (
                    <rect x={0} y={y} width={svgW} height={rowH} fill="rgba(255,255,255,0.02)" />
                  )}
                  {/* Player label */}
                  <text
                    x={4}
                    y={y + rowH / 2 + 4}
                    fill={isStarter ? '#60a5fa' : '#6a6a8a'}
                    fontSize={10}
                    fontWeight={isStarter ? 'bold' : 'normal'}
                  >
                    #{player.number}{' '}
                    {player.name.length > 8 ? player.name.substring(0, 8) + '.' : player.name}
                  </text>
                  {/* Minutes total */}
                  <text
                    x={labelW - 6}
                    y={y + rowH / 2 + 4}
                    fill="#50506a"
                    fontSize={9}
                    textAnchor="end"
                  >
                    {totalMin}m
                  </text>
                  {/* Interval bars */}
                  {pIntervals.map((iv, j) => {
                    const x1 = toX(iv.q, iv.start);
                    const x2 = toX(iv.q, iv.end);
                    const w = Math.max(x2 - x1, 1);
                    const isHovered =
                      hoveredInterval &&
                      hoveredInterval.pid === player.id &&
                      hoveredInterval.idx === j;
                    return (
                      <g
                        key={j}
                        onMouseEnter={() =>
                          setHoveredInterval({ pid: player.id, idx: j, iv, player })
                        }
                        onMouseLeave={() => setHoveredInterval(null)}
                      >
                        <rect
                          x={x1}
                          y={y + 3}
                          width={w}
                          height={rowH - 6}
                          rx={2}
                          ry={2}
                          fill={
                            isStarter
                              ? isHovered
                                ? '#3b82f6'
                                : '#2563eb80'
                              : isHovered
                                ? '#6b7280'
                                : '#4b556380'
                          }
                          stroke={isHovered ? '#fff' : 'none'}
                          strokeWidth={isHovered ? 1 : 0}
                          style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
          {/* Tooltip */}
          {hoveredInterval && (
            <div className="mt-2 text-xs text-slate-300 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 inline-block">
              <span className="font-bold text-white">
                #{hoveredInterval.player.number} {hoveredInterval.player.name}
              </span>
              <span className="text-slate-500 mx-2">|</span>Q{hoveredInterval.iv.q} :{' '}
              {fmtTime(hoveredInterval.iv.start)} → {fmtTime(hoveredInterval.iv.end)}
              <span className="text-slate-500 mx-2">|</span>
              <span className="text-cyan-400">
                {fmtTime(hoveredInterval.iv.start - hoveredInterval.iv.end)}
              </span>
            </div>
          )}
          {/* Legend */}
          <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-2 rounded-sm"
                style={{ background: '#2563eb80' }}
              ></span>{' '}
              Titulaire
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-2 rounded-sm"
                style={{ background: '#4b556380' }}
              ></span>{' '}
              Remplacant
            </span>
          </div>
        </div>
      </div>
    );
  }

  window.RotationChart = RotationChart;
})();
