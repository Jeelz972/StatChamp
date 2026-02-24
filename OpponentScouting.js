// OpponentScouting.js — Composant React (JSX, nécessite Babel)
// Dépendances : React, window.parseDate, window.Icon, window.Icons, window.Card, window.Button
(function () {
  "use strict";
  const { useState, useMemo } = React;
function OpponentScouting({ games, onPrepare }) {
  const [selectedOpponent, setSelectedOpponent] = useState(null);

  const finalGames = useMemo(() => {
    return games.filter((g) => (!g.status || g.status === 'final') && g.opponent);
  }, [games]);

  // ---- LISTE ADVERSAIRES UNIQUES ----
  const opponents = useMemo(() => {
    const map = {};
    finalGames.forEach((g) => {
      const name = (g.opponent || '').trim();
      if (!name) return;
      if (!map[name]) map[name] = { name, games: [] };
      map[name].games.push(g);
    });
    return Object.values(map)
      .map((o) => {
        const wins = o.games.filter((g) => (g.homeScore || 0) > (g.awayScore || 0)).length;
        const losses = o.games.length - wins;
        let ptsFor = 0,
          ptsAgainst = 0;
        o.games.forEach((g) => {
          ptsFor += g.homeScore || 0;
          ptsAgainst += g.awayScore || 0;
        });
        return {
          ...o,
          wins,
          losses,
          avgPtsFor: (ptsFor / o.games.length).toFixed(1),
          avgPtsAgainst: (ptsAgainst / o.games.length).toFixed(1),
          diff: ((ptsFor - ptsAgainst) / o.games.length).toFixed(1),
        };
      })
      .sort((a, b) => b.games.length - a.games.length);
  }, [finalGames]);

  // ---- VUE DETAILLEE ----
  const detail = useMemo(() => {
    if (!selectedOpponent) return null;
    const opp = opponents.find((o) => o.name === selectedOpponent);
    if (!opp) return null;

    const sorted = [...opp.games].sort(
      (a, b) => window.parseDate(b.date) - window.parseDate(a.date)
    );

    // Stats agregees equipe contre cet adversaire
    let fgm = 0,
      fga = 0,
      threePM = 0,
      threePA = 0,
      reb = 0,
      ast = 0,
      tov = 0,
      stl = 0,
      blk = 0;
    opp.games.forEach((g) => {
      Object.values(g.playerStats || {}).forEach((s) => {
        fgm += (s.fgm || 0) + (s.threePM || 0);
        fga += (s.fga || 0) + (s.threePA || 0);
        threePM += s.threePM || 0;
        threePA += s.threePA || 0;
        reb += (s.oreb || 0) + (s.dreb || 0);
        ast += s.ast || 0;
        tov += s.tov || 0;
        stl += s.stl || 0;
        blk += s.blk || 0;
      });
    });
    const n = opp.games.length;

    // Joueurs adverses les plus productifs (si opponentPlayerStats disponible)
    const oppPlayerMap = {};
    opp.games.forEach((g) => {
      const ops = g.opponentPlayerStats || {};
      Object.entries(ops).forEach(([pid, s]) => {
        const key = s.name || `#${s.number || pid}`;
        if (!oppPlayerMap[key])
          oppPlayerMap[key] = { name: key, number: s.number || pid, pts: 0, gp: 0 };
        oppPlayerMap[key].pts += s.pts || 0;
        oppPlayerMap[key].gp++;
      });
    });
    const oppTopPlayers = Object.values(oppPlayerMap)
      .filter((p) => p.gp > 0)
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 5)
      .map((p) => ({ ...p, avgPts: (p.pts / p.gp).toFixed(1) }));

    return {
      ...opp,
      sorted,
      aggr: {
        fgPct: fga > 0 ? ((fgm / fga) * 100).toFixed(1) : '0',
        threePct: threePA > 0 ? ((threePM / threePA) * 100).toFixed(1) : '0',
        avgReb: (reb / n).toFixed(1),
        avgAst: (ast / n).toFixed(1),
        avgTov: (tov / n).toFixed(1),
        avgStl: (stl / n).toFixed(1),
        avgBlk: (blk / n).toFixed(1),
      },
      oppTopPlayers,
    };
  }, [selectedOpponent, opponents]);

  // ---- RENDU LISTE ----
  if (!selectedOpponent) {
    return (
      <div className="space-y-4 pb-20 md:pb-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <window.Icon path={window.Icons.Target} className="text-orange-400" /> Scouting
          Adversaires
        </h2>
        {opponents.length === 0 && (
          <div className="text-center text-slate-500 py-12">Aucun adversaire enregistré.</div>
        )}
        {opponents.length > 0 && (
          <window.Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                <thead className="bg-slate-900 text-white uppercase text-xs">
                  <tr>
                    <th className="p-3">Adversaire</th>
                    <th className="p-3 text-center">Matchs</th>
                    <th className="p-3 text-center text-green-400">V</th>
                    <th className="p-3 text-center text-red-400">D</th>
                    <th className="p-3 text-center">PTS moy</th>
                    <th className="p-3 text-center">Enc. moy</th>
                    <th className="p-3 text-center">Diff moy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {opponents.map((o) => (
                    <tr
                      key={o.name}
                      onClick={() => setSelectedOpponent(o.name)}
                      className="hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-bold text-white">{o.name}</td>
                      <td className="p-3 text-center">{o.games.length}</td>
                      <td className="p-3 text-center text-green-400">{o.wins}</td>
                      <td className="p-3 text-center text-red-400">{o.losses}</td>
                      <td className="p-3 text-center text-orange-400 font-bold">{o.avgPtsFor}</td>
                      <td className="p-3 text-center">{o.avgPtsAgainst}</td>
                      <td
                        className={`p-3 text-center font-bold ${parseFloat(o.diff) >= 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {parseFloat(o.diff) > 0 ? '+' : ''}
                        {o.diff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </window.Card>
        )}
      </div>
    );
  }

  // ---- RENDU DETAIL ----
  if (!detail) return null;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedOpponent(null)}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
        >
          ← Retour
        </button>
        <h2 className="text-xl font-bold text-white">{detail.name}</h2>
        <span
          className={`text-sm font-bold ${detail.wins >= detail.losses ? 'text-green-400' : 'text-red-400'}`}
        >
          {detail.wins}V - {detail.losses}D
        </span>
        {onPrepare && (
          <window.Button size="sm" variant="primary" onClick={() => onPrepare(detail.name)}>
            Préparer le match
          </window.Button>
        )}
      </div>

      {/* Stats agregees */}
      <window.Card className="p-4">
        <h3 className="text-xs font-bold text-orange-400 uppercase mb-3">
          Nos stats contre {detail.name}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3 text-center">
          {[
            { label: 'FG%', value: detail.aggr.fgPct + '%', color: 'text-white' },
            { label: '3P%', value: detail.aggr.threePct + '%', color: 'text-blue-400' },
            { label: 'REB', value: detail.aggr.avgReb, color: 'text-white' },
            { label: 'PD', value: detail.aggr.avgAst, color: 'text-purple-400' },
            { label: 'BP', value: detail.aggr.avgTov, color: 'text-red-400' },
            { label: 'INT', value: detail.aggr.avgStl, color: 'text-yellow-400' },
            { label: 'CTR', value: detail.aggr.avgBlk, color: 'text-cyan-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30"
            >
              <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase">{s.label}/match</div>
            </div>
          ))}
        </div>
      </window.Card>

      {/* Joueurs adverses cles */}
      {detail.oppTopPlayers.length > 0 && (
        <window.Card className="p-4">
          <h3 className="text-xs font-bold text-red-400 uppercase mb-3">Joueurs Adverses Clés</h3>
          <div className="space-y-2">
            {detail.oppTopPlayers.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-red-900/15 border border-red-800/20 rounded-lg px-3 py-2"
              >
                <span className="text-sm font-bold text-white">
                  #{p.number} {p.name}
                </span>
                <span className="text-xs text-slate-400">
                  {p.gp} match{p.gp > 1 ? 's' : ''}
                </span>
                <span className="text-sm font-bold text-orange-400">{p.avgPts} PTS/m</span>
              </div>
            ))}
          </div>
        </window.Card>
      )}

      {/* Liste des matchs */}
      <window.Card className="p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">
          Historique des confrontations
        </h3>
        <div className="space-y-2">
          {detail.sorted.map((g) => {
            const isWin = (g.homeScore || 0) > (g.awayScore || 0);
            return (
              <div
                key={g.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 border ${isWin ? 'bg-green-900/15 border-green-800/20' : 'bg-red-900/15 border-red-800/20'}`}
              >
                <span className="text-xs text-slate-400">{g.date}</span>
                <span className={`text-xs font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                  {isWin ? 'V' : 'D'}
                </span>
                <span className="text-sm font-bold text-white">
                  {g.homeScore} - {g.awayScore}
                </span>
              </div>
            );
          })}
        </div>
      </window.Card>
    </div>
  );
}
window.OpponentScouting = OpponentScouting;
})();
