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

// ===========================================
// FONCTIONS DE CALCUL DES RATINGS AVANCÉS
// ===========================================

const calculateIndividualRatings = (playerStats, teamStats, oppStats, avgMinutes = null, k = 1.5) => {
    const s = playerStats;
    const FGM = (s.fgm || 0) + (s.threePM || 0);
    const FGA = (s.fga || 0) + (s.threePA || 0);
    const FTM = s.ftm || 0, FTA = s.fta || 0;
    const ORB = s.oreb || 0, DRB = s.dreb || 0;
    const AST = s.ast || 0, STL = s.stl || 0, BLK = s.blk || 0;
    const TOV = s.tov || 0, PF = s.pf || 0, PTS = s.pts || 0;
    const MP = s.minutes || 1, threePM = s.threePM || 0;

    const Team_FGM = teamStats.fgm || 1, Team_FGA = teamStats.fga || 1;
    const Team_FTM = teamStats.ftm || 0, Team_FTA = teamStats.fta || 1;
    const Team_ORB = teamStats.oreb || 0, Team_DRB = teamStats.dreb || 0;
    const Team_AST = teamStats.ast || 0, Team_STL = teamStats.stl || 0;
    const Team_BLK = teamStats.blk || 0, Team_PTS = teamStats.pts || 1;
    const Team_TOV = teamStats.tov || 0, Team_PF = teamStats.pf || 1;
    const Team_MP = teamStats.minutes || 200, Team_3PM = teamStats.threePM || 0;

    const Opp_FGM = oppStats.fgm || Math.round((oppStats.pts || 0) / 2.2);
    const Opp_FGA = oppStats.fga || Math.round((oppStats.pts || 0) / 1.1);
    const Opp_FTM = oppStats.ftm || 0, Opp_FTA = oppStats.fta || 1;
    const Opp_ORB = oppStats.oreb || 0;
    const Opp_DRB = oppStats.dreb || Math.round((oppStats.reb || 0) * 0.7);
    const Opp_TRB = oppStats.reb || (Opp_ORB + Opp_DRB);
    const Opp_TOV = oppStats.tov || 0, Opp_PTS = oppStats.pts || 0;
    const Opp_MP = Team_MP;

    const Opp_DRB_calc = Opp_TRB - Opp_ORB;
    const Team_ORB_Pct = (Team_ORB + Opp_DRB_calc) > 0 ? Team_ORB / (Team_ORB + Opp_DRB_calc) : 0;
    const Team_Poss = Team_FGA + 0.4 * Team_FTA - 1.07 * Team_ORB_Pct * (Team_FGA - Team_FGM) + Team_TOV;
    const Team_FT_Part = Team_FTA > 0 ? (1 - Math.pow(1 - (Team_FTM / Team_FTA), 2)) * 0.4 * Team_FTA : 0;
    const Team_Scoring_Poss = Team_FGM + Team_FT_Part;
    const Team_Play_Pct = Team_Scoring_Poss / (Team_FGA + 0.4 * Team_FTA + Team_TOV || 1);
    const Team_ORB_Weight_Num = (1 - Team_ORB_Pct) * Team_Play_Pct;
    const Team_ORB_Weight_Denom = Team_ORB_Weight_Num + Team_ORB_Pct * (1 - Team_Play_Pct);
    const Team_ORB_Weight = Team_ORB_Weight_Denom > 0 ? Team_ORB_Weight_Num / Team_ORB_Weight_Denom : 0;

    const MP_Pct = MP / (Team_MP / 5 || 1);
    let qAST = 0;
    if (FGM > 0 && Team_FGM > FGM) {
        const qAST_Part1 = MP_Pct * (1.14 * ((Team_AST - AST) / (Team_FGM || 1)));
        const qAST_Part2_Num = ((Team_AST / (Team_MP || 1)) * MP * 5 - AST);
        const qAST_Part2_Denom = ((Team_FGM / (Team_MP || 1)) * MP * 5 - FGM) || 1;
        qAST = qAST_Part1 + (qAST_Part2_Num / qAST_Part2_Denom) * (1 - MP_Pct);
    }
    qAST = Math.max(0, Math.min(qAST, 1));

    const PTS_minus_FTM = PTS - FTM;
    const FG_Part = FGA > 0 ? FGM * (1 - 0.5 * (PTS_minus_FTM / (2 * FGA || 1)) * qAST) : 0;
    const Team_PTS_minus_FTM = Team_PTS - Team_FTM;
    const AST_Part = (Team_FGA - FGA) > 0 ? 0.5 * ((Team_PTS_minus_FTM - PTS_minus_FTM) / (2 * (Team_FGA - FGA) || 1)) * AST : 0;
    const FT_Part = FTA > 0 ? (1 - Math.pow(1 - (FTM / FTA), 2)) * 0.4 * FTA : 0;
    const ORB_Part = ORB * Team_ORB_Weight * Team_Play_Pct;
    const ScPoss_Factor = Team_Scoring_Poss > 0 ? (1 - (Team_ORB / Team_Scoring_Poss) * Team_ORB_Weight * Team_Play_Pct) : 1;
    const ScPoss = (FG_Part + AST_Part + FT_Part) * ScPoss_Factor + ORB_Part;
    const FGxPoss = (FGA - FGM) * (1 - 1.07 * Team_ORB_Pct);
    const FTxPoss = FTA > 0 ? Math.pow(1 - (FTM / FTA), 2) * 0.4 * FTA : 0;
    const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;

    const PProd_FG_Part = FGA > 0 ? 2 * (FGM + 0.5 * threePM) * (1 - 0.5 * (PTS_minus_FTM / (2 * FGA || 1)) * qAST) : 0;
    let PProd_AST_Part = 0;
    if ((Team_FGM - FGM) > 0 && (Team_FGA - FGA) > 0) {
        const assist_factor = 2 * ((Team_FGM - FGM + 0.5 * (Team_3PM - threePM)) / (Team_FGM - FGM || 1));
        PProd_AST_Part = assist_factor * 0.5 * ((Team_PTS_minus_FTM - PTS_minus_FTM) / (2 * (Team_FGA - FGA) || 1)) * AST;
    }
    const Team_Pts_Per_Score = Team_Scoring_Poss > 0 ? Team_PTS / Team_Scoring_Poss : 2;
    const PProd_ORB_Part = ORB * Team_ORB_Weight * Team_Play_Pct * Team_Pts_Per_Score;
    const PProd = (PProd_FG_Part + PProd_AST_Part + FTM) * ScPoss_Factor + PProd_ORB_Part;
    const ORtg_ind = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;

    const DOR_Pct = (Opp_ORB + Team_DRB) > 0 ? Opp_ORB / (Opp_ORB + Team_DRB) : 0;
    const DFG_Pct = Opp_FGA > 0 ? Opp_FGM / Opp_FGA : 0.45;
    const FMwt_Num = DFG_Pct * (1 - DOR_Pct);
    const FMwt_Denom = DFG_Pct * (1 - DOR_Pct) + (1 - DFG_Pct) * DOR_Pct;
    const FMwt = FMwt_Denom > 0 ? FMwt_Num / FMwt_Denom : 0.5;
    const Stops1 = STL + BLK * FMwt * (1 - 1.07 * DOR_Pct) + DRB * (1 - FMwt);
    const Opp_Missed_FG = Opp_FGA - Opp_FGM;
    const Stops2_Part1 = Team_MP > 0 ? ((Opp_Missed_FG - Team_BLK) / Team_MP) * FMwt * (1 - 1.07 * DOR_Pct) : 0;
    const Stops2_Part2 = Team_MP > 0 ? ((Opp_TOV - Team_STL) / Team_MP) : 0;
    const Stops2_Part3 = Team_PF > 0 && Opp_FTA > 0 ? (PF / Team_PF) * 0.4 * Opp_FTA * Math.pow(1 - (Opp_FTM / Opp_FTA), 2) : 0;
    const Stops2 = (Stops2_Part1 + Stops2_Part2) * MP + Stops2_Part3;
    const Stops = Stops1 + Stops2;
    const Stop_Pct = (Team_Poss * MP) > 0 ? (Stops * Opp_MP) / (Team_Poss * MP) : 0;
    const Team_DRtg = Team_Poss > 0 ? 100 * (Opp_PTS / Team_Poss) : 100;
    const Opp_FT_Scoring = Opp_FTA > 0 ? (1 - Math.pow(1 - (Opp_FTM / Opp_FTA), 2)) * 0.4 * Opp_FTA : 0;
    const Opp_Scoring_Poss = Opp_FGM + Opp_FT_Scoring;
    const D_Pts_per_ScPoss = Opp_Scoring_Poss > 0 ? Opp_PTS / Opp_Scoring_Poss : 2;
    const DRtg_ind = Team_DRtg + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg);

    const Team_ORtg = Team_Poss > 0 ? 100 * (Team_PTS / Team_Poss) : 100;
    const Min_moy = avgMinutes || (Team_MP / 5);
    const C = k * Min_moy;
    const weight = MP / (MP + C);
    const ORtg = Team_ORtg + (ORtg_ind - Team_ORtg) * weight;
    const DRtg = Team_DRtg + (DRtg_ind - Team_DRtg) * weight;

    return {
        ORtg: isFinite(ORtg) ? ORtg : Team_ORtg,
        DRtg: isFinite(DRtg) ? DRtg : Team_DRtg,
        netRtg: isFinite(ORtg - DRtg) ? ORtg - DRtg : 0,
        Team_ORtg, Team_DRtg
    };
};

const aggregateTeamStats = (playerStats) => {
    const team = { fgm: 0, fga: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, pts: 0, minutes: 0, threePM: 0 };
    Object.values(playerStats).forEach(s => {
        team.fgm += (s.fgm || 0) + (s.threePM || 0);
        team.fga += (s.fga || 0) + (s.threePA || 0);
        team.ftm += s.ftm || 0; team.fta += s.fta || 0;
        team.oreb += s.oreb || 0; team.dreb += s.dreb || 0;
        team.ast += s.ast || 0; team.stl += s.stl || 0;
        team.blk += s.blk || 0; team.tov += s.tov || 0;
        team.pf += s.pf || 0; team.pts += s.pts || 0;
        team.minutes += s.minutes || 0; team.threePM += s.threePM || 0;
    });
    return team;
};

const prepareOpponentStats = (oppStats, awayScore) => {
    const pts = awayScore || oppStats.pts || 0;
    return {
        pts, fgm: oppStats.fgm || Math.round(pts / 2.2), fga: oppStats.fga || Math.round(pts / 1.1),
        ftm: oppStats.ftm || 0, fta: oppStats.fta || Math.max(1, Math.round(pts * 0.2)),
        oreb: oppStats.oreb || 0, dreb: oppStats.reb ? Math.round(oppStats.reb * 0.7) : Math.round(pts * 0.3),
        reb: oppStats.reb || Math.round(pts * 0.4), tov: oppStats.tov || Math.round(pts * 0.1), fouls: oppStats.fouls || 0
    };
};

const calculateAverageMinutes = (playerStats) => {
    const active = Object.values(playerStats).filter(s => (s.minutes || 0) > 0);
    if (active.length === 0) return 20;
    return active.reduce((sum, s) => sum + (s.minutes || 0), 0) / active.length;
};

// ==========================================
const { useState, useEffect, useMemo } = React;
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area } = window.Recharts || {};

const generateId = () => Math.random().toString(36).substr(2, 9);
const defaultPlayers = [{ id: 1, name: "Joueur 1", number: 4, pos: "PG" }, { id: 2, name: "Joueur 2", number: 5, pos: "SG" }];
const DEFAULT_PHASES = [{ id: "phase1", name: "Phase 1" }, { id: "phase2", name: "Phase 2" }];

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
            if (type === 'FGM2') { ps.pts += 2; ps.fgm++; ps.fga++; home += 2; ptsScored = 2; }
            if (type === 'FGA2') ps.fga++;
            if (type === 'FGM3') { ps.pts += 3; ps.fgm++; ps.fga++; ps.threePM++; ps.threePA++; home += 3; ptsScored = 3; }
            if (type === 'FGA3') { ps.fga++; ps.threePA++; }
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
    if (!db) return;
    db.collection("team_data").doc(collection).set({ list: data }).catch(e => console.error(e));
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

// ✅ MODAL CORRIGÉ
// ✅ MODAL RESPONSIVE
const Modal = ({ isOpen, onClose, title, children, size = "max-w-4xl" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" style={{ zIndex: 99999 }}>
            <div className={`bg-slate-800 rounded-xl border border-slate-600 w-full ${size} shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2 truncate pr-2">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl sm:text-3xl leading-none cursor-pointer shrink-0 w-8 h-8 flex items-center justify-center">&times;</button>
                </div>
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>
            </div>
        </div>
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
            if (nameCell.includes(opponentName)) { opponentStats = { pts: parseInt(cells[16].textContent) || 0, reb: (parseInt(cells[7].textContent) || 0) + (parseInt(cells[8].textContent) || 0), ast: parseInt(cells[13].textContent) || 0, tov: parseInt(cells[11].textContent) || 0, fouls: parseInt(cells[9].textContent) || 0, oreb: parseInt(cells[7].textContent) || 0 }; return; }
            if (!nameCell.startsWith('#')) return;
            const parts = nameCell.split(' ');
            const number = parseInt(parts[0].replace('#', ''));
            const name = parts.slice(1).join(' ');
            const parseSplit = (txt) => { if (!txt || txt === '-') return { made: 0, att: 0 }; const [m, a] = txt.split('-'); return { made: parseInt(m) || 0, att: parseInt(a) || 0 }; };
            const fg = parseSplit(cells[1].textContent), tp = parseSplit(cells[3].textContent), ft = parseSplit(cells[5].textContent);
            const stats = { fgm: fg.made - tp.made, fga: fg.att - tp.att, ftm: ft.made, fta: ft.att, pts: parseInt(cells[16].textContent) || 0, reb: (parseInt(cells[7].textContent) || 0) + (parseInt(cells[8].textContent) || 0), oreb: parseInt(cells[7].textContent) || 0, dreb: parseInt(cells[8].textContent) || 0, ast: parseInt(cells[13].textContent) || 0, stl: parseInt(cells[10].textContent) || 0, blk: parseInt(cells[12].textContent) || 0, tov: parseInt(cells[11].textContent) || 0, pf: parseInt(cells[9].textContent) || 0, minutes: parseInt(cells[15].textContent) || 0, plusMinus: parseInt(cells[14].textContent) || 0, threePM: tp.made, threePA: tp.att };
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
            <Modal isOpen={modal.type === "CONSEQ_TOV"} onClose={() => setModal({ type: null })} title="Conséquence ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_2" })} className="bg-red-600">Adv +2</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "score_3" })} className="bg-red-600">Adv +3</Button><Button onClick={() => registerAction("TOV", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "CONSEQ_STL"} onClose={() => setModal({ type: null })} title="Suite ?" size="max-w-sm"><div className="flex flex-col gap-2"><Button onClick={() => registerAction("STL", modal.data, { consequence: "score_2" })} className="bg-green-600">Nous +2</Button><Button onClick={() => registerAction("STL", modal.data, { consequence: "none" })} className="bg-slate-600">Rien</Button></div></Modal>
            <Modal isOpen={modal.type === "STATS"} onClose={() => setModal({ type: null })} title="Stats Live"><table className="w-full text-left text-xs text-slate-300"><thead className="bg-slate-700 text-white"><tr><th className="p-2">Joueur</th><th className="p-2">Pts</th><th className="p-2">+/-</th><th className="p-2">Fte</th></tr></thead><tbody className="divide-y divide-slate-700">{players.map(p => { const s = derived.playerStats[p.id] || {}; return <tr key={p.id}><td className="p-2 font-bold">{p.name}</td><td className="p-2">{s.pts}</td><td className={`p-2 font-bold ${s.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.plusMinus}</td><td className="p-2 text-red-400">{s.pf}</td></tr>; })}</tbody></table></Modal>
        </div>
    );
}

// --- GLOBAL STATS COMPLET ---
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

    // CALCUL COMPLET DES STATS AGRÉGÉES
    const aggregated = useMemo(() => {
        const stats = {};
        players.forEach(p => {
            stats[p.id] = { info: p, gamesPlayed: 0, total: { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, eff: 0, fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, pf: 0, plusMinus: 0, pie: 0 }, totalMinPlayed: 0, weightedORtg: 0, weightedDRtg: 0, logs: [], records: { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, eff: 0 } };
        });

        filteredGames.forEach(g => {
            let gamePTS = 0, gameFGM = 0, gameFTM = 0, gameFGA = 0, gameFTA = 0, gameDRB = 0, gameORB = 0, gameAST = 0, gameSTL = 0, gameBLK = 0, gamePF = 0, gameTO = 0;
            let teamFGA = 0, teamFTA = 0, teamORB = 0, teamTO = 0, teamPTS = 0;

            Object.values(g.playerStats || {}).forEach(s => {
                gamePTS += s.pts || 0; gameFGM += (s.fgm || 0) + (s.threePM || 0); gameFTM += s.ftm || 0;
                gameFGA += (s.fga || 0) + (s.threePA || 0); gameFTA += s.fta || 0;
                gameDRB += s.dreb || 0; gameORB += s.oreb || 0; gameAST += s.ast || 0;
                gameSTL += s.stl || 0; gameBLK += s.blk || 0; gamePF += s.pf || 0; gameTO += s.tov || 0;
                teamFGA += (s.fga || 0) + (s.threePA || 0); teamFTA += s.fta || 0;
                teamORB += s.oreb || 0; teamTO += s.tov || 0; teamPTS += s.pts || 0;
            });

            const opp = g.opponentStats || {};
            const oppPTS = g.awayScore || 0;
            gamePTS += oppPTS; gameFGM += opp.fgm || Math.round(oppPTS / 2.2);
            gameFTM += opp.ftm || 0; gameFGA += opp.fga || Math.round(oppPTS / 1.1);
            gameFTA += opp.fta || 0; gameDRB += opp.reb ? Math.round(opp.reb * 0.7) : 0;
            gameORB += opp.oreb || 0; gameAST += opp.ast || 0; gameBLK += opp.blk || 0;
            gamePF += opp.fouls || 0; gameTO += opp.tov || 0;

            const gamePIEDenom = gamePTS + gameFGM + gameFTM - gameFGA - gameFTA + gameDRB + (0.5 * gameORB) + gameAST + gameSTL + (0.5 * gameBLK) - gamePF - gameTO;
            const teamPoss = teamFGA + 0.44 * teamFTA - teamORB + teamTO;
            const teamORtg = teamPoss > 0 ? (teamPTS / teamPoss) * 100 : 100;
            const teamDRtg = teamPoss > 0 ? (oppPTS / teamPoss) * 100 : 100;

            // Stats équipe pour le calcul des ratings individuels
            const teamStatsForCalc = {
                fgm: 0, fga: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0,
                ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, pts: 0, minutes: 0, threePM: 0
            };
            Object.values(g.playerStats || {}).forEach(ps => {
                teamStatsForCalc.fgm += (ps.fgm || 0) + (ps.threePM || 0);
                teamStatsForCalc.fga += (ps.fga || 0) + (ps.threePA || 0);
                teamStatsForCalc.ftm += ps.ftm || 0;
                teamStatsForCalc.fta += ps.fta || 0;
                teamStatsForCalc.oreb += ps.oreb || 0;
                teamStatsForCalc.dreb += ps.dreb || 0;
                teamStatsForCalc.ast += ps.ast || 0;
                teamStatsForCalc.stl += ps.stl || 0;
                teamStatsForCalc.blk += ps.blk || 0;
                teamStatsForCalc.tov += ps.tov || 0;
                teamStatsForCalc.pf += ps.pf || 0;
                teamStatsForCalc.pts += ps.pts || 0;
                teamStatsForCalc.minutes += ps.minutes || 0;
                teamStatsForCalc.threePM += ps.threePM || 0;
            });

            const oppStatsForCalc = {
                pts: g.awayScore || 0,
                fgm: opp.fgm || Math.round((g.awayScore || 0) / 2.2),
                fga: opp.fga || Math.round((g.awayScore || 0) / 1.1),
                ftm: opp.ftm || 0,
                fta: opp.fta || Math.max(1, Math.round((g.awayScore || 0) * 0.2)),
                oreb: opp.oreb || 0,
                dreb: opp.reb ? Math.round(opp.reb * 0.7) : Math.round((g.awayScore || 0) * 0.3),
                reb: opp.reb || Math.round((g.awayScore || 0) * 0.4),
                tov: opp.tov || Math.round((g.awayScore || 0) * 0.1)
            };

            const avgMin = teamStatsForCalc.minutes / Math.max(1, Object.values(g.playerStats || {}).filter(ps => (ps.minutes || 0) > 0).length);

            Object.entries(g.playerStats || {}).forEach(([pid, s]) => {
                const id = parseInt(pid);
                if ((s.minutes || 0) > 0 && stats[id]) {
                    const t = stats[id].total;
                    const playerMin = s.minutes || 0;
                    stats[id].gamesPlayed++; 
                    stats[id].totalMinPlayed += playerMin;
                    stats[id].weightedORtg += teamORtg * playerMin;
                    stats[id].weightedDRtg += teamDRtg * playerMin;

                    t.pts += s.pts || 0; t.reb += s.reb || 0; t.oreb += s.oreb || 0; t.dreb += s.dreb || 0;
                    t.ast += s.ast || 0; t.stl += s.stl || 0; t.blk += s.blk || 0; t.tov += s.tov || 0;
                    t.min += playerMin; t.fgm += s.fgm || 0; t.fga += s.fga || 0;
                    t.threePM += s.threePM || 0; t.threePA += s.threePA || 0;
                    t.ftm += s.ftm || 0; t.fta += s.fta || 0; t.pf += s.pf || 0; t.plusMinus += s.plusMinus || 0;

                    const playerFGA = (s.fga || 0) + (s.threePA || 0);
                    const playerFGM = (s.fgm || 0) + (s.threePM || 0);
                    const evalStat = ((s.pts || 0) + (s.reb || 0) + (s.ast || 0) + (s.stl || 0) + (s.blk || 0)) - ((playerFGA - playerFGM) + ((s.fta || 0) - (s.ftm || 0)) + (s.tov || 0));
                    t.eff += evalStat;

                    const playerPIENum = (s.pts || 0) + playerFGM + (s.ftm || 0) - playerFGA - (s.fta || 0) + (s.dreb || 0) + (0.5 * (s.oreb || 0)) + (s.ast || 0) + (s.stl || 0) + (0.5 * (s.blk || 0)) - (s.pf || 0) - (s.tov || 0);
                    const playerPIE = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;
                    t.pie += playerPIE;

                    if ((s.pts || 0) > stats[id].records.pts) stats[id].records.pts = s.pts || 0;
                    if ((s.reb || 0) > stats[id].records.reb) stats[id].records.reb = s.reb || 0;
                    if ((s.ast || 0) > stats[id].records.ast) stats[id].records.ast = s.ast || 0;
                    if ((s.stl || 0) > stats[id].records.stl) stats[id].records.stl = s.stl || 0;
                    if ((s.blk || 0) > stats[id].records.blk) stats[id].records.blk = s.blk || 0;
                    if (evalStat > stats[id].records.eff) stats[id].records.eff = evalStat;

                    const gameEFG = playerFGA > 0 ? ((playerFGM + 0.5 * (s.threePM || 0)) / playerFGA) * 100 : 0;
                    const gameTS = (playerFGA + 0.44 * (s.fta || 0)) > 0 ? ((s.pts || 0) / (2 * (playerFGA + 0.44 * (s.fta || 0)))) * 100 : 0;

                    // Calcul des ratings individuels
                    const playerRatings = calculateIndividualRatings(s, teamStatsForCalc, oppStatsForCalc, avgMin, 1.5);

                    stats[id].logs.push({ 
                        date: g.date, 
                        opponent: g.opponent, 
                        pts: s.pts || 0, 
                        reb: s.reb || 0, 
                        ast: s.ast || 0, 
                        stl: s.stl || 0, 
                        blk: s.blk || 0, 
                        tov: s.tov || 0, 
                        eff: evalStat, 
                        eFG: gameEFG.toFixed(1), 
                        TS: gameTS.toFixed(1), 
                        ORtg: playerRatings.ORtg.toFixed(1),
                        DRtg: playerRatings.DRtg.toFixed(1),
                        PIE: playerPIE.toFixed(1), 
                        min: s.minutes || 0
                    });
                }
            });
        });

        return Object.values(stats).map(p => {
            const gp = p.gamesPlayed || 1, t = p.total, totalMin = p.totalMinPlayed || 1;
            const totalFGA = t.fga + t.threePA, totalFGM = t.fgm + t.threePM;
            const eFG = totalFGA > 0 ? (((totalFGM + 0.5 * t.threePM) / totalFGA) * 100).toFixed(1) : "0.0";
            const ts = (totalFGA + 0.44 * t.fta) > 0 ? ((t.pts / (2 * (totalFGA + 0.44 * t.fta))) * 100).toFixed(1) : "0.0";
            return { ...p, avg: { min: (t.min / gp).toFixed(1), pts: (t.pts / gp).toFixed(1), reb: (t.reb / gp).toFixed(1), ast: (t.ast / gp).toFixed(1), stl: (t.stl / gp).toFixed(1), blk: (t.blk / gp).toFixed(1), tov: (t.tov / gp).toFixed(1), pf: (t.pf / gp).toFixed(1), plusMinus: (t.plusMinus / gp).toFixed(1), eff: (t.eff / gp).toFixed(1), fgm: totalFGM, fga: totalFGA, fgPct: totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : "0.0", threePM: t.threePM, threePA: t.threePA, threePct: t.threePA > 0 ? ((t.threePM / t.threePA) * 100).toFixed(1) : "0.0", ftm: t.ftm, fta: t.fta, ftPct: t.fta > 0 ? ((t.ftm / t.fta) * 100).toFixed(1) : "0.0", eFG, TS: ts, ORtg: (p.weightedORtg / totalMin).toFixed(1), DRtg: (p.weightedDRtg / totalMin).toFixed(1), netRtg: ((p.weightedORtg - p.weightedDRtg) / totalMin).toFixed(1), PIE: (t.pie / gp).toFixed(1) } };
        }).filter(p => p.gamesPlayed > 0);
    }, [players, filteredGames]);

    // TEAM TRENDS DATA
    const teamTrendsData = useMemo(() => {
        const parseFrenchDate = (dateStr) => {
            const months = { 'janv': 0, 'févr': 1, 'mars': 2, 'avr': 3, 'mai': 4, 'juin': 5, 'juil': 6, 'août': 7, 'sept': 8, 'oct': 9, 'nov': 10, 'déc': 11 };
            const match = dateStr.match(/(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})/i);
            if (match) return new Date(match[3], months[match[2].toLowerCase().replace('.', '')] || 0, match[1]);
            return new Date(dateStr);
        };
        return filteredGames.map(g => {
            let totalPts = 0, totalFGA = 0, totalFTA = 0, totalTOV = 0, totalORB = 0;
            Object.values(g.playerStats || {}).forEach(s => { totalPts += s.pts || 0; totalFGA += (s.fga || 0) + (s.threePA || 0); totalFTA += s.fta || 0; totalTOV += s.tov || 0; totalORB += s.oreb || 0; });
            const totalPoss = totalFGA + 0.44 * totalFTA - totalORB + totalTOV;
            const ortg = totalPoss > 0 ? (totalPts / totalPoss) * 100 : 0;
            const drtg = totalPoss > 0 ? ((g.awayScore || 0) / totalPoss) * 100 : 100;
            return { date: g.date, dateTs: parseFrenchDate(g.date).getTime(), opponent: g.opponent, ORtg: parseFloat(ortg.toFixed(1)), DRtg: parseFloat(drtg.toFixed(1)), NetRtg: parseFloat((ortg - drtg).toFixed(1)), score: g.homeScore, conceded: g.awayScore };
        }).sort((a, b) => a.dateTs - b.dateTs);
    }, [filteredGames]);

    // HEATMAP DATA
    const heatmapData = useMemo(() => {
        const categories = [{ key: 'pts', label: 'PTS' }, { key: 'reb', label: 'REB' }, { key: 'ast', label: 'AST' }, { key: 'stl', label: 'INT' }, { key: 'eFG', label: 'eFG%' }, { key: 'TS', label: 'TS%' }, { key: 'ORtg', label: 'ORtg' }, { key: 'DRtg', label: 'DRtg', inverse: true }, { key: 'PIE', label: 'PIE' }];
        const maxValues = {}, minValues = {};
        categories.forEach(cat => { const values = aggregated.map(p => parseFloat(p.avg[cat.key]) || 0); maxValues[cat.key] = Math.max(...values, 1); minValues[cat.key] = Math.min(...values, 0); });
        return { categories, maxValues, minValues, players: aggregated };
    }, [aggregated]);

    // RADAR DATA
    const getRadarData = (p1, p2) => {
        if (!p1 || !p2) return [];
        const cats = [{ key: 'pts', label: 'PTS' }, { key: 'reb', label: 'REB' }, { key: 'ast', label: 'AST' }, { key: 'stl', label: 'INT' }, { key: 'eFG', label: 'eFG%' }, { key: 'PIE', label: 'PIE' }];
        return cats.map(cat => {
            const v1 = parseFloat(p1.avg[cat.key]) || 0, v2 = parseFloat(p2.avg[cat.key]) || 0;
            const maxVal = Math.max(v1, v2, 1);
            return { category: cat.label, score1: (v1 / maxVal) * 100, score2: (v2 / maxVal) * 100, real1: v1, real2: v2, name1: p1.info.name, name2: p2.info.name };
        });
    };

    // Fonction pour parser les dates françaises
    const parseFrenchDate = (d) => { 
        const months = {'janv':0,'févr':1,'mars':2,'avr':3,'mai':4,'juin':5,'juil':6,'août':7,'sept':8,'oct':9,'nov':10,'déc':11}; 
        const m = d.match(/(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})/i); 
        return m ? new Date(m[3], months[m[2].toLowerCase().replace('.','')]||0, m[1]) : new Date(d); 
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <Card className="p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant={viewMode === 'classic' ? 'primary' : 'secondary'} onClick={() => setViewMode('classic')}>📊 Classique</Button>
                        <Button size="sm" variant={viewMode === 'advanced' ? 'primary' : 'secondary'} onClick={() => setViewMode('advanced')}>🧠 Avancé</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowHeatmap(true)}><Icon path={Icons.Target} /> Heatmap</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowComparison(true)}><Icon path={Icons.Users} /> Comparer</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowTeamTrends(true)}><Icon path={Icons.TrendingUp} /> Tendances</Button>
                    </div>
                    <div className="flex items-center gap-2">
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

            {/* MODAL DÉTAIL JOUEUR */}
            <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={selectedPlayer ? `🏆 ${selectedPlayer.info.name}` : ""}>
                {selectedPlayer && (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Stats moyennes - responsive */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 bg-slate-900 p-3 sm:p-4 rounded-lg">
                            <div className="text-center"><div className="text-[10px] sm:text-xs text-slate-500">Points</div><div className="text-lg sm:text-2xl font-bold text-white">{selectedPlayer.avg.pts}</div></div>
                            <div className="text-center"><div className="text-[10px] sm:text-xs text-slate-500">Rebonds</div><div className="text-lg sm:text-2xl font-bold text-white">{selectedPlayer.avg.reb}</div></div>
                            <div className="text-center"><div className="text-[10px] sm:text-xs text-slate-500">Passes</div><div className="text-lg sm:text-2xl font-bold text-white">{selectedPlayer.avg.ast}</div></div>
                            <div className="text-center hidden sm:block"><div className="text-[10px] sm:text-xs text-slate-500">Éval</div><div className="text-lg sm:text-2xl font-bold text-green-400">{selectedPlayer.avg.eff}</div></div>
                            <div className="text-center hidden sm:block"><div className="text-[10px] sm:text-xs text-slate-500">PIE</div><div className="text-lg sm:text-2xl font-bold text-cyan-400">{selectedPlayer.avg.PIE}%</div></div>
                        </div>
                        {/* Stats supplémentaires visibles uniquement sur mobile */}
                        <div className="grid grid-cols-2 gap-2 sm:hidden bg-slate-900 p-3 rounded-lg">
                            <div className="text-center"><div className="text-[10px] text-slate-500">Éval</div><div className="text-lg font-bold text-green-400">{selectedPlayer.avg.eff}</div></div>
                            <div className="text-center"><div className="text-[10px] text-slate-500">PIE</div><div className="text-lg font-bold text-cyan-400">{selectedPlayer.avg.PIE}%</div></div>
                        </div>
            
                        {/* Records et Efficacité - responsive */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-slate-900 p-3 sm:p-4 rounded-lg">
                                <h4 className="text-xs sm:text-sm font-bold text-orange-400 mb-2 sm:mb-3">Records Personnels</h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">PTS</div><div className="text-base sm:text-lg font-bold">{selectedPlayer.records.pts}</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">REB</div><div className="text-base sm:text-lg font-bold">{selectedPlayer.records.reb}</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">AST</div><div className="text-base sm:text-lg font-bold">{selectedPlayer.records.ast}</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">INT</div><div className="text-base sm:text-lg font-bold">{selectedPlayer.records.stl}</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">CTR</div><div className="text-base sm:text-lg font-bold">{selectedPlayer.records.blk}</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">ÉVAL</div><div className="text-base sm:text-lg font-bold text-green-400">{selectedPlayer.records.eff}</div></div>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-3 sm:p-4 rounded-lg">
                                <h4 className="text-xs sm:text-sm font-bold text-blue-400 mb-2 sm:mb-3">Efficacité Moyenne</h4>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">eFG%</div><div className="text-base sm:text-lg font-bold text-blue-300">{selectedPlayer.avg.eFG}%</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">TS%</div><div className="text-base sm:text-lg font-bold text-blue-300">{selectedPlayer.avg.TS}%</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">ORtg</div><div className="text-base sm:text-lg font-bold text-purple-400">{selectedPlayer.avg.ORtg}</div></div>
                                    <div><div className="text-[10px] sm:text-xs text-slate-500">DRtg</div><div className="text-base sm:text-lg font-bold text-red-400">{selectedPlayer.avg.DRtg}</div></div>
                                </div>
                            </div>
                        </div>
            
                        {/* Graphiques - responsive */}
                        {selectedPlayer.logs.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-slate-900 p-2 sm:p-3 rounded-lg">
                                    <h4 className="text-[10px] sm:text-xs font-bold text-orange-400 mb-2">Points / Évaluation</h4>
                                    <div className="h-40 sm:h-44">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={[...selectedPlayer.logs].sort((a, b) => parseFrenchDate(a.date) - parseFrenchDate(b.date))} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={8} tick={{ fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={50} />
                                                <YAxis stroke="#94a3b8" fontSize={8} tick={{ fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: '10px' }} />
                                                <Legend wrapperStyle={{ fontSize: '9px' }} />
                                                <Line type="monotone" dataKey="pts" stroke="#f97316" strokeWidth={2} name="PTS" dot={{ r: 2 }} connectNulls />
                                                <Line type="monotone" dataKey="eff" stroke="#22c55e" strokeWidth={2} name="ÉVAL" dot={{ r: 2 }} connectNulls />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-2 sm:p-3 rounded-lg">
                                    <h4 className="text-[10px] sm:text-xs font-bold text-purple-400 mb-2">ORtg / DRtg</h4>
                                    <div className="h-40 sm:h-44">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={[...selectedPlayer.logs].sort((a, b) => parseFrenchDate(a.date) - parseFrenchDate(b.date)).map(log => ({
                                                ...log,
                                                ORtgNum: parseFloat(log.ORtg) || 0,
                                                DRtgNum: parseFloat(log.DRtg) || 0
                                            }))} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={8} tick={{ fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={50} />
                                                <YAxis stroke="#94a3b8" fontSize={8} tick={{ fill: '#94a3b8' }} domain={[60, 140]} />
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: '10px' }} formatter={(value) => typeof value === 'number' ? value.toFixed(1) : value} />
                                                <Legend wrapperStyle={{ fontSize: '9px' }} />
                                                <Line type="monotone" dataKey="ORtgNum" stroke="#a855f7" strokeWidth={2} name="ORtg" dot={{ r: 2 }} connectNulls />
                                                <Line type="monotone" dataKey="DRtgNum" stroke="#ef4444" strokeWidth={2} name="DRtg" dot={{ r: 2 }} connectNulls />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
            
                        {/* Tableau complet des stats par match - responsive */}
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-400 mb-2">Statistiques par Match</h4>
                            <div className="overflow-x-auto bg-slate-900 rounded-lg max-h-48 sm:max-h-64 -mx-3 sm:mx-0">
                                <table className="w-full text-[10px] sm:text-xs text-slate-300 whitespace-nowrap">
                                    <thead className="bg-slate-800 sticky top-0">
                                        <tr>
                                            <th className="p-1.5 sm:p-2 text-left sticky left-0 bg-slate-800 z-10">Adv.</th>
                                            <th className="p-1.5 sm:p-2 text-center">MIN</th>
                                            <th className="p-1.5 sm:p-2 text-center text-orange-400">PTS</th>
                                            <th className="p-1.5 sm:p-2 text-center">REB</th>
                                            <th className="p-1.5 sm:p-2 text-center">AST</th>
                                            <th className="p-1.5 sm:p-2 text-center hidden sm:table-cell">INT</th>
                                            <th className="p-1.5 sm:p-2 text-center hidden sm:table-cell">CTR</th>
                                            <th className="p-1.5 sm:p-2 text-center hidden sm:table-cell text-red-400">BP</th>
                                            <th className="p-1.5 sm:p-2 text-center hidden md:table-cell">eFG%</th>
                                            <th className="p-1.5 sm:p-2 text-center hidden md:table-cell">TS%</th>
                                            <th className="p-1.5 sm:p-2 text-center text-purple-400">ORtg</th>
                                            <th className="p-1.5 sm:p-2 text-center text-red-400">DRtg</th>
                                            <th className="p-1.5 sm:p-2 text-center text-green-400">ÉVAL</th>
                                            <th className="p-1.5 sm:p-2 text-center hidden sm:table-cell text-cyan-400">PIE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {[...selectedPlayer.logs].sort((a, b) => parseFrenchDate(a.date) - parseFrenchDate(b.date)).map((log, i) => (
                                            <tr key={i} className="hover:bg-slate-800">
                                                <td className="p-1.5 sm:p-2 sticky left-0 bg-slate-900 font-bold z-10">{log.opponent}</td>
                                                <td className="p-1.5 sm:p-2 text-center">{log.min}</td>
                                                <td className="p-1.5 sm:p-2 text-center font-bold text-orange-400">{log.pts}</td>
                                                <td className="p-1.5 sm:p-2 text-center">{log.reb}</td>
                                                <td className="p-1.5 sm:p-2 text-center">{log.ast}</td>
                                                <td className="p-1.5 sm:p-2 text-center hidden sm:table-cell">{log.stl}</td>
                                                <td className="p-1.5 sm:p-2 text-center hidden sm:table-cell">{log.blk}</td>
                                                <td className="p-1.5 sm:p-2 text-center hidden sm:table-cell text-red-400">{log.tov}</td>
                                                <td className="p-1.5 sm:p-2 text-center hidden md:table-cell">{log.eFG}%</td>
                                                <td className="p-1.5 sm:p-2 text-center hidden md:table-cell">{log.TS}%</td>
                                                <td className="p-1.5 sm:p-2 text-center text-purple-400">{log.ORtg}</td>
                                                <td className="p-1.5 sm:p-2 text-center text-red-400">{log.DRtg}</td>
                                                <td className="p-1.5 sm:p-2 text-center font-bold text-green-400">{log.eff}</td>
                                                <td className="p-1.5 sm:p-2 text-center hidden sm:table-cell text-cyan-400">{log.PIE}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL COMPARAISON */}
            <Modal isOpen={showComparison} onClose={() => setShowComparison(false)} title="👥 Comparaison Joueurs">
                <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <select value={comparePlayer1?.info.id || ''} onChange={(e) => setComparePlayer1(aggregated.find(p => p.info.id === parseInt(e.target.value)))} className="bg-slate-700 text-white p-2 sm:p-3 rounded border border-slate-600 text-sm sm:text-base">
                            <option value="">Joueur 1</option>
                            {aggregated.map(p => <option key={p.info.id} value={p.info.id}>{p.info.name}</option>)}
                        </select>
                        <select value={comparePlayer2?.info.id || ''} onChange={(e) => setComparePlayer2(aggregated.find(p => p.info.id === parseInt(e.target.value)))} className="bg-slate-700 text-white p-2 sm:p-3 rounded border border-slate-600 text-sm sm:text-base">
                            <option value="">Joueur 2</option>
                            {aggregated.map(p => <option key={p.info.id} value={p.info.id}>{p.info.name}</option>)}
                        </select>
                    </div>
                    {comparePlayer1 && comparePlayer2 && (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="h-56 sm:h-72 bg-slate-900/50 rounded-xl p-2 sm:p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={getRadarData(comparePlayer1, comparePlayer2)} outerRadius="75%">
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={10} />
                                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name={comparePlayer1.info.name} dataKey="score1" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                                        <Radar name={comparePlayer2.info.name} dataKey="score2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload?.length) {
                                                const d = payload[0].payload;
                                                return <div className="bg-slate-800 border border-slate-600 p-2 rounded text-[10px] sm:text-xs"><div className="font-bold text-white mb-1">{d.category}</div><div className="text-orange-400">{d.name1}: {d.real1}</div><div className="text-blue-400">{d.name2}: {d.real2}</div></div>;
                                            }
                                            return null;
                                        }} />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                {[{ k: 'pts', l: 'Points' }, { k: 'reb', l: 'Rebonds' }, { k: 'ast', l: 'Passes' }, { k: 'eff', l: 'Évaluation' }, { k: 'ORtg', l: 'Off. Rtg' }, { k: 'DRtg', l: 'Def. Rtg', inv: true }, { k: 'PIE', l: 'PIE' }, { k: 'eFG', l: 'eFG%' }, { k: 'netRtg', l: 'Net Rtg' }].map(stat => {
                                    const v1 = parseFloat(comparePlayer1.avg[stat.k]) || 0;
                                    const v2 = parseFloat(comparePlayer2.avg[stat.k]) || 0;
                                    const win1 = stat.inv ? v1 < v2 : v1 > v2;
                                    const win2 = stat.inv ? v2 < v1 : v2 > v1;
                                    return (
                                        <div key={stat.k} className="bg-slate-900 p-2 sm:p-3 rounded border border-slate-700 flex justify-between items-center">
                                            <div className={`font-bold text-sm sm:text-lg ${win1 ? 'text-orange-400' : 'text-slate-500'}`}>{v1}</div>
                                            <div className="text-[9px] sm:text-xs text-slate-400 text-center px-1">{stat.l}</div>
                                            <div className={`font-bold text-sm sm:text-lg ${win2 ? 'text-blue-400' : 'text-slate-500'}`}>{v2}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            {/* MODAL TENDANCES ÉQUIPE */}
            <Modal isOpen={showTeamTrends} onClose={() => setShowTeamTrends(false)} title="📈 Tendances Équipe">
                <div className="space-y-4 sm:space-y-6">
                    <div>
                        <h4 className="text-xs sm:text-sm font-bold text-orange-400 mb-2 sm:mb-3">Net Rating par Match</h4>
                        <div className="h-44 sm:h-56 bg-slate-900 rounded-lg p-1 sm:p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={teamTrendsData} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={9} angle={-45} textAnchor="end" interval={0} />
                                    <YAxis stroke="#94a3b8" fontSize={9} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: '11px' }} />
                                    <Bar dataKey="NetRtg" name="Net Rating" fill="#22c55e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-bold text-purple-400 mb-2 sm:mb-3">Évolution ORtg / DRtg</h4>
                        <div className="h-44 sm:h-56 bg-slate-900 rounded-lg p-1 sm:p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={teamTrendsData} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={9} angle={-45} textAnchor="end" interval={0} />
                                    <YAxis stroke="#94a3b8" fontSize={9} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Line type="monotone" dataKey="ORtg" stroke="#a855f7" strokeWidth={2} name="Off. Rating" dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="DRtg" stroke="#ef4444" strokeWidth={2} name="Def. Rating" dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-bold text-green-400 mb-2 sm:mb-3">Points Marqués vs Encaissés</h4>
                        <div className="h-44 sm:h-56 bg-slate-900 rounded-lg p-1 sm:p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={teamTrendsData} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={9} angle={-45} textAnchor="end" interval={0} />
                                    <YAxis stroke="#94a3b8" fontSize={9} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="score" name="Marqués" fill="#22c55e" />
                                    <Bar dataKey="conceded" name="Encaissés" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL HEATMAP */}
            <Modal isOpen={showHeatmap} onClose={() => setShowHeatmap(false)} title="🎯 Heatmap Performance">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full text-[10px] sm:text-sm">
                        <thead>
                            <tr className="text-slate-400 text-[9px] sm:text-xs uppercase">
                                <th className="p-1.5 sm:p-2 text-left sticky left-0 bg-slate-800 z-10">Joueur</th>
                                {heatmapData.categories.map(cat => <th key={cat.key} className="p-1.5 sm:p-2 text-center">{cat.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {heatmapData.players.map(p => (
                                <tr key={p.info.id} className="border-t border-slate-700">
                                    <td className="p-1.5 sm:p-2 font-bold text-white sticky left-0 bg-slate-800 z-10 text-[10px] sm:text-sm">{p.info.name}</td>
                                    {heatmapData.categories.map(cat => {
                                        const val = parseFloat(p.avg[cat.key]) || 0;
                                        const min = heatmapData.minValues[cat.key], max = heatmapData.maxValues[cat.key], range = max - min || 1;
                                        const intensity = cat.inverse ? 1 - ((val - min) / range) : (val - min) / range;
                                        return <td key={cat.key} className="p-1.5 sm:p-2 text-center font-bold text-white text-[10px] sm:text-sm" style={{ backgroundColor: `rgba(${cat.inverse ? '59, 130, 246' : '249, 115, 22'}, ${intensity * 0.8})` }}>{p.avg[cat.key]}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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

// --- MODALE DÉTAILS MATCH (Responsive + Dean Oliver complet) ---
function GameDetailsModal({ game, isOpen, onClose, players }) {
    if (!game) return null;
    const [viewMode, setViewMode] = useState('advanced');

    // MOTEUR DE CALCUL DEAN OLIVER (Réintégré)
    const statsData = useMemo(() => {
        const pStats = game.playerStats || {};
        const opp = game.opponentStats || {};
        
        // 1. Totaux Équipe
        let T_FGM=0, T_FGA=0, T_3PM=0, T_FTM=0, T_FTA=0, T_ORB=0, T_DRB=0, T_AST=0, T_STL=0, T_BLK=0, T_TOV=0, T_PF=0, T_PTS=0, T_MP=0;
        Object.values(pStats).forEach(s => { 
            T_FGM+=(s.fgm||0)+(s.threePM||0); T_FGA+=(s.fga||0)+(s.threePA||0); T_3PM+=(s.threePM||0); 
            T_FTM+=(s.ftm||0); T_FTA+=(s.fta||0); T_ORB+=(s.oreb||0); T_DRB+=(s.dreb||0); 
            T_AST+=(s.ast||0); T_STL+=(s.stl||0); T_BLK+=(s.blk||0); T_TOV+=(s.tov||0); 
            T_PF+=(s.pf||0); T_PTS+=(s.pts||0); T_MP+=(s.minutes||0); 
        });
        const T_TRB = T_ORB + T_DRB;

        // 2. Totaux Adversaire
        const O_PTS = game.awayScore||0; 
        const O_FGM=opp.fgm||0; const O_FGA=opp.fga||(O_FGM+T_DRB); 
        const O_FTM=opp.ftm||0; const O_FTA=opp.fta||0; 
        const O_ORB=opp.oreb||0; const O_TRB=(opp.reb||(O_ORB+T_DRB)); 
        const O_DRB=O_TRB-O_ORB; const O_TOV=opp.tov||0; const O_MP=T_MP;

        // 3. Constantes d'équipe (Dean Oliver)
        const Team_Poss = T_FGA + 0.44*T_FTA - T_ORB + T_TOV;
        const Team_Scoring_Poss = T_FGM + (1 - Math.pow(1 - (T_FTM/(T_FTA||1)), 2)) * 0.4 * T_FTA;
        const Team_Play_Pct = Team_Scoring_Poss / (T_FGA + 0.4*T_FTA + T_TOV || 1);
        const Team_ORB_Pct = T_ORB / (T_ORB + O_DRB || 1);
        const Team_ORB_Weight = ((1 - Team_ORB_Pct) * Team_Play_Pct) / ((1 - Team_ORB_Pct) * Team_Play_Pct + Team_ORB_Pct * (1 - Team_Play_Pct) || 1);

        // 4. Calculs Individuels (Raw)
        let rawPlayers = Object.entries(pStats).map(([pid, s]) => {
            const MP = s.minutes||0; if(MP===0) return null;
            const FGM=(s.fgm||0)+(s.threePM||0); const FGA=(s.fga||0)+(s.threePA||0);
            const FTM=s.ftm||0; const FTA=s.fta||0; const ThreePM=s.threePM||0;
            const AST=s.ast||0; const TOV=s.tov||0; const ORB=s.oreb||0; const DRB=s.dreb||0;
            const STL=s.stl||0; const BLK=s.blk||0; const PF=s.pf||0; const PTS=s.pts||0;

            // Offensive Rating Formulas
            const qAST_term1 = (MP / (T_MP / 5)) * (1.14 * ((T_AST - AST) / (T_FGM || 1)));
            const qAST_term2 = ((((T_AST / T_MP) * MP * 5 - AST) / ((T_FGM / T_MP) * MP * 5 - FGM || 1)) * (1 - (MP / (T_MP / 5))));
            const qAST = qAST_term1 + qAST_term2 || 0;
            const FG_Part = FGM * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
            const AST_Part = 0.5 * (((T_PTS - T_FTM) - (PTS - FTM)) / (2 * (T_FGA - FGA) || 1)) * AST;
            const FT_Part = (1 - Math.pow(1 - (FTM / (FTA || 1)), 2)) * 0.4 * FTA;
            const ORB_Part = ORB * Team_ORB_Weight * Team_Play_Pct;
            const ScPoss = (FG_Part + AST_Part + FT_Part) * (1 - (T_ORB / (Team_Scoring_Poss || 1)) * Team_ORB_Weight * Team_Play_Pct) + ORB_Part;
            const FGxPoss = (FGA - FGM) * (1 - 1.07 * Team_ORB_Pct);
            const FTxPoss = Math.pow(1 - (FTM / (FTA || 1)), 2) * 0.4 * FTA;
            const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;
            const PProd_FG = 2 * (FGM + 0.5 * ThreePM) * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
            const PProd_AST = 2 * ((T_FGM - FGM + 0.5 * (T_3PM - ThreePM)) / (T_FGM - FGM || 1)) * 0.5 * (((T_PTS - T_FTM) - (PTS - FTM)) / (2 * (T_FGA - FGA) || 1)) * AST;
            const PProd_ORB = ORB * Team_ORB_Weight * Team_Play_Pct * (T_PTS / (Team_Scoring_Poss || 1));
            const PProd = (PProd_FG + PProd_AST + FTM) * (1 - (T_ORB / (Team_Scoring_Poss || 1)) * Team_ORB_Weight * Team_Play_Pct) + PProd_ORB;
            const ORtg_Raw = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;

            // Defensive Rating Formulas
            const DFG_Pct = O_FGM / (O_FGA || 1);
            const DOR_Pct = O_ORB / (O_ORB + T_DRB || 1);
            const FMwt = (DFG_Pct * (1 - DOR_Pct)) / (DFG_Pct * (1 - DOR_Pct) + (1 - DFG_Pct) * DOR_Pct || 1);
            const Stops1 = STL + BLK * FMwt * (1 - 1.07 * DOR_Pct) + DRB * (1 - FMwt);
            const Stops2 = (((O_FGA - O_FGM - T_BLK) / T_MP) * FMwt * (1 - 1.07 * DOR_Pct) + ((O_TOV - T_STL) / T_MP)) * MP + (PF / (T_PF || 1)) * 0.4 * O_FTA * Math.pow(1 - (O_FTM / (O_FTA || 1)), 2);
            const Stops = Stops1 + Stops2;
            const Stop_Pct = (Stops * O_MP) / (Team_Poss * MP || 1);
            const Team_DRtg_Val = 100 * (O_PTS / (Team_Poss || 1));
            const D_Pts_per_ScPoss = O_PTS / (O_FGM + (1 - Math.pow(1 - (O_FTM / (O_FTA || 1)), 2)) * 0.4 * O_FTA || 1);
            const DRtg_Raw = Team_DRtg_Val + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg_Val);

            // Basic Stats
            const eFG = FGA>0 ? ((FGM + 0.5*ThreePM)/FGA)*100 : 0;
            const TS = (FGA + 0.44*FTA)>0 ? (PTS/(2*(FGA + 0.44*FTA)))*100 : 0;
            const gamePIEDenom = (T_PTS + O_PTS) + (T_FGM + O_FGM) + (T_FTM + O_FTM) - (T_FGA + O_FGA) - (T_FTA + O_FTA) + (T_DRB + O_DRB) + (0.5 * (T_ORB + O_ORB)) + (T_AST + (opp.ast||0)) + (T_STL + 0) + (0.5 * (T_BLK + (opp.blk||0))) - (T_PF + (opp.fouls||0)) - (T_TOV + O_TOV);
            const playerPIENum = PTS + FGM + FTM - FGA - FTA + DRB + (0.5 * ORB) + AST + STL + (0.5 * BLK) - PF - TOV;
            const pie = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;

            const player = players.find(p => p.id === parseInt(pid));
            return {
                id: pid, name: player?player.name:`#${pid}`, minutes: MP,
                pts: PTS, ast: AST, reb: ORB+DRB, stl: STL, blk: BLK, tov: TOV, pf: PF,
                fgm: FGM, fga: FGA, threePM: ThreePM, threePA: s.threePA||0, ftm: FTM, fta: FTA, oreb: ORB, dreb: DRB,
                plusMinus: s.plusMinus||0, eFG: eFG.toFixed(1), TS: TS.toFixed(1), PIE: pie.toFixed(1),
                ORtg_Raw, DRtg_Raw
            };
        }).filter(p => p!==null);

        // 5. Pondération (Stabilisation U18)
        const Min_moy = rawPlayers.length > 0 ? T_MP / rawPlayers.length : 0;
        const C = 1.5 * Min_moy;
        const Team_ORtg_Global = Team_Poss > 0 ? (T_PTS / Team_Poss) * 100 : 0;
        const Team_DRtg_Global = Team_Poss > 0 ? (O_PTS / Team_Poss) * 100 : 0;

        const enrichedPlayers = rawPlayers.map(p => {
            const weight = p.minutes / (p.minutes + C);
            const ORtg_Pond = Team_ORtg_Global + (p.ORtg_Raw - Team_ORtg_Global) * weight;
            const DRtg_Pond = Team_DRtg_Global + (p.DRtg_Raw - Team_DRtg_Global) * weight;
            return {
                ...p,
                ORtg: ORtg_Pond.toFixed(1),
                DRtg: DRtg_Pond.toFixed(1),
                NetRtg: (ORtg_Pond - DRtg_Pond).toFixed(1)
            };
        });

        return { 
            team: { poss: Team_Poss.toFixed(1), ORtg: Team_ORtg_Global.toFixed(1), DRtg: Team_DRtg_Global.toFixed(1), Net: (Team_ORtg_Global-Team_DRtg_Global).toFixed(1) }, 
            players: enrichedPlayers 
        };
    }, [game, players]);

    // UI RESPONSIVE
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Détails vs ${game.opponent}`} size="max-w-6xl">
            <div className="space-y-4 md:space-y-6">
                {/* Header Score */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-slate-900 p-3 md:p-4 rounded-lg flex justify-between items-center border border-slate-700 relative overflow-hidden">
                        <div className="text-center z-10"><div className="text-[10px] md:text-xs text-slate-400 uppercase">Nous</div><div className="text-2xl md:text-4xl font-bold text-green-400">{game.homeScore}</div></div>
                        <div className="flex flex-col items-center z-10 px-2 text-center">
                            <span className="text-base md:text-xl font-bold text-white uppercase tracking-wider leading-tight">{game.opponent}</span>
                            <span className="text-[10px] md:text-xs text-slate-500 mt-1">{game.date}</span>
                        </div>
                        <div className="text-center z-10"><div className="text-[10px] md:text-xs text-slate-400 uppercase">Eux</div><div className="text-2xl md:text-4xl font-bold text-red-400">{game.awayScore}</div></div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-transparent to-red-500"></div>
                    </div>
                    
                    {/* Team Stats */}
                    <div className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-600 flex flex-col justify-center">
                        <div className="text-xs text-slate-400 uppercase mb-2 text-center border-b border-slate-700 pb-1">Performance (Oliver)</div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div className="flex justify-between"><span className="text-slate-400 text-xs">Poss:</span> <span className="text-white font-mono">{statsData.team.poss}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 text-xs">NetRtg:</span> <span className={`${parseFloat(statsData.team.Net)>=0?'text-green-400':'text-red-400'} font-bold text-xs`}>{statsData.team.Net}</span></div>
                            <div className="flex justify-between"><span className="text-purple-400 text-xs">ORtg:</span> <span className="text-white font-mono">{statsData.team.ORtg}</span></div>
                            <div className="flex justify-between"><span className="text-red-400 text-xs">DRtg:</span> <span className="text-white font-mono">{statsData.team.DRtg}</span></div>
                        </div>
                    </div>
                </div>

                {/* Tableau */}
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                        <h4 className="text-orange-400 font-bold text-sm uppercase flex items-center gap-2"><Icon path={Icons.Users} /> Joueurs ({statsData.players.length})</h4>
                        <div className="flex bg-slate-800 rounded p-1 border border-slate-700 w-full sm:w-auto">
                            <button onClick={() => setViewMode('classic')} className={`flex-1 sm:flex-none px-3 py-1 text-xs rounded transition-all ${viewMode==='classic'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Classique</button>
                            <button onClick={() => setViewMode('advanced')} className={`flex-1 sm:flex-none px-3 py-1 text-xs rounded transition-all ${viewMode==='advanced'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Avancé (Pondéré)</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700">
                        <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-800 text-white uppercase font-semibold">
                                <tr>
                                    <th className="p-2 md:p-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700">Joueur</th>
                                    <th className="p-2 md:p-3 text-center">MIN</th>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <th className="p-2 md:p-3 text-center text-orange-400">PTS</th>
                                            <th className="p-2 md:p-3 text-center">TIR</th>
                                            <th className="p-2 md:p-3 text-center">3P</th>
                                            <th className="p-2 md:p-3 text-center">LF</th>
                                            <th className="p-2 md:p-3 text-center">REB</th>
                                            <th className="p-2 md:p-3 text-center">AST</th>
                                            <th className="p-2 md:p-3 text-center">INT</th>
                                            <th className="p-2 md:p-3 text-center">CTR</th>
                                            <th className="p-2 md:p-3 text-center">BP</th>
                                            <th className="p-2 md:p-3 text-center">FTE</th>
                                            <th className="p-2 md:p-3 text-center">+/-</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-2 md:p-3 text-center text-orange-400">PTS</th>
                                            <th className="p-2 md:p-3 text-center text-blue-300">eFG%</th>
                                            <th className="p-2 md:p-3 text-center text-purple-300">TS%</th>
                                            <th className="p-2 md:p-3 text-center text-purple-400 border-l border-slate-700">ORtg</th>
                                            <th className="p-2 md:p-3 text-center text-red-400">DRtg</th>
                                            <th className="p-2 md:p-3 text-center text-yellow-400 font-bold border-r border-slate-700">Net</th>
                                            <th className="p-2 md:p-3 text-center text-cyan-400">PIE</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {statsData.players.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-2 md:p-3 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 truncate max-w-[100px] md:max-w-none">{p.name}</td>
                                        <td className="p-2 md:p-3 text-center text-slate-400">{p.minutes}</td>
                                        {viewMode === 'classic' ? (
                                            <>
                                                <td className="p-2 md:p-3 text-center font-bold text-orange-400">{p.pts}</td>
                                                <td className="p-2 md:p-3 text-center">{p.fgm}-{p.fga}</td>
                                                <td className="p-2 md:p-3 text-center text-slate-400">{p.threePM}-{p.threePA}</td>
                                                <td className="p-2 md:p-3 text-center text-slate-400">{p.ftm}-{p.fta}</td>
                                                <td className="p-2 md:p-3 text-center font-bold">{p.reb} <span className="text-[10px] font-normal text-slate-500 hidden md:inline">({p.oreb}/{p.dreb})</span></td>
                                                <td className="p-2 md:p-3 text-center">{p.ast}</td>
                                                <td className="p-2 md:p-3 text-center">{p.stl}</td>
                                                <td className="p-2 md:p-3 text-center">{p.blk}</td>
                                                <td className="p-2 md:p-3 text-center text-red-400">{p.tov}</td>
                                                <td className="p-2 md:p-3 text-center text-red-400">{p.pf}</td>
                                                <td className={`p-2 md:p-3 text-center font-bold ${p.plusMinus>=0?'text-green-400':'text-red-400'}`}>{p.plusMinus>0?'+':''}{p.plusMinus}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-2 md:p-3 text-center font-bold text-white">{p.pts}</td>
                                                <td className="p-2 md:p-3 text-center text-blue-300 font-mono">{p.eFG}%</td>
                                                <td className="p-2 md:p-3 text-center text-purple-300 font-mono">{p.TS}%</td>
                                                <td className="p-2 md:p-3 text-center text-purple-400 font-mono border-l border-slate-700">{p.ORtg}</td>
                                                <td className="p-2 md:p-3 text-center text-red-400 font-mono">{p.DRtg}</td>
                                                <td className={`p-2 md:p-3 text-center font-bold font-mono border-r border-slate-700 ${parseFloat(p.NetRtg)>=0?'text-green-400':'text-red-400'}`}>{parseFloat(p.NetRtg)>0?'+':''}{p.NetRtg}</td>
                                                <td className="p-2 md:p-3 text-center text-cyan-400 font-bold">{p.PIE}</td>
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

// --- HISTORY (Trié + Responsive) ---
function History({ games, players, setGames, phases, onEditGame, onImportClick, onMultiImport, isAdmin }) {
    const [selectedGame, setSelectedGame] = useState(null);

    // Tri du plus récent au plus ancien
    const sortedGames = useMemo(() => {
        return [...games].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }, [games]);

    return (
        <div className="space-y-4 pb-20 md:pb-0">
            {isAdmin && (
                <div className="flex justify-end gap-2 no-print">
                    <Button variant="secondary" onClick={onMultiImport}><Icon path={Icons.Upload} /> Multi-Import</Button>
                    <Button variant="primary" onClick={onImportClick}><Icon path={Icons.Upload} /> Importer</Button>
                </div>
            )}
            
            {sortedGames.length === 0 && <div className="text-center text-slate-500 py-10">Aucun match enregistré</div>}
            
            {sortedGames.map(g => (
                <Card key={g.id} className="p-0 overflow-hidden group hover:border-orange-500/50 transition-colors">
                    <div className="flex justify-between items-stretch">
                        <div 
                            className="flex-1 p-3 md:p-4 cursor-pointer group-hover:bg-slate-800/80 transition-colors"
                            onClick={() => setSelectedGame(g)}
                        >
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>{g.date}</span>
                                {g.phase && <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs">{phases.find(p => p.id === g.phase)?.name}</span>}
                            </div>
                            <div className="text-lg md:text-xl font-bold text-white mt-1">
                                <span className="text-green-400">{g.homeScore}</span> - <span className="text-red-400">{g.awayScore}</span> 
                                <span className="text-slate-300 ml-2 text-base font-normal truncate max-w-[150px] md:max-w-none inline-block align-bottom">vs {g.opponent}</span>
                            </div>
                            <div className="text-xs text-orange-500/0 group-hover:text-orange-500 transition-all mt-2 flex items-center gap-1">
                                <Icon path={Icons.Eye} className="w-3 h-3"/> Voir stats &rarr;
                            </div>
                        </div>

                        {isAdmin && (
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
                        )}
                    </div>
                </Card>
            ))}

            <GameDetailsModal game={selectedGame} isOpen={!!selectedGame} onClose={() => setSelectedGame(null)} players={players} />
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
    const handleLogin = () => {
        if (pwd === "coach2025") { onLogin(); onClose(); }
        else setError(true);
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Accès Coach" size="max-w-sm">
            <div className="space-y-4 p-2">
                <p className="text-sm text-slate-400">Veuillez entrer le mot de passe pour accéder aux modifications.</p>
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
    const [view, setView] = useState(isAdmin ? "live" : "global_stats");
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
            } catch (e) { console.error("❌ Firebase:", e); setIsDataLoaded(true); }
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
    const confirmImport = (newGame, updatedPlayers) => { setPlayers(updatedPlayers); const newGamesList = [newGame, ...games]; setGames(newGamesList); if (window.db && !isPlayerMode) { saveDataToCloud(window.db, "roster", updatedPlayers); saveDataToCloud(window.db, "games", newGamesList); } setImportData(null); alert("Importé !"); setView('history'); };
    const confirmMultiImport = (newGame, updatedPlayers) => { setPlayers(updatedPlayers); const newGamesList = [newGame, ...games]; setGames(newGamesList); if (window.db && !isPlayerMode) { saveDataToCloud(window.db, "roster", updatedPlayers); saveDataToCloud(window.db, "games", newGamesList); } setMultiImportQueue(prev => prev.slice(1)); if (multiImportQueue.length <= 1) { alert("Tous les matchs importés !"); setView('history'); } };

    if (isPlayerMode) return <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col font-sans text-slate-200"><header className="h-16 bg-slate-900 flex items-center px-6"><h1 className="font-bold text-lg text-white">🏀 Stats</h1><span className="ml-auto text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Mode Joueur</span></header><div className="flex-1 p-4 overflow-y-auto"><GlobalStats players={players} games={games} phases={phases} /></div></div>;

    return (
        <div className="max-w-5xl mx-auto h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
            {isAdmin && (<><input type="file" accept=".html" id="html-upload" onChange={handleFileImport} className="hidden" /><input type="file" accept=".html" id="multi-upload" onChange={handleMultiFileImport} multiple className="hidden" /></>)}
            
            {/* ✅ MODALES IMPORT avec z-index inline */}
            {importData && <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 10000 }}><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-4">Import</h2><ImportReviewModal importData={importData} currentPlayers={players} phases={phases} onConfirm={confirmImport} onCancel={() => setImportData(null)} /></div></div>}
            {multiImportQueue.length > 0 && <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 10000 }}><div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-600 p-6"><h2 className="text-2xl font-bold text-white mb-2">Multi-Import ({multiImportQueue.length} restant{multiImportQueue.length > 1 ? 's' : ''})</h2><ImportReviewModal importData={multiImportQueue[0]} currentPlayers={players} phases={phases} onConfirm={confirmMultiImport} onCancel={() => setMultiImportQueue([])} /></div></div>}
            
            <LoginModal isOpen={showLogin} onLogin={performLogin} onClose={() => setShowLogin(false)} />

            {/* NAV - z-index réduit */}
            <nav className="bg-slate-900 border-r border-slate-800 w-full md:w-20 flex md:flex-col items-center justify-between md:pt-6 p-2 shrink-0" style={{ zIndex: 40 }}>
                <div className="flex md:flex-col items-center gap-2 md:gap-4 w-full justify-evenly md:justify-start">
                    <div className="mb-0 md:mb-4 p-2 bg-orange-600 rounded-xl text-white font-black text-xl cursor-default">BP</div>
                    {isAdmin && <button onClick={() => setView("live")} className={`p-3 rounded-xl transition-all ${view === "live" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Live"><Icon path={Icons.Play} /></button>}
                    <button onClick={() => setView("global_stats")} className={`p-3 rounded-xl transition-all ${view === "global_stats" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Stats"><Icon path={Icons.Chart} /></button>
                    <button onClick={() => setView("history")} className={`p-3 rounded-xl transition-all ${view === "history" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Historique"><Icon path={Icons.Clipboard} /></button>
                    {isAdmin && <button onClick={() => setView("settings")} className={`p-3 rounded-xl transition-all ${view === "settings" ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`} title="Config"><Icon path={Icons.Settings} /></button>}
                </div>
                <div className="mt-auto hidden md:block pb-4">
                    {isAdmin ? <button onClick={performLogout} className="p-3 text-red-500 hover:bg-slate-800 rounded-xl" title="Déconnexion"><Icon path={Icons.Users} /></button> : <button onClick={() => setShowLogin(true)} className="p-3 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl" title="Connexion"><Icon path={Icons.Users} /></button>}
                </div>
                <div className="md:hidden">{isAdmin ? <button onClick={performLogout} className="p-3 text-red-500"><Icon path={Icons.Users} /></button> : <button onClick={() => setShowLogin(true)} className="p-3 text-slate-600"><Icon path={Icons.Users} /></button>}</div>
            </nav>

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0" style={{ zIndex: 30 }}>
                    <h1 className="font-bold text-lg text-white">{view === 'live' && "🔴 Live"}{view === 'global_stats' && "📊 Stats"}{view === 'history' && "📜 Historique"}{view === 'settings' && "⚙️ Paramètres"}</h1>
                    <div className="ml-auto flex items-center gap-3">
                        {!isAdmin && <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded border border-slate-700">Public</span>}
                        {isAdmin && <span className="text-xs text-orange-500 px-2 py-1 bg-orange-900/20 rounded border border-orange-900">Admin</span>}
                        {window.db && <span className="text-xs text-green-400 flex items-center gap-1"><Icon path={Icons.Cloud} className="w-3 h-3" /> Synchro</span>}
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto" style={{ zIndex: 10 }}>
                    {view === 'live' && isAdmin && <LiveTracker players={players} onSaveGame={handleSaveGame} initialGame={activeGame} phases={phases} selectedPhase={phases[0]?.id} />}
                    {view === 'global_stats' && <GlobalStats players={players} games={games} phases={phases} />}
                    {view === 'history' && <History games={games} players={players} setGames={setGames} phases={phases} isAdmin={isAdmin} onEditGame={(g) => { setActiveGame(g); setView('live'); }} onImportClick={() => document.getElementById('html-upload').click()} onMultiImport={() => document.getElementById('multi-upload').click()} />}
                    {view === 'settings' && isAdmin && <Settings players={players} onUpdatePlayers={handleSettingsUpdate} phases={phases} onUpdatePhases={handleUpdatePhases} firebaseConfig={firebaseConfig} setFirebaseConfig={setFirebaseConfig} />}
                    {!isAdmin && (view === 'live' || view === 'settings') && <div className="h-full flex flex-col items-center justify-center text-slate-500"><Icon path={Icons.Users} className="w-16 h-16 mb-4 opacity-20" /><p>Accès réservé au coach.</p><button onClick={() => setShowLogin(true)} className="mt-4 text-orange-500 hover:underline">Se connecter</button></div>}
                </div>
            </main>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
