// GlobalStats.js — Composant React (JSX, nécessite Babel)
// Dépendances : React, Recharts (globales), window.StatsEngine
const { useState, useMemo, useCallback, useEffect, useRef } = React;
const { LineChart, Line, BarChart, Bar, ComposedChart, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, Scatter, ScatterChart, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } = window.Recharts;
// ============================================================
// 1. VolumeEfficiencyMatrix
// ============================================================
function VolumeEfficiencyMatrix({ players }) {
    const POS_COLORS = { PG: '#d4a574', SG: '#3b82f6', SF: '#22c55e', PF: '#a855f7', C: '#ef4444', G: '#d4a574', F: '#22c55e' };

    const data = useMemo(() => {
        const pts = players
            .filter(p => p.gamesPlayed > 0 && p.avg) 
            .map(p => {
                const a = p.avg;
                return { 
                    name: p.info.name, 
                    pos: p.info.pos || 'G', 
                    fgaPg: parseFloat(a.fga) || 0, 
                    ts: parseFloat(a.TS) || 0, 
                    minPg: parseFloat(a.min) || 0, 
                    color: POS_COLORS[p.info.pos] || '#a0a0b0' 
                };
            });

        if (pts.length === 0) return { points: [], medFga: 0, medTs: 0 };

        const fgaVals = pts.map(d => d.fgaPg);
        const tsVals = pts.map(d => d.ts);
        const sortedFga = [...fgaVals].sort((a, b) => a - b);
        const sortedTs = [...tsVals].sort((a, b) => a - b);
        const median = arr => {
            if (arr.length === 0) return 0;
            const mid = Math.floor(arr.length / 2);
            return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
        };

        return { points: pts, medFga: median(sortedFga), medTs: median(sortedTs) };
    }, [players]);

    if (!data.points || data.points.length === 0) {
        return <div className="text-slate-500 text-xs text-center p-8 bg-slate-900/30 rounded-lg border border-dashed border-slate-700">Données insuffisantes (nécessite au moins 1 match enregistré)</div>;
    }

    const positions = [...new Set(data.points.map(d => d.pos))];

    return (
        <div className="space-y-3">
            <h4 className="text-xs text-slate-400 uppercase font-bold flex items-center gap-2">
                <span className="text-orange-500">🎯</span> Volume vs Efficacité (TS%)
            </h4>
            <div className="flex flex-wrap gap-3 mb-2">
                {positions.map(pos => (
                    <span key={pos} className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: POS_COLORS[pos] || '#a0a0b0' }} />
                        {pos}
                    </span>
                ))}
            </div>
            <div className="h-72 bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
                        <XAxis type="number" dataKey="fgaPg" name="FGA/m" stroke="#50506a" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis type="number" dataKey="ts" name="TS%" stroke="#50506a" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                        <ZAxis type="number" dataKey="minPg" range={[50, 400]} />
                        <ReferenceLine x={data.medFga} stroke="#3a3a5a" strokeDasharray="3 3" label={{ value: 'Médiane Vol.', fill: '#3a3a5a', fontSize: 8, position: 'top' }} />
                        <ReferenceLine y={data.medTs} stroke="#3a3a5a" strokeDasharray="3 3" label={{ value: 'Médiane Eff.', fill: '#3a3a5a', fontSize: 8, position: 'right' }} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-2xl text-[11px]">
                                        <div className="font-bold text-white mb-1">{d.name}</div>
                                        <div className="text-slate-400">FGA/match: <span className="text-white">{d.fgaPg}</span></div>
                                        <div className="text-slate-400">True Shooting: <span className="text-green-400">{d.ts}%</span></div>
                                        <div className="text-slate-400">Minutes/m: <span className="text-white">{d.minPg}</span></div>
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
        categories.forEach(c => cumulative[c] = 0);

        return logs.map((log, i) => {
            const entry = { game: i + 1, opponent: log.opponent || `M${i + 1}` };
            categories.forEach(c => {
                cumulative[c] += (log[c] || 0);
                entry[`avg_${c}`] = Math.round((cumulative[c] / (i + 1)) * 10) / 10;
                entry[`val_${c}`] = log[c] || 0;
            });
            entry.avgComposite = Math.round((entry.avg_pts + entry.avg_reb * 1.2 + entry.avg_ast * 1.5 + entry.avg_stl * 2 + entry.avg_blk * 2) * 10) / 10;
            entry.valComposite = Math.round((entry.val_pts + entry.val_reb * 1.2 + entry.val_ast * 1.5 + entry.val_stl * 2 + entry.val_blk * 2) * 10) / 10;
            entry.isSelected = currentGame != null && i === currentGame;
            return entry;
        });
    }, [logs, currentGame]);

    const [metric, setMetric] = useState('composite');
    const metrics = [
        { key: 'composite', label: 'Global', color: '#d4a574' },
        { key: 'pts', label: 'PTS', color: '#d4a574' },
        { key: 'reb', label: 'REB', color: '#3b82f6' },
        { key: 'ast', label: 'AST', color: '#22c55e' },
    ];

    if (chartData.length === 0) return <div className="text-slate-500 text-sm text-center p-4">Pas de données</div>;

    const avgKey = metric === 'composite' ? 'avgComposite' : `avg_${metric}`;
    const valKey = metric === 'composite' ? 'valComposite' : `val_${metric}`;
    const activeColor = metrics.find(m => m.key === metric)?.color || '#d4a574';

    return (
        <div>
            <h4 className="text-xs text-slate-400 uppercase mb-2">Courbe Fantôme — Saison vs Match</h4>
            <div className="flex gap-1 mb-2">
                {metrics.map(m => (
                    <button key={m.key} onClick={() => setMetric(m.key)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${metric === m.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        style={metric === m.key ? { backgroundColor: m.color + '30', color: m.color, border: `1px solid ${m.color}` } : { border: '1px solid transparent' }}>
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
                        <Tooltip content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs">
                                    <div className="font-bold text-white">{d.opponent}</div>
                                    <div style={{ color: activeColor }}>Match: {d[valKey]}</div>
                                    <div className="text-slate-400">Moy. cumulée: {d[avgKey]}</div>
                                    <div className={`text-[10px] ${d[valKey] >= d[avgKey] ? 'text-green-400' : 'text-red-400'}`}>
                                        Écart: {d[valKey] >= d[avgKey] ? '+' : ''}{Math.round((d[valKey] - d[avgKey]) * 10) / 10}
                                    </div>
                                </div>
                            );
                        }} />
                        <Area type="monotone" dataKey={avgKey} stroke="none" fill="url(#ghostGrad)" isAnimationActive={false} />
                        <Line type="monotone" dataKey={avgKey} name="Moy. cumulée" stroke="#50506a" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey={valKey} name="Match" stroke={activeColor} strokeWidth={2}
                            dot={(props) => {
                                const { cx, cy, payload } = props;
                                const above = payload[valKey] >= payload[avgKey];
                                return <circle cx={cx} cy={cy} r={payload.isSelected ? 6 : 3} fill={above ? '#22c55e' : '#ef4444'} stroke={payload.isSelected ? '#fff' : 'none'} strokeWidth={payload.isSelected ? 2 : 0} />;
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
    const MIN_CRITERIA = { scoring: 5.0, playmaking: 1.5, rebounding: 3.0, defense: 0.8, shooting: 20 };

    const radarData = useMemo(() => {
        if (!player || !player.info || !allPlayers || allPlayers.length === 0) return [];
        const eligible = allPlayers.filter(p => p.gamesPlayed > 0 && p.total && p.info);
        if (eligible.length === 0) return [];

        const rawStats = eligible.map(p => {
            const gp = p.gamesPlayed;
            const t = p.total;
            const totalFGA = (t.fga || 0) + (t.threePA || 0);
            const tsa = totalFGA + 0.44 * (t.fta || 0);
            const threePAr = totalFGA > 0 ? (t.threePA || 0) / totalFGA : 0;
            const rawShootingScore = tsa > 0 ? ((t.pts || 0) / (2 * tsa)) * 100 : 0;
            const adjustedShooting = rawShootingScore * (0.8 + (0.2 * threePAr));

            return {
                id: p.info.id,
                scoring: (t.pts || 0) / gp,
                playmaking: ((t.ast || 0) / gp), 
                defense: ((t.stl || 0) / gp) * 1.5 + ((t.blk || 0) / gp) * 1.2,
                rebounding: ((t.reb || 0) / gp),
                shooting: adjustedShooting
            };
        });

        const playerRaw = rawStats.find(r => r.id === player.info.id);
        if (!playerRaw) return [];

        const axes = ['scoring', 'playmaking', 'defense', 'rebounding', 'shooting'];
        const labels = { scoring: 'Scoring', playmaking: 'Playmaking', defense: 'Defense', rebounding: 'Rebounding', shooting: 'Shooting' };

        return axes.map(axis => {
            const vals = rawStats.map(r => r[axis]);
            const min = Math.min(...vals);
            const max = Math.max(...vals);

            let difficultyBuffer = 1.15;
            if (axis === 'scoring') difficultyBuffer = 1.25; 
            if (axis === 'shooting') difficultyBuffer = 1.10;

            const theoreticalMax = max * difficultyBuffer;
            const range = theoreticalMax - min;
            
            let normalized = 50;
            if (range > 0) normalized = ((playerRaw[axis] - min) / range) * 99;
            
            return { 
                axis: labels[axis],
                id: axis, 
                score: Math.round(Math.max(0, Math.min(99, normalized))), 
                raw: Math.round(playerRaw[axis] * 10) / 10 
            };
        });
    }, [player, allPlayers]);

    const archetypeInfo = useMemo(() => {
        if (!radarData || radarData.length === 0) return { name: 'N/A', avg: 0, color: 'slate' };
        const avgScore = Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length);
        let sorted = [...radarData].sort((a, b) => b.score - a.score);

        sorted = sorted.filter(stat => stat.raw >= MIN_CRITERIA[stat.id]);
        if (sorted.length === 0) {
            const bestPotential = [...radarData].sort((a, b) => b.score - a.score)[0];
            let prospectName = 'Espoir';
            if (avgScore < 15) prospectName = 'Débutant';
            else {
                switch (bestPotential.id) {
                    case 'scoring': prospectName = 'Attaquant en Herbe'; break;
                    case 'playmaking': prospectName = 'Apprenti Meneur'; break;
                    case 'defense': prospectName = 'Prospect Défensif'; break;
                    case 'rebounding': prospectName = 'Intérieur en Formation'; break;
                    case 'shooting': prospectName = 'Shooteur en Réglage'; break;
                }
            }
            return { name: prospectName, avg: avgScore, color: 'slate' };
        }
        
        const t1 = sorted[0]; 
        const t2 = sorted[1] || { axis: 'None', score: 0 }; 
        let typeName = 'Polyvalent';
        let colorTheme = 'slate'; 

        if (avgScore > 75) {
             typeName = 'Superstar Complète'; colorTheme = 'fuchsia';
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

    if (radarData.length === 0) return <div className="text-slate-500 text-sm text-center p-4">Pas de données</div>;

    const getBadgeStyle = (color) => {
        const styles = {
            orange: "bg-orange-900/30 text-orange-400 border-orange-800",
            emerald: "bg-emerald-900/30 text-emerald-400 border-emerald-800",
            blue: "bg-blue-900/30 text-blue-400 border-blue-800",
            indigo: "bg-indigo-900/30 text-indigo-400 border-indigo-800",
            rose: "bg-rose-900/30 text-rose-400 border-rose-800",
            fuchsia: "bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-800",
            cyan: "bg-cyan-900/30 text-cyan-400 border-cyan-800",
            slate: "bg-slate-700/30 text-slate-400 border-slate-600",
        };
        return styles[color] || styles.slate;
    };

    const getRadarColor = (color) => {
        const colors = {
            orange: "#d4a574", emerald: "#34d399", blue: "#60a5fa", indigo: "#818cf8",
            rose: "#fb7185", fuchsia: "#e879f9", cyan: "#22d3ee", slate: "#a0a0b0",
        };
        return colors[color] || "#a0a0b0";
    };

    const activeColor = getRadarColor(archetypeInfo.color);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs text-slate-400 uppercase">Profil Coach</h4>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getBadgeStyle(archetypeInfo.color)}`}>
                        {archetypeInfo.name}
                    </span>
                    <span className="text-xs text-slate-500">OVR {archetypeInfo.avg}</span>
                </div>
            </div>
            <div className="h-64 bg-slate-900/50 rounded-lg p-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                        <PolarGrid stroke="#2a2a4a" />
                        <PolarAngleAxis dataKey="axis" stroke="#a0a0b0" fontSize={10} tick={{ fill: '#a0a0b0' }} />
                        <PolarRadiusAxis stroke="#2a2a4a" fontSize={9} domain={[0, 99]} tickCount={4} angle={30} />
                        <Radar name="Stats" dataKey="score" stroke={activeColor} fill={activeColor} fillOpacity={0.3} strokeWidth={2} />
                        <Tooltip content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs z-50 relative">
                                    <div className="font-bold text-white mb-1">{d.axis}</div>
                                    <div style={{ color: activeColor }} className="mb-0.5">Note: <span className="font-bold text-base">{d.score}</span>/99</div>
                                    <div className="text-slate-400">Brut: <span className="text-white">{d.raw}</span></div>
                                </div>
                            );
                        }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {radarData.map(d => (
                    <span key={d.axis} className="text-[10px] text-slate-400 flex items-center gap-1">
                        {d.axis}: <span className={`font-bold ${d.score >= 70 ? 'text-green-400' : d.score >= 40 ? 'text-orange-400' : 'text-red-400'}`}>{d.score}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

// ===========================================
// GLOBAL STATS (Composant Principal)
// ===========================================
function GlobalStats({ players, games, phases, isAdmin }) {
    const [filterPhase, setFilterPhase] = useState('all');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showVolumeMatrix, setShowVolumeMatrix] = useState(false);
    const [activeTab, setActiveTab] = useState('players');

    // NOUVEAU : Empreinte de mémoisation pour bloquer les recalculs inutiles
    const gamesKey = useMemo(() => {
        return games.length + ':' + games.map(g => g.id + '_' + (g.homeScore||0) + '_' + (g.awayScore||0)).join(',');
    }, [games]);

    // MODIFICATION : Utilisation de gamesKey au lieu de games dans le tableau de dépendances
    const filteredGames = useMemo(() => {
        const isFinal = g => !g.status || g.status === 'final';
        if (filterPhase === 'all') return games.filter(isFinal);
        return games.filter(g => g.phase === filterPhase && isFinal(g));
    }, [gamesKey, filterPhase]); // <-- Remplacement de 'games' par 'gamesKey'

    const teamTrendsData = useMemo(() => {
        const sorted = [...filteredGames].sort((a, b) => window.parseDate(a.date) - window.parseDate(b.date));
        
        const initStats = () => ({ 
            pts: 0, conceded: 0, fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, 
            reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 
        });

        let global = initStats();
        let winsStats = { ...initStats(), count: 0 };
        let lossStats = { ...initStats(), count: 0 };

        const data = sorted.map((g) => {
            let stats = initStats();
            Object.values(g.playerStats).forEach(s => {
                stats.pts += (s.pts||0); 
                stats.fgm += (s.fgm||0)+(s.threePM||0);
                stats.fga += (s.fga||0)+(s.threePA||0);
                stats.threePM += (s.threePM||0); stats.threePA += (s.threePA||0);
                stats.ftm += (s.ftm||0); stats.fta += (s.fta||0);
                stats.reb += (s.oreb||0)+(s.dreb||0);
                stats.ast += (s.ast||0); stats.stl += (s.stl||0); stats.blk += (s.blk||0);
                stats.tov += (s.tov||0); stats.pf += (s.pf||0);
            });

            Object.keys(global).forEach(k => { if(stats[k] !== undefined) global[k] += stats[k]; });
            global.conceded += (g.awayScore||0);

            const totalPoss = stats.fga + 0.44*stats.fta - (stats.reb*0.3) + stats.tov; 
            const ortg = totalPoss > 0 ? (stats.pts/totalPoss)*100 : 0;
            const drtg = totalPoss > 0 ? ((g.awayScore||0)/totalPoss)*100 : 0;
            const isWin = (g.homeScore||0) > (g.awayScore||0);

            const target = isWin ? winsStats : lossStats;
            target.count++;
            target.conceded += (g.awayScore||0);
            Object.keys(stats).forEach(k => { if(target[k] !== undefined) target[k] += stats[k]; });

            return {
                date: g.date, opponent: g.opponent, isWin,
                score: g.homeScore||0, conceded: g.awayScore||0,
                ORtg: parseFloat(ortg.toFixed(1)), DRtg: parseFloat(drtg.toFixed(1)), NetRtg: parseFloat((ortg-drtg).toFixed(1)),
                ...stats,
                fgPct: stats.fga > 0 ? ((stats.fgm/stats.fga)*100).toFixed(1) : 0,
                threePct: stats.threePA > 0 ? ((stats.threePM/stats.threePA)*100).toFixed(1) : 0
            };
        });

        const calcAvg = (source, count) => {
            if (count === 0) return {};
            return {
                pts: (source.pts/count).toFixed(1), conceded: (source.conceded/count).toFixed(1),
                reb: (source.reb/count).toFixed(1), ast: (source.ast/count).toFixed(1),
                stl: (source.stl/count).toFixed(1), blk: (source.blk/count).toFixed(1),
                tov: (source.tov/count).toFixed(1), pf: (source.pf/count).toFixed(1),
                fgPct: source.fga > 0 ? ((source.fgm/source.fga)*100).toFixed(1) : 0,
                threePct: source.threePA > 0 ? ((source.threePM/source.threePA)*100).toFixed(1) : 0,
                ftPct: source.fta > 0 ? ((source.ftm/source.fta)*100).toFixed(1) : 0,
                fgm: (source.fgm/count).toFixed(1), fga: (source.fga/count).toFixed(1),
                threePM: (source.threePM/count).toFixed(1), threePA: (source.threePA/count).toFixed(1),
                stl: (source.stl / count).toFixed(1),
                blk: (source.blk / count).toFixed(1),
                pf: (source.pf / count).toFixed(1),
                tov: (source.tov / count).toFixed(1)
            };
        };

        const avgs = calcAvg(global, data.length || 1);
        const winAvgs = calcAvg(winsStats, winsStats.count);
        const lossAvgs = calcAvg(lossStats, lossStats.count);

        const analysis = [];
        if (lossStats.count > 0 && winsStats.count > 0) {
            const diffs = [
                { label: "Défense (Pts Encaissés)", val: parseFloat(lossAvgs.conceded) - parseFloat(winAvgs.conceded), type: 'negative_more_is_bad', unit: 'pts' },
                { label: "Attaque (Scoring)", val: parseFloat(winAvgs.pts) - parseFloat(lossAvgs.pts), type: 'positive_less_is_bad', unit: 'pts' },
                { label: "Pertes de balle", val: parseFloat(lossAvgs.tov) - parseFloat(winAvgs.tov), type: 'negative_more_is_bad', unit: 'bp' },
                { label: "Adresse Globale", val: parseFloat(winAvgs.fgPct) - parseFloat(lossAvgs.fgPct), type: 'positive_less_is_bad', unit: '%' },
                { label: "Adresse 3-Pts", val: parseFloat(winAvgs.threePct) - parseFloat(lossAvgs.threePct), type: 'positive_less_is_bad', unit: '%' },
                { label: "Rebonds", val: parseFloat(winAvgs.reb) - parseFloat(lossAvgs.reb), type: 'positive_less_is_bad', unit: 'reb' },
                { label: "Création (Passes)", val: parseFloat(winAvgs.ast) - parseFloat(lossAvgs.ast), type: 'positive_less_is_bad', unit: 'pd' },
            ];
            analysis.push(...diffs.map(d => ({ ...d, impact: Math.abs(d.val), raw: d.val })).sort((a, b) => b.impact - a.impact).slice(0, 3));
        }

        const streak = data.length > 0 ? (data[data.length-1].isWin ? "W" : "L") : "-";
        return { data, avgs, winAvgs, lossAvgs, wins: winsStats.count, losses: lossStats.count, streak, analysis };
    }, [filteredGames]);

    const fourFactorsData = useMemo(() => {
        if (filteredGames.length === 0) return null;

        const SE = window.StatsEngine;
        const init = () => ({ fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0, oppDreb: 0 });
        let all = init();
        let oppAll = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0 };
        let teamDreb = 0;
        let winS = { ...init(), count: 0 };
        let lossS = { ...init(), count: 0 };
        let winTeamDreb = 0, lossTeamDreb = 0;
        let winOpp = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0 };
        let lossOpp = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0 };

        filteredGames.forEach(g => {
            let tm = { fgm: 0, fga: 0, threePM: 0, fta: 0, ftm: 0, tov: 0, oreb: 0, dreb: 0 };
            Object.values(g.playerStats).forEach(s => {
                tm.fgm += (s.fgm||0) + (s.threePM||0);
                tm.fga += (s.fga||0) + (s.threePA||0);
                tm.threePM += (s.threePM||0);
                tm.fta += (s.fta||0);
                tm.ftm += (s.ftm||0);
                tm.tov += (s.tov||0);
                tm.oreb += (s.oreb||0);
                tm.dreb += (s.dreb||0);
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

            ['fgm','fga','threePM','fta','ftm','tov','oreb'].forEach(k => all[k] += tm[k]);
            all.oppDreb += gOppDreb;
            teamDreb += tm.dreb;

            oppAll.fgm += gOppFgm; oppAll.fga += gOppFga; oppAll.fta += gOppFta;
            oppAll.ftm += gOppFtm; oppAll.tov += gOppTov; oppAll.oreb += gOppOreb;
            oppAll.threePM += gOppThreePM;

            const isWin = (g.homeScore||0) > (g.awayScore||0);
            const target = isWin ? winS : lossS;
            target.count++;
            ['fgm','fga','threePM','fta','ftm','tov','oreb'].forEach(k => target[k] += tm[k]);
            target.oppDreb += gOppDreb;

            const tOpp = isWin ? winOpp : lossOpp;
            tOpp.fgm += gOppFgm; tOpp.fga += gOppFga; tOpp.fta += gOppFta;
            tOpp.ftm += gOppFtm; tOpp.tov += gOppTov; tOpp.oreb += gOppOreb;
            tOpp.threePM += gOppThreePM;

            if (isWin) { winTeamDreb += tm.dreb; }
            else { lossTeamDreb += tm.dreb; }
        });

        const team = SE.fourFactors(all);
        const oppFF = SE.fourFactors({ ...oppAll, oppDreb: teamDreb });
        const winFF = winS.count > 0 ? SE.fourFactors(winS) : null;
        const lossFF = lossS.count > 0 ? SE.fourFactors(lossS) : null;

        const radarData = [
            { factor: 'eFG%', team: team.eFG, opp: oppFF.eFG },
            { factor: 'TOV%', team: team.tovPct, opp: oppFF.tovPct },
            { factor: 'OREB%', team: team.orebPct, opp: oppFF.orebPct },
            { factor: 'FT Rate', team: team.ftRate, opp: oppFF.ftRate }
        ];

        return { team, opp: oppFF, winFF, lossFF, radarData };
    }, [filteredGames]);
    const aggregated = useMemo(() => {
        const stats = {};
        players.forEach(p => { 
            stats[p.id] = { 
                info: p, gamesPlayed: 0, 
                total: { 
                    pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, eff: 0, 
                    fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, pf: 0, plusMinus: 0, 
                    pie: 0, pir: 0, foulDrawn: 0, blkAgainst: 0
                }, 
                totalMinPlayed: 0, weightedORtg: 0, weightedDRtg: 0, 
                logs: [], 
                records: { 
                    pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, eff: 0, threePM: 0,
                    pir: -999, min: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, threePA: 0,
                    oreb: 0, dreb: 0, tov: 0, pf: 0, plusMinus: -999, foulDrawn: 0
                } 
            }; 
        });

        const GT = { MP: 0 };

        filteredGames.forEach(g => {
            let gamePTS=0, gameFGM=0, gameFTM=0, gameFGA=0, gameFTA=0;
            let gameDRB=0, gameORB=0, gameAST=0, gameSTL=0, gameBLK=0, gamePF=0, gameTO=0;
            
            Object.values(g.playerStats).forEach(s => {
                const min = s.minutes||0;
                GT.MP+=min;
                gamePTS+=s.pts||0; gameFGM+=(s.fgm||0)+(s.threePM||0); gameFTM+=s.ftm||0; gameFGA+=(s.fga||0)+(s.threePA||0); gameFTA+=s.fta||0; gameDRB+=s.dreb||0; gameORB+=s.oreb||0; gameAST+=s.ast||0; gameSTL+=s.stl||0; gameBLK+=s.blk||0; gamePF+=s.pf||0; gameTO+=s.tov||0;
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
            
            gamePTS+=oppPTS; gameFGM+=oppFGM; gameFTM+=oppFTM; gameFGA+=oppFGA; gameFTA+=oppFTA; gameDRB+=oppDRB; gameORB+=oppORB; gameAST+=opp.ast||0; gameSTL+=opp.stl||0; gameBLK+=opp.blk||0; gamePF+=opp.fouls||0; gameTO+=oppTOV;
            
            const gamePIEDenom = gamePTS + gameFGM + gameFTM - gameFGA - gameFTA + gameDRB + (0.5 * gameORB) + gameAST + gameSTL + (0.5 * gameBLK) - gamePF - gameTO;
            const teamPoss = (gameFGA-oppFGA) + 0.44*(gameFTA-oppFTA) - (gameORB-oppORB) + (gameTO-oppTOV);
            const teamORtg_Game = teamPoss>0 ? ((gamePTS-oppPTS)/teamPoss)*100 : 0;
            const teamDRtg_Game = teamPoss>0 ? (oppPTS/teamPoss)*100 : 0;

            Object.entries(g.playerStats).forEach(([pid, s]) => {
                const id = parseInt(pid);
                if ((s.minutes||0) > 0 && stats[id]) {
                    const t = stats[id].total; 
                    const playerMin = s.minutes||0;
                    
                    stats[id].gamesPlayed += 1; stats[id].totalMinPlayed += playerMin;
                    stats[id].weightedORtg += teamORtg_Game * playerMin; 
                    stats[id].weightedDRtg += teamDRtg_Game * playerMin; 
                    
                    t.pts += (s.pts||0); t.reb += (s.reb||0); t.oreb += (s.oreb||0); t.dreb += (s.dreb||0);
                    t.ast += (s.ast||0); t.stl += (s.stl||0); t.blk += (s.blk||0); t.tov += (s.tov||0); t.min += playerMin;
                    t.fgm += (s.fgm||0); t.fga += (s.fga||0); t.threePM += (s.threePM||0); t.threePA += (s.threePA||0);
                    t.ftm += (s.ftm||0); t.fta += (s.fta||0); t.pf += (s.pf||0); t.plusMinus += (s.plusMinus||0);
                    
                    const playerFGA = (s.fga||0)+(s.threePA||0); 
                    const playerFGM = (s.fgm||0)+(s.threePM||0);
                    
                    const evalStat = (s.pts+s.reb+s.ast+s.stl+s.blk) - ((playerFGA-playerFGM) + ((s.fta||0)-(s.ftm||0)) + s.tov);
                    t.eff += evalStat;
                    
                    const missedFG = playerFGA - playerFGM;
                    const missedFT = (s.fta||0) - (s.ftm||0);
                    const foulDrawn = s.foulDrawn || 0;
                    const blkAgainst = s.blkAgainst || 0;
                    
                    const pir = ((s.pts||0) + (s.reb||0) + (s.ast||0) + (s.stl||0) + (s.blk||0) + foulDrawn) 
                                - (missedFG + missedFT + (s.tov||0) + blkAgainst + (s.pf||0));
                    
                    t.pir += pir;
                    t.foulDrawn += foulDrawn;
                    t.blkAgainst += blkAgainst;

                    const playerPIENum = (s.pts||0) + playerFGM + (s.ftm||0) - playerFGA - (s.fta||0) + (s.dreb||0) + (0.5*(s.oreb||0)) + (s.ast||0) + (s.stl||0) + (0.5*(s.blk||0)) - (s.pf||0) - (s.tov||0);
                    const playerPIE = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;
                    t.pie += playerPIE;

                    const rec = stats[id].records;
                    const currentStats = {
                        pts: s.pts, reb: s.reb, ast: s.ast, stl: s.stl, blk: s.blk, eff: evalStat,
                        threePM: s.threePM, pir: pir, min: s.minutes, fgm: playerFGM, fga: playerFGA,
                        ftm: s.ftm, fta: s.fta, threePA: s.threePA, oreb: s.oreb, dreb: s.dreb,
                        tov: s.tov, pf: s.pf, plusMinus: s.plusMinus, foulDrawn: foulDrawn
                    };

                    Object.keys(currentStats).forEach(key => {
                        const val = currentStats[key] || 0;
                        if (val > rec[key] || (key === 'plusMinus' && rec[key] === -999)) {
                            rec[key] = val;
                            rec[key + 'Date'] = g.date;
                            rec[key + 'Opp'] = g.opponent;
                        }
                    });

                    stats[id].logs.push({ 
                        date: g.date, opponent: g.opponent, phase: g.phase, min: s.minutes,
                        pts: s.pts||0, reb: s.reb||0, oreb: s.oreb||0, dreb: s.dreb||0, ast: s.ast||0, stl: s.stl||0, blk: s.blk||0, tov: s.tov||0, pf: s.pf||0, plusMinus: s.plusMinus||0,
                        fgm: playerFGM, fga: playerFGA, threePM: s.threePM||0, threePA: s.threePA||0, ftm: s.ftm||0, fta: s.fta||0,
                        eff: evalStat, pir: pir, 
                        eFG: parseFloat(window.StatsEngine.eFG(playerFGM, s.threePM || 0, playerFGA).toFixed(1)),
                        TS: parseFloat(window.StatsEngine.TS(s.pts || 0, playerFGA, s.fta || 0).toFixed(1)),
                        PIE: parseFloat(playerPIE.toFixed(1)),
                        ORtg: parseFloat((playerFGA + 0.44*(s.fta||0) + (s.tov||0) > 0 ? ((s.pts||0) / (playerFGA + 0.44*(s.fta||0) + (s.tov||0))) * 100 : 0).toFixed(1)), 
                        DRtg: parseFloat(teamDRtg_Game.toFixed(1))
                    });
                }
            });
        });

        const activePlayers = Object.values(stats).filter(p => p.gamesPlayed > 0);
        return activePlayers.map(p => {
            const t = p.total; const gp = p.gamesPlayed || 1;
            const ORtg = p.weightedORtg / p.totalMinPlayed || 100;
            const DRtg = p.weightedDRtg / p.totalMinPlayed || 100;

            p.logs.sort((a, b) => window.parseDate(a.date) - window.parseDate(b.date));

            const totalFGA = t.fga + t.threePA; const totalFGM = t.fgm + t.threePM;
            const twoFGA = t.fga; const twoFGM = t.fgm;
            const winLogs = p.logs.filter(l => {
    const g = filteredGames.find(g2 => g2.date === l.date && g2.opponent === l.opponent);
    return g && parseInt(g.homeScore) > parseInt(g.awayScore);
});
const lossLogs = p.logs.filter(l => {
    const g = filteredGames.find(g2 => g2.date === l.date && g2.opponent === l.opponent);
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
                    fgm: parseFloat((twoFGM).toFixed(1)),
                    fga: parseFloat((twoFGA).toFixed(1)),
                    threePM: parseFloat((t.threePM).toFixed(1)),
                    threePA: parseFloat((t.threePA).toFixed(1)),
                    ftm: parseFloat((t.ftm).toFixed(1)),
                    fta: parseFloat((t.fta).toFixed(1))
                },
                avg: {
                    min: (t.min/gp).toFixed(1), pts: (t.pts/gp).toFixed(1), reb: (t.reb/gp).toFixed(1),oreb: (t.oreb/gp).toFixed(1), dreb: (t.dreb/gp).toFixed(1),
                    ast: (t.ast/gp).toFixed(1), stl: (t.stl/gp).toFixed(1), blk: (t.blk/gp).toFixed(1),
                    tov: (t.tov/gp).toFixed(1), pf: (t.pf/gp).toFixed(1), plusMinus: (t.plusMinus/gp).toFixed(1),
                    eff: (t.eff/gp).toFixed(1), pir: (t.pir/gp).toFixed(1),
                    twoPct: twoFGA > 0 ? ((twoFGM/twoFGA)*100).toFixed(1) : "0.0",
                    fgm: totalFGM, fga: totalFGA, fgPct: totalFGA>0?((totalFGM/totalFGA)*100).toFixed(1):"0.0",
                    threePM: t.threePM, threePA: t.threePA, threePct: t.threePA>0?((t.threePM/t.threePA)*100).toFixed(1):"0.0",
                    ftm: t.ftm, fta: t.fta, ftPct: t.fta>0?((t.ftm/t.fta)*100).toFixed(1):"0.0",
                    eFG: window.StatsEngine.eFG(totalFGM, t.threePM, totalFGA).toFixed(1),
                    TS: window.StatsEngine.TS(t.pts, totalFGA, t.fta).toFixed(1),
                    ORtg: ORtg.toFixed(1), DRtg: DRtg.toFixed(1), netRtg: (ORtg-DRtg).toFixed(1), 
                    PIE: (t.pie/gp).toFixed(1)
                }
            };
        });
    }, [players, filteredGames]);

    const combosData = useMemo(() => {
    const MIN_POSS = 10;
    const homeIds = new Set(players.map(p => p.id));
    const duoMap = {};
    const trioMap = {};

    filteredGames.forEach(g => {
        if (!g.actions || !g.actions.length || !g.actions[0].onCourt) return;
        g.actions.forEach(a => {
            if (!a.onCourt) return;
            const homeOnCourt = a.onCourt.filter(id => homeIds.has(id)).sort((x, y) => x - y);
            if (homeOnCourt.length < 2) return;

            const isHome = homeIds.has(a.pid);
            const pts = (a.type === 'SHOT' && a.made) ? a.val : (a.type === 'FT' ? (a.ftMade || 0) : 0);
            const ptsConceded = (!isHome && a.type === 'SHOT' && a.made) ? a.val : (!isHome && a.type === 'FT' ? (a.ftMade || 0) : 0);
            const ptsScored = (isHome && pts > 0) ? pts : 0;
            
            const isFGA = a.type === 'SHOT' ? 1 : 0;
            const isFTA = a.type === 'FT' ? (a.ftAtt || 0) : 0;
            const isTOV = a.type === 'TOV' && isHome ? 1 : 0;
            const isOREB = a.type === 'OREB' && isHome ? 1 : 0;
            
            const oppFGA = (!isHome && a.type === 'SHOT') ? 1 : 0;
            const oppFTA = (!isHome && a.type === 'FT') ? (a.ftAtt || 0) : 0;
            const oppTOV = (a.type === 'TOV' && !isHome) ? 1 : 0;
            const oppOREB = (a.type === 'OREB' && !isHome) ? 1 : 0;

            const accumulate = (map, key) => {
                if (!map[key]) map[key] = { actions: 0, pts: 0, ptsConceded: 0, fga: 0, fta: 0, tov: 0, orb: 0, oppFga: 0, oppFta: 0, oppTov: 0, oppOrb: 0 };
                const m = map[key];
                m.actions++;
                m.pts += ptsScored;
                m.ptsConceded += ptsConceded;
                m.fga += (isHome ? isFGA : 0);
                m.fta += (isHome ? isFTA : 0);
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
                
                const names = ids.map(id => {
                    const p = players.find(pl => pl.id === id);
                    return p ? ('#' + p.number + ' ' + p.name.split(' ')[0]) : '#' + id;
                });
                return { key, ids, names, poss: Math.round(avgPoss), ortg, drtg, netRtg, pm, actions: data.actions };
            })
            .filter(Boolean)
            .sort((a, b) => b.netRtg - a.netRtg)
            .slice(0, maxResults);
    };

    return {
        duos: processMap(duoMap, 10),
        trios: processMap(trioMap, 5),
        hasData: filteredGames.some(g => g.actions && g.actions.length > 0 && !!g.actions[0].onCourt)
    };
}, [filteredGames, players]);

    return (
        <div className="space-y-4 h-full flex flex-col pb-20 md:pb-0">
            <window.Card className="p-2 md:p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    <select 
                value={filterPhase} 
                onChange={(e) => setFilterPhase(e.target.value)}
                className="bg-slate-800 text-white border border-slate-700 rounded p-2 text-sm">
                <option value="ALL">Toutes les phases</option>
                {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2 mb-4">
                {[
                    { key: 'players', label: 'Stats Joueurs' },
                    { key: 'team', label: 'Analyse Équipe' }
                ].map(tab => (
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
                        <button onClick={() => setShowVolumeMatrix(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors border border-slate-700">
                            Volume/Eff.
                        </button>
                    </div>
                </div>
                
                <div className="overflow-auto flex-1 relative custom-scrollbar">
                {activeTab === 'players' && (    
                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap border-collapse">
                        <thead className="bg-slate-900 text-white uppercase text-xs sticky top-0 z-20">
                            <tr className="bg-slate-950 border-b border-slate-700">
                                <th className="p-3 sticky left-0 bg-slate-950 z-30 min-w-[120px] text-left font-bold">Joueur</th>
                                <th className="p-3 text-center w-12 text-slate-400">MJ</th>
                                <th className="p-3 text-center w-12 text-slate-400">MIN</th>
                                <th className="p-3 text-center text-orange-400 font-bold">PTS</th>
                                <th className="p-3 text-center">FG%</th>
                                <th className="p-3 text-center text-blue-400">3P%</th>
                                <th className="p-3 text-center text-slate-400">LF%</th>
                                <th className="p-3 text-center font-bold">REB</th>
                                <th className="p-3 text-center">PD</th>
                                <th className="p-3 text-center">INT</th>
                                <th className="p-3 text-center text-red-400">BP</th>
                                <th className="p-3 text-center font-bold">+/-</th>
                                <th className="p-3 text-center text-green-400 font-bold">EVAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {aggregated.map(p => (
                                <tr key={p.info.id} onClick={() => setSelectedPlayer(p)} className="hover:bg-slate-800 cursor-pointer transition-colors odd:bg-slate-900 even:bg-slate-800/40">
                                    <td className="p-3 font-medium text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">{p.info.number}</div>
                                            {p.info.name}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-slate-400">{p.gamesPlayed}</td>
                                    <td className="p-3 text-center text-slate-500">{p.avg.min}</td>
                                    <td className="p-3 text-center font-bold text-orange-400">{p.avg.pts}</td>
                                    <td className={`p-3 text-center ${parseFloat(p.avg.fgPct) >= 45 ? 'text-green-400' : parseFloat(p.avg.fgPct) < 35 ? 'text-red-400' : 'text-slate-300'}`}>{p.avg.fgPct}%</td>
                                    <td className={`p-3 text-center ${parseFloat(p.avg.threePct) >= 33 ? 'text-blue-400' : 'text-slate-500'}`}>{p.avg.threePct}%</td>
                                    <td className="p-3 text-center text-slate-400">{p.avg.ftPct}%</td>
                                    <td className="p-3 text-center font-bold text-white">{p.avg.reb}</td>
                                    <td className="p-3 text-center">{p.avg.ast}</td>
                                    <td className="p-3 text-center">{p.avg.stl}</td>
                                    <td className="p-3 text-center text-red-400">{p.avg.tov}</td>
                                    <td className={`p-3 text-center font-bold ${parseFloat(p.avg.plusMinus) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {parseFloat(p.avg.plusMinus) > 0 ? '+' : ''}{p.avg.plusMinus}
                                    </td>
                                    <td className="p-3 text-center font-bold text-green-400">{p.avg.eff}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )}
                </div>
            </window.Card>
                {selectedPlayer && (
                    <window.Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={<><window.Icon path={window.Icons.Trophy} className="text-yellow-400" /> {selectedPlayer?.info.name}</>} size="max-w-5xl">
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-6">
                                <h4 className="text-xs text-slate-500 uppercase font-bold mb-3">Détail Tir & Activité</h4>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 text-center">
                                    <div>
                                        <div className="text-xs text-slate-500">2PT</div>
                                        <div className="text-sm font-bold text-white">
                                            {selectedPlayer.avg.twoPct}%
                                        </div>
                                        <div className="text-[10px] text-slate-600">
                                            {selectedPlayer.stats.fgm}-{selectedPlayer.stats.fga}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">3PT</div>
                                        <div className="text-sm font-bold text-blue-400">
                                            {selectedPlayer.avg.threePct}%
                                        </div>
                                        <div className="text-[10px] text-slate-600">
                                            {selectedPlayer.stats.threePM}-{selectedPlayer.stats.threePA}
                                        </div>
                                    </div>
                                    <div>
                                    <div className="text-xs text-slate-500">LF</div>
                                    <div className="text-sm font-bold text-white">
                                        {selectedPlayer.avg.ftPct}%
                                    </div>
                                    <div className="text-[10px] text-slate-600">
                                        {selectedPlayer.stats.ftm}-{selectedPlayer.stats.fta}
                                    </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">RO/m</div>
                                        <div className="text-sm font-bold text-white">{selectedPlayer.avg.oreb}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">RD/m</div>
                                        <div className="text-sm font-bold text-white">{selectedPlayer.avg.dreb}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">INT/m</div>
                                        <div className="text-sm font-bold text-white">{selectedPlayer.avg.stl}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">CTR/m</div>
                                        <div className="text-sm font-bold text-white">{selectedPlayer.avg.blk}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">FTE/m</div>
                                        <div className="text-sm font-bold text-red-400">{selectedPlayer.avg.pf}</div>
                                    </div>
                            </div>
                        </div>

                            {/* --- BLOC SPLIT W/L --- */}
                            {selectedPlayer.splitWL && (selectedPlayer.splitWL.win || selectedPlayer.splitWL.loss) && (
                                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-6">
                                    <h4 className="text-xs text-slate-500 uppercase font-bold mb-3">
                                        Performance <span className="text-green-400">Victoires</span> vs <span className="text-red-400">Défaites</span>
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase">
                                                    <th className="p-2 text-left"></th>
                                                    <th className="p-2 text-center">MJ</th>
                                                    <th className="p-2 text-center">MIN</th>
                                                    <th className="p-2 text-center">PTS</th>
                                                    <th className="p-2 text-center">REB</th>
                                                    <th className="p-2 text-center">PD</th>
                                                    <th className="p-2 text-center">BP</th>
                                                    <th className="p-2 text-center">FG%</th>
                                                    <th className="p-2 text-center">3P%</th>
                                                    <th className="p-2 text-center">+/-</th>
                                                    <th className="p-2 text-center">EVAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {selectedPlayer.splitWL.win && (
                                                    <tr>
                                                        <td className="p-2 text-green-400 font-bold text-xs">En W</td>
                                                        <td className="p-2 text-center text-slate-400">{selectedPlayer.splitWL.win.gp}</td>
                                                        <td className="p-2 text-center text-slate-500">{selectedPlayer.splitWL.win.min}</td>
                                                        <td className="p-2 text-center font-bold text-white">{selectedPlayer.splitWL.win.pts}</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.win.reb}</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.win.ast}</td>
                                                        <td className="p-2 text-center text-red-400">{selectedPlayer.splitWL.win.tov}</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.win.fgPct}%</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.win.threePct}%</td>
                                                        <td className={`p-2 text-center font-bold ${parseFloat(selectedPlayer.splitWL.win.plusMinus) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {parseFloat(selectedPlayer.splitWL.win.plusMinus) > 0 ? '+' : ''}{selectedPlayer.splitWL.win.plusMinus}
                                                        </td>
                                                        <td className="p-2 text-center font-bold text-green-400">{selectedPlayer.splitWL.win.eff}</td>
                                                    </tr>
                                                )}
                                                {selectedPlayer.splitWL.loss && (
                                                    <tr>
                                                        <td className="p-2 text-red-400 font-bold text-xs">En L</td>
                                                        <td className="p-2 text-center text-slate-400">{selectedPlayer.splitWL.loss.gp}</td>
                                                        <td className="p-2 text-center text-slate-500">{selectedPlayer.splitWL.loss.min}</td>
                                                        <td className="p-2 text-center font-bold text-white">{selectedPlayer.splitWL.loss.pts}</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.loss.reb}</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.loss.ast}</td>
                                                        <td className="p-2 text-center text-red-400">{selectedPlayer.splitWL.loss.tov}</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.loss.fgPct}%</td>
                                                        <td className="p-2 text-center">{selectedPlayer.splitWL.loss.threePct}%</td>
                                                        <td className={`p-2 text-center font-bold ${parseFloat(selectedPlayer.splitWL.loss.plusMinus) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {parseFloat(selectedPlayer.splitWL.loss.plusMinus) > 0 ? '+' : ''}{selectedPlayer.splitWL.loss.plusMinus}
                                                        </td>
                                                        <td className="p-2 text-center font-bold text-green-400">{selectedPlayer.splitWL.loss.eff}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-slate-900 p-4 rounded-lg">
                                <div className="text-center"><div className="text-xs text-slate-500">Points</div><div className="text-xl md:text-2xl font-bold text-white">{selectedPlayer.avg.pts}</div></div>
                                <div className="text-center"><div className="text-xs text-slate-500">Rebonds</div><div className="text-xl md:text-2xl font-bold text-white">{selectedPlayer.avg.reb}</div></div>
                                <div className="text-center"><div className="text-xs text-slate-500">Passes</div><div className="text-xl md:text-2xl font-bold text-white">{selectedPlayer.avg.ast}</div></div>
                                <div className="text-center"><div className="text-xs text-slate-500">Éval</div><div className="text-xl md:text-2xl font-bold text-green-400">{selectedPlayer.avg.eff}</div></div>
                                <div className="text-center"><div className="text-xs text-slate-500">PIR</div><div className="text-xl md:text-2xl font-bold text-orange-400">{selectedPlayer.avg.pir}</div></div>
                                <div className="text-center"><div className="text-xs text-slate-500">PIE</div><div className="text-xl md:text-2xl font-bold text-cyan-400">{selectedPlayer.avg.PIE}%</div></div>
                            
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-500 uppercase">+/-</div>
                                    <div className={`text-2xl font-black ${parseFloat(selectedPlayer.avg.plusMinus) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {parseFloat(selectedPlayer.avg.plusMinus) > 0 ? '+' : ''}{selectedPlayer.avg.plusMinus}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm text-slate-400 uppercase font-bold flex items-center gap-2"><span className="text-yellow-400">🏆</span> Records de la Saison</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { key: 'pir', label: 'PIR', icon: '💎', color: 'from-orange-500 to-red-600' },
                                        { key: 'pts', label: 'Points', icon: '🔥', color: 'from-orange-500 to-red-600' },
                                        { key: 'reb', label: 'Rebonds', icon: '💪', color: 'from-blue-500 to-cyan-600' },
                                        { key: 'ast', label: 'Passes', icon: '🎯', color: 'from-purple-500 to-pink-600' },
                                        { key: 'stl', label: 'Interceptions', icon: '⚡', color: 'from-yellow-500 to-orange-600' },
                                        { key: 'blk', label: 'Contres', icon: '🛡️', color: 'from-red-500 to-rose-600' },
                                        { key: 'min', label: 'Minutes', icon: '⏱️', color: 'from-slate-500 to-slate-700' },
                                        { key: 'plusMinus', label: '+/-', icon: '📈', color: 'from-green-500 to-emerald-600' },
                                    ].map(item => (
                                        <div key={item.key} className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${item.color} p-0.5`}>
                                            <div className="bg-slate-900 rounded-xl p-3 h-full">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">{item.icon}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.label}</span>
                                                </div>
                                                <div className="text-xl font-black text-white">{selectedPlayer.records[item.key]}</div>
                                                <div className="text-[9px] text-slate-500 mt-1 truncate">vs {selectedPlayer.records[item.key + 'Opp']}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                                    <div className="text-[10px] text-slate-400 uppercase">ORtg</div>
                                    <div className="text-lg font-bold text-purple-400">{selectedPlayer.avg.ORtg}</div>
                                </div>
                                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                                    <div className="text-[10px] text-slate-400 uppercase">DRtg</div>
                                    <div className="text-lg font-bold text-red-400">{selectedPlayer.avg.DRtg}</div>
                                </div>
                                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                                    <div className="text-[10px] text-slate-400 uppercase">NetRtg</div>
                                    <div className={`text-lg font-bold ${parseFloat(selectedPlayer.avg.netRtg) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {parseFloat(selectedPlayer.avg.netRtg) > 0 ? '+' : ''}{selectedPlayer.avg.netRtg}
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                                    <div className="text-[10px] text-slate-400 uppercase">Min/Match</div>
                                    <div className="text-lg font-bold text-white">{selectedPlayer.avg.min}</div>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                                <h4 className="text-xs text-slate-400 uppercase mb-3 font-bold tracking-wider">Adresses</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: '2 Points', pct: selectedPlayer.avg.twoPct, made: selectedPlayer.stats.fgm, att: selectedPlayer.stats.fga, color: 'orange' },
                                        { label: '3 Points', pct: selectedPlayer.avg.threePct, made: selectedPlayer.stats.threePM, att: selectedPlayer.stats.threePA, color: 'blue' },
                                        { label: 'Lancers F.', pct: selectedPlayer.avg.ftPct, made: selectedPlayer.stats.ftm, att: selectedPlayer.stats.fta, color: 'green' }
                                    ].map(sh => (
                                        <div key={sh.label} className="text-center">
                                            <div className="text-xs text-slate-500 mb-1">{sh.label}</div>
                                            <div className={`text-2xl font-black text-${sh.color}-400`}>{sh.pct}%</div>
                                            <div className="text-[10px] text-slate-500">{sh.made}/{sh.att}</div>
                                            <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                                                <div className={`h-full rounded-full bg-${sh.color}-500 transition-all`}
                                                    style={{ width: `${Math.min(parseFloat(sh.pct) || 0, 100)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-slate-800 p-2 rounded text-center">
                                    <div className="text-[10px] text-slate-500">INT</div>
                                    <div className="text-lg font-bold text-yellow-400">{selectedPlayer.avg.stl}</div>
                                </div>
                                <div className="bg-slate-800 p-2 rounded text-center">
                                    <div className="text-[10px] text-slate-500">CTR</div>
                                    <div className="text-lg font-bold text-orange-400">{selectedPlayer.avg.blk}</div>
                                </div>
                                <div className="bg-slate-800 p-2 rounded text-center">
                                    <div className="text-[10px] text-slate-500">BP</div>
                                    <div className="text-lg font-bold text-red-400">{selectedPlayer.avg.tov}</div>
                                </div>
                                <div className="bg-slate-800 p-2 rounded text-center">
                                    <div className="text-[10px] text-slate-500">FTE</div>
                                    <div className="text-lg font-bold text-red-300">{selectedPlayer.avg.pf}</div>
                                </div>
                            </div>

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
                                                    <Line type="monotone" dataKey="pts" name="Points" stroke="#d4a574" strokeWidth={2} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="eff" name="Éval" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
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
                                                    <Legend />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <GhostSeasonChart logs={selectedPlayer.logs} currentGame={null} />
                                    <ArchetypeRadar player={selectedPlayer} allPlayers={aggregated} />
                                </div>      
                            )}

                            {(selectedPlayer.logs || []).length > 0 && (
                                <div>
                                    <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold tracking-wider">
                                        Match par match ({selectedPlayer.gamesPlayed} matchs)
                                    </h4>
                                    <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700 max-h-64">
                                        <table className="w-full text-xs text-slate-300 whitespace-nowrap">
                                            <thead className="bg-slate-800 text-white uppercase text-[10px] sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-2 text-left sticky left-0 bg-slate-800 z-20">Adversaire</th>
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
                                                        <td className="p-2 text-center">
                                                            <span className="text-green-400">{log.score}</span>
                                                            <span className="text-slate-600"> - </span>
                                                            <span className="text-red-400">{log.conceded}</span>
                                                        </td>
                                                        <td className="p-2 text-center text-slate-500">{log.min}</td>
                                                        <td className="p-2 text-center font-bold text-orange-400">{log.pts}</td>
                                                        <td className="p-2 text-center">{log.reb}</td>
                                                        <td className="p-2 text-center">{log.ast}</td>
                                                        <td className="p-2 text-center">{log.stl}</td>
                                                        <td className="p-2 text-center text-red-400">{log.tov}</td>
                                                        <td className={`p-2 text-center font-bold ${log.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {log.plusMinus > 0 ? '+' : ''}{log.plusMinus}
                                                        </td>
                                                        <td className="p-2 text-center text-purple-400">{log.ORtg}</td>
                                                        <td className="p-2 text-center text-red-400">{log.DRtg}</td>
                                                        <td className="p-2 text-center font-bold text-green-400">{log.eff}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </window.Modal>
                )}
            {activeTab === 'team' && (<>
                <div className="space-y-4 mb-8">
                    {/* Header cliquable pour toggle */}
                    <div className="flex items-center justify-between cursor-pointer group">
                        <h3 className="text-sm font-bold text-orange-400 uppercase flex items-center gap-2">
                            <window.Icon path={window.Icons.TrendingUp} className="w-4 h-4" />
                            Analyse Équipe
                        </h3>
                        <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                        
                        </span>
                    </div>

                    {filteredGames.length > 0 && (
                        <div className="space-y-4">
                            {/* --- BANDEAU BILAN --- */}
                            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                                {[
                                    { label: 'Victoires', value: teamTrendsData.wins, color: 'text-green-400' },
                                    { label: 'Défaites', value: teamTrendsData.losses, color: 'text-red-400' },
                                    { label: 'Win%', value: filteredGames.length > 0 ? Math.round((teamTrendsData.wins / filteredGames.length) * 100) + '%' : '-', color: 'text-white' },
                                    { label: 'Série', value: teamTrendsData.streak, color: teamTrendsData.streak.startsWith('W') ? 'text-green-400' : teamTrendsData.streak.startsWith('L') ? 'text-red-400' : 'text-slate-400' },
                                    { label: 'Pts/m', value: teamTrendsData.avgs.pts, color: 'text-orange-400' },
                                    { label: 'Encaissés/m', value: teamTrendsData.avgs.conceded, color: 'text-red-400' },
                                    { label: 'Diff moy', value: (parseFloat(teamTrendsData.avgs.pts) - parseFloat(teamTrendsData.avgs.conceded)).toFixed(1), color: parseFloat(teamTrendsData.avgs.pts) - parseFloat(teamTrendsData.avgs.conceded) >= 0 ? 'text-green-400' : 'text-red-400' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/50">
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
                                            { label: 'eFG%', desc: 'Efficacite tirs', team: fourFactorsData.team.eFG, opp: fourFactorsData.opp.eFG, higherIsBetter: true },
                                            { label: 'TOV%', desc: 'Taux pertes balle', team: fourFactorsData.team.tovPct, opp: fourFactorsData.opp.tovPct, higherIsBetter: false },
                                            { label: 'OREB%', desc: 'Rebonds offensifs', team: fourFactorsData.team.orebPct, opp: fourFactorsData.opp.orebPct, higherIsBetter: true },
                                            { label: 'FT Rate', desc: 'Acces LF', team: fourFactorsData.team.ftRate, opp: fourFactorsData.opp.ftRate, higherIsBetter: true }
                                        ].map((f, i) => {
                                            const diff = f.higherIsBetter ? f.team - f.opp : f.opp - f.team;
                                            const isGood = diff > 0;
                                            return (
                                                <div key={i} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                                                    <div className="text-[10px] text-slate-500 uppercase mb-1">{f.label}</div>
                                                    <div className="text-xs text-slate-600 mb-2">{f.desc}</div>
                                                    <div className="flex items-end justify-between">
                                                        <div>
                                                            <div className={`text-lg font-bold ${isGood ? 'text-green-400' : 'text-red-400'}`}>{f.team}%</div>
                                                            <div className="text-[10px] text-slate-500">Equipe</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm text-slate-400">{f.opp}%</div>
                                                            <div className="text-[10px] text-slate-600">Adv.</div>
                                                        </div>
                                                    </div>
                                                    <div className={`mt-2 text-[10px] font-medium text-center rounded py-0.5 ${isGood ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                                        {isGood ? '+' : ''}{(f.higherIsBetter ? f.team - f.opp : f.opp - f.team).toFixed(1)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {fourFactorsData.radarData.length === 4 && (
                                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30 mb-4">
                                            <h5 className="text-[10px] text-slate-500 uppercase mb-2 font-bold">Radar comparatif</h5>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart data={fourFactorsData.radarData} cx="50%" cy="50%" outerRadius="70%">
                                                        <PolarGrid stroke="#2a2a4a" />
                                                        <PolarAngleAxis dataKey="factor" tick={{ fill: '#a0a0b0', fontSize: 11 }} />
                                                        <PolarRadiusAxis tick={{ fill: '#505070', fontSize: 9 }} />
                                                        <Radar name="Equipe" dataKey="team" stroke="#d4a574" fill="#d4a574" fillOpacity={0.25} strokeWidth={2} />
                                                        <Radar name="Adversaire" dataKey="opp" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e1e3a', border: '1px solid #3a3a5a', borderRadius: '8px', fontSize: '12px' }} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {fourFactorsData.winFF && fourFactorsData.lossFF && (
                                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                                            <h5 className="text-[10px] text-slate-500 uppercase mb-2 font-bold">
                                                Four Factors — <span className="text-green-400">Victoires</span> vs <span className="text-red-400">Defaites</span>
                                            </h5>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-slate-300">
                                                    <thead>
                                                        <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase">
                                                            <th className="p-2 text-left">Factor</th>
                                                            <th className="p-2 text-center text-green-400">W ({teamTrendsData.wins}m)</th>
                                                            <th className="p-2 text-center text-red-400">L ({teamTrendsData.losses}m)</th>
                                                            <th className="p-2 text-center">Diff</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800">
                                                        {[
                                                            { label: 'eFG%', win: fourFactorsData.winFF.eFG, loss: fourFactorsData.lossFF.eFG, higherIsBetter: true },
                                                            { label: 'TOV%', win: fourFactorsData.winFF.tovPct, loss: fourFactorsData.lossFF.tovPct, higherIsBetter: false },
                                                            { label: 'OREB%', win: fourFactorsData.winFF.orebPct, loss: fourFactorsData.lossFF.orebPct, higherIsBetter: true },
                                                            { label: 'FT Rate', win: fourFactorsData.winFF.ftRate, loss: fourFactorsData.lossFF.ftRate, higherIsBetter: true }
                                                        ].map((r, i) => {
                                                            const rawDiff = r.higherIsBetter ? (r.win - r.loss) : (r.loss - r.win);
                                                            return (
                                                                <tr key={i} className="hover:bg-slate-800/40">
                                                                    <td className="p-2 text-left font-medium text-slate-400">{r.label}</td>
                                                                    <td className="p-2 text-center text-green-400">{r.win}%</td>
                                                                    <td className="p-2 text-center text-red-400">{r.loss}%</td>
                                                                    <td className={`p-2 text-center font-bold ${rawDiff > 0 ? 'text-green-400' : rawDiff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                                        {rawDiff > 0 ? '+' : ''}{rawDiff.toFixed(1)}
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
                                        <span className="text-green-400">W</span> vs <span className="text-red-400">L</span> — Comparatif
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-slate-300">
                                            <thead>
                                                <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase">
                                                    <th className="p-2 text-left">Stat</th>
                                                    <th className="p-2 text-center text-green-400">Victoires ({teamTrendsData.wins}m)</th>
                                                    <th className="p-2 text-center text-red-400">Défaites ({teamTrendsData.losses}m)</th>
                                                    <th className="p-2 text-center">Diff</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {(() => {
                                                    const w = teamTrendsData.winAvgs;
                                                    const l = teamTrendsData.lossAvgs;
                                                    const rows = [
                                                        { label: 'Points marqués', win: w.pts, loss: l.pts, higherIsBetter: true },
                                                        { label: 'Points encaissés', win: w.conceded, loss: l.conceded, higherIsBetter: false },
                                                        { label: 'FG%', win: w.fgPct + '%', loss: l.fgPct + '%', diff: (parseFloat(w.fgPct) - parseFloat(l.fgPct)).toFixed(1) + '%', higherIsBetter: true },
                                                        { label: '3P%', win: w.threePct + '%', loss: l.threePct + '%', diff: (parseFloat(w.threePct) - parseFloat(l.threePct)).toFixed(1) + '%', higherIsBetter: true },
                                                        { label: 'LF%', win: w.ftPct + '%', loss: l.ftPct + '%', diff: (parseFloat(w.ftPct) - parseFloat(l.ftPct)).toFixed(1) + '%', higherIsBetter: true },
                                                        { label: 'Rebonds', win: w.reb, loss: l.reb, higherIsBetter: true },
                                                        { label: 'Passes D.', win: w.ast, loss: l.ast, higherIsBetter: true },
                                                        { label: 'Interceptions', win: w.stl, loss: l.stl, higherIsBetter: true },
                                                        { label: 'Balles perdues', win: w.tov, loss: l.tov, higherIsBetter: false },
                                                        { label: 'Fautes', win: w.pf, loss: l.pf, higherIsBetter: false },
                                                    ];

                                                    const withDiff = rows.map(r => {
                                                        const wVal = parseFloat(r.win);
                                                        const lVal = parseFloat(r.loss);
                                                        const rawDiff = r.diff || (wVal - lVal).toFixed(1);
                                                        const numDiff = parseFloat(rawDiff);
                                                        const isGood = r.higherIsBetter ? numDiff >= 0 : numDiff <= 0;
                                                        return { ...r, rawDiff, numDiff, isGood, absImpact: Math.abs(numDiff) };
                                                    });

                                                    withDiff.sort((a, b) => b.absImpact - a.absImpact);

                                                    return withDiff.map((r, i) => (
                                                        <tr key={i} className="hover:bg-slate-800/50">
                                                            <td className="p-2 text-left font-medium text-white text-xs">{r.label}</td>
                                                            <td className="p-2 text-center text-green-400 font-mono">{r.win}</td>
                                                            <td className="p-2 text-center text-red-400 font-mono">{r.loss}</td>
                                                            <td className={`p-2 text-center font-bold font-mono ${r.isGood ? 'text-green-400' : 'text-red-400'}`}>
                                                                {parseFloat(r.rawDiff) > 0 ? '+' : ''}{r.rawDiff}
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
                                    <h4 className="text-xs text-slate-400 uppercase mb-3 font-bold">Différentiel par match</h4>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={teamTrendsData.data}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
                                                <XAxis dataKey="opponent" stroke="#a0a0b0" fontSize={10} angle={-45} textAnchor="end" height={50} />
                                                <YAxis stroke="#a0a0b0" fontSize={10} />
                                                <ReferenceLine y={0} stroke="#50506a" strokeDasharray="3 3" />
                                                <Tooltip contentStyle={{ backgroundColor: '#1e1e3a', border: '1px solid #3a3a5a', borderRadius: '8px' }} />
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
                            <span className="text-[10px] text-slate-600 font-normal ml-2">(matchs avec play-by-play uniquement)</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* DUOS */}
                            {combosData.duos.length > 0 && (
                                <div>
                                    <h5 className="text-xs text-purple-400 uppercase font-bold mb-2">Duos</h5>
                                    <div className="space-y-1">
                                        {combosData.duos.map((d, i) => (
                                            <div key={d.key} className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                                <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-white font-medium truncate">{d.names.join(' + ')}</div>
                                                    <div className="text-[10px] text-slate-500">{d.poss} poss</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-bold ${d.netRtg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {d.netRtg > 0 ? '+' : ''}{d.netRtg}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">Net Rtg</div>
                                                </div>
                                                <div className="text-right ml-2">
                                                    <div className={`text-xs font-mono ${d.pm >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {d.pm > 0 ? '+' : ''}{d.pm}
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
                                            <div key={d.key} className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                                <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-white font-medium truncate">{d.names.join(' + ')}</div>
                                                    <div className="text-[10px] text-slate-500">{d.poss} poss</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-bold ${d.netRtg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {d.netRtg > 0 ? '+' : ''}{d.netRtg}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">Net Rtg</div>
                                                </div>
                                                <div className="text-right ml-2">
                                                    <div className={`text-xs font-mono ${d.pm >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {d.pm > 0 ? '+' : ''}{d.pm}
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
            </>)}
            <window.Modal isOpen={showVolumeMatrix} onClose={() => setShowVolumeMatrix(false)} title={<><window.Icon path={window.Icons.Chart} /> Matrice Volume / Efficacité</>} size="max-w-3xl">
                <VolumeEfficiencyMatrix players={aggregated} />
            </window.Modal>
        </div>
    );
}

window.GlobalStats = GlobalStats;
