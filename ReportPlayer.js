// reportPlayer.js
// Version : "Direct Client-Side AI" (Sans PHP)
// Dépendances : React, TailwindCSS

// --- CONFIGURATION ---
// ⚠️ Collez votre clé API Google Gemini ci-dessous
const GEMINI_API_KEY = "AIzaSyBNE1nYL3s-Gyz793HpXN9jQrUwPVsNpZ4"; 
// --- UTILITAIRE : Gestion des Dates ---
const parseFrenchDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}`);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
};

// =================================================================================
// 2. MOTEUR D'ANALYSE STATISTIQUE (MATHS)
// =================================================================================

// =================================================================================
// REFONTE AnalysisEngine — NetRtg + Fallback Narrative
// Remplace les sections correspondantes dans reportPlayer.js
// =================================================================================

const LEVEL_BENCHMARKS = {
    'NBA':          { id: 'NBA',          label: 'NBA',             ts_elite: 62, ts_good: 57, ts_bad: 52, usage_high: 28, usage_low: 15, ast_good: 6,  astTov_good: 2.8, astTov_bad: 1.5, oreb_good: 2.0, reb_dom: 10, def_active: 2.5, pf36_warn: 4.0, pf36_bad: 5.0, threePct_good: 37, trend_delta: 3 },
    'Euroleague':   { id: 'Euroleague',   label: 'Euroleague',      ts_elite: 60, ts_good: 55, ts_bad: 50, usage_high: 26, usage_low: 14, ast_good: 5,  astTov_good: 2.5, astTov_bad: 1.3, oreb_good: 2.0, reb_dom: 9,  def_active: 2.5, pf36_warn: 4.0, pf36_bad: 5.0, threePct_good: 36, trend_delta: 3 },
    'Eurocup':      { id: 'Eurocup',      label: 'Eurocup',         ts_elite: 59, ts_good: 54, ts_bad: 49, usage_high: 25, usage_low: 14, ast_good: 5,  astTov_good: 2.3, astTov_bad: 1.2, oreb_good: 2.0, reb_dom: 9,  def_active: 2.3, pf36_warn: 4.2, pf36_bad: 5.2, threePct_good: 35, trend_delta: 3 },
    'LNB':          { id: 'LNB',          label: 'Betclic Élite',   ts_elite: 58, ts_good: 53, ts_bad: 48, usage_high: 25, usage_low: 14, ast_good: 4.5,astTov_good: 2.2, astTov_bad: 1.2, oreb_good: 1.8, reb_dom: 8,  def_active: 2.2, pf36_warn: 4.2, pf36_bad: 5.5, threePct_good: 34, trend_delta: 3 },
    'NM2':          { id: 'NM2',          label: 'NM2',             ts_elite: 56, ts_good: 51, ts_bad: 46, usage_high: 24, usage_low: 13, ast_good: 4,  astTov_good: 2.0, astTov_bad: 1.1, oreb_good: 1.8, reb_dom: 8,  def_active: 2.0, pf36_warn: 4.5, pf36_bad: 5.5, threePct_good: 33, trend_delta: 4 },
    'U21_Elite':    { id: 'U21_Elite',    label: 'U21 Élite',       ts_elite: 55, ts_good: 50, ts_bad: 45, usage_high: 26, usage_low: 14, ast_good: 4,  astTov_good: 2.0, astTov_bad: 1.0, oreb_good: 2.2, reb_dom: 9,  def_active: 2.2, pf36_warn: 4.5, pf36_bad: 5.5, threePct_good: 32, trend_delta: 4 },
    'U18_Elite':    { id: 'U18_Elite',    label: 'U18 Élite',       ts_elite: 53, ts_good: 48, ts_bad: 43, usage_high: 25, usage_low: 13, ast_good: 3.5,astTov_good: 1.8, astTov_bad: 1.0, oreb_good: 2.5, reb_dom: 9,  def_active: 2.5, pf36_warn: 4.5, pf36_bad: 6.0, threePct_good: 30, trend_delta: 4 },
};

// Niveau par défaut (modifiable via l'UI)
let CURRENT_LEVEL = 'U18_Elite';

const getBenchmarks = () => LEVEL_BENCHMARKS[CURRENT_LEVEL] || LEVEL_BENCHMARKS['U18_Elite'];

const AnalysisEngine = {

    // --- ESTIMATION DES POSSESSIONS ---
    // Utilise les stats adverses si disponibles, sinon estimation symétrique
    _estimatePoss: (teamTotals, oppTotals) => {
        const t = teamTotals;
        // Cas 1 : on a les stats adverses (oppFGA, oppOREB, etc.)
        if (oppTotals && oppTotals.fga > 0) {
            const tORB_pct = (t.oreb + (oppTotals.dreb || 0)) > 0
                ? t.oreb / (t.oreb + (oppTotals.dreb || 0))
                : 0;
            const oORB_pct = ((oppTotals.oreb || 0) + (t.dreb || 0)) > 0
                ? (oppTotals.oreb || 0) / ((oppTotals.oreb || 0) + (t.dreb || 0))
                : 0;
            const tPoss = t.fga + 0.4 * t.fta - 1.07 * tORB_pct * (t.fga - t.fgm) + t.tov;
            const oPoss = oppTotals.fga + 0.4 * (oppTotals.fta || 0)
                - 1.07 * oORB_pct * (oppTotals.fga - (oppTotals.fgm || 0))
                + (oppTotals.tov || 0);
            // Moyenne des deux estimations (méthode standard Basketball-Reference)
            return Math.max(1, (tPoss + oPoss) / 2);
        }
        // Cas 2 : pas de données adverses — estimation par l'équipe seule
        // Formule simplifiée sans ORB% adverse (on ignore le terme correctif)
        return Math.max(1, t.fga + 0.44 * t.fta + t.tov - t.oreb);
    },

    // --- CALCUL NetRtg PAR MATCH ---
    // Retourne un NetRtg normalisé /100 poss pour un joueur dans un match donné
    _calcPlayerNetRtg: (playerStat, teamTotals, oppTotals, teamMin) => {
        const pMin = parseFloat(playerStat.min || playerStat.minutes || 0);
        if (pMin <= 0 || teamMin <= 0) return 0;

        const poss = AnalysisEngine._estimatePoss(teamTotals, oppTotals);
        const pm = parseFloat(playerStat.plusMinus || 0);

        // Possessions pendant le temps de jeu du joueur (prorata minutes)
        const playerPoss = poss * (pMin / (teamMin / 5));
        if (playerPoss <= 0) return 0;

        // Net Rating = +/- normalisé à 100 possessions
        return (pm / playerPoss) * 100;
    },

    // --- PROCESSEUR PRINCIPAL (modifié) ---
    processPlayerData: (games, roster) => {
        if (!roster || !Array.isArray(roster)) return [];

        // Phase 1 : Agréger les totaux par match (équipe + adversaire si dispo)
        const gameContext = {};
        if (games && Array.isArray(games)) {
            games.forEach(game => {
                const rawData = game.players || game.playerStats;
                if (!rawData) return;
                const list = Array.isArray(rawData) ? rawData : Object.values(rawData);

                const team = { min: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, tov: 0, oreb: 0, dreb: 0 };
                list.forEach(s => {
                    team.min += parseFloat(s.min || s.minutes || 0);
                    team.fga += parseFloat(s.fga || 0);
                    team.fgm += parseFloat(s.fgm || 0);
                    team.fta += parseFloat(s.fta || 0);
                    team.ftm += parseFloat(s.ftm || 0);
                    team.tov += parseFloat(s.tov || 0);
                    team.oreb += parseFloat(s.oreb || 0);
                    team.dreb += parseFloat(s.dreb || 0);
                });

                // Stats adverses (si le format du match les fournit)
                const opp = game.opponentStats || game.oppStats || null;

                gameContext[game.id] = { team, opp };
            });
        }

        // Phase 2 : Mapper les joueurs
        const playerMap = {};
        roster.forEach(p => playerMap[p.id] = { ...p, logs: [] });

        if (games && Array.isArray(games)) {
            const sortedGames = [...games].sort((a, b) => parseFrenchDate(b.date) - parseFrenchDate(a.date));

            sortedGames.forEach(game => {
                const rawData = game.players || game.playerStats;
                if (!rawData) return;
                const ctx = gameContext[game.id] || { team: { min: 200, fga: 50, fta: 10, tov: 10, oreb: 0, dreb: 0, fgm: 20, ftm: 5 }, opp: null };

                let matchStats = Array.isArray(rawData)
                    ? rawData
                    : Object.keys(rawData).map(key => ({ ...rawData[key], id: rawData[key].id || key }));

                matchStats.forEach(stat => {
                    if (!playerMap[stat.id]) {
                        playerMap[stat.id] = { id: stat.id, name: stat.name || `#${stat.number}`, number: stat.number, logs: [] };
                    }

                    const min = parseFloat(stat.min || stat.minutes || 0);
                    const pts = parseFloat(stat.pts || 0);
                    const fga = parseFloat(stat.fga || 0);
                    const fouls = parseFloat(stat.fouls || stat.pf || 0);

                    if (min > 0 || pts > 0 || fouls > 0 || fga > 0) {
                        const reb = parseFloat(stat.reb || 0) > 0 ? parseFloat(stat.reb) : (parseFloat(stat.oreb || 0) + parseFloat(stat.dreb || 0));
                        const ast = parseFloat(stat.ast || 0);
                        const stl = parseFloat(stat.stl || 0);
                        const blk = parseFloat(stat.blk || 0);
                        const tov = parseFloat(stat.tov || 0);
                        const fgm = parseFloat(stat.fgm || 0);
                        const fta = parseFloat(stat.fta || 0);
                        const ftm = parseFloat(stat.ftm || 0);
                        const oreb = parseFloat(stat.oreb || 0);
                        const threea = parseFloat(stat.threea || stat.threePA || 0);
                        const threem = parseFloat(stat.threem || stat.threePM || 0);

                        const missedFG = Math.max(0, fga - fgm);
                        const missedFT = Math.max(0, fta - ftm);
                        const eff = (pts + reb + ast + stl + blk) - (missedFG + missedFT + tov);

                        // Usage% (inchangé)
                        let usage = 0;
                        if (min > 0 && ctx.team.min > 0) {
                            const teamPoss = ctx.team.fga + 0.44 * ctx.team.fta + ctx.team.tov;
                            const playPoss = fga + 0.44 * fta + tov;
                            usage = 100 * ((playPoss * (ctx.team.min / 5)) / (min * teamPoss));
                        }

                        // NetRtg (NOUVEAU : via estimation possessions)
                        const netRtg = AnalysisEngine._calcPlayerNetRtg(stat, ctx.team, ctx.opp, ctx.team.min);

                        playerMap[stat.id].logs.push({
                            date: game.date || "",
                            rawDate: parseFrenchDate(game.date),
                            opponent: game.opponent || 'N/A',
                            isWin: (parseInt(game.homeScore) > parseInt(game.awayScore)),
                            pts, reb, ast, stl, blk, tov, fga, fgm, fta, ftm, threea, threem, oreb, min, fouls,
                            plusMinus: parseFloat(stat.plusMinus || 0),
                            eff, usage, netRtg
                        });
                    }
                });
            });
        }

        // Phase 3 : Calcul des moyennes (identique à l'existant)
        return Object.values(playerMap).map(p => {
            p.logs.sort((a, b) => b.rawDate - a.rawDate);
            const gp = p.logs.length;
            if (gp === 0) return { ...p, avg: { pts:0,reb:0,ast:0,eff:0,min:0,usage:0,TS:0,eFG:0,threePAr:0,FTr:0,astTov:0,pf36:0,netRtg:0,fgPct:0,threePct:0,ftPct:0,threea:0,oreb:0,stl:0,blk:0 } };

            const sum = (k) => p.logs.reduce((acc, c) => acc + (c[k] || 0), 0);

            const avg = {
                pts: sum('pts')/gp, reb: sum('reb')/gp, ast: sum('ast')/gp, stl: sum('stl')/gp, blk: sum('blk')/gp,
                tov: sum('tov')/gp, min: sum('min')/gp, eff: sum('eff')/gp, plusMinus: sum('plusMinus')/gp,
                oreb: sum('oreb')/gp, fouls: sum('fouls')/gp, usage: sum('usage')/gp, netRtg: sum('netRtg')/gp,
                fga: sum('fga'), fgm: sum('fgm'), threea: sum('threea')/gp, threem: sum('threem'), fta: sum('fta'), ftm: sum('ftm')
            };

            avg.fgPct = avg.fga > 0 ? (avg.fgm / avg.fga) * 100 : 0;
            avg.threePct = avg.threea > 0 ? (avg.threem / avg.threea) * 100 : 0;
            avg.ftPct = avg.fta > 0 ? (avg.ftm / avg.fta) * 100 : 0;
            avg.TS = avg.fga > 0 ? (sum('pts') / (2 * (avg.fga + 0.44 * avg.fta))) * 100 : 0;
            avg.eFG = avg.fga > 0 ? (avg.fgm + 0.5 * avg.threem) / avg.fga * 100 : 0;
            avg.threePAr = avg.fga > 0 ? avg.threea / avg.fga : 0;
            avg.FTr = avg.fga > 0 ? avg.fta / avg.fga : 0;
            avg.astTov = avg.tov > 0 ? avg.ast / avg.tov : avg.ast;
            avg.pf36 = avg.min > 0 ? (avg.fouls / avg.min) * 36 : 0;

            return { ...p, avg };
        }).sort((a, b) => b.avg.eff - a.avg.eff);
    },

    // --- ARCHETYPE (inchangé) ---
    getArchetype: (avg) => {
        if (avg.pts === 0 && avg.reb === 0) return { name: "Non Évalué", desc: "Pas de données.", color: "text-slate-500", border: "border-slate-700", bg: "bg-slate-800" };
        if (avg.usage > 28) return { name: "Option #1", desc: "Focal point de l'attaque.", color: "text-amber-400", border: "border-amber-500", bg: "bg-amber-900/20" };
        if (avg.usage < 15 && avg.TS > 58) return { name: "Finisseur", desc: "Faible volume, haute efficacité.", color: "text-green-400", border: "border-green-500", bg: "bg-green-900/20" };
        if (avg.ast > 5 && avg.astTov > 2.5) return { name: "Floor General", desc: "Gestionnaire d'élite.", color: "text-indigo-400", border: "border-indigo-500", bg: "bg-indigo-900/20" };
        if (avg.threePAr > 0.50) return { name: "Sniper", desc: "Menace extérieure majeure.", color: "text-cyan-400", border: "border-cyan-500", bg: "bg-cyan-900/20" };
        if (avg.oreb > 2.5 || avg.reb > 9) return { name: "Paint Beast", desc: "Domination intérieure.", color: "text-blue-400", border: "border-blue-500", bg: "bg-blue-900/20" };
        if ((avg.stl + avg.blk) > 2.5) return { name: "Lockdown", desc: "Impact défensif majeur.", color: "text-red-500", border: "border-red-600", bg: "bg-red-900/20" };
        return { name: "Rotation", desc: "Joueur de complément.", color: "text-slate-400", border: "border-slate-500", bg: "bg-slate-900" };
    },

    // --- SWOT (calibré par niveau) ---
    getSWOT: (p) => {
        const s = [], w = [], a = p.avg;
        const B = getBenchmarks();
        if (p.logs.length === 0) return { strengths: [], weaknesses: [] };
        if (a.TS > B.ts_elite) s.push(`Scoreur Élite (TS% ${a.TS.toFixed(0)}%)`);
        else if (a.TS > B.ts_good) s.push(`Efficace (TS% ${a.TS.toFixed(0)}%)`);
        if (a.astTov > B.astTov_good && a.ast > 2) s.push(`Gestionnaire Sûr (Ratio ${a.astTov.toFixed(1)})`);
        if (a.oreb > B.oreb_good) s.push("Guerrier Rebond Offensif");
        if (a.FTr > 0.35) s.push("Provoque des Fautes");
        if (a.netRtg > 8) s.push(`Impact Victoire (+/-)`);
        if (a.threePct > B.threePct_good && a.threea > 2) s.push("Spacer (3 pts)");
        if (a.TS < B.ts_bad && a.usage > B.usage_low + 5) w.push("Inefficace pour son volume");
        if (a.astTov < B.astTov_bad && a.ast > 1) w.push("Prise de décision (Pertes de balle)");
        if (a.pf36 > B.pf36_warn) w.push(`Foul Trouble (${a.pf36.toFixed(1)}/36m)`);
        return { strengths: s, weaknesses: w };
    },

    // =================================================================================
    // FALLBACK NARRATIVE — Texte "scout" calibré par niveau de compétition
    // =================================================================================
    getFallbackNarrative: (p) => {
        const a = p.avg;
        const gp = p.logs.length;
        if (!a || gp === 0) return "Pas assez de données pour établir un profil.";

        const B = getBenchmarks();
        const arch = AnalysisEngine.getArchetype(a);
        const parts = [];

        // --- Bloc 1 : Identité ---
        parts.push(`Profil ${arch.name} sur ${gp} match${gp > 1 ? 's' : ''} (réf. ${B.label}).`);

        // --- Bloc 2 : Scoring (seuils TS calibrés au niveau) ---
        if (a.usage > B.usage_high) {
            if (a.TS > B.ts_elite) parts.push(`Première option offensive crédible : ${a.pts.toFixed(1)} pts à ${a.TS.toFixed(0)}% TS, ratio volume/efficacité au-dessus du lot pour le niveau.`);
            else if (a.TS > B.ts_bad) parts.push(`Gros volume (USG ${a.usage.toFixed(0)}%) mais efficacité perfectible (${a.TS.toFixed(0)}% TS). Tendance croqueur.`);
            else parts.push(`Volume de tir élevé (USG ${a.usage.toFixed(0)}%) pour une efficacité insuffisante (${a.TS.toFixed(0)}% TS, seuil ${B.label} : ${B.ts_good}%). Doit apprendre à choisir ses tirs.`);
        } else if (a.usage > B.usage_low) {
            if (a.TS > B.ts_elite) parts.push(`Scoreur efficace dans l'ombre : ${a.pts.toFixed(1)} pts à ${a.TS.toFixed(0)}% TS sur volume modéré.`);
            else if (a.TS < B.ts_bad) parts.push(`Production offensive limitée (${a.pts.toFixed(1)} pts, ${a.TS.toFixed(0)}% TS). Doit contribuer autrement.`);
        } else {
            if (a.TS > B.ts_elite + 2) parts.push(`Finisseur discret mais redoutable : convertit à ${a.TS.toFixed(0)}% TS sur faible volume.`);
            else parts.push(`Rôle offensif mineur (USG ${a.usage.toFixed(0)}%).`);
        }

        // --- Bloc 3 : Shoot extérieur ---
        if (a.threePAr > 0.50 && a.threePct > B.threePct_good) {
            parts.push(`Menace extérieure confirmée (${a.threePct.toFixed(0)}% à 3pts, rate ${a.threePAr.toFixed(2)}).`);
        } else if (a.threePAr > 0.40 && a.threePct < B.threePct_good - 4) {
            parts.push(`Shoot trop de 3pts (rate ${a.threePAr.toFixed(2)}) pour son adresse (${a.threePct.toFixed(0)}%, réf. ${B.label} : ${B.threePct_good}%). Sélection à revoir.`);
        }

        // --- Bloc 4 : Création / Passes ---
        if (a.ast > B.ast_good && a.astTov > B.astTov_good) {
            parts.push(`Gestionnaire de balle sûr (${a.ast.toFixed(1)} ast, ratio ${a.astTov.toFixed(1)}).`);
        } else if (a.ast > B.ast_good * 0.75 && a.astTov < B.astTov_bad) {
            parts.push(`Crée du jeu (${a.ast.toFixed(1)} ast) mais perd trop de ballons (ratio ${a.astTov.toFixed(1)}). Discipline à travailler.`);
        } else if (a.astTov < 1.0 && a.tov > 1.5) {
            parts.push(`Pertes de balle préoccupantes (ratio Ast/TO ${a.astTov.toFixed(1)}).`);
        }

        // --- Bloc 5 : Impact / Rebond ---
        if (a.oreb > B.oreb_good) {
            parts.push(`Présence au rebond offensif (${a.oreb.toFixed(1)}/match). Seconde chance.`);
        }
        if (a.reb > B.reb_dom) {
            parts.push(`Dominant au rebond (${a.reb.toFixed(1)}/match).`);
        }
        if (a.netRtg > 10) {
            parts.push(`Impact collectif fort : l'équipe performe nettement mieux avec lui sur le terrain.`);
        } else if (a.netRtg < -8) {
            parts.push(`Impact collectif négatif : le groupe souffre sur ses minutes.`);
        }

        // --- Bloc 6 : Défense / Discipline ---
        if ((a.stl + (a.blk || 0)) > B.def_active) {
            parts.push(`Activité défensive notable (${a.stl.toFixed(1)} int + ${(a.blk||0).toFixed(1)} ctr).`);
        }
        if (a.pf36 > B.pf36_bad) {
            parts.push(`Problème de fautes récurrent (${a.pf36.toFixed(1)}/36m). Risque de foul trouble.`);
        } else if (a.pf36 > B.pf36_warn) {
            parts.push(`Discipline limite (${a.pf36.toFixed(1)} fautes/36m).`);
        }

        // --- Bloc 7 : Tendance récente ---
        if (gp >= 5) {
            const last3 = p.logs.slice(0, 3);
            const recentPts = last3.reduce((s, l) => s + l.pts, 0) / 3;
            const diff = recentPts - a.pts;
            if (diff > B.trend_delta) parts.push(`Montée en puissance récente (+${diff.toFixed(1)} pts sur les 3 derniers matchs).`);
            else if (diff < -B.trend_delta) parts.push(`En baisse de régime sur les 3 derniers matchs (${diff.toFixed(1)} pts).`);
        }

        return parts.join(' ');
    }
};

// =================================================================================
// 3. COMPOSANTS VISUELS
// =================================================================================

const ScoutingRadar = ({ avg }) => {
    const MAX = { pts: 22, reb: 11, ast: 7, def: 4.5, eff: 20 };
    const val = (v, m) => Math.min((v || 0) / m, 1);
    const stats = [{l:"SCO",v:val(avg.pts,MAX.pts)},{l:"REB",v:val(avg.reb,MAX.reb)},{l:"AST",v:val(avg.ast,MAX.ast)},{l:"DEF",v:val(avg.stl+avg.blk,MAX.def)},{l:"EFF",v:val(avg.eff,MAX.eff)}];
    const c=60, r=40, poly=(d,f)=>d.map((s,i)=>{const a=(Math.PI*2*i)/5-Math.PI/2,v=f?f(s.v):r;return`${c+Math.cos(a)*v},${c+Math.sin(a)*v}`}).join(" ");
    return (
        <svg viewBox="0 0 120 120" className="w-full h-40 filter drop-shadow-lg">
            {[0.2,0.4,0.6,0.8,1].map((k,i)=><polygon key={i} points={poly(stats,()=>r*k)} fill={i%2?"#0f172a":"#1e293b"} stroke="#334155" strokeWidth="0.5"/>)}
            <polygon points={poly(stats,v=>r*v)} fill="rgba(99,102,241,0.5)" stroke="#6366f1" strokeWidth="2"/>
            {stats.map((s,i)=>{const a=(Math.PI*2*i)/5-Math.PI/2;return<text key={i} x={c+Math.cos(a)*(r+14)} y={c+Math.sin(a)*(r+10)} fontSize="7" fontWeight="bold" fill="#94a3b8" textAnchor="middle">{s.l}</text>})}
        </svg>
    );
};

// =================================================================================
// 4. COMPOSANT PRINCIPAL
// =================================================================================

const PlayerReportModule = ({ currentUser, onClose, games: propGames, roster: propRoster }) => {
    const [players, setPlayers] = React.useState([]);
    const [selectedId, setSelectedId] = React.useState(null);
    const [aiNarrative, setAiNarrative] = React.useState(null);
    const [isAiLoading, setIsAiLoading] = React.useState(false);

    React.useEffect(() => {
        if (propRoster) setPlayers(AnalysisEngine.processPlayerData(propGames || [], propRoster));
    }, [propGames, propRoster]);

    React.useEffect(() => { setAiNarrative(null); setIsAiLoading(false); }, [selectedId]);

    if (!currentUser || (currentUser.role !== 'coach' && currentUser.role !== 'admin')) return null;

    if (!selectedId) {
        return (
            <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col font-sans text-slate-200">
                <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shadow-lg z-10">
                    <div><h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase tracking-tighter">Scouting<span className="text-white">Pro</span></h1><p className="text-slate-400 text-xs mt-1">{players.length} Profils</p></div>
                    <button onClick={onClose} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg hover:text-white border border-slate-700">Fermer</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {players.map(p => {
                            const arch = AnalysisEngine.getArchetype(p.avg);
                            return (
                                <button key={p.id} onClick={() => setSelectedId(p.id)} className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl text-left hover:border-indigo-500 hover:bg-slate-800/80 transition-all relative overflow-hidden group shadow-lg flex flex-col h-full">
                                    {p.photo && <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center grayscale" style={{backgroundImage: `url(${p.photo})`}}></div>}
                                    <div className="relative z-10">
                                        <div className={`absolute -right-3 -top-3 text-6xl font-black opacity-[0.05] group-hover:opacity-[0.1] ${arch.color}`}>#{p.number}</div>
                                        <div className="flex justify-between items-end mb-2"><span className="text-xl font-bold text-white truncate pr-2">{p.name}</span><span className="text-slate-500 font-mono text-sm">#{p.number}</span></div>
                                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-4 border ${arch.border} ${arch.color} ${arch.bg}`}>{arch.name}</div>
                                        <div className="flex items-end gap-4 mt-auto pt-4 border-t border-slate-800/50">
                                            <div><div className="text-[10px] text-slate-500 uppercase">PTS</div><div className="text-lg font-bold text-white">{p.avg.pts.toFixed(1)}</div></div>
                                            <div><div className="text-[10px] text-slate-500 uppercase">USG%</div><div className="text-lg font-bold text-slate-300">{p.avg.usage.toFixed(0)}%</div></div>
                                            <div className="ml-auto"><div className="text-[10px] text-slate-500 uppercase text-right">EVAL</div><div className="text-lg font-bold text-yellow-500 text-right">{p.avg.eff.toFixed(1)}</div></div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    const p = players.find(x => x.id === selectedId);
    if (!p) return null;
    const arch = AnalysisEngine.getArchetype(p.avg);
    const swot = AnalysisEngine.getSWOT(p);
    const narrativeText = aiNarrative || AnalysisEngine.getFallbackNarrative(p);
    const last5 = p.logs.slice(0, 5);

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950 overflow-y-auto font-sans text-slate-200">
            <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 p-3 flex justify-between items-center z-50 print:hidden shadow-md">
                <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold uppercase text-sm"><span>← Retour</span></button>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2"><span>🖨️</span> Imprimer</button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-24 print:p-0">
                <section className={`rounded-2xl p-8 border-l-8 ${arch.border} bg-slate-900 relative overflow-hidden shadow-2xl`}>
                    {p.photo && <div className="absolute inset-0 z-0 opacity-40 bg-cover bg-center" style={{backgroundImage: `url(${p.photo})`, backgroundBlendMode: 'overlay'}}></div>}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-0"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2"><h1 className="text-5xl font-black text-white uppercase tracking-tighter">{p.name}</h1><span className="text-3xl text-slate-500 font-mono">#{p.number}</span></div>
                            <div className="flex items-center gap-3"><span className={`text-2xl font-bold uppercase tracking-wide ${arch.color}`}>{arch.name}</span><span className="text-slate-400 italic">"{arch.desc}"</span></div>
                        </div>
                        <div className="flex gap-6 bg-slate-950/50 p-4 rounded-xl backdrop-blur-sm border border-slate-800/50">
                             <div><div className="text-3xl font-black text-white">{p.avg.pts.toFixed(1)}</div><div className="text-[10px] font-bold text-slate-500">PTS</div></div>
                             <div><div className="text-3xl font-black text-white">{p.avg.reb.toFixed(1)}</div><div className="text-[10px] font-bold text-slate-500">REB</div></div>
                             <div><div className="text-3xl font-black text-white">{p.avg.ast.toFixed(1)}</div><div className="text-[10px] font-bold text-slate-500">AST</div></div>
                             <div><div className="text-3xl font-black text-yellow-400">{p.avg.eff.toFixed(1)}</div><div className="text-[10px] font-bold text-yellow-600">EVAL</div></div>
                        </div>
                    </div>
                </section>

                <div className={`border p-6 rounded-xl relative overflow-hidden ${aiNarrative ? 'bg-indigo-900/20 border-indigo-500/40' : 'bg-slate-900 border-slate-800'}`}>
                    <h3 className={`${aiNarrative ? 'text-indigo-400' : 'text-slate-400'} font-bold uppercase text-xs mb-2 flex items-center gap-2`}>
                        <span className="text-lg">{aiNarrative ? '🤖' : '📝'}</span> {aiNarrative ? 'Synthèse Gemini AI' : 'Note Rapide'}
                    </h3>
                    <p className="text-slate-200 text-lg leading-relaxed font-medium">{isAiLoading ? <span className="animate-pulse">Analyse IA en cours...</span> : narrativeText}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 w-full">Empreinte Statistique</h3>
                        <ScoutingRadar avg={p.avg} />
                    </div>
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest"><span className="text-indigo-400">Advanced</span> Metrics</h3><span className="text-xs font-mono text-slate-600 bg-slate-950 px-2 py-1 rounded">{p.logs.length} Matchs</span></div>
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50 text-center"><div className={`text-xl font-bold ${p.avg.TS>58?'text-green-400':'text-white'}`}>{p.avg.TS.toFixed(0)}%</div><div className="text-[10px] uppercase text-slate-500">True Shooting</div></div>
                            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50 text-center"><div className="text-xl font-bold text-white">{p.avg.eFG.toFixed(0)}%</div><div className="text-[10px] uppercase text-slate-500">eFG%</div></div>
                            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50 text-center"><div className="text-xl font-bold text-white">{p.avg.threePAr.toFixed(2)}</div><div className="text-[10px] uppercase text-slate-500">3P Rate</div></div>
                            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50 text-center"><div className="text-xl font-bold text-white">{p.avg.FTr.toFixed(2)}</div><div className="text-[10px] uppercase text-slate-500">FT Rate</div></div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="p-3 bg-slate-950/30 rounded text-center"><div className="text-xl font-bold text-slate-200">{p.avg.usage.toFixed(1)}%</div><div className="text-[10px] uppercase text-slate-500">Usage %</div></div>
                            <div className="p-3 bg-slate-950/30 rounded text-center"><div className={`text-xl font-bold ${p.avg.astTov>2.5?'text-green-400':p.avg.astTov<1?'text-red-400':'text-slate-200'}`}>{p.avg.astTov.toFixed(1)}</div><div className="text-[10px] uppercase text-slate-500">Ast/TO</div></div>
                            <div className="p-3 bg-slate-950/30 rounded text-center"><div className={`text-xl font-bold ${p.avg.netRtg>0?'text-green-400':'text-red-400'}`}>{p.avg.netRtg>0?'+':''}{p.avg.netRtg.toFixed(0)}</div><div className="text-[10px] uppercase text-slate-500">Net Rtg</div></div>
                            <div className="p-3 bg-slate-950/30 rounded text-center"><div className={`text-xl font-bold ${p.avg.pf36>4?'text-red-400':'text-slate-200'}`}>{p.avg.pf36.toFixed(1)}</div><div className="text-[10px] uppercase text-slate-500">PF / 36m</div></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-full pointer-events-none"></div>
                        <h4 className="text-green-400 font-black uppercase text-sm mb-4">▲ Forces</h4>
                        <ul className="space-y-3">{swot.strengths.map((s,i)=><li key={i} className="flex gap-3 text-slate-300 text-sm p-3 bg-slate-950/50 rounded-lg border border-green-900/20"><span className="text-green-500 font-bold">✓</span>{s}</li>)}</ul>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none"></div>
                        <h4 className="text-red-400 font-black uppercase text-sm mb-4">▼ Vigilance</h4>
                        <ul className="space-y-3">{swot.weaknesses.map((w,i)=><li key={i} className="flex gap-3 text-slate-300 text-sm p-3 bg-slate-950/50 rounded-lg border border-red-900/20"><span className="text-red-500 font-bold">!</span>{w}</li>)}</ul>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-950 border-b border-slate-800"><h3 className="text-xs font-bold text-slate-400 uppercase">5 Derniers Matchs</h3></div>
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-950"><tr><th className="p-3">Date</th><th className="p-3">Adv</th><th className="p-3 text-center">MIN</th><th className="p-3 text-center">PTS</th><th className="p-3 text-center">REB</th><th className="p-3 text-center">AST</th><th className="p-3 text-center">EVAL</th><th className="p-3 text-center">+/-</th></tr></thead>
                        <tbody className="divide-y divide-slate-800">
                            {last5.map((l,i)=>(
                                <tr key={i} className="hover:bg-slate-800/30">
                                    <td className="p-3 text-xs font-mono">{l.rawDate.toLocaleDateString('fr-FR')}</td>
                                    <td className="p-3 text-white">{l.opponent}</td>
                                    <td className="p-3 text-center text-xs">{l.min}</td>
                                    <td className="p-3 text-center font-bold text-white">{l.pts}</td>
                                    <td className="p-3 text-center">{l.reb}</td>
                                    <td className="p-3 text-center">{l.ast}</td>
                                    <td className="p-3 text-center font-bold text-yellow-400">{l.eff.toFixed(0)}</td>
                                    <td className={`p-3 text-center font-bold ${l.plusMinus>0?'text-green-500':l.plusMinus<0?'text-red-500':'text-slate-500'}`}>{l.plusMinus>0?'+':''}{l.plusMinus}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

window.PlayerReportModule = PlayerReportModule;