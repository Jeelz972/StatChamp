// PlayByPlayEditor.js — Composant React d'édition Play-by-Play + moteur de recalcul
// Scope global pour compatibilité Babel standalone (pas d'import/export)
//
// Fixes appliqués :
// 1. recalcMinutesFromSubs : isolation des deux équipes (deux passes séparées)
// 2. calculatePlayIntervals : même isolation
// 3. isOpponent : gère les PIDs string ("1005") en plus des number
// 4. StartersEditorModal : reçoit quarterOptions en prop au lieu de hardcoder [1,2,3,4]

(function () {
    "use strict";
    const { useState, useEffect, useMemo, useCallback, useRef } = React;

    // ========================================================
    // CONSTANTES
    // ========================================================
    const ACTION_TYPES = [
        { value: 'SHOT', label: 'Tir' },
        { value: 'FT', label: 'Lancer Franc' },
        { value: 'FOUL', label: 'Faute' },
        { value: 'OREB', label: 'Reb Off' },
        { value: 'DREB', label: 'Reb Def' },
        { value: 'AST', label: 'Passe D' },
        { value: 'STL', label: 'Interception' },
        { value: 'BLK', label: 'Contre' },
        { value: 'TOV', label: 'Perte' },
        { value: 'SUB', label: 'Changement' }
    ];

    const FOUL_TYPES = [
        { value: 'PERSONAL', label: 'Personnelle', short: 'P', color: 'bg-red-700' },
        { value: 'OFFENSIVE', label: 'Offensive', short: 'O', color: 'bg-orange-700' },
        { value: 'TECHNICAL', label: 'Technique', short: 'T', color: 'bg-yellow-700' },
        { value: 'UNSPORTSMANLIKE', label: 'Antisportive', short: 'U', color: 'bg-purple-700' }
    ];

    const SHOT_ZONES = [
        { id: 'paint', label: 'Raquette', val: 2, x: 0.5, y: 0.8 },
        { id: 'mid_left', label: 'Mi-dist G', val: 2, x: 0.25, y: 0.55 },
        { id: 'mid_right', label: 'Mi-dist D', val: 2, x: 0.75, y: 0.55 },
        { id: 'mid_top', label: 'Mi-dist Axe', val: 2, x: 0.5, y: 0.45 },
        { id: '3pt_left', label: '3pts Aile G', val: 3, x: 0.1, y: 0.6 },
        { id: '3pt_right', label: '3pts Aile D', val: 3, x: 0.9, y: 0.6 },
        { id: '3pt_top', label: '3pts Face', val: 3, x: 0.5, y: 0.2 },
        { id: '3pt_corner_l', label: '3pts Coin G', val: 3, x: 0.05, y: 0.85 },
        { id: '3pt_corner_r', label: '3pts Coin D', val: 3, x: 0.95, y: 0.85 }
    ];

    const QT_DURATION = 600;
    const SEL = 'bg-slate-900 text-white border border-slate-600 rounded px-2 py-1.5 text-xs';
    const LBL = 'text-slate-400 text-[10px] uppercase font-bold mb-1';

    // ========================================================
    // HELPERS
    // ========================================================
    // [FIX 3] isOpponent gere string ET number
    function isOpponent(pid) {
        if (pid === 'OPP') return true;
        const n = typeof pid === 'number' ? pid : parseInt(pid);
        return !isNaN(n) && n >= 1000;
    }

    const parseId = (val) => {
        if (val === 'OPP') return 'OPP';
        const parsed = parseInt(val);
        return isNaN(parsed) ? val : parsed;
    };

    function extractOppPlayers(game) {
        if (!game?.opponentPlayerStats) return [];
        return Object.entries(game.opponentPlayerStats).map(([pid, s]) => ({
            id: parseInt(pid),
            number: s.number || (parseInt(pid) - 1000),
            name: s.name || `Adv #${s.number || (parseInt(pid) - 1000)}`,
            isOpp: true
        })).sort((a, b) => a.number - b.number);
    }

    function deduplicateIds(actions) {
        const seen = new Set();
        let counter = 0;
        return actions.map(a => {
            if (seen.has(a.id)) {
                counter++;
                return { ...a, id: a.id + '_dup_' + counter };
            }
            seen.add(a.id);
            return { ...a };
        });
    }

    function normalizeAction(act) {
        const t = act.type;
        if (['SHOT', 'FT', 'FOUL', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'TOV', 'SUB'].includes(t)) {
            return { ...act, _pid: act.pid ?? act.playerId };
        }
        if (t === 'FGM2') return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 2, made: true };
        if (t === 'FGA2') return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 2, made: false };
        if (t === 'FGM3') return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 3, made: true };
        if (t === 'FGA3') return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 3, made: false };
        if (t === 'FGM1') return { ...act, type: 'FT', _pid: act.playerId ?? act.pid, ftMade: 1, ftAtt: 1 };
        if (t === 'FGA1') return { ...act, type: 'FT', _pid: act.playerId ?? act.pid, ftMade: 0, ftAtt: 1 };
        if (t === 'PF') return { ...act, type: 'FOUL', _pid: act.playerId ?? act.pid, foulType: 'PERSONAL' };
        return { ...act, _pid: act.playerId ?? act.pid };
    }

    function denormalizeAction(act) {
        const out = { ...act };
        if (out._pid !== undefined) {
            out.pid = out._pid;
            delete out._pid;
        }
        if (out.pid !== undefined && out.playerId === undefined) {
            out.playerId = out.pid;
        }
        return out;
    }

    function emptyPlayerStats() {
        return {
            pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0,
            tov: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, pf: 0,
            minutes: 0, plusMinus: 0, threePM: 0, threePA: 0,
            foulDrawn: 0, blkAgainst: 0,
            foulDetails: { PERSONAL: 0, OFFENSIVE: 0, TECHNICAL: 0, UNSPORTSMANLIKE: 0 }
        };
    }

    // ========================================================
    // MOTEUR DE RECALCUL & AUDIT
    // ========================================================

    // [FIX 1] Deux passes separees pour isoler Home et Opp
    function recalcMinutesFromSubs(actions, homeStartersData, oppStartersData, totalQTs) {
        const playTime = {};
        const maxQ = totalQTs || 4;

        function calcForTeam(startersData, belongsToTeam) {
            for (let q = 1; q <= maxQ; q++) {
                const starters = (startersData && startersData[q])
                    ? startersData[q].map(parseId)
                    : [];

                const onCourt = new Set(starters);
                starters.forEach(pid => {
                    if (playTime[pid] === undefined) playTime[pid] = 0;
                });

                const qSubs = actions
                    .filter(a => (a.q || 1) === q && a.type === 'SUB' && belongsToTeam(parseId(a.pid ?? a.playerId)))
                    .map(a => ({ ...a, time: a.time || 0 }))
                    .sort((a, b) => b.time - a.time);

                let lastTime = QT_DURATION;

                qSubs.forEach(sub => {
                    const currentTime = sub.time;
                    const duration = lastTime - currentTime;

                    if (duration > 0) {
                        onCourt.forEach(p => {
                            if (playTime[p] === undefined) playTime[p] = 0;
                            playTime[p] += duration;
                        });
                    }

                    const pIn = parseId(sub.pid ?? sub.playerId);
                    const pOut = parseId(sub.subOut);

                    if (pOut) onCourt.delete(pOut);
                    if (pIn) {
                        onCourt.add(pIn);
                        if (playTime[pIn] === undefined) playTime[pIn] = 0;
                    }

                    lastTime = currentTime;
                });

                if (lastTime > 0) {
                    onCourt.forEach(p => {
                        if (playTime[p] === undefined) playTime[p] = 0;
                        playTime[p] += lastTime;
                    });
                }
            }
        }

        calcForTeam(homeStartersData, pid => !isOpponent(pid));
        calcForTeam(oppStartersData, pid => isOpponent(pid));

        const result = {};
        Object.entries(playTime).forEach(([pid, sec]) => {
            result[pid] = Math.round(sec / 60);
        });
        return result;
    }

    // [FIX 2] Meme isolation pour les intervalles
    function calculatePlayIntervals(actions, homeStartersData, oppStartersData, totalQTs) {
        const intervals = {};
        const maxQ = totalQTs || 4;

        function calcForTeam(startersData, belongsToTeam) {
            for (let q = 1; q <= maxQ; q++) {
                const starters = (startersData && startersData[q])
                    ? startersData[q].map(parseId)
                    : [];

                const onCourt = new Set(starters);
                starters.forEach(pid => {
                    if (!intervals[pid]) intervals[pid] = [];
                });

                const qSubs = actions
                    .filter(a => (a.q || 1) === q && a.type === 'SUB' && belongsToTeam(parseId(a.pid ?? a.playerId)))
                    .map(a => ({ ...a, time: a.time || 0 }))
                    .sort((a, b) => b.time - a.time);

                let lastTime = QT_DURATION;

                qSubs.forEach(sub => {
                    const currentTime = sub.time;

                    onCourt.forEach(p => {
                        if (!intervals[p]) intervals[p] = [];
                        intervals[p].push({ q: q, start: lastTime, end: currentTime, duration: lastTime - currentTime });
                    });

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
                    onCourt.forEach(p => {
                        if (!intervals[p]) intervals[p] = [];
                        intervals[p].push({ q: q, start: lastTime, end: 0, duration: lastTime });
                    });
                }
            }
        }

        calcForTeam(homeStartersData, pid => !isOpponent(pid));
        calcForTeam(oppStartersData, pid => isOpponent(pid));

        return intervals;
    }

    function recalcFullGame(actions, homePlayers, oppPlayers) {
        const pStats = {};
        homePlayers.forEach(p => { pStats[p.id] = emptyPlayerStats(); });
        oppPlayers.forEach(p => { pStats[p.id] = emptyPlayerStats(); });

        const oppTotals = { pts: 0, reb: 0, oreb: 0, ast: 0, tov: 0, fouls: 0, fga: 0, fgm: 0, fta: 0, ftm: 0 };
        let home = 0, away = 0;

        actions.forEach(rawAct => {
            const act = normalizeAction(rawAct);
            const pid = act._pid;
            const isOpp = isOpponent(pid);
            if (pid && pid !== 'OPP' && !pStats[pid]) pStats[pid] = emptyPlayerStats();
            const ps = (pid === 'OPP') ? null : pStats[pid];
            const type = act.type;
            let ptsScored = 0, ptsConceded = 0;

            if (type === 'SUB') return;

            if (isOpp) {
                if (type === 'SHOT') {
                    const v = act.val || 2;
                    if (ps) {
                        if (v === 3) { ps.threePA++; ps.fga++; if (act.made) { ps.threePM++; ps.fgm++; ps.pts += 3; } }
                        else { ps.fga++; if (act.made) { ps.fgm++; ps.pts += v; } }
                    }
                    oppTotals.fga++;
                    if (act.made) { oppTotals.fgm++; oppTotals.pts += v; away += v; ptsConceded = v; }
                }
                if (type === 'FT') {
                    const made = act.ftMade || 0, att = act.ftAtt || 0;
                    if (ps) { ps.ftm += made; ps.fta += att; ps.pts += made; }
                    oppTotals.ftm += made; oppTotals.fta += att; oppTotals.pts += made; away += made; ptsConceded = made;
                }
                if (type === 'OREB') { if (ps) { ps.reb++; ps.oreb++; } oppTotals.reb++; oppTotals.oreb++; }
                if (type === 'DREB') { if (ps) { ps.reb++; ps.dreb++; } oppTotals.reb++; }
                if (type === 'AST') { if (ps) ps.ast++; oppTotals.ast++; }
                if (type === 'TOV') { if (ps) ps.tov++; oppTotals.tov++; }
                if (type === 'STL') { if (ps) ps.stl++; }
                if (type === 'BLK') { if (ps) ps.blk++; if (act.victim && pStats[act.victim]) pStats[act.victim].blkAgainst++; }
                if (type === 'FOUL') {
                    if (ps) { ps.pf++; const ft = act.foulType || 'PERSONAL'; if (ps.foulDetails[ft] !== undefined) ps.foulDetails[ft]++; }
                    oppTotals.fouls++;
                    if (act.victim && pStats[act.victim]) pStats[act.victim].foulDrawn++;
                }
                if (act.consequence?.includes('score')) { const val = parseInt(act.consequence.split('_')[1]) || 0; home += val; ptsScored = val; }
            } else if (ps) {
                if (type === 'SHOT') {
                    const v = act.val || 2;
                    if (v === 3) { ps.threePA++; ps.fga++; if (act.made) { ps.threePM++; ps.fgm++; ps.pts += 3; home += 3; ptsScored = 3; } }
                    else { ps.fga++; if (act.made) { ps.fgm++; ps.pts += v; home += v; ptsScored = v; } }
                    if (act.made && act.astId && pStats[act.astId]) pStats[act.astId].ast++;
                }
                if (type === 'FT') { const made = act.ftMade || 0, att = act.ftAtt || 0; ps.ftm += made; ps.fta += att; ps.pts += made; home += made; ptsScored = made; }
                if (type === 'OREB') { ps.reb++; ps.oreb++; }
                if (type === 'DREB') { ps.reb++; ps.dreb++; }
                if (type === 'AST') ps.ast++;
                if (type === 'STL') ps.stl++;
                if (type === 'BLK') { ps.blk++; if (act.victim && pStats[act.victim]) pStats[act.victim].blkAgainst++; }
                if (type === 'TOV') ps.tov++;
                if (type === 'FOUL') { ps.pf++; const ft = act.foulType || 'PERSONAL'; if (ps.foulDetails[ft] !== undefined) ps.foulDetails[ft]++; if (act.victim && pStats[act.victim]) pStats[act.victim].foulDrawn++; }
                if (act.consequence?.includes('score')) { const val = parseInt(act.consequence.split('_')[1]) || 0; away += val; ptsConceded = val; }
            }
            const delta = ptsScored - ptsConceded;
            if (delta !== 0 && act.onCourt?.length) { act.onCourt.forEach(id => { if (pStats[id]) pStats[id].plusMinus += delta; }); }
        });
        return { playerStats: pStats, opponentStats: oppTotals, homeScore: home, awayScore: away };
    }

    function calcEval(s) {
        const tFGA = (s.fga || 0) + (s.threePA || 0), tFGM = (s.fgm || 0) + (s.threePM || 0);
        return (s.pts + s.reb + s.ast + s.stl + s.blk) - ((tFGA - tFGM) + ((s.fta || 0) - (s.ftm || 0)) + s.tov);
    }

    // ========================================================
    // EXPORT & CSV UTILS
    // ========================================================
    function exportMatchLogsCSV(actions, players, oppPlayers) {
        const formatTime = (t) => `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toString().padStart(2,'0')}`;
        const getPName = (pid) => {
            if (pid === 'OPP') return 'Adversaire';
            const p = players.find(x => x.id === pid) || oppPlayers.find(x => x.id === pid);
            return p ? `#${p.number}` : `#${pid}`;
        };

        const rows = [['QT', 'CHRONO', 'ACTION', 'JOUEUR', 'DETAILS']];
        const sorted = [...actions].sort((a, b) => {
            if ((a.q||1) !== (b.q||1)) return (a.q||1) - (b.q||1);
            return b.time - a.time;
        });

        sorted.forEach(a => {
            const time = formatTime(a.time || 0);
            const pid = a.pid ?? a.playerId;
            const pName = getPName(pid);
            let desc = a.type;
            let details = '';

            if (a.type === 'SHOT') { desc = a.made ? `Tir ${a.val}pts` : `Tir Rate ${a.val}pts`; }
            else if (a.type === 'FT') { desc = `LF ${a.ftMade}/${a.ftAtt}`; }
            else if (a.type === 'AST') { desc = 'Passe D'; }
            else if (a.type === 'OREB') { desc = 'Rebond Off'; }
            else if (a.type === 'DREB') { desc = 'Rebond Def'; }
            else if (a.type === 'STL') { desc = 'Interception'; }
            else if (a.type === 'TOV') { desc = 'Ballon Perdu'; }
            else if (a.type === 'BLK') { desc = 'Contre'; }
            else if (a.type === 'FOUL') { desc = 'Faute'; details = a.foulType || ''; }
            else if (a.type === 'SUB') { desc = 'Changement'; details = `Entree ${pName} / Sortie ${getPName(a.subOut)}`; }

            const finalAction = `${desc} ${pName}`;
            rows.push([`Q${a.q||1}`, time, finalAction, pName, details]);
        });

        const csvContent = "\uFEFF" + rows.map(e => e.join(";")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "match_logs.csv";
        link.click();
    }

    function exportMinutesAuditCSV(intervals, players, oppPlayers) {
        const formatTime = (t) => `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toString().padStart(2,'0')}`;
        const rows = [['JOUEUR', 'EQUIPE', 'QT', 'ENTREE (Chrono)', 'SORTIE (Chrono)', 'DUREE (Min:Sec)', 'DUREE (Sec)']];

        Object.entries(intervals).forEach(([pid, list]) => {
            const numPid = parseInt(pid);
            const isOpp = isOpponent(numPid);
            const p = isOpp
                ? oppPlayers.find(x => x.id === numPid)
                : players.find(x => x.id === numPid);

            if (!p && !isOpp) return;

            const pName = p ? `#${p.number} ${p.name}` : `#${pid}`;
            const teamName = isOpp ? 'ADVERSAIRE' : 'DOMICILE';

            list.forEach(iv => {
                rows.push([
                    pName,
                    teamName,
                    `Q${iv.q}`,
                    formatTime(iv.start),
                    formatTime(iv.end),
                    formatTime(iv.duration),
                    iv.duration
                ]);
            });
        });

        const csvContent = "\uFEFF" + rows.map(e => e.join(";")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "audit_temps_jeu_complet.csv";
        link.click();
    }

    // ========================================================
    // UI COMPONENTS
    // ========================================================
    function ZoneSelector({ onSelect, onCancel }) {
        return React.createElement('div', {
            style: { position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
            onClick: e => { if (e.target === e.currentTarget) onCancel(); }
        },
            React.createElement('div', { className: 'bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-md w-full mx-4' },
                React.createElement('h3', { className: 'text-white font-bold mb-4 text-sm' }, 'Selectionner la zone de tir'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                    SHOT_ZONES.map(z => React.createElement('button', {
                        key: z.id, className: `px-3 py-2 rounded text-xs font-semibold cursor-pointer border transition-all ${z.val === 3 ? 'bg-purple-900 border-purple-600 hover:bg-purple-700 text-purple-200' : 'bg-blue-900 border-blue-600 hover:bg-blue-700 text-blue-200'}`,
                        onClick: () => onSelect(z)
                    }, z.label))
                ),
                React.createElement('button', { className: 'mt-4 w-full py-2 rounded bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-600', onClick: onCancel }, 'Annuler')
            )
        );
    }

    function CombinedPlayerSelect({ value, onChange, homePlayers, oppPlayers, allowNone, className }) {
        return React.createElement('select', {
            className: (className || SEL) + ' w-full', value: value ?? '',
            onChange: e => { const v = e.target.value; onChange(v === '' ? null : v === 'OPP' ? 'OPP' : parseInt(v)); }
        },
            allowNone && React.createElement('option', { value: '' }, '— Aucun —'),
            React.createElement('optgroup', { label: 'Domicile' }, homePlayers.map(p => React.createElement('option', { key: p.id, value: p.id }, `#${p.number} ${p.name}`))),
            oppPlayers.length > 0
                ? React.createElement('optgroup', { label: 'Adversaire' }, oppPlayers.map(p => React.createElement('option', { key: p.id, value: p.id }, `#${p.number} ${p.name}`)))
                : React.createElement('option', { value: 'OPP' }, 'Adversaire (generique)')
        );
    }

    // MODALE : Verification des Minutes (Audit Complet)
    function MinutesAuditModal({ intervals, players, oppPlayers, onClose }) {
        const formatTime = (t) => `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toString().padStart(2,'0')}`;

        return React.createElement('div', {
            style: { position: 'fixed', inset: 0, zIndex: 100005, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
            onClick: e => { if (e.target === e.currentTarget) onClose(); }
        },
            React.createElement('div', { className: 'bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col' },
                React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                    React.createElement('h3', { className: 'text-white font-bold' }, 'Verification Temps de Jeu (Tous)'),
                    React.createElement('div', { className: 'flex gap-2' },
                        React.createElement('button', { className: 'px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-500', onClick: () => exportMinutesAuditCSV(intervals, players, oppPlayers) }, 'Export'),
                        React.createElement('button', { className: 'text-slate-400 hover:text-white', onClick: onClose }, 'X')
                    )
                ),
                React.createElement('div', { className: 'overflow-y-auto flex-1 bg-slate-900 rounded border border-slate-700 p-2' },
                    Object.entries(intervals).map(([pid, list]) => {
                        const numPid = parseInt(pid);
                        const isOpp = isOpponent(numPid);
                        const p = isOpp ? oppPlayers.find(x => x.id === numPid) : players.find(x => x.id === numPid);

                        if (!p && !isOpp) return null;

                        const totalSec = list.reduce((sum, i) => sum + i.duration, 0);
                        const totalMin = Math.round(totalSec / 60);

                        return React.createElement('div', { key: pid, className: `mb-4 border-b pb-2 ${isOpp ? 'border-red-900/50' : 'border-slate-700'}` },
                            React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                                React.createElement('span', { className: `font-bold ${isOpp ? 'text-red-400' : 'text-orange-400'}` },
                                    p ? `#${p.number} ${p.name}` : `Joueur ${pid}`
                                ),
                                React.createElement('span', { className: 'text-sm text-white font-mono' }, `${totalMin} min (${totalSec}s)`)
                            ),
                            React.createElement('div', { className: 'grid grid-cols-4 gap-2 text-[10px] text-slate-400 uppercase font-bold bg-slate-800 p-1 rounded mb-1' },
                                React.createElement('div', null, 'QT'), React.createElement('div', null, 'Entree'), React.createElement('div', null, 'Sortie'), React.createElement('div', { className: 'text-right' }, 'Duree')
                            ),
                            list.map((iv, idx) => React.createElement('div', { key: idx, className: 'grid grid-cols-4 gap-2 text-xs text-slate-300 p-1 border-b border-slate-800/50' },
                                React.createElement('div', null, `Q${iv.q}`),
                                React.createElement('div', { className: 'text-green-400' }, formatTime(iv.start)),
                                React.createElement('div', { className: 'text-red-400' }, formatTime(iv.end)),
                                React.createElement('div', { className: 'text-right font-mono' }, formatTime(iv.duration))
                            ))
                        );
                    })
                )
            )
        );
    }

    // [FIX 4] StartersEditorModal recoit quarterOptions en prop
    function StartersEditorModal({ homeStarters, oppStarters, players, oppPlayers, quarterOptions, onSave, onClose }) {
        const [editedHome, setEditedHome] = useState(homeStarters || {});
        const [editedOpp, setEditedOpp] = useState(oppStarters || {});

        const [activeTab, setActiveTab] = useState('HOME');
        const [activeQ, setActiveQ] = useState(quarterOptions[0] || 1);
        const quarters = quarterOptions;

        const togglePlayer = (team, q, pid) => {
            if (team === 'HOME') {
                const current = editedHome[q] || [];
                const next = current.includes(pid) ? current.filter(id => id !== pid) : [...current, pid];
                setEditedHome({ ...editedHome, [q]: next });
            } else {
                const current = editedOpp[q] || [];
                const next = current.includes(pid) ? current.filter(id => id !== pid) : [...current, pid];
                setEditedOpp({ ...editedOpp, [q]: next });
            }
        };

        const currentList = activeTab === 'HOME' ? (editedHome[activeQ] || []) : (editedOpp[activeQ] || []);
        const currentPlayers = activeTab === 'HOME' ? players : oppPlayers;

        const handleSave = () => {
            onSave(editedHome, editedOpp);
        };

        return React.createElement('div', {
            style: { position: 'fixed', inset: 0, zIndex: 100005, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
            onClick: e => { if (e.target === e.currentTarget) onClose(); }
        },
            React.createElement('div', { className: 'bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-2xl w-full mx-4 flex flex-col max-h-[90vh]' },
                React.createElement('div', { className: 'flex justify-between items-center mb-4 border-b border-slate-700 pb-2' },
                    React.createElement('h3', { className: 'text-white font-bold text-lg' }, 'Modifier les 5 de Depart'),
                    React.createElement('button', { className: 'text-slate-400 hover:text-white text-xl', onClick: onClose }, 'X')
                ),
                React.createElement('div', { className: 'flex gap-2 mb-4 bg-slate-900 p-1 rounded' },
                    React.createElement('button', {
                        className: `flex-1 py-2 text-sm font-bold rounded ${activeTab === 'HOME' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`,
                        onClick: () => setActiveTab('HOME')
                    }, 'Domicile'),
                    React.createElement('button', {
                        className: `flex-1 py-2 text-sm font-bold rounded ${activeTab === 'OPP' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`,
                        onClick: () => setActiveTab('OPP')
                    }, 'Adversaire')
                ),
                React.createElement('div', { className: 'flex gap-2 mb-4 overflow-x-auto pb-2' },
                    quarters.map(q => React.createElement('button', {
                        key: q,
                        className: `px-4 py-2 rounded font-bold text-sm transition-colors ${activeQ === q ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`,
                        onClick: () => setActiveQ(q)
                    }, q <= 4 ? `Q${q}` : `OT${q - 4}`))
                ),
                React.createElement('div', { className: 'text-sm text-slate-400 mb-2 italic' },
                    `Titulaires ${activeTab === 'HOME' ? 'Domicile' : 'Adversaire'} pour ${activeQ <= 4 ? 'Q' + activeQ : 'OT'} (${currentList.length} selectionnes)`
                ),
                React.createElement('div', { className: 'flex-1 overflow-y-auto bg-slate-900 rounded border border-slate-700 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2' },
                    currentPlayers.map(p => {
                        const isSelected = currentList.includes(p.id);
                        return React.createElement('div', {
                            key: p.id,
                            className: `p-2 rounded border cursor-pointer flex items-center gap-2 select-none ${isSelected ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`,
                            onClick: () => togglePlayer(activeTab, activeQ, p.id)
                        },
                            React.createElement('div', { className: `w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}` },
                                isSelected && React.createElement('span', { className: 'text-white text-xs font-bold' }, 'V')
                            ),
                            React.createElement('span', { className: 'font-mono font-bold text-white' }, `#${p.number}`),
                            React.createElement('span', { className: 'text-slate-300 text-xs truncate' }, p.name)
                        );
                    })
                ),
                React.createElement('div', { className: 'mt-4 flex justify-end gap-2' },
                    React.createElement('button', { className: 'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded', onClick: onClose }, 'Annuler'),
                    React.createElement('button', {
                        className: 'px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded',
                        onClick: handleSave
                    }, 'Valider & Recalculer')
                )
            )
        );
    }

    // ========================================================
    // ADD ACTION FORM
    // ========================================================
    function AddActionForm({ homePlayers, oppPlayers, onAdd, onCancel, quarters }) {
        const [type, setType] = useState('SHOT');
        const [pid, setPid] = useState('');
        const [q, setQ] = useState(1);
        const [timeMin, setTimeMin] = useState(10);
        const [timeSec, setTimeSec] = useState(0);
        const [val, setVal] = useState(2);
        const [made, setMade] = useState(true);
        const [zone, setZone] = useState(null);
        const [showZone, setShowZone] = useState(false);
        const [ftMade, setFtMade] = useState(0);
        const [ftAtt, setFtAtt] = useState(2);
        const [foulType, setFoulType] = useState('PERSONAL');
        const [victim, setVictim] = useState(null);
        const [subOut, setSubOut] = useState(null);

        const handleSubmit = () => {
            const pId = pid === 'OPP' ? 'OPP' : parseInt(pid);
            if (!pId && pId !== 0) return;
            const time = timeMin * 60 + timeSec;
            let action = { id: Date.now() + '_' + Math.random().toString(36).substr(2, 5), type, pid: pId, q, time, onCourt: [] };
            if (type === 'SHOT') { action.val = val; action.made = made; if (zone) { action.x = zone.x; action.y = zone.y; } }
            if (type === 'FT') { action.ftMade = ftMade; action.ftAtt = ftAtt; }
            if (type === 'FOUL') { action.foulType = foulType; if (victim) action.victim = victim; }
            if (type === 'BLK' && victim) action.victim = victim;
            if (type === 'SUB') { action.subOut = subOut; }
            onAdd(action);
        };

        return React.createElement('div', {
            style: { position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
            onClick: e => { if (e.target === e.currentTarget) onCancel(); }
        },
            showZone && React.createElement(ZoneSelector, { onSelect: z => { setZone(z); setVal(z.val); setShowZone(false); }, onCancel: () => setShowZone(false) }),
            React.createElement('div', { className: 'bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto' },
                React.createElement('h3', { className: 'text-white font-bold mb-4 text-sm' }, 'Ajouter une action'),
                React.createElement('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                    React.createElement('div', null,
                        React.createElement('div', { className: LBL }, 'Type'),
                        React.createElement('select', { className: SEL + ' w-full', value: type, onChange: e => { setType(e.target.value); setVictim(null); setSubOut(null); } }, ACTION_TYPES.map(t => React.createElement('option', { key: t.value, value: t.value }, t.label)))
                    ),
                    React.createElement('div', null,
                        React.createElement('div', { className: LBL }, type === 'SUB' ? 'Joueur ENTRANT' : 'Joueur'),
                        React.createElement(CombinedPlayerSelect, { value: pid === '' ? null : (pid === 'OPP' ? 'OPP' : parseInt(pid)), onChange: v => setPid(v ?? ''), homePlayers, oppPlayers, allowNone: true })
                    )
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                    React.createElement('div', null, React.createElement('div', { className: LBL }, 'Quart-temps'), React.createElement('select', { className: SEL + ' w-full', value: q, onChange: e => setQ(parseInt(e.target.value)) }, quarters.map(qn => React.createElement('option', { key: qn, value: qn }, qn <= 4 ? `Q${qn}` : `OT${qn - 4}`)))),
                    React.createElement('div', null, React.createElement('div', { className: LBL }, 'Chrono'), React.createElement('div', { className: 'flex gap-1 items-center' }, React.createElement('input', { type: 'number', min: 0, max: 10, className: SEL + ' w-12 text-center', value: timeMin, onChange: e => setTimeMin(parseInt(e.target.value) || 0) }), React.createElement('span', { className: 'text-slate-400 font-bold' }, ':'), React.createElement('input', { type: 'number', min: 0, max: 59, className: SEL + ' w-12 text-center', value: timeSec, onChange: e => setTimeSec(parseInt(e.target.value) || 0) })))
                ),
                type === 'SHOT' && React.createElement('div', { className: 'flex gap-3 mb-3 items-end flex-wrap' },
                    React.createElement('div', null, React.createElement('div', { className: LBL }, 'Valeur'), React.createElement('div', { className: 'flex gap-1' }, [2, 3].map(v => React.createElement('button', { key: v, className: `px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${val === v ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`, onClick: () => setVal(v) }, `${v}pts`)))),
                    React.createElement('div', null, React.createElement('div', { className: LBL }, 'Resultat'), React.createElement('div', { className: 'flex gap-1' }, React.createElement('button', { className: `px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${made ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`, onClick: () => setMade(true) }, 'Marque'), React.createElement('button', { className: `px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${!made ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`, onClick: () => setMade(false) }, 'Rate'))),
                    React.createElement('button', { className: 'px-3 py-1.5 rounded text-xs font-bold cursor-pointer bg-slate-700 text-slate-300 hover:bg-slate-600', onClick: () => setShowZone(true) }, zone ? zone.label : 'Zone')
                ),
                type === 'FT' && React.createElement('div', { className: 'flex gap-3 mb-3 items-end' }, React.createElement('div', null, React.createElement('div', { className: LBL }, 'Tentes'), React.createElement('input', { type: 'number', min: 0, max: 3, className: SEL + ' w-14 text-center', value: ftAtt, onChange: e => setFtAtt(parseInt(e.target.value) || 0) })), React.createElement('div', null, React.createElement('div', { className: LBL }, 'Reussis'), React.createElement('input', { type: 'number', min: 0, max: 3, className: SEL + ' w-14 text-center', value: ftMade, onChange: e => setFtMade(parseInt(e.target.value) || 0) }))),
                type === 'FOUL' && React.createElement('div', { className: 'mb-3 space-y-3' }, React.createElement('div', null, React.createElement('div', { className: LBL }, 'Type'), React.createElement('div', { className: 'flex gap-1 flex-wrap' }, FOUL_TYPES.map(ft => React.createElement('button', { key: ft.value, className: `px-3 py-1.5 rounded text-xs font-bold cursor-pointer border transition-all ${foulType === ft.value ? ft.color + ' border-white text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'}`, onClick: () => setFoulType(ft.value) }, ft.label)))), React.createElement('div', null, React.createElement('div', { className: LBL }, 'Provoquee par'), React.createElement(CombinedPlayerSelect, { value: victim, onChange: setVictim, homePlayers, oppPlayers, allowNone: true }))),
                type === 'BLK' && React.createElement('div', { className: 'mb-3' }, React.createElement('div', { className: LBL }, 'Contre'), React.createElement(CombinedPlayerSelect, { value: victim, onChange: setVictim, homePlayers, oppPlayers, allowNone: true })),
                type === 'SUB' && React.createElement('div', { className: 'mb-3' }, React.createElement('div', { className: LBL }, 'SORTANT'), React.createElement(CombinedPlayerSelect, { value: subOut, onChange: setSubOut, homePlayers, oppPlayers, allowNone: true })),
                React.createElement('div', { className: 'flex gap-2 justify-end mt-4' }, React.createElement('button', { className: 'px-4 py-2 rounded bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-600', onClick: onCancel }, 'Annuler'), React.createElement('button', { className: 'px-4 py-2 rounded bg-orange-500 text-white text-xs font-semibold cursor-pointer hover:bg-orange-600 disabled:opacity-40', onClick: handleSubmit, disabled: !pid && pid !== 0 }, 'Ajouter'))
            )
        );
    }

    // ========================================================
    // COMPOSANT PRINCIPAL
    // ========================================================
    function PlayByPlayEditor({ game, players, onSave, onClose }) {
        const [actions, setActions] = useState([]);
        const [currentStarters, setCurrentStarters] = useState({});
        const [currentOppStarters, setCurrentOppStarters] = useState({});

        const [filterQ, setFilterQ] = useState(0);
        const [filterPid, setFilterPid] = useState('all');
        const [editingId, setEditingId] = useState(null);
        const [editData, setEditData] = useState({});
        const [showAddForm, setShowAddForm] = useState(false);
        const [showZoneFor, setShowZoneFor] = useState(null);
        const [dirty, setDirty] = useState(false);
        const [saving, setSaving] = useState(false);
        const [toast, setToast] = useState(null);

        const [showAudit, setShowAudit] = useState(false);
        const [showStarters, setShowStarters] = useState(false);

        const oppPlayers = useMemo(() => extractOppPlayers(game), [game]);

        useEffect(() => {
            if (game?.actions?.length) setActions(deduplicateIds(game.actions));
            else setActions([]);

            setCurrentStarters(game?.starters || {});
            setCurrentOppStarters(game?.opponentStarters || {});

            setDirty(false);

            // ============================================================
// DEBUG MINUTES — Coller dans la console ou ajouter en bas de PlayByPlayEditor.js
// Usage : window.debugMinutes(game)
//   - game = objet match complet (avec actions, starters, opponentStarters, etc.)
//   - Affiche dans la console chaque segment de temps credite par joueur
// ============================================================

window.debugMinutes = function(game) {
    if (!game) { console.error('Usage: debugMinutes(game) — passer un objet match'); return; }

    const QT_DURATION = 600;
    const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

    function isOpp(pid) {
        if (pid === 'OPP') return true;
        const n = typeof pid === 'number' ? pid : parseInt(pid);
        return !isNaN(n) && n >= 1000;
    }

    function pid(val) {
        if (val === 'OPP') return 'OPP';
        const p = parseInt(val);
        return isNaN(p) ? val : p;
    }

    // Extraire les noms pour l'affichage
    const names = {};
    if (game.playerStats) {
        Object.entries(game.playerStats).forEach(([id, s]) => {
            names[id] = `#${s.number || id} ${s.name || ''}`.trim();
        });
    }
    if (game.opponentPlayerStats) {
        Object.entries(game.opponentPlayerStats).forEach(([id, s]) => {
            names[id] = `[OPP] #${s.number || (parseInt(id) - 1000)} ${s.name || ''}`.trim();
        });
    }
    const pName = (id) => names[id] || `#${id}`;

    const homeStarters = game.starters || {};
    const oppStarters = game.opponentStarters || {};
    const actions = game.actions || [];
    const allSubs = actions.filter(a => a.type === 'SUB');

    // Detecter les QTs presents
    const qSet = new Set(actions.map(a => a.q || 1));
    [1,2,3,4].forEach(q => qSet.add(q));
    const quarters = Array.from(qSet).sort((a,b) => a - b);

    console.log('%c=== DEBUG MINUTES ===', 'color: #f97316; font-size: 16px; font-weight: bold');
    console.log(`Match: ${game.opponent || '?'} | ${actions.length} actions | ${allSubs.length} SUBs`);
    console.log('Quarters detectes:', quarters);

    // ---------- DIAGNOSTIC DES DONNEES BRUTES ----------
    console.group('%c1. DONNEES BRUTES', 'color: #60a5fa; font-weight: bold');
    
    console.log('%cStarters Domicile:', 'color: #3b82f6');
    quarters.forEach(q => {
        const s = homeStarters[q] || [];
        const label = s.length ? s.map(id => pName(id)).join(', ') : '⚠️ VIDE';
        console.log(`  Q${q}: [${s.length}] ${label}`);
    });

    console.log('%cStarters Adversaire:', 'color: #ef4444');
    quarters.forEach(q => {
        const s = oppStarters[q] || [];
        const label = s.length ? s.map(id => pName(id)).join(', ') : '⚠️ VIDE';
        console.log(`  Q${q}: [${s.length}] ${label}`);
    });

    console.log('%cTous les SUBs (chronologique):', 'color: #a78bfa');
    const sortedSubs = [...allSubs].sort((a,b) => {
        if ((a.q||1) !== (b.q||1)) return (a.q||1) - (b.q||1);
        return (b.time||0) - (a.time||0);
    });
    sortedSubs.forEach(s => {
        const p = pid(s.pid ?? s.playerId);
        const out = pid(s.subOut);
        const team = isOpp(p) ? '🔴OPP' : '🔵HOME';
        console.log(`  Q${s.q||1} ${fmt(s.time||0)} | ${team} | IN: ${pName(p)} | OUT: ${pName(out)}`);
    });
    console.groupEnd();

    // ---------- SIMULATION PAS A PAS ----------
    const totals = {};

    function simulateTeam(teamLabel, startersData, belongsFn, color) {
        console.group(`%c2. SIMULATION ${teamLabel}`, `color: ${color}; font-weight: bold`);

        quarters.forEach(q => {
            const starters = (startersData[q] || []).map(pid);
            const onCourt = new Set(starters);

            if (starters.length === 0) {
                console.warn(`  Q${q}: ⚠️ Aucun starter — tout le QT sera non comptabilise`);
                return;
            }

            // Filtrer les SUBs de cette equipe pour ce QT
            const qSubs = actions
                .filter(a => (a.q||1) === q && a.type === 'SUB' && belongsFn(pid(a.pid ?? a.playerId)))
                .map(a => ({...a, time: a.time || 0}))
                .sort((a,b) => b.time - a.time);

            console.group(`Q${q} — ${starters.length} starters, ${qSubs.length} SUBs`);
            console.log(`  Starters: ${starters.map(pName).join(', ')}`);

            let lastTime = QT_DURATION;
            let segIdx = 0;

            qSubs.forEach(sub => {
                const currentTime = sub.time;
                const duration = lastTime - currentTime;
                const pIn = pid(sub.pid ?? sub.playerId);
                const pOut = pid(sub.subOut);

                segIdx++;
                const courtList = Array.from(onCourt).map(pName).join(', ');

                if (duration > 0) {
                    console.log(
                        `  Seg${segIdx}: ${fmt(lastTime)} → ${fmt(currentTime)} = %c${fmt(duration)} (${duration}s)%c | Sur terrain: [${courtList}]`,
                        'color: #22c55e; font-weight: bold', 'color: inherit'
                    );
                    onCourt.forEach(p => { totals[p] = (totals[p] || 0) + duration; });
                } else if (duration === 0) {
                    console.log(`  Seg${segIdx}: ${fmt(lastTime)} → ${fmt(currentTime)} = 0s (SUB simultane)`);
                } else {
                    console.warn(`  Seg${segIdx}: ⚠️ DUREE NEGATIVE ${duration}s — lastTime=${fmt(lastTime)} sub.time=${fmt(currentTime)}`);
                }

                console.log(`    ↪ IN: ${pName(pIn)} | OUT: ${pName(pOut)}`);

                if (pOut) {
                    if (!onCourt.has(pOut)) {
                        console.warn(`    ⚠️ ${pName(pOut)} n'etait PAS sur le terrain au moment du SUB!`);
                    }
                    onCourt.delete(pOut);
                }
                if (pIn) {
                    if (onCourt.has(pIn)) {
                        console.warn(`    ⚠️ ${pName(pIn)} etait DEJA sur le terrain!`);
                    }
                    onCourt.add(pIn);
                }

                lastTime = currentTime;
            });

            // Segment final
            if (lastTime > 0) {
                segIdx++;
                const courtList = Array.from(onCourt).map(pName).join(', ');
                console.log(
                    `  Seg${segIdx}: ${fmt(lastTime)} → 0:00 = %c${fmt(lastTime)} (${lastTime}s)%c | Sur terrain: [${courtList}]`,
                    'color: #22c55e; font-weight: bold', 'color: inherit'
                );
                onCourt.forEach(p => { totals[p] = (totals[p] || 0) + lastTime; });
            }

            // Verification : le total des segments doit = 600s
            const totalSeg = QT_DURATION; // devrait toujours etre 600
            console.log(`  Total Q${q}: ${fmt(QT_DURATION)} attendu`);
            console.groupEnd();
        });

        console.groupEnd();
    }

    simulateTeam('DOMICILE', homeStarters, p => !isOpp(p), '#3b82f6');
    simulateTeam('ADVERSAIRE', oppStarters, p => isOpp(p), '#ef4444');

    // ---------- RESUME FINAL ----------
    console.group('%c3. RESUME FINAL (secondes → minutes)', 'color: #f97316; font-weight: bold');

    const homeEntries = [];
    const oppEntries = [];

    Object.entries(totals).forEach(([id, sec]) => {
        const entry = { id, name: pName(id), seconds: sec, minutes: Math.round(sec / 60), exact: (sec / 60).toFixed(1) };
        if (isOpp(parseInt(id))) oppEntries.push(entry);
        else homeEntries.push(entry);
    });

    homeEntries.sort((a,b) => b.seconds - a.seconds);
    oppEntries.sort((a,b) => b.seconds - a.seconds);

    console.log('%cDomicile:', 'color: #3b82f6; font-weight: bold');
    console.table(homeEntries.map(e => ({ Joueur: e.name, Secondes: e.seconds, 'Min (arrondi)': e.minutes, 'Min (exact)': e.exact })));

    if (oppEntries.length) {
        console.log('%cAdversaire:', 'color: #ef4444; font-weight: bold');
        console.table(oppEntries.map(e => ({ Joueur: e.name, Secondes: e.seconds, 'Min (arrondi)': e.minutes, 'Min (exact)': e.exact })));
    }

    // Verification par QT: chaque joueur starter sans SUB = 600s
    const maxExpected = quarters.length * QT_DURATION;
    const anomalies = Object.entries(totals).filter(([id, sec]) => sec > maxExpected || sec < 0);
    if (anomalies.length) {
        console.warn('%c⚠️ ANOMALIES:', 'color: #ef4444; font-weight: bold');
        anomalies.forEach(([id, sec]) => {
            console.warn(`  ${pName(id)}: ${sec}s (${(sec/60).toFixed(1)} min) — max attendu: ${maxExpected}s`);
        });
    } else {
        console.log('%c✅ Aucune anomalie detectee', 'color: #22c55e');
    }

    console.groupEnd();

    // Retourner les donnees pour inspection manuelle
    return { totals, homeEntries, oppEntries, quarters, homeStarters, oppStarters, subs: sortedSubs };
};

// Raccourci pour appeler depuis l'editeur PBP (si le game est dans le state React)
// Usage alternatif : debugMinutes(monObjetGame)
console.log('debugMinutes() pret. Usage: debugMinutes(game)');
        }, [game]);

        const quarters = useMemo(() => {
            const qs = new Set(actions.map(a => a.q || 1));
            return Array.from(qs).sort((a, b) => a - b);
        }, [actions]);
        const quarterOptions = quarters.length ? quarters : [1, 2, 3, 4];

        const playerMap = useMemo(() => {
            const m = {};
            players.forEach(p => { m[p.id] = p; });
            oppPlayers.forEach(p => { m[p.id] = p; });
            return m;
        }, [players, oppPlayers]);

        const filteredActions = useMemo(() => {
            let arr = [...actions];
            if (filterQ > 0) arr = arr.filter(a => (a.q || 1) === filterQ);
            if (filterPid !== 'all') {
                const fp = filterPid === 'OPP' ? 'OPP' : parseInt(filterPid);
                arr = arr.filter(a => {
                    const pid = a.pid ?? a.playerId;
                    if (filterPid === 'OPP') return isOpponent(pid);
                    if (a.type === 'SUB' && a.subOut === fp) return true;
                    return pid === fp;
                });
            }
            arr.sort((a, b) => {
                const qa = a.q || 1, qb = b.q || 1;
                if (qa !== qb) return qa - qb;
                return (b.time ?? 0) - (a.time ?? 0);
            });
            return arr;
        }, [actions, filterQ, filterPid]);

        const stats = useMemo(() => recalcFullGame(actions, players, oppPlayers), [actions, players, oppPlayers]);

        const minutesFromSubs = useMemo(() => {
            const maxQ = Math.max(...(quarters.length ? quarters : [4]));
            return recalcMinutesFromSubs(actions, currentStarters, currentOppStarters, maxQ);
        }, [actions, currentStarters, currentOppStarters, quarters]);

        const playIntervals = useMemo(() => {
            const maxQ = Math.max(...(quarters.length ? quarters : [4]));
            return calculatePlayIntervals(actions, currentStarters, currentOppStarters, maxQ);
        }, [actions, currentStarters, currentOppStarters, quarters]);

        const hasSubs = useMemo(() => actions.some(a => a.type === 'SUB'), [actions]);

        const showToast = (msg, isError) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 2500); };
        const handleDelete = (actionId) => { if (!confirm('Supprimer ?')) return; setActions(prev => prev.filter(a => a.id !== actionId)); setDirty(true); };
        const handleAdd = (newAction) => { setActions(prev => [...prev, newAction]); setShowAddForm(false); setDirty(true); showToast('Action ajoutee'); };

        const startEdit = (action) => {
            const pid = action.pid ?? action.playerId;
            setEditingId(action.id);
            setEditData({
                type: action.type, pid, q: action.q || 1,
                timeMin: Math.floor((action.time || 0) / 60), timeSec: (action.time || 0) % 60,
                val: action.val || 2, made: action.made !== undefined ? action.made : true,
                ftMade: action.ftMade || 0, ftAtt: action.ftAtt || 0,
                foulType: action.foulType || 'PERSONAL', victim: action.victim || null, subOut: action.subOut || null
            });
        };

        const saveEdit = (actionId) => {
            setActions(prev => prev.map(a => {
                if (a.id !== actionId) return a;
                const u = { ...a };
                u.type = editData.type; u.pid = editData.pid === 'OPP' ? 'OPP' : parseInt(editData.pid); u.playerId = u.pid; u.q = editData.q; u.time = editData.timeMin * 60 + editData.timeSec;
                delete u.val; delete u.made; delete u.x; delete u.y; delete u.ftMade; delete u.ftAtt; delete u.foulType; delete u.victim; delete u.subOut;
                if (editData.type === 'SHOT') { u.val = editData.val; u.made = editData.made; if (a.x !== undefined) { u.x = a.x; u.y = a.y; } else setShowZoneFor(actionId); }
                if (editData.type === 'FT') { u.ftMade = editData.ftMade; u.ftAtt = editData.ftAtt; }
                if (editData.type === 'FOUL') { u.foulType = editData.foulType; if (editData.victim) u.victim = editData.victim; }
                if (editData.type === 'BLK' && editData.victim) u.victim = editData.victim;
                if (editData.type === 'SUB') { u.subOut = editData.subOut; }
                return u;
            }));
            setEditingId(null); setDirty(true);
        };

        const handleZoneSelect = (zone) => { setActions(prev => prev.map(a => a.id !== showZoneFor ? a : { ...a, x: zone.x, y: zone.y, val: zone.val })); setShowZoneFor(null); setDirty(true); };

        const handleUpdateStarters = (newHomeStarters, newOppStarters) => {
            setCurrentStarters(newHomeStarters);
            setCurrentOppStarters(newOppStarters);
            setShowStarters(false);
            setDirty(true);
            showToast('Starters mis a jour');
        };

        const handleSave = async () => {
            setSaving(true);
            try {
                const finalStats = recalcFullGame(actions, players, oppPlayers);
                const cleanActions = actions.map(a => { const c = { ...a }; delete c._idx; return denormalizeAction(c); });

                const maxQ = Math.max(...(quarters.length ? quarters : [4]));
                const subMinutes = recalcMinutesFromSubs(actions, currentStarters, currentOppStarters, maxQ);

                const existingMinutes = {};
                if (game?.playerStats) Object.entries(game.playerStats).forEach(([pid, s]) => { existingMinutes[pid] = s.minutes || 0; });
                if (game?.opponentPlayerStats) Object.entries(game.opponentPlayerStats).forEach(([pid, s]) => { existingMinutes[pid] = s.minutes || 0; });

                const mergedHomeStats = {};
                const mergedOppPlayerStats = {};
                Object.entries(finalStats.playerStats).forEach(([pid, s]) => {
                    const numPid = parseInt(pid);
                    const mins = subMinutes[pid] !== undefined ? subMinutes[pid] : (existingMinutes[pid] || 0);
                    const merged = { ...s, minutes: mins };

                    if (isOpponent(numPid)) {
                        const orig = game.opponentPlayerStats?.[pid] || {};
                        mergedOppPlayerStats[pid] = { ...merged, number: orig.number || (numPid - 1000), name: orig.name || `Adv #${orig.number || (numPid - 1000)}` };
                    } else {
                        mergedHomeStats[pid] = merged;
                    }
                });

                const updatedGame = {
                    ...game,
                    actions: cleanActions,
                    starters: currentStarters,
                    opponentStarters: currentOppStarters,
                    playerStats: mergedHomeStats,
                    opponentStats: finalStats.opponentStats,
                    opponentPlayerStats: mergedOppPlayerStats,
                    homeScore: finalStats.homeScore,
                    awayScore: finalStats.awayScore
                };
                await onSave(updatedGame);
                setDirty(false);
                showToast('Sauvegarde OK');
            } catch (e) {
                console.error('PBP Editor save error:', e);
                showToast('Erreur de sauvegarde', true);
            }
            setSaving(false);
        };

        const getPlayerLabel = (pid) => { if (pid === 'OPP') return 'ADV'; const p = playerMap[pid]; return p ? `#${p.number}` : `#${pid}`; };
        const getPlayerName = (pid) => { if (pid === 'OPP') return 'Adversaire'; const p = playerMap[pid]; return p ? p.name : `Joueur ${pid}`; };
        const getActionLabel = (act) => {
            const n = normalizeAction(act); const t = n.type;
            if (t === 'SHOT') return `Tir ${n.val || 2}pts ${n.made ? 'OK' : 'X'}`;
            if (t === 'FT') return `LF ${n.ftMade || 0}/${n.ftAtt || 0}`;
            if (t === 'FOUL') return `Faute ${FOUL_TYPES.find(f => f.value === (n.foulType || 'PERSONAL'))?.label || 'P'}${n.victim ? ' -> #' + n.victim : ''}`;
            if (t === 'SUB') return `SUB ${getPlayerLabel(n._pid || n.pid)} <-> ${n.subOut ? getPlayerLabel(n.subOut) : '?'}`;
            const found = ACTION_TYPES.find(at => at.value === t); return found ? found.label : t;
        };
        const getActionColor = (act) => {
            const n = normalizeAction(act);
            if (n.type === 'SHOT') return n.made ? 'text-green-400' : 'text-red-400';
            if (n.type === 'SUB') return 'text-cyan-400';
            if (n.type === 'FOUL') return 'text-red-500';
            return 'text-slate-300';
        };
        const formatTime = (time) => { const m = Math.floor((time || 0) / 60); const s = (time || 0) % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

        // ---- RENDER ----
        return React.createElement('div', {
            className: 'flex flex-col', style: { position: 'fixed', inset: 0, zIndex: 99999, background: '#0a0f1a' }
        },
            showZoneFor && React.createElement(ZoneSelector, { onSelect: handleZoneSelect, onCancel: () => setShowZoneFor(null) }),
            showAddForm && React.createElement(AddActionForm, { homePlayers: players, oppPlayers, onAdd: handleAdd, onCancel: () => setShowAddForm(false), quarters: quarterOptions }),
            toast && React.createElement('div', { style: { position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100001 }, className: `px-4 py-2 rounded-full text-xs font-bold ${toast.isError ? 'bg-red-600' : 'bg-green-600'} text-white` }, toast.msg),

            showAudit && React.createElement(MinutesAuditModal, { intervals: playIntervals, players: players, oppPlayers: oppPlayers, onClose: () => setShowAudit(false) }),

            showStarters && React.createElement(StartersEditorModal, {
                homeStarters: currentStarters,
                oppStarters: currentOppStarters,
                players: players,
                oppPlayers: oppPlayers,
                quarterOptions: quarterOptions,
                onSave: handleUpdateStarters,
                onClose: () => setShowStarters(false)
            }),

            // HEADER
            React.createElement('div', { className: 'flex items-center justify-between px-4 py-3 shrink-0', style: { background: '#111827', borderBottom: '2px solid #f97316' } },
                React.createElement('div', { className: 'flex items-center gap-3' },
                    React.createElement('button', { className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-bold cursor-pointer', onClick: () => { if (dirty && !confirm('Modifications non sauvegardees. Quitter ?')) return; onClose(); } }, 'X Fermer'),
                    React.createElement('h2', { className: 'text-white font-bold text-sm hidden md:block' }, `PBP -- ${game?.opponent || 'Match'}`),
                    dirty && React.createElement('span', { className: 'text-orange-400 text-[10px] font-bold bg-orange-900 px-2 py-0.5 rounded-full animate-pulse' }, 'Modifie')
                ),
                React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('button', { className: 'px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold', onClick: () => exportMatchLogsCSV(actions, players, oppPlayers) }, 'CSV'),
                    React.createElement('button', { className: 'px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold', onClick: () => setShowStarters(true) }, 'Starters'),
                    React.createElement('button', { className: 'px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold', onClick: () => setShowAudit(true) }, 'Verif.'),
                    React.createElement('button', { className: 'px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold cursor-pointer disabled:opacity-40 flex items-center gap-2', onClick: handleSave, disabled: !dirty || saving }, saving ? '...' : 'Sauver')
                )
            ),

            // FILTERS & STATS SUMMARY
            React.createElement('div', { className: 'px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-6 text-xs shrink-0 overflow-x-auto' },
                React.createElement('div', { className: 'flex items-center gap-2' }, React.createElement('span', { className: 'text-slate-500' }, 'Score:'), React.createElement('span', { className: 'text-blue-400 font-bold text-sm' }, stats.homeScore), React.createElement('span', { className: 'text-slate-600' }, '-'), React.createElement('span', { className: 'text-red-400 font-bold text-sm' }, stats.awayScore)),
                React.createElement('div', { className: 'text-slate-500' }, `${actions.length} actions`),
                hasSubs && React.createElement('div', { className: 'text-cyan-500 text-[10px]' }, `${actions.filter(a => a.type === 'SUB').length} changements`),
                React.createElement('div', { className: 'flex items-center gap-3 ml-auto' },
                    React.createElement('select', { className: SEL, value: filterQ, onChange: e => setFilterQ(parseInt(e.target.value)) }, React.createElement('option', { value: 0 }, 'Tous QT'), quarterOptions.map(q => React.createElement('option', { key: q, value: q }, q <= 4 ? `Q${q}` : `OT${q - 4}`))),
                    React.createElement('select', { className: SEL, value: filterPid, onChange: e => setFilterPid(e.target.value) }, React.createElement('option', { value: 'all' }, 'Tous joueurs'), React.createElement('option', { value: 'OPP' }, 'Tous adversaires'), React.createElement('optgroup', { label: 'Domicile' }, players.map(p => React.createElement('option', { key: p.id, value: p.id }, `#${p.number} ${p.name}`))), oppPlayers.length > 0 && React.createElement('optgroup', { label: 'Adversaire' }, oppPlayers.map(p => React.createElement('option', { key: p.id, value: p.id }, `#${p.number} ${p.name}`)))),
                    React.createElement('button', { className: 'px-3 py-1.5 rounded bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer', onClick: () => setShowAddForm(true) }, '+ Action')
                )
            ),

            React.createElement(MiniBoxscore, { stats, players, oppPlayers, playerMap, minutesFromSubs, hasSubs }),

            // ACTIONS LIST
            React.createElement('div', { className: 'flex-1 overflow-y-auto px-2 py-1' },
                filteredActions.length === 0
                    ? React.createElement('div', { className: 'text-center text-slate-500 py-10 text-sm' }, 'Aucune action')
                    : filteredActions.map(act => {
                        const aid = act.id;
                        const pid = act.pid ?? act.playerId;
                        const isHome = !isOpponent(pid) && !!playerMap[pid];

                        if (editingId === aid) {
                            return React.createElement('div', { key: aid, className: 'bg-slate-800 border border-orange-500 rounded-lg p-3 mb-1 space-y-2' },
                                React.createElement('div', { className: 'grid grid-cols-4 gap-2 items-end' },
                                    React.createElement('div', null, React.createElement('div', { className: 'text-[9px] text-slate-500 mb-0.5' }, 'QT'), React.createElement('select', { className: SEL + ' w-full', value: editData.q, onChange: e => setEditData(d => ({ ...d, q: parseInt(e.target.value) })) }, quarterOptions.map(q => React.createElement('option', { key: q, value: q }, q <= 4 ? `Q${q}` : `OT${q - 4}`)))),
                                    React.createElement('div', null, React.createElement('div', { className: 'text-[9px] text-slate-500 mb-0.5' }, 'Chrono'), React.createElement('div', { className: 'flex gap-0.5 items-center' }, React.createElement('input', { type: 'number', min: 0, max: 10, className: SEL + ' w-8 text-center px-0', value: editData.timeMin, onChange: e => setEditData(d => ({ ...d, timeMin: parseInt(e.target.value) || 0 })) }), React.createElement('span', { className: 'text-slate-500 text-xs' }, ':'), React.createElement('input', { type: 'number', min: 0, max: 59, className: SEL + ' w-8 text-center px-0', value: editData.timeSec, onChange: e => setEditData(d => ({ ...d, timeSec: parseInt(e.target.value) || 0 })) }))),
                                    React.createElement('div', null, React.createElement('div', { className: 'text-[9px] text-slate-500 mb-0.5' }, 'Type'), React.createElement('select', { className: SEL + ' w-full', value: editData.type, onChange: e => setEditData(d => ({ ...d, type: e.target.value, victim: null, subOut: null })) }, ACTION_TYPES.map(t => React.createElement('option', { key: t.value, value: t.value }, t.label)))),
                                    React.createElement('div', null, React.createElement('div', { className: 'text-[9px] text-slate-500 mb-0.5' }, editData.type === 'SUB' ? 'Entrant' : 'Joueur'), React.createElement(CombinedPlayerSelect, { value: editData.pid, onChange: v => setEditData(d => ({ ...d, pid: v })), homePlayers: players, oppPlayers, allowNone: false, className: SEL }))
                                ),
                                editData.type === 'SHOT' && React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                                    [2, 3].map(v => React.createElement('button', { key: v, className: `px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${editData.val === v ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`, onClick: () => setEditData(d => ({ ...d, val: v })) }, `${v}pts`)),
                                    React.createElement('button', { className: `px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${editData.made ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`, onClick: () => setEditData(d => ({ ...d, made: !d.made })) }, editData.made ? 'OK Marque' : 'X Rate')
                                ),
                                editData.type === 'FT' && React.createElement('div', { className: 'flex gap-2 items-center' },
                                    React.createElement('span', { className: 'text-[10px] text-slate-400' }, 'LF:'),
                                    React.createElement('input', { type: 'number', min: 0, max: 3, className: SEL + ' w-10 text-center px-0', value: editData.ftMade, onChange: e => setEditData(d => ({ ...d, ftMade: parseInt(e.target.value) || 0 })) }),
                                    React.createElement('span', { className: 'text-slate-500 text-[10px]' }, '/'),
                                    React.createElement('input', { type: 'number', min: 0, max: 3, className: SEL + ' w-10 text-center px-0', value: editData.ftAtt, onChange: e => setEditData(d => ({ ...d, ftAtt: parseInt(e.target.value) || 0 })) })
                                ),
                                editData.type === 'FOUL' && React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                                    FOUL_TYPES.map(ft => React.createElement('button', { key: ft.value, className: `px-2 py-1 rounded text-[10px] font-bold cursor-pointer border ${editData.foulType === ft.value ? ft.color + ' border-white text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`, onClick: () => setEditData(d => ({ ...d, foulType: ft.value })) }, ft.short)),
                                    React.createElement('span', { className: 'text-[10px] text-slate-500 ml-1' }, 'sur:'),
                                    React.createElement(CombinedPlayerSelect, { value: editData.victim, onChange: v => setEditData(d => ({ ...d, victim: v })), homePlayers: players, oppPlayers, allowNone: true, className: SEL + ' w-28' })
                                ),
                                editData.type === 'BLK' && React.createElement('div', { className: 'flex gap-2 items-center' },
                                    React.createElement('span', { className: 'text-[10px] text-slate-500' }, 'Contre:'),
                                    React.createElement(CombinedPlayerSelect, { value: editData.victim, onChange: v => setEditData(d => ({ ...d, victim: v })), homePlayers: players, oppPlayers, allowNone: true, className: SEL + ' w-28' })
                                ),
                                editData.type === 'SUB' && React.createElement('div', { className: 'flex gap-2 items-center' },
                                    React.createElement('span', { className: 'text-[10px] text-cyan-400 font-bold' }, 'Sortant:'),
                                    React.createElement(CombinedPlayerSelect, { value: editData.subOut, onChange: v => setEditData(d => ({ ...d, subOut: v })), homePlayers: players, oppPlayers, allowNone: true, className: SEL + ' w-32' })
                                ),
                                React.createElement('div', { className: 'flex gap-1 justify-end pt-1' }, React.createElement('button', { className: 'px-3 py-1 rounded bg-green-600 text-white text-[10px] font-bold cursor-pointer', onClick: () => saveEdit(aid) }, 'OK'), React.createElement('button', { className: 'px-3 py-1 rounded bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer', onClick: () => setEditingId(null) }, 'Annuler'))
                            );
                        }

                        return React.createElement('div', {
                            key: aid,
                            className: `flex items-center gap-2 px-3 py-2 mb-0.5 rounded hover:bg-slate-800 transition-colors group ${act.type === 'SUB' ? 'border-l-2 border-l-cyan-500 bg-cyan-950/20' : isHome ? 'border-l-2 border-l-blue-500 bg-slate-900/50' : 'border-l-2 border-l-red-500 bg-slate-900/50'}`
                        },
                            React.createElement('span', { className: 'text-slate-500 font-mono text-[10px] w-16 shrink-0' }, `Q${act.q || 1} ${formatTime(act.time)}`),
                            React.createElement('span', { className: `font-bold text-xs shrink-0 w-10 ${act.type === 'SUB' ? 'text-cyan-400' : isHome ? 'text-blue-400' : 'text-red-400'}` }, getPlayerLabel(pid)),
                            React.createElement('span', { className: 'text-slate-500 text-[10px] w-24 shrink-0 truncate' }, getPlayerName(pid)),
                            React.createElement('span', { className: `flex-1 text-xs font-semibold ${getActionColor(act)}` }, getActionLabel(act)),
                            React.createElement('div', { className: 'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0' }, React.createElement('button', { className: 'px-2 py-1 rounded bg-slate-700 text-slate-300 text-[10px] cursor-pointer hover:bg-slate-600', onClick: () => startEdit(act) }, 'Edit'), React.createElement('button', { className: 'px-2 py-1 rounded bg-red-900 text-red-300 text-[10px] cursor-pointer hover:bg-red-700', onClick: () => handleDelete(aid) }, 'Del'))
                        );
                    })
            )
        );
    }

    // ========================================================
    // MINI BOXSCORE
    // ========================================================
    function MiniBoxscore({ stats, players, oppPlayers, playerMap, minutesFromSubs, hasSubs }) {
        const [open, setOpen] = useState(false);
        const foulBadge = (fd) => { if (!fd) return ''; return Object.entries(fd).filter(([k, v]) => v > 0).map(([k, v]) => `${v}${k[0]}`).join(' '); };
        const headers = ['', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'BA', 'TOV', 'PF', 'Detail', 'FD', 'FG', '3PT', 'FT', '+/-', 'EVAL'];

        const renderRow = (p, s, isOppRow) => {
            if (!s) return null;
            const ev = calcEval(s);
            const mins = hasSubs && minutesFromSubs[p.id] !== undefined ? minutesFromSubs[p.id] : (s.minutes || 0);
            return React.createElement('tr', { key: p.id, className: `border-b border-slate-800/50 ${isOppRow ? 'text-red-300' : 'text-slate-300'}` },
                React.createElement('td', { className: 'py-1 px-1 font-bold text-white whitespace-nowrap' }, `#${p.number} ${p.name}`),
                React.createElement('td', { className: 'text-center text-cyan-400 font-mono' }, mins),
                React.createElement('td', { className: 'text-center text-orange-400 font-bold' }, s.pts),
                React.createElement('td', { className: 'text-center' }, s.reb, React.createElement('span', { className: 'text-[8px] text-slate-500 ml-0.5' }, `(${s.oreb}/${s.dreb})`)),
                React.createElement('td', { className: 'text-center' }, s.ast),
                React.createElement('td', { className: 'text-center' }, s.stl),
                React.createElement('td', { className: 'text-center' }, s.blk),
                React.createElement('td', { className: 'text-center text-orange-300' }, s.blkAgainst || 0),
                React.createElement('td', { className: 'text-center text-red-400' }, s.tov),
                React.createElement('td', { className: 'text-center text-red-400 font-bold' }, s.pf),
                React.createElement('td', { className: 'text-center text-[9px] text-slate-400 font-mono' }, foulBadge(s.foulDetails)),
                React.createElement('td', { className: 'text-center text-cyan-400' }, s.foulDrawn || 0),
                React.createElement('td', { className: 'text-center' }, `${s.fgm}-${s.fga}`),
                React.createElement('td', { className: 'text-center' }, `${s.threePM}-${s.threePA}`),
                React.createElement('td', { className: 'text-center' }, `${s.ftm}-${s.fta}`),
                React.createElement('td', { className: `text-center font-bold ${s.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}` }, `${s.plusMinus > 0 ? '+' : ''}${s.plusMinus}`),
                React.createElement('td', { className: `text-center font-bold ${ev >= 0 ? 'text-green-400' : 'text-red-400'}` }, ev)
            );
        };

        const homeRows = players.filter(p => stats.playerStats[p.id]).map(p => renderRow(p, stats.playerStats[p.id], false)).filter(Boolean);
        const oppRows = oppPlayers.filter(p => stats.playerStats[p.id]).map(p => renderRow(p, stats.playerStats[p.id], true)).filter(Boolean);

        return React.createElement('div', { className: 'border-b border-slate-800 shrink-0' },
            React.createElement('button', {
                className: 'w-full px-4 py-1.5 text-left text-[10px] text-slate-400 font-bold uppercase hover:bg-slate-800 cursor-pointer flex items-center gap-2',
                onClick: () => setOpen(!open)
            }, open ? 'v' : '>', 'Boxscore recalcule', hasSubs && React.createElement('span', { className: 'text-cyan-500 ml-2' }, '(minutes recalculees depuis SUB)')),
            open && React.createElement('div', { className: 'overflow-x-auto px-2 pb-2' },
                React.createElement('table', { className: 'w-full text-[10px]' },
                    React.createElement('thead', null, React.createElement('tr', { className: 'text-slate-500 border-b border-slate-800' }, headers.map(h => React.createElement('th', { key: h, className: 'py-1 px-1 text-center font-bold whitespace-nowrap' }, h)))),
                    React.createElement('tbody', null, ...homeRows, oppRows.length > 0 && React.createElement('tr', { key: 'sep' }, React.createElement('td', { colSpan: headers.length, className: 'py-1 text-center text-[9px] text-red-500 font-bold uppercase bg-red-950/30' }, 'Adversaire')), ...oppRows)
                )
            )
        );
    }

    // ========================================================
    // PORTAL & EXPORT
    // ========================================================
    function PlayByPlayEditorPortal(props) {
        const containerRef = useRef(null);
        if (!containerRef.current) { containerRef.current = document.createElement('div'); containerRef.current.id = 'pbp-editor-root'; }
        useEffect(() => { document.body.appendChild(containerRef.current); document.body.style.overflow = 'hidden'; return () => { document.body.removeChild(containerRef.current); document.body.style.overflow = ''; }; }, []);
        return ReactDOM.createPortal(React.createElement(PlayByPlayEditor, props), containerRef.current);
    }
    window.PlayByPlayEditor = PlayByPlayEditorPortal;
    window.recalcFullGame = recalcFullGame;
})();