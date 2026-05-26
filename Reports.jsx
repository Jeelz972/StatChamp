import React, { useState, useMemo } from 'react';
import { useDataStore } from './src/stores/data-store';
import { useUIStore } from './src/stores/ui-store';

const parseDate = (dateStr) => {
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

const TAB_STYLE_ACTIVE = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '0.375rem',
  padding: '0.4rem 1rem',
  fontSize: '0.8125rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const TAB_STYLE_INACTIVE = {
  background: 'transparent',
  color: 'var(--text-3)',
  border: '1px solid var(--border)',
  borderRadius: '0.375rem',
  padding: '0.4rem 1rem',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
};

// ─── Onglet Équipe ───────────────────────────────────────────────

function TabEquipe({ games, activeSeason }) {
  const seasonGames = useMemo(() => {
    if (!activeSeason) return games;
    return games.filter((g) => g.seasonId === activeSeason.id || g.phaseId && false);
  }, [games, activeSeason]);

  const stats = useMemo(() => {
    const n = seasonGames.length;
    if (!n) return null;
    let wins = 0, ptsFor = 0, ptsAgainst = 0;
    let fgM = 0, fgA = 0, fg3M = 0, fg3A = 0, ftM = 0, ftA = 0, tov = 0, reb = 0;
    seasonGames.forEach((g) => {
      const us = g.homeScore ?? 0;
      const them = g.awayScore ?? 0;
      if (us > them) wins++;
      ptsFor += us;
      ptsAgainst += them;
      if (g.playerStats) {
        Object.values(g.playerStats).forEach((ps) => {
          fgM += ps.fgm || 0; fgA += ps.fga || 0;
          fg3M += ps.threePM || 0; fg3A += ps.threePA || 0;
          ftM += ps.ftm || 0; ftA += ps.fta || 0;
          tov += ps.tov || 0;
          reb += (ps.oreb || 0) + (ps.dreb || 0);
        });
      }
    });
    const netRtg = ((ptsFor - ptsAgainst) / n).toFixed(1);
    return {
      n, wins, losses: n - wins,
      ptsFor: (ptsFor / n).toFixed(1),
      ptsAgainst: (ptsAgainst / n).toFixed(1),
      netRtg,
      fgPct: fgA ? ((fgM / fgA) * 100).toFixed(1) : '—',
      fg3Pct: fg3A ? ((fg3M / fg3A) * 100).toFixed(1) : '—',
      ftPct: ftA ? ((ftM / ftA) * 100).toFixed(1) : '—',
      tov: (tov / n).toFixed(1),
      reb: (reb / n).toFixed(1),
    };
  }, [seasonGames]);

  if (!stats) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-3)', textAlign: 'center' }}>
        Aucun match enregistré pour la saison active.
      </div>
    );
  }

  const statBlocks = [
    { label: 'Bilan', value: `${stats.wins}V – ${stats.losses}D` },
    { label: 'Pts marqués / match', value: stats.ptsFor },
    { label: 'Pts encaissés / match', value: stats.ptsAgainst },
    { label: 'Net Rating', value: `${parseFloat(stats.netRtg) >= 0 ? '+' : ''}${stats.netRtg}`, color: parseFloat(stats.netRtg) >= 0 ? 'var(--made)' : 'var(--miss)' },
    { label: 'FG%', value: `${stats.fgPct}%` },
    { label: '3P%', value: `${stats.fg3Pct}%` },
    { label: 'FT%', value: `${stats.ftPct}%` },
    { label: 'Balles perdues / match', value: stats.tov },
    { label: 'Rebonds / match', value: stats.reb },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {activeSeason ? activeSeason.label || activeSeason.name : 'Toutes saisons'} — {stats.n} matchs
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {statBlocks.map(({ label, value, color }) => (
          <div key={label} className="sc-card" style={{ padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: color || 'var(--text-1)' }}>{value}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Onglet Joueurs ──────────────────────────────────────────────

function TabJoueurs({ players, activeSeason, onSelectPlayer }) {
  const seasonPlayers = useMemo(() => {
    if (!activeSeason) return players;
    return players.filter((p) => !p.seasonIds?.length || p.seasonIds.includes(activeSeason.id));
  }, [players, activeSeason]);

  const sorted = useMemo(
    () => [...seasonPlayers].sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
    [seasonPlayers]
  );

  if (!sorted.length) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-3)', textAlign: 'center' }}>
        Aucun joueur dans la saison active.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelectPlayer(p)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', padding: '0.75rem 1rem',
            cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <span style={{
            width: '2rem', height: '2rem', borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
          }}>
            #{p.number ?? '?'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '0.9375rem' }}>
              {p.name}
            </div>
            {p.position && (
              <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{p.position}</div>
            )}
          </div>
          <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>Voir rapport →</span>
        </button>
      ))}
    </div>
  );
}

// ─── Onglet Matchs ───────────────────────────────────────────────

function TabMatchs({ games, activeSeason }) {
  const recentGames = useMemo(() => {
    let list = activeSeason
      ? games.filter((g) => g.seasonId === activeSeason.id)
      : games;
    return [...list]
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 5);
  }, [games, activeSeason]);

  if (!recentGames.length) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-3)', textAlign: 'center' }}>
        Aucun match disponible.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {recentGames.map((g) => {
        const us = g.homeScore ?? 0;
        const them = g.awayScore ?? 0;
        const won = us > them;
        return (
          <div
            key={g.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: '0.5rem', padding: '0.75rem 1rem',
            }}
          >
            <span style={{
              width: '1.75rem', height: '1.75rem', borderRadius: '0.25rem',
              background: won ? '#15803d' : '#7f1d1d',
              color: won ? '#fff' : '#fca5a5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 800, flexShrink: 0,
            }}>
              {won ? 'V' : 'D'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '0.875rem' }}>
                vs {g.opponent || g.awayTeam || 'Adversaire'}
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{g.date}</div>
            </div>
            <span style={{ color: 'var(--text-1)', fontWeight: 800, fontSize: '1rem' }}>
              {us} – {them}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────

export default function Reports() {
  const [activeTab, setActiveTab] = useState('equipe');
  const games = useDataStore((s) => s.games);
  const players = useDataStore((s) => s.players);
  const activeSeason = useDataStore((s) => s.activeSeason);
  const setView = useUIStore((s) => s.setView);

  const handleSelectPlayer = (player) => {
    if (!window.PlayerReportModule) {
      alert("Le module de rapport n'est pas chargé.");
      return;
    }
    window.__reportsSelectedPlayer = player;
    setView('report');
  };

  const tabs = [
    { id: 'equipe', label: 'Équipe' },
    { id: 'joueurs', label: 'Joueurs' },
    { id: 'matchs', label: 'Matchs' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '860px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={activeTab === t.id ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'equipe' && <TabEquipe games={games} activeSeason={activeSeason} />}
      {activeTab === 'joueurs' && (
        <TabJoueurs players={players} activeSeason={activeSeason} onSelectPlayer={handleSelectPlayer} />
      )}
      {activeTab === 'matchs' && <TabMatchs games={games} activeSeason={activeSeason} />}
    </div>
  );
}
