// ==========================================
// 🛠️ ZONE DE CONFIGURATION AUTOMATIQUE 🛠️
// ==========================================

const PRECONFIGURED_FIREBASE = {
    apiKey: "AIzaSyBaA99che1oz9BHc23IhiFoY-nK0xvg4q4",
    authDomain: "statu18elite.firebaseapp.com",
    projectId: "statu18elite",
    storageBucket: "statu18elite.firebasestorage.app",
    messagingSenderId: "862850988986",
    appId: "1:862850988986:web:47a2b48477015506f6fb83",
    measurementId: "G-Y4ZDKZQ7F9"
};

const PRECONFIGURED_GEMINI_KEY = "";

// ==========================================
// FIN DE LA ZONE DE CONFIGURATION
// ==========================================

const { useState, useEffect, useMemo, useRef } = React;
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } = window.Recharts || {
    BarChart: () => null, Bar: () => null, XAxis: () => null, YAxis: () => null,
    Tooltip: () => null, ResponsiveContainer: ({ children }) => <div>{children}</div>,
    LineChart: () => null, Line: () => null, CartesianGrid: () => null
};

// --- CONSTANTES ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const defaultPlayers = [
    { id: 1, name: "Joueur 1", number: 4, pos: "PG" },
    { id: 2, name: "Joueur 2", number: 5, pos: "SG" }
];
const DEFAULT_PHASES = [
    { id: "phase1", name: "Phase 1" },
    { id: "phase2", name: "Phase 2" }
];

// --- STATS LOGIC ---
const recalculateGameStats = (actions, players) => {
    const pStats = {};
    players.forEach(p => {
        pStats[p.id] = {
            pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0,
            fga: 0, fgm: 0, fta: 0, ftm: 0, pf: 0, pointsAllowed: 0, minutes: 0, plusMinus: 0,
            threePM: 0, threePA: 0, oppFga: 0, oppOreb: 0, oppTo: 0, oppFta: 0
        };
    });
    const oppStats = { pts: 0, reb: 0, ast: 0, tov: 0, fouls: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, oreb: 0 };
    let home = 0, away = 0;

    actions.forEach(act => {
        const { type, playerId, consequence, onCourt } = act;
        let ptsScored = 0, ptsConceded = 0;

        if (playerId === 'OPP') {
            if (type === 'FGM1') { oppStats.pts += 1; oppStats.ftm += 1; oppStats.fta += 1; away += 1; ptsConceded = 1; }
            if (type === 'FGA1') { oppStats.fta += 1; }
            if (type === 'FGM2') { oppStats.pts += 2; oppStats.fgm += 1; oppStats.fga += 1; away += 2; ptsConceded = 2; }
            if (type === 'FGA2') { oppStats.fga += 1; }
            if (type === 'FGM3') { oppStats.pts += 3; oppStats.fgm += 1; oppStats.fga += 1; away += 3; ptsConceded = 3; }
            if (type === 'FGA3') { oppStats.fga += 1; }
            if (type === 'OREB') { oppStats.reb += 1; oppStats.oreb += 1; }
            if (type === 'DREB') { oppStats.reb += 1; }
            if (type === 'AST') oppStats.ast += 1;
            if (type === 'TOV') oppStats.tov += 1;
            if (type === 'PF') oppStats.fouls += 1;

            if (consequence && consequence.includes('score')) {
                const val = parseInt(consequence.split('_')[1]);
                home += val; ptsScored = val;
            }

            if (onCourt && Array.isArray(onCourt)) {
                onCourt.forEach(pid => {
                    if (pStats[pid]) {
                        if (type.includes('FGA') || type.includes('FGM')) pStats[pid].oppFga++;
                        if (type === 'OREB') pStats[pid].oppOreb++;
                        if (type === 'TOV') pStats[pid].oppTo++;
                        if (type.includes('FGA1') || type.includes('FGM1')) pStats[pid].oppFta++;
                    }
                });
            }
        } else if (pStats[playerId]) {
            const ps = pStats[playerId];
            if (type === 'FGM1') { ps.pts += 1; ps.ftm += 1; ps.fta += 1; home += 1; ptsScored = 1; }
            if (type === 'FGA1') { ps.fta += 1; }
            if (type === 'FGM2') { ps.pts += 2; ps.fgm += 1; ps.fga += 1; home += 2; ptsScored = 2; }
            if (type === 'FGA2') { ps.fga += 1; }
            if (type === 'FGM3') { ps.pts += 3; ps.fgm += 1; ps.fga += 1; ps.threePM += 1; ps.threePA += 1; home += 3; ptsScored = 3; }
            if (type === 'FGA3') { ps.fga += 1; ps.threePA += 1; }
            if (type === 'OREB') { ps.reb += 1; ps.oreb += 1; }
            if (type === 'DREB') { ps.reb += 1; ps.dreb += 1; }
            if (type === 'AST') ps.ast += 1;
            if (type === 'STL') ps.stl += 1;
            if (type === 'BLK') ps.blk += 1;
            if (type === 'TOV') ps.tov += 1;
            if (type === 'PF') ps.pf += 1;
            if (consequence && consequence.includes('score')) {
                const val = parseInt(consequence.split('_')[1]);
                ps.pointsAllowed += val; away += val; ptsConceded = val;
            }
        }

        if (onCourt && Array.isArray(onCourt)) {
            onCourt.forEach(pid => {
                if (pStats[pid]) {
                    pStats[pid].plusMinus += ptsScored;
                    pStats[pid].plusMinus -= ptsConceded;
                }
            });
        }
    });
    return { playerStats: pStats, opponentStats: oppStats, homeScore: home, awayScore: away };
};

const saveDataToCloud = (db, collection, data) => {
    if (!db) {
        console.warn("saveDataToCloud: db non défini");
        return;
    }
    console.log(`Sauvegarde ${collection} vers Firebase...`, data);
    db.collection("team_data").doc(collection).set({ list: data })
        .then(() => console.log(`✅ ${collection} sauvegardé dans Firebase`))
        .catch(e => console.error(`❌ Erreur sauvegarde ${collection}:`, e));
};

// --- ICONS ---
const Icon = ({ path, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d={path} />
    </svg>
);

const Icons = {
    Activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    Clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z",
    Settings: "M12.22 2h-.44a2 2 0 0 1-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    Play: "M5 3l14 9-14 9V3z",
    Trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    Save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8V3",
    Chart: "M18 20V10 M12 20V4 M6 20v-6",
    Undo: "M3 7v6h6 M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",
    Plus: "M12 5v14M5 12h14",
    Eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z",
    Check: "M20 6L9 17l-5-5",
    Edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    Pause: "M10 9v6 M14 9v6",
    Upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    Link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    Cloud: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
    Printer: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
    Info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    Filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
    Layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }) => (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden ${className}`}>
        {children}
    </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", size = "md", disabled = false, as = "button", ...props }) => {
    const base = "font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer no-print";
    const variants = {
        primary: "bg-coach-accent hover:bg-orange-600 text-white shadow-md",
        secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
        danger: "bg-red-600 hover:bg-red-700 text-white",
        success: "bg-green-600 hover:bg-green-700 text-white",
        ghost: "bg-transparent hover:bg-slate-700 text-slate-400"
    };
    const sizes = { sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-lg" };

    if (as === "label") {
        return <label onClick={onClick} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</label>;
    }
    return (
        <button onClick={onClick} disabled={disabled}
            className={`${base} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} {...props}>
            {children}
        </button>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
            <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-6xl shadow-2xl transform transition-all max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
};

// --- LIVE TRACKER ---
function LiveTracker({ players, onSaveGame, initialGame, phases, selectedPhase }) {
    const [gameState, setGameState] = useState({
        quarter: 1,
        opponent: "Adversaire",
        location: "Domicile",
        actions: [],
        phase: selectedPhase
    });
    const [gameTime, setGameTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [onCourt, setOnCourt] = useState([]);
    const [accumulatedMinutes, setAccumulatedMinutes] = useState({});
    const [derived, setDerived] = useState(recalculateGameStats([], players));
    const [modal, setModal] = useState({ type: null, data: null });
    const [showStats, setShowStats] = useState(false);

    useEffect(() => {
        if (initialGame) setGameState(prev => ({ ...prev, ...initialGame }));
    }, [initialGame]);

    useEffect(() => {
        setDerived(recalculateGameStats(gameState.actions, players));
    }, [gameState.actions, players]);

    useEffect(() => {
        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setGameTime(p => p + 1);
                setAccumulatedMinutes(prev => {
                    const next = { ...prev };
                    onCourt.forEach(id => next[id] = (next[id] || 0) + 1);
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, onCourt]);

    const registerAction = (actionType, player, extraData = {}) => {
        const newAction = {
            id: generateId(),
            type: actionType,
            playerId: player === 'opponent' ? 'OPP' : player.id,
            playerName: player === 'opponent' ? 'Adversaire' : player.name,
            q: gameState.quarter,
            consequence: extraData.consequence,
            timestamp: new Date().toLocaleTimeString(),
            onCourt: [...onCourt]
        };
        setGameState(prev => ({ ...prev, actions: [...prev.actions, newAction] }));
        setModal({ type: null, data: null });
    };

    const finalizeGame = () => {
        const finalStats = { ...derived.playerStats };
        Object.keys(accumulatedMinutes).forEach(pid => {
            if (finalStats[pid]) finalStats[pid].minutes += Math.round(accumulatedMinutes[pid] / 60);
        });
        onSaveGame({ ...gameState, ...derived, playerStats: finalStats });
    };

    return (
        <div className="flex flex-col h-full gap-4 relative">
            {/* Header Timer */}
            <div className="bg-slate-800 p-2 flex justify-between items-center rounded-lg border border-slate-700">
                <div className="flex items-center gap-4">
                    <Button size="sm" className={isTimerRunning ? "bg-red-500" : "bg-green-500"}
                        onClick={() => setIsTimerRunning(!isTimerRunning)}>
                        <Icon path={isTimerRunning ? Icons.Pause : Icons.Play} />
                        {isTimerRunning ? "Stop" : "Start"}
                    </Button>
                    <div className="font-mono text-xl text-white font-bold">
                        {Math.floor(gameTime / 60).toString().padStart(2, '0')}:{(gameTime % 60).toString().padStart(2, '0')}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <select value={gameState.phase} onChange={(e) => setGameState(p => ({ ...p, phase: e.target.value }))}
                        className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600">
                        {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                    </select>
                    <span className="text-xs text-slate-400">
                        Sur terrain: <span className={onCourt.length === 5 ? "text-green-400" : "text-orange-400"}>{onCourt.length}/5</span>
                    </span>
                </div>
            </div>

            {/* Scoreboard */}
            <Card className="bg-slate-900 p-4 flex justify-between items-center sticky top-0 z-10 border-b-4 border-coach-accent">
                <div className="text-4xl font-bold text-white">{derived.homeScore}</div>
                <div className="flex flex-col items-center">
                    <div className="text-xl font-bold text-orange-500">Q{gameState.quarter}</div>
                    <div className="flex gap-2 mt-1">
                        <button onClick={() => setGameState(p => ({ ...p, quarter: Math.max(1, p.quarter - 1) }))}
                            className="text-xs text-slate-500 hover:text-white">-</button>
                        <button onClick={() => setGameState(p => ({ ...p, quarter: p.quarter + 1 }))}
                            className="text-xs text-slate-500 hover:text-white">+</button>
                    </div>
                </div>
                <div className="text-4xl font-bold text-red-500">{derived.awayScore}</div>
            </Card>

            {/* Players Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-3 pb-20">
                {players.map(player => {
                    const pStats = derived.playerStats[player.id] || { pts: 0, pf: 0, plusMinus: 0 };
                    const isOnCourt = onCourt.includes(player.id);
                    return (
                        <div key={player.id}
                            className={`relative p-3 rounded-xl border shadow-md transition-all ${isOnCourt ? 'bg-slate-800 border-orange-500 ring-1 ring-orange-500/50' : 'bg-slate-800/60 border-slate-700 opacity-80'}`}>
                            <div className="absolute top-2 right-2 z-20">
                                <input type="checkbox" checked={isOnCourt}
                                    onChange={() => {
                                        if (onCourt.includes(player.id)) setOnCourt(p => p.filter(x => x !== player.id));
                                        else if (onCourt.length < 5) setOnCourt(p => [...p, player.id]);
                                    }}
                                    className="w-5 h-5 accent-orange-500 cursor-pointer" />
                            </div>
                            <div onClick={() => setModal({ type: "ACTION_MENU", data: player })} className="cursor-pointer">
                                <div className="flex justify-between pr-6">
                                    <span className={`font-bold truncate ${isOnCourt ? 'text-white' : 'text-slate-400'}`}>{player.name}</span>
                                    <span className="text-xs text-slate-500">#{player.number}</span>
                                </div>
                                <div className="text-xs mt-2 flex justify-between items-end">
                                    <div className="space-x-2 text-slate-300">
                                        <span>Pts: <b className="text-white">{pStats.pts}</b></span>
                                        <span>+/-: <b className={pStats.plusMinus >= 0 ? "text-green-400" : "text-red-400"}>
                                            {pStats.plusMinus > 0 ? '+' : ''}{pStats.plusMinus}
                                        </b></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {/* Opponent Card */}
                <div onClick={() => setModal({ type: "ACTION_MENU", data: "opponent" })}
                    className="bg-red-900/40 p-3 rounded-xl border border-red-700 shadow-md hover:border-red-500 cursor-pointer flex flex-col items-center justify-center text-center">
                    <span className="font-bold text-red-200">{gameState.opponent.toUpperCase()}</span>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 p-4 border-t border-slate-800 flex justify-end z-20 gap-2">
                <Button variant="secondary" onClick={() => setShowStats(true)}><Icon path={Icons.Eye} /> Stats</Button>
                <Button variant="success" onClick={finalizeGame}><Icon path={Icons.Check} /> Finir</Button>
            </div>

            {/* Action Menu Modal */}
            <Modal isOpen={modal.type === "ACTION_MENU"} onClose={() => setModal({ type: null })} title={modal.data?.name || "Adversaire"}>
                <div className="grid grid-cols-3 gap-3">
                    <Button className="bg-green-600 h-12" onClick={() => registerAction("FGM2", modal.data)}>+2 Pts</Button>
                    <Button className="bg-green-600 h-12" onClick={() => registerAction("FGM3", modal.data)}>+3 Pts</Button>
                    <Button className="bg-green-600 h-12" onClick={() => registerAction("FGM1", modal.data)}>+1 LF</Button>
                    <Button className="bg-red-500 h-10" onClick={() => registerAction("FGA2", modal.data)}>Miss 2</Button>
                    <Button className="bg-red-500 h-10" onClick={() => registerAction("FGA3", modal.data)}>Miss 3</Button>
                    <Button className="bg-red-500 h-10" onClick={() => registerAction("FGA1", modal.data)}>Miss LF</Button>
                    <div className="col-span-3 h-px bg-slate-600 my-1"></div>
                    <Button className="bg-blue-600" onClick={() => registerAction("DREB", modal.data)}>Reb D</Button>
                    <Button className="bg-blue-500" onClick={() => registerAction("OREB", modal.data)}>Reb O</Button>
                    <Button className="bg-purple-600" onClick={() => registerAction("AST", modal.data)}>Passe</Button>
                    <Button className="bg-yellow-600" onClick={() => modal.data !== 'opponent' ? setModal({ type: "CONSEQ_STL", data: modal.data }) : registerAction("STL", "opponent")}>Int</Button>
                    <Button className="bg-orange-600" onClick={() => modal.data !== 'opponent' ? setModal({ type: "CONSEQ_TOV", data: modal.data }) : registerAction("TOV", "opponent")}>Balle P.</Button>
                    <Button className="bg-slate-600" onClick={() => registerAction("BLK", modal.data)}>Contre</Button>
                    <Button variant="danger" className="col-span-3 mt-2" onClick={() => registerAction("PF", modal.data)}>Faute Perso</Button>
                </div>
            </Modal>

            {/* Turnover Consequence Modal */}
            <Modal isOpen={modal.type === "CONSEQ_TOV"} onClose={() => setModal({ type: null })} title="Conséquence Balle Perdue ?">
                <div className="flex flex-col gap-2">
                    <Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_2" })} className="bg-red-600/80">Adversaire +2 Pts</Button>
                    <Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_3" })} className="bg-red-600">Adversaire +3 Pts</Button>
                    <Button onClick={() => registerAction("TOV", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button>
                </div>
            </Modal>

            {/* Steal Consequence Modal */}
            <Modal isOpen={modal.type === "CONSEQ_STL"} onClose={() => setModal({ type: null })} title="Suite à l'Interception ?">
                <div className="flex flex-col gap-2">
                    <Button onClick={() => registerAction("STL", modal.data, { consequence: "score_2" })} className="bg-green-600/80">Nous Marquons +2</Button>
                    <Button onClick={() => registerAction("STL", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button>
                </div>
            </Modal>

            {/* Live Stats Modal */}
            <Modal isOpen={showStats} onClose={() => setShowStats(false)} title="Statistiques en Direct">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-700 text-white uppercase">
                            <tr><th className="p-2">J</th><th className="p-2">Pts</th><th className="p-2">+/-</th><th className="p-2">Fte</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {players.map(p => {
                                const s = derived.playerStats[p.id] || {};
                                return (
                                    <tr key={p.id}>
                                        <td className="p-2 font-bold">{p.name}</td>
                                        <td className="p-2">{s.pts}</td>
                                        <td className={`p-2 font-bold ${s.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.plusMinus}</td>
                                        <td className="p-2 text-red-400">{s.pf}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
}

// --- GLOBAL STATS ---
function GlobalStats({ players, games, phases }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [viewMode, setViewMode] = useState('classic');
    const [showLogs, setShowLogs] = useState(false);
    const [phaseFilter, setPhaseFilter] = useState('all');

    const filteredGames = useMemo(() => {
        if (phaseFilter === 'all') return games;
        return games.filter(g => g.phase === phaseFilter);
    }, [games, phaseFilter]);

    const aggregated = useMemo(() => {
        const stats = {};
        players.forEach(p => {
            stats[p.id] = {
                info: p, gamesPlayed: 0,
                total: {
                    pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, eff: 0,
                    fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, pf: 0, plusMinus: 0,
                    oppFga: 0, oppOreb: 0, oppTo: 0, oppFta: 0, pointsAllowed: 0
                },
                logs: [], calcLogs: []
            };
        });

        filteredGames.forEach(g => {
            Object.entries(g.playerStats).forEach(([pid, s]) => {
                const id = parseInt(pid);
                if ((s.minutes || 0) > 0 && stats[id]) {
                    const t = stats[id].total;
                    stats[id].gamesPlayed += 1;
                    t.pts += (s.pts || 0); t.reb += (s.reb || 0); t.ast += (s.ast || 0);
                    t.stl += (s.stl || 0); t.blk += (s.blk || 0); t.tov += (s.tov || 0); t.min += (s.minutes || 0);
                    t.fgm += (s.fgm || 0); t.fga += (s.fga || 0); t.threePM += (s.threePM || 0);
                    t.threePA += (s.threePA || 0); t.ftm += (s.ftm || 0); t.fta += (s.fta || 0);
                    t.pf += (s.pf || 0); t.plusMinus += (s.plusMinus || 0);

                    const teamOppFga = g.opponentStats?.fga || 0;
                    const teamOppOreb = g.opponentStats?.oreb || 0;
                    const teamOppTo = g.opponentStats?.tov || 0;
                    const teamOppFta = g.opponentStats?.fta || 0;
                    const teamOppPts = g.awayScore;

                    t.oppFga += (s.oppFga || (teamOppFga * (s.minutes / 200)));
                    t.oppOreb += (s.oppOreb || (teamOppOreb * (s.minutes / 200)));
                    t.oppTo += (s.oppTo || (teamOppTo * (s.minutes / 200)));
                    t.oppFta += (s.oppFta || (teamOppFta * (s.minutes / 200)));
                    t.pointsAllowed += (s.pointsAllowed || (teamOppPts * (s.minutes / 200)));

                    const missedFG = (s.fga || 0) - (s.fgm || 0);
                    const missedFT = (s.fta || 0) - (s.ftm || 0);
                    const evalStat = (s.pts + s.reb + s.ast + s.stl + s.blk) - (missedFG + missedFT + s.tov);
                    t.eff += evalStat;

                    stats[id].logs.push({
                        gameId: g.id, date: g.date, opponent: g.opponent, phase: g.phase,
                        result: g.homeScore > g.awayScore ? 'W' : 'L',
                        score: `${g.homeScore}-${g.awayScore}`,
                        stats: { ...s, eff: evalStat }
                    });
                }
            });
        });

        return Object.values(stats).map(p => {
            p.logs.sort((a, b) => new Date(a.date) - new Date(b.date));
            const gp = p.gamesPlayed || 1;
            const t = p.total;
            const fgPct = t.fga > 0 ? ((t.fgm / t.fga) * 100).toFixed(1) : "0.0";
            const threePct = t.threePA > 0 ? ((t.threePM / t.threePA) * 100).toFixed(1) : "0.0";
            const ftPct = t.fta > 0 ? ((t.ftm / t.fta) * 100).toFixed(1) : "0.0";
            const eFG = (t.fga + t.threePA) > 0 ? (((t.fgm + 0.5 * t.threePM) / (t.fga + t.threePA)) * 100).toFixed(1) : "0.0";
            const ts = ((t.fga + t.threePA) + 0.44 * t.fta) > 0 ? ((t.pts / (2 * ((t.fga + t.threePA) + 0.44 * t.fta))) * 100).toFixed(1) : "0.0";
            const possUsed = (t.fga + t.threePA) - (t.reb * 0.3) + t.tov + (0.44 * t.fta);
            const ortg = possUsed > 0 ? ((t.pts / possUsed) * 100).toFixed(1) : "0.0";
            const oppPoss = t.oppFga - t.oppOreb + t.oppTo + (0.44 * t.oppFta);
            const drtg = oppPoss > 0 ? ((t.pointsAllowed / oppPoss) * 100).toFixed(1) : "0.0";
            const netRtg = (parseFloat(ortg) - parseFloat(drtg)).toFixed(1);

            p.calcLogs = [
                `eFG% = ((${t.fgm} + 0.5 * ${t.threePM}) / (${t.fga}+${t.threePA})) * 100 = ${eFG}%`,
                `TS% = (${t.pts} / (2 * ((${t.fga}+${t.threePA}) + 0.44 * ${t.fta.toFixed(0)}))) * 100 = ${ts}%`,
                `ORtg = (${t.pts} / ${possUsed.toFixed(1)}) * 100 = ${ortg}`,
                `DRtg = (${t.pointsAllowed.toFixed(0)} / ${oppPoss.toFixed(1)}) * 100 = ${drtg}`
            ];

            return {
                ...p,
                avg: {
                    min: (t.min / gp).toFixed(1), pts: (t.pts / gp).toFixed(1),
                    fgm: t.fgm, fga: t.fga, fgPct,
                    threePM: t.threePM, threePA: t.threePA, threePct,
                    ftm: t.ftm, fta: t.fta, ftPct,
                    reb: (t.reb / gp).toFixed(1), ast: (t.ast / gp).toFixed(1),
                    stl: (t.stl / gp).toFixed(1), blk: (t.blk / gp).toFixed(1),
                    tov: (t.tov / gp).toFixed(1), pf: (t.pf / gp).toFixed(1),
                    plusMinus: (t.plusMinus / gp).toFixed(1), eff: (t.eff / gp).toFixed(1),
                    eFG, TS: ts, ORtg: ortg, DRtg: drtg, netRtg
                }
            };
        }).filter(p => p.gamesPlayed > 0);
    }, [players, filteredGames]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <Card className="p-4 flex-1 overflow-hidden flex flex-col card-stats">
                {/* Header Controls */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4 no-print">
                    <div className="flex gap-2">
                        <Button size="sm" variant={viewMode === 'classic' ? 'primary' : 'secondary'} onClick={() => setViewMode('classic')}>📊 Classique</Button>
                        <Button size="sm" variant={viewMode === 'advanced' ? 'primary' : 'secondary'} onClick={() => setViewMode('advanced')}>🧠 Avancé</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Icon path={Icons.Filter} className="text-slate-400" />
                        <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}
                            className="bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600">
                            <option value="all">Toutes les phases</option>
                            {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                        </select>
                    </div>
                    <Button variant="secondary" onClick={() => window.print()}><Icon path={Icons.Printer} /> Imprimer</Button>
                </div>

                <div className="text-xs text-slate-400 mb-2">
                    {filteredGames.length} match(s) • {phaseFilter === 'all' ? 'Toutes phases' : phases.find(p => p.id === phaseFilter)?.name}
                </div>

                {/* Stats Table */}
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                        <thead className="bg-slate-900 text-white uppercase text-xs sticky top-0 z-10 sticky-header">
                            <tr>
                                <th className="p-3 sticky-col">Joueur</th>
                                <th className="p-3">MJ</th>
                                <th className="p-3">MIN</th>
                                {viewMode === 'classic' ? (
                                    <>
                                        <th className="p-3 text-orange-400">PTS</th>
                                        <th className="p-3">TIR</th><th className="p-3">%TIR</th>
                                        <th className="p-3">3PTS</th><th className="p-3">3PTS%</th>
                                        <th className="p-3">LF</th><th className="p-3">LF%</th>
                                        <th className="p-3">REB</th><th className="p-3">PD</th>
                                        <th className="p-3">INT</th><th className="p-3">CTR</th>
                                        <th className="p-3">BP</th><th className="p-3">FTE</th>
                                        <th className="p-3">+/-</th>
                                        <th className="p-3 text-green-400">ÉVAL</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-3 text-blue-300">eFG%</th>
                                        <th className="p-3 text-blue-300">TS%</th>
                                        <th className="p-3 text-purple-400">OFF RTG</th>
                                        <th className="p-3 text-red-400">DEF RTG</th>
                                        <th className="p-3 text-yellow-400">NET RTG</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {aggregated.map(p => (
                                <tr key={p.info.id} onClick={() => { setSelectedPlayer(p); setShowLogs(false); }}
                                    className="hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <td className="p-3 font-bold text-white sticky left-0 bg-slate-800 sticky-col">{p.info.name}</td>
                                    <td className="p-3">{p.gamesPlayed}</td>
                                    <td className="p-3">{p.avg.min}</td>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <td className="p-3 font-bold text-orange-400">{p.avg.pts}</td>
                                            <td className="p-3">{p.avg.fgm}-{p.avg.fga}</td>
                                            <td className="p-3">{p.avg.fgPct}%</td>
                                            <td className="p-3">{p.avg.threePM}-{p.avg.threePA}</td>
                                            <td className="p-3">{p.avg.threePct}%</td>
                                            <td className="p-3">{p.avg.ftm}-{p.avg.fta}</td>
                                            <td className="p-3">{p.avg.ftPct}%</td>
                                            <td className="p-3">{p.avg.reb}</td>
                                            <td className="p-3">{p.avg.ast}</td>
                                            <td className="p-3">{p.avg.stl}</td>
                                            <td className="p-3">{p.avg.blk}</td>
                                            <td className="p-3">{p.avg.tov}</td>
                                            <td className="p-3">{p.avg.pf}</td>
                                            <td className="p-3">{p.avg.plusMinus}</td>
                                            <td className="p-3 font-bold text-green-400">{p.avg.eff}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-3 text-blue-300">{p.avg.eFG}%</td>
                                            <td className="p-3 text-blue-300">{p.avg.TS}%</td>
                                            <td className="p-3 text-purple-400">{p.avg.ORtg}</td>
                                            <td className="p-3 text-red-400">{p.avg.DRtg}</td>
                                            <td className="p-3 font-bold text-yellow-400">{p.avg.netRtg}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Player Detail Modal */}
            <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={selectedPlayer?.info.name || ""}>
                {selectedPlayer && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-2 bg-slate-900 p-4 rounded-lg">
                            <div className="text-center"><div className="text-xs text-slate-500 uppercase">Points</div><div className="text-2xl font-bold text-white">{selectedPlayer.avg.pts}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500 uppercase">Rebonds</div><div className="text-2xl font-bold text-white">{selectedPlayer.avg.reb}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500 uppercase">Passes</div><div className="text-2xl font-bold text-white">{selectedPlayer.avg.ast}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500 uppercase">Éval</div><div className="text-2xl font-bold text-green-400">{selectedPlayer.avg.eff}</div></div>
                        </div>

                        <div className="flex justify-end">
                            <Button size="sm" variant="secondary" onClick={() => setShowLogs(!showLogs)}>
                                <Icon path={Icons.Info} /> {showLogs ? "Masquer Calculs" : "Voir les Calculs"}
                            </Button>
                        </div>

                        {showLogs && (
                            <div className="bg-slate-900 p-4 rounded border border-slate-700 text-xs font-mono text-slate-300">
                                <h4 className="text-orange-400 font-bold mb-2">Journal de Calculs</h4>
                                <ul className="space-y-1">
                                    {selectedPlayer.calcLogs.map((log, i) => <li key={i}>• {log}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="h-48 w-full">
                            <h4 className="text-xs text-slate-400 mb-2 uppercase">Évolution Points</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={selectedPlayer.logs}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} />
                                    <YAxis stroke="#94a3b8" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                    <Line type="monotone" dataKey="stats.pts" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div>
                            <h4 className="text-xs text-slate-400 mb-2 uppercase">Historique</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-700 text-white">
                                        <tr><th className="p-2">Date</th><th className="p-2">Phase</th><th className="p-2">Adv</th><th className="p-2">MIN</th><th className="p-2">PTS</th><th className="p-2">ÉVAL</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {selectedPlayer.logs.map((log, i) => (
                                            <tr key={i}>
                                                <td className="p-2">{log.date}</td>
                                                <td className="p-2 text-orange-400">{phases.find(p => p.id === log.phase)?.name || '-'}</td>
                                                <td className="p-2 font-bold">{log.opponent}</td>
                                                <td className="p-2">{log.stats.minutes}</td>
                                                <td className="p-2 font-bold text-white">{log.stats.pts}</td>
                                                <td className="p-2">{log.stats.eff}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
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
            if (choice === "NEW") {
                maxId++;
                pid = maxId;
                newPlayersList.push({ id: pid, name: imp.name, number: imp.number, pos: "G" });
            } else if (choice === "SKIP") {
                return;
            } else {
                pid = parseInt(choice);
            }
            finalGameStats[pid] = imp.stats;
        });

        onConfirm({
            id: generateId(),
            ...importData.meta,
            phase: selectedPhase,
            playerStats: finalGameStats,
            opponentStats: importData.opponentStats,
            actions: []
        }, newPlayersList);
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h4 className="text-orange-500 font-bold mb-2">Match: {importData.meta.opponent}</h4>
                <div className="text-white text-sm mb-4">Score: {importData.meta.homeScore} - {importData.meta.awayScore}</div>

                {/* Phase Selection */}
                <div className="bg-slate-800 p-3 rounded border border-orange-500/50">
                    <label className="block text-sm font-semibold text-orange-400 mb-2">
                        <Icon path={Icons.Layers} className="inline mr-2" />Phase du championnat
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {phases.map(ph => (
                            <label key={ph.id}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${selectedPhase === ph.id ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                <input type="radio" name="phase" value={ph.id} checked={selectedPhase === ph.id}
                                    onChange={(e) => setSelectedPhase(e.target.value)} className="hidden" />
                                <span>{ph.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Player Mapping */}
            <div className="overflow-y-auto max-h-[40vh] space-y-2">
                {importData.rawPlayers.map((imp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                        <div className="w-1/3">
                            <div className="text-white font-bold text-sm">#{imp.number} {imp.name}</div>
                            <div className="text-xs text-slate-400">{imp.stats.pts} pts, {imp.stats.minutes} min</div>
                        </div>
                        <div className="text-slate-500"><Icon path={Icons.Link} /></div>
                        <div className="flex-1">
                            <select className="w-full bg-slate-900 text-white text-sm p-2 rounded border border-slate-600"
                                value={mapping[idx] || "NEW"} onChange={(e) => setMapping({ ...mapping, [idx]: e.target.value })}>
                                <option value="NEW" className="text-green-400 font-bold">+ Créer Nouveau</option>
                                <option value="SKIP" className="text-red-400">Ne pas importer</option>
                                <optgroup label="Effectif Actuel">
                                    {currentPlayers.map(p => (
                                        <option key={p.id} value={p.id}>#{p.number} - {p.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <Button variant="ghost" onClick={onCancel}>Annuler</Button>
                <Button variant="success" onClick={handleFinalize}>Confirmer l'Import</Button>
            </div>
        </div>
    );
}

// --- HTML PARSER ---
const parseHTMLStats = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const date = doc.querySelector('#game-date span.detail')?.textContent || new Date().toLocaleDateString();
    let homeName = doc.querySelector('#team-names-container .left span.detail')?.textContent || "Nous";
    let awayName = doc.querySelector('#team-names-container .right span.detail')?.textContent || "Adversaire";
    let homeScore = parseInt(doc.querySelector('#team-score-left .title')?.textContent || "0");
    let awayScore = parseInt(doc.querySelector('#team-score-right .title')?.textContent || "0");
    let opponentName = awayName, myScore = homeScore, oppScore = awayScore;

    if (homeName.toLowerCase().includes("champagne") || homeName.toLowerCase().includes("basket")) {
        opponentName = awayName; myScore = homeScore; oppScore = awayScore;
    } else if (awayName.toLowerCase().includes("champagne") || awayName.toLowerCase().includes("basket")) {
        opponentName = homeName; myScore = awayScore; oppScore = homeScore;
    }

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

            if (nameCell.includes(opponentName)) {
                opponentStats = {
                    pts: parseInt(cells[16].textContent) || 0,
                    reb: (parseInt(cells[7].textContent) || 0) + (parseInt(cells[8].textContent) || 0),
                    ast: parseInt(cells[13].textContent) || 0,
                    tov: parseInt(cells[11].textContent) || 0,
                    fouls: parseInt(cells[9].textContent) || 0,
                    oreb: parseInt(cells[7].textContent) || 0,
                    fga: 0, fta: 0
                };
                const fg = cells[1].textContent.split('-');
                if (fg.length === 2) opponentStats.fga = parseInt(fg[1]) || 0;
                const ft = cells[5].textContent.split('-');
                if (ft.length === 2) opponentStats.fta = parseInt(ft[1]) || 0;
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

            const twoPM = fg.made - tp.made;
            const twoPA = fg.att - tp.att;

            const stats = {
                fgm: twoPM, fga: twoPA, ftm: ft.made, fta: ft.att,
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
                threePM: tp.made, threePA: tp.att
            };
            rawPlayers.push({ name, number, stats });
        });
    }
    return { meta: { date, opponent: opponentName, homeScore: myScore, awayScore: oppScore, location: "Importé" }, rawPlayers, opponentStats };
};

// --- HISTORY ---
function History({ games, players, setGames, phases, onEditGame, onImportClick }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-end no-print">
                <Button variant="primary" className="cursor-pointer" onClick={onImportClick}>
                    <Icon path={Icons.Upload} /> Importer HTML
                </Button>
            </div>
            {games.map(g => (
                <Card key={g.id} className="p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>{g.date} - {g.location}</span>
                                {g.phase && (
                                    <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs">
                                        {phases.find(p => p.id === g.phase)?.name || g.phase}
                                    </span>
                                )}
                            </div>
                            <div className="text-xl font-bold text-white">
                                <span className="text-green-400">{g.homeScore}</span> - <span className="text-red-400">{g.awayScore}</span> vs {g.opponent}
                            </div>
                        </div>
                        <div className="flex gap-2 no-print">
                            <Button variant="secondary" size="sm" onClick={() => onEditGame(g)}><Icon path={Icons.Edit} /> Modifier</Button>
                            <Button variant="danger" size="sm" onClick={() => {
                                if (confirm("Supprimer ?")) {
                                    const newG = games.filter(x => x.id !== g.id);
                                    setGames(newG);
                                    if (window.isCloudEnabled && window.db) saveDataToCloud(window.db, "games", newG);
                                }
                            }}><Icon path={Icons.Trash} /></Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

// --- SETTINGS ---
function Settings({ players, onUpdatePlayers, phases, onUpdatePhases, apiKey, setApiKey, firebaseConfig, setFirebaseConfig }) {
    const [localConfig, setLocalConfig] = useState(JSON.stringify(firebaseConfig, null, 2) || "");
    const [newPhaseName, setNewPhaseName] = useState("");

    const handleSaveConfig = () => {
        try {
            let parsed = JSON.parse(localConfig.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"'));
            setFirebaseConfig(parsed);
            alert("Configuration sauvegardée !");
        } catch (e) {
            alert("Erreur JSON");
        }
    };

    const addPlayer = () => {
        onUpdatePlayers([...players, {
            id: players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1,
            name: "Nouveau",
            number: 0,
            pos: "G"
        }]);
    };

    const addPhase = () => {
        if (!newPhaseName.trim()) return;
        const newId = `phase_${generateId()}`;
        onUpdatePhases([...phases, { id: newId, name: newPhaseName.trim() }]);
        setNewPhaseName("");
    };

    const removePhase = (phaseId) => {
        if (phases.length <= 1) {
            alert("Vous devez garder au moins une phase");
            return;
        }
        if (confirm("Supprimer cette phase ?")) {
            onUpdatePhases(phases.filter(p => p.id !== phaseId));
        }
    };

    return (
        <div className="space-y-6">
            {/* Phases Management */}
            <Card className="p-6 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Icon path={Icons.Layers} /> Phases du Championnat
                </h3>
                <div className="space-y-3">
                    {phases.map((ph, i) => (
                        <div key={ph.id} className="flex items-center gap-3 bg-slate-900 p-3 rounded border border-slate-700">
                            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</div>
                            <input className="flex-1 bg-transparent text-white font-semibold outline-none"
                                value={ph.name}
                                onChange={(e) => {
                                    const newPhases = [...phases];
                                    newPhases[i].name = e.target.value;
                                    onUpdatePhases(newPhases);
                                }} />
                            <button onClick={() => removePhase(ph.id)} className="text-red-500 hover:text-red-400 p-2">
                                <Icon path={Icons.Trash} />
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-4">
                        <input type="text" value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)}
                            placeholder="Nom de la nouvelle phase..."
                            className="flex-1 bg-slate-900 text-white px-4 py-2 rounded border border-slate-600"
                            onKeyPress={(e) => e.key === 'Enter' && addPhase()} />
                        <Button variant="success" onClick={addPhase}><Icon path={Icons.Plus} /> Ajouter</Button>
                    </div>
                </div>
            </Card>

            {/* Cloud Config */}
            <Card className="p-6 border-l-4 border-purple-500 bg-gradient-to-br from-slate-800 to-slate-900">
                <h3 className="text-lg font-bold text-white mb-4">
                    <Icon path={Icons.Cloud} /> Cloud Firebase
                </h3>
                <textarea className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono h-32 mb-2"
                    value={localConfig} onChange={(e) => setLocalConfig(e.target.value)} />
                <Button onClick={handleSaveConfig} variant="secondary" size="sm">Sauvegarder Config</Button>
            </Card>

            {/* Players */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Effectif</h2>
                <Button onClick={addPlayer} variant="success"><Icon path={Icons.Plus} /> Ajouter</Button>
            </div>
            <div className="grid gap-3">
                {players.map((p, i) => (
                    <Card key={p.id} className="p-3 flex gap-3 items-center">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold">{p.number}</div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <input className="bg-transparent text-white font-bold w-full outline-none"
                                value={p.name}
                                onChange={(e) => { const n = [...players]; n[i].name = e.target.value; onUpdatePlayers(n); }} />
                            <input className="bg-transparent text-slate-400 text-sm w-full outline-none"
                                value={p.pos}
                                onChange={(e) => { const n = [...players]; n[i].pos = e.target.value; onUpdatePlayers(n); }} />
                        </div>
                        <button onClick={() => onUpdatePlayers(players.filter(x => x.id !== p.id))} className="text-red-500 p-2">
                            <Icon path={Icons.Trash} />
                        </button>
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
    const [apiKey, setApiKey] = useState("");
    const [activeGame, setActiveGame] = useState(null);

    const [firebaseConfig, setFirebaseConfig] = useState(null);
    const [isCloudEnabled, setIsCloudEnabled] = useState(false);
    const [db, setDb] = useState(null);
    const [importData, setImportData] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const isPlayerMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'player', []);

    // Initial Load
    useEffect(() => {
        const savedFbConfig = localStorage.getItem('basket_firebase_config');
        const savedApiKey = localStorage.getItem('gemini_api_key');
        const savedPhases = localStorage.getItem('basket_phases');

        if (savedApiKey) setApiKey(savedApiKey);
        if (savedPhases) { try { setPhases(JSON.parse(savedPhases)); } catch (e) { } }

        if (PRECONFIGURED_FIREBASE.apiKey && !savedFbConfig) setFirebaseConfig(PRECONFIGURED_FIREBASE);
        else if (savedFbConfig) { try { setFirebaseConfig(JSON.parse(savedFbConfig)); } catch (e) { } }

        if (PRECONFIGURED_GEMINI_KEY && !savedApiKey) setApiKey(PRECONFIGURED_GEMINI_KEY);

        if (!savedFbConfig && !PRECONFIGURED_FIREBASE.apiKey) {
            setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers);
            setGames(JSON.parse(localStorage.getItem('basket_games')) || []);
            setIsDataLoaded(true);
        }
    }, []);

    // Firebase Connection
    useEffect(() => {
        if (firebaseConfig && window.firebase) {
            try {
                if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
                const database = firebase.firestore();
                setDb(database); setIsCloudEnabled(true);
                window.db = database; window.isCloudEnabled = true;
                console.log("Firebase connecté !");

                const unsubP = database.collection("team_data").doc("roster").onSnapshot((doc) => {
                    console.log("Firebase roster:", doc.exists ? doc.data() : "n'existe pas");
                    if (doc.exists && doc.data().list) { 
                        setPlayers(doc.data().list); 
                    } else {
                        // Charger depuis localStorage si pas de données Firebase
                        const localPlayers = JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers;
                        setPlayers(localPlayers);
                    }
                    setIsDataLoaded(true);
                }, (error) => {
                    console.error("Erreur Firebase roster:", error);
                    setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers);
                    setIsDataLoaded(true);
                });

                const unsubG = database.collection("team_data").doc("games").onSnapshot((doc) => {
                    console.log("Firebase games:", doc.exists ? doc.data() : "n'existe pas");
                    if (doc.exists && doc.data().list) {
                        setGames(doc.data().list);
                    } else {
                        const localGames = JSON.parse(localStorage.getItem('basket_games')) || [];
                        setGames(localGames);
                    }
                }, (error) => {
                    console.error("Erreur Firebase games:", error);
                    setGames(JSON.parse(localStorage.getItem('basket_games')) || []);
                });

                const unsubPh = database.collection("team_data").doc("phases").onSnapshot((doc) => {
                    console.log("Firebase phases:", doc.exists ? doc.data() : "n'existe pas");
                    if (doc.exists && doc.data().list) {
                        setPhases(doc.data().list);
                    } else {
                        const localPhases = JSON.parse(localStorage.getItem('basket_phases')) || DEFAULT_PHASES;
                        setPhases(localPhases);
                    }
                }, (error) => {
                    console.error("Erreur Firebase phases:", error);
                });

                return () => { unsubP(); unsubG(); unsubPh(); };
            } catch (e) { 
                console.error("Erreur connexion Firebase:", e); 
                setIsCloudEnabled(false); 
                setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers);
                setGames(JSON.parse(localStorage.getItem('basket_games')) || []);
                setIsDataLoaded(true); 
            }
        }
    }, [firebaseConfig]);

    // Auto-save
    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_players', JSON.stringify(players)); }, [players, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_games', JSON.stringify(games)); }, [games, isDataLoaded]);
    useEffect(() => { localStorage.setItem('basket_phases', JSON.stringify(phases)); }, [phases]);
    useEffect(() => { if (firebaseConfig) localStorage.setItem('basket_firebase_config', JSON.stringify(firebaseConfig)); }, [firebaseConfig]);
    useEffect(() => { localStorage.setItem('gemini_api_key', apiKey); }, [apiKey]);

    const handleSaveGame = (gameState) => {
        const gameId = activeGame?.id || generateId();
        const newGame = { ...gameState, id: gameId, date: activeGame?.date || new Date().toLocaleDateString() };
        const newGamesList = games.some(g => g.id === gameId) ? games.map(g => g.id === gameId ? newGame : g) : [newGame, ...games];
        setGames(newGamesList);
        if (isCloudEnabled && !isPlayerMode) saveDataToCloud(db, "games", newGamesList);
        setActiveGame(null); setView('history');
    };

    const handleUpdatePhases = (newPhases) => {
        setPhases(newPhases);
        if (isCloudEnabled && !isPlayerMode) saveDataToCloud(db, "phases", newPhases);
    };

    const handleFileImport = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => setImportData(parseHTMLStats(event.target.result));
        reader.readAsText(file); e.target.value = null;
    };

    const confirmImport = (newGame, updatedPlayers) => {
        setPlayers(updatedPlayers);
        const newGamesList = [newGame, ...games];
        setGames(newGamesList);
        if (isCloudEnabled && !isPlayerMode) {
            saveDataToCloud(db, "roster", updatedPlayers);
            saveDataToCloud(db, "games", newGamesList);
        }
        setImportData(null); alert("Importé et synchronisé !"); setView('history');
    };

    const handleSettingsUpdate = (newPlayers) => {
        setPlayers(newPlayers);
        if (isCloudEnabled && !isPlayerMode) saveDataToCloud(db, "roster", newPlayers);
    };

    // Player Mode View
    if (isPlayerMode) {
        return (
            <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
                <header className="h-16 bg-slate-900 flex items-center px-6">
                    <h1 className="font-bold text-lg text-white">🏀 Stats Saison</h1>
                    <div className="ml-auto text-xs text-orange-500 font-bold px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Mode Joueur</div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto">
                    <GlobalStats players={players} games={games} phases={phases} />
                </div>
            </div>
        );
    }

    // Main App View
    return (
        <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
            <input type="file" accept=".html" id="html-upload" onChange={handleFileImport} className="hidden" />

            {/* Import Modal */}
            {importData && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 shadow-2xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Vérification de l'Import</h2>
                        <ImportReviewModal importData={importData} currentPlayers={players} phases={phases}
                            onConfirm={confirmImport} onCancel={() => setImportData(null)} />
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="bg-slate-900 border-r border-slate-800 w-full md:w-20 flex md:flex-col items-center justify-evenly md:justify-start md:pt-6 p-2 z-50 shadow-xl shrink-0">
                <div className="mb-0 md:mb-8 p-2 bg-orange-600 rounded-xl text-white font-black text-xl">BP</div>
                {[
                    { id: "live", icon: Icons.Play },
                    { id: "global_stats", icon: Icons.Chart },
                    { id: "history", icon: Icons.Clipboard },
                    { id: "settings", icon: Icons.Settings }
                ].map(btn => (
                    <button key={btn.id} onClick={() => setView(btn.id)}
                        className={`p-3 rounded-xl transition-all ${view === btn.id ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Icon path={btn.icon} />
                    </button>
                ))}
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0">
                    <h1 className="font-bold text-lg text-white">
                        {view === 'live' && "🔴 Live"}
                        {view === 'global_stats' && "📊 Stats Saison"}
                        {view === 'history' && "📜 Historique"}
                        {view === 'settings' && "⚙️ Paramètres"}
                    </h1>
                    {isCloudEnabled && (
                        <span className="ml-auto text-xs text-green-400 flex gap-1"><Icon path={Icons.Cloud} /> Synchro Active</span>
                    )}
                </header>
                <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
                    {view === 'live' && <LiveTracker players={players} onSaveGame={handleSaveGame} initialGame={activeGame} phases={phases} selectedPhase={phases[0]?.id} />}
                    {view === 'global_stats' && <GlobalStats players={players} games={games} phases={phases} />}
                    {view === 'history' && <History games={games} players={players} setGames={setGames} phases={phases} onEditGame={(g) => { setActiveGame(g); setView('live'); }} onImportClick={() => document.getElementById('html-upload').click()} />}
                    {view === 'settings' && <Settings players={players} onUpdatePlayers={handleSettingsUpdate} phases={phases} onUpdatePhases={handleUpdatePhases} apiKey={apiKey} setApiKey={setApiKey} firebaseConfig={firebaseConfig} setFirebaseConfig={setFirebaseConfig} />}
                </div>
            </main>
        </div>
    );
}

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
