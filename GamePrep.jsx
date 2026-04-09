// GamePrep.js — Composant React (JSX, nécessite Babel)
// Dépendances : React, Firebase (window.db), window.Icon, window.Icons, window.Card, window.Button
import React, { useState, useMemo, useEffect } from 'react';

(function () {
  function GamePrep({ opponentName, games, players, onBack }) {
    const [coachNotes, setCoachNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [prepId, setPrepId] = useState(null);
    const [starters, setStarters] = useState({ 1: [], 2: [], 3: [], 4: [] });
    const [copied, setCopied] = useState(false);

    // Charger/creer le doc gamePreps
    useEffect(() => {
      if (!window.db || !opponentName) return;
      const docId = 'prep_' + opponentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      setPrepId(docId);
      window.DB.getPrep(docId)
        .then((snap) => {
          if (snap.exists) {
            const data = snap.data();
            setCoachNotes(data.coachNotes || '');
            if (data.starters) setStarters(data.starters);
          }
        })
        .catch(() => {});
    }, [opponentName]);

    const saveToFirestore = async () => {
      if (!window.db || !prepId) return;
      setSaving(true);
      try {
        await window.DB.savePrep(prepId, {
          opponent: opponentName,
          coachNotes: coachNotes,
          starters: starters,
        });
      } catch (e) {
        console.error('GamePrep save error:', e);
      }
      setSaving(false);
    };

    // Matchs filtres contre cet adversaire
    const oppGames = useMemo(() => {
      return games.filter(
        (g) =>
          g.opponent &&
          g.opponent.trim() === opponentName.trim() &&
          (!g.status || g.status === 'final')
      );
    }, [games, opponentName]);

    // Bilan agrege
    const bilan = useMemo(() => {
      if (oppGames.length === 0) return null;
      let pts = 0,
        conceded = 0,
        wins = 0,
        totalFgm = 0,
        totalFga = 0,
        reb = 0,
        ast = 0,
        tov = 0;
      oppGames.forEach((g) => {
        pts += g.homeScore || 0;
        conceded += g.awayScore || 0;
        if ((g.homeScore || 0) > (g.awayScore || 0)) wins++;
        Object.values(g.playerStats || {}).forEach((s) => {
          totalFgm += (s.fgm || 0) + (s.threePM || 0);
          totalFga += (s.fga || 0) + (s.threePA || 0);
          reb += (s.oreb || 0) + (s.dreb || 0);
          ast += s.ast || 0;
          tov += s.tov || 0;
        });
      });
      const n = oppGames.length;
      return {
        matches: n,
        wins,
        losses: n - wins,
        avgPts: (pts / n).toFixed(1),
        avgConceded: (conceded / n).toFixed(1),
        fgPct: totalFga > 0 ? ((totalFgm / totalFga) * 100).toFixed(1) : '0',
        avgReb: (reb / n).toFixed(1),
        avgAst: (ast / n).toFixed(1),
        avgTov: (tov / n).toFixed(1),
      };
    }, [oppGames]);

    // Joueurs adverses cles
    const oppKeyPlayers = useMemo(() => {
      const map = {};
      oppGames.forEach((g) => {
        const ops = g.opponentPlayerStats || {};
        Object.entries(ops).forEach(([pid, s]) => {
          const key = s.name || `#${s.number || pid}`;
          if (!map[key]) map[key] = { name: key, number: s.number || pid, pts: 0, gp: 0 };
          map[key].pts += s.pts || 0;
          map[key].gp++;
        });
      });
      return Object.values(map)
        .filter((p) => p.gp > 0)
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 3)
        .map((p) => ({ ...p, avgPts: (p.pts / p.gp).toFixed(1) }));
    }, [oppGames]);

    // Toggle starter
    const toggleStarter = (q, pid) => {
      setStarters((prev) => {
        const current = prev[q] || [];
        const next = current.includes(pid)
          ? current.filter((id) => id !== pid)
          : current.length < 5
            ? [...current, pid]
            : current;
        return { ...prev, [q]: next };
      });
    };

    // Export texte
    const exportText = () => {
      let txt = `=== PRÉPARATION MATCH vs ${opponentName} ===\n\n`;
      if (bilan) {
        txt += `BILAN: ${bilan.wins}V-${bilan.losses}D | PTS: ${bilan.avgPts} | Enc: ${bilan.avgConceded} | FG%: ${bilan.fgPct}\n`;
        txt += `REB: ${bilan.avgReb} | PD: ${bilan.avgAst} | BP: ${bilan.avgTov}\n\n`;
      }
      if (oppKeyPlayers.length > 0) {
        txt += 'JOUEURS ADVERSES CLÉS:\n';
        oppKeyPlayers.forEach((p) => {
          txt += `  - ${p.name}: ${p.avgPts} PTS/m\n`;
        });
        txt += '\n';
      }
      [1, 2, 3, 4].forEach((q) => {
        const ids = starters[q] || [];
        if (ids.length > 0) {
          const names = ids.map((id) => {
            const p = players.find((x) => x.id === id);
            return p ? `#${p.number} ${p.name}` : `#${id}`;
          });
          txt += `Q${q}: ${names.join(', ')}\n`;
        }
      });
      if (coachNotes) txt += `\nNOTES:\n${coachNotes}\n`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }
    };

    return (
      <div className="space-y-4 pb-20 md:pb-0">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">
            ← Retour
          </button>
          <h2 className="text-xl font-bold text-white">Préparation vs {opponentName}</h2>
        </div>

        {/* Bilan */}
        {bilan ? (
          <window.Card className="p-4">
            <h3 className="text-xs font-bold text-orange-400 uppercase mb-3">
              Bilan des confrontations ({bilan.matches} matchs)
            </h3>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
              <div className="bg-slate-900/50 rounded p-2 border border-slate-700/30">
                <div
                  className={`text-sm font-bold ${bilan.wins >= bilan.losses ? 'text-green-400' : 'text-red-400'}`}
                >
                  {bilan.wins}V-{bilan.losses}D
                </div>
                <div className="text-[10px] text-slate-500">Bilan</div>
              </div>
              {[
                { label: 'PTS', v: bilan.avgPts, c: 'text-orange-400' },
                { label: 'Enc.', v: bilan.avgConceded, c: 'text-white' },
                { label: 'FG%', v: bilan.fgPct + '%', c: 'text-white' },
                { label: 'REB', v: bilan.avgReb, c: 'text-white' },
                { label: 'BP', v: bilan.avgTov, c: 'text-red-400' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-slate-900/50 rounded p-2 border border-slate-700/30"
                >
                  <div className={`text-sm font-bold ${s.c}`}>{s.v}</div>
                  <div className="text-[10px] text-slate-500">{s.label}/m</div>
                </div>
              ))}
            </div>
          </window.Card>
        ) : (
          <window.Card className="p-4">
            <div className="text-slate-500 text-sm text-center">
              Aucun match précédent contre {opponentName}
            </div>
          </window.Card>
        )}

        {/* Joueurs adverses cles */}
        {oppKeyPlayers.length > 0 && (
          <window.Card className="p-4">
            <h3 className="text-xs font-bold text-red-400 uppercase mb-3">
              Joueurs Adverses Clés (top 3)
            </h3>
            <div className="space-y-2">
              {oppKeyPlayers.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-red-900/15 border border-red-800/20 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-bold text-white">
                    #{p.number} {p.name}
                  </span>
                  <span className="text-sm font-bold text-orange-400">{p.avgPts} PTS/m</span>
                </div>
              ))}
            </div>
          </window.Card>
        )}

        {/* Notes coach */}
        <window.Card className="p-4">
          <h3 className="text-xs font-bold text-orange-400 uppercase mb-3">Notes du Coach</h3>
          <textarea
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            onBlur={saveToFirestore}
            placeholder="Notes tactiques, points d'attention..."
            className="bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 p-3 w-full min-h-[100px] outline-none focus:border-orange-500"
          />
          {saving && <span className="text-xs text-slate-500 mt-1">Sauvegarde...</span>}
        </window.Card>

        {/* Rotations planifiees */}
        <window.Card className="p-4">
          <h3 className="text-xs font-bold text-orange-400 uppercase mb-3">5 Majeurs Planifiés</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((q) => {
              const selected = starters[q] || [];
              return (
                <div key={q}>
                  <div className="text-xs text-slate-400 font-bold mb-2">
                    Q{q} ({selected.length}/5)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {players.map((p) => {
                      const isSel = selected.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleStarter(q, p.id)}
                          className={`px-2 py-1 text-xs rounded border transition-all ${isSel ? 'bg-orange-600 border-orange-500 text-white font-bold' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                        >
                          #{p.number} {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <window.Button size="sm" variant="secondary" onClick={saveToFirestore}>
              Sauvegarder les rotations
            </window.Button>
          </div>
        </window.Card>

        {/* Export */}
        <div className="flex gap-2">
          <window.Button variant="primary" onClick={exportText}>
            {copied ? 'Copié !' : 'Copier en texte'}
          </window.Button>
        </div>
      </div>
    );
  }
  window.GamePrep = GamePrep;
})();
