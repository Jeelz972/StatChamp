// SeasonDashboard.js — Composant React (JSX, nécessite Babel)
// Dépendances : React, Recharts (globales), window.parseDate
const { useState, useMemo } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } =
  window.Recharts;

function SeasonDashboard({ games, players, phases }) {
  const [activeMetric, setActiveMetric] = useState('pts');
  const [filterPhase, setFilterPhase] = useState('ALL');

  const filteredGames = useMemo(() => {
    const isFinal = (g) => !g.status || g.status === 'final';
    const base =
      filterPhase === 'ALL'
        ? games.filter(isFinal)
        : games.filter((g) => g.phase === filterPhase && isFinal(g));
    return [...base].sort((a, b) => window.parseDate(a.date) - window.parseDate(b.date));
  }, [games, filterPhase]);

  // ---- SECTION 1 : Tendances equipe (moyenne mobile) ----
  const trendData = useMemo(() => {
    if (filteredGames.length === 0) return [];
    return filteredGames.map((g, i) => {
      let pts = 0,
        conceded = g.awayScore || 0,
        fgm = 0,
        fga = 0,
        threePM = 0,
        threePA = 0,
        tov = 0,
        fta = 0;
      Object.values(g.playerStats || {}).forEach((s) => {
        pts += s.pts || 0;
        fgm += (s.fgm || 0) + (s.threePM || 0);
        fga += (s.fga || 0) + (s.threePA || 0);
        threePM += s.threePM || 0;
        threePA += s.threePA || 0;
        tov += s.tov || 0;
        fta += s.fta || 0;
      });
      const eFG = fga > 0 ? ((fgm + 0.5 * threePM) / fga) * 100 : 0;
      const poss = fga + 0.44 * fta + tov;
      const tovPct = poss > 0 ? (tov / poss) * 100 : 0;

      const ma = (key, window) => {
        const start = Math.max(0, i - window + 1);
        const slice = filteredGames.slice(start, i + 1);
        let sum = 0;
        slice.forEach((sg) => {
          let v = 0;
          if (key === 'pts') {
            Object.values(sg.playerStats || {}).forEach((s) => {
              v += s.pts || 0;
            });
          } else if (key === 'conceded') {
            v = sg.awayScore || 0;
          } else if (key === 'eFG') {
            let sfgm = 0,
              sfga = 0,
              s3pm = 0;
            Object.values(sg.playerStats || {}).forEach((s) => {
              sfgm += (s.fgm || 0) + (s.threePM || 0);
              sfga += (s.fga || 0) + (s.threePA || 0);
              s3pm += s.threePM || 0;
            });
            v = sfga > 0 ? ((sfgm + 0.5 * s3pm) / sfga) * 100 : 0;
          } else if (key === 'tovPct') {
            let stov = 0,
              sfga2 = 0,
              sfta = 0;
            Object.values(sg.playerStats || {}).forEach((s) => {
              stov += s.tov || 0;
              sfga2 += (s.fga || 0) + (s.threePA || 0);
              sfta += s.fta || 0;
            });
            const sp = sfga2 + 0.44 * sfta + stov;
            v = sp > 0 ? (stov / sp) * 100 : 0;
          }
          sum += v;
        });
        return slice.length > 0 ? sum / slice.length : 0;
      };

      return {
        label: g.opponent ? `vs ${g.opponent}` : `M${i + 1}`,
        date: g.date,
        pts,
        conceded,
        eFG: parseFloat(eFG.toFixed(1)),
        tovPct: parseFloat(tovPct.toFixed(1)),
        ma3: parseFloat(ma(activeMetric, 3).toFixed(1)),
        ma5: parseFloat(ma(activeMetric, 5).toFixed(1)),
        raw: (key) => {
          if (key === 'pts') return pts;
          if (key === 'conceded') return conceded;
          if (key === 'eFG') return eFG;
          if (key === 'tovPct') return tovPct;
          return 0;
        },
      };
    });
  }, [filteredGames, activeMetric]);

  // ---- SECTION 2 : Progressions joueurs ----
  const progressions = useMemo(() => {
    if (filteredGames.length < 2) return { top: [], bottom: [] };
    const n = Math.min(5, Math.floor(filteredGames.length / 2));
    const first = filteredGames.slice(0, n);
    const last = filteredGames.slice(-n);

    const calcAvg = (subset, pid, stat) => {
      let sum = 0,
        count = 0;
      subset.forEach((g) => {
        const ps = (g.playerStats || {})[pid];
        if (ps) {
          if (stat === 'reb') sum += (ps.oreb || 0) + (ps.dreb || 0);
          else if (stat === 'eff')
            sum +=
              (ps.pts || 0) +
              (ps.oreb || 0) +
              (ps.dreb || 0) +
              (ps.ast || 0) +
              (ps.stl || 0) +
              (ps.blk || 0) -
              ((ps.fga || 0) +
                (ps.threePA || 0) -
                (ps.fgm || 0) -
                (ps.threePM || 0) +
                (ps.fta || 0) -
                (ps.ftm || 0) +
                (ps.tov || 0));
          else sum += ps[stat] || 0;
          count++;
        }
      });
      return count > 0 ? sum / count : 0;
    };

    const deltas = [];
    players.forEach((p) => {
      ['pts', 'reb', 'ast', 'eff'].forEach((stat) => {
        const avgFirst = calcAvg(first, p.id, stat);
        const avgLast = calcAvg(last, p.id, stat);
        const delta = avgLast - avgFirst;
        if (avgFirst > 0 || avgLast > 0) {
          deltas.push({
            name: p.name,
            stat,
            delta,
            avgFirst: avgFirst.toFixed(1),
            avgLast: avgLast.toFixed(1),
          });
        }
      });
    });

    deltas.sort((a, b) => b.delta - a.delta);
    const top = deltas.filter((d) => d.delta > 0).slice(0, 3);
    const bottom = deltas
      .filter((d) => d.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);
    return { top, bottom };
  }, [filteredGames, players]);

  // ---- SECTION 3 : Comparatif phases ----
  const phaseComparison = useMemo(() => {
    if (!phases || phases.length < 2) return null;
    const isFinal = (g) => !g.status || g.status === 'final';
    const result = [];
    phases.forEach((ph) => {
      const pg = games.filter((g) => g.phase === ph.id && isFinal(g));
      if (pg.length === 0) return;
      let pts = 0,
        conceded = 0,
        fgm = 0,
        fga = 0,
        tov = 0,
        reb = 0,
        ast = 0,
        wins = 0;
      pg.forEach((g) => {
        conceded += g.awayScore || 0;
        if ((g.homeScore || 0) > (g.awayScore || 0)) wins++;
        Object.values(g.playerStats || {}).forEach((s) => {
          pts += s.pts || 0;
          fgm += (s.fgm || 0) + (s.threePM || 0);
          fga += (s.fga || 0) + (s.threePA || 0);
          tov += s.tov || 0;
          reb += (s.oreb || 0) + (s.dreb || 0);
          ast += s.ast || 0;
        });
      });
      const n = pg.length;
      result.push({
        name: ph.name,
        matches: n,
        wins,
        losses: n - wins,
        avgPts: (pts / n).toFixed(1),
        avgConceded: (conceded / n).toFixed(1),
        fgPct: fga > 0 ? ((fgm / fga) * 100).toFixed(1) : '0',
        avgReb: (reb / n).toFixed(1),
        avgAst: (ast / n).toFixed(1),
        avgTov: (tov / n).toFixed(1),
      });
    });
    return result.length >= 2 ? result : null;
  }, [games, phases]);

  const metrics = [
    { key: 'pts', label: 'PTS marqués', color: '#22c55e' },
    { key: 'conceded', label: 'PTS encaissés', color: '#ef4444' },
    { key: 'eFG', label: 'eFG%', color: '#3b82f6' },
    { key: 'tovPct', label: 'TOV%', color: '#f59e0b' },
  ];
  const activeMeta = metrics.find((m) => m.key === activeMetric) || metrics[0];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <window.Icon path={window.Icons.TrendingUp} className="text-orange-400" /> Dashboard
          Saison
        </h2>
        {phases && phases.length > 1 && (
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
        )}
      </div>

      {filteredGames.length === 0 && (
        <div className="text-center text-slate-500 py-12">
          Aucun match finalisé pour cette sélection.
        </div>
      )}

      {/* --- TENDANCES EQUIPE --- */}
      {filteredGames.length > 0 && (
        <window.Card className="p-4">
          <h3 className="text-sm font-bold text-orange-400 uppercase mb-3">
            Tendances Équipe (Moyenne Mobile)
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {metrics.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeMetric === m.key ? 'text-white shadow' : 'text-slate-400 hover:text-white bg-slate-800'}`}
                style={activeMetric === m.key ? { background: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="h-64 bg-slate-900/50 rounded-lg p-2 border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis
                  dataKey="label"
                  stroke="#50506a"
                  fontSize={9}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis stroke="#50506a" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e3a',
                    border: '1px solid #3a3a5a',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(v, name) => [typeof v === 'number' ? v.toFixed(1) : v, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey={activeMetric}
                  name={activeMeta.label}
                  stroke={activeMeta.color}
                  strokeWidth={1}
                  dot={{ r: 3, fill: activeMeta.color }}
                />
                <Line
                  type="monotone"
                  dataKey="ma3"
                  name="MM 3 matchs"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 3"
                />
                <Line
                  type="monotone"
                  dataKey="ma5"
                  name="MM 5 matchs"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="2 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </window.Card>
      )}

      {/* --- PROGRESSIONS JOUEURS --- */}
      {(progressions.top.length > 0 || progressions.bottom.length > 0) && (
        <window.Card className="p-4">
          <h3 className="text-sm font-bold text-orange-400 uppercase mb-3">
            Progressions Joueurs (5 premiers vs 5 derniers matchs)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progressions.top.length > 0 && (
              <div>
                <h4 className="text-xs text-green-400 font-bold uppercase mb-2">
                  Top Progressions
                </h4>
                <div className="space-y-2">
                  {progressions.top.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-green-900/20 border border-green-800/30 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-white font-bold">{d.name}</span>
                      <span className="text-xs text-slate-400 uppercase">{d.stat}</span>
                      <span className="text-xs text-slate-500">
                        {d.avgFirst} → {d.avgLast}
                      </span>
                      <span className="text-sm font-bold text-green-400">
                        ↑ +{parseFloat(d.delta).toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {progressions.bottom.length > 0 && (
              <div>
                <h4 className="text-xs text-red-400 font-bold uppercase mb-2">Top Régressions</h4>
                <div className="space-y-2">
                  {progressions.bottom.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-white font-bold">{d.name}</span>
                      <span className="text-xs text-slate-400 uppercase">{d.stat}</span>
                      <span className="text-xs text-slate-500">
                        {d.avgFirst} → {d.avgLast}
                      </span>
                      <span className="text-sm font-bold text-red-400">
                        ↓ {parseFloat(d.delta).toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </window.Card>
      )}

      {/* --- COMPARATIF PHASES --- */}
      {phaseComparison && (
        <window.Card className="p-4">
          <h3 className="text-sm font-bold text-orange-400 uppercase mb-3">Comparatif par Phase</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px]">
                <tr>
                  <th className="p-2">Phase</th>
                  <th className="p-2 text-center">MJ</th>
                  <th className="p-2 text-center">V</th>
                  <th className="p-2 text-center">D</th>
                  <th className="p-2 text-center">PTS</th>
                  <th className="p-2 text-center">Enc.</th>
                  <th className="p-2 text-center">FG%</th>
                  <th className="p-2 text-center">REB</th>
                  <th className="p-2 text-center">PD</th>
                  <th className="p-2 text-center">BP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {phaseComparison.map((ph) => (
                  <tr key={ph.name} className="hover:bg-slate-800/50">
                    <td className="p-2 font-bold text-white">{ph.name}</td>
                    <td className="p-2 text-center">{ph.matches}</td>
                    <td className="p-2 text-center text-green-400">{ph.wins}</td>
                    <td className="p-2 text-center text-red-400">{ph.losses}</td>
                    <td className="p-2 text-center font-bold text-orange-400">{ph.avgPts}</td>
                    <td className="p-2 text-center">{ph.avgConceded}</td>
                    <td className="p-2 text-center">{ph.fgPct}%</td>
                    <td className="p-2 text-center">{ph.avgReb}</td>
                    <td className="p-2 text-center">{ph.avgAst}</td>
                    <td className="p-2 text-center text-red-400">{ph.avgTov}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </window.Card>
      )}
    </div>
  );
}

window.SeasonDashboard = SeasonDashboard;
