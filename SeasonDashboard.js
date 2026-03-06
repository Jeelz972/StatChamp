// SeasonDashboard.js — Composant React (JSX, nécessite Babel)
// Dépendances : React, Recharts (globales), window.parseDate
(function () {
  'use strict';
  const { useState, useMemo } = React;
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } =
    window.Recharts;

  function SeasonDashboard({ games, players, phases, seasons }) {
    const [activeMetric, setActiveMetric] = useState('pts');
    const [filterPhase, setFilterPhase] = useState('ALL');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [compareSeasonId, setCompareSeasonId] = useState('');
    const [comparePhase, setComparePhase] = useState('ALL');
    // --- Comparatif Saisons ---
    const seasonComparison = useMemo(() => {
      if (!compareSeasonId || !seasons) return null;
      const archived = seasons.find((s) => s.id === compareSeasonId);
      if (!archived) return null;

      const isFinal = (g) => !g.status || g.status === 'final';

      const filterByPhase = (gamesList, phaseId) => {
        if (phaseId === 'ALL') return gamesList.filter(isFinal);
        return gamesList.filter((g) => g.phase === phaseId && isFinal(g));
      };

      const currentGames = filterByPhase(games, comparePhase);
      const archivedGames = filterByPhase(archived.games || [], comparePhase);

      const calcTeamStats = (gamesList) => {
        const fg = gamesList;
        if (fg.length === 0) return null;
        let pts = 0,
          conc = 0,
          fgm = 0,
          fga = 0,
          tpm = 0,
          tpa = 0,
          ftm = 0,
          fta = 0,
          reb = 0,
          oreb = 0,
          ast = 0,
          tov = 0,
          stl = 0,
          blk = 0,
          wins = 0;
        fg.forEach((g) => {
          conc += g.awayScore || 0;
          if ((g.homeScore || 0) > (g.awayScore || 0)) wins++;
          Object.values(g.playerStats || {}).forEach((s) => {
            pts += s.pts || 0;
            fgm += (s.fgm || 0) + (s.threePM || 0);
            fga += (s.fga || 0) + (s.threePA || 0);
            tpm += s.threePM || 0;
            tpa += s.threePA || 0;
            ftm += s.ftm || 0;
            fta += s.fta || 0;
            reb += (s.oreb || 0) + (s.dreb || 0);
            oreb += s.oreb || 0;
            ast += s.ast || 0;
            tov += s.tov || 0;
            stl += s.stl || 0;
            blk += s.blk || 0;
          });
        });
        const n = fg.length;
        const eFG = fga > 0 ? ((fgm + 0.5 * tpm) / fga) * 100 : 0;
        return {
          gp: n,
          wins,
          losses: n - wins,
          ppg: (pts / n).toFixed(1),
          cpg: (conc / n).toFixed(1),
          fgPct: fga > 0 ? ((fgm / fga) * 100).toFixed(1) : '0.0',
          tpPct: tpa > 0 ? ((tpm / tpa) * 100).toFixed(1) : '0.0',
          ftPct: fta > 0 ? ((ftm / fta) * 100).toFixed(1) : '0.0',
          rpg: (reb / n).toFixed(1),
          orebPg: (oreb / n).toFixed(1),
          apg: (ast / n).toFixed(1),
          tovPg: (tov / n).toFixed(1),
          spg: (stl / n).toFixed(1),
          bpg: (blk / n).toFixed(1),
          eFG: eFG.toFixed(1),
        };
      };

      const calcPlayerStats = (gamesList, roster) => {
        const map = {};
        gamesList.forEach((g) => {
          Object.entries(g.playerStats || {}).forEach(([pid, s]) => {
            if ((s.minutes || 0) <= 0) return;
            if (!map[pid])
              map[pid] = {
                gp: 0,
                pts: 0,
                reb: 0,
                ast: 0,
                stl: 0,
                blk: 0,
                tov: 0,
                min: 0,
                fgm: 0,
                fga: 0,
                tpm: 0,
                tpa: 0,
                ftm: 0,
                fta: 0,
                eff: 0,
                pf: 0,
              };
            const m = map[pid];
            m.gp++;
            m.pts += s.pts || 0;
            m.reb += (s.oreb || 0) + (s.dreb || 0);
            m.ast += s.ast || 0;
            m.stl += s.stl || 0;
            m.blk += s.blk || 0;
            m.tov += s.tov || 0;
            m.min += s.minutes || 0;
            m.fgm += (s.fgm || 0) + (s.threePM || 0);
            m.fga += (s.fga || 0) + (s.threePA || 0);
            m.tpm += s.threePM || 0;
            m.tpa += s.threePA || 0;
            m.ftm += s.ftm || 0;
            m.fta += s.fta || 0;
            m.pf += s.pf || 0;
            const playerFGA = (s.fga || 0) + (s.threePA || 0),
              playerFGM = (s.fgm || 0) + (s.threePM || 0);
            m.eff +=
              s.pts +
              (s.oreb || 0) +
              (s.dreb || 0) +
              s.ast +
              s.stl +
              s.blk -
              (playerFGA - playerFGM + ((s.fta || 0) - (s.ftm || 0)) + s.tov);
          });
        });
        const result = {};
        Object.entries(map).forEach(([pid, m]) => {
          const n = m.gp || 1;
          const p = roster ? roster.find((r) => String(r.id) === String(pid)) : null;
          result[pid] = {
            name: p ? p.name : '#' + pid,
            number: p ? p.number : '?',
            pos: p ? p.pos : '',
            gp: m.gp,
            ppg: (m.pts / n).toFixed(1),
            rpg: (m.reb / n).toFixed(1),
            apg: (m.ast / n).toFixed(1),
            spg: (m.stl / n).toFixed(1),
            bpg: (m.blk / n).toFixed(1),
            tovPg: (m.tov / n).toFixed(1),
            mpg: (m.min / n).toFixed(1),
            effPg: (m.eff / n).toFixed(1),
            fgPct: m.fga > 0 ? ((m.fgm / m.fga) * 100).toFixed(1) : '0.0',
            tpPct: m.tpa > 0 ? ((m.tpm / m.tpa) * 100).toFixed(1) : '0.0',
            ftPct: m.fta > 0 ? ((m.ftm / m.fta) * 100).toFixed(1) : '0.0',
          };
        });
        return result;
      };

      const currentTeam = calcTeamStats(currentGames);
      const archivedTeam = calcTeamStats(archivedGames);
      const currentPlayers = calcPlayerStats(currentGames, players);
      const archivedPlayers = calcPlayerStats(archivedGames, archived.roster || []);

      const currentRosterIds = new Set(players.map((p) => String(p.id)));
      const archivedRosterIds = new Set((archived.roster || []).map((p) => String(p.id)));
      const commonIds = [...currentRosterIds].filter(
        (id) => archivedRosterIds.has(id) && currentPlayers[id] && archivedPlayers[id]
      );

      const playerDiffs = commonIds
        .map((id) => {
          const c = currentPlayers[id];
          const a = archivedPlayers[id];
          return { id, name: c.name, number: c.number, pos: c.pos, current: c, archived: a };
        })
        .sort((a, b) => parseFloat(b.current.ppg) - parseFloat(a.current.ppg));

      // Collecter toutes les phases (courantes + archivees) pour le selecteur
      const allPhases = [];
      const seenPhaseIds = new Set();
      (phases || []).forEach((p) => {
        if (!seenPhaseIds.has(p.id)) {
          allPhases.push(p);
          seenPhaseIds.add(p.id);
        }
      });
      (archived.phases || []).forEach((p) => {
        if (!seenPhaseIds.has(p.id)) {
          allPhases.push({ ...p, name: p.name + ' (arch.)' });
          seenPhaseIds.add(p.id);
        }
      });

      return { currentTeam, archivedTeam, archivedName: archived.name, playerDiffs, allPhases };
    }, [compareSeasonId, comparePhase, seasons, games, players, phases]);

    const filteredGames = useMemo(() => {
      const isFinal = (g) => !g.status || g.status === 'final';
      const base =
        filterPhase === 'ALL'
          ? games.filter(isFinal)
          : games.filter((g) => g.phase === filterPhase && isFinal(g));
      return [...base].sort((a, b) => window.parseDate(a.date) - window.parseDate(b.date));
    }, [games, filterPhase]);

    // ---- SECTION 1 : Tendances equipe (moyenne mobile) ----
    const trendBase = useMemo(() => {
      if (filteredGames.length === 0) return [];
      // Pre-calcul des valeurs brutes par match (une seule fois)
      const base = filteredGames.map((g, i) => {
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
        return {
          label: g.opponent ? `vs ${g.opponent}` : `M${i + 1}`,
          date: g.date,
          pts,
          conceded,
          eFG: parseFloat(eFG.toFixed(1)),
          tovPct: parseFloat(tovPct.toFixed(1)),
        };
      });
      // Pre-calcul des moyennes mobiles pour TOUTES les metriques
      const keys = ['pts', 'conceded', 'eFG', 'tovPct'];
      keys.forEach((key) => {
        for (let i = 0; i < base.length; i++) {
          const ma = (w) => {
            const start = Math.max(0, i - w + 1);
            let sum = 0;
            for (let j = start; j <= i; j++) sum += base[j][key];
            return parseFloat((sum / (i - start + 1)).toFixed(1));
          };
          base[i][key + '_ma3'] = ma(3);
          base[i][key + '_ma5'] = ma(5);
        }
      });
      return base;
    }, [filteredGames]);

    const trendData = useMemo(() => {
      return trendBase.map((d) => ({
        label: d.label,
        date: d.date,
        [activeMetric]: d[activeMetric],
        ma3: d[activeMetric + '_ma3'],
        ma5: d[activeMetric + '_ma5'],
      }));
    }, [trendBase, activeMetric]);

    // ---- SECTION 2 : Progressions joueurs ----
    const progressions = useMemo(() => {
      if (filteredGames.length < 2) return { top: [], bottom: [] };
      const n = Math.min(5, Math.floor(filteredGames.length / 2));
      const first = filteredGames.slice(0, n);
      const last = filteredGames.slice(-n);

      const didPlay = (ps) => {
        if (!ps) return false;
        if ((ps.min || 0) > 0) return true;
        return (
          (ps.pts || 0) +
            (ps.fga || 0) +
            (ps.threePA || 0) +
            (ps.fta || 0) +
            (ps.oreb || 0) +
            (ps.dreb || 0) +
            (ps.ast || 0) +
            (ps.stl || 0) +
            (ps.blk || 0) +
            (ps.tov || 0) +
            (ps.pf || 0) >
          0
        );
      };

      const calcAvg = (subset, pid, stat) => {
        let sum = 0,
          count = 0;
        subset.forEach((g) => {
          const ps = (g.playerStats || {})[pid];
          if (ps && didPlay(ps)) {
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
        {seasons && seasons.length > 0 && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'compare' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Comparatif Saisons
            </button>
          </div>
        )}

        {activeTab === 'compare' && seasons && seasons.length > 0 && (
          <React.Fragment>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <window.Icon path={window.Icons.TrendingUp} className="text-amber-400" /> Comparatif
                Saisons
              </h2>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={compareSeasonId}
                  onChange={(e) => {
                    setCompareSeasonId(e.target.value);
                    setComparePhase('ALL');
                  }}
                  className="bg-slate-800 text-white border border-slate-700 rounded p-2 text-sm"
                >
                  <option value="">-- Choisir une saison archivée --</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({(s.games || []).length} matchs)
                    </option>
                  ))}
                </select>
                {seasonComparison &&
                  seasonComparison.allPhases &&
                  seasonComparison.allPhases.length > 0 && (
                    <select
                      value={comparePhase}
                      onChange={(e) => setComparePhase(e.target.value)}
                      className="bg-slate-800 text-white border border-slate-700 rounded p-2 text-sm"
                    >
                      <option value="ALL">Toutes les phases</option>
                      {seasonComparison.allPhases.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
              </div>
            </div>
            {!compareSeasonId && (
              <div className="text-center text-slate-500 py-12">
                Sélectionnez une saison archivée pour comparer.
              </div>
            )}
            {seasonComparison && seasonComparison.currentTeam && seasonComparison.archivedTeam && (
              <React.Fragment>
                <window.Card className="p-4">
                  <h3 className="text-sm font-bold text-amber-400 uppercase mb-3">
                    Comparatif Équipe{' '}
                    {comparePhase !== 'ALL' && seasonComparison.allPhases
                      ? '— ' +
                        (seasonComparison.allPhases.find((p) => p.id === comparePhase) || {}).name
                      : ''}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase">
                          <th className="p-2 text-left">Stat</th>
                          <th className="p-2 text-center">{seasonComparison.archivedName}</th>
                          <th className="p-2 text-center">Saison actuelle</th>
                          <th className="p-2 text-center">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {[
                          { label: 'Matchs', k: 'gp', fmt: (v) => v, noD: true },
                          { label: 'Victoires', k: 'wins', fmt: (v) => v },
                          { label: 'Défaites', k: 'losses', fmt: (v) => v, inv: true },
                          { label: 'PTS/m', k: 'ppg', fmt: (v) => v },
                          { label: 'Encaissés/m', k: 'cpg', fmt: (v) => v, inv: true },
                          { label: 'FG%', k: 'fgPct', fmt: (v) => v + '%' },
                          { label: '3P%', k: 'tpPct', fmt: (v) => v + '%' },
                          { label: 'LF%', k: 'ftPct', fmt: (v) => v + '%' },
                          { label: 'eFG%', k: 'eFG', fmt: (v) => v + '%' },
                          { label: 'REB/m', k: 'rpg', fmt: (v) => v },
                          { label: 'PD/m', k: 'apg', fmt: (v) => v },
                          { label: 'BP/m', k: 'tovPg', fmt: (v) => v, inv: true },
                          { label: 'INT/m', k: 'spg', fmt: (v) => v },
                          { label: 'CTR/m', k: 'bpg', fmt: (v) => v },
                        ].map((row) => {
                          const a = parseFloat(seasonComparison.archivedTeam[row.k]);
                          const c = parseFloat(seasonComparison.currentTeam[row.k]);
                          const d = c - a;
                          const positive = row.inv ? d < 0 : d > 0;
                          return (
                            <tr key={row.k} className="hover:bg-slate-800/50">
                              <td className="p-2 text-slate-300 font-bold">{row.label}</td>
                              <td className="p-2 text-center text-slate-400">
                                {row.fmt
                                  ? row.fmt(seasonComparison.archivedTeam[row.k])
                                  : seasonComparison.archivedTeam[row.k]}
                              </td>
                              <td className="p-2 text-center text-white font-bold">
                                {row.fmt
                                  ? row.fmt(seasonComparison.currentTeam[row.k])
                                  : seasonComparison.currentTeam[row.k]}
                              </td>
                              <td
                                className={`p-2 text-center font-bold ${row.noD ? 'text-slate-600' : positive ? 'text-green-400' : d === 0 ? 'text-slate-500' : 'text-red-400'}`}
                              >
                                {row.noD ? '-' : (d > 0 ? '+' : '') + d.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </window.Card>

                {seasonComparison.playerDiffs.length > 0 && (
                  <window.Card className="p-4">
                    <h3 className="text-sm font-bold text-amber-400 uppercase mb-3">
                      Comparatif Joueurs ({seasonComparison.playerDiffs.length} en commun)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-700 text-[10px] text-slate-500 uppercase">
                            <th className="p-2 text-left">Joueur</th>
                            <th className="p-2 text-center" colSpan="2">
                              PTS
                            </th>
                            <th className="p-2 text-center" colSpan="2">
                              REB
                            </th>
                            <th className="p-2 text-center" colSpan="2">
                              PD
                            </th>
                            <th className="p-2 text-center" colSpan="2">
                              FG%
                            </th>
                            <th className="p-2 text-center" colSpan="2">
                              3P%
                            </th>
                            <th className="p-2 text-center" colSpan="2">
                              EVAL
                            </th>
                            <th className="p-2 text-center" colSpan="2">
                              MIN
                            </th>
                          </tr>
                          <tr className="border-b border-slate-800 text-[9px] text-slate-600">
                            <th></th>
                            <th className="p-1 text-center">Anc.</th>
                            <th className="p-1 text-center">Act.</th>
                            <th className="p-1 text-center">Anc.</th>
                            <th className="p-1 text-center">Act.</th>
                            <th className="p-1 text-center">Anc.</th>
                            <th className="p-1 text-center">Act.</th>
                            <th className="p-1 text-center">Anc.</th>
                            <th className="p-1 text-center">Act.</th>
                            <th className="p-1 text-center">Anc.</th>
                            <th className="p-1 text-center">Act.</th>
                            <th className="p-1 text-center">Anc.</th>
                            <th className="p-1 text-center">Act.</th>
                            <th className="p-1 text-center">Anc.</th>
                            <th className="p-1 text-center">Act.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {seasonComparison.playerDiffs.map((pd) => {
                            const renderCell = (aVal, cVal, inv) => {
                              const a = parseFloat(aVal),
                                c = parseFloat(cVal);
                              const d = c - a;
                              const pos = inv ? d < 0 : d > 0;
                              return (
                                <React.Fragment>
                                  <td className="p-1 text-center text-slate-500">{aVal}</td>
                                  <td
                                    className={`p-1 text-center font-bold ${d === 0 ? 'text-white' : pos ? 'text-green-400' : 'text-red-400'}`}
                                  >
                                    {cVal}
                                    {d !== 0 && (
                                      <span className="text-[8px] ml-0.5">
                                        ({d > 0 ? '+' : ''}
                                        {d.toFixed(1)})
                                      </span>
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            };
                            return (
                              <tr key={pd.id} className="hover:bg-slate-800/50">
                                <td className="p-2 text-white font-bold whitespace-nowrap">
                                  <span className="text-slate-500 font-mono mr-1">
                                    #{pd.number}
                                  </span>
                                  {pd.name}
                                  <span className="text-[9px] text-slate-600 ml-1">
                                    ({pd.current.gp}m)
                                  </span>
                                </td>
                                {renderCell(pd.archived.ppg, pd.current.ppg)}
                                {renderCell(pd.archived.rpg, pd.current.rpg)}
                                {renderCell(pd.archived.apg, pd.current.apg)}
                                {renderCell(pd.archived.fgPct, pd.current.fgPct)}
                                {renderCell(pd.archived.tpPct, pd.current.tpPct)}
                                {renderCell(pd.archived.effPg, pd.current.effPg)}
                                {renderCell(pd.archived.mpg, pd.current.mpg)}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </window.Card>
                )}
                {seasonComparison.playerDiffs.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    Aucun joueur en commun entre l'effectif actuel et la saison{' '}
                    {seasonComparison.archivedName}.
                  </div>
                )}
              </React.Fragment>
            )}
          </React.Fragment>
        )}

        {activeTab === 'dashboard' && (
          <React.Fragment>
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
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="ma3"
                        name="MM 3 matchs"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 3"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="ma5"
                        name="MM 5 matchs"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="2 2"
                        isAnimationActive={false}
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
                      <h4 className="text-xs text-red-400 font-bold uppercase mb-2">
                        Top Régressions
                      </h4>
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
                <h3 className="text-sm font-bold text-orange-400 uppercase mb-3">
                  Comparatif par Phase
                </h3>
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
          </React.Fragment>
        )}
      </div>
    );
  }
  window.SeasonDashboard = SeasonDashboard;
})();
