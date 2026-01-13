// ==========================================
// 🛠️ ZONE DE CONFIGURATION AUTOMATIQUE 🛠️
// ==========================================

const PRECONFIGURED_FIREBASE = {
    apiKey: "AIzaSyBaA99che1oz9BHc23IhiFoY-nK0xvg4q4",
    authDomain: "statu18elite.firebaseapp.com",
    projectId: "statu18elite",
    storageBucket: "statu18elite.firebasestorage.app",
    messagingSenderId: "862850988986",
    appId: "1:862850988986:web:47a2b48477015506f6fb83"
};

// ==========================================
const { useState, useEffect, useMemo } = React;
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area } = window.Recharts || {};

const generateId = () => Math.random().toString(36).substr(2, 9);
const defaultPlayers = [{ id: 1, name: "Joueur 1", number: 4, pos: "PG" }, { id: 2, name: "Joueur 2", number: 5, pos: "SG" }];
const DEFAULT_PHASES = [{ id: "phase1", name: "Phase 1" }, { id: "phase2", name: "Phase 2" }];

// --- STATS LOGIC ---
const recalculateGameStats = (actions, players) => {
    const pStats = {};
    players.forEach(p => {
        pStats[p.id] = { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, pf: 0, pointsAllowed: 0, minutes: 0, plusMinus: 0, threePM: 0, threePA: 0, oppFga: 0, oppOreb: 0, oppTo: 0, oppFta: 0 };
    });
    const oppStats = { pts: 0, reb: 0, ast: 0, tov: 0, fouls: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, oreb: 0 };
    let home = 0, away = 0;

    actions.forEach(act => {
        const { type, playerId, consequence, onCourt } = act;
        let ptsScored = 0, ptsConceded = 0;
        if (playerId === 'OPP') {
            if (type === 'FGM1') { oppStats.pts+=1; oppStats.ftm+=1; oppStats.fta+=1; away+=1; ptsConceded=1; }
            if (type === 'FGA1') oppStats.fta+=1;
            if (type === 'FGM2') { oppStats.pts+=2; oppStats.fgm+=1; oppStats.fga+=1; away+=2; ptsConceded=2; }
            if (type === 'FGA2') oppStats.fga+=1;
            if (type === 'FGM3') { oppStats.pts+=3; oppStats.fgm+=1; oppStats.fga+=1; away+=3; ptsConceded=3; }
            if (type === 'FGA3') oppStats.fga+=1;
            if (type === 'OREB') { oppStats.reb+=1; oppStats.oreb+=1; }
            if (type === 'DREB') oppStats.reb+=1;
            if (type === 'AST') oppStats.ast+=1;
            if (type === 'TOV') oppStats.tov+=1;
            if (type === 'PF') oppStats.fouls+=1;
            if (consequence?.includes('score')) { const val = parseInt(consequence.split('_')[1]); home += val; ptsScored = val; }
            if (onCourt?.length) onCourt.forEach(pid => { if (pStats[pid]) { if(type.includes('FGA')||type.includes('FGM')) pStats[pid].oppFga++; if(type==='OREB') pStats[pid].oppOreb++; if(type==='TOV') pStats[pid].oppTo++; }});
        } else if (pStats[playerId]) {
            const ps = pStats[playerId];
            if (type === 'FGM1') { ps.pts+=1; ps.ftm+=1; ps.fta+=1; home+=1; ptsScored=1; }
            if (type === 'FGA1') ps.fta+=1;
            if (type === 'FGM2') { ps.pts+=2; ps.fgm+=1; ps.fga+=1; home+=2; ptsScored=2; }
            if (type === 'FGA2') ps.fga+=1;
            if (type === 'FGM3') { ps.pts+=3; ps.fgm+=1; ps.fga+=1; ps.threePM+=1; ps.threePA+=1; home+=3; ptsScored=3; }
            if (type === 'FGA3') { ps.fga+=1; ps.threePA+=1; }
            if (type === 'OREB') { ps.reb+=1; ps.oreb+=1; }
            if (type === 'DREB') { ps.reb+=1; ps.dreb+=1; }
            if (type === 'AST') ps.ast+=1;
            if (type === 'STL') ps.stl+=1;
            if (type === 'BLK') ps.blk+=1;
            if (type === 'TOV') ps.tov+=1;
            if (type === 'PF') ps.pf+=1;
            if (consequence?.includes('score')) { const val = parseInt(consequence.split('_')[1]); ps.pointsAllowed += val; away += val; ptsConceded = val; }
        }
        if (onCourt?.length) onCourt.forEach(pid => { if (pStats[pid]) { pStats[pid].plusMinus += ptsScored - ptsConceded; }});
    });
    return { playerStats: pStats, opponentStats: oppStats, homeScore: home, awayScore: away };
};

const saveDataToCloud = (db, collection, data) => {
    if (!db) return;
    db.collection("team_data").doc(collection).set({ list: data })
        .then(() => console.log(`✅ ${collection} sauvegardé`))
        .catch(e => console.error(`❌ Erreur ${collection}:`, e));
};

// --- ICONS ---
const Icon = ({ path, className }) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>;
const Icons = {
    Activity: "M22 12h-4l-3 9L9 3l-3 9H2", Clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z",
    Settings: "M12.22 2h-.44a2 2 0 0 1-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    Play: "M5 3l14 9-14 9V3z", Trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", Chart: "M18 20V10 M12 20V4 M6 20v-6",
    Plus: "M12 5v14M5 12h14", Eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z", Check: "M20 6L9 17l-5-5",
    Edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z", Pause: "M10 9v6 M14 9v6", Upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    Link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", Cloud: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z", Printer: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
    Info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", Filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z", Layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    Users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    TrendingUp: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6", Trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 22V9 M14 22V9 M8 9h8a4 4 0 0 0 4-4V4H4v1a4 4 0 0 0 4 4z",
    Zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", Target: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }) => <div className={`bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden ${className}`}>{children}</div>;
const Button = ({ onClick, children, variant = "primary", className = "", size = "md", disabled = false }) => {
    const base = "font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer no-print";
    const variants = { primary: "bg-coach-accent hover:bg-orange-600 text-white shadow-md", secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200", danger: "bg-red-600 hover:bg-red-700 text-white", success: "bg-green-600 hover:bg-green-700 text-white", ghost: "bg-transparent hover:bg-slate-700 text-slate-400" };
    const sizes = { sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-lg" };
    return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{children}</button>;
};
const  = ({ isOpen, onClose, title, children, size = "max-w-6xl" }) => {
    if (!isOpen) return null;
    return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print"><div className={`bg-slate-800 rounded-xl border border-slate-600 w-full ${size} shadow-2xl max-h-[90vh] flex flex-col`}><div className="flex justify-between items-center p-4 border-b border-slate-700 shrink-0"><h3 className="text-xl font-bold text-white flex items-center gap-2">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button></div><div className="p-4 overflow-y-auto flex-1">{children}</div></div></div>;
};

// --- PARSE HTML ---
const parseHTMLStats = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const date = doc.querySelector('#game-date span.detail')?.textContent || new Date().toLocaleDateString();
    let homeName = doc.querySelector('#team-names-container .left span.detail')?.textContent || "Nous";
    let awayName = doc.querySelector('#team-names-container .right span.detail')?.textContent || "Adversaire";
    let homeScore = parseInt(doc.querySelector('#team-score-left .title')?.textContent || "0");
    let awayScore = parseInt(doc.querySelector('#team-score-right .title')?.textContent || "0");
    let opponentName = awayName, myScore = homeScore, oppScore = awayScore;
    if (homeName.toLowerCase().includes("champagne") || homeName.toLowerCase().includes("basket")) { opponentName = awayName; myScore = homeScore; oppScore = awayScore; }
    else if (awayName.toLowerCase().includes("champagne") || awayName.toLowerCase().includes("basket")) { opponentName = homeName; myScore = awayScore; oppScore = homeScore; }
    const rawPlayers = [];
    const table = doc.querySelector('table#stats');
    let opponentStats = { pts: 0, reb: 0, ast: 0, tov: 0, fouls: 0, fga: 0, oreb: 0, fta: 0 };
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, i) => {
            if (i === 0) return;
            const cells = row.querySelectorAll('td');
            if (cells.length < 17) return;
            const nameCell = cells[0].textContent.trim();
            if (nameCell.includes(opponentName)) { opponentStats = { pts: parseInt(cells[16].textContent)||0, reb: (parseInt(cells[7].textContent)||0)+(parseInt(cells[8].textContent)||0), ast: parseInt(cells[13].textContent)||0, tov: parseInt(cells[11].textContent)||0, fouls: parseInt(cells[9].textContent)||0, oreb: parseInt(cells[7].textContent)||0, fga: 0, fta: 0 }; return; }
            if (!nameCell.startsWith('#')) return;
            const parts = nameCell.split(' ');
            const number = parseInt(parts[0].replace('#', ''));
            const name = parts.slice(1).join(' ');
            const parseSplit = (txt) => { if (!txt || txt === '-') return { made: 0, att: 0 }; const [m, a] = txt.split('-'); return { made: parseInt(m)||0, att: parseInt(a)||0 }; };
            const fg = parseSplit(cells[1].textContent); const tp = parseSplit(cells[3].textContent); const ft = parseSplit(cells[5].textContent);
            const stats = { fgm: fg.made - tp.made, fga: fg.att - tp.att, ftm: ft.made, fta: ft.att, pts: parseInt(cells[16].textContent) || 0, reb: (parseInt(cells[7].textContent)||0) + (parseInt(cells[8].textContent)||0), oreb: parseInt(cells[7].textContent) || 0, dreb: parseInt(cells[8].textContent) || 0, ast: parseInt(cells[13].textContent) || 0, stl: parseInt(cells[10].textContent) || 0, blk: parseInt(cells[12].textContent) || 0, tov: parseInt(cells[11].textContent) || 0, pf: parseInt(cells[9].textContent) || 0, minutes: parseInt(cells[15].textContent) || 0, plusMinus: parseInt(cells[14].textContent) || 0, threePM: tp.made, threePA: tp.att };
            rawPlayers.push({ name, number, stats });
        });
    }
    return { meta: { date, opponent: opponentName, homeScore: myScore, awayScore: oppScore, location: "Importé" }, rawPlayers, opponentStats };
};

// --- LIVE TRACKER ---
function LiveTracker({ players, onSaveGame, initialGame, phases, selectedPhase }) {
    const [gameState, setGameState] = useState({ quarter: 1, opponent: "Adversaire", location: "Domicile", actions: [], phase: selectedPhase });
    const [gameTime, setGameTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [onCourt, setOnCourt] = useState([]);
    const [accumulatedMinutes, setAccumulatedMinutes] = useState({});
    const [derived, setDerived] = useState(recalculateGameStats([], players));
    const [, set] = useState({ type: null, data: null });

    useEffect(() => { if (initialGame) setGameState(prev => ({ ...prev, ...initialGame })); }, [initialGame]);
    useEffect(() => { setDerived(recalculateGameStats(gameState.actions, players)); }, [gameState.actions, players]);
    useEffect(() => {
        let interval;
        if (isTimerRunning) { interval = setInterval(() => { setGameTime(p => p + 1); setAccumulatedMinutes(prev => { const next = { ...prev }; onCourt.forEach(id => next[id] = (next[id] || 0) + 1); return next; }); }, 1000); }
        return () => clearInterval(interval);
    }, [isTimerRunning, onCourt]);

    const registerAction = (actionType, player, extraData = {}) => {
        const newAction = { id: generateId(), type: actionType, playerId: player === 'opponent' ? 'OPP' : player.id, playerName: player === 'opponent' ? 'Adversaire' : player.name, q: gameState.quarter, consequence: extraData.consequence, timestamp: new Date().toLocaleTimeString(), onCourt: [...onCourt] };
        setGameState(prev => ({ ...prev, actions: [...prev.actions, newAction] }));
        set({ type: null, data: null });
    };

    const finalizeGame = () => {
        const finalStats = { ...derived.playerStats };
        Object.keys(accumulatedMinutes).forEach(pid => { if (finalStats[pid]) finalStats[pid].minutes += Math.round(accumulatedMinutes[pid] / 60); });
        onSaveGame({ ...gameState, ...derived, playerStats: finalStats });
    };

    return (
        <div className="flex flex-col h-full gap-4 relative">
            <div className="bg-slate-800 p-2 flex justify-between items-center rounded-lg border border-slate-700">
                <div className="flex items-center gap-4">
                    <Button size="sm" className={isTimerRunning ? "bg-red-500" : "bg-green-500"} onClick={() => setIsTimerRunning(!isTimerRunning)}><Icon path={isTimerRunning ? Icons.Pause : Icons.Play} /> {isTimerRunning ? "Stop" : "Start"}</Button>
                    <div className="font-mono text-xl text-white font-bold">{Math.floor(gameTime / 60).toString().padStart(2, '0')}:{(gameTime % 60).toString().padStart(2, '0')}</div>
                </div>
                <div className="flex items-center gap-4">
                    <select value={gameState.phase} onChange={(e) => setGameState(p => ({ ...p, phase: e.target.value }))} className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600">
                        {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                    </select>
                    <span className="text-xs text-slate-400">Terrain: <span className={onCourt.length === 5 ? "text-green-400" : "text-orange-400"}>{onCourt.length}/5</span></span>
                </div>
            </div>
            <Card className="bg-slate-900 p-4 flex justify-between items-center sticky top-0 z-10 border-b-4 border-coach-accent">
                <div className="text-4xl font-bold text-white">{derived.homeScore}</div>
                <div className="flex flex-col items-center"><div className="text-xl font-bold text-orange-500">Q{gameState.quarter}</div><div className="flex gap-2 mt-1"><button onClick={() => setGameState(p => ({ ...p, quarter: Math.max(1, p.quarter - 1) }))} className="text-xs text-slate-500 hover:text-white">-</button><button onClick={() => setGameState(p => ({ ...p, quarter: p.quarter + 1 }))} className="text-xs text-slate-500 hover:text-white">+</button></div></div>
                <div className="text-4xl font-bold text-red-500">{derived.awayScore}</div>
            </Card>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-3 pb-20">
                {players.map(player => {
                    const pStats = derived.playerStats[player.id] || { pts: 0, plusMinus: 0 };
                    const isOnCourt = onCourt.includes(player.id);
                    return (
                        <div key={player.id} className={`relative p-3 rounded-xl border shadow-md transition-all ${isOnCourt ? 'bg-slate-800 border-orange-500 ring-1 ring-orange-500/50' : 'bg-slate-800/60 border-slate-700 opacity-80'}`}>
                            <div className="absolute top-2 right-2 z-20"><input type="checkbox" checked={isOnCourt} onChange={() => { if (onCourt.includes(player.id)) setOnCourt(p => p.filter(x => x !== player.id)); else if (onCourt.length < 5) setOnCourt(p => [...p, player.id]); }} className="w-5 h-5 accent-orange-500 cursor-pointer" /></div>
                            <div onClick={() => set({ type: "ACTION_MENU", data: player })} className="cursor-pointer">
                                <div className="flex justify-between pr-6"><span className={`font-bold truncate ${isOnCourt ? 'text-white' : 'text-slate-400'}`}>{player.name}</span><span className="text-xs text-slate-500">#{player.number}</span></div>
                                <div className="text-xs mt-2 space-x-2 text-slate-300"><span>Pts: <b className="text-white">{pStats.pts}</b></span><span>+/-: <b className={pStats.plusMinus >= 0 ? "text-green-400" : "text-red-400"}>{pStats.plusMinus > 0 ? '+' : ''}{pStats.plusMinus}</b></span></div>
                            </div>
                        </div>
                    );
                })}
                <div onClick={() => set({ type: "ACTION_MENU", data: "opponent" })} className="bg-red-900/40 p-3 rounded-xl border border-red-700 shadow-md hover:border-red-500 cursor-pointer flex items-center justify-center"><span className="font-bold text-red-200">{gameState.opponent.toUpperCase()}</span></div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 p-4 border-t border-slate-800 flex justify-end z-20 gap-2"><Button variant="secondary" onClick={() => setModal({ type: "STATS" })}><Icon path={Icons.Eye} /> Stats</Button><Button variant="success" onClick={finalizeGame}><Icon path={Icons.Check} /> Finir</Button></div>
            <Modal isOpen={modal.type === "ACTION_MENU"} onClose={() => setModal({ type: null })} title={modal.data?.name || "Adversaire"} size="max-w-md">
                <div className="grid grid-cols-3 gap-3">
                    <Button className="bg-green-600 h-12" onClick={() => registerAction("FGM2", modal.data)}>+2</Button><Button className="bg-green-600 h-12" onClick={() => registerAction("FGM3", modal.data)}>+3</Button><Button className="bg-green-600 h-12" onClick={() => registerAction("FGM1", modal.data)}>+1 LF</Button>
                    <Button className="bg-red-500 h-10" onClick={() => registerAction("FGA2", modal.data)}>Miss 2</Button><Button className="bg-red-500 h-10" onClick={() => registerAction("FGA3", modal.data)}>Miss 3</Button><Button className="bg-red-500 h-10" onClick={() => registerAction("FGA1", modal.data)}>Miss LF</Button>
                    <div className="col-span-3 h-px bg-slate-600 my-1"></div>
                    <Button className="bg-blue-600" onClick={() => registerAction("DREB", modal.data)}>Reb D</Button><Button className="bg-blue-500" onClick={() => registerAction("OREB", modal.data)}>Reb O</Button><Button className="bg-purple-600" onClick={() => registerAction("AST", modal.data)}>Passe</Button>
                    <Button className="bg-yellow-600" onClick={() => modal.data !== 'opponent' ? setModal({ type: "CONSEQ_STL", data: modal.data }) : registerAction("STL", "opponent")}>Int</Button><Button className="bg-orange-600" onClick={() => modal.data !== 'opponent' ? setModal({ type: "CONSEQ_TOV", data: modal.data }) : registerAction("TOV", "opponent")}>BP</Button><Button className="bg-slate-600" onClick={() => registerAction("BLK", modal.data)}>Contre</Button>
                    <Button variant="danger" className="col-span-3 mt-2" onClick={() => registerAction("PF", modal.data)}>Faute</Button>
                </div>
            </Modal>
            <Modal isOpen={modal.type === "CONSEQ_TOV"} onClose={() => setModal({ type: null })} title="Conséquence ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_2" })} className="bg-red-600">Adv +2</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_3" })} className="bg-red-600">Adv +3</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "CONSEQ_STL"} onClose={() => setModal({ type: null })} title="Suite ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("STL", modal.data, { consequence: "score_2" })} className="bg-green-600">Nous +2</Button><Button onClick={() => registerAction("STL", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "STATS"} onClose={() => setModal({ type: null })} title="Stats Live"><table className="w-full text-left text-xs text-slate-300"><thead className="bg-slate-700 text-white"><tr><th className="p-2">Joueur</th><th className="p-2">Pts</th><th className="p-2">+/-</th><th className="p-2">Fte</th></tr></thead><tbody className="divide-y divide-slate-700">{players.map(p => { const s = derived.playerStats[p.id] || {}; return <tr key={p.id}><td className="p-2 font-bold">{p.name}</td><td className="p-2">{s.pts}</td><td className={`p-2 font-bold ${s.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.plusMinus}</td><td className="p-2 text-red-400">{s.pf}</td></tr>; })}</tbody></table></Modal>
        </div>
    );
}

// --- GLOBAL STATS avec améliorations ---
function GlobalStats({ players, games, phases }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [viewMode, setViewMode] = useState('classic');
    const [phaseFilter, setPhaseFilter] = useState('all');
    const [showComparison, setShowComparison] = useState(false);
    const [showTeamTrends, setShowTeamTrends] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [comparePlayer1, setComparePlayer1] = useState(null);
    const [comparePlayer2, setComparePlayer2] = useState(null);

    const filteredGames = useMemo(() => phaseFilter === 'all' ? games : games.filter(g => g.phase === phaseFilter), [games, phaseFilter]);

    // Calcul des stats agrégées avec logs pour graphiques
    const aggregated = useMemo(() => {
        const stats = {};
        players.forEach(p => { stats[p.id] = { info: p, gamesPlayed: 0, total: { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, eff: 0, fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, pf: 0, plusMinus: 0, pie: 0 }, totalMinPlayed: 0, weightedORtg: 0, weightedDRtg: 0, logs: [], records: { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, eff: 0 } }; });

        filteredGames.forEach(g => {
            // Calculer les totaux du match pour le PIE et les ratings équipe
            let gamePTS = 0, gameFGM = 0, gameFTM = 0, gameFGA = 0, gameFTA = 0;
            let gameDRB = 0, gameORB = 0, gameAST = 0, gameSTL = 0, gameBLK = 0, gamePF = 0, gameTO = 0;
            let teamFGA = 0, teamFTA = 0, teamORB = 0, teamTO = 0, teamPTS = 0;
            let totalMinutes = 0;
            
            // Stats équipe
            Object.values(g.playerStats).forEach(s => {
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
                
                teamFGA += (s.fga || 0) + (s.threePA || 0);
                teamFTA += s.fta || 0;
                teamORB += s.oreb || 0;
                teamTO += s.tov || 0;
                teamPTS += s.pts || 0;
                totalMinutes += s.minutes || 0;
            });
            
            // Ajouter stats adversaire pour PIE
            const opp = g.opponentStats || {};
            const oppPTS = g.awayScore || 0;
            gamePTS += oppPTS;
            gameFGM += opp.fgm || Math.round(oppPTS / 2.2);
            gameFTM += opp.ftm || 0;
            gameFGA += opp.fga || Math.round(oppPTS / 1.1);
            gameFTA += opp.fta || 0;
            gameDRB += opp.reb ? Math.round(opp.reb * 0.7) : 0;
            gameORB += opp.oreb || 0;
            gameAST += opp.ast || 0;
            gameBLK += opp.blk || 0;
            gamePF += opp.fouls || 0;
            gameTO += opp.tov || 0;
            
            // Dénominateur PIE du match
            const gamePIEDenom = gamePTS + gameFGM + gameFTM - gameFGA - gameFTA + gameDRB + (0.5 * gameORB) + gameAST + gameSTL + (0.5 * gameBLK) - gamePF - gameTO;
            
            // Possessions équipe pour ce match: FGA + 0.44 * FTA - ORB + TO
            const teamPoss = teamFGA + 0.44 * teamFTA - teamORB + teamTO;
            
            // Ratings équipe pour ce match
            const teamORtg = teamPoss > 0 ? (teamPTS / teamPoss) * 100 : 100;
            const teamDRtg = teamPoss > 0 ? (oppPTS / teamPoss) * 100 : 100;

            Object.entries(g.playerStats).forEach(([pid, s]) => {
                const id = parseInt(pid);
                if ((s.minutes || 0) > 0 && stats[id]) {
                    const t = stats[id].total;
                    const playerMin = s.minutes || 0;
                    
                    stats[id].gamesPlayed += 1;
                    stats[id].totalMinPlayed += playerMin;
                    
                    // Pondérer les ratings par les minutes jouées
                    stats[id].weightedORtg += teamORtg * playerMin;
                    stats[id].weightedDRtg += teamDRtg * playerMin;
                    
                    t.pts += (s.pts || 0); t.reb += (s.reb || 0); t.oreb += (s.oreb || 0); t.dreb += (s.dreb || 0);
                    t.ast += (s.ast || 0); t.stl += (s.stl || 0); t.blk += (s.blk || 0); t.tov += (s.tov || 0); t.min += playerMin;
                    t.fgm += (s.fgm || 0); t.fga += (s.fga || 0); t.threePM += (s.threePM || 0); t.threePA += (s.threePA || 0);
                    t.ftm += (s.ftm || 0); t.fta += (s.fta || 0); t.pf += (s.pf || 0); t.plusMinus += (s.plusMinus || 0);
                    
                    const playerFGA = (s.fga || 0) + (s.threePA || 0);
                    const playerFGM = (s.fgm || 0) + (s.threePM || 0);
                    const missedFG = playerFGA - playerFGM;
                    const missedFT = (s.fta || 0) - (s.ftm || 0);
                    const evalStat = (s.pts + s.reb + s.ast + s.stl + s.blk) - (missedFG + missedFT + s.tov);
                    t.eff += evalStat;

                    // PIE du match pour ce joueur
                    const playerPIENum = (s.pts || 0) + playerFGM + (s.ftm || 0) - playerFGA - (s.fta || 0) + (s.dreb || 0) + (0.5 * (s.oreb || 0)) + (s.ast || 0) + (s.stl || 0) + (0.5 * (s.blk || 0)) - (s.pf || 0) - (s.tov || 0);
                    const playerPIE = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;
                    t.pie += playerPIE;

                    // Records
                    if (s.pts > stats[id].records.pts) stats[id].records.pts = s.pts;
                    if (s.reb > stats[id].records.reb) stats[id].records.reb = s.reb;
                    if (s.ast > stats[id].records.ast) stats[id].records.ast = s.ast;
                    if (s.stl > stats[id].records.stl) stats[id].records.stl = s.stl;
                    if (s.blk > stats[id].records.blk) stats[id].records.blk = s.blk;
                    if (evalStat > stats[id].records.eff) stats[id].records.eff = evalStat;

                    // Stats du match pour les logs
                    const gameEFG = playerFGA > 0 ? ((playerFGM + 0.5 * (s.threePM || 0)) / playerFGA) * 100 : 0;
                    const gameTS = (playerFGA + 0.44 * (s.fta || 0)) > 0 ? ((s.pts || 0) / (2 * (playerFGA + 0.44 * (s.fta || 0)))) * 100 : 0;

                    stats[id].logs.push({ 
                        date: g.date, 
                        opponent: g.opponent, 
                        phase: g.phase, 
                        pts: s.pts, 
                        reb: s.reb, 
                        ast: s.ast, 
                        eff: evalStat, 
                        eFG: gameEFG.toFixed(1), 
                        TS: gameTS.toFixed(1), 
                        ORtg: teamORtg.toFixed(1),
                        DRtg: teamDRtg.toFixed(1),
                        PIE: playerPIE.toFixed(1),
                        min: s.minutes 
                    });
                }
            });
        });

        return Object.values(stats).map(p => {
            p.logs.sort((a, b) => {
                const parseFrenchDate = (dateStr) => {
                    const months = { 'janv': 0, 'jan': 0, 'févr': 1, 'fév': 1, 'fevr': 1, 'mars': 2, 'avr': 3, 'mai': 4, 'juin': 5, 'juil': 6, 'août': 7, 'aout': 7, 'sept': 8, 'oct': 9, 'nov': 10, 'déc': 11, 'dec': 11 };
                    const match = dateStr.match(/(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})/i);
                    if (match) {
                        const month = months[match[2].toLowerCase().replace('.', '')];
                        if (month !== undefined) return new Date(match[3], month, match[1]);
                    }
                    return new Date(dateStr);
                };
                return parseFrenchDate(a.date) - parseFrenchDate(b.date);
            });
            
            const gp = p.gamesPlayed || 1;
            const t = p.total;
            const totalMin = p.totalMinPlayed || 1;
            
            // FGA total inclut les 3PA
            const totalFGA = t.fga + t.threePA;
            const totalFGM = t.fgm + t.threePM;
            
            const fgPct = totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : "0.0";
            const threePct = t.threePA > 0 ? ((t.threePM / t.threePA) * 100).toFixed(1) : "0.0";
            const ftPct = t.fta > 0 ? ((t.ftm / t.fta) * 100).toFixed(1) : "0.0";
            
            // eFG% et TS% calculés sur les totaux
            const eFG = totalFGA > 0 ? (((totalFGM + 0.5 * t.threePM) / totalFGA) * 100).toFixed(1) : "0.0";
            const ts = (totalFGA + 0.44 * t.fta) > 0 ? ((t.pts / (2 * (totalFGA + 0.44 * t.fta))) * 100).toFixed(1) : "0.0";
            
            // Ratings = moyenne pondérée par les minutes jouées
            const ortg = (p.weightedORtg / totalMin).toFixed(1);
            const drtg = (p.weightedDRtg / totalMin).toFixed(1);
            const netRtg = (parseFloat(ortg) - parseFloat(drtg)).toFixed(1);
            
            // PIE moyen
            const avgPIE = (t.pie / gp).toFixed(1);
            
            return { 
                ...p, 
                avg: { 
                    min: (t.min / gp).toFixed(1), 
                    pts: (t.pts / gp).toFixed(1), 
                    fgm: totalFGM, 
                    fga: totalFGA, 
                    fgPct, 
                    threePM: t.threePM, 
                    threePA: t.threePA, 
                    threePct, 
                    ftm: t.ftm, 
                    fta: t.fta, 
                    ftPct, 
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
                    eFG, 
                    TS: ts, 
                    ORtg: ortg, 
                    DRtg: drtg, 
                    netRtg: netRtg,
                    PIE: avgPIE
                } 
            };
        }).filter(p => p.gamesPlayed > 0);
    }, [players, filteredGames]);

    // Team Trends Data avec logs
    const teamTrendsData = useMemo(() => {
        console.log("=== TEAM TRENDS DEBUG ===");
        console.log("Nombre de matchs filtrés:", filteredGames.length);
        
        // Fonction pour parser les dates françaises
        const parseFrenchDate = (dateStr) => {
            const months = {
                'janv': 0, 'jan': 0, 'janvier': 0,
                'févr': 1, 'fév': 1, 'fevr': 1, 'fev': 1, 'février': 1, 'fevrier': 1,
                'mars': 2, 'mar': 2,
                'avr': 3, 'avril': 3,
                'mai': 4,
                'juin': 5, 'jun': 5,
                'juil': 6, 'jul': 6, 'juillet': 6,
                'août': 7, 'aout': 7, 'aoû': 7,
                'sept': 8, 'sep': 8, 'septembre': 8,
                'oct': 9, 'octobre': 9,
                'nov': 10, 'novembre': 10,
                'déc': 11, 'dec': 11, 'décembre': 11, 'decembre': 11
            };
            
            // Format "16 nov. 2025" ou "16 novembre 2025"
            const match = dateStr.match(/(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})/i);
            if (match) {
                const day = parseInt(match[1]);
                const monthStr = match[2].toLowerCase().replace('.', '');
                const year = parseInt(match[3]);
                const month = months[monthStr];
                if (month !== undefined) {
                    return new Date(year, month, day);
                }
            }
            
            // Format DD/MM/YYYY
            const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (slashMatch) {
                return new Date(slashMatch[3], slashMatch[2] - 1, slashMatch[1]);
            }
            
            // Fallback
            return new Date(dateStr);
        };
        
        const data = filteredGames.map((g, index) => {
            let totalPts = 0, totalFGA = 0, totalFTA = 0, totalTOV = 0, totalORB = 0;
            
            Object.values(g.playerStats).forEach(s => { 
                totalPts += s.pts || 0; 
                totalFGA += (s.fga || 0) + (s.threePA || 0); // FGA inclut les 3pts
                totalFTA += s.fta || 0;
                totalTOV += s.tov || 0;
                totalORB += s.oreb || 0;
            });
            
            // Nouvelle formule: Possessions = FGA + 0.44 * FTA - ORB + TO
            const totalPoss = totalFGA + 0.44 * totalFTA - totalORB + totalTOV;
            const totalPtsAllowed = g.awayScore || 0;
            
            const ortg = totalPoss > 0 ? (totalPts / totalPoss) * 100 : 0;
            const drtg = totalPoss > 0 ? (totalPtsAllowed / totalPoss) * 100 : 100;
            
            const dateObj = parseFrenchDate(g.date);
            
            console.log(`Match ${index + 1}:`, {
                date: g.date,
                parsedDate: dateObj.toLocaleDateString('fr-FR'),
                timestamp: dateObj.getTime(),
                opponent: g.opponent,
                score: `${g.homeScore}-${g.awayScore}`,
                possessions: totalPoss.toFixed(2),
                ORtg: ortg.toFixed(1),
                DRtg: drtg.toFixed(1)
            });
            
            return { 
                date: g.date, 
                dateTimestamp: dateObj.getTime(),
                opponent: g.opponent, 
                ORtg: parseFloat(ortg.toFixed(1)), 
                DRtg: parseFloat(drtg.toFixed(1)), 
                NetRtg: parseFloat((ortg - drtg).toFixed(1)), 
                score: g.homeScore, 
                conceded: g.awayScore 
            };
        });
        
        // Tri par timestamp
        const sorted = data.sort((a, b) => a.dateTimestamp - b.dateTimestamp);
        
        console.log("=== ORDRE APRÈS TRI ===");
        sorted.forEach((d, i) => console.log(`${i + 1}. ${d.date} vs ${d.opponent} (timestamp: ${d.dateTimestamp})`));
        
        return sorted;
    }, [filteredGames]);

    // Heatmap Data - Toutes les statistiques
    const heatmapData = useMemo(() => {
        const categories = [
            { key: 'pts', label: 'PTS' },
            { key: 'reb', label: 'REB' },
            { key: 'ast', label: 'AST' },
            { key: 'stl', label: 'INT' },
            { key: 'blk', label: 'CTR' },
            { key: 'tov', label: 'BP', inverse: true },
            { key: 'fgPct', label: 'FG%' },
            { key: 'threePct', label: '3P%' },
            { key: 'ftPct', label: 'LF%' },
            { key: 'eFG', label: 'eFG%' },
            { key: 'TS', label: 'TS%' },
            { key: 'plusMinus', label: '+/-' },
            { key: 'eff', label: 'ÉVAL' },
            { key: 'ORtg', label: 'ORtg' },
            { key: 'DRtg', label: 'DRtg', inverse: true },
            { key: 'netRtg', label: 'NetRtg' },
            { key: 'PIE', label: 'PIE' }
        ];
        const maxValues = {};
        const minValues = {};
        categories.forEach(cat => {
            const values = aggregated.map(p => parseFloat(p.avg[cat.key]) || 0);
            maxValues[cat.key] = Math.max(...values, 1);
            minValues[cat.key] = Math.min(...values, 0);
        });
        return { categories, maxValues, minValues, players: aggregated };
    }, [aggregated]);

    // Radar data pour comparaison
    const getRadarData = (p1, p2) => {
        if (!p1 || !p2) return [];
        const categories = [
            { key: 'pts', label: 'Points' },
            { key: 'reb', label: 'Rebonds' },
            { key: 'ast', label: 'Passes' },
            { key: 'stl', label: 'Interceptions' },
            { key: 'eFG', label: 'eFG%' },
            { key: 'PIE', label: 'PIE' }
        ];
        return categories.map(c => ({
            category: c.label,
            [p1.info.name]: parseFloat(p1.avg[c.key]) || 0,
            [p2.info.name]: parseFloat(p2.avg[c.key]) || 0
        }));
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <Card className="p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4 no-print">
                    <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant={viewMode === 'classic' ? 'primary' : 'secondary'} onClick={() => setViewMode('classic')}>📊 Classique</Button>
                        <Button size="sm" variant={viewMode === 'advanced' ? 'primary' : 'secondary'} onClick={() => setViewMode('advanced')}>🧠 Avancé</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowHeatmap(true)}><Icon path={Icons.Target} /> Heatmap</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowComparison(true)}><Icon path={Icons.Users} /> Comparer</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowTeamTrends(true)}><Icon path={Icons.TrendingUp} /> Tendances</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Icon path={Icons.Filter} className="text-slate-400" />
                        <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600">
                            <option value="all">Toutes les phases</option>
                            {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="text-xs text-slate-400 mb-2">{filteredGames.length} match(s)</div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                        <thead className="bg-slate-900 text-white uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th className="p-3 sticky left-0 bg-slate-900">Joueur</th><th className="p-3">MJ</th><th className="p-3">MIN</th>
                                {viewMode === 'classic' ? (<><th className="p-3 text-orange-400">PTS</th><th className="p-3">TIR</th><th className="p-3">%</th><th className="p-3">3P</th><th className="p-3">3P%</th><th className="p-3">LF</th><th className="p-3">LF%</th><th className="p-3">REB</th><th className="p-3">PD</th><th className="p-3">INT</th><th className="p-3">BP</th><th className="p-3">+/-</th><th className="p-3 text-green-400">ÉVAL</th></>) : (<><th className="p-3 text-blue-300">eFG%</th><th className="p-3 text-blue-300">TS%</th><th className="p-3 text-purple-400">ORtg</th><th className="p-3 text-red-400">DRtg</th><th className="p-3 text-yellow-400">Net</th><th className="p-3 text-cyan-400">PIE</th></>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {aggregated.map(p => (
                                <tr key={p.info.id} onClick={() => setSelectedPlayer(p)} className="hover:bg-slate-700/50 cursor-pointer">
                                    <td className="p-3 font-bold text-white sticky left-0 bg-slate-800">{p.info.name}</td>
                                    <td className="p-3">{p.gamesPlayed}</td><td className="p-3">{p.avg.min}</td>
                                    {viewMode === 'classic' ? (<><td className="p-3 font-bold text-orange-400">{p.avg.pts}</td><td className="p-3">{p.avg.fgm}-{p.avg.fga}</td><td className="p-3">{p.avg.fgPct}%</td><td className="p-3">{p.avg.threePM}-{p.avg.threePA}</td><td className="p-3">{p.avg.threePct}%</td><td className="p-3">{p.avg.ftm}-{p.avg.fta}</td><td className="p-3">{p.avg.ftPct}%</td><td className="p-3">{p.avg.reb}</td><td className="p-3">{p.avg.ast}</td><td className="p-3">{p.avg.stl}</td><td className="p-3">{p.avg.tov}</td><td className="p-3">{p.avg.plusMinus}</td><td className="p-3 font-bold text-green-400">{p.avg.eff}</td></>) : (<><td className="p-3 text-blue-300">{p.avg.eFG}%</td><td className="p-3 text-blue-300">{p.avg.TS}%</td><td className="p-3 text-purple-400">{p.avg.ORtg}</td><td className="p-3 text-red-400">{p.avg.DRtg}</td><td className="p-3 font-bold text-yellow-400">{p.avg.netRtg}</td><td className="p-3 font-bold text-cyan-400">{p.avg.PIE}%</td></>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal Joueur avec Records et Graphiques */}
            <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={<><Icon path={Icons.Trophy} className="text-yellow-400" /> {selectedPlayer?.info.name}</>}>
                {selectedPlayer && (
                    <div className="space-y-6">
                        {/* Stats moyennes */}
                        <div className="grid grid-cols-5 gap-2 bg-slate-900 p-4 rounded-lg">
                            <div className="text-center"><div className="text-xs text-slate-500">Points</div><div className="text-2xl font-bold text-white">{selectedPlayer.avg.pts}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500">Rebonds</div><div className="text-2xl font-bold text-white">{selectedPlayer.avg.reb}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500">Passes</div><div className="text-2xl font-bold text-white">{selectedPlayer.avg.ast}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500">Éval</div><div className="text-2xl font-bold text-green-400">{selectedPlayer.avg.eff}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500">PIE</div><div className="text-2xl font-bold text-cyan-400">{selectedPlayer.avg.PIE}%</div></div>
                        </div>

                        {/* Records de la saison */}
                        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-4 rounded-lg border border-yellow-600/50">
                            <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2"><Icon path={Icons.Trophy} /> Records de la Saison</h4>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                <div className="text-center bg-slate-800/50 p-2 rounded"><div className="text-2xl font-bold text-yellow-400">{selectedPlayer.records.pts}</div><div className="text-xs text-slate-400">Points</div></div>
                                <div className="text-center bg-slate-800/50 p-2 rounded"><div className="text-2xl font-bold text-yellow-400">{selectedPlayer.records.reb}</div><div className="text-xs text-slate-400">Rebonds</div></div>
                                <div className="text-center bg-slate-800/50 p-2 rounded"><div className="text-2xl font-bold text-yellow-400">{selectedPlayer.records.ast}</div><div className="text-xs text-slate-400">Passes</div></div>
                                <div className="text-center bg-slate-800/50 p-2 rounded"><div className="text-2xl font-bold text-yellow-400">{selectedPlayer.records.stl}</div><div className="text-xs text-slate-400">Intercept.</div></div>
                                <div className="text-center bg-slate-800/50 p-2 rounded"><div className="text-2xl font-bold text-yellow-400">{selectedPlayer.records.blk}</div><div className="text-xs text-slate-400">Contres</div></div>
                                <div className="text-center bg-slate-800/50 p-2 rounded"><div className="text-2xl font-bold text-yellow-400">{selectedPlayer.records.eff}</div><div className="text-xs text-slate-400">Éval</div></div>
                            </div>
                        </div>

                        {/* Graphique d'évolution */}
                        <div>
                            <h4 className="text-xs text-slate-400 mb-2 uppercase">Évolution sur la saison</h4>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={selectedPlayer.logs}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} />
                                        <YAxis stroke="#94a3b8" fontSize={10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="pts" name="Points" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="eff" name="Éval" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Graphique eFG% et TS% */}
                        <div>
                            <h4 className="text-xs text-slate-400 mb-2 uppercase">Efficacité au tir</h4>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={selectedPlayer.logs}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} />
                                        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                        <Legend />
                                        <Area type="monotone" dataKey="eFG" name="eFG%" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                        <Area type="monotone" dataKey="TS" name="TS%" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Historique */}
                        <div>
                            <h4 className="text-xs text-slate-400 mb-2 uppercase">Historique détaillé</h4>
                            <div className="overflow-x-auto max-h-48">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-700 text-white sticky top-0"><tr><th className="p-2">Date</th><th className="p-2">Adv</th><th className="p-2">MIN</th><th className="p-2">PTS</th><th className="p-2">REB</th><th className="p-2">AST</th><th className="p-2">eFG%</th><th className="p-2">ORtg</th><th className="p-2">DRtg</th><th className="p-2">PIE</th><th className="p-2">ÉVAL</th></tr></thead>
                                    <tbody className="divide-y divide-slate-700">{selectedPlayer.logs.map((log, i) => (<tr key={i} className={log.pts === selectedPlayer.records.pts ? 'bg-yellow-900/20' : ''}><td className="p-2">{log.date}</td><td className="p-2 font-bold">{log.opponent}</td><td className="p-2">{log.min}</td><td className="p-2 font-bold text-white">{log.pts}{log.pts === selectedPlayer.records.pts && <span className="ml-1 text-yellow-400">🏆</span>}</td><td className="p-2">{log.reb}</td><td className="p-2">{log.ast}</td><td className="p-2">{log.eFG}%</td><td className="p-2 text-purple-400">{log.ORtg}</td><td className="p-2 text-red-400">{log.DRtg}</td><td className="p-2 text-cyan-400">{log.PIE}%</td><td className="p-2">{log.eff}</td></tr>))}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Comparaison */}
            <Modal isOpen={showComparison} onClose={() => setShowComparison(false)} title={<><Icon path={Icons.Users} /> Comparaison Joueurs</>}>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <select value={comparePlayer1?.info.id || ''} onChange={(e) => setComparePlayer1(aggregated.find(p => p.info.id === parseInt(e.target.value)))} className="bg-slate-700 text-white p-3 rounded border border-slate-600">
                            <option value="">Joueur 1</option>
                            {aggregated.map(p => <option key={p.info.id} value={p.info.id}>{p.info.name}</option>)}
                        </select>
                        <select value={comparePlayer2?.info.id || ''} onChange={(e) => setComparePlayer2(aggregated.find(p => p.info.id === parseInt(e.target.value)))} className="bg-slate-700 text-white p-3 rounded border border-slate-600">
                            <option value="">Joueur 2</option>
                            {aggregated.map(p => <option key={p.info.id} value={p.info.id}>{p.info.name}</option>)}
                        </select>
                    </div>
                    {comparePlayer1 && comparePlayer2 && (
                        <>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={getRadarData(comparePlayer1, comparePlayer2)}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
                                        <PolarRadiusAxis stroke="#94a3b8" fontSize={10} />
                                        <Radar name={comparePlayer1.info.name} dataKey={comparePlayer1.info.name} stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                                        <Radar name={comparePlayer2.info.name} dataKey={comparePlayer2.info.name} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                        <Legend />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {['pts', 'reb', 'ast', 'stl', 'eFG', 'ORtg', 'DRtg', 'PIE', 'eff'].map(stat => (
                                    <div key={stat} className="bg-slate-900 p-3 rounded text-center">
                                        <div className="text-xs text-slate-400 uppercase mb-2">{stat}</div>
                                        <div className="flex justify-between items-center">
                                            <span className={`font-bold ${parseFloat(comparePlayer1.avg[stat]) > parseFloat(comparePlayer2.avg[stat]) ? 'text-orange-400' : 'text-slate-400'}`}>{comparePlayer1.avg[stat]}</span>
                                            <span className="text-slate-600">vs</span>
                                            <span className={`font-bold ${parseFloat(comparePlayer2.avg[stat]) > parseFloat(comparePlayer1.avg[stat]) ? 'text-blue-400' : 'text-slate-400'}`}>{comparePlayer2.avg[stat]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Modal Tendances Équipe */}
            <Modal isOpen={showTeamTrends} onClose={() => setShowTeamTrends(false)} title={<><Icon path={Icons.TrendingUp} /> Tendances Équipe</>}>
                <div className="space-y-6">
                    {/* Formules utilisées */}
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                        <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2"><Icon path={Icons.Info} /> Formules implémentées</h4>
                        <div className="text-xs font-mono text-slate-300 space-y-2">
                            <div className="bg-slate-800 p-2 rounded">
                                <span className="text-purple-400">Possessions</span> = FGA + 0.44 × FTA - ORB + TO
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <span className="text-green-400">Offensive Rating (ORtg)</span> = (Points Marqués / Possessions) × 100
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <span className="text-red-400">Defensive Rating (DRtg)</span> = (Points Encaissés / Possessions) × 100
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <span className="text-yellow-400">Net Rating</span> = ORtg - DRtg
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <span className="text-blue-400">eFG%</span> = ((FGM + 0.5 × 3PM) / FGA) × 100
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <span className="text-blue-400">TS%</span> = (PTS / (2 × (FGA + 0.44 × FTA))) × 100
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <span className="text-cyan-400">PIE (Player Impact Estimate)</span> = <br/>
                                <span className="text-xs ml-2">(PTS + FGM + FTM - FGA - FTA + DRB + 0.5×ORB + AST + STL + 0.5×BLK - PF - TO)</span><br/>
                                <span className="text-xs ml-2">÷ (Totaux du match équipe + adversaire)</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            <strong>Note:</strong> Le DRtg individuel est basé sur le DRtg équipe pondéré par le temps de jeu.
                            Le PIE mesure l'impact global d'un joueur sur le match (moyenne NBA ≈ 10%).
                        </p>
                    </div>

                    {/* Debug info */}
                    <div className="bg-slate-900 p-4 rounded-lg border border-yellow-600/50">
                        <h4 className="text-yellow-400 font-bold mb-2">Debug Timeline</h4>
                        <div className="text-xs text-slate-400 max-h-32 overflow-y-auto">
                            {teamTrendsData.map((d, i) => (
                                <div key={i} className="flex justify-between py-1 border-b border-slate-700">
                                    <span>{i + 1}. {d.date}</span>
                                    <span>vs {d.opponent}</span>
                                    <span>{d.score}-{d.conceded}</span>
                                    <span className="text-green-400">ORtg: {d.ORtg}</span>
                                    <span className="text-red-400">DRtg: {d.DRtg}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-72">
                        <h4 className="text-xs text-slate-400 mb-2 uppercase">Offensive & Defensive Rating</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={teamTrendsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} />
                                <YAxis stroke="#94a3b8" fontSize={10} domain={[60, 140]} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                <Legend />
                                <Line type="monotone" dataKey="ORtg" name="Off Rating" stroke="#22c55e" strokeWidth={2} />
                                <Line type="monotone" dataKey="DRtg" name="Def Rating" stroke="#ef4444" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="h-64">
                        <h4 className="text-xs text-slate-400 mb-2 uppercase">Net Rating par match</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamTrendsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} />
                                <YAxis stroke="#94a3b8" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                <Bar dataKey="NetRtg" name="Net Rating">
                                    {teamTrendsData.map((entry, index) => (
                                        <rect key={index} fill={entry.NetRtg >= 0 ? '#22c55e' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="h-64">
                        <h4 className="text-xs text-slate-400 mb-2 uppercase">Points marqués vs encaissés</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={teamTrendsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} />
                                <YAxis stroke="#94a3b8" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                <Legend />
                                <Area type="monotone" dataKey="score" name="Marqués" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                                <Area type="monotone" dataKey="conceded" name="Encaissés" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Modal>

            {/* Modal Heatmap */}
            <Modal isOpen={showHeatmap} onClose={() => setShowHeatmap(false)} title={<><Icon path={Icons.Target} /> Heatmap Performance</>}>
                <div className="space-y-4">
                    <div className="text-xs text-slate-400 bg-slate-900 p-3 rounded">
                        <p>🟠 Plus c'est orange, meilleure est la performance</p>
                        <p>🔵 Pour BP et DRtg, plus c'est bleu = meilleur (valeurs basses préférées)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase">
                                    <th className="p-2 text-left sticky left-0 bg-slate-800">Joueur</th>
                                    {heatmapData.categories.map(cat => (
                                        <th key={cat.key} className={`p-2 text-center ${cat.inverse ? 'text-blue-400' : ''}`}>
                                            {cat.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmapData.players.map(p => (
                                    <tr key={p.info.id} className="border-t border-slate-700">
                                        <td className="p-2 font-bold text-white sticky left-0 bg-slate-800">{p.info.name}</td>
                                        {heatmapData.categories.map(cat => {
                                            const val = parseFloat(p.avg[cat.key]) || 0;
                                            const max = heatmapData.maxValues[cat.key];
                                            const min = heatmapData.minValues[cat.key];
                                            const range = max - min || 1;
                                            
                                            let intensity;
                                            let bgColor;
                                            
                                            if (cat.inverse) {
                                                // Pour les stats inverses (BP, DRtg), moins c'est mieux
                                                intensity = 1 - ((val - min) / range);
                                                bgColor = `rgba(59, 130, 246, ${intensity * 0.8})`; // Bleu
                                            } else {
                                                intensity = (val - min) / range;
                                                bgColor = `rgba(249, 115, 22, ${intensity * 0.8})`; // Orange
                                            }
                                            
                                            return (
                                                <td key={cat.key} className="p-2 text-center font-bold text-white" style={{ backgroundColor: bgColor }}>
                                                    {p.avg[cat.key]}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// --- IMPORT MULTI-MATCHS ---
function ImportReviewModal({ importData, currentPlayers, phases, onConfirm, onCancel }) {
    const [mapping, setMapping] = useState({});
    const [selectedPhase, setSelectedPhase] = useState(phases[0]?.id || 'phase1');

    useEffect(() => {
        const initialMap = {};
        importData.rawPlayers.forEach((imp, idx) => {
            const match = currentPlayers.find(p => p.number === imp.number);
            initialMap[idx] = match ? match.id : "NEW";
        });
        setMapping(initialMap);
    }, [importData, currentPlayers]);

    const handleFinalize = () => {
        const finalGameStats = {};
        const newPlayersList = [...currentPlayers];
        let maxId = currentPlayers.length > 0 ? Math.max(...currentPlayers.map(p => p.id)) : 0;
        importData.rawPlayers.forEach((imp, idx) => {
            const choice = mapping[idx];
            let pid;
            if (choice === "NEW") { maxId++; pid = maxId; newPlayersList.push({ id: pid, name: imp.name, number: imp.number, pos: "G" }); }
            else if (choice === "SKIP") return;
            else pid = parseInt(choice);
            finalGameStats[pid] = imp.stats;
        });
        onConfirm({ id: generateId(), ...importData.meta, phase: selectedPhase, playerStats: finalGameStats, opponentStats: importData.opponentStats, actions: [] }, newPlayersList);
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h4 className="text-orange-500 font-bold mb-2">Match: {importData.meta.opponent}</h4>
                <div className="text-white text-sm mb-4">Score: {importData.meta.homeScore} - {importData.meta.awayScore}</div>
                <div className="bg-slate-800 p-3 rounded border border-orange-500/50">
                    <label className="block text-sm font-semibold text-orange-400 mb-2"><Icon path={Icons.Layers} className="inline mr-2" />Phase</label>
                    <div className="flex flex-wrap gap-2">
                        {phases.map(ph => (
                            <label key={ph.id} className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${selectedPhase === ph.id ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                <input type="radio" name="phase" value={ph.id} checked={selectedPhase === ph.id} onChange={(e) => setSelectedPhase(e.target.value)} className="hidden" />
                                {ph.name}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <div className="overflow-y-auto max-h-[40vh] space-y-2">
                {importData.rawPlayers.map((imp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                        <div className="w-1/3"><div className="text-white font-bold text-sm">#{imp.number} {imp.name}</div><div className="text-xs text-slate-400">{imp.stats.pts} pts</div></div>
                        <div className="flex-1">
                            <select className="w-full bg-slate-900 text-white text-sm p-2 rounded border border-slate-600" value={mapping[idx] || "NEW"} onChange={(e) => setMapping({ ...mapping, [idx]: e.target.value })}>
                                <option value="NEW">+ Créer</option><option value="SKIP">Ignorer</option>
                                {currentPlayers.map(p => <option key={p.id} value={p.id}>#{p.number} - {p.name}</option>)}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-700"><Button variant="ghost" onClick={onCancel}>Annuler</Button><Button variant="success" onClick={handleFinalize}>Confirmer</Button></div>
        </div>
    );
}

// --- COMPOSANT DÉTAILS DU MATCH (Classique & Avancé) ---
// REMPLACE la fonction GameDetailsModal existante dans ton app.js

function GameDetailsModal({ game, isOpen, onClose, players }) {
    if (!game) return null;

    const [viewMode, setViewMode] = useState('classic'); // 'classic' | 'advanced'

    // Calculs des stats avancées pour ce match spécifique
    const statsData = useMemo(() => {
        const pStats = game.playerStats || {};
        const opp = game.opponentStats || {};
        const teamScore = game.homeScore || 0;
        const oppScore = game.awayScore || 0;

        // 1. Totaux Équipe (Somme des joueurs)
        let tFGM = 0, tFGA = 0, t3PM = 0, t3PA = 0, tFTM = 0, tFTA = 0;
        let tORB = 0, tTOV = 0, tPTS = 0;
        // Pour PIE
        let tDRB = 0, tAST = 0, tSTL = 0, tBLK = 0, tPF = 0;

        Object.values(pStats).forEach(s => {
            tFGM += (s.fgm || 0) + (s.threePM || 0);
            tFGA += (s.fga || 0) + (s.threePA || 0);
            t3PM += (s.threePM || 0);
            t3PA += (s.threePA || 0);
            tFTM += (s.ftm || 0);
            tFTA += (s.fta || 0);
            tORB += (s.oreb || 0);
            tTOV += (s.tov || 0);
            tPTS += (s.pts || 0);
            tDRB += (s.dreb || 0);
            tAST += (s.ast || 0);
            tSTL += (s.stl || 0);
            tBLK += (s.blk || 0);
            tPF += (s.pf || 0);
        });

        // 2. Totaux Adversaire (pour PIE et Ratings)
        const oppPTS = oppScore;
        const oppFGM = opp.fgm || Math.round(oppPTS / 2.2);
        const oppFTM = opp.ftm || 0;
        const oppFGA = opp.fga || Math.round(oppPTS / 1.1);
        const oppFTA = opp.fta || 0;
        const oppDRB = opp.reb ? Math.round(opp.reb * 0.7) : 0;
        const oppORB = opp.oreb || 0;
        const oppAST = opp.ast || 0;
        const oppSTL = 0;
        const oppBLK = opp.blk || 0;
        const oppPF = opp.fouls || 0;
        const oppTOV = opp.tov || 0;

        // 3. Formules d'équipe
        // Possessions = FGA + 0.44 * FTA - ORB + TO
        const teamPoss = tFGA + 0.44 * tFTA - tORB + tTOV;
        const teamORtg = teamPoss > 0 ? (tPTS / teamPoss) * 100 : 0;
        const teamDRtg = teamPoss > 0 ? (oppPTS / teamPoss) * 100 : 0;
        const teamNetRtg = teamORtg - teamDRtg;

        // Dénominateur PIE du match (Team + Opp)
        const gamePIEDenom = (tPTS + oppPTS) + (tFGM + oppFGM) + (tFTM + oppFTM) 
                           - (tFGA + oppFGA) - (tFTA + oppFTA) + (tDRB + oppDRB) 
                           + (0.5 * (tORB + oppORB)) + (tAST + oppAST) + (tSTL + oppSTL) 
                           + (0.5 * (tBLK + oppBLK)) - (tPF + oppPF) - (tTOV + oppTOV);

        // 4. Enrichissement des stats joueurs
        const enrichedPlayers = Object.entries(pStats).map(([pid, s]) => {
            const player = players.find(p => p.id === parseInt(pid));
            const name = player ? player.name : `Joueur #${pid}`;
            
            // Basic
            const fga = (s.fga || 0) + (s.threePA || 0);
            const fgm = (s.fgm || 0) + (s.threePM || 0);
            const fta = s.fta || 0;
            const ftm = s.ftm || 0;
            const pts = s.pts || 0;

            // Advanced - MÊMES FORMULES QUE GLOBALSTATS
            // eFG% = (FGM + 0.5 * 3PM) / FGA
            const eFG = fga > 0 ? ((fgm + 0.5 * (s.threePM || 0)) / fga) * 100 : 0;
            // TS% = PTS / (2 * (FGA + 0.44 * FTA))
            const ts = (fga + 0.44 * fta) > 0 ? (pts / (2 * (fga + 0.44 * fta))) * 100 : 0;
            
            // PIE Player - MÊME FORMULE QUE GLOBALSTATS
            const playerPIENum = pts + fgm + ftm - fga - fta + (s.dreb || 0) + (0.5 * (s.oreb || 0)) 
                               + (s.ast || 0) + (s.stl || 0) + (0.5 * (s.blk || 0)) - (s.pf || 0) - (s.tov || 0);
            const pie = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;

            // ORtg et DRtg : basés sur les ratings équipe (comme dans GlobalStats)
            const playerORtg = teamORtg;
            const playerDRtg = teamDRtg;
            const playerNetRtg = playerORtg - playerDRtg;

            return {
                id: pid, name, ...s,
                fga, fgm,
                eFG: eFG.toFixed(1),
                TS: ts.toFixed(1),
                PIE: pie.toFixed(1),
                ORtg: playerORtg.toFixed(1),
                DRtg: playerDRtg.toFixed(1),
                netRtg: playerNetRtg.toFixed(1)
            };
        });

        return { 
            team: { poss: teamPoss.toFixed(1), ORtg: teamORtg.toFixed(1), DRtg: teamDRtg.toFixed(1), Net: teamNetRtg.toFixed(1) },
            oppStats: opp,
            players: enrichedPlayers
        };
    }, [game, players]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Détails: vs ${game.opponent}`} size="max-w-5xl">
            <div className="space-y-6">
                {/* Header Score & Team Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 bg-slate-900 p-4 rounded-lg flex justify-between items-center border border-slate-700 relative overflow-hidden">
                        <div className="text-center z-10">
                            <div className="text-xs text-slate-400 uppercase">Nous</div>
                            <div className="text-4xl font-bold text-green-400">{game.homeScore}</div>
                        </div>
                        <div className="flex flex-col items-center z-10">
                            <span className="text-xl font-bold text-white uppercase tracking-wider">{game.opponent}</span>
                            <span className="text-xs text-slate-500 mt-1">{game.date}</span>
                        </div>
                        <div className="text-center z-10">
                            <div className="text-xs text-slate-400 uppercase">Eux</div>
                            <div className="text-4xl font-bold text-red-400">{game.awayScore}</div>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-transparent to-red-500"></div>
                    </div>
                    
                    {/* Carte Stats Avancées Équipe */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 flex flex-col justify-center">
                        <div className="text-xs text-slate-400 uppercase mb-2 text-center border-b border-slate-700 pb-1">Performance Équipe</div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div className="flex justify-between"><span className="text-slate-400 text-xs">Poss:</span> <span className="text-white font-mono">{statsData.team.poss}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 text-xs">NetRtg:</span> <span className={`${parseFloat(statsData.team.Net) >= 0 ? 'text-green-400' : 'text-red-400'} font-bold text-xs`}>{statsData.team.Net}</span></div>
                            <div className="flex justify-between"><span className="text-purple-400 text-xs">ORtg:</span> <span className="text-white font-mono">{statsData.team.ORtg}</span></div>
                            <div className="flex justify-between"><span className="text-red-400 text-xs">DRtg:</span> <span className="text-white font-mono">{statsData.team.DRtg}</span></div>
                        </div>
                    </div>
                </div>

                {/* Contrôles & Tableau */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-orange-400 font-bold text-sm uppercase flex items-center gap-2">
                            <Icon path={Icons.Users} /> Stats Joueurs
                        </h4>
                        <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                            <button 
                                onClick={() => setViewMode('classic')}
                                className={`px-3 py-1 text-xs rounded transition-all ${viewMode === 'classic' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >Classique</button>
                            <button 
                                onClick={() => setViewMode('advanced')}
                                className={`px-3 py-1 text-xs rounded transition-all ${viewMode === 'advanced' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >Avancé</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700">
                        <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-800 text-white uppercase font-semibold">
                                <tr>
                                    <th className="p-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700">Joueur</th>
                                    <th className="p-3 text-center">MIN</th>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <th className="p-3 text-center text-orange-400">PTS</th>
                                            <th className="p-3 text-center">TIR</th>
                                            <th className="p-3 text-center">3P</th>
                                            <th className="p-3 text-center">LF</th>
                                            <th className="p-3 text-center">REB</th>
                                            <th className="p-3 text-center">AST</th>
                                            <th className="p-3 text-center">INT</th>
                                            <th className="p-3 text-center">CTR</th>
                                            <th className="p-3 text-center">BP</th>
                                            <th className="p-3 text-center">FTE</th>
                                            <th className="p-3 text-center">+/-</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-3 text-center text-blue-300">eFG%</th>
                                            <th className="p-3 text-center text-blue-300">TS%</th>
                                            <th className="p-3 text-center text-purple-400">ORtg</th>
                                            <th className="p-3 text-center text-red-400">DRtg</th>
                                            <th className="p-3 text-center text-yellow-400">Net</th>
                                            <th className="p-3 text-center text-cyan-400">PIE</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {statsData.players.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">{p.name}</td>
                                        <td className="p-3 text-center text-slate-400">{p.minutes}</td>
                                        {viewMode === 'classic' ? (
                                            <>
                                                <td className="p-3 text-center font-bold text-orange-400">{p.pts}</td>
                                                <td className="p-3 text-center">{p.fgm}-{p.fga}</td>
                                                <td className="p-3 text-center text-slate-400">{p.threePM}-{p.threePA}</td>
                                                <td className="p-3 text-center text-slate-400">{p.ftm}-{p.fta}</td>
                                                <td className="p-3 text-center font-bold">{p.reb} <span className="text-[10px] font-normal text-slate-500">({p.oreb}/{p.dreb})</span></td>
                                                <td className="p-3 text-center">{p.ast}</td>
                                                <td className="p-3 text-center">{p.stl}</td>
                                                <td className="p-3 text-center">{p.blk}</td>
                                                <td className="p-3 text-center text-red-400">{p.tov}</td>
                                                <td className="p-3 text-center text-red-400">{p.pf}</td>
                                                <td className={`p-3 text-center font-bold ${p.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.plusMinus > 0 ? '+' : ''}{p.plusMinus}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-3 text-center text-blue-300 font-mono">{p.eFG}%</td>
                                                <td className="p-3 text-center text-blue-300 font-mono">{p.TS}%</td>
                                                <td className="p-3 text-center text-purple-400 font-mono">{p.ORtg}</td>
                                                <td className="p-3 text-center text-red-400 font-mono">{p.DRtg}</td>
                                                <td className={`p-3 text-center font-bold font-mono ${parseFloat(p.netRtg) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.netRtg}</td>
                                                <td className="p-3 text-center text-cyan-400 font-bold font-mono">{p.PIE}%</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
// --- HISTORY ---
function History({ games, players, setGames, phases, onEditGame, onImportClick, onMultiImport }) {
    const [selectedGame, setSelectedGame] = useState(null);

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2 no-print">
                <Button variant="secondary" onClick={onMultiImport}><Icon path={Icons.Upload} /> Multi-Import</Button>
                <Button variant="primary" onClick={onImportClick}><Icon path={Icons.Upload} /> Importer</Button>
            </div>
            
            {games.length === 0 && <div className="text-center text-slate-500 py-10">Aucun match enregistré</div>}
            
            {games.map(g => (
                <Card key={g.id} className="p-0 overflow-hidden group hover:border-orange-500/50 transition-colors">
                    <div className="flex justify-between items-stretch">
                        {/* Zone Cliquable pour ouvrir les détails */}
                        <div 
                            className="flex-1 p-4 cursor-pointer group-hover:bg-slate-800/80 transition-colors"
                            onClick={() => setSelectedGame(g)}
                        >
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>{g.date}</span>
                                {g.phase && <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs">{phases.find(p => p.id === g.phase)?.name}</span>}
                            </div>
                            <div className="text-xl font-bold text-white mt-1">
                                <span className="text-green-400">{g.homeScore}</span> - <span className="text-red-400">{g.awayScore}</span> 
                                <span className="text-slate-300 ml-2 text-base font-normal">vs {g.opponent}</span>
                            </div>
                            <div className="text-xs text-orange-500/0 group-hover:text-orange-500 transition-all mt-2 flex items-center gap-1">
                                <Icon path={Icons.Eye} className="w-3 h-3"/> Voir stats complètes &rarr;
                            </div>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex flex-col justify-center gap-2 p-2 bg-slate-900/50 border-l border-slate-700">
                            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onEditGame(g); }}>
                                <Icon path={Icons.Edit} />
                            </Button>
                            <Button variant="danger" size="sm" onClick={(e) => { 
                                e.stopPropagation(); 
                                if (confirm("Supprimer ?")) { 
                                    const newG = games.filter(x => x.id !== g.id); 
                                    setGames(newG); 
                                    if (window.db) saveDataToCloud(window.db, "games", newG); 
                                } 
                            }}>
                                <Icon path={Icons.Trash} />
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}

            {/* Intégration de la Modale Détails */}
            <GameDetailsModal 
                game={selectedGame} 
                isOpen={!!selectedGame} 
                onClose={() => setSelectedGame(null)} 
                players={players} 
            />
        </div>
    );
}

// --- SETTINGS ---
function Settings({ players, onUpdatePlayers, phases, onUpdatePhases, firebaseConfig, setFirebaseConfig }) {
    const [localConfig, setLocalConfig] = useState(JSON.stringify(firebaseConfig, null, 2) || "");
    const [newPhaseName, setNewPhaseName] = useState("");

    return (
        <div className="space-y-6">
            <Card className="p-6 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-white mb-4"><Icon path={Icons.Layers} /> Phases</h3>
                <div className="space-y-3">
                    {phases.map((ph, i) => (
                        <div key={ph.id} className="flex items-center gap-3 bg-slate-900 p-3 rounded border border-slate-700">
                            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</div>
                            <input className="flex-1 bg-transparent text-white font-semibold outline-none" value={ph.name} onChange={(e) => { const np = [...phases]; np[i].name = e.target.value; onUpdatePhases(np); }} />
                            <button onClick={() => { if (phases.length > 1 && confirm("Supprimer ?")) onUpdatePhases(phases.filter(p => p.id !== ph.id)); }} className="text-red-500 p-2"><Icon path={Icons.Trash} /></button>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-4">
                        <input type="text" value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)} placeholder="Nouvelle phase..." className="flex-1 bg-slate-900 text-white px-4 py-2 rounded border border-slate-600" onKeyPress={(e) => { if (e.key === 'Enter' && newPhaseName.trim()) { onUpdatePhases([...phases, { id: `phase_${generateId()}`, name: newPhaseName.trim() }]); setNewPhaseName(""); } }} />
                        <Button variant="success" onClick={() => { if (newPhaseName.trim()) { onUpdatePhases([...phases, { id: `phase_${generateId()}`, name: newPhaseName.trim() }]); setNewPhaseName(""); } }}><Icon path={Icons.Plus} /></Button>
                    </div>
                </div>
            </Card>
            <Card className="p-6 border-l-4 border-purple-500">
                <h3 className="text-lg font-bold text-white mb-4"><Icon path={Icons.Cloud} /> Firebase</h3>
                <textarea className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono h-32 mb-2" value={localConfig} onChange={(e) => setLocalConfig(e.target.value)} />
                <Button onClick={() => { try { setFirebaseConfig(JSON.parse(localConfig)); alert("OK"); } catch (e) { alert("Erreur JSON"); } }} variant="secondary" size="sm">Sauvegarder</Button>
            </Card>
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Effectif</h2><Button onClick={() => onUpdatePlayers([...players, { id: Math.max(0, ...players.map(p => p.id)) + 1, name: "Nouveau", number: 0, pos: "G" }])} variant="success"><Icon path={Icons.Plus} /></Button></div>
            <div className="grid gap-3">
                {players.map((p, i) => (
                    <Card key={p.id} className="p-3 flex gap-3 items-center">
                        <input className="w-12 h-12 bg-slate-700 rounded-full text-center font-bold outline-none" value={p.number} onChange={(e) => { const np = [...players]; np[i].number = parseInt(e.target.value) || 0; onUpdatePlayers(np); }} />
                        <input className="flex-1 bg-transparent text-white font-bold outline-none" value={p.name} onChange={(e) => { const np = [...players]; np[i].name = e.target.value; onUpdatePlayers(np); }} />
                        <input className="w-16 bg-transparent text-slate-400 text-sm outline-none" value={p.pos} onChange={(e) => { const np = [...players]; np[i].pos = e.target.value; onUpdatePlayers(np); }} />
                        <button onClick={() => onUpdatePlayers(players.filter(x => x.id !== p.id))} className="text-red-500 p-2"><Icon path={Icons.Trash} /></button>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// --- MAIN APP ---
function App() {
    const [view, setView] = useState("live");
    const [players, setPlayers] = useState([]);
    const [games, setGames] = useState([]);
    const [phases, setPhases] = useState(DEFAULT_PHASES);
    const [activeGame, setActiveGame] = useState(null);
    const [firebaseConfig, setFirebaseConfig] = useState(null);
    const [db, setDb] = useState(null);
    const [importData, setImportData] = useState(null);
    const [multiImportQueue, setMultiImportQueue] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const isPlayerMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'player', []);

    useEffect(() => {
        const savedFbConfig = localStorage.getItem('basket_firebase_config');
        const savedPhases = localStorage.getItem('basket_phases');
        if (savedPhases) try { setPhases(JSON.parse(savedPhases)); } catch (e) { }
        if (PRECONFIGURED_FIREBASE.apiKey && !savedFbConfig) setFirebaseConfig(PRECONFIGURED_FIREBASE);
        else if (savedFbConfig) try { setFirebaseConfig(JSON.parse(savedFbConfig)); } catch (e) { }
        if (!savedFbConfig && !PRECONFIGURED_FIREBASE.apiKey) {
            setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers);
            setGames(JSON.parse(localStorage.getItem('basket_games')) || []);
            setIsDataLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (firebaseConfig && window.firebase) {
            try {
                if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
                const database = firebase.firestore();
                setDb(database); window.db = database;
                console.log("✅ Firebase connecté");
                database.collection("team_data").doc("roster").onSnapshot(doc => { if (doc.exists && doc.data().list) setPlayers(doc.data().list); else setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers); setIsDataLoaded(true); });
                database.collection("team_data").doc("games").onSnapshot(doc => { if (doc.exists && doc.data().list) setGames(doc.data().list); else setGames(JSON.parse(localStorage.getItem('basket_games')) || []); });
                database.collection("team_data").doc("phases").onSnapshot(doc => { if (doc.exists && doc.data().list) setPhases(doc.data().list); });
            } catch (e) { console.error("❌ Firebase:", e); setIsDataLoaded(true); }
        }
    }, [firebaseConfig]);

    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_players', JSON.stringify(players)); }, [players, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_games', JSON.stringify(games)); }, [games, isDataLoaded]);
    useEffect(() => { localStorage.setItem('basket_phases', JSON.stringify(phases)); }, [phases]);
    useEffect(() => { if (firebaseConfig) localStorage.setItem('basket_firebase_config', JSON.stringify(firebaseConfig)); }, [firebaseConfig]);

    const handleSaveGame = (gameState) => {
        const gameId = activeGame?.id || generateId();
        const newGame = { ...gameState, id: gameId, date: activeGame?.date || new Date().toLocaleDateString() };
        const newGamesList = games.some(g => g.id === gameId) ? games.map(g => g.id === gameId ? newGame : g) : [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) saveDataToCloud(window.db, "games", newGamesList);
        setActiveGame(null); setView('history');
    };

    const handleUpdatePhases = (newPhases) => { setPhases(newPhases); if (window.db && !isPlayerMode) saveDataToCloud(window.db, "phases", newPhases); };
    const handleFileImport = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setImportData(parseHTMLStats(ev.target.result)); reader.readAsText(file); e.target.value = null; };

    // Multi-import
    const handleMultiFileImport = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const queue = [];
        let processed = 0;
        files.forEach(file => {
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

    const confirmImport = (newGame, updatedPlayers) => {
        setPlayers(updatedPlayers);
        const newGamesList = [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) { saveDataToCloud(window.db, "roster", updatedPlayers); saveDataToCloud(window.db, "games", newGamesList); }
        setImportData(null); alert("Importé !"); setView('history');
    };

    const confirmMultiImport = (newGame, updatedPlayers) => {
        setPlayers(updatedPlayers);
        const newGamesList = [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) { saveDataToCloud(window.db, "roster", updatedPlayers); saveDataToCloud(window.db, "games", newGamesList); }
        setMultiImportQueue(prev => prev.slice(1));
        if (multiImportQueue.length <= 1) { alert("Tous les matchs importés !"); setView('history'); }
    };

    const handleSettingsUpdate = (newPlayers) => { setPlayers(newPlayers); if (window.db && !isPlayerMode) saveDataToCloud(window.db, "roster", newPlayers); };

    if (isPlayerMode) return <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col font-sans text-slate-200"><header className="h-16 bg-slate-900 flex items-center px-6"><h1 className="font-bold text-lg text-white">🏀 Stats</h1><span className="ml-auto text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Mode Joueur</span></header><div className="flex-1 p-4 overflow-y-auto"><GlobalStats players={players} games={games} phases={phases} /></div></div>;

    return (
        <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
            <input type="file" accept=".html" id="html-upload" onChange={handleFileImport} className="hidden" />
            <input type="file" accept=".html" id="multi-upload" onChange={handleMultiFileImport} multiple className="hidden" />
            {importData && <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-4">Import</h2><ImportReviewModal importData={importData} currentPlayers={players} phases={phases} onConfirm={confirmImport} onCancel={() => setImportData(null)} /></div></div>}
            {multiImportQueue.length > 0 && <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-2">Multi-Import ({multiImportQueue.length} restant{multiImportQueue.length > 1 ? 's' : ''})</h2><ImportReviewModal importData={multiImportQueue[0]} currentPlayers={players} phases={phases} onConfirm={confirmMultiImport} onCancel={() => setMultiImportQueue([])} /></div></div>}
            <nav className="bg-slate-900 border-r border-slate-800 w-full md:w-20 flex md:flex-col items-center justify-evenly md:justify-start md:pt-6 p-2 z-50 shrink-0">
                <div className="mb-0 md:mb-8 p-2 bg-orange-600 rounded-xl text-white font-black text-xl">BP</div>
                {[{ id: "live", icon: Icons.Play }, { id: "global_stats", icon: Icons.Chart }, { id: "history", icon: Icons.Clipboard }, { id: "settings", icon: Icons.Settings }].map(btn => (
                    <button key={btn.id} onClick={() => setView(btn.id)} className={`p-3 rounded-xl transition-all ${view === btn.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}><Icon path={btn.icon} /></button>
                ))}
            </nav>
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0">
                    <h1 className="font-bold text-lg text-white">{view === 'live' && "🔴 Live"}{view === 'global_stats' && "📊 Stats"}{view === 'history' && "📜 Historique"}{view === 'settings' && "⚙️ Paramètres"}</h1>
                    {window.db && <span className="ml-auto text-xs text-green-400"><Icon path={Icons.Cloud} /> Synchro</span>}
                </header>
                <div className="flex-1 p-4 overflow-y-auto">
                    {view === 'live' && <LiveTracker players={players} onSaveGame={handleSaveGame} initialGame={activeGame} phases={phases} selectedPhase={phases[0]?.id} />}
                    {view === 'global_stats' && <GlobalStats players={players} games={games} phases={phases} />}
                    {view === 'history' && <History games={games} players={players} setGames={setGames} phases={phases} onEditGame={(g) => { setActiveGame(g); setView('live'); }} onImportClick={() => document.getElementById('html-upload').click()} onMultiImport={() => document.getElementById('multi-upload').click()} />}
                    {view === 'settings' && <Settings players={players} onUpdatePlayers={handleSettingsUpdate} phases={phases} onUpdatePhases={handleUpdatePhases} firebaseConfig={firebaseConfig} setFirebaseConfig={setFirebaseConfig} />}
                </div>
            </main>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
