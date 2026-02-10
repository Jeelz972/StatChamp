// ==========================================
// ZONE DE CONFIGURATION AUTOMATIQUE
// ==========================================
const PRECONFIGURED_FIREBASE = {apiKey: "AIzaSyBaA99che1oz9BHc23IhiFoY-nK0xvg4q4",
    authDomain: "statu18elite.firebaseapp.com",
    projectId: "statu18elite",
    storageBucket: "statu18elite.firebasestorage.app",
    messagingSenderId: "862850988986",
    appId: "1:862850988986:web:935de245b5c13e29f6fb83",
    measurementId: "G-ZDBRV7JEPN"
};

const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const months = { 'janv': 0, 'jan': 0, 'janvier': 0, 'fevr': 1, 'fev': 1, 'fevrier': 1, 'mars': 2, 'mar': 2, 'avr': 3, 'avril': 3, 'mai': 4, 'juin': 5, 'juil': 6, 'jul': 6, 'juillet': 6, 'aout': 7, 'sept': 8, 'sep': 8, 'septembre': 8, 'oct': 9, 'octobre': 9, 'nov': 10, 'novembre': 10, 'dec': 11, 'decembre': 11 };
    const match = dateStr.match(/(\d{1,2})\s+([a-z\u00e9\u00fb\u00f4]+)\.?\s+(\d{4})/i);
    if (match) {
        const m = months[match[2].toLowerCase().replace('.', '').normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
        if (m !== undefined) return new Date(match[3], m, match[1]);
    }
    const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) return new Date(slash[3], slash[2] - 1, slash[1]);
    return new Date(dateStr);
};

// ===========================================
// FONCTIONS DE CALCUL DES RATINGS AVANCES
// ===========================================

const calculateHGI = (playerStats, allGames, playerId, weights = { PT: 0.35, RP: 0.40, SI: 0.25 }) => {
    const stats = playerStats;
    if (!stats) return { total: 0, PT: 0, RP: 0, SI: 0 };
    const threePct = (stats.threePA || 0) > 0 ? (stats.threePM || 0) / stats.threePA : 0;
    const PT = (threePct * (stats.threePA || 0)) * 1.5;
    const driveAtt = stats.driveAtt || 0;
    const driveMade = stats.driveMade || 0;
    const drivePct = driveAtt > 0 ? driveMade / driveAtt : 0;
    const RP = driveAtt * drivePct;
    const SI = calculateSpacingImpact(allGames, playerId);
    const total = (weights.PT * PT) + (weights.RP * RP) + (weights.SI * SI);
    return {
        total: Math.round(total * 10) / 10,
        PT: Math.round(PT * 10) / 10,
        RP: Math.round(RP * 10) / 10,
        SI: Math.round(SI * 10) / 10
    };
};

const calculateSpacingImpact = (games, playerId) => {
    let onFGM = 0, onFGA = 0, on3PM = 0;
    let offFGM = 0, offFGA = 0, off3PM = 0;
    games.forEach(game => {
        if (!game.actions || !game.playerStats) return;
        game.actions.forEach(action => {
            if (action.type !== 'SHOT') return;
            const shooterId = action.playerId || action.pid;
            if (!shooterId || shooterId >= 1000) return;
            const onCourt = action.onCourt || [];
            const playerOnCourt = onCourt.includes(playerId) || onCourt.includes(String(playerId));
            const made = action.made ? 1 : 0;
            const is3 = action.val === 3;
            if (playerOnCourt) { onFGA++; onFGM += made; if (is3 && made) on3PM++; }
            else { offFGA++; offFGM += made; if (is3 && made) off3PM++; }
        });
    });
    const onEFG = onFGA >= 10 ? ((onFGM + 0.5 * on3PM) / onFGA) * 100 : 0;
    const offEFG = offFGA >= 10 ? ((offFGM + 0.5 * off3PM) / offFGA) * 100 : 0;
    if (onFGA < 10 || offFGA < 10) return 0;
    return onEFG - offEFG;
};

const estimateOpponentStats = (game) => {
    const opp = game.opponentStats || {};
    const pts = game.awayScore || opp.pts || 0;
    let T_DRB = 0;
    Object.values(game.playerStats || {}).forEach(s => { T_DRB += (s.dreb || 0); });
    return {
        pts, fgm: opp.fgm || Math.round(pts * 0.38), fga: opp.fga || Math.round(pts * 0.85),
        ftm: opp.ftm || Math.round(pts * 0.15), fta: opp.fta || Math.round(pts * 0.2),
        oreb: opp.oreb || (opp.reb ? Math.round(opp.reb * 0.3) : Math.round(pts * 0.12)),
        dreb: opp.dreb || (opp.reb ? Math.round(opp.reb * 0.7) : Math.round(pts * 0.3)),
        reb: opp.reb || Math.round(pts * 0.4),
        tov: opp.tov || Math.round(pts * 0.1),
        fouls: opp.fouls || 0,
        ast: opp.ast || 0, blk: opp.blk || 0
    };
};

const calculateAverageMinutes = (playerStats) => {
    const active = Object.values(playerStats).filter(s => (s.minutes || 0) > 0);
    if (active.length === 0) return 20;
    return active.reduce((sum, s) => sum + (s.minutes || 0), 0) / active.length;
};

const calculateDeanOliverRatings = ({
    MP, PTS, FGM, FGA, ThreePM, FTM, FTA, ORB, DRB, AST, STL, BLK, TOV, PF,
    Team_PTS, Team_FGM, Team_FGA, Team_ThreePM, Team_FTM, Team_FTA,
    Team_ORB, Team_DRB, Team_AST, Team_STL, Team_BLK, Team_TOV, Team_PF, Team_MP,
    Opp_PTS, Opp_FGM, Opp_FGA, Opp_FTM, Opp_FTA, Opp_ORB, Opp_DRB, Opp_TOV,
    Opp_MP, avgMinutes, k = 1.5
}) => {
    if (MP === 0 || Team_MP === 0) return { ORtg: 0, DRtg: 0, netRtg: 0 };

    const Team_Poss = Team_FGA + 0.44 * Team_FTA - Team_ORB + Team_TOV;
    const Team_ORB_Pct = (Team_ORB + Opp_DRB) > 0 ? Team_ORB / (Team_ORB + Opp_DRB) : 0;
    const Team_Play_Pct = Team_FGA > 0 ? Team_FGM / Team_FGA : 0;
    const FT_Scoring = FTA > 0 ? (1 - Math.pow(1 - (FTM / FTA), 2)) * 0.4 * FTA : 0;
    const Team_FT_Scoring = Team_FTA > 0 ? (1 - Math.pow(1 - (Team_FTM / Team_FTA), 2)) * 0.4 * Team_FTA : 0;
    const Team_Scoring_Poss = Team_FGM + Team_FT_Scoring;
    const Team_ORB_Weight = Team_Scoring_Poss > 0 ? ((1 - Team_ORB_Pct) * Team_Play_Pct) / ((1 - Team_ORB_Pct) * Team_Play_Pct + Team_ORB_Pct * (1 - Team_Play_Pct)) : 0;

    const qAST_t1 = (MP / (Team_MP / 5)) * (1.14 * ((Team_AST - AST) / (Team_FGM || 1)));
    const qAST_t2 = ((((Team_AST / Team_MP) * MP * 5 - AST) / ((Team_FGM / Team_MP) * MP * 5 - FGM || 1)) * (1 - (MP / (Team_MP / 5))));
    const qAST = Math.min(Math.max(qAST_t1 + qAST_t2, 0), 1) || 0;

    const FG_Part = FGM * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
    const AST_Part = 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) * AST;
    const ScPoss_Factor = Team_Scoring_Poss > 0 ? 1 - (Team_ORB / Team_Scoring_Poss) * Team_ORB_Weight * Team_Play_Pct : 1;
    const ScPoss = (FG_Part + AST_Part + FT_Scoring) * ScPoss_Factor + ORB * Team_ORB_Weight * Team_Play_Pct;
    const FGxPoss = (FGA - FGM) * (1 - 1.07 * Team_ORB_Pct);
    const FTxPoss = Math.pow(1 - (FTM / (FTA || 1)), 2) * 0.4 * FTA;
    const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;

    const PProd_FG = 2 * (FGM + 0.5 * ThreePM) * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
    const PProd_AST = 2 * ((Team_FGM - FGM + 0.5 * (Team_ThreePM - ThreePM)) / (Team_FGM - FGM || 1)) * 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) * AST;
    const Team_Pts_Per_Score = Team_Scoring_Poss > 0 ? Team_PTS / Team_Scoring_Poss : 2;
    const PProd_ORB = ORB * Team_ORB_Weight * Team_Play_Pct * Team_Pts_Per_Score;
    const PProd = (PProd_FG + PProd_AST + FTM) * ScPoss_Factor + PProd_ORB;
    const ORtg_ind = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;

    const DOR_Pct = (Opp_ORB + Team_DRB) > 0 ? Opp_ORB / (Opp_ORB + Team_DRB) : 0;
    const DFG_Pct = Opp_FGA > 0 ? Opp_FGM / Opp_FGA : 0.45;
    const FMwt_D = DFG_Pct * (1 - DOR_Pct);
    const FMwt = (FMwt_D + (1 - DFG_Pct) * DOR_Pct) > 0 ? FMwt_D / (FMwt_D + (1 - DFG_Pct) * DOR_Pct) : 0.5;
    const Stops1 = STL + BLK * FMwt * (1 - 1.07 * DOR_Pct) + DRB * (1 - FMwt);
    const Stops2_P1 = Team_MP > 0 ? ((Opp_FGA - Opp_FGM - Team_BLK) / Team_MP) * FMwt * (1 - 1.07 * DOR_Pct) : 0;
    const Stops2_P2 = Team_MP > 0 ? ((Opp_TOV - Team_STL) / Team_MP) : 0;
    const Stops2_P3 = Team_PF > 0 && Opp_FTA > 0 ? (PF / Team_PF) * 0.4 * Opp_FTA * Math.pow(1 - (Opp_FTM / Opp_FTA), 2) : 0;
    const Stops = Stops1 + (Stops2_P1 + Stops2_P2) * MP + Stops2_P3;
    const Stop_Pct = (Team_Poss * MP) > 0 ? (Stops * (Opp_MP || Team_MP)) / (Team_Poss * MP) : 0;
    const Team_DRtg = Team_Poss > 0 ? 100 * (Opp_PTS / Team_Poss) : 100;
    const Opp_FT_Scoring = Opp_FTA > 0 ? (1 - Math.pow(1 - (Opp_FTM / Opp_FTA), 2)) * 0.4 * Opp_FTA : 0;
    const D_Pts_per_ScPoss = (Opp_FGM + Opp_FT_Scoring) > 0 ? Opp_PTS / (Opp_FGM + Opp_FT_Scoring) : 2;
    const DRtg_ind = Team_DRtg + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg);

    const Team_ORtg = Team_Poss > 0 ? 100 * (Team_PTS / Team_Poss) : 100;
    const Min_moy = avgMinutes || (Team_MP / 5);
    const C = k * Min_moy;
    const w = MP / (MP + C);
    const ORtg = Team_ORtg + (ORtg_ind - Team_ORtg) * w;
    const DRtg = Team_DRtg + (DRtg_ind - Team_DRtg) * w;

    return {
        ORtg: isFinite(ORtg) ? ORtg : Team_ORtg,
        DRtg: isFinite(DRtg) ? DRtg : Team_DRtg,
        netRtg: isFinite(ORtg - DRtg) ? ORtg - DRtg : 0
    };
};

// ==========================================
const { useState, useEffect, useMemo } = React;
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area, ComposedChart, ReferenceLine, Cell } = window.Recharts || {};

const generateId = () => Math.random().toString(36).substr(2, 9);
const defaultPlayers = [{ id: 1, name: "Joueur 1", number: 4, pos: "PG" }, { id: 2, name: "Joueur 2", number: 5, pos: "SG" }];
const DEFAULT_PHASES = [{ id: "phase1", name: "Phase 1" }, { id: "phase2", name: "Phase 2" }];

// --- FIX #2 : fgm/fga = 2PT ONLY. 3PT dans threePM/threePA ---
const recalculateGameStats = (actions, players) => {
    const pStats = {};
    players.forEach(p => { pStats[p.id] = { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, pf: 0, minutes: 0, plusMinus: 0, threePM: 0, threePA: 0 }; });
    const oppStats = { pts: 0, reb: 0, ast: 0, tov: 0, fouls: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, oreb: 0 };
    let home = 0, away = 0;
    actions.forEach(act => {
        const { type, playerId, consequence, onCourt } = act;
        let ptsScored = 0, ptsConceded = 0;
        if (playerId === 'OPP') {
            if (type === 'FGM1') { oppStats.pts++; oppStats.ftm++; oppStats.fta++; away++; ptsConceded = 1; }
            if (type === 'FGA1') oppStats.fta++;
            if (type === 'FGM2') { oppStats.pts += 2; oppStats.fgm++; oppStats.fga++; away += 2; ptsConceded = 2; }
            if (type === 'FGA2') oppStats.fga++;
            if (type === 'FGM3') { oppStats.pts += 3; oppStats.fgm++; oppStats.fga++; away += 3; ptsConceded = 3; }
            if (type === 'FGA3') oppStats.fga++;
            if (type === 'OREB') { oppStats.reb++; oppStats.oreb++; }
            if (type === 'DREB') oppStats.reb++;
            if (type === 'AST') oppStats.ast++;
            if (type === 'TOV') oppStats.tov++;
            if (type === 'PF') oppStats.fouls++;
            if (consequence?.includes('score')) { const val = parseInt(consequence.split('_')[1]); home += val; ptsScored = val; }
        } else if (pStats[playerId]) {
            const ps = pStats[playerId];
            if (type === 'FGM1') { ps.pts++; ps.ftm++; ps.fta++; home++; ptsScored = 1; }
            if (type === 'FGA1') ps.fta++;
            // FIX: fgm/fga = 2PT seulement
            if (type === 'FGM2') { ps.pts += 2; ps.fgm++; ps.fga++; home += 2; ptsScored = 2; }
            if (type === 'FGA2') ps.fga++;
            // FIX: 3PT ne touche PAS fgm/fga, seulement threePM/threePA
            if (type === 'FGM3') { ps.pts += 3; ps.threePM++; ps.threePA++; home += 3; ptsScored = 3; }
            if (type === 'FGA3') ps.threePA++;
            if (type === 'OREB') { ps.reb++; ps.oreb++; }
            if (type === 'DREB') { ps.reb++; ps.dreb++; }
            if (type === 'AST') ps.ast++;
            if (type === 'STL') ps.stl++;
            if (type === 'BLK') ps.blk++;
            if (type === 'TOV') ps.tov++;
            if (type === 'PF') ps.pf++;
            if (consequence?.includes('score')) { const val = parseInt(consequence.split('_')[1]); away += val; ptsConceded = val; }
        }
        if (onCourt?.length) onCourt.forEach(pid => { if (pStats[pid]) pStats[pid].plusMinus += ptsScored - ptsConceded; });
    });
    return { playerStats: pStats, opponentStats: oppStats, homeScore: home, awayScore: away };
};

const saveDataToCloud = (db, collection, data) => {
    if (!db) return Promise.resolve();
    return db.collection("team_data").doc(collection).set({ list: data });
};

// --- ICONS ---
const Icon = ({ path, className }) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>;
const Icons = {
    Play: "M5 3l14 9-14 9V3z", Pause: "M10 9v6 M14 9v6", Trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    Chart: "M18 20V10 M12 20V4 M6 20v-6", Plus: "M12 5v14M5 12h14", Eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    Check: "M20 6L9 17l-5-5", Edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    Upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12", Cloud: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
    Filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z", Layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    Users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    TrendingUp: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6", Trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 22V9 M14 22V9 M8 9h8a4 4 0 0 0 4-4V4H4v1a4 4 0 0 0 4 4z",
    Target: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    Settings: "M12.22 2h-.44a2 2 0 0 1-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    Clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }) => <div className={`bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden ${className}`}>{children}</div>;
const Button = ({ onClick, children, variant = "primary", className = "", size = "md", disabled = false }) => {
    const base = "font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer";
    const variants = { primary: "bg-orange-500 hover:bg-orange-600 text-white", secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200", danger: "bg-red-600 hover:bg-red-700 text-white", success: "bg-green-600 hover:bg-green-700 text-white", ghost: "bg-transparent hover:bg-slate-700 text-slate-400" };
    const sizes = { sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-lg" };
    return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50' : ''}`}>{children}</button>;
};

const Modal = ({ isOpen, onClose, title, children, size = "max-w-4xl" }) => {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" style={{ zIndex: 999999 }}>
            <div className={`bg-slate-800 rounded-xl border border-slate-600 w-full ${size} shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2 truncate pr-2">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl sm:text-3xl leading-none cursor-pointer shrink-0 w-8 h-8 flex items-center justify-center">&times;</button>
                </div>
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>
            </div>
        </div>,
        document.body
    );
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
    if (homeName.toLowerCase().includes("champagne") || homeName.toLowerCase().includes("basket")) {
        opponentName = awayName; myScore = homeScore; oppScore = awayScore;
    } else if (awayName.toLowerCase().includes("champagne") || awayName.toLowerCase().includes("basket")) {
        opponentName = homeName; myScore = awayScore; oppScore = homeScore;
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
            if (nameCell.includes(opponentName)) { opponentStats = { pts: parseInt(cells[16].textContent) || 0 }; return; }
            if (!nameCell.startsWith('#')) return;
            const parts = nameCell.split(' ');
            const number = parseInt(parts[0].replace('#', ''));
            const name = parts.slice(1).join(' ');
            const parseSplit = (txt) => { if (!txt || txt === '-') return { made: 0, att: 0 }; const [m, a] = txt.split('-'); return { made: parseInt(m) || 0, att: parseInt(a) || 0 }; };
            const fg = parseSplit(cells[1].textContent);
            const tp = parseSplit(cells[3].textContent);
            const ft = parseSplit(cells[5].textContent);
            // fgm/fga = 2PT only (on soustrait les 3PT du total FG)
            const stats = {
                fgm: fg.made - tp.made, fga: fg.att - tp.att,
                ftm: ft.made, fta: ft.att,
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
    return { meta: { date, opponent: opponentName, homeScore: myScore, awayScore: oppScore }, rawPlayers, opponentStats };
};

// --- LIVE TRACKER ---
function LiveTracker({ players, onSaveGame, initialGame, phases, selectedPhase }) {
    const [gameState, setGameState] = useState({ quarter: 1, opponent: "Adversaire", actions: [], phase: selectedPhase });
    const [gameTime, setGameTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [onCourt, setOnCourt] = useState([]);
    const [accumulatedMinutes, setAccumulatedMinutes] = useState({});
    const [derived, setDerived] = useState(recalculateGameStats([], players));
    const [modal, setModal] = useState({ type: null, data: null });

    useEffect(() => { if (initialGame) setGameState(prev => ({ ...prev, ...initialGame })); }, [initialGame]);
    useEffect(() => { setDerived(recalculateGameStats(gameState.actions, players)); }, [gameState.actions, players]);
    useEffect(() => {
        let interval;
        if (isTimerRunning) { interval = setInterval(() => { setGameTime(p => p + 1); setAccumulatedMinutes(prev => { const next = { ...prev }; onCourt.forEach(id => next[id] = (next[id] || 0) + 1); return next; }); }, 1000); }
        return () => clearInterval(interval);
    }, [isTimerRunning, onCourt]);

    const registerAction = (actionType, player, extraData = {}) => {
        const newAction = { id: generateId(), type: actionType, playerId: player === 'opponent' ? 'OPP' : player.id, playerName: player === 'opponent' ? 'Adversaire' : player.name, q: gameState.quarter, consequence: extraData.consequence, onCourt: [...onCourt] };
        setGameState(prev => ({ ...prev, actions: [...prev.actions, newAction] }));
        setModal({ type: null, data: null });
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
            <Card className="bg-slate-900 p-4 flex justify-between items-center sticky top-0 z-10 border-b-4 border-orange-500">
                <div className="text-4xl font-bold text-white">{derived.homeScore}</div>
                <div className="flex flex-col items-center"><div className="text-xl font-bold text-orange-500">Q{gameState.quarter}</div><div className="flex gap-2 mt-1"><button onClick={() => setGameState(p => ({ ...p, quarter: Math.max(1, p.quarter - 1) }))} className="text-xs text-slate-500 hover:text-white">-</button><button onClick={() => setGameState(p => ({ ...p, quarter: p.quarter + 1 }))} className="text-xs text-slate-500 hover:text-white">+</button></div></div>
                <div className="text-4xl font-bold text-red-500">{derived.awayScore}</div>
            </Card>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-3 pb-20">
                {players.map(player => {
                    const pStats = derived.playerStats[player.id] || { pts: 0, plusMinus: 0 };
                    const isOnCourt = onCourt.includes(player.id);
                    return (
                        <div key={player.id} className={`relative p-3 rounded-xl border shadow-md transition-all ${isOnCourt ? 'bg-slate-800 border-orange-500' : 'bg-slate-800/60 border-slate-700 opacity-80'}`}>
                            <div className="absolute top-2 right-2"><input type="checkbox" checked={isOnCourt} onChange={() => { if (onCourt.includes(player.id)) setOnCourt(p => p.filter(x => x !== player.id)); else if (onCourt.length < 5) setOnCourt(p => [...p, player.id]); }} className="w-5 h-5 accent-orange-500 cursor-pointer" /></div>
                            <div onClick={() => setModal({ type: "ACTION_MENU", data: player })} className="cursor-pointer">
                                <div className="flex justify-between pr-6"><span className={`font-bold truncate ${isOnCourt ? 'text-white' : 'text-slate-400'}`}>{player.name}</span><span className="text-xs text-slate-500">#{player.number}</span></div>
                                <div className="text-xs mt-2 space-x-2 text-slate-300"><span>Pts: <b className="text-white">{pStats.pts}</b></span><span>+/-: <b className={pStats.plusMinus >= 0 ? "text-green-400" : "text-red-400"}>{pStats.plusMinus > 0 ? '+' : ''}{pStats.plusMinus}</b></span></div>
                            </div>
                        </div>
                    );
                })}
                <div onClick={() => setModal({ type: "ACTION_MENU", data: "opponent" })} className="bg-red-900/40 p-3 rounded-xl border border-red-700 hover:border-red-500 cursor-pointer flex items-center justify-center"><span className="font-bold text-red-200">{gameState.opponent.toUpperCase()}</span></div>
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
            <Modal isOpen={modal.type === "CONSEQ_TOV"} onClose={() => setModal({ type: null })} title="Consequence ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_2" })} className="bg-red-600">Adv +2</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_3" })} className="bg-red-600">Adv +3</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "CONSEQ_STL"} onClose={() => setModal({ type: null })} title="Suite ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("STL", modal.data, { consequence: "score_2" })} className="bg-green-600">Nous +2</Button><Button onClick={() => registerAction("STL", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "STATS"} onClose={() => setModal({ type: null })} title="Stats Live"><table className="w-full text-left text-xs text-slate-300"><thead className="bg-slate-700 text-white"><tr><th className="p-2">Joueur</th><th className="p-2">Pts</th><th className="p-2">+/-</th><th className="p-2">Fte</th></tr></thead><tbody className="divide-y divide-slate-700">{players.map(p => { const s = derived.playerStats[p.id] || {}; return <tr key={p.id}><td className="p-2 font-bold">{p.name}</td><td className="p-2">{s.pts}</td><td className={`p-2 font-bold ${(s.plusMinus||0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.plusMinus}</td><td className="p-2 text-red-400">{s.pf}</td></tr>; })}</tbody></table></Modal>
        </div>
    );
}

// ===========================================
// GLOBAL STATS
// ===========================================
function GlobalStats({ players, games, phases, isAdmin }) {
    const [filterPhase, setFilterPhase] = React.useState('all');
    const [selectedPlayer, setSelectedPlayer] = React.useState(null);
    const [showTeamTrends, setShowTeamTrends] = React.useState(false);
    const [viewMode, setViewMode] = React.useState('classic'); // 'classic' or 'advanced'

    // Filtrage des matchs
   const filteredGames = React.useMemo(() => {
    const isFinal = g => !g.status || g.status === 'final';
    if (filterPhase === 'all') return games.filter(isFinal);
    return games.filter(g => g.phase === filterPhase && isFinal(g));
}, [games, filterPhase]);

    // --- 1. CALCULS DES TENDANCES ET ANALYSE DÉFAITES ---
    const teamTrendsData = React.useMemo(() => {
        const sorted = [...filteredGames].sort((a, b) => parseDate(a.date) - parseDate(b.date));
        
        // Initialisation des accumulateurs
        const initStats = () => ({ 
            pts: 0, conceded: 0, 
            fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, 
            reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 
        });

        let global = initStats();
        let winsStats = { ...initStats(), count: 0 };
        let lossStats = { ...initStats(), count: 0 };

        const data = sorted.map((g) => {
            let stats = initStats();
            
            // Somme des stats des joueurs pour ce match
            Object.values(g.playerStats).forEach(s => {
                stats.pts += (s.pts||0); 
                stats.fgm += (s.fgm||0)+(s.threePM||0); // FGM inclut généralement 3PM dans les boxscores complets, ici on additionne si séparé
                stats.fga += (s.fga||0)+(s.threePA||0);
                stats.threePM += (s.threePM||0); stats.threePA += (s.threePA||0);
                stats.ftm += (s.ftm||0); stats.fta += (s.fta||0);
                stats.reb += (s.oreb||0)+(s.dreb||0);
                stats.ast += (s.ast||0); stats.stl += (s.stl||0); stats.blk += (s.blk||0);
                stats.tov += (s.tov||0); stats.pf += (s.pf||0);
            });

            // Aggrégation Globale
            Object.keys(global).forEach(k => { if(stats[k] !== undefined) global[k] += stats[k]; });
            global.conceded += (g.awayScore||0);

            // Calculs avancés par match
            const totalPoss = stats.fga + 0.44*stats.fta - (stats.reb*0.3) + stats.tov; 
            const ortg = totalPoss > 0 ? (stats.pts/totalPoss)*100 : 0;
            const drtg = totalPoss > 0 ? ((g.awayScore||0)/totalPoss)*100 : 0;
            const isWin = (g.homeScore||0) > (g.awayScore||0);

            // Aggrégation Victoires / Défaites
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

        // Fonction utilitaire pour calculer les moyennes
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
                threePM: (source.threePM/count).toFixed(1), threePA: (source.threePA/count).toFixed(1)
            };
        };

        const avgs = calcAvg(global, data.length || 1);
        const winAvgs = calcAvg(winsStats, winsStats.count);
        const lossAvgs = calcAvg(lossStats, lossStats.count);

        // ANALYSE DES DÉFAITES (Comparaison Différentielle)
        const analysis = [];
        if (lossStats.count > 0 && winsStats.count > 0) {
            // Calcul des deltas (Combien fait-on de MOINS en défaite par rapport à la victoire)
            // Positif = On est moins bon en défaite. Négatif = On est meilleur en défaite (rare mais possible)
            
            const diffs = [
                { label: "Défense (Pts Encaissés)", val: parseFloat(lossAvgs.conceded) - parseFloat(winAvgs.conceded), type: 'negative_more_is_bad', unit: 'pts' },
                { label: "Attaque (Scoring)", val: parseFloat(winAvgs.pts) - parseFloat(lossAvgs.pts), type: 'positive_less_is_bad', unit: 'pts' },
                { label: "Pertes de balle", val: parseFloat(lossAvgs.tov) - parseFloat(winAvgs.tov), type: 'negative_more_is_bad', unit: 'bp' },
                { label: "Adresse Globale", val: parseFloat(winAvgs.fgPct) - parseFloat(lossAvgs.fgPct), type: 'positive_less_is_bad', unit: '%' },
                { label: "Adresse 3-Pts", val: parseFloat(winAvgs.threePct) - parseFloat(lossAvgs.threePct), type: 'positive_less_is_bad', unit: '%' },
                { label: "Rebonds", val: parseFloat(winAvgs.reb) - parseFloat(lossAvgs.reb), type: 'positive_less_is_bad', unit: 'reb' },
                { label: "Création (Passes)", val: parseFloat(winAvgs.ast) - parseFloat(lossAvgs.ast), type: 'positive_less_is_bad', unit: 'pd' },
            ];

            // On trie par impact (valeur absolue la plus grande)
            analysis.push(...diffs
                .map(d => ({ ...d, impact: Math.abs(d.val), raw: d.val }))
                .sort((a, b) => b.impact - a.impact)
                .slice(0, 3) // Top 3 des causes
            );
        }

        const streak = data.length > 0 ? (data[data.length-1].isWin ? "W" : "L") : "-";

        return { data, avgs, winAvgs, lossAvgs, wins: winsStats.count, losses: lossStats.count, streak, analysis };
    }, [filteredGames]);

    // Aggrégation des joueurs (inchangée mais nécessaire pour le tableau)
    const aggregated = React.useMemo(() => {
        const agg = {};
        players.forEach(p => {
            agg[p.id] = { 
                info: p, gamesPlayed: 0, 
                stats: { pts:0, fgm:0, fga:0, threePM:0, threePA:0, ftm:0, fta:0, oreb:0, dreb:0, reb:0, ast:0, stl:0, blk:0, tov:0, pf:0, minutes:0, plusMinus: 0 },logs: []            };
                
            });

       filteredGames.forEach(g => {
            Object.entries(g.playerStats).forEach(([pid, stats]) => {
                if (!agg[pid]) return;
                const hasActivity = (stats.pts||0) > 0 || (stats.fgm||0) > 0 || (stats.fga||0) > 0 ||
                    (stats.threePA||0) > 0 || (stats.fta||0) > 0 || (stats.oreb||0) > 0 || (stats.dreb||0) > 0 ||
                    (stats.ast||0) > 0 || (stats.stl||0) > 0 || (stats.blk||0) > 0 || (stats.tov||0) > 0 ||
                    (stats.pf||0) > 0 || (stats.minutes||0) > 0;
                if (!hasActivity) return;
                agg[pid].gamesPlayed++;
                Object.keys(agg[pid].stats).forEach(k => {
                    agg[pid].stats[k] += (stats[k] || 0);
                });
                agg[pid].stats.reb = agg[pid].stats.oreb + agg[pid].stats.dreb;

                const reb = (stats.oreb||0) + (stats.dreb||0);
                const missedFG = ((stats.fga||0)+(stats.threePA||0)) - ((stats.fgm||0)+(stats.threePM||0));
                const missedFT = (stats.fta||0) - (stats.ftm||0);
                const eff = (stats.pts||0) + reb + (stats.ast||0) + (stats.stl||0) + (stats.blk||0) - missedFG - missedFT - (stats.tov||0);
                agg[pid].logs.push({
                    date: g.date,
                    opponent: g.opponent,
                    isWin: (g.homeScore || 0) > (g.awayScore || 0),
                    score: g.homeScore,
                    conceded: g.awayScore,
                    min: stats.minutes || 0,
                    pts: stats.pts || 0,
                    reb: reb,
                    ast: stats.ast || 0,
                    stl: stats.stl || 0,
                    tov: stats.tov || 0,
                    plusMinus: stats.plusMinus || 0,
                    eff: eff,
                    ORtg: 0, // Optionnel si vous n'avez pas le calcul complexe
                    DRtg: 0  // Optionnel
                });
            });
        });

        return Object.values(agg)
            .filter(p => p.gamesPlayed > 0)
            .map(p => {
                const gp = p.gamesPlayed;
                const s = p.stats;
                
                // Calcul de l'EVAL (Simplifié: PTS + REB + AST + STL + BLK - MissedFG - MissedFT - TOV)
                const missedFG = (s.fga + s.threePA) - (s.fgm + s.threePM);
                const missedFT = s.fta - s.ftm;
                const eff = (s.pts + s.reb + s.ast + s.stl + s.blk - missedFG - missedFT - s.tov) / gp;

                return {
                    ...p,
                    logs: p.logs.sort((a, b) => parseDate(b.date) - parseDate(a.date)),
                    avg: {
                        pts: (s.pts/gp).toFixed(1),
                        min: (s.minutes/gp).toFixed(1),
                        fgm: (s.fgm/gp).toFixed(1), fga: (s.fga/gp).toFixed(1),
                        threePM: (s.threePM/gp).toFixed(1), threePA: (s.threePA/gp).toFixed(1),
                        ftm: (s.ftm/gp).toFixed(1), fta: (s.fta/gp).toFixed(1),
                        oreb: (s.oreb/gp).toFixed(1), dreb: (s.dreb/gp).toFixed(1), reb: (s.reb/gp).toFixed(1),
                        ast: (s.ast/gp).toFixed(1), stl: (s.stl/gp).toFixed(1), blk: (s.blk/gp).toFixed(1),
                        tov: (s.tov/gp).toFixed(1), pf: (s.pf/gp).toFixed(1),
                        plusMinus: (s.plusMinus/gp).toFixed(1),
                        eff: eff.toFixed(1),
                        fgPct: (s.fga+s.threePA) > 0 ? (((s.fgm+s.threePM)/(s.fga+s.threePA))*100).toFixed(0) : 0,
                        twoPct: s.fga > 0 ? ((s.fgm/s.fga)*100).toFixed(0) : 0, // Approx si FGA contient que 2pts
                        threePct: s.threePA > 0 ? ((s.threePM/s.threePA)*100).toFixed(0) : 0,
                        ftPct: s.fta > 0 ? ((s.ftm/s.fta)*100).toFixed(0) : 0,
                    }
                };
            })
            .sort((a, b) => parseFloat(b.avg.pts) - parseFloat(a.avg.pts));
    }, [filteredGames, players]);

    return (
        <div className="space-y-4 h-full flex flex-col pb-20 md:pb-0">
            <Card className="p-2 md:p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                        <select 
                            value={filterPhase} 
                            onChange={(e) => setFilterPhase(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-slate-200 text-sm rounded p-2"
                        >
                            <option value="all">Toute la saison</option>
                            {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button 
                            onClick={() => setViewMode(viewMode === 'classic' ? 'advanced' : 'classic')}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs uppercase text-slate-300 border border-slate-700 transition-colors"
                        >
                            {viewMode === 'classic' ? 'Vue Avancée' : 'Vue Classique'}
                        </button>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setShowTeamTrends(true)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded shadow-lg text-sm flex items-center gap-2 transition-all"
                        >
                            <Icon path={Icons.TrendingUp} /> Analyse & Tendances
                        </button>
                    </div>
                </div>
                
                {/* TABLEAU PRINCIPAL AVEC EN-TÊTES GROUPÉS */}
                <div className="overflow-auto flex-1 relative custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap border-collapse">
                        <thead className="bg-slate-900 text-white uppercase text-xs sticky top-0 z-20">
                            {/* Ligne de groupe */}
                            <tr className="bg-slate-950 border-b border-slate-700">
                                <th className="p-1 sticky left-0 bg-slate-950 z-30 min-w-[120px]"></th>
                                <th colSpan="2" className="p-1 text-center border-r border-slate-700 text-slate-500">Général</th>
                                {viewMode === 'classic' ? (
                                    <>
                                        <th colSpan="3" className="p-1 text-center border-r border-slate-700 text-orange-400 bg-orange-900/10">Scoring</th>
                                        <th colSpan="4" className="p-1 text-center border-r border-slate-700 text-blue-400 bg-blue-900/10">Pourcentages</th>
                                        <th colSpan="3" className="p-1 text-center border-r border-slate-700 text-purple-400 bg-purple-900/10">Rebonds</th>
                                        <th colSpan="4" className="p-1 text-center border-r border-slate-700 text-yellow-400 bg-yellow-900/10">Activité</th>
                                        <th colSpan="2" className="p-1 text-center text-green-400 bg-green-900/10">Impact</th>
                                    </>
                                ) : (
                                    <th colSpan="8" className="p-1 text-center text-indigo-400">Métriques Avancées</th>
                                )}
                            </tr>
                            <tr className="bg-slate-900 shadow-md">
                                <th className="p-3 sticky left-0 bg-slate-900 z-30 border-r border-slate-700 font-bold">Joueur</th>
                                <th className="p-3 text-center w-12 text-slate-400">MJ</th>
                                <th className="p-3 text-center w-12 border-r border-slate-700 text-slate-400">MIN</th>
                                {viewMode === 'classic' ? (
                                    <>
                                        <th className="p-3 text-center text-orange-400 font-bold bg-slate-800/50">PTS</th>
                                        <th className="p-3 text-center text-slate-400">TIR</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-slate-400">LF</th>
                                        
                                        <th className="p-3 text-center">FG%</th>
                                        <th className="p-3 text-center text-xs text-slate-500">2P%</th>
                                        <th className="p-3 text-center">3P%</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-slate-500">LF%</th>
                                        
                                        <th className="p-3 text-center font-bold">REB</th>
                                        <th className="p-3 text-center text-[10px] text-slate-500">RO</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-[10px] text-slate-500">RD</th>
                                        
                                        <th className="p-3 text-center">PD</th>
                                        <th className="p-3 text-center">INT</th>
                                        <th className="p-3 text-center">CTR</th>
                                        <th className="p-3 text-center border-r border-slate-700 text-red-400">BP</th>
                                        
                                        <th className="p-3 text-center">+/-</th>
                                        <th className="p-3 text-center font-black text-green-400">EVAL</th>
                                    </>
                                ) : (
                                    <>
                                        {/* Placeholders pour le mode avancé si non implémenté complètement */}
                                        <th className="p-3 text-center">TS%</th>
                                        <th className="p-3 text-center">eFG%</th>
                                        <th className="p-3 text-center">USG%</th>
                                        <th className="p-3 text-center">ORtg</th>
                                        <th className="p-3 text-center">DRtg</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {aggregated.map(p => (
                                <tr key={p.info.id} onClick={() => setSelectedPlayer(p)} className="hover:bg-slate-800 cursor-pointer transition-colors odd:bg-slate-900 even:bg-slate-800/40">
                                    <td className="p-3 font-medium text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">{p.info.number}</div>
                                            {p.info.name}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-slate-400">{p.gamesPlayed}</td>
                                    <td className="p-3 text-center border-r border-slate-800 text-slate-500">{p.avg.min}</td>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <td className="p-3 text-center font-bold text-orange-400 bg-orange-500/5">{p.avg.pts}</td>
                                           <td className="p-3 text-center text-xs text-slate-400">{p.stats.fgm+p.stats.threePM}-{p.stats.fga+p.stats.threePA}</td>
                                            <td className="p-3 text-center text-xs border-r border-slate-800 text-slate-500">{p.stats.ftm}-{p.stats.fta}</td>
                                            
                                            <td className={`p-3 text-center font-medium ${parseFloat(p.avg.fgPct)>=45?'text-green-400':parseFloat(p.avg.fgPct)<35?'text-red-400':'text-yellow-500'}`}>{p.avg.fgPct}%</td>
                                            <td className="p-3 text-center text-xs text-slate-600">{p.avg.twoPct}%</td>
                                            <td className={`p-3 text-center ${parseFloat(p.avg.threePct)>=33?'text-blue-400':'text-slate-500'}`}>{p.avg.threePct}%</td>
                                            <td className="p-3 text-center border-r border-slate-800 text-xs text-slate-500">{p.avg.ftPct}%</td>
                                            
                                            <td className="p-3 text-center font-bold text-white">{p.avg.reb}</td>
                                            <td className="p-3 text-center text-xs text-slate-600">{p.avg.oreb}</td>
                                            <td className="p-3 text-center text-xs text-slate-600 border-r border-slate-800">{p.avg.dreb}</td>
                                            
                                            <td className="p-3 text-center">{p.avg.ast}</td>
                                            <td className="p-3 text-center">{p.avg.stl}</td>
                                            <td className="p-3 text-center">{p.avg.blk}</td>
                                            <td className="p-3 text-center border-r border-slate-800 text-red-400">{p.avg.tov}</td>
                                            
                                            <td className={`p-3 text-center font-bold ${parseFloat(p.avg.plusMinus)>=0?'text-green-500':'text-red-500'}`}>{p.avg.plusMinus > 0 ? '+' : ''}{p.avg.plusMinus}</td>
                                            <td className="p-3 text-center font-black text-green-400 text-lg">{p.avg.eff}</td>
                                        </>
                                    ) : (
                                        <td colSpan="8" className="p-3 text-center text-slate-600 text-xs italic">Données avancées en développement</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* MODAL ANALYSE EQUIPE */}
            <Modal isOpen={showTeamTrends} onClose={() => setShowTeamTrends(false)} title={<><Icon path={Icons.TrendingUp} /> Analyse Saison & Facteurs Clés</>} size="max-w-6xl">
                <div className="space-y-6">
                    {/* EN-TÊTE BILAN */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-green-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Bilan Global</div>
                            <div className="text-3xl font-black text-white flex items-baseline gap-2">
                                {teamTrendsData.wins}V - {teamTrendsData.losses}D
                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${((teamTrendsData.wins/(teamTrendsData.wins+teamTrendsData.losses))*100) >= 50 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                    {((teamTrendsData.wins / (teamTrendsData.data.length||1))*100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Série actuelle: <span className="text-white font-bold">{teamTrendsData.streak}</span></div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-orange-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Moyenne Points</div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-3xl font-black text-white">{teamTrendsData.avgs.pts}</div>
                                    <div className="text-[10px] text-slate-400">Marqués</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-red-400">{teamTrendsData.avgs.conceded}</div>
                                    <div className="text-[10px] text-slate-400">Encaissés</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-blue-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Adresses (FG / 3PT / LF)</div>
                            <div className="grid grid-cols-3 gap-2 text-center h-full items-center">
                                <div><div className="text-xl font-bold text-white">{teamTrendsData.avgs.fgPct}%</div><div className="text-[10px] text-slate-500">Global</div></div>
                                <div className="border-x border-slate-700"><div className="text-xl font-bold text-blue-400">{teamTrendsData.avgs.threePct}%</div><div className="text-[10px] text-slate-500">3 Pts</div></div>
                                <div><div className="text-xl font-bold text-slate-300">{teamTrendsData.avgs.ftPct}%</div><div className="text-[10px] text-slate-500">Lancers</div></div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-purple-500 shadow-lg">
                            <div className="text-slate-400 text-xs uppercase mb-1 tracking-wider">Moyennes / Match</div>
                            <div className="grid grid-cols-4 gap-1 text-center text-sm h-full items-center">
                                <div><div className="font-bold text-white">{teamTrendsData.avgs.reb}</div><div className="text-[9px] text-slate-500">REB</div></div>
                                <div><div className="font-bold text-white">{teamTrendsData.avgs.ast}</div><div className="text-[9px] text-slate-500">PD</div></div>
                                <div><div className="font-bold text-white">{teamTrendsData.avgs.stl}</div><div className="text-[9px] text-slate-500">INT</div></div>
                                <div><div className="font-bold text-red-400">{teamTrendsData.avgs.tov}</div><div className="text-[9px] text-slate-500">BP</div></div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION ANALYSE DES DÉFAITES */}
                    {teamTrendsData.losses > 0 && teamTrendsData.analysis.length > 0 && (
                        <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl animate-fade-in">
                            <h3 className="text-red-400 font-bold uppercase text-sm mb-4 flex items-center gap-2">
                                <Icon path={Icons.TrendingUp} className="rotate-180 w-5 h-5" /> 
                                Analyse : Pourquoi perdons-nous ? (Différentiel Victoires vs Défaites)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {teamTrendsData.analysis.map((item, idx) => (
                                    <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex flex-col justify-between shadow-sm hover:border-red-800 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-slate-200 font-bold">{item.label}</div>
                                            <div className="bg-red-900/40 text-red-300 text-xs px-2 py-0.5 rounded uppercase font-bold">-{item.impact.toFixed(1)} {item.unit}</div>
                                        </div>
                                        
                                        <div className="space-y-2 mt-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Moy. en Victoire</span>
                                                <span className="text-green-400 font-mono">
                                                    {item.unit === '%' ? teamTrendsData.winAvgs[item.label.includes('3') ? 'threePct' : 'fgPct'] : 
                                                     item.label.includes('Défense') ? teamTrendsData.winAvgs.conceded :
                                                     item.label.includes('Attaque') ? teamTrendsData.winAvgs.pts :
                                                     item.label.includes('Pertes') ? teamTrendsData.winAvgs.tov :
                                                     item.label.includes('Rebonds') ? teamTrendsData.winAvgs.reb : teamTrendsData.winAvgs.ast}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Moy. en Défaite</span>
                                                <span className="text-red-400 font-mono">
                                                    {item.unit === '%' ? teamTrendsData.lossAvgs[item.label.includes('3') ? 'threePct' : 'fgPct'] : 
                                                     item.label.includes('Défense') ? teamTrendsData.lossAvgs.conceded :
                                                     item.label.includes('Attaque') ? teamTrendsData.lossAvgs.pts :
                                                     item.label.includes('Pertes') ? teamTrendsData.lossAvgs.tov :
                                                     item.label.includes('Rebonds') ? teamTrendsData.lossAvgs.reb : teamTrendsData.lossAvgs.ast}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="text-[10px] text-slate-500 mt-3 italic border-t border-slate-800 pt-2">
                                            {item.type === 'negative_more_is_bad' 
                                                ? "En défaite, nous concédons/perdons beaucoup plus de ballons/points." 
                                                : "En défaite, notre production s'effondre significativement."}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GRAPHIQUE NET RATING */}
                    <div className="h-64 bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-lg">
                         <h4 className="text-xs text-slate-400 uppercase mb-4 font-bold tracking-wider">Régularité (Net Rating par match)</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <ComposedChart data={teamTrendsData.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={60} tick={{fill: '#94a3b8'}} />
                                <YAxis stroke="#94a3b8" fontSize={10} tick={{fill: '#94a3b8'}} />
                                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                                <Tooltip 
                                    contentStyle={{backgroundColor:'#1e293b', border:'1px solid #475569', borderRadius:'8px', color: '#f8fafc'}} 
                                    itemStyle={{color: '#f8fafc'}}
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                />
                                <Bar dataKey="NetRtg" name="Différentiel Pts" radius={[4, 4, 0, 0]}>
                                    {teamTrendsData.data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.NetRtg >= 0 ? '#22c55e' : '#ef4444'} />))}
                                </Bar>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Modal>
            
            {/* Modal Joueur existante */}
           

{selectedPlayer && (
    <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={<><Icon path={Icons.Trophy} className="text-yellow-400" /> {selectedPlayer?.info.name}</>} size="max-w-5xl">
        <div className="space-y-6">

            {/* EN-TÊTE — 5 STATS CLÉS */}
            <div className="grid grid-cols-5 gap-2 bg-slate-900 p-4 rounded-lg">
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Points</div>
                    <div className="text-2xl font-black text-white">{selectedPlayer.avg.pts}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Rebonds</div>
                    <div className="text-2xl font-black text-white">{selectedPlayer.avg.reb}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Passes</div>
                    <div className="text-2xl font-black text-white">{selectedPlayer.avg.ast}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Éval</div>
                    <div className="text-2xl font-black text-green-400">{selectedPlayer.avg.eff}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase">+/-</div>
                    <div className={`text-2xl font-black ${parseFloat(selectedPlayer.avg.plusMinus) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(selectedPlayer.avg.plusMinus) > 0 ? '+' : ''}{selectedPlayer.avg.plusMinus}
                    </div>
                </div>
            </div>

            {/* MÉTRIQUES AVANCÉES — ORtg / DRtg / NetRtg / MIN */}
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

            {/* SHOOTING SPLITS */}
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

            {/* ACTIVITÉ — INT / CTR / BP / FTE */}
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

            {/* GRAPHIQUES */}
            {(selectedPlayer.logs || []).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <h4 className="text-xs text-slate-400 uppercase mb-2 font-bold">Scoring & Éval par match</h4>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedPlayer.logs}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} hide />
                                <YAxis stroke="#94a3b8" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="pts" name="Points" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
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
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} hide />
                                <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="ORtg" name="ORtg" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="DRtg" name="DRtg" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                <Legend />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            )}

            {/* GAME LOGS */}
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
    </Modal>
)}
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
                                <option value="NEW">+ Creer</option><option value="SKIP">Ignorer</option>
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

// --- MODALE DETAILS MATCH ---
function GameDetailsModal({ game, isOpen, onClose, players }) {
    if (!game) return null;
    const [viewMode, setViewMode] = useState('classic');

    const statsData = React.useMemo(() => {
        const pStats = game.playerStats || {};
        const opp = game.opponentStats || {};
        let T_FGM=0, T_FGA=0, T_3PM=0, T_FTM=0, T_FTA=0, T_ORB=0, T_DRB=0, T_AST=0, T_STL=0, T_BLK=0, T_TOV=0, T_PF=0, T_PTS=0, T_MP=0;
        Object.values(pStats).forEach(s => {
            T_FGM += (s.fgm||0)+(s.threePM||0); T_FGA += (s.fga||0)+(s.threePA||0); T_3PM += (s.threePM||0);
            T_FTM += (s.ftm||0); T_FTA += (s.fta||0); T_ORB += (s.oreb||0); T_DRB += (s.dreb||0);
            T_AST += (s.ast||0); T_STL += (s.stl||0); T_BLK += (s.blk||0); T_TOV += (s.tov||0);
            T_PF += (s.pf||0); T_PTS += (s.pts||0); T_MP += (s.minutes||0);
        });
        const O_PTS = game.awayScore||0;
        const O_FGM = opp.fgm||0; const O_FGA = opp.fga||(O_FGM+T_DRB);
        const O_FTM = opp.ftm||0; const O_FTA = opp.fta||0;
        const O_ORB = opp.oreb||0; const O_TRB = (opp.reb||(O_ORB+T_DRB));
        const O_TOV = opp.tov||0; const O_MP = T_MP;
        const Team_Poss = T_FGA + 0.44*T_FTA - T_ORB + T_TOV;
        const Team_ORtg = Team_Poss > 0 ? (T_PTS/Team_Poss)*100 : 0;
        const Team_DRtg = Team_Poss > 0 ? (O_PTS/Team_Poss)*100 : 0;

        const rawPlayers = Object.entries(pStats).map(([pid, s]) => {
            const hasActivity = (s.pts||0) > 0 || (s.fgm||0) > 0 || (s.fga||0) > 0 || (s.threePA||0) > 0 || (s.fta||0) > 0 || (s.oreb||0) > 0 || (s.dreb||0) > 0 || (s.ast||0) > 0 || (s.stl||0) > 0 || (s.blk||0) > 0 || (s.tov||0) > 0 || (s.pf||0) > 0 || (s.minutes||0) > 0;
            if (!hasActivity) return null;
            const MP = s.minutes||0;
            const FGM = (s.fgm||0)+(s.threePM||0); const FGA = (s.fga||0)+(s.threePA||0);
            const eFG = FGA > 0 ? ((FGM + 0.5*(s.threePM||0))/FGA)*100 : 0;
            const TS = (FGA + 0.44*(s.fta||0)) > 0 ? ((s.pts||0)/(2*(FGA + 0.44*(s.fta||0))))*100 : 0;
            const gamePIEDenom = (T_PTS + O_PTS) + (T_FGM + O_FGM) + (T_FTM + O_FTM) - (T_FGA + O_FGA) - (T_FTA + O_FTA) + (T_DRB + (O_TRB-O_ORB)) + (0.5 * (T_ORB + O_ORB)) + (T_AST + (opp.ast||0)) + (T_STL) + (0.5 * T_BLK) - (T_PF + (opp.fouls||0)) - (T_TOV + O_TOV);
            const playerPIENum = (s.pts||0) + FGM + (s.ftm||0) - FGA - (s.fta||0) + (s.dreb||0) + (0.5*(s.oreb||0)) + (s.ast||0) + (s.stl||0) + (0.5*(s.blk||0)) - (s.pf||0) - (s.tov||0);
            const pie = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;
            const evalStat = ((s.pts||0)+(s.oreb||0)+(s.dreb||0)+(s.ast||0)+(s.stl||0)+(s.blk||0)) - ((FGA-FGM)+((s.fta||0)-(s.ftm||0))+(s.tov||0));
            const player = players.find(p => p.id === parseInt(pid));
            return {
                id: pid, name: player ? player.name : `#${pid}`, minutes: MP,
                pts: s.pts||0, ast: s.ast||0, reb: (s.oreb||0)+(s.dreb||0), stl: s.stl||0, blk: s.blk||0, tov: s.tov||0, pf: s.pf||0,
                fgm: FGM, fga: FGA, twoPM: s.fgm||0, twoPA: s.fga||0, threePM: s.threePM||0, threePA: s.threePA||0,
                ftm: s.ftm||0, fta: s.fta||0, oreb: s.oreb||0, dreb: s.dreb||0,
                plusMinus: s.plusMinus||0, eFG: eFG.toFixed(1), TS: TS.toFixed(1), PIE: pie.toFixed(1), eff: evalStat
            };
        }).filter(p => p !== null);
        return { team: { poss: Team_Poss.toFixed(1), ORtg: Team_ORtg.toFixed(1), DRtg: Team_DRtg.toFixed(1), Net: (Team_ORtg-Team_DRtg).toFixed(1) }, players: rawPlayers };
    }, [game, players]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vs ${game.opponent}`} size="max-w-6xl">
            <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="lg:col-span-2 bg-slate-900 p-3 rounded-lg flex justify-between items-center border border-slate-700 relative overflow-hidden shadow-inner">
                        <div className="text-center z-10 w-1/3"><div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">Nous</div><div className="text-3xl md:text-5xl font-black text-green-400 leading-none mt-1">{game.homeScore}</div></div>
                        <div className="flex flex-col items-center z-10 px-2 text-center w-1/3 border-x border-slate-800"><div className="text-[10px] md:text-xs text-slate-500">{game.date}</div><div className="text-sm md:text-lg font-bold text-white uppercase tracking-wider leading-tight mt-1">{game.opponent}</div></div>
                        <div className="text-center z-10 w-1/3"><div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">Eux</div><div className="text-3xl md:text-5xl font-black text-red-400 leading-none mt-1">{game.awayScore}</div></div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-transparent to-red-500 opacity-50"></div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/50 flex flex-col justify-center">
                        <div className="text-[10px] text-slate-400 uppercase mb-2 text-center border-b border-slate-700 pb-1 font-semibold">Efficacite Collective</div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div className="flex justify-between items-end"><span className="text-slate-400 text-xs">Poss:</span> <span className="text-white font-mono font-bold">{statsData.team.poss}</span></div>
                            <div className="flex justify-between items-end"><span className="text-slate-400 text-xs">NetRtg:</span> <span className={`${parseFloat(statsData.team.Net)>=0?'text-green-400':'text-red-400'} font-mono font-bold text-xs`}>{statsData.team.Net}</span></div>
                            <div className="flex justify-between items-end"><span className="text-purple-300 text-xs">ORtg:</span> <span className="text-white font-mono">{statsData.team.ORtg}</span></div>
                            <div className="flex justify-between items-end"><span className="text-red-300 text-xs">DRtg:</span> <span className="text-white font-mono">{statsData.team.DRtg}</span></div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                        <h4 className="text-orange-400 font-bold text-sm uppercase flex items-center gap-2"><Icon path={Icons.Users} className="w-4 h-4"/> <span>Joueurs ({statsData.players.length})</span></h4>
                        <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 w-full sm:w-auto">
                            <button onClick={() => setViewMode('classic')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode==='classic'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Classique</button>
                            <button onClick={() => setViewMode('advanced')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode==='advanced'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Avance</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
                        <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-800 text-white uppercase font-semibold text-[10px] md:text-xs">
                                <tr>
                                    <th className="p-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Joueur</th>
                                    <th className="p-3 text-center">MIN</th>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <th className="p-3 text-center text-orange-400 font-bold">PTS</th>
                                            <th className="p-3 text-center">2PT</th><th className="p-3 text-center">3PT</th><th className="p-3 text-center">LF</th>
                                            <th className="p-3 text-center font-bold text-white">REB</th>
                                            <th className="p-3 text-center text-[10px]">RO</th><th className="p-3 text-center text-[10px]">RD</th>
                                            <th className="p-3 text-center">PD</th><th className="p-3 text-center">INT</th><th className="p-3 text-center">CTR</th>
                                            <th className="p-3 text-center text-red-400">BP</th><th className="p-3 text-center text-red-400">FTE</th>
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
                                            <th className="p-3 text-center text-yellow-400 font-bold border-l border-slate-700">+/-</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {statsData.players.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] truncate max-w-[100px] md:max-w-none">{p.name}</td>
                                        <td className="p-3 text-center text-slate-500 font-mono">{p.minutes}</td>
                                        {viewMode === 'classic' ? (
                                            <>
                                                <td className="p-3 text-center font-bold text-orange-400">{p.pts}</td>
                                                <td className="p-3 text-center">{p.twoPM}-{p.twoPA}</td>
                                                <td className="p-3 text-center">{p.threePM}-{p.threePA}</td>
                                                <td className="p-3 text-center">{p.ftm}-{p.fta}</td>
                                                <td className="p-3 text-center font-bold text-white">{p.reb}</td>
                                                <td className="p-3 text-center text-[10px] text-slate-500">{p.oreb}</td>
                                                <td className="p-3 text-center text-[10px] text-slate-500">{p.dreb}</td>
                                                <td className="p-3 text-center">{p.ast}</td>
                                                <td className="p-3 text-center">{p.stl}</td>
                                                <td className="p-3 text-center">{p.blk}</td>
                                                <td className="p-3 text-center text-red-400">{p.tov}</td>
                                                <td className="p-3 text-center text-red-400">{p.pf}</td>
                                                <td className={`p-3 text-center font-bold ${p.plusMinus>=0?'text-green-400':'text-red-400'}`}>{p.plusMinus>0?'+':''}{p.plusMinus}</td>
                                                <td className="p-3 text-center font-bold text-green-400">{p.eff}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-3 text-center font-bold text-orange-400">{p.pts}</td>
                                                <td className="p-3 text-center text-blue-300 font-mono">{p.eFG}%</td>
                                                <td className="p-3 text-center text-purple-300 font-mono">{p.TS}%</td>
                                                <td className="p-3 text-center text-cyan-400 font-mono font-bold">{p.PIE}%</td>
                                                <td className="p-3 text-center">{p.ast}</td>
                                                <td className="p-3 text-center text-red-400">{p.tov}</td>
                                                <td className={`p-3 text-center font-bold font-mono border-l border-slate-700 ${parseFloat(p.plusMinus)>=0?'text-green-400':'text-red-400'}`}>{parseFloat(p.plusMinus)>0?'+':''}{p.plusMinus}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Play-by-Play */}
                {game.actions && game.actions.length > 0 ? (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm text-orange-400 uppercase font-bold flex items-center gap-2"><span>&#128269;</span> Play-by-Play</h4>
                            <span className="text-xs text-slate-500">{game.actions.length} actions</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto bg-slate-900 rounded-lg border border-slate-700">
                            {game.actions.slice().reverse().map((a, i) => {
                                const isHome = a.pid < 1000;
                                const timeMin = Math.floor((a.time || 0) / 60);
                                const timeSec = (a.time || 0) % 60;
                                const timeStr = `Q${a.q || 1} ${timeMin}:${timeSec.toString().padStart(2, '0')}`;
                                let playerNum = '?', playerName = '';
                                if (isHome) { const player = players.find(p => p.id === a.pid); if (player) { playerNum = player.number; playerName = player.name; } }
                                else { if (game.opponentPlayerStats && game.opponentPlayerStats[a.pid]) { const op = game.opponentPlayerStats[a.pid]; playerNum = op.number || (a.pid - 1000); playerName = op.name || `Adv ${playerNum}`; } else { playerNum = a.pid - 1000; playerName = 'Adversaire'; } }
                                let icon = '', desc = a.type, color = 'text-slate-300';
                                if (a.type === 'SHOT') { icon = a.made ? '+' : 'x'; desc = `Tir ${a.val}pts ${a.made ? 'reussi' : 'rate'}`; if (a.astId) { const passer = players.find(p => p.id === a.astId); desc += passer ? ` (passe #${passer.number} ${passer.name})` : ` (passe #${a.astId})`; } color = a.made ? 'text-green-400' : 'text-red-400'; }
                                else if (a.type === 'OREB') { desc = 'Rebond offensif'; color = 'text-purple-400'; }
                                else if (a.type === 'DREB') { desc = 'Rebond defensif'; color = 'text-blue-400'; }
                                else if (a.type === 'STL') { desc = 'Interception'; color = 'text-yellow-400'; }
                                else if (a.type === 'BLK') { desc = 'Contre'; color = 'text-orange-400'; }
                                else if (a.type === 'TOV') { desc = 'Perte de balle'; color = 'text-red-400'; }
                                else if (a.type === 'FOUL') { let victimInfo = ''; if (a.victim) { if (a.victim < 1000) { const victim = players.find(p => p.id === a.victim); if (victim) victimInfo = `sur #${victim.number} ${victim.name}`; } else { victimInfo = `sur #${a.victim - 1000}`; } } desc = `Faute ${victimInfo}`; color = 'text-red-400'; }
                                else if (a.type === 'FT') { desc = `Lancers francs: ${a.ftMade||0}/${a.ftAtt||0}`; color = (a.ftMade||0) > 0 ? 'text-green-400' : 'text-slate-400'; }
                                else if (a.type === 'SUB') { let inPlayerInfo = ''; if (a.inId < 1000) { const inP = players.find(p => p.id === a.inId); if (inP) inPlayerInfo = `#${inP.number} ${inP.name}`; } else { inPlayerInfo = `#${a.inId - 1000}`; } desc = `Sort -> ${inPlayerInfo} entre`; color = 'text-cyan-400'; }
                                return (
                                    <div key={i} className={`flex items-center gap-3 px-3 py-2 border-b border-slate-800 text-xs hover:bg-slate-800/50 ${isHome ? 'border-l-2 border-l-blue-500' : 'border-l-2 border-l-red-500'}`}>
                                        <span className="text-slate-500 font-mono w-16 shrink-0 text-[10px]">{timeStr}</span>
                                        <span className={`font-bold shrink-0 ${isHome ? 'text-blue-400' : 'text-red-400'}`}>#{playerNum} <span className="font-normal text-slate-300">{playerName}</span></span>
                                        <span className={`flex-1 ${color} text-right`}>{desc}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 text-center text-slate-500 text-sm py-6 bg-slate-900/50 rounded-lg border border-slate-700/50">Match importe sans play-by-play detaille</div>
                )}
            </div>
        </Modal>
    );
}

// --- HISTORY ---
function History({ games, players, setGames, phases, onEditGame, onImportClick, onMultiImport, isAdmin }) {
    const [selectedGame, setSelectedGame] = useState(null);
    const [editingPBP, setEditingPBP] = useState(null);
    const sortedGames = useMemo(() => [...games].sort((a, b) => parseDate(b.date) - parseDate(a.date)), [games]);

    return (
        <div className="space-y-4 pb-20 md:pb-0">
            {isAdmin && (
                <div className="flex justify-end gap-2 no-print flex-wrap">
                    <a href="live.html" className="font-semibold rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"><Icon path={Icons.Play} /> Nouveau Match</a>
                    <Button variant="secondary" onClick={onMultiImport}><Icon path={Icons.Upload} /> Multi-Import</Button>
                    <Button variant="primary" onClick={onImportClick}><Icon path={Icons.Upload} /> Importer</Button>
                </div>
            )}
            {sortedGames.length === 0 && <div className="text-center text-slate-500 py-10">Aucun match enregistre</div>}
            {sortedGames.map(g => (
                <Card key={g.id} className="p-0 overflow-hidden group hover:border-orange-500/50 transition-colors">
                    <div className="flex justify-between items-stretch">
                        <div className="flex-1 p-3 md:p-4 cursor-pointer group-hover:bg-slate-800/80 transition-colors" onClick={() => setSelectedGame(g)}>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>{g.date}</span>
                                {g.phase && <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs">{phases.find(p => p.id === g.phase)?.name}</span>}
                            </div>
                            <div className="text-lg md:text-xl font-bold text-white mt-1">
                                <span className="text-green-400">{g.homeScore}</span> - <span className="text-red-400">{g.awayScore}</span>
                                <span className="text-slate-300 ml-2 text-base font-normal truncate max-w-[150px] md:max-w-none inline-block align-bottom">vs {g.opponent}</span>
                            </div>
                            <div className="text-xs text-orange-500/0 group-hover:text-orange-500 transition-all mt-2 flex items-center gap-1"><Icon path={Icons.Eye} className="w-3 h-3"/> Voir stats</div>
                        </div>
                        {isAdmin && (
                            <div className="flex flex-col justify-center gap-2 p-2 bg-slate-900/50 border-l border-slate-700">
                                {g.actions?.length > 0 && (<Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingPBP(g); }}><Icon path={Icons.Edit} /> PBP</Button>)}
                                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm("Supprimer ?")) { const newG = games.filter(x => x.id !== g.id); setGames(newG); if (window.db) saveDataToCloud(window.db, "games", newG); } }}><Icon path={Icons.Trash} /></Button>
                            </div>
                        )}
                    </div>
                </Card>
            ))}
            <GameDetailsModal game={selectedGame} isOpen={!!selectedGame} onClose={() => setSelectedGame(null)} players={players} />
            {editingPBP && window.PlayByPlayEditor && (
                <PlayByPlayEditor game={editingPBP} players={players}
                    onSave={async (updatedGame) => { const idx = games.findIndex(g => g.id === updatedGame.id); if (idx < 0) return; const newGames = [...games]; newGames[idx] = updatedGame; setGames(newGames); if (window.db) { await window.db.collection('team_data').doc('games').set({ list: newGames }); } setEditingPBP(null); }}
                    onClose={() => setEditingPBP(null)} />
            )}
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

// --- LOGIN MODAL ---
function LoginModal({ isOpen, onLogin, onClose }) {
    const [pwd, setPwd] = useState("");
    const [error, setError] = useState(false);
    if (!isOpen) return null;
    const handleLogin = () => { if (pwd === "coach2025") { onLogin(); onClose(); } else setError(true); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Acces Coach" size="max-w-sm">
            <div className="space-y-4 p-2">
                <p className="text-sm text-slate-400">Veuillez entrer le mot de passe.</p>
                <input type="password" className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 outline-none focus:border-orange-500" placeholder="Mot de passe..." value={pwd} onChange={(e) => { setPwd(e.target.value); setError(false); }} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
                {error && <div className="text-red-500 text-xs">Mot de passe incorrect</div>}
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={handleLogin}>Se connecter</Button></div>
            </div>
        </Modal>
    );
}

// --- MAIN APP ---
function App() {
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem('statchamp_admin') === 'true');
    const [showLogin, setShowLogin] = useState(false);
    const [view, setView] = useState("global_stats");
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
                database.collection("team_data").doc("roster").onSnapshot(doc => { if (doc.exists && doc.data().list) setPlayers(doc.data().list); else setPlayers(JSON.parse(localStorage.getItem('basket_players')) || defaultPlayers); setIsDataLoaded(true); });
                database.collection("team_data").doc("games").onSnapshot(doc => { if (doc.exists && doc.data().list) setGames(doc.data().list); else setGames(JSON.parse(localStorage.getItem('basket_games')) || []); });
                database.collection("team_data").doc("phases").onSnapshot(doc => { if (doc.exists && doc.data().list) setPhases(doc.data().list); });
            } catch (e) { console.error("Firebase:", e); setIsDataLoaded(true); }
        }
    }, [firebaseConfig]);

    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_players', JSON.stringify(players)); }, [players, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) localStorage.setItem('basket_games', JSON.stringify(games)); }, [games, isDataLoaded]);
    useEffect(() => { localStorage.setItem('basket_phases', JSON.stringify(phases)); }, [phases]);
    useEffect(() => { if (firebaseConfig) localStorage.setItem('basket_firebase_config', JSON.stringify(firebaseConfig)); }, [firebaseConfig]);

    const handleSaveGame = (gameState) => {
        if (!isAdmin) return;
        const gameId = activeGame?.id || generateId();
        const newGame = { ...gameState, id: gameId, date: activeGame?.date || new Date().toLocaleDateString() };
        const newGamesList = games.some(g => g.id === gameId) ? games.map(g => g.id === gameId ? newGame : g) : [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) saveDataToCloud(window.db, "games", newGamesList);
        setActiveGame(null); setView('history');
    };

    const handleUpdatePhases = (newPhases) => { if (!isAdmin) return; setPhases(newPhases); if (window.db && !isPlayerMode) saveDataToCloud(window.db, "phases", newPhases); };
    const handleSettingsUpdate = (newPlayers) => { if (!isAdmin) return; setPlayers(newPlayers); if (window.db && !isPlayerMode) saveDataToCloud(window.db, "roster", newPlayers); };
    const performLogin = () => { setIsAdmin(true); localStorage.setItem('statchamp_admin', 'true'); setView('live'); };
    const performLogout = () => { setIsAdmin(false); localStorage.removeItem('statchamp_admin'); setView('global_stats'); };
    const handleFileImport = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setImportData(parseHTMLStats(ev.target.result)); reader.readAsText(file); e.target.value = null; };
    const handleMultiFileImport = (e) => { const files = Array.from(e.target.files); if (files.length === 0) return; const queue = []; let processed = 0; files.forEach(file => { const reader = new FileReader(); reader.onload = (ev) => { queue.push(parseHTMLStats(ev.target.result)); processed++; if (processed === files.length) setMultiImportQueue(queue); }; reader.readAsText(file); }); e.target.value = null; };

    const confirmImport = async (newGame, updatedPlayers) => {
        setPlayers(updatedPlayers);
        const newGamesList = [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) {
            try { await saveDataToCloud(window.db, "roster", updatedPlayers); await saveDataToCloud(window.db, "games", newGamesList); alert("Importe !"); }
            catch (e) { console.error("Firebase write error:", e); alert("Erreur Firebase : " + e.message); }
        } else { alert("Importe (local uniquement)"); }
        setImportData(null); setView('history');
    };

    const confirmMultiImport = async (newGame, updatedPlayers) => {
        setPlayers(updatedPlayers);
        const newGamesList = [newGame, ...games];
        setGames(newGamesList);
        if (window.db && !isPlayerMode) {
            try { await saveDataToCloud(window.db, "roster", updatedPlayers); await saveDataToCloud(window.db, "games", newGamesList); alert("Importe !"); }
            catch (e) { console.error("Firebase write error:", e); alert("Erreur Firebase : " + e.message); }
        } else { alert("Importe (local uniquement)"); }
        setImportData(null); setView('history');
    };

    if (isPlayerMode) return <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col font-sans text-slate-200"><header className="h-16 bg-slate-900 flex items-center px-6"><h1 className="font-bold text-lg text-white">Stats</h1><span className="ml-auto text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Mode Joueur</span></header><div className="flex-1 p-4 overflow-y-auto"><GlobalStats players={players} games={games} phases={phases} /></div></div>;

    return (
        <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
            {isAdmin && (<><input type="file" accept=".html" id="html-upload" onChange={handleFileImport} className="hidden" /><input type="file" accept=".html" id="multi-upload" onChange={handleMultiFileImport} multiple className="hidden" /></>)}
            {importData && <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 10000 }}><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-4">Import</h2><ImportReviewModal importData={importData} currentPlayers={players} phases={phases} onConfirm={confirmImport} onCancel={() => setImportData(null)} /></div></div>}
            {multiImportQueue.length > 0 && <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 10000 }}><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-2">Multi-Import ({multiImportQueue.length} restant{multiImportQueue.length > 1 ? 's' : ''})</h2><ImportReviewModal importData={multiImportQueue[0]} currentPlayers={players} phases={phases} onConfirm={confirmMultiImport} onCancel={() => setMultiImportQueue([])} /></div></div>}
            <LoginModal isOpen={showLogin} onLogin={performLogin} onClose={() => setShowLogin(false)} />
            <nav className="bg-slate-900 border-r border-slate-800 w-full md:w-20 flex md:flex-col items-center justify-between md:pt-6 p-2 shrink-0" style={{ zIndex: 40 }}>
                <div className="flex md:flex-col items-center gap-2 md:gap-4 w-full justify-evenly md:justify-start">
                    <div className="mb-0 md:mb-4 p-2 bg-orange-600 rounded-xl text-white font-black text-xl cursor-default">BP</div>
                    <button onClick={() => setView("global_stats")} className={`p-3 rounded-xl transition-all ${view === "global_stats" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Stats"><Icon path={Icons.Chart} /></button>
                    {isAdmin && <button onClick={() => window.location.href = 'live.html'} className="p-3 rounded-xl transition-all text-slate-500 hover:text-orange-500 hover:bg-slate-800" title="Live Tracker"><Icon path={Icons.Play} /></button>}
                    <button onClick={() => setView("history")} className={`p-3 rounded-xl transition-all ${view === "history" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Historique"><Icon path={Icons.Clipboard} /></button>
                    {isAdmin && <button onClick={() => setView("settings")} className={`p-3 rounded-xl transition-all ${view === "settings" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Config"><Icon path={Icons.Settings} /></button>}
                </div>
                <div className="mt-auto hidden md:block pb-4">
                    {isAdmin ? <button onClick={performLogout} className="p-3 text-red-500 hover:bg-slate-800 rounded-xl" title="Deconnexion"><Icon path={Icons.Users} /></button> : <button onClick={() => setShowLogin(true)} className="p-3 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl" title="Connexion"><Icon path={Icons.Users} /></button>}
                </div>
                <div className="md:hidden">{isAdmin ? <button onClick={performLogout} className="p-3 text-red-500"><Icon path={Icons.Users} /></button> : <button onClick={() => setShowLogin(true)} className="p-3 text-slate-600"><Icon path={Icons.Users} /></button>}</div>
            </nav>
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0" style={{ zIndex: 30 }}>
                    <h1 className="font-bold text-lg text-white">{view === 'live' && "Live"}{view === 'global_stats' && "Stats"}{view === 'history' && "Historique"}{view === 'settings' && "Parametres"}</h1>
                    <div className="ml-auto flex items-center gap-3">
                        {!isAdmin && <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">Public</span>}
                        {isAdmin && <span className="text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Admin</span>}
                        {window.db && <span className="text-xs text-green-400 flex items-center gap-1"><Icon path={Icons.Cloud} className="w-3 h-3" /> Synchro</span>}
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto" style={{ zIndex: 10 }}>
                    {view === 'global_stats' && <GlobalStats players={players} games={games} phases={phases} isAdmin={isAdmin}/>}
                    {view === 'history' && <History games={games} players={players} setGames={setGames} phases={phases} isAdmin={isAdmin} onEditGame={(g) => { setActiveGame(g); setView('live'); }} onImportClick={() => document.getElementById('html-upload').click()} onMultiImport={() => document.getElementById('multi-upload').click()} />}
                    {view === 'settings' && isAdmin && <Settings players={players} onUpdatePlayers={handleSettingsUpdate} phases={phases} onUpdatePhases={handleUpdatePhases} firebaseConfig={firebaseConfig} setFirebaseConfig={setFirebaseConfig} />}
                    {!isAdmin && (view === 'live' || view === 'settings') && <div className="h-full flex flex-col items-center justify-center text-slate-500"><Icon path={Icons.Users} className="w-16 h-16 mb-4 opacity-20" /><p>Acces reserve au coach.</p><button onClick={() => setShowLogin(true)} className="mt-4 text-orange-500 hover:underline">Se connecter</button></div>}
                </div>
            </main>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);