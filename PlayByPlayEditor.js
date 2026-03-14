// PlayByPlayEditor.js — Composant React d'édition Play-by-Play + moteur de recalcul
// Scope global pour compatibilité Babel standalone (pas d'import/export)
//
// Fixes appliqués :
// 1. recalcMinutesFromSubs : isolation des deux équipes (deux passes séparées)
// 2. calculatePlayIntervals : même isolation
// 3. isOpponent : gère les PIDs string ("1005") en plus des number
// 4. StartersEditorModal : reçoit quarterOptions en prop au lieu de hardcoder [1,2,3,4]

(function () {
  'use strict';
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
    { value: 'SUB', label: 'Changement' },
    { value: 'TIMEOUT', label: 'Timeout' },
    { value: 'STOPPAGE', label: 'Arrêt Chrono' },
    { value: 'PAINT_TOUCH', label: 'Paint Touch' },
    { value: 'DEFLECTION', label: 'Déviation' },
    { value: 'BOXOUT', label: 'Box-out' },
    { value: 'BLOWBY', label: 'Battu 1c1' },
  ];

  const FOUL_TYPES = [
    { value: 'PERSONAL', label: 'Personnelle', short: 'P', color: 'bg-red-700' },
    { value: 'OFFENSIVE', label: 'Offensive', short: 'O', color: 'bg-orange-700' },
    { value: 'TECHNICAL', label: 'Technique', short: 'T', color: 'bg-yellow-700' },
    { value: 'UNSPORTSMANLIKE', label: 'Antisportive', short: 'U', color: 'bg-purple-700' },
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
    { id: '3pt_corner_r', label: '3pts Coin D', val: 3, x: 0.95, y: 0.85 },
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
    return Object.entries(game.opponentPlayerStats)
      .map(([pid, s]) => ({
        id: parseInt(pid),
        number: s.number || parseInt(pid) - 1000,
        name: s.name || `Adv #${s.number || parseInt(pid) - 1000}`,
        isOpp: true,
      }))
      .sort((a, b) => a.number - b.number);
  }

  function deduplicateIds(actions) {
    const seen = new Set();
    let counter = 0;
    return actions.map((a) => {
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
    if (t === 'FGM2')
      return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 2, made: true };
    if (t === 'FGA2')
      return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 2, made: false };
    if (t === 'FGM3')
      return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 3, made: true };
    if (t === 'FGA3')
      return { ...act, type: 'SHOT', _pid: act.playerId ?? act.pid, val: 3, made: false };
    if (t === 'FGM1')
      return { ...act, type: 'FT', _pid: act.playerId ?? act.pid, ftMade: 1, ftAtt: 1 };
    if (t === 'FGA1')
      return { ...act, type: 'FT', _pid: act.playerId ?? act.pid, ftMade: 0, ftAtt: 1 };
    if (t === 'PF')
      return { ...act, type: 'FOUL', _pid: act.playerId ?? act.pid, foulType: 'PERSONAL' };
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
      pts: 0,
      reb: 0,
      oreb: 0,
      dreb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      tov: 0,
      fga: 0,
      fgm: 0,
      fta: 0,
      ftm: 0,
      pf: 0,
      minutes: 0,
      plusMinus: 0,
      threePM: 0,
      threePA: 0,
      foulDrawn: 0,
      blkAgainst: 0,
      foulDetails: { PERSONAL: 0, OFFENSIVE: 0, TECHNICAL: 0, UNSPORTSMANLIKE: 0 },
      hockeyAst: 0,
      paintTouch: 0,
      deflections: 0,
      boxOuts: 0,
      blowBys: 0,
      unforcedTov: 0,
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
        const starters = startersData && startersData[q] ? startersData[q].map(parseId) : [];

        const onCourt = new Set(starters);
        starters.forEach((pid) => {
          if (playTime[pid] === undefined) playTime[pid] = 0;
        });

        const qSubs = actions
          .filter(
            (a) =>
              (a.q || 1) === q && a.type === 'SUB' && belongsToTeam(parseId(a.pid ?? a.playerId))
          )
          .map((a) => ({ ...a, time: a.time || 0 }))
          .sort((a, b) => b.time - a.time);

        let lastTime = QT_DURATION;

        qSubs.forEach((sub) => {
          const currentTime = sub.time;
          const duration = lastTime - currentTime;

          if (duration > 0) {
            onCourt.forEach((p) => {
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
          onCourt.forEach((p) => {
            if (playTime[p] === undefined) playTime[p] = 0;
            playTime[p] += lastTime;
          });
        }
      }
    }

    calcForTeam(homeStartersData, (pid) => !isOpponent(pid));
    calcForTeam(oppStartersData, (pid) => isOpponent(pid));

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
        const starters = startersData && startersData[q] ? startersData[q].map(parseId) : [];

        const onCourt = new Set(starters);
        starters.forEach((pid) => {
          if (!intervals[pid]) intervals[pid] = [];
        });

        const qSubs = actions
          .filter(
            (a) =>
              (a.q || 1) === q && a.type === 'SUB' && belongsToTeam(parseId(a.pid ?? a.playerId))
          )
          .map((a) => ({ ...a, time: a.time || 0 }))
          .sort((a, b) => b.time - a.time);

        let lastTime = QT_DURATION;

        qSubs.forEach((sub) => {
          const currentTime = sub.time;

          onCourt.forEach((p) => {
            if (!intervals[p]) intervals[p] = [];
            intervals[p].push({
              q: q,
              start: lastTime,
              end: currentTime,
              duration: lastTime - currentTime,
            });
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
          onCourt.forEach((p) => {
            if (!intervals[p]) intervals[p] = [];
            intervals[p].push({ q: q, start: lastTime, end: 0, duration: lastTime });
          });
        }
      }
    }

    calcForTeam(homeStartersData, (pid) => !isOpponent(pid));
    calcForTeam(oppStartersData, (pid) => isOpponent(pid));

    return intervals;
  }

  function recalcFullGame(actions, homePlayers, oppPlayers) {
    const pStats = {};
    homePlayers.forEach((p) => {
      pStats[p.id] = emptyPlayerStats();
    });
    oppPlayers.forEach((p) => {
      pStats[p.id] = emptyPlayerStats();
    });

    const oppTotals = {
      pts: 0,
      reb: 0,
      oreb: 0,
      ast: 0,
      tov: 0,
      fouls: 0,
      fga: 0,
      fgm: 0,
      fta: 0,
      ftm: 0,
    };
    let home = 0,
      away = 0;

    actions.forEach((rawAct) => {
      const act = normalizeAction(rawAct);
      const pid = act._pid;
      const isOpp = isOpponent(pid);
      if (pid && pid !== 'OPP' && !pStats[pid]) pStats[pid] = emptyPlayerStats();
      const ps = pid === 'OPP' ? null : pStats[pid];
      const type = act.type;
      let ptsScored = 0,
        ptsConceded = 0;

      if (type === 'SUB' || type === 'STOPPAGE' || type === 'TIMEOUT') return;

      if (isOpp) {
        if (type === 'SHOT') {
          const v = act.val || 2;
          if (ps) {
            if (v === 3) {
              ps.threePA++;
              ps.fga++;
              if (act.made) {
                ps.threePM++;
                ps.fgm++;
                ps.pts += 3;
              }
            } else {
              ps.fga++;
              if (act.made) {
                ps.fgm++;
                ps.pts += v;
              }
            }
          }
          oppTotals.fga++;
          if (act.made) {
            oppTotals.fgm++;
            oppTotals.pts += v;
            away += v;
            ptsConceded = v;
          }
        }
        if (type === 'FT') {
          const made = act.ftMade || 0,
            att = act.ftAtt || 0;
          if (ps) {
            ps.ftm += made;
            ps.fta += att;
            ps.pts += made;
          }
          oppTotals.ftm += made;
          oppTotals.fta += att;
          oppTotals.pts += made;
          away += made;
          ptsConceded = made;
        }
        if (type === 'OREB') {
          if (ps) {
            ps.reb++;
            ps.oreb++;
          }
          oppTotals.reb++;
          oppTotals.oreb++;
        }
        if (type === 'DREB') {
          if (ps) {
            ps.reb++;
            ps.dreb++;
          }
          oppTotals.reb++;
        }
        if (type === 'AST') {
          if (ps) ps.ast++;
          oppTotals.ast++;
        }
        if (type === 'TOV') {
          if (ps) ps.tov++;
          oppTotals.tov++;
        }
        if (type === 'STL') {
          if (ps) ps.stl++;
        }
        if (type === 'BLK') {
          if (ps) ps.blk++;
          if (act.victim && pStats[act.victim]) pStats[act.victim].blkAgainst++;
        }
        if (type === 'FOUL') {
          if (ps) {
            ps.pf++;
            const ft = act.foulType || 'PERSONAL';
            if (ps.foulDetails[ft] !== undefined) ps.foulDetails[ft]++;
          }
          oppTotals.fouls++;
          if (act.victim && pStats[act.victim]) pStats[act.victim].foulDrawn++;
        }
        if (act.consequence?.includes('score')) {
          const val = parseInt(act.consequence.split('_')[1]) || 0;
          home += val;
          ptsScored = val;
        }
      } else if (ps) {
        if (type === 'SHOT') {
          const v = act.val || 2;
          if (v === 3) {
            ps.threePA++;
            ps.fga++;
            if (act.made) {
              ps.threePM++;
              ps.fgm++;
              ps.pts += 3;
              home += 3;
              ptsScored = 3;
            }
          } else {
            ps.fga++;
            if (act.made) {
              ps.fgm++;
              ps.pts += v;
              home += v;
              ptsScored = v;
            }
          }
          if (act.made && act.astId && pStats[act.astId]) pStats[act.astId].ast++;
        }
        if (type === 'FT') {
          const made = act.ftMade || 0,
            att = act.ftAtt || 0;
          ps.ftm += made;
          ps.fta += att;
          ps.pts += made;
          home += made;
          ptsScored = made;
        }
        if (type === 'OREB') {
          ps.reb++;
          ps.oreb++;
        }
        if (type === 'DREB') {
          ps.reb++;
          ps.dreb++;
        }
        if (type === 'AST') ps.ast++;
        if (type === 'STL') ps.stl++;
        if (type === 'BLK') {
          ps.blk++;
          if (act.victim && pStats[act.victim]) pStats[act.victim].blkAgainst++;
        }
        if (type === 'TOV') ps.tov++;
        if (type === 'FOUL') {
          ps.pf++;
          const ft = act.foulType || 'PERSONAL';
          if (ps.foulDetails[ft] !== undefined) ps.foulDetails[ft]++;
          if (act.victim && pStats[act.victim]) pStats[act.victim].foulDrawn++;
        }
        if (act.consequence?.includes('score')) {
          const val = parseInt(act.consequence.split('_')[1]) || 0;
          away += val;
          ptsConceded = val;
        }
      }
      // Nouvelles stats (home et opp)
      if (ps) {
        if (type === 'PAINT_TOUCH') ps.paintTouch = (ps.paintTouch || 0) + 1;
        if (type === 'DEFLECTION') ps.deflections = (ps.deflections || 0) + 1;
        if (type === 'BOXOUT') ps.boxOuts = (ps.boxOuts || 0) + 1;
        if (type === 'BLOWBY') ps.blowBys = (ps.blowBys || 0) + 1;
        if (type === 'TOV' && act.unforced) ps.unforcedTov = (ps.unforcedTov || 0) + 1;
      }
      if (type === 'SHOT' && act.made && act.hockeyAssistId) {
        const hPid = isOpponent(act.hockeyAssistId) ? act.hockeyAssistId : parseInt(act.hockeyAssistId);
        if (pStats[hPid]) pStats[hPid].hockeyAst = (pStats[hPid].hockeyAst || 0) + 1;
      }

      const delta = ptsScored - ptsConceded;
      if (delta !== 0 && act.onCourt?.length) {
        act.onCourt.forEach((id) => {
          if (pStats[id]) pStats[id].plusMinus += delta;
        });
      }
    });
    return { playerStats: pStats, opponentStats: oppTotals, homeScore: home, awayScore: away };
  }

  function calcEval(s) {
    const tFGA = (s.fga || 0) + (s.threePA || 0),
      tFGM = (s.fgm || 0) + (s.threePM || 0);
    return (
      s.pts + s.reb + s.ast + s.stl + s.blk - (tFGA - tFGM + ((s.fta || 0) - (s.ftm || 0)) + s.tov)
    );
  }

  // ========================================================
  // EXPORT & CSV UTILS
  // ========================================================
  function exportMatchLogsCSV(actions, players, oppPlayers) {
    const formatTime = (t) =>
      `${Math.floor(t / 60)
        .toString()
        .padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
    const getPName = (pid) => {
      if (pid === 'OPP') return 'Adversaire';
      const p = players.find((x) => x.id === pid) || oppPlayers.find((x) => x.id === pid);
      return p ? `#${p.number}` : `#${pid}`;
    };

    const rows = [['QT', 'CHRONO', 'ACTION', 'JOUEUR', 'DETAILS']];
    const sorted = [...actions].sort((a, b) => {
      if ((a.q || 1) !== (b.q || 1)) return (a.q || 1) - (b.q || 1);
      return b.time - a.time;
    });

    sorted.forEach((a) => {
      const time = formatTime(a.time || 0);
      const pid = a.pid ?? a.playerId;
      const pName = getPName(pid);
      let desc = a.type;
      let details = '';

      if (a.type === 'SHOT') {
        desc = a.made ? `Tir ${a.val}pts` : `Tir Rate ${a.val}pts`;
      } else if (a.type === 'FT') {
        desc = `LF ${a.ftMade}/${a.ftAtt}`;
      } else if (a.type === 'AST') {
        desc = 'Passe D';
      } else if (a.type === 'OREB') {
        desc = 'Rebond Off';
      } else if (a.type === 'DREB') {
        desc = 'Rebond Def';
      } else if (a.type === 'STL') {
        desc = 'Interception';
      } else if (a.type === 'TOV') {
        desc = 'Ballon Perdu';
      } else if (a.type === 'BLK') {
        desc = 'Contre';
      } else if (a.type === 'FOUL') {
        desc = 'Faute';
        details = a.foulType || '';
      } else if (a.type === 'SUB') {
        desc = 'Changement';
        details = `Entree ${pName} / Sortie ${getPName(a.subOut)}`;
      } else if (a.type === 'STOPPAGE') {
        desc = `Arret Chrono ${a.duration || 0}s`;
      } else if (a.type === 'TIMEOUT') {
        desc = `Timeout ${a.team === 'home' ? 'Nous' : 'Eux'}`;
      }

      const finalAction = `${desc} ${pName}`;
      rows.push([`Q${a.q || 1}`, time, finalAction, pName, details]);
    });

    const csvContent = '\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'match_logs.csv';
    link.click();
  }

  function exportMinutesAuditCSV(intervals, players, oppPlayers) {
    const formatTime = (t) =>
      `${Math.floor(t / 60)
        .toString()
        .padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
    const rows = [
      [
        'JOUEUR',
        'EQUIPE',
        'QT',
        'ENTREE (Chrono)',
        'SORTIE (Chrono)',
        'DUREE (Min:Sec)',
        'DUREE (Sec)',
      ],
    ];

    Object.entries(intervals).forEach(([pid, list]) => {
      const numPid = parseInt(pid);
      const isOpp = isOpponent(numPid);
      const p = isOpp
        ? oppPlayers.find((x) => x.id === numPid)
        : players.find((x) => x.id === numPid);

      if (!p && !isOpp) return;

      const pName = p ? `#${p.number} ${p.name}` : `#${pid}`;
      const teamName = isOpp ? 'ADVERSAIRE' : 'DOMICILE';

      list.forEach((iv) => {
        rows.push([
          pName,
          teamName,
          `Q${iv.q}`,
          formatTime(iv.start),
          formatTime(iv.end),
          formatTime(iv.duration),
          iv.duration,
        ]);
      });
    });

    const csvContent = '\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'audit_temps_jeu_complet.csv';
    link.click();
  }

  // ========================================================
  // UTILS
  // ========================================================
  function formatTime(time) {
    var m = Math.floor((time || 0) / 60);
    var s = (time || 0) % 60;
    return m + ':' + s.toString().padStart(2, '0');
  }

  // ========================================================
  // UI COMPONENTS
  // ========================================================
  function ZoneSelector({ onSelect, onCancel }) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100002,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
      >
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-md w-full mx-4">
          <h3 className="text-white font-bold mb-4 text-sm">Selectionner la zone de tir</h3>
          <div className="grid grid-cols-3 gap-2">
            {SHOT_ZONES.map((z) => (
              <button
                key={z.id}
                className={`px-3 py-2 rounded text-xs font-semibold cursor-pointer border transition-all ${z.val === 3 ? 'bg-purple-900 border-purple-600 hover:bg-purple-700 text-purple-200' : 'bg-blue-900 border-blue-600 hover:bg-blue-700 text-blue-200'}`}
                onClick={() => onSelect(z)}
              >
                {z.label}
              </button>
            ))}
          </div>
          <button
            className="mt-4 w-full py-2 rounded bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-600"
            onClick={onCancel}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  function CombinedPlayerSelect({
    value,
    onChange,
    homePlayers,
    oppPlayers,
    allowNone,
    className,
  }) {
    return (
      <select
        className={(className || SEL) + ' w-full'}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : v === 'OPP' ? 'OPP' : parseInt(v));
        }}
      >
        {allowNone && <option value="">— Aucun —</option>}
        <optgroup label="Domicile">
          {homePlayers.map((p) => (
            <option key={p.id} value={p.id}>{`#${p.number} ${p.name}`}</option>
          ))}
        </optgroup>
        {oppPlayers.length > 0 ? (
          <optgroup label="Adversaire">
            {oppPlayers.map((p) => (
              <option key={p.id} value={p.id}>{`#${p.number} ${p.name}`}</option>
            ))}
          </optgroup>
        ) : (
          <option value="OPP">Adversaire (generique)</option>
        )}
      </select>
    );
  }

  // MODALE : Verification des Minutes (Audit Complet)
  function MinutesAuditModal({ intervals, players, oppPlayers, onClose }) {
    const formatTime = (t) =>
      `${Math.floor(t / 60)
        .toString()
        .padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100005,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold">Verification Temps de Jeu (Tous)</h3>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-500"
                onClick={() => exportMinutesAuditCSV(intervals, players, oppPlayers)}
              >
                Export
              </button>
              <button className="text-slate-400 hover:text-white cursor-pointer transition-colors duration-200 p-1 rounded" onClick={onClose}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 bg-slate-900 rounded border border-slate-700 p-2">
            {Object.entries(intervals).map(([pid, list]) => {
              const numPid = parseInt(pid);
              const isOpp = isOpponent(numPid);
              const p = isOpp
                ? oppPlayers.find((x) => x.id === numPid)
                : players.find((x) => x.id === numPid);

              if (!p && !isOpp) return null;

              const totalSec = list.reduce((sum, i) => sum + i.duration, 0);
              const totalMin = Math.round(totalSec / 60);

              return (
                <div
                  key={pid}
                  className={`mb-4 border-b pb-2 ${isOpp ? 'border-red-900/50' : 'border-slate-700'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${isOpp ? 'text-red-400' : 'text-orange-400'}`}>
                      {p ? `#${p.number} ${p.name}` : `Joueur ${pid}`}
                    </span>
                    <span className="text-sm text-white font-mono">{`${totalMin} min (${totalSec}s)`}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-400 uppercase font-bold bg-slate-800 p-1 rounded mb-1">
                    <div>QT</div>
                    <div>Entree</div>
                    <div>Sortie</div>
                    <div className="text-right">Duree</div>
                  </div>
                  {list.map((iv, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-2 text-xs text-slate-300 p-1 border-b border-slate-800/50"
                    >
                      <div>{`Q${iv.q}`}</div>
                      <div className="text-green-400">{formatTime(iv.start)}</div>
                      <div className="text-red-400">{formatTime(iv.end)}</div>
                      <div className="text-right font-mono">{formatTime(iv.duration)}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // [FIX 4] StartersEditorModal recoit quarterOptions en prop
  function StartersEditorModal({
    homeStarters,
    oppStarters,
    players,
    oppPlayers,
    quarterOptions,
    onSave,
    onClose,
  }) {
    const [editedHome, setEditedHome] = useState(homeStarters || {});
    const [editedOpp, setEditedOpp] = useState(oppStarters || {});

    const [activeTab, setActiveTab] = useState('HOME');
    const [activeQ, setActiveQ] = useState(quarterOptions[0] || 1);
    const quarters = quarterOptions;

    const togglePlayer = (team, q, pid) => {
      if (team === 'HOME') {
        const current = editedHome[q] || [];
        const next = current.includes(pid) ? current.filter((id) => id !== pid) : [...current, pid];
        setEditedHome({ ...editedHome, [q]: next });
      } else {
        const current = editedOpp[q] || [];
        const next = current.includes(pid) ? current.filter((id) => id !== pid) : [...current, pid];
        setEditedOpp({ ...editedOpp, [q]: next });
      }
    };

    const currentList = activeTab === 'HOME' ? editedHome[activeQ] || [] : editedOpp[activeQ] || [];
    const currentPlayers = activeTab === 'HOME' ? players : oppPlayers;

    const handleSave = () => {
      onSave(editedHome, editedOpp);
    };

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100005,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-2xl w-full mx-4 flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="text-white font-bold text-lg">Modifier les 5 de Depart</h3>
            <button className="text-slate-400 hover:text-white cursor-pointer transition-colors duration-200 p-1 rounded" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex gap-2 mb-4 bg-slate-900 p-1 rounded">
            <button
              className={`flex-1 py-2 text-sm font-bold rounded ${activeTab === 'HOME' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              onClick={() => setActiveTab('HOME')}
            >
              Domicile
            </button>
            <button
              className={`flex-1 py-2 text-sm font-bold rounded ${activeTab === 'OPP' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              onClick={() => setActiveTab('OPP')}
            >
              Adversaire
            </button>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {quarters.map((q) => (
              <button
                key={q}
                className={`px-4 py-2 rounded font-bold text-sm transition-colors ${activeQ === q ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                onClick={() => setActiveQ(q)}
              >
                {q <= 4 ? `Q${q}` : `OT${q - 4}`}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-400 mb-2 italic">
            {`Titulaires ${activeTab === 'HOME' ? 'Domicile' : 'Adversaire'} pour ${activeQ <= 4 ? 'Q' + activeQ : 'OT'} (${currentList.length} selectionnes)`}
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-900 rounded border border-slate-700 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentPlayers.map((p) => {
              const isSelected = currentList.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`p-2 rounded border cursor-pointer flex items-center gap-2 select-none ${isSelected ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                  onClick={() => togglePlayer(activeTab, activeQ, p.id)}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}
                  >
                    {isSelected && <span className="text-white text-xs font-bold">V</span>}
                  </div>
                  <span className="font-mono font-bold text-white">{`#${p.number}`}</span>
                  <span className="text-slate-300 text-xs truncate">{p.name}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded"
              onClick={handleSave}
            >
              Valider & Recalculer
            </button>
          </div>
        </div>
      </div>
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
    const [stoppageDuration, setStoppageDuration] = useState(30);
    const [timeoutTeam, setTimeoutTeam] = useState('home');
    const [play, setPlay] = useState('');
    const defaultPlayTypes = [
      'Transition',
      'Pick & Roll',
      'Jeu posté',
      'Isolation',
      'Motion',
      'Sortie de temps mort',
    ];
    const playTypes = React.useMemo(() => {
      try {
        return JSON.parse(localStorage.getItem('basket_play_types')) || defaultPlayTypes;
      } catch {
        return defaultPlayTypes;
      }
    }, []);

    const handleSubmit = () => {
      const pId = pid === 'OPP' ? 'OPP' : parseInt(pid);
      if (!pId && pId !== 0) return;
      const time = timeMin * 60 + timeSec;
      let action = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type,
        pid: pId,
        q,
        time,
        onCourt: [],
      };
      if (type === 'SHOT') {
        action.val = val;
        action.made = made;
        if (zone) {
          action.x = zone.x;
          action.y = zone.y;
        }
      }
      if (type === 'FT') {
        action.ftMade = ftMade;
        action.ftAtt = ftAtt;
      }
      if (type === 'FOUL') {
        action.foulType = foulType;
        if (victim) action.victim = victim;
      }
      if (type === 'BLK' && victim) action.victim = victim;
      if (type === 'SUB') {
        action.subOut = subOut;
      }
      if (type === 'STOPPAGE') {
        action.duration = stoppageDuration;
        action.pid = 0;
      }
      if (type === 'TIMEOUT') {
        action.team = timeoutTeam;
        action.pid = 0;
      }
      if (play) action.play = play;
      onAdd(action);
    };

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100002,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
      >
        {showZone && (
          <ZoneSelector
            onSelect={(z) => {
              setZone(z);
              setVal(z.val);
              setShowZone(false);
            }}
            onCancel={() => setShowZone(false)}
          />
        )}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h3 className="text-white font-bold mb-4 text-sm">Ajouter une action</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className={LBL}>Type</div>
              <select
                className={SEL + ' w-full'}
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setVictim(null);
                  setSubOut(null);
                }}
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={LBL}>{type === 'SUB' ? 'Joueur ENTRANT' : 'Joueur'}</div>
              <CombinedPlayerSelect
                value={pid === '' ? null : pid === 'OPP' ? 'OPP' : parseInt(pid)}
                onChange={(v) => setPid(v ?? '')}
                homePlayers={homePlayers}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className={LBL}>Quart-temps</div>
              <select
                className={SEL + ' w-full'}
                value={q}
                onChange={(e) => setQ(parseInt(e.target.value))}
              >
                {quarters.map((qn) => (
                  <option key={qn} value={qn}>
                    {qn <= 4 ? `Q${qn}` : `OT${qn - 4}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={LBL}>Chrono</div>
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  min="0"
                  max="10"
                  className={SEL + ' w-12 text-center'}
                  value={timeMin}
                  onChange={(e) => setTimeMin(parseInt(e.target.value) || 0)}
                />
                <span className="text-slate-400 font-bold">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className={SEL + ' w-12 text-center'}
                  value={timeSec}
                  onChange={(e) => setTimeSec(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <div className="mb-3">
            <div className={LBL}>Système</div>
            <select
              className={SEL + ' w-full'}
              value={play}
              onChange={(e) => setPlay(e.target.value)}
            >
              <option value="">Aucun</option>
              {playTypes.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>
          {type === 'SHOT' && (
            <div className="flex gap-3 mb-3 items-end flex-wrap">
              <div>
                <div className={LBL}>Valeur</div>
                <div className="flex gap-1">
                  {[2, 3].map((v) => (
                    <button
                      key={v}
                      className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${val === v ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                      onClick={() => setVal(v)}
                    >{`${v}pts`}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className={LBL}>Resultat</div>
                <div className="flex gap-1">
                  <button
                    className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${made ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    onClick={() => setMade(true)}
                  >
                    Marque
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${!made ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    onClick={() => setMade(false)}
                  >
                    Rate
                  </button>
                </div>
              </div>
              <button
                className="px-3 py-1.5 rounded text-xs font-bold cursor-pointer bg-slate-700 text-slate-300 hover:bg-slate-600"
                onClick={() => setShowZone(true)}
              >
                {zone ? zone.label : 'Zone'}
              </button>
            </div>
          )}
          {type === 'FT' && (
            <div className="flex gap-3 mb-3 items-end">
              <div>
                <div className={LBL}>Tentes</div>
                <input
                  type="number"
                  min="0"
                  max="3"
                  className={SEL + ' w-14 text-center'}
                  value={ftAtt}
                  onChange={(e) => setFtAtt(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <div className={LBL}>Reussis</div>
                <input
                  type="number"
                  min="0"
                  max="3"
                  className={SEL + ' w-14 text-center'}
                  value={ftMade}
                  onChange={(e) => setFtMade(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
          {type === 'FOUL' && (
            <div className="mb-3 space-y-3">
              <div>
                <div className={LBL}>Type</div>
                <div className="flex gap-1 flex-wrap">
                  {FOUL_TYPES.map((ft) => (
                    <button
                      key={ft.value}
                      className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer border transition-all ${foulType === ft.value ? ft.color + ' border-white text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'}`}
                      onClick={() => setFoulType(ft.value)}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={LBL}>Provoquee par</div>
                <CombinedPlayerSelect
                  value={victim}
                  onChange={setVictim}
                  homePlayers={homePlayers}
                  oppPlayers={oppPlayers}
                  allowNone={true}
                />
              </div>
            </div>
          )}
          {type === 'BLK' && (
            <div className="mb-3">
              <div className={LBL}>Contre</div>
              <CombinedPlayerSelect
                value={victim}
                onChange={setVictim}
                homePlayers={homePlayers}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          )}
          {type === 'SUB' && (
            <div className="mb-3">
              <div className={LBL}>SORTANT</div>
              <CombinedPlayerSelect
                value={subOut}
                onChange={setSubOut}
                homePlayers={homePlayers}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          )}
          {type === 'STOPPAGE' && (
            <div className="mb-3">
              <div className={LBL}>Durée (secondes)</div>
              <input
                type="number"
                className={SEL + ' w-full'}
                value={stoppageDuration}
                min="1"
                max="600"
                onChange={(e) => setStoppageDuration(parseInt(e.target.value) || 30)}
              />
            </div>
          )}
          {type === 'TIMEOUT' && (
            <div className="mb-3">
              <div className={LBL}>Équipe</div>
              <select
                className={SEL + ' w-full'}
                value={timeoutTeam}
                onChange={(e) => setTimeoutTeam(e.target.value)}
              >
                <option value="home">Nous</option>
                <option value="away">Adversaire</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 justify-end mt-4">
            <button
              className="px-4 py-2 rounded bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-600"
              onClick={onCancel}
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded bg-orange-500 text-white text-xs font-semibold cursor-pointer hover:bg-orange-600 disabled:opacity-40"
              onClick={handleSubmit}
              disabled={!pid && pid !== 0 && type !== 'STOPPAGE' && type !== 'TIMEOUT'}
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // ACTION CARD
  // ========================================================
  function ActionCard({ action, playerMap, onEdit, onDelete }) {
    var pid = action.pid != null ? action.pid : action.playerId;
    var isOpp = isOpponent(pid);
    var p = playerMap[pid];
    var icon = '•', label = action.type, bgClass = 'bg-slate-900/50', borderClass = 'border-l-slate-500';
    if (action.type === 'SHOT') {
      icon = action.made ? '✓' : '✗';
      label = action.val + 'pts ' + (action.made ? 'Réussi' : 'Raté');
      bgClass = action.made ? 'bg-green-950/30' : 'bg-red-950/20';
      borderClass = action.made ? 'border-l-green-500' : 'border-l-red-500';
    }
    if (action.type === 'FT') { icon = '🎯'; label = 'LF ' + (action.ftMade || 0) + '/' + (action.ftAtt || 0); }
    if (action.type === 'SUB') {
      icon = '🔁';
      var outP = playerMap[action.subOut];
      label = 'IN ← OUT ' + (outP ? '#' + outP.number : '?');
      bgClass = 'bg-cyan-950/20'; borderClass = 'border-l-cyan-500';
    }
    if (action.type === 'FOUL') {
      icon = action.foulType === 'TECHNICAL' ? '🟡' : action.foulType === 'UNSPORTSMANLIKE' ? '🟥' : '🚨';
      label = (action.foulType || 'PERSONAL').toLowerCase();
      bgClass = 'bg-orange-950/20'; borderClass = 'border-l-orange-500';
    }
    if (action.type === 'TOV') { icon = '💨'; label = action.unforced ? 'Perte NF' : 'Perte'; }
    if (action.type === 'OREB') { icon = '🔄'; label = 'Reb Off'; }
    if (action.type === 'DREB') { icon = '🛡️'; label = 'Reb Def'; }
    if (action.type === 'STL') { icon = '⚡'; label = 'Interception' + (action.victim && playerMap[action.victim] ? ' / perte #' + playerMap[action.victim].number : ''); }
    if (action.type === 'BLK') { icon = '✋'; label = 'Contre'; }
    if (action.type === 'TIMEOUT') {
      icon = '⏸'; label = 'Timeout ' + (action.team === 'home' ? 'Nous' : 'Eux');
      bgClass = 'bg-indigo-950/30'; borderClass = 'border-l-indigo-500';
    }
    if (action.type === 'STOPPAGE') {
      icon = '⏱'; label = 'Arrêt ' + (action.duration || 0) + 's';
      bgClass = 'bg-slate-800/50'; borderClass = 'border-l-slate-400';
    }
    if (action.type === 'PAINT_TOUCH') { icon = '🎨'; label = 'Paint Touch'; }
    if (action.type === 'DEFLECTION') { icon = '👋'; label = 'Déviation'; }
    if (action.type === 'BOXOUT') { icon = '🧱'; label = 'Box-out'; }
    if (action.type === 'BLOWBY') { icon = '💨'; label = 'Battu 1c1'; bgClass = 'bg-red-950/20'; }
    return (
      <div className={'flex items-center gap-2 px-3 py-2 rounded border-l-2 mb-0.5 group cursor-pointer hover:bg-slate-800 transition-colors ' + bgClass + ' ' + borderClass}
        onClick={() => onEdit(action)}>
        <span className="text-slate-500 font-mono text-[10px] w-14 shrink-0">
          {'Q' + (action.q || 1) + ' ' + formatTime(action.time)}
        </span>
        <span className="text-sm w-5 text-center">{icon}</span>
        <span className={'font-bold text-xs shrink-0 w-16 truncate ' + (isOpp ? 'text-red-400' : 'text-blue-400')}>
          {p ? '#' + p.number : ''}
        </span>
        <span className="text-slate-300 text-xs flex-1 truncate">
          {label}
          {action.type === 'SHOT' && action.shotQuality && (
            <span className={'ml-1 text-[9px] font-bold px-1 rounded border ' +
              (action.shotQuality === 'open' ? 'text-green-400 border-green-700' :
               action.shotQuality === 'forced' ? 'text-red-400 border-red-700' :
               'text-yellow-400 border-yellow-700')}>
              {action.shotQuality === 'open' ? 'O' : action.shotQuality === 'forced' ? 'F' : 'C'}
            </span>
          )}
          {action.type === 'SHOT' && action.made && action.astId && playerMap[action.astId] && (
            <span className="text-purple-400 text-[9px] ml-1">ast #{playerMap[action.astId].number}</span>
          )}
          {action.type === 'SHOT' && action.hockeyAssistId && playerMap[action.hockeyAssistId] && (
            <span className="text-teal-400 text-[9px] ml-1">🏒#{playerMap[action.hockeyAssistId].number}</span>
          )}
          {action.type === 'FOUL' && action.foulType === 'TECHNICAL' && action.ftShooterId && playerMap[action.ftShooterId] && (
            <span className="text-yellow-400 text-[9px] ml-1">LF:#{playerMap[action.ftShooterId].number}</span>
          )}
          {action.play && (
            <span className="text-slate-600 text-[9px] ml-1">📋{action.play}</span>
          )}
        </span>
        <button className="opacity-0 group-hover:opacity-100 text-red-400 text-xs px-1 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(action.id); }}>
          ✕
        </button>
      </div>
    );
  }

  // ========================================================
  // QUARTER SEPARATOR
  // ========================================================
  function QuarterSeparator({ quarter, homeScore, awayScore }) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 my-1">
        <div className="flex-1 h-px bg-slate-700"></div>
        <span className="text-orange-400 font-bold text-xs uppercase tracking-wider">
          {quarter <= 4 ? 'Q' + quarter : 'OT' + (quarter - 4)}
        </span>
        <span className="text-slate-400 text-[10px] font-mono">
          {homeScore + ' - ' + awayScore}
        </span>
        <div className="flex-1 h-px bg-slate-700"></div>
      </div>
    );
  }

  // ========================================================
  // FILTER BAR
  // ========================================================
  function FilterBar({ quarters, players, filterQ, filterPid, filterType, filterPlay, playOptions, onFilterQ, onFilterPid, onFilterType, onFilterPlay, onReset, onAdd }) {
    var hasFilter = filterQ > 0 || filterPid !== 'all' || filterType !== 'all' || filterPlay !== 'all';
    return (
      <div className="bg-slate-900 border-b border-slate-700 px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        <button onClick={() => onFilterQ(0)}
          className={'px-2 py-1 rounded text-[10px] font-bold border shrink-0 ' + (filterQ === 0 ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-600 text-slate-400')}>
          All
        </button>
        {quarters.map(q => (
          <button key={q} onClick={() => onFilterQ(q)}
            className={'px-2 py-1 rounded text-[10px] font-bold border shrink-0 ' + (filterQ === q ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-600 text-slate-400')}>
            {q <= 4 ? 'Q' + q : 'OT' + (q - 4)}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-700 mx-1 shrink-0"></div>
        <select value={filterPid} onChange={e => onFilterPid(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-white text-[10px] rounded px-2 py-1 font-bold max-w-[100px] shrink-0">
          <option value="all">Joueurs</option>
          {players.map(p => <option key={p.id} value={p.id}>{'#' + p.number}</option>)}
          <option value="OPP">Adversaire</option>
        </select>
        <select value={filterType} onChange={e => onFilterType(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-white text-[10px] rounded px-2 py-1 font-bold max-w-[100px] shrink-0">
          <option value="all">Types</option>
          {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {playOptions.length > 0 && (
          <select value={filterPlay} onChange={e => onFilterPlay(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white text-[10px] rounded px-2 py-1 font-bold max-w-[100px] shrink-0">
            <option value="all">Plays</option>
            {playOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {hasFilter && (
          <button onClick={onReset}
            className="px-2 py-1 rounded text-[10px] font-bold bg-red-900 border border-red-700 text-red-300 whitespace-nowrap shrink-0">
            ✕ Reset
          </button>
        )}
        <button onClick={onAdd}
          className="ml-auto px-3 py-1 rounded text-[10px] font-bold bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap shrink-0">
          + Action
        </button>
      </div>
    );
  }

  // ========================================================
  // EDIT PANEL (bottom sheet — édition et ajout)
  // ========================================================
  function EditPanel({ action, players, oppPlayers, quarters, onSave, onDelete, onCancel }) {
    var isNew = !!(action && action._new);
    const defaultPlayTypes = ['Transition', 'Pick & Roll', 'Jeu posté', 'Isolation', 'Motion', 'Sortie de temps mort'];
    const playTypes = useMemo(() => {
      try { return JSON.parse(localStorage.getItem('basket_play_types')) || defaultPlayTypes; }
      catch (e) { return defaultPlayTypes; }
    }, []);
    const [data, setData] = useState({
      type: action.type || 'SHOT',
      pid: action.pid != null ? action.pid : (action.playerId != null ? action.playerId : ''),
      q: action.q || 1,
      timeMin: Math.floor((action.time || 0) / 60),
      timeSec: (action.time || 0) % 60,
      val: action.val || 2,
      made: action.made !== undefined ? action.made : true,
      ftMade: action.ftMade || 0,
      ftAtt: action.ftAtt || 2,
      foulType: action.foulType || 'PERSONAL',
      victim: action.victim || null,
      subOut: action.subOut || null,
      play: action.play || '',
      duration: action.duration || 30,
      team: action.team || 'home',
      astId: action.astId || null,
      ftShooterId: action.ftShooterId || null,
      shotQuality: action.shotQuality || null,
      unforced: action.unforced || false,
      hockeyAssistId: action.hockeyAssistId || null,
      zoneX: action.x,
      zoneY: action.y,
    });
    const [showZone, setShowZone] = useState(false);
    return (
      <div>
        {showZone && (
          <ZoneSelector
            onSelect={(z) => { setData(d => ({ ...d, val: z.val, zoneX: z.x, zoneY: z.y })); setShowZone(false); }}
            onCancel={() => setShowZone(false)}
          />
        )}
        <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-800 border-t-2 border-orange-500 rounded-t-xl shadow-2xl max-h-[70vh] overflow-y-auto p-4"
          style={{ animation: 'slideUp 0.2s ease-out' }}>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          <div className="flex justify-between items-center mb-3">
            <span className="text-orange-400 font-bold text-sm">
              {isNew ? 'Ajouter action' : 'Modifier action'}
            </span>
            <button onClick={onCancel} className="text-slate-400 text-lg leading-none">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className={LBL}>Type</div>
              <select className={SEL + ' w-full'} value={data.type}
                onChange={e => setData(d => ({ ...d, type: e.target.value, victim: null, subOut: null }))}>
                {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <div className={LBL}>{data.type === 'SUB' ? 'Joueur ENTRANT' : 'Joueur'}</div>
              <CombinedPlayerSelect
                value={data.pid === '' ? null : (data.pid === 'OPP' ? 'OPP' : (typeof data.pid === 'number' ? data.pid : parseInt(data.pid) || null))}
                onChange={v => setData(d => ({ ...d, pid: v != null ? v : '' }))}
                homePlayers={players}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className={LBL}>Quart-temps</div>
              <select className={SEL + ' w-full'} value={data.q}
                onChange={e => setData(d => ({ ...d, q: parseInt(e.target.value) }))}>
                {quarters.map(q => <option key={q} value={q}>{q <= 4 ? 'Q' + q : 'OT' + (q - 4)}</option>)}
              </select>
            </div>
            <div>
              <div className={LBL}>Chrono</div>
              <div className="flex gap-1 items-center">
                <input type="number" min="0" max="10" className={SEL + ' w-12 text-center'}
                  value={data.timeMin}
                  onChange={e => setData(d => ({ ...d, timeMin: parseInt(e.target.value) || 0 }))} />
                <span className="text-slate-400 font-bold">:</span>
                <input type="number" min="0" max="59" className={SEL + ' w-12 text-center'}
                  value={data.timeSec}
                  onChange={e => setData(d => ({ ...d, timeSec: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className={LBL}>Système</div>
            <select className={SEL + ' w-full'} value={data.play}
              onChange={e => setData(d => ({ ...d, play: e.target.value }))}>
              <option value="">Aucun</option>
              {playTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>

          {data.type === 'SHOT' && (
            <div className="flex gap-3 mb-3 items-end flex-wrap">
              <div>
                <div className={LBL}>Valeur</div>
                <div className="flex gap-1">
                  {[2, 3].map(v => (
                    <button key={v}
                      className={'px-3 py-1.5 rounded text-xs font-bold cursor-pointer ' + (data.val === v ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300')}
                      onClick={() => setData(d => ({ ...d, val: v }))}>
                      {v + 'pts'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={LBL}>Résultat</div>
                <div className="flex gap-1">
                  <button
                    className={'px-3 py-1.5 rounded text-xs font-bold cursor-pointer ' + (data.made ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300')}
                    onClick={() => setData(d => ({ ...d, made: true }))}>Marqué</button>
                  <button
                    className={'px-3 py-1.5 rounded text-xs font-bold cursor-pointer ' + (!data.made ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300')}
                    onClick={() => setData(d => ({ ...d, made: false }))}>Raté</button>
                </div>
              </div>
              <div>
                <div className={LBL}>Qualité</div>
                <select className={SEL} value={data.shotQuality || ''}
                  onChange={e => setData(d => ({ ...d, shotQuality: e.target.value || null }))}>
                  <option value="">— Aucune</option>
                  <option value="open">Ouvert</option>
                  <option value="contested">Contesté</option>
                  <option value="forced">Forcé</option>
                </select>
              </div>
              <button className="px-3 py-1.5 rounded text-xs font-bold cursor-pointer bg-slate-700 text-slate-300 hover:bg-slate-600 self-end"
                onClick={() => setShowZone(true)}>
                {data.zoneX !== undefined ? '📍 Zone' : 'Zone'}
              </button>
            </div>
          )}
          {data.type === 'SHOT' && data.made && (
            <div className="mb-3">
              <div className={LBL}>Passe décisive</div>
              <CombinedPlayerSelect
                value={data.astId}
                onChange={v => setData(d => ({ ...d, astId: v, hockeyAssistId: v ? d.hockeyAssistId : null }))}
                homePlayers={players}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          )}
          {data.type === 'SHOT' && data.made && data.astId && (
            <div className="mb-3">
              <div className={LBL}>🏒 Hockey assist (passe avant)</div>
              <CombinedPlayerSelect
                value={data.hockeyAssistId}
                onChange={v => setData(d => ({ ...d, hockeyAssistId: v }))}
                homePlayers={players}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          )}

          {data.type === 'FT' && (
            <div className="flex gap-3 mb-3 items-end">
              <div>
                <div className={LBL}>Tentés</div>
                <input type="number" min="0" max="3" className={SEL + ' w-14 text-center'}
                  value={data.ftAtt}
                  onChange={e => setData(d => ({ ...d, ftAtt: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <div className={LBL}>Réussis</div>
                <input type="number" min="0" max="3" className={SEL + ' w-14 text-center'}
                  value={data.ftMade}
                  onChange={e => setData(d => ({ ...d, ftMade: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          )}

          {data.type === 'FOUL' && (
            <div className="mb-3 space-y-3">
              <div>
                <div className={LBL}>Type de faute</div>
                <div className="flex gap-1 flex-wrap">
                  {FOUL_TYPES.map(ft => (
                    <button key={ft.value}
                      className={'px-3 py-1.5 rounded text-xs font-bold cursor-pointer border transition-all ' + (data.foulType === ft.value ? ft.color + ' border-white text-white' : 'bg-slate-800 border-slate-600 text-slate-400')}
                      onClick={() => setData(d => ({ ...d, foulType: ft.value, victim: ft.value === 'TECHNICAL' ? null : d.victim, ftShooterId: ft.value !== 'TECHNICAL' ? null : d.ftShooterId }))}>
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
              {data.foulType === 'TECHNICAL' ? (
                <div>
                  <div className={LBL}>Tireur des LF</div>
                  <CombinedPlayerSelect
                    value={data.ftShooterId}
                    onChange={v => setData(d => ({ ...d, ftShooterId: v }))}
                    homePlayers={players}
                    oppPlayers={oppPlayers}
                    allowNone={true}
                  />
                </div>
              ) : (
                <div>
                  <div className={LBL}>Provoquée par</div>
                  <CombinedPlayerSelect
                    value={data.victim}
                    onChange={v => setData(d => ({ ...d, victim: v }))}
                    homePlayers={players}
                    oppPlayers={oppPlayers}
                    allowNone={true}
                  />
                </div>
              )}
            </div>
          )}

          {data.type === 'TOV' && (
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={data.unforced || false}
                onChange={e => setData(d => ({ ...d, unforced: e.target.checked }))}
                style={{accentColor: '#ef4444'}} />
              <span className="text-xs text-slate-400">Perte non-forcée (erreur de concentration)</span>
            </div>
          )}
          {data.type === 'STL' && (
            <div className="mb-3">
              <div className={LBL}>Perte par (qui a perdu la balle)</div>
              <CombinedPlayerSelect
                value={data.victim}
                onChange={v => setData(d => ({ ...d, victim: v }))}
                homePlayers={players}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          )}

          {data.type === 'BLK' && (
            <div className="mb-3">
              <div className={LBL}>Victime du contre</div>
              <CombinedPlayerSelect
                value={data.victim}
                onChange={v => setData(d => ({ ...d, victim: v }))}
                homePlayers={players}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          )}

          {data.type === 'SUB' && (
            <div className="mb-3">
              <div className={LBL}>SORTANT</div>
              <CombinedPlayerSelect
                value={data.subOut}
                onChange={v => setData(d => ({ ...d, subOut: v }))}
                homePlayers={players}
                oppPlayers={oppPlayers}
                allowNone={true}
              />
            </div>
          )}

          {data.type === 'STOPPAGE' && (
            <div className="mb-3">
              <div className={LBL}>Durée (secondes)</div>
              <input type="number" min="1" max="600" className={SEL + ' w-full'}
                value={data.duration}
                onChange={e => setData(d => ({ ...d, duration: parseInt(e.target.value) || 30 }))} />
            </div>
          )}

          {data.type === 'TIMEOUT' && (
            <div className="mb-3">
              <div className={LBL}>Équipe</div>
              <select className={SEL + ' w-full'} value={data.team}
                onChange={e => setData(d => ({ ...d, team: e.target.value }))}>
                <option value="home">Nous</option>
                <option value="away">Adversaire</option>
              </select>
            </div>
          )}

          <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-700">
            {!isNew && (
              <button onClick={() => { if (confirm('Supprimer ?')) onDelete(action.id); }}
                className="px-3 py-2 rounded bg-red-900 text-red-300 text-xs font-bold">
                Supprimer
              </button>
            )}
            <button onClick={onCancel}
              className="px-3 py-2 rounded bg-slate-700 text-slate-300 text-xs font-bold">
              Annuler
            </button>
            <button onClick={() => onSave(data)}
              className="px-4 py-2 rounded bg-green-600 text-white text-xs font-bold">
              OK
            </button>
          </div>
        </div>
      </div>
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
    const [filterType, setFilterType] = useState('all');
    const [editingAction, setEditingAction] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [filterPlay, setFilterPlay] = useState('all');

    const [showAudit, setShowAudit] = useState(false);
    const [showStarters, setShowStarters] = useState(false);

    const oppPlayers = useMemo(() => extractOppPlayers(game), [game]);

    useEffect(() => {
      if (game?.actions?.length) setActions(deduplicateIds(game.actions));
      else setActions([]);

      setCurrentStarters(game?.starters || {});
      setCurrentOppStarters(game?.opponentStarters || {});

      setDirty(false);
      if (game?.date) {
        const parts = game.date.split('/');
        if (parts.length === 3) {
          setEditDate(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        } else {
          setEditDate(game.date); // fallback ISO
        }
      } else {
        setEditDate('');
      }
      // ============================================================
      // DEBUG MINUTES — Coller dans la console ou ajouter en bas de PlayByPlayEditor.js
      // Usage : window.debugMinutes(game)
      //   - game = objet match complet (avec actions, starters, opponentStarters, etc.)
      //   - Affiche dans la console chaque segment de temps credite par joueur
      // ============================================================

      window.debugMinutes = function (game) {
        if (!game) {
          console.error('Usage: debugMinutes(game) — passer un objet match');
          return;
        }

        const QT_DURATION = 600;
        const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
            names[id] = `[OPP] #${s.number || parseInt(id) - 1000} ${s.name || ''}`.trim();
          });
        }
        const pName = (id) => names[id] || `#${id}`;

        const homeStarters = game.starters || {};
        const oppStarters = game.opponentStarters || {};
        const actions = game.actions || [];
        const allSubs = actions.filter((a) => a.type === 'SUB');

        // Detecter les QTs presents
        const qSet = new Set(actions.map((a) => a.q || 1));
        [1, 2, 3, 4].forEach((q) => qSet.add(q));
        const quarters = Array.from(qSet).sort((a, b) => a - b);

        console.log(
          '%c=== DEBUG MINUTES ===',
          'color: #f97316; font-size: 16px; font-weight: bold'
        );
        console.log(
          `Match: ${game.opponent || '?'} | ${actions.length} actions | ${allSubs.length} SUBs`
        );
        console.log('Quarters detectes:', quarters);

        // ---------- DIAGNOSTIC DES DONNEES BRUTES ----------
        console.group('%c1. DONNEES BRUTES', 'color: #60a5fa; font-weight: bold');

        console.log('%cStarters Domicile:', 'color: #3b82f6');
        quarters.forEach((q) => {
          const s = homeStarters[q] || [];
          const label = s.length ? s.map((id) => pName(id)).join(', ') : '⚠️ VIDE';
          console.log(`  Q${q}: [${s.length}] ${label}`);
        });

        console.log('%cStarters Adversaire:', 'color: #ef4444');
        quarters.forEach((q) => {
          const s = oppStarters[q] || [];
          const label = s.length ? s.map((id) => pName(id)).join(', ') : '⚠️ VIDE';
          console.log(`  Q${q}: [${s.length}] ${label}`);
        });

        console.log('%cTous les SUBs (chronologique):', 'color: #a78bfa');
        const sortedSubs = [...allSubs].sort((a, b) => {
          if ((a.q || 1) !== (b.q || 1)) return (a.q || 1) - (b.q || 1);
          return (b.time || 0) - (a.time || 0);
        });
        sortedSubs.forEach((s) => {
          const p = pid(s.pid ?? s.playerId);
          const out = pid(s.subOut);
          const team = isOpp(p) ? '🔴OPP' : '🔵HOME';
          console.log(
            `  Q${s.q || 1} ${fmt(s.time || 0)} | ${team} | IN: ${pName(p)} | OUT: ${pName(out)}`
          );
        });
        console.groupEnd();

        // ---------- SIMULATION PAS A PAS ----------
        const totals = {};

        function simulateTeam(teamLabel, startersData, belongsFn, color) {
          console.group(`%c2. SIMULATION ${teamLabel}`, `color: ${color}; font-weight: bold`);

          quarters.forEach((q) => {
            const starters = (startersData[q] || []).map(pid);
            const onCourt = new Set(starters);

            if (starters.length === 0) {
              console.warn(`  Q${q}: ⚠️ Aucun starter — tout le QT sera non comptabilise`);
              return;
            }

            // Filtrer les SUBs de cette equipe pour ce QT
            const qSubs = actions
              .filter(
                (a) => (a.q || 1) === q && a.type === 'SUB' && belongsFn(pid(a.pid ?? a.playerId))
              )
              .map((a) => ({ ...a, time: a.time || 0 }))
              .sort((a, b) => b.time - a.time);

            console.group(`Q${q} — ${starters.length} starters, ${qSubs.length} SUBs`);
            console.log(`  Starters: ${starters.map(pName).join(', ')}`);

            let lastTime = QT_DURATION;
            let segIdx = 0;

            qSubs.forEach((sub) => {
              const currentTime = sub.time;
              const duration = lastTime - currentTime;
              const pIn = pid(sub.pid ?? sub.playerId);
              const pOut = pid(sub.subOut);

              segIdx++;
              const courtList = Array.from(onCourt).map(pName).join(', ');

              if (duration > 0) {
                console.log(
                  `  Seg${segIdx}: ${fmt(lastTime)} → ${fmt(currentTime)} = %c${fmt(duration)} (${duration}s)%c | Sur terrain: [${courtList}]`,
                  'color: #22c55e; font-weight: bold',
                  'color: inherit'
                );
                onCourt.forEach((p) => {
                  totals[p] = (totals[p] || 0) + duration;
                });
              } else if (duration === 0) {
                console.log(
                  `  Seg${segIdx}: ${fmt(lastTime)} → ${fmt(currentTime)} = 0s (SUB simultane)`
                );
              } else {
                console.warn(
                  `  Seg${segIdx}: ⚠️ DUREE NEGATIVE ${duration}s — lastTime=${fmt(lastTime)} sub.time=${fmt(currentTime)}`
                );
              }

              console.log(`    ↪ IN: ${pName(pIn)} | OUT: ${pName(pOut)}`);

              if (pOut) {
                if (!onCourt.has(pOut)) {
                  console.warn(
                    `    ⚠️ ${pName(pOut)} n'etait PAS sur le terrain au moment du SUB!`
                  );
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
                'color: #22c55e; font-weight: bold',
                'color: inherit'
              );
              onCourt.forEach((p) => {
                totals[p] = (totals[p] || 0) + lastTime;
              });
            }

            // Verification : le total des segments doit = 600s
            const totalSeg = QT_DURATION; // devrait toujours etre 600
            console.log(`  Total Q${q}: ${fmt(QT_DURATION)} attendu`);
            console.groupEnd();
          });

          console.groupEnd();
        }

        simulateTeam('DOMICILE', homeStarters, (p) => !isOpp(p), '#3b82f6');
        simulateTeam('ADVERSAIRE', oppStarters, (p) => isOpp(p), '#ef4444');

        // ---------- RESUME FINAL ----------
        console.group(
          '%c3. RESUME FINAL (secondes → minutes)',
          'color: #f97316; font-weight: bold'
        );

        const homeEntries = [];
        const oppEntries = [];

        Object.entries(totals).forEach(([id, sec]) => {
          const entry = {
            id,
            name: pName(id),
            seconds: sec,
            minutes: Math.round(sec / 60),
            exact: (sec / 60).toFixed(1),
          };
          if (isOpp(parseInt(id))) oppEntries.push(entry);
          else homeEntries.push(entry);
        });

        homeEntries.sort((a, b) => b.seconds - a.seconds);
        oppEntries.sort((a, b) => b.seconds - a.seconds);

        console.log('%cDomicile:', 'color: #3b82f6; font-weight: bold');
        console.table(
          homeEntries.map((e) => ({
            Joueur: e.name,
            Secondes: e.seconds,
            'Min (arrondi)': e.minutes,
            'Min (exact)': e.exact,
          }))
        );

        if (oppEntries.length) {
          console.log('%cAdversaire:', 'color: #ef4444; font-weight: bold');
          console.table(
            oppEntries.map((e) => ({
              Joueur: e.name,
              Secondes: e.seconds,
              'Min (arrondi)': e.minutes,
              'Min (exact)': e.exact,
            }))
          );
        }

        // Verification par QT: chaque joueur starter sans SUB = 600s
        const maxExpected = quarters.length * QT_DURATION;
        const anomalies = Object.entries(totals).filter(
          ([id, sec]) => sec > maxExpected || sec < 0
        );
        if (anomalies.length) {
          console.warn('%c⚠️ ANOMALIES:', 'color: #ef4444; font-weight: bold');
          anomalies.forEach(([id, sec]) => {
            console.warn(
              `  ${pName(id)}: ${sec}s (${(sec / 60).toFixed(1)} min) — max attendu: ${maxExpected}s`
            );
          });
        } else {
          console.log('%c✅ Aucune anomalie detectee', 'color: #22c55e');
        }

        console.groupEnd();

        // Retourner les donnees pour inspection manuelle
        return {
          totals,
          homeEntries,
          oppEntries,
          quarters,
          homeStarters,
          oppStarters,
          subs: sortedSubs,
        };
      };

      // Raccourci pour appeler depuis l'editeur PBP (si le game est dans le state React)
      // Usage alternatif : debugMinutes(monObjetGame)
      console.log('debugMinutes() pret. Usage: debugMinutes(game)');
    }, [game]);

    const quarters = useMemo(() => {
      const qs = new Set(actions.map((a) => a.q || 1));
      return Array.from(qs).sort((a, b) => a - b);
    }, [actions]);
    const quarterOptions = quarters.length ? quarters : [1, 2, 3, 4];

    const playerMap = useMemo(() => {
      const m = {};
      players.forEach((p) => {
        m[p.id] = p;
      });
      oppPlayers.forEach((p) => {
        m[p.id] = p;
      });
      return m;
    }, [players, oppPlayers]);

    const filteredActions = useMemo(() => {
      let arr = [...actions];
      if (filterQ > 0) arr = arr.filter((a) => (a.q || 1) === filterQ);
      if (filterPid !== 'all') {
        const fp = filterPid === 'OPP' ? 'OPP' : parseInt(filterPid);
        arr = arr.filter((a) => {
          const pid = a.pid ?? a.playerId;
          if (filterPid === 'OPP') return isOpponent(pid);
          if (a.type === 'SUB' && a.subOut === fp) return true;
          return pid === fp;
        });
      }
      if (filterType !== 'all') arr = arr.filter((a) => a.type === filterType);
      if (filterPlay !== 'all') arr = arr.filter((a) => a.play === filterPlay);
      arr.sort((a, b) => {
        const qa = a.q || 1,
          qb = b.q || 1;
        if (qa !== qb) return qa - qb;
        return (b.time ?? 0) - (a.time ?? 0);
      });
      return arr;
    }, [actions, filterQ, filterPid, filterType, filterPlay]);

    const stats = useMemo(
      () => recalcFullGame(actions, players, oppPlayers),
      [actions, players, oppPlayers]
    );

    const minutesFromSubs = useMemo(() => {
      const maxQ = Math.max(...(quarters.length ? quarters : [4]));
      return recalcMinutesFromSubs(actions, currentStarters, currentOppStarters, maxQ);
    }, [actions, currentStarters, currentOppStarters, quarters]);

    const playIntervals = useMemo(() => {
      const maxQ = Math.max(...(quarters.length ? quarters : [4]));
      return calculatePlayIntervals(actions, currentStarters, currentOppStarters, maxQ);
    }, [actions, currentStarters, currentOppStarters, quarters]);

    const hasSubs = useMemo(() => actions.some((a) => a.type === 'SUB'), [actions]);

    const scoreByQ = useMemo(() => {
      const scores = {};
      let h = 0, a = 0;
      const sorted = [...actions].sort((x, y) => {
        if ((x.q || 1) !== (y.q || 1)) return (x.q || 1) - (y.q || 1);
        return (y.time ?? 0) - (x.time ?? 0);
      });
      let currentQ = 0;
      sorted.forEach(act => {
        if ((act.q || 1) !== currentQ) {
          currentQ = act.q || 1;
          scores[currentQ] = { home: h, away: a };
        }
        const actPid = act.pid ?? act.playerId;
        const isHome = !isOpponent(actPid);
        if (act.type === 'SHOT' && act.made) { if (isHome) h += act.val; else a += act.val; }
        if (act.type === 'FT') { var fm = act.ftMade || 0; if (isHome) h += fm; else a += fm; }
      });
      return scores;
    }, [actions]);

    const playOptions = useMemo(() => {
      const plays = new Set();
      actions.forEach(a => { if (a.play) plays.add(a.play); });
      return Array.from(plays);
    }, [actions]);

    const showToast = (msg, isError) => {
      setToast({ msg, isError });
      setTimeout(() => setToast(null), 2500);
    };
    const handleDelete = (actionId) => {
      if (!confirm('Supprimer ?')) return;
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      setDirty(true);
    };
    const handlePanelSave = (data) => {
      if (editingAction._new) {
        const pId = data.pid === 'OPP' ? 'OPP' : (data.pid === '' ? null : (typeof data.pid === 'number' ? data.pid : parseInt(data.pid)));
        if (pId == null && data.type !== 'STOPPAGE' && data.type !== 'TIMEOUT') return;
        const time = data.timeMin * 60 + data.timeSec;
        const newAction = {
          id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: data.type,
          pid: (data.type === 'STOPPAGE' || data.type === 'TIMEOUT') ? 0 : pId,
          q: data.q,
          time,
          onCourt: [],
        };
        if (data.type === 'SHOT') {
          newAction.val = data.val; newAction.made = data.made;
          if (data.shotQuality) newAction.shotQuality = data.shotQuality;
          if (data.made && data.astId) {
            newAction.astId = data.astId === 'OPP' ? 'OPP' : parseInt(data.astId);
            if (data.hockeyAssistId) newAction.hockeyAssistId = data.hockeyAssistId === 'OPP' ? 'OPP' : parseInt(data.hockeyAssistId);
          }
          if (data.zoneX !== undefined) { newAction.x = data.zoneX; newAction.y = data.zoneY; }
        }
        if (data.type === 'FT') { newAction.ftMade = data.ftMade; newAction.ftAtt = data.ftAtt; }
        if (data.type === 'FOUL') {
          newAction.foulType = data.foulType;
          if (data.foulType === 'TECHNICAL') {
            if (data.ftShooterId) newAction.ftShooterId = data.ftShooterId === 'OPP' ? 'OPP' : parseInt(data.ftShooterId);
          } else {
            if (data.victim) newAction.victim = data.victim;
          }
        }
        if (data.type === 'TOV') newAction.unforced = data.unforced || false;
        if (data.type === 'STL' && data.victim) newAction.victim = data.victim;
        if (data.type === 'BLK' && data.victim) newAction.victim = data.victim;
        if (data.type === 'SUB') newAction.subOut = data.subOut;
        if (data.type === 'STOPPAGE') { newAction.duration = data.duration || 30; newAction.pid = 0; }
        if (data.type === 'TIMEOUT') { newAction.team = data.team; newAction.pid = 0; }
        if (data.play) newAction.play = data.play;
        setActions(prev => [...prev, newAction]);
        showToast('Action ajoutée');
      } else {
        const actionId = editingAction.id;
        setActions(prev => prev.map(a => {
          if (a.id !== actionId) return a;
          const u = { ...a };
          u.type = data.type;
          u.pid = data.pid === 'OPP' ? 'OPP' : (typeof data.pid === 'number' ? data.pid : parseInt(data.pid));
          u.playerId = u.pid;
          u.q = data.q;
          u.time = data.timeMin * 60 + data.timeSec;
          delete u.val; delete u.made; delete u.x; delete u.y;
          delete u.ftMade; delete u.ftAtt; delete u.foulType; delete u.victim; delete u.subOut;
          delete u.astId; delete u.hockeyAssistId; delete u.ftShooterId;
          if (data.type === 'SHOT') {
            u.val = data.val; u.made = data.made;
            if (data.shotQuality) u.shotQuality = data.shotQuality; else delete u.shotQuality;
            if (data.made && data.astId) {
              u.astId = data.astId === 'OPP' ? 'OPP' : parseInt(data.astId);
              if (data.hockeyAssistId) u.hockeyAssistId = data.hockeyAssistId === 'OPP' ? 'OPP' : parseInt(data.hockeyAssistId);
            }
            if (data.zoneX !== undefined) { u.x = data.zoneX; u.y = data.zoneY; }
            else if (a.x !== undefined) { u.x = a.x; u.y = a.y; }
          }
          if (data.type === 'FT') { u.ftMade = data.ftMade; u.ftAtt = data.ftAtt; }
          if (data.type === 'FOUL') {
            u.foulType = data.foulType;
            if (data.foulType === 'TECHNICAL') {
              if (data.ftShooterId) u.ftShooterId = data.ftShooterId === 'OPP' ? 'OPP' : parseInt(data.ftShooterId);
            } else {
              if (data.victim) u.victim = data.victim;
            }
          }
          if (data.type === 'TOV') u.unforced = data.unforced || false;
          if (data.type === 'STL' && data.victim) u.victim = data.victim;
          if (data.type === 'BLK' && data.victim) u.victim = data.victim;
          if (data.type === 'SUB') u.subOut = data.subOut;
          if (data.type === 'STOPPAGE') { u.duration = data.duration || 0; u.pid = 0; }
          if (data.type === 'TIMEOUT') { u.team = data.team || 'home'; u.pid = 0; }
          if (data.play) u.play = data.play; else delete u.play;
          return u;
        }));
      }
      setEditingAction(null);
      setDirty(true);
    };

    const handlePanelDelete = (actionId) => {
      setActions(prev => prev.filter(a => a.id !== actionId));
      setEditingAction(null);
      setDirty(true);
    };

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
        const cleanActions = actions.map((a) => {
          const c = { ...a };
          delete c._idx;
          return denormalizeAction(c);
        });

        const maxQ = Math.max(...(quarters.length ? quarters : [4]));
        const subMinutes = recalcMinutesFromSubs(
          actions,
          currentStarters,
          currentOppStarters,
          maxQ
        );

        const existingMinutes = {};
        if (game?.playerStats)
          Object.entries(game.playerStats).forEach(([pid, s]) => {
            existingMinutes[pid] = s.minutes || 0;
          });
        if (game?.opponentPlayerStats)
          Object.entries(game.opponentPlayerStats).forEach(([pid, s]) => {
            existingMinutes[pid] = s.minutes || 0;
          });

        const mergedHomeStats = {};
        const mergedOppPlayerStats = {};
        Object.entries(finalStats.playerStats).forEach(([pid, s]) => {
          const numPid = parseInt(pid);
          const mins = subMinutes[pid] !== undefined ? subMinutes[pid] : existingMinutes[pid] || 0;
          const merged = { ...s, minutes: mins };

          if (isOpponent(numPid)) {
            const orig = game.opponentPlayerStats?.[pid] || {};
            mergedOppPlayerStats[pid] = {
              ...merged,
              number: orig.number || numPid - 1000,
              name: orig.name || `Adv #${orig.number || numPid - 1000}`,
            };
          } else {
            mergedHomeStats[pid] = merged;
          }
        });
        const [y, m, d] = editDate ? editDate.split('-') : [null, null, null];
        const formattedDate = y ? `${d}/${m}/${y}` : game.date;

        const updatedGame = {
          ...game,
          date: formattedDate,
          actions: cleanActions,
          starters: currentStarters,
          opponentStarters: currentOppStarters,
          playerStats: mergedHomeStats,
          opponentStats: finalStats.opponentStats,
          opponentPlayerStats: mergedOppPlayerStats,
          homeScore: finalStats.homeScore,
          awayScore: finalStats.awayScore,
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

    // ---- RENDER ----
    return (
      <div
        className="flex flex-col"
        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#0a0f1a' }}
      >
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100001,
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold ${toast.isError ? 'bg-red-600' : 'bg-green-600'} text-white`}
          >
            {toast.msg}
          </div>
        )}
        {showAudit && (
          <MinutesAuditModal
            intervals={playIntervals}
            players={players}
            oppPlayers={oppPlayers}
            onClose={() => setShowAudit(false)}
          />
        )}
        {showStarters && (
          <StartersEditorModal
            homeStarters={currentStarters}
            oppStarters={currentOppStarters}
            players={players}
            oppPlayers={oppPlayers}
            quarterOptions={quarterOptions}
            onSave={handleUpdateStarters}
            onClose={() => setShowStarters(false)}
          />
        )}

        {/* HEADER */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: '#111827', borderBottom: '2px solid #f97316' }}
        >
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-bold cursor-pointer"
              onClick={() => {
                if (dirty && !confirm('Modifications non sauvegardees. Quitter ?')) return;
                onClose();
              }}
            >
              X Fermer
            </button>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-slate-400 text-xs font-bold uppercase">PBP</span>
              <input
                type="date"
                value={editDate}
                onChange={(e) => {
                  setEditDate(e.target.value);
                  setDirty(true);
                }}
                className="bg-slate-800 border border-slate-600 text-white text-xs rounded px-2 py-1 font-mono cursor-pointer"
              />
              <span className="text-slate-400 text-sm font-bold">{`vs ${game?.opponent || 'Match'}`}</span>
            </div>
            {dirty && (
              <span className="text-orange-400 text-[10px] font-bold bg-orange-900 px-2 py-0.5 rounded-full animate-pulse">
                Modifie
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              onClick={() => exportMatchLogsCSV(actions, players, oppPlayers)}
            >
              CSV
            </button>
            <button
              className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              onClick={() => setShowStarters(true)}
            >
              Starters
            </button>
            <button
              className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              onClick={() => setShowAudit(true)}
            >
              Verif.
            </button>
            <button
              className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold cursor-pointer disabled:opacity-40 flex items-center gap-2"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? '...' : 'Sauver'}
            </button>
          </div>
        </div>

        {/* SCORE BANDEAU */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-1.5 flex items-center justify-between text-xs shrink-0">
          <span className="text-blue-400 font-bold">NOUS {stats.homeScore}</span>
          <span className="text-slate-500">—</span>
          <span className="text-red-400 font-bold">{stats.awayScore} ADV</span>
          <span className="text-slate-600 font-mono text-[10px]">{filteredActions.length} actions</span>
        </div>

        {/* FILTER BAR */}
        <FilterBar
          quarters={quarterOptions}
          players={players}
          filterQ={filterQ}
          filterPid={filterPid}
          filterType={filterType}
          filterPlay={filterPlay}
          playOptions={playOptions}
          onFilterQ={setFilterQ}
          onFilterPid={setFilterPid}
          onFilterType={setFilterType}
          onFilterPlay={setFilterPlay}
          onReset={() => { setFilterQ(0); setFilterPid('all'); setFilterType('all'); setFilterPlay('all'); }}
          onAdd={() => setEditingAction({ _new: true, type: 'SHOT', pid: '', q: quarterOptions[0] || 1, time: 600 })}
        />

        <MiniBoxscore
          stats={stats}
          players={players}
          oppPlayers={oppPlayers}
          playerMap={playerMap}
          minutesFromSubs={minutesFromSubs}
          hasSubs={hasSubs}
        />

        {/* ACTIONS LIST */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {filteredActions.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-sm">Aucune action</div>
          ) : (() => {
            const items = [];
            let lastQ = null;
            filteredActions.forEach(act => {
              const q = act.q || 1;
              if (q !== lastQ) {
                if (filterQ === 0) {
                  const qScore = scoreByQ[q] || { home: 0, away: 0 };
                  items.push({ _sep: true, quarter: q, homeScore: qScore.home, awayScore: qScore.away });
                }
                lastQ = q;
              }
              items.push(act);
            });
            return items.map(item => {
              if (item._sep) {
                return (
                  <QuarterSeparator
                    key={'sep_' + item.quarter}
                    quarter={item.quarter}
                    homeScore={item.homeScore}
                    awayScore={item.awayScore}
                  />
                );
              }
              return (
                <ActionCard
                  key={item.id}
                  action={item}
                  playerMap={playerMap}
                  onEdit={act => setEditingAction(act)}
                  onDelete={handleDelete}
                />
              );
            });
          })()}
        </div>

        {/* EDIT PANEL */}
        {editingAction && (
          <EditPanel
            action={editingAction}
            players={players}
            oppPlayers={oppPlayers}
            quarters={quarterOptions}
            onSave={handlePanelSave}
            onDelete={handlePanelDelete}
            onCancel={() => setEditingAction(null)}
          />
        )}
      </div>
    );
  }

  // ========================================================
  // MINI BOXSCORE
  // ========================================================
  function MiniBoxscore({ stats, players, oppPlayers, playerMap, minutesFromSubs, hasSubs }) {
    const [open, setOpen] = useState(false);
    const foulBadge = (fd) => {
      if (!fd) return '';
      return Object.entries(fd)
        .filter(([k, v]) => v > 0)
        .map(([k, v]) => `${v}${k[0]}`)
        .join(' ');
    };

    const allPStats = Object.values(stats.playerStats);
    const hasHockeyAst = allPStats.some((s) => (s.hockeyAst || 0) > 0);
    const hasPaintTouch = allPStats.some((s) => (s.paintTouch || 0) > 0);
    const hasDeflections = allPStats.some((s) => (s.deflections || 0) > 0);
    const hasBoxOuts = allPStats.some((s) => (s.boxOuts || 0) > 0);
    const hasBlowBys = allPStats.some((s) => (s.blowBys || 0) > 0);

    const headers = [
      '',
      'MIN',
      'PTS',
      'REB',
      'AST',
      'STL',
      'BLK',
      'BA',
      'TOV',
      'PF',
      'Detail',
      'FD',
      'FG',
      '3PT',
      'FT',
      '+/-',
      'EVAL',
      ...(hasHockeyAst ? ['HA'] : []),
      ...(hasPaintTouch ? ['PT'] : []),
      ...(hasDeflections ? ['DEV'] : []),
      ...(hasBoxOuts ? ['BOX'] : []),
      ...(hasBlowBys ? ['BB'] : []),
    ];

    const renderRow = (p, s, isOppRow) => {
      if (!s) return null;
      const ev = calcEval(s);
      const mins =
        hasSubs && minutesFromSubs[p.id] !== undefined ? minutesFromSubs[p.id] : s.minutes || 0;
      return (
        <tr
          key={p.id}
          className={`border-b border-slate-800/50 ${isOppRow ? 'text-red-300' : 'text-slate-300'}`}
        >
          <td className="py-1 px-1 font-bold text-white whitespace-nowrap">{`#${p.number} ${p.name}`}</td>
          <td className="text-center text-cyan-400 font-mono">{mins}</td>
          <td className="text-center text-orange-400 font-bold">{s.pts}</td>
          <td className="text-center">
            {s.reb}
            <span className="text-[8px] text-slate-500 ml-0.5">{`(${s.oreb}/${s.dreb})`}</span>
          </td>
          <td className="text-center">{s.ast}</td>
          <td className="text-center">{s.stl}</td>
          <td className="text-center">{s.blk}</td>
          <td className="text-center text-orange-300">{s.blkAgainst || 0}</td>
          <td className="text-center text-red-400">{s.tov}</td>
          <td className="text-center text-red-400 font-bold">{s.pf}</td>
          <td className="text-center text-[9px] text-slate-400 font-mono">
            {foulBadge(s.foulDetails)}
          </td>
          <td className="text-center text-cyan-400">{s.foulDrawn || 0}</td>
          <td className="text-center">{`${s.fgm}-${s.fga}`}</td>
          <td className="text-center">{`${s.threePM}-${s.threePA}`}</td>
          <td className="text-center">{`${s.ftm}-${s.fta}`}</td>
          <td
            className={`text-center font-bold ${s.plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >{`${s.plusMinus > 0 ? '+' : ''}${s.plusMinus}`}</td>
          <td className={`text-center font-bold ${ev >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {ev}
          </td>
          {hasHockeyAst && <td className="text-center text-purple-400">{s.hockeyAst || 0}</td>}
          {hasPaintTouch && <td className="text-center text-yellow-400">{s.paintTouch || 0}</td>}
          {hasDeflections && <td className="text-center text-blue-400">{s.deflections || 0}</td>}
          {hasBoxOuts && <td className="text-center text-teal-400">{s.boxOuts || 0}</td>}
          {hasBlowBys && <td className="text-center text-red-400">{s.blowBys || 0}</td>}
        </tr>
      );
    };

    const homeRows = players
      .filter((p) => stats.playerStats[p.id])
      .map((p) => renderRow(p, stats.playerStats[p.id], false))
      .filter(Boolean);
    const oppRows = oppPlayers
      .filter((p) => stats.playerStats[p.id])
      .map((p) => renderRow(p, stats.playerStats[p.id], true))
      .filter(Boolean);

    return (
      <div className="border-b border-slate-800 shrink-0">
        <button
          className="w-full px-4 py-1.5 text-left text-[10px] text-slate-400 font-bold uppercase hover:bg-slate-800 cursor-pointer flex items-center gap-2"
          onClick={() => setOpen(!open)}
        >
          {open ? 'v' : '>'} Boxscore recalcule{' '}
          {hasSubs && <span className="text-cyan-500 ml-2">(minutes recalculees depuis SUB)</span>}
        </button>
        {open && (
          <div className="overflow-x-auto px-2 pb-2">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  {headers.map((h) => (
                    <th key={h} className="py-1 px-1 text-center font-bold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {homeRows}
                {oppRows.length > 0 && (
                  <tr key="sep">
                    <td
                      colSpan={headers.length}
                      className="py-1 text-center text-[9px] text-red-500 font-bold uppercase bg-red-950/30"
                    >
                      Adversaire
                    </td>
                  </tr>
                )}
                {oppRows}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // PORTAL & EXPORT
  // ========================================================
  function PlayByPlayEditorPortal(props) {
    const containerRef = useRef(null);
    if (!containerRef.current) {
      containerRef.current = document.createElement('div');
      containerRef.current.id = 'pbp-editor-root';
    }
    useEffect(() => {
      document.body.appendChild(containerRef.current);
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.removeChild(containerRef.current);
        document.body.style.overflow = '';
      };
    }, []);
    return ReactDOM.createPortal(<PlayByPlayEditor {...props} />, containerRef.current);
  }
  window.PlayByPlayEditor = PlayByPlayEditorPortal;
  window.recalcFullGame = recalcFullGame;
})();
