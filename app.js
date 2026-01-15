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

const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const months = { 'janv': 0, 'jan': 0, 'janvier': 0, 'févr': 1, 'fév': 1, 'fevr': 1, 'fev': 1, 'février': 1, 'mars': 2, 'mar': 2, 'avr': 3, 'avril': 3, 'mai': 4, 'juin': 5, 'juil': 6, 'jul': 6, 'juillet': 6, 'août': 7, 'aout': 7, 'sept': 8, 'sep': 8, 'septembre': 8, 'oct': 9, 'octobre': 9, 'nov': 10, 'novembre': 10, 'déc': 11, 'dec': 11, 'décembre': 11 };
    
    // Format texte : "16 nov. 2025"
    const match = dateStr.match(/(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})/i);
    if (match) { 
        const m = months[match[2].toLowerCase().replace('.', '')]; 
        if (m !== undefined) return new Date(match[3], m, match[1]); 
    }
    
    // Format slash : "16/11/2025"
    const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) return new Date(slash[3], slash[2] - 1, slash[1]);
    
    return new Date(dateStr);
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

// --- GLOBAL STATS (Complet : Responsive + Dean Oliver + Sécurité Admin) ---
function GlobalStats({ players, games, phases, isAdmin }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [viewMode, setViewMode] = useState('classic');
    const [phaseFilter, setPhaseFilter] = useState('all');
    const [showComparison, setShowComparison] = useState(false);
    const [showTeamTrends, setShowTeamTrends] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [comparePlayer1, setComparePlayer1] = useState(null);
    const [comparePlayer2, setComparePlayer2] = useState(null);

    const filteredGames = useMemo(() => phaseFilter === 'all' ? games : games.filter(g => g.phase === phaseFilter), [games, phaseFilter]);

    // --- CŒUR DU CALCUL (DEAN OLIVER + STABILISATION) ---
    const aggregated = useMemo(() => {
        const stats = {};
        players.forEach(p => { 
            stats[p.id] = { 
                info: p, gamesPlayed: 0, 
                total: { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, eff: 0, fgm: 0, fga: 0, threePM: 0, threePA: 0, ftm: 0, fta: 0, pf: 0, plusMinus: 0, pie: 0 }, 
                totalMinPlayed: 0, weightedORtg: 0, weightedDRtg: 0, 
                logs: [], 
                records: { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, eff: 0 } 
            }; 
        });

        // Accumulateurs Saison (Grand Totals)
        const GT = { FGM: 0, FGA: 0, ThreePM: 0, FTM: 0, FTA: 0, ORB: 0, DRB: 0, TRB: 0, AST: 0, STL: 0, BLK: 0, TOV: 0, PF: 0, PTS: 0, MP: 0, Opp_PTS: 0, Opp_FGM: 0, Opp_FGA: 0, Opp_FTM: 0, Opp_FTA: 0, Opp_ORB: 0, Opp_TRB: 0, Opp_TOV: 0 };

        filteredGames.forEach(g => {
            let gamePTS=0, gameFGM=0, gameFTM=0, gameFGA=0, gameFTA=0;
            let gameDRB=0, gameORB=0, gameAST=0, gameSTL=0, gameBLK=0, gamePF=0, gameTO=0;
            
            // 1. Accumulation Stats Joueurs & Équipe
            Object.values(g.playerStats).forEach(s => {
                const min = s.minutes||0;
                GT.FGM+=(s.fgm||0)+(s.threePM||0); GT.FGA+=(s.fga||0)+(s.threePA||0); GT.ThreePM+=(s.threePM||0); GT.FTM+=(s.ftm||0); GT.FTA+=(s.fta||0); GT.ORB+=(s.oreb||0); GT.DRB+=(s.dreb||0); GT.AST+=(s.ast||0); GT.STL+=(s.stl||0); GT.BLK+=(s.blk||0); GT.TOV+=(s.tov||0); GT.PF+=(s.pf||0); GT.PTS+=(s.pts||0); GT.MP+=min;
                gamePTS+=s.pts||0; gameFGM+=(s.fgm||0)+(s.threePM||0); gameFTM+=s.ftm||0; gameFGA+=(s.fga||0)+(s.threePA||0); gameFTA+=s.fta||0; gameDRB+=s.dreb||0; gameORB+=s.oreb||0; gameAST+=s.ast||0; gameSTL+=s.stl||0; gameBLK+=s.blk||0; gamePF+=s.pf||0; gameTO+=s.tov||0;
            });

            // 2. Accumulation Stats Adversaire
            const opp = g.opponentStats||{}; const oppPTS = g.awayScore||0;
            const oppFGM = opp.fgm||Math.round(oppPTS/2.2); const oppFTM = opp.ftm||0; const oppFGA = opp.fga||Math.round(oppPTS/1.1); const oppFTA = opp.fta||0; const oppDRB = opp.reb?Math.round(opp.reb*0.7):0; const oppORB = opp.oreb||0; const oppTOV = opp.tov||0;
            GT.Opp_PTS+=oppPTS; GT.Opp_FGM+=oppFGM; GT.Opp_FGA+=oppFGA; GT.Opp_FTM+=oppFTM; GT.Opp_FTA+=oppFTA; GT.Opp_ORB+=oppORB; GT.Opp_TRB+=(oppDRB+oppORB); GT.Opp_TOV+=oppTOV;
            
            gamePTS+=oppPTS; gameFGM+=oppFGM; gameFTM+=oppFTM; gameFGA+=oppFGA; gameFTA+=oppFTA; gameDRB+=oppDRB; gameORB+=oppORB; gameAST+=opp.ast||0; gameSTL+=opp.stl||0; gameBLK+=opp.blk||0; gamePF+=opp.fouls||0; gameTO+=oppTOV;
            
            // PIE Dénominateur (Game)
            const gamePIEDenom = gamePTS + gameFGM + gameFTM - gameFGA - gameFTA + gameDRB + (0.5 * gameORB) + gameAST + gameSTL + (0.5 * gameBLK) - gamePF - gameTO;
            
            // Estimations Rapides pour les logs quotidiens (Le vrai calcul Dean Oliver se fait sur la saison)
            const teamPoss = (gameFGA-oppFGA) + 0.44*(gameFTA-oppFTA) - (gameORB-oppORB) + (gameTO-oppTOV);
            const teamORtg = teamPoss>0 ? ((gamePTS-oppPTS)/teamPoss)*100 : 100;
            const teamDRtg = teamPoss>0 ? (oppPTS/teamPoss)*100 : 100;

            // 3. Traitement Individuel par match
            Object.entries(g.playerStats).forEach(([pid, s]) => {
                const id = parseInt(pid);
                if ((s.minutes||0) > 0 && stats[id]) {
                    const t = stats[id].total; const playerMin = s.minutes||0;
                    stats[id].gamesPlayed += 1; stats[id].totalMinPlayed += playerMin;
                    stats[id].weightedORtg += teamORtg * playerMin; stats[id].weightedDRtg += teamDRtg * playerMin; // Pour fallback si needed
                    t.pts += (s.pts||0); t.reb += (s.reb||0); t.oreb += (s.oreb||0); t.dreb += (s.dreb||0);
                    t.ast += (s.ast||0); t.stl += (s.stl||0); t.blk += (s.blk||0); t.tov += (s.tov||0); t.min += playerMin;
                    t.fgm += (s.fgm||0); t.fga += (s.fga||0); t.threePM += (s.threePM||0); t.threePA += (s.threePA||0);
                    t.ftm += (s.ftm||0); t.fta += (s.fta||0); t.pf += (s.pf||0); t.plusMinus += (s.plusMinus||0);
                    
                    const playerFGA = (s.fga||0)+(s.threePA||0); const playerFGM = (s.fgm||0)+(s.threePM||0);
                    const evalStat = (s.pts+s.reb+s.ast+s.stl+s.blk) - ((playerFGA-playerFGM) + ((s.fta||0)-(s.ftm||0)) + s.tov);
                    t.eff += evalStat;
                    
                    const playerPIENum = (s.pts||0) + playerFGM + (s.ftm||0) - playerFGA - (s.fta||0) + (s.dreb||0) + (0.5*(s.oreb||0)) + (s.ast||0) + (s.stl||0) + (0.5*(s.blk||0)) - (s.pf||0) - (s.tov||0);
                    const playerPIE = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;
                    t.pie += playerPIE;

                    if(s.pts>stats[id].records.pts) stats[id].records.pts=s.pts; 
                    if(s.reb>stats[id].records.reb) stats[id].records.reb=s.reb; 
                    if(s.ast>stats[id].records.ast) stats[id].records.ast=s.ast; 
                    if(s.stl>stats[id].records.stl) stats[id].records.stl=s.stl; 
                    if(s.blk>stats[id].records.blk) stats[id].records.blk=s.blk; 
                    if(evalStat>stats[id].records.eff) stats[id].records.eff=evalStat;

                    const gameEFG = playerFGA>0?((playerFGM+0.5*(s.threePM||0))/playerFGA)*100:0;
                    const gameTS = (playerFGA+0.44*(s.fta||0))>0?((s.pts||0)/(2*(playerFGA+0.44*(s.fta||0))))*100:0;

                    // Ajout au Log pour tableau détaillé
                    stats[id].logs.push({ 
                        date: g.date, opponent: g.opponent, phase: g.phase, min: s.minutes,
                        pts: s.pts||0, reb: s.reb||0, oreb: s.oreb||0, dreb: s.dreb||0, ast: s.ast||0, stl: s.stl||0, blk: s.blk||0, tov: s.tov||0, pf: s.pf||0, plusMinus: s.plusMinus||0,
                        fgm: playerFGM, fga: playerFGA, threePM: s.threePM||0, threePA: s.threePA||0, ftm: s.ftm||0, fta: s.fta||0,
                        eff: evalStat, eFG: gameEFG.toFixed(1), TS: gameTS.toFixed(1), PIE: playerPIE.toFixed(1),
                        ORtg: "0", DRtg: "0" // Sera rempli par la moyenne saison pour le contexte du graphe
                    });
                }
            });
        });

        // 4. Calculs Saisonniers Avancés (Dean Oliver)
        GT.TRB = GT.ORB + GT.DRB;
        const Team_Poss = GT.FGA + 0.44 * GT.FTA - GT.ORB + GT.TOV;
        const Team_Scoring_Poss = GT.FGM + (1 - Math.pow(1 - (GT.FTM / (GT.FTA || 1)), 2)) * 0.4 * GT.FTA;
        const Team_Play_Pct = Team_Scoring_Poss / (GT.FGA + 0.4 * GT.FTA + GT.TOV || 1);
        const Team_ORB_Pct = GT.ORB / (GT.ORB + (GT.Opp_TRB - GT.Opp_ORB) || 1);
        const Team_ORB_Weight = ((1 - Team_ORB_Pct) * Team_Play_Pct) / ((1 - Team_ORB_Pct) * Team_Play_Pct + Team_ORB_Pct * (1 - Team_Play_Pct) || 1);
        const Team_ORtg = Team_Poss > 0 ? (GT.PTS / Team_Poss) * 100 : 0;
        const Team_DRtg = Team_Poss > 0 ? (GT.Opp_PTS / Team_Poss) * 100 : 0;
        
        const activePlayers = Object.values(stats).filter(p => p.gamesPlayed > 0);
        const Min_moy = activePlayers.length > 0 ? GT.MP / activePlayers.length : 0;
        const C = 1.5 * Min_moy; // Facteur Stabilisation

        return activePlayers.map(p => {
            const t = p.total; const gp = p.gamesPlayed || 1;
            
            // --- OFFENSIVE RATING (INDIVIDUAL) ---
            const qAST_term1 = (t.min / (GT.MP / 5)) * (1.14 * ((GT.AST - t.ast) / (GT.FGM || 1)));
            const qAST_term2 = ((((GT.AST / GT.MP) * t.min * 5 - t.ast) / ((GT.FGM / GT.MP) * t.min * 5 - t.fgm || 1)) * (1 - (t.min / (GT.MP / 5))));
            const qAST = qAST_term1 + qAST_term2 || 0;
            const FG_Part = t.fgm * (1 - 0.5 * ((t.pts - t.ftm) / (2 * (t.fga + t.threePA) || 1)) * qAST);
            const AST_Part = 0.5 * (((GT.PTS - GT.FTM) - (t.pts - t.ftm)) / (2 * (GT.FGA - (t.fga + t.threePA)) || 1)) * t.ast;
            const FT_Part = (1 - Math.pow(1 - (t.ftm / (t.fta || 1)), 2)) * 0.4 * t.fta;
            const ORB_Part = t.oreb * Team_ORB_Weight * Team_Play_Pct;
            const ScPoss = (FG_Part + AST_Part + FT_Part) * (1 - (GT.ORB / (Team_Scoring_Poss || 1)) * Team_ORB_Weight * Team_Play_Pct) + ORB_Part;
            const FGxPoss = ((t.fga + t.threePA) - (t.fgm + t.threePM)) * (1 - 1.07 * Team_ORB_Pct);
            const FTxPoss = Math.pow(1 - (t.ftm / (t.fta || 1)), 2) * 0.4 * t.fta;
            const TotPoss = ScPoss + FGxPoss + FTxPoss + t.tov;
            const PProd_FG = 2 * (t.fgm + 0.5 * t.threePM) * (1 - 0.5 * ((t.pts - t.ftm) / (2 * (t.fga + t.threePA) || 1)) * qAST);
            const PProd_AST = 2 * ((GT.FGM - t.fgm + 0.5 * (GT.ThreePM - t.threePM)) / (GT.FGM - t.fgm || 1)) * 0.5 * (((GT.PTS - GT.FTM) - (t.pts - t.ftm)) / (2 * (GT.FGA - (t.fga + t.threePA)) || 1)) * t.ast;
            const PProd_ORB = t.oreb * Team_ORB_Weight * Team_Play_Pct * (GT.PTS / (Team_Scoring_Poss || 1));
            const PProd = (PProd_FG + PProd_AST + t.ftm) * (1 - (GT.ORB / (Team_Scoring_Poss || 1)) * Team_ORB_Weight * Team_Play_Pct) + PProd_ORB;
            const ORtg_Raw = TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;
            
            // --- DEFENSIVE RATING (INDIVIDUAL) ---
            const DFG_Pct = GT.Opp_FGM / (GT.Opp_FGA || 1);
            const DOR_Pct = GT.Opp_ORB / (GT.Opp_ORB + GT.DRB || 1);
            const FMwt = (DFG_Pct * (1 - DOR_Pct)) / (DFG_Pct * (1 - DOR_Pct) + (1 - DFG_Pct) * DOR_Pct || 1);
            const Stops1 = t.stl + t.blk * FMwt * (1 - 1.07 * DOR_Pct) + t.dreb * (1 - FMwt);
            const Stops2 = (((GT.Opp_FGA - GT.Opp_FGM - GT.BLK) / GT.MP) * FMwt * (1 - 1.07 * DOR_Pct) + ((GT.Opp_TOV - GT.STL) / GT.MP)) * t.min + (t.pf / (GT.PF || 1)) * 0.4 * GT.Opp_FTA * Math.pow(1 - (GT.Opp_FTM / (GT.Opp_FTA || 1)), 2);
            const Stops = Stops1 + Stops2;
            const Stop_Pct = (Stops * GT.MP) / (Team_Poss * t.min || 1);
            const D_Pts_per_ScPoss = GT.Opp_PTS / (GT.Opp_FGM + (1 - Math.pow(1 - (GT.Opp_FTM / (GT.Opp_FTA || 1)), 2)) * 0.4 * GT.Opp_FTA || 1);
            const DRtg_Raw = Team_DRtg + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg);

            // --- STABILISATION (WEIGHTED) ---
            const weight = t.min / (t.min + C);
            const ORtg = Team_ORtg + (ORtg_Raw - Team_ORtg) * weight;
            const DRtg = Team_DRtg + (DRtg_Raw - Team_DRtg) * weight;

            // Update Logs for Graphs (Propagate Season Rating for Context)
            p.logs.sort((a, b) => parseDate(a.date) - parseDate(b.date));
            p.logs.forEach(l => { 
                l.ORtg = ORtg.toFixed(1); 
                l.DRtg = DRtg.toFixed(1); 
            });

            // Basic Stats Calculations
            const totalFGA = t.fga + t.threePA; const totalFGM = t.fgm + t.threePM;
            const eFG = totalFGA > 0 ? (((totalFGM + 0.5 * t.threePM) / totalFGA) * 100).toFixed(1) : "0.0";
            const ts = (totalFGA + 0.44 * t.fta) > 0 ? ((t.pts / (2 * (totalFGA + 0.44 * t.fta))) * 100).toFixed(1) : "0.0";

            return {
                ...p,
                avg: {
                    min: (t.min/gp).toFixed(1), pts: (t.pts/gp).toFixed(1), reb: (t.reb/gp).toFixed(1),
                    ast: (t.ast/gp).toFixed(1), stl: (t.stl/gp).toFixed(1), blk: (t.blk/gp).toFixed(1),
                    tov: (t.tov/gp).toFixed(1), pf: (t.pf/gp).toFixed(1), plusMinus: (t.plusMinus/gp).toFixed(1),
                    eff: (t.eff/gp).toFixed(1), fgm: totalFGM, fga: totalFGA, fgPct: totalFGA>0?((totalFGM/totalFGA)*100).toFixed(1):"0.0",
                    threePM: t.threePM, threePA: t.threePA, threePct: t.threePA>0?((t.threePM/t.threePA)*100).toFixed(1):"0.0",
                    ftm: t.ftm, fta: t.fta, ftPct: t.fta>0?((t.ftm/t.fta)*100).toFixed(1):"0.0",
                    eFG, TS: ts, ORtg: ORtg.toFixed(1), DRtg: DRtg.toFixed(1), netRtg: (ORtg-DRtg).toFixed(1), PIE: (t.pie/gp).toFixed(1)
                }
            };
        }).filter(p => p.gamesPlayed > 0);
    }, [players, filteredGames]);

    // Data for Graphs
    const teamTrendsData = useMemo(() => {
        const data = filteredGames.map(g => {
            let totalPts=0, totalFGA=0, totalFTA=0, totalTOV=0, totalORB=0;
            Object.values(g.playerStats).forEach(s => { totalPts+=s.pts||0; totalFGA+=(s.fga||0)+(s.threePA||0); totalFTA+=s.fta||0; totalTOV+=s.tov||0; totalORB+=s.oreb||0; });
            const totalPoss = totalFGA + 0.44*totalFTA - totalORB + totalTOV;
            const ortg = totalPoss>0?(totalPts/totalPoss)*100:0;
            const drtg = totalPoss>0?((g.awayScore||0)/totalPoss)*100:0;
            return { date: g.date, timestamp: parseDate(g.date).getTime(), opponent: g.opponent, ORtg: parseFloat(ortg.toFixed(1)), DRtg: parseFloat(drtg.toFixed(1)), NetRtg: parseFloat((ortg-drtg).toFixed(1)), score: g.homeScore, conceded: g.awayScore };
        });
        return data.sort((a,b) => a.timestamp - b.timestamp);
    }, [filteredGames]);

    const heatmapData = useMemo(() => {
        const categories = [{ key: 'pts', label: 'PTS' }, { key: 'reb', label: 'REB' }, { key: 'ast', label: 'AST' }, { key: 'stl', label: 'INT' }, { key: 'blk', label: 'CTR' }, { key: 'tov', label: 'BP', inverse: true }, { key: 'fgPct', label: 'FG%' }, { key: 'threePct', label: '3P%' }, { key: 'ftPct', label: 'LF%' }, { key: 'eFG', label: 'eFG%' }, { key: 'TS', label: 'TS%' }, { key: 'plusMinus', label: '+/-' }, { key: 'eff', label: 'ÉVAL' }, { key: 'ORtg', label: 'ORtg' }, { key: 'DRtg', label: 'DRtg', inverse: true }, { key: 'netRtg', label: 'NetRtg' }, { key: 'PIE', label: 'PIE' }];
        const maxValues = {}, minValues = {};
        categories.forEach(cat => { const values = aggregated.map(p => parseFloat(p.avg[cat.key]) || 0); maxValues[cat.key] = Math.max(...values, 1); minValues[cat.key] = Math.min(...values, 0); });
        return { categories, maxValues, minValues, players: aggregated };
    }, [aggregated]);

    const getRadarData = (p1, p2) => {
        if (!p1 || !p2) return [];
        const categories = [{ key: 'pts', label: 'PTS', type: 'max' }, { key: 'reb', label: 'REB', type: 'max' }, { key: 'ast', label: 'AST', type: 'max' }, { key: 'stl', label: 'INT', type: 'max' }, { key: 'eFG', label: 'eFG%', type: 'max' }, { key: 'PIE', label: 'PIE', type: 'max' }, { key: 'DRtg', label: 'Déf', type: 'min' }];
        return categories.map(cat => {
            const val1 = parseFloat(p1.avg[cat.key]) || 0; const val2 = parseFloat(p2.avg[cat.key]) || 0;
            let maxVal = Math.max(val1, val2); let minVal = Math.min(val1, val2);
            if (maxVal === 0) maxVal = 1; if (minVal === 0 && cat.type === 'min') minVal = 1;
            let score1, score2;
            if (cat.type === 'min') { score1 = val1 === 0 ? 0 : (minVal / val1) * 100; score2 = val2 === 0 ? 0 : (minVal / val2) * 100; }
            else { score1 = (val1 / maxVal) * 100; score2 = (val2 / maxVal) * 100; }
            return { category: cat.label, score1: Math.min(100, Math.max(0, score1)), score2: Math.min(100, Math.max(0, score2)), real1: val1, real2: val2, name1: p1.info.name, name2: p2.info.name };
        });
    };

    return (
        <div className="space-y-4 h-full flex flex-col pb-20 md:pb-0">
            <Card className="p-2 md:p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4 no-print">
                    <div className="flex gap-2 flex-wrap">
                        {/* BOUTONS PUBLICS */}
                        <Button size="sm" variant={viewMode === 'classic' ? 'primary' : 'secondary'} onClick={() => setViewMode('classic')}>📊 Classique</Button>
                        <Button size="sm" variant="secondary" onClick={() => setShowComparison(true)}><Icon path={Icons.Users} /> <span className="hidden md:inline">Comparer</span></Button>

                        {/* BOUTONS RESTREINTS (ADMIN SEULEMENT) */}
                        {isAdmin && (
                            <>
                                <Button size="sm" variant={viewMode === 'advanced' ? 'primary' : 'secondary'} onClick={() => setViewMode('advanced')}>🧠 Avancé</Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowHeatmap(true)}><Icon path={Icons.Target} /> <span className="hidden md:inline">Heatmap</span></Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowTeamTrends(true)}><Icon path={Icons.TrendingUp} /> <span className="hidden md:inline">Tendances</span></Button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Icon path={Icons.Filter} className="text-slate-400" />
                        <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600 max-w-[120px] md:max-w-none">
                            <option value="all">Toutes</option>
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

            <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={<><Icon path={Icons.Trophy} className="text-yellow-400" /> {selectedPlayer?.info.name}</>}>
                {selectedPlayer && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-slate-900 p-4 rounded-lg">
                            <div className="text-center"><div className="text-xs text-slate-500">Points</div><div className="text-xl md:text-2xl font-bold text-white">{selectedPlayer.avg.pts}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500">Rebonds</div><div className="text-xl md:text-2xl font-bold text-white">{selectedPlayer.avg.reb}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500">Passes</div><div className="text-xl md:text-2xl font-bold text-white">{selectedPlayer.avg.ast}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500">Éval</div><div className="text-xl md:text-2xl font-bold text-green-400">{selectedPlayer.avg.eff}</div></div>
                            <div className="text-center col-span-2 md:col-span-1"><div className="text-xs text-slate-500">PIE</div><div className="text-xl md:text-2xl font-bold text-cyan-400">{selectedPlayer.avg.PIE}%</div></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs text-slate-400 mb-2 uppercase">Scoring & Éval</h4>
                                <div className="h-48 w-full bg-slate-900/50 rounded p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={selectedPlayer.logs}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} hide />
                                            <YAxis stroke="#94a3b8" fontSize={10} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                            <Line type="monotone" dataKey="pts" name="Points" stroke="#f97316" strokeWidth={2} dot={{r:3}} />
                                            <Line type="monotone" dataKey="eff" name="Éval" stroke="#22c55e" strokeWidth={2} dot={{r:3}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs text-slate-400 mb-2 uppercase">Offensive vs Defensive Rating</h4>
                                <div className="h-48 w-full bg-slate-900/50 rounded p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={selectedPlayer.logs}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} hide />
                                            <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                            <Line type="monotone" dataKey="ORtg" name="ORtg" stroke="#a855f7" strokeWidth={2} dot={{r:3}} />
                                            <Line type="monotone" dataKey="DRtg" name="DRtg" stroke="#ef4444" strokeWidth={2} dot={{r:3}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs text-slate-400 mb-2 uppercase">Historique Complet</h4>
                            <div className="overflow-x-auto max-h-64 border border-slate-700 rounded-lg">
                                <table className="w-full text-center text-xs text-slate-300 whitespace-nowrap">
                                    <thead className="bg-slate-800 text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="p-2 text-left sticky left-0 bg-slate-800">Match</th>
                                            <th className="p-2">MIN</th>
                                            <th className="p-2 font-bold text-orange-400">PTS</th>
                                            <th className="p-2">TIR</th>
                                            <th className="p-2">3PT</th>
                                            <th className="p-2">LF</th>
                                            <th className="p-2 font-bold text-white">REB</th>
                                            <th className="p-2 text-[10px] text-slate-500">RO/RD</th>
                                            <th className="p-2">AST</th>
                                            <th className="p-2">INT</th>
                                            <th className="p-2">CTR</th>
                                            <th className="p-2 text-red-400">BP</th>
                                            <th className="p-2">FT</th>
                                            <th className="p-2 font-bold">+/-</th>
                                            <th className="p-2 font-bold text-green-400">ÉVAL</th>
                                            <th className="p-2 text-purple-400 border-l border-slate-700">ORtg</th>
                                            <th className="p-2 text-red-400">DRtg</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {selectedPlayer.logs.map((log, i) => (
                                            <tr key={i} className="hover:bg-slate-800">
                                                <td className="p-2 text-left font-bold text-white sticky left-0 bg-slate-900 border-r border-slate-700">
                                                    <div className="text-[10px] font-normal text-slate-500">{log.date}</div>
                                                    {log.opponent}
                                                </td>
                                                <td className="p-2">{log.min}</td>
                                                <td className="p-2 font-bold text-orange-400">{log.pts}</td>
                                                <td className="p-2">{log.fgm}-{log.fga}</td>
                                                <td className="p-2">{log.threePM}-{log.threePA}</td>
                                                <td className="p-2">{log.ftm}-{log.fta}</td>
                                                <td className="p-2 font-bold text-white">{log.reb}</td>
                                                <td className="p-2 text-[10px] text-slate-500">{log.oreb}/{log.dreb}</td>
                                                <td className="p-2">{log.ast}</td>
                                                <td className="p-2">{log.stl}</td>
                                                <td className="p-2">{log.blk}</td>
                                                <td className="p-2 text-red-400">{log.tov}</td>
                                                <td className="p-2">{log.pf}</td>
                                                <td className={`p-2 font-bold ${log.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{log.plusMinus > 0 ? '+' : ''}{log.plusMinus}</td>
                                                <td className="p-2 font-bold text-green-400">{log.eff}</td>
                                                <td className="p-2 text-purple-400 border-l border-slate-700">{log.ORtg}</td>
                                                <td className="p-2 text-red-400">{log.DRtg}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={showComparison} onClose={() => setShowComparison(false)} title={<><Icon path={Icons.Users} /> Comparaison Joueurs</>}>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            <div className="h-64 md:h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={getRadarData(comparePlayer1, comparePlayer2)}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
                                        <PolarRadiusAxis stroke="#94a3b8" fontSize={10} />
                                        <Radar name={comparePlayer1.info.name} dataKey="score1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                                        <Radar name={comparePlayer2.info.name} dataKey="score2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                        <Legend />
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (<div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs z-50"><div className="font-bold text-white mb-1">{data.category}</div><div className="text-orange-400">{data.name1}: <span className="font-bold">{data.real1}</span></div><div className="text-blue-400">{data.name2}: <span className="font-bold">{data.real2}</span></div></div>);
                                            } return null;
                                        }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={showTeamTrends} onClose={() => setShowTeamTrends(false)} title={<><Icon path={Icons.TrendingUp} /> Tendances Équipe</>}>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={teamTrendsData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="opponent" stroke="#94a3b8" fontSize={10} /><YAxis stroke="#94a3b8" fontSize={10} /><Tooltip contentStyle={{backgroundColor:'#1e293b',border:'none'}} /><Bar dataKey="NetRtg" name="Net Rating" fill="#22c55e" /></BarChart></ResponsiveContainer></div>
            </Modal>
            
            <Modal isOpen={showHeatmap} onClose={() => setShowHeatmap(false)} title={<><Icon path={Icons.Target} /> Heatmap Performance</>}>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-slate-400 text-xs uppercase"><th className="p-2 text-left sticky left-0 bg-slate-800">Joueur</th>{heatmapData.categories.map(c => <th key={c.key} className="p-2 text-center">{c.label}</th>)}</tr></thead><tbody>{heatmapData.players.map(p => (<tr key={p.info.id} className="border-t border-slate-700"><td className="p-2 font-bold text-white sticky left-0 bg-slate-800">{p.info.name}</td>{heatmapData.categories.map(cat => { const val = parseFloat(p.avg[cat.key])||0; const min = heatmapData.minValues[cat.key], max = heatmapData.maxValues[cat.key], range = max-min||1; const intensity = cat.inverse ? 1-((val-min)/range) : (val-min)/range; return <td key={cat.key} className="p-2 text-center font-bold text-white" style={{backgroundColor:`rgba(${cat.inverse?'59, 130, 246':'249, 115, 22'}, ${intensity*0.8})`}}>{p.avg[cat.key]}</td> })}</tr>))}</tbody></table></div>
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

// --- MODALE DÉTAILS MATCH (Responsive & Complet) ---
function GameDetailsModal({ game, isOpen, onClose, players }) {
    if (!game) return null;
    const [viewMode, setViewMode] = useState('advanced');

    // --- CALCULS (Dean Oliver + Stabilisation) ---
    const statsData = React.useMemo(() => {
        const pStats = game.playerStats || {};
        const opp = game.opponentStats || {};
        
        let T_FGM=0, T_FGA=0, T_3PM=0, T_FTM=0, T_FTA=0, T_ORB=0, T_DRB=0, T_AST=0, T_STL=0, T_BLK=0, T_TOV=0, T_PF=0, T_PTS=0, T_MP=0;
        Object.values(pStats).forEach(s => { 
            T_FGM+=(s.fgm||0)+(s.threePM||0); T_FGA+=(s.fga||0)+(s.threePA||0); T_3PM+=(s.threePM||0); 
            T_FTM+=(s.ftm||0); T_FTA+=(s.fta||0); T_ORB+=(s.oreb||0); T_DRB+=(s.dreb||0); 
            T_AST+=(s.ast||0); T_STL+=(s.stl||0); T_BLK+=(s.blk||0); T_TOV+=(s.tov||0); 
            T_PF+=(s.pf||0); T_PTS+=(s.pts||0); T_MP+=(s.minutes||0); 
        });

        const O_PTS = game.awayScore||0; 
        const O_FGM=opp.fgm||0; const O_FGA=opp.fga||(O_FGM+T_DRB); 
        const O_FTM=opp.ftm||0; const O_FTA=opp.fta||0; 
        const O_ORB=opp.oreb||0; const O_TRB=(opp.reb||(O_ORB+T_DRB)); 
        const O_DRB=O_TRB-O_ORB; const O_TOV=opp.tov||0; const O_MP=T_MP;

        const Team_Poss = T_FGA + 0.44*T_FTA - T_ORB + T_TOV;
        const Team_ORtg = Team_Poss>0 ? (T_PTS/Team_Poss)*100 : 0;
        const Team_DRtg = Team_Poss>0 ? (O_PTS/Team_Poss)*100 : 0;
        
        const rawPlayers = Object.entries(pStats).map(([pid, s]) => {
            const MP = s.minutes||0; if(MP===0) return null;
            const FGM=(s.fgm||0)+(s.threePM||0); const FGA=(s.fga||0)+(s.threePA||0);
            
            // Stats Basiques
            const eFG = FGA>0 ? ((FGM + 0.5*(s.threePM||0))/FGA)*100 : 0;
            const TS = (FGA + 0.44*(s.fta||0))>0 ? ((s.pts||0)/(2*(FGA + 0.44*(s.fta||0))))*100 : 0;
            
            // Estimation PIE Rapide
            const gamePIEDenom = (T_PTS + O_PTS) + (T_FGM + O_FGM) + (T_FTM + O_FTM) - (T_FGA + O_FGA) - (T_FTA + O_FTA) + (T_DRB + O_DRB) + (0.5 * (T_ORB + O_ORB)) + (T_AST + (opp.ast||0)) + (T_STL + 0) + (0.5 * (T_BLK + (opp.blk||0))) - (T_PF + (opp.fouls||0)) - (T_TOV + O_TOV);
            const playerPIENum = (s.pts||0) + FGM + (s.ftm||0) - FGA - (s.fta||0) + (s.dreb||0) + (0.5 * (s.oreb||0)) + (s.ast||0) + (s.stl||0) + (0.5 * (s.blk||0)) - (s.pf||0) - (s.tov||0);
            const pie = gamePIEDenom !== 0 ? (playerPIENum / gamePIEDenom) * 100 : 0;

            // Estimation ORtg/DRtg Individuel (Simplifié pour la modale match)
            // Note: Le calcul complet Dean Oliver est dans GlobalStats, ici on affiche une estimation
            const ORtg_Est = Team_Poss > 0 && MP > 0 ? (s.pts / (Team_Poss * (MP/T_MP))) * 100 : 0; 

            const player = players.find(p => p.id === parseInt(pid));
            return {
                id: pid, name: player?player.name:`#${pid}`, minutes: MP,
                pts: s.pts||0, ast: s.ast||0, reb: (s.oreb||0)+(s.dreb||0), stl: s.stl||0, blk: s.blk||0, tov: s.tov||0, pf: s.pf||0,
                fgm: FGM, fga: FGA, threePM: s.threePM||0, threePA: s.threePA||0, ftm: s.ftm||0, fta: s.fta||0, oreb: s.oreb||0, dreb: s.dreb||0,
                plusMinus: s.plusMinus||0, eFG: eFG.toFixed(1), TS: TS.toFixed(1), PIE: pie.toFixed(1),
                // Pour la modale match, on peut utiliser des placeholders ou l'estimation simplifiée
                // Le vrai calcul complet est lourd, voir GlobalStats pour la version saison
            };
        }).filter(p => p!==null);

        return { 
            team: { poss: Team_Poss.toFixed(1), ORtg: Team_ORtg.toFixed(1), DRtg: Team_DRtg.toFixed(1), Net: (Team_ORtg-Team_DRtg).toFixed(1) }, 
            players: rawPlayers 
        };
    }, [game, players]);

    // --- RENDU UI RESPONSIVE ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vs ${game.opponent}`} size="max-w-6xl">
            <div className="space-y-4 md:space-y-6">
                {/* Score Header : Passe en colonne sur mobile, en ligne sur PC */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="lg:col-span-2 bg-slate-900 p-3 rounded-lg flex justify-between items-center border border-slate-700 relative overflow-hidden shadow-inner">
                        <div className="text-center z-10 w-1/3">
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">Nous</div>
                            <div className="text-3xl md:text-5xl font-black text-green-400 leading-none mt-1">{game.homeScore}</div>
                        </div>
                        <div className="flex flex-col items-center z-10 px-2 text-center w-1/3 border-x border-slate-800">
                            <div className="text-[10px] md:text-xs text-slate-500">{game.date}</div>
                            <div className="text-sm md:text-lg font-bold text-white uppercase tracking-wider leading-tight mt-1">{game.opponent}</div>
                        </div>
                        <div className="text-center z-10 w-1/3">
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">Eux</div>
                            <div className="text-3xl md:text-5xl font-black text-red-400 leading-none mt-1">{game.awayScore}</div>
                        </div>
                        {/* Barre décorative dégradée en haut */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-transparent to-red-500 opacity-50"></div>
                    </div>
                    
                    {/* Stats Équipe : Grille 2x2 compacte */}
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/50 flex flex-col justify-center">
                        <div className="text-[10px] text-slate-400 uppercase mb-2 text-center border-b border-slate-700 pb-1 font-semibold">Efficacité Collective</div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div className="flex justify-between items-end"><span className="text-slate-400 text-xs">Poss:</span> <span className="text-white font-mono font-bold">{statsData.team.poss}</span></div>
                            <div className="flex justify-between items-end"><span className="text-slate-400 text-xs">NetRtg:</span> <span className={`${parseFloat(statsData.team.Net)>=0?'text-green-400':'text-red-400'} font-mono font-bold text-xs`}>{statsData.team.Net}</span></div>
                            <div className="flex justify-between items-end"><span className="text-purple-300 text-xs">ORtg:</span> <span className="text-white font-mono">{statsData.team.ORtg}</span></div>
                            <div className="flex justify-between items-end"><span className="text-red-300 text-xs">DRtg:</span> <span className="text-white font-mono">{statsData.team.DRtg}</span></div>
                        </div>
                    </div>
                </div>

                {/* Tableau des Joueurs */}
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                        <h4 className="text-orange-400 font-bold text-sm uppercase flex items-center gap-2">
                            <Icon path={Icons.Users} className="w-4 h-4"/> 
                            <span>Joueurs ({statsData.players.length})</span>
                        </h4>
                        <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 w-full sm:w-auto">
                            <button onClick={() => setViewMode('classic')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode==='classic'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Classique</button>
                            <button onClick={() => setViewMode('advanced')} className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode==='advanced'?'bg-slate-600 text-white shadow':'text-slate-400 hover:text-white'}`}>Avancé</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
                        <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-800 text-white uppercase font-semibold text-[10px] md:text-xs">
                                <tr>
                                    <th className="p-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700 w-24 md:w-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Joueur</th>
                                    <th className="p-3 text-center">MIN</th>
                                    {viewMode === 'classic' ? (
                                        <>
                                            <th className="p-3 text-center text-orange-400 font-bold text-sm">PTS</th>
                                            <th className="p-3 text-center">TIR</th>
                                            <th className="p-3 text-center text-slate-400">3P</th>
                                            <th className="p-3 text-center text-slate-400">LF</th>
                                            <th className="p-3 text-center font-bold text-white">REB</th>
                                            <th className="p-3 text-center">AST</th>
                                            <th className="p-3 text-center">INT</th>
                                            <th className="p-3 text-center">CTR</th>
                                            <th className="p-3 text-center text-red-400">BP</th>
                                            <th className="p-3 text-center text-red-400">FTE</th>
                                            <th className="p-3 text-center font-bold">+/-</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-3 text-center text-orange-400 font-bold text-sm">PTS</th>
                                            <th className="p-3 text-center text-blue-300">eFG%</th>
                                            <th className="p-3 text-center text-purple-300">TS%</th>
                                            <th className="p-3 text-center text-cyan-400 font-bold">PIE</th>
                                            <th className="p-3 text-center">AST</th>
                                            <th className="p-3 text-center text-red-400">BP</th>
                                            <th className="p-3 text-center text-yellow-400 font-bold border-l border-slate-700">+/-</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {statsData.players.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 font-bold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] truncate max-w-[100px] md:max-w-none">
                                            {p.name}
                                        </td>
                                        <td className="p-3 text-center text-slate-500 font-mono">{p.minutes}</td>
                                        {viewMode === 'classic' ? (
                                            <>
                                                <td className="p-3 text-center font-bold text-orange-400 text-sm">{p.pts}</td>
                                                <td className="p-3 text-center">{p.fgm}-{p.fga}</td>
                                                <td className="p-3 text-center text-slate-500">{p.threePM}-{p.threePA}</td>
                                                <td className="p-3 text-center text-slate-500">{p.ftm}-{p.fta}</td>
                                                <td className="p-3 text-center font-bold text-white">{p.reb} <span className="text-[9px] font-normal text-slate-500 ml-0.5">({p.oreb}/{p.dreb})</span></td>
                                                <td className="p-3 text-center">{p.ast}</td>
                                                <td className="p-3 text-center">{p.stl}</td>
                                                <td className="p-3 text-center">{p.blk}</td>
                                                <td className="p-3 text-center text-red-400">{p.tov}</td>
                                                <td className="p-3 text-center text-red-400">{p.pf}</td>
                                                <td className={`p-3 text-center font-bold ${p.plusMinus>=0?'text-green-400':'text-red-400'}`}>{p.plusMinus>0?'+':''}{p.plusMinus}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-3 text-center font-bold text-orange-400 text-sm">{p.pts}</td>
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
