// SeasonDashboard.jsx — Archives / Comparaison de saisons
import React from 'react';

const _parseDateSD = (dateStr) => {
  if (!dateStr) return new Date(0);
  const months = {
    janv: 0, jan: 0, janvier: 0, fevr: 1, fev: 1, fevrier: 1,
    mars: 2, mar: 2, avr: 3, avril: 3, mai: 4, juin: 5,
    juil: 6, jul: 6, juillet: 6, aout: 7, sept: 8, sep: 8,
    septembre: 8, oct: 9, octobre: 9, nov: 10, novembre: 10,
    dec: 11, decembre: 11,
  };
  const match = dateStr.match(/(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})/i);
  if (match) {
    const m = months[match[2].toLowerCase().replace('.', '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
    if (m !== undefined) return new Date(match[3], m, match[1]);
  }
  const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return new Date(slash[3], slash[2] - 1, slash[1]);
  return new Date(dateStr);
};

function calcSeasonStats(games) {
  const n = games.length;
  if (!n) return null;
  let wins = 0, ptsFor = 0, ptsAgainst = 0;
  let fgM = 0, fgA = 0, fg3M = 0, fg3A = 0, ftM = 0, ftA = 0, tov = 0;
  games.forEach((g) => {
    const us = g.homeScore ?? 0;
    const them = g.awayScore ?? 0;
    if (us > them) wins++;
    ptsFor += us;
    ptsAgainst += them;
    if (g.playerStats) {
      Object.values(g.playerStats).forEach((ps) => {
        fgM += ps.fgm ?? 0; fgA += ps.fga ?? 0;
        fg3M += ps.threePM ?? 0; fg3A += ps.threePA ?? 0;
        ftM += ps.ftm ?? 0; ftA += ps.fta ?? 0;
        tov += ps.tov ?? 0;
      });
    }
  });
  return {
    n, wins, losses: n - wins,
    ptsFor: (ptsFor / n).toFixed(1),
    ptsAgainst: (ptsAgainst / n).toFixed(1),
    netRtg: ((ptsFor - ptsAgainst) / n).toFixed(1),
    fgPct: fgA ? ((fgM / fgA) * 100).toFixed(1) : null,
    fg3Pct: fg3A ? ((fg3M / fg3A) * 100).toFixed(1) : null,
    ftPct: ftA ? ((ftM / ftA) * 100).toFixed(1) : null,
    tov: (tov / n).toFixed(1),
  };
}

(function () {

  function SeasonDashboard({ games, players, phases, seasons }) {
    const [activeTab, setActiveTab] = React.useState('archives');
    const [selectedSeasonId, setSelectedSeasonId] = React.useState(null);
    const [compareSeasonAId, setCompareSeasonAId] = React.useState(null);
    const [compareSeasonBId, setCompareSeasonBId] = React.useState(null);

    const effectiveSeasonId = selectedSeasonId ?? seasons[0]?.id ?? null;

    const gamesForSeason = (seasonId) => {
      if (!seasonId) return [];
      const seasonPhaseIds = new Set(phases.filter((p) => p.seasonId === seasonId).map((p) => p.id));
      return games.filter((g) => g.seasonId === seasonId || seasonPhaseIds.has(g.phaseId));
    };

    const seasonLabel = (id) => {
      const s = seasons.find((s) => s.id === id);
      return s ? (s.label || s.name || 'Saison') : '—';
    };

    const selectorStyle = {
      background: 'var(--bg-3)', border: '1px solid var(--border)',
      color: 'var(--text-1)', borderRadius: '0.375rem',
      padding: '0.4375rem 0.75rem', fontSize: '0.875rem',
      outline: 'none', cursor: 'pointer',
    };

    const tabBtnStyle = (active) => ({
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : 'var(--text-3)',
      border: active ? 'none' : '1px solid var(--border)',
      borderRadius: '0.375rem',
      padding: '0.4rem 1rem', fontSize: '0.8125rem', fontWeight: active ? 700 : 600,
      cursor: 'pointer',
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={tabBtnStyle(activeTab === 'archives')} onClick={() => setActiveTab('archives')}>
            Archives
          </button>
          <button style={tabBtnStyle(activeTab === 'comparaison')} onClick={() => setActiveTab('comparaison')}>
            Comparaison
          </button>
        </div>

        {activeTab === 'archives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>Saison :</span>
              <select
                style={selectorStyle}
                value={effectiveSeasonId ?? ''}
                onChange={(e) => setSelectedSeasonId(e.target.value || null)}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.label || s.name}</option>
                ))}
              </select>
            </div>

            {(() => {
              const sg = gamesForSeason(effectiveSeasonId);
              const stats = calcSeasonStats(sg);
              if (!stats) return (
                <div style={{ color: 'var(--text-3)', padding: '2rem', textAlign: 'center' }}>
                  Aucun match pour cette saison.
                </div>
              );
              const netRtgNum = parseFloat(stats.netRtg);
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    {[
                      { label: 'Matchs', value: stats.n },
                      { label: 'Bilan', value: `${stats.wins}V – ${stats.losses}D` },
                      { label: 'Pts / match', value: stats.ptsFor },
                      { label: 'Pts encaissés', value: stats.ptsAgainst },
                      { label: 'Net Rating', value: `${netRtgNum >= 0 ? '+' : ''}${stats.netRtg}`, color: netRtgNum >= 0 ? 'var(--made)' : 'var(--miss)' },
                      { label: 'FG%', value: stats.fgPct ? `${stats.fgPct}%` : '—' },
                      { label: '3P%', value: stats.fg3Pct ? `${stats.fg3Pct}%` : '—' },
                      { label: 'FT%', value: stats.ftPct ? `${stats.ftPct}%` : '—' },
                      { label: 'TOV / match', value: stats.tov },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="sc-card" style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: color || 'var(--text-1)' }}>{value}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sc-card">
                    <div className="sc-section-label">Matchs de la saison</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.75rem' }}>
                      {[...sg]
                        .sort((a, b) => _parseDateSD(b.date) - _parseDateSD(a.date))
                        .map((g) => {
                          const us = g.homeScore ?? 0;
                          const them = g.awayScore ?? 0;
                          const won = us > them;
                          return (
                            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'var(--bg-2)' }}>
                              <span style={{
                                width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem', flexShrink: 0,
                                background: won ? '#15803d' : '#7f1d1d',
                                color: won ? '#fff' : '#fca5a5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.625rem', fontWeight: 800,
                              }}>
                                {won ? 'V' : 'D'}
                              </span>
                              <span style={{ flex: 1, color: 'var(--text-2)', fontSize: '0.8125rem' }}>
                                vs {g.opponent || g.awayTeam || 'Adversaire'} — {g.date}
                              </span>
                              <span style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '0.875rem' }}>
                                {us} – {them}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'comparaison' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8125rem' }}>Saison A :</span>
                <select
                  style={selectorStyle}
                  value={compareSeasonAId ?? seasons[0]?.id ?? ''}
                  onChange={(e) => setCompareSeasonAId(e.target.value || null)}
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.label || s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-2)', fontWeight: 700, fontSize: '0.8125rem' }}>Saison B :</span>
                <select
                  style={selectorStyle}
                  value={compareSeasonBId ?? seasons[1]?.id ?? seasons[0]?.id ?? ''}
                  onChange={(e) => setCompareSeasonBId(e.target.value || null)}
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.label || s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const idA = compareSeasonAId ?? seasons[0]?.id;
              const idB = compareSeasonBId ?? seasons[1]?.id ?? seasons[0]?.id;
              const statsA = calcSeasonStats(gamesForSeason(idA));
              const statsB = calcSeasonStats(gamesForSeason(idB));

              const compareMetrics = [
                { key: 'wins',       label: 'Victoires',     fmt: (v) => v, higher: true },
                { key: 'losses',     label: 'Défaites',      fmt: (v) => v, higher: false },
                { key: 'ptsFor',     label: 'Pts / match',   fmt: (v) => v, higher: true },
                { key: 'ptsAgainst', label: 'Pts encaissés', fmt: (v) => v, higher: false },
                { key: 'netRtg',     label: 'Net Rating',    fmt: (v) => `${parseFloat(v) >= 0 ? '+' : ''}${v}`, higher: true },
                { key: 'fgPct',      label: 'FG%',           fmt: (v) => v ? `${v}%` : '—', higher: true },
                { key: 'fg3Pct',     label: '3P%',           fmt: (v) => v ? `${v}%` : '—', higher: true },
                { key: 'ftPct',      label: 'FT%',           fmt: (v) => v ? `${v}%` : '—', higher: true },
                { key: 'tov',        label: 'TOV / match',   fmt: (v) => v, higher: false },
              ];

              return (
                <div className="sc-card">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ padding: '0.625rem 0.75rem', background: 'var(--bg-2)', color: 'var(--text-3)', fontSize: '0.75rem', fontWeight: 600 }}></div>
                    <div style={{ padding: '0.625rem 0.75rem', background: 'var(--bg-2)', color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center' }}>
                      {seasonLabel(idA)}
                    </div>
                    <div style={{ padding: '0.625rem 0.75rem', background: 'var(--bg-2)', color: 'var(--text-2)', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center' }}>
                      {seasonLabel(idB)}
                    </div>

                    {compareMetrics.map(({ key, label, fmt, higher }, i) => {
                      const valA = statsA?.[key];
                      const valB = statsB?.[key];
                      const numA = parseFloat(valA);
                      const numB = parseFloat(valB);
                      const aWins = !isNaN(numA) && !isNaN(numB) && (higher ? numA > numB : numA < numB);
                      const bWins = !isNaN(numA) && !isNaN(numB) && (higher ? numB > numA : numB < numA);
                      const rowBg = i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)';
                      return (
                        <React.Fragment key={key}>
                          <div style={{ padding: '0.5rem 0.75rem', background: rowBg, color: 'var(--text-3)', fontSize: '0.8125rem' }}>{label}</div>
                          <div style={{ padding: '0.5rem 0.75rem', background: rowBg, textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', color: aWins ? 'var(--made)' : bWins ? 'var(--miss)' : 'var(--text-2)' }}>
                            {valA != null ? fmt(valA) : '—'}
                          </div>
                          <div style={{ padding: '0.5rem 0.75rem', background: rowBg, textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', color: bWins ? 'var(--made)' : aWins ? 'var(--miss)' : 'var(--text-2)' }}>
                            {valB != null ? fmt(valB) : '—'}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.6875rem', marginTop: '0.5rem' }}>
                    Vert = meilleure valeur · Rouge = moins bonne valeur
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  window.SeasonDashboard = SeasonDashboard;
})();
