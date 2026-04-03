import React, { useMemo } from 'react';
import { useDataStore } from './src/stores/data-store';
import { useUIStore } from './src/stores/ui-store';
import { useAuthStore } from './src/stores/auth-store';

const STATUS_CONFIG = {
  available: { color: '#22c55e', label: 'Disponible' },
  fit: { color: '#22c55e', label: 'Disponible' },
  injured: { color: '#ef4444', label: 'Blessé' },
  doubtful: { color: '#f97316', label: 'Incertain' },
  rest: { color: '#94a3b8', label: 'Repos' },
  sanction: { color: '#ea580c', label: 'Sanction' },
};

const STATUS_SORT = { injured: 0, sanction: 0, doubtful: 1, rest: 2, available: 3, fit: 3 };

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const months = {
    janv: 0,
    jan: 0,
    janvier: 0,
    fevr: 1,
    fev: 1,
    fevrier: 1,
    mars: 2,
    mar: 2,
    avr: 3,
    avril: 3,
    mai: 4,
    juin: 5,
    juil: 6,
    jul: 6,
    juillet: 6,
    aout: 7,
    sept: 8,
    sep: 8,
    septembre: 8,
    oct: 9,
    octobre: 9,
    nov: 10,
    novembre: 10,
    dec: 11,
    decembre: 11,
  };
  const match = dateStr.match(/(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})/i);
  if (match) {
    const m =
      months[
        match[2]
          .toLowerCase()
          .replace('.', '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      ];
    if (m !== undefined) return new Date(match[3], m, match[1]);
  }
  const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return new Date(slash[3], slash[2] - 1, slash[1]);
  return new Date(dateStr);
};

export default function Home() {
  const games = useDataStore((s) => s.games);
  const players = useDataStore((s) => s.players);
  const phases = useDataStore((s) => s.phases);
  const activeSeason = useDataStore((s) => s.activeSeason);
  const gamesForActiveSeason = useDataStore((s) => s.gamesForActiveSeason);
  const rosterForSeason = useDataStore((s) => s.rosterForSeason);
  const updatePlayerStatus = useDataStore((s) => s.updatePlayerStatus);
  const setView = useUIStore((s) => s.setView);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  // --- Dernier match ---
  const lastGame = useMemo(() => {
    if (!games.length) return null;
    return [...games].sort((a, b) => parseDate(b.date) - parseDate(a.date))[0];
  }, [games]);

  // --- Bilan saison ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seasonGames = useMemo(
    () => gamesForActiveSeason(),
    [gamesForActiveSeason, games, phases, activeSeason]
  );
  const seasonStats = useMemo(() => {
    const n = seasonGames.length;
    if (!n)
      return {
        wins: 0,
        losses: 0,
        ptsFor: '—',
        ptsAgainst: '—',
        diff: '—',
        fgPct: '—',
        fg3Pct: '—',
        ftPct: '—',
        tov: '—',
        orb: '—',
        drb: '—',
        trb: '—',
      };

    let wins = 0;
    let ptsForSum = 0;
    let ptsAgainstSum = 0;

    // Accumulateurs pour les statistiques globales de l'équipe
    let fgM = 0,
      fgA = 0; // Tirs globaux (Field Goals)
    let fg3M = 0,
      fg3A = 0; // 3 Points
    let ftM = 0,
      ftA = 0; // Lancers Francs
    let tov = 0,
      orb = 0,
      drb = 0; // Pertes de balles, Rebonds Off/Def

    seasonGames.forEach((g) => {
      // 1. Calcul des points et Victoires/Défaites
      const us = g.homeScore ?? 0;
      const them = g.awayScore ?? 0;

      // Attention : on part du principe que ton équipe est toujours "homeScore"
      if (us > them) wins++;
      ptsForSum += us;
      ptsAgainstSum += them;

      // 2. Agrégation des stats avancées via playerStats
      if (g.playerStats) {
        // playerStats étant un Object (ex: { "playerId1": {...}, "playerId2": {...} }),
        // on utilise Object.values() pour boucler sur les stats individuelles
        Object.values(g.playerStats).forEach((pStat) => {
          fgM += pStat.fgm || 0;
          fgA += pStat.fga || 0;
          fg3M += pStat.threePM || 0;
          fg3A += pStat.threePA || 0;
          ftM += pStat.ftm || 0;
          ftA += pStat.fta || 0;
          tov += pStat.tov || 0;
          orb += pStat.oreb || 0;
          drb += pStat.dreb || 0;
        });
      }
    });

    // 3. Calcul des moyennes et pourcentages de la saison
    const ptsFor = (ptsForSum / n).toFixed(1);
    const ptsAgainst = (ptsAgainstSum / n).toFixed(1);
    const diffValue = (ptsForSum - ptsAgainstSum) / n;
    const diff = diffValue > 0 ? `+${diffValue.toFixed(1)}` : diffValue.toFixed(1);

    const calcPct = (m, a) => (a > 0 ? Math.round((m / a) * 100) + '%' : '—');

    return {
      wins,
      losses: n - wins,
      ptsFor,
      ptsAgainst,
      diff,
      fgPct: calcPct(fgM + fg3M, fgA + fg3A),
      fg3Pct: calcPct(fg3M, fg3A),
      ftPct: calcPct(ftM, ftA),
      tov: (tov / n).toFixed(1),
      orb: (orb / n).toFixed(1),
      drb: (drb / n).toFixed(1),
      trb: ((orb + drb) / n).toFixed(1),
    };
  }, [seasonGames]);

  // --- Effectif ---
  const seasonRoster = useMemo(
    () => (activeSeason?.id ? rosterForSeason(activeSeason.id) : []),
    [activeSeason, rosterForSeason, players]
  );

  const sortedRoster = useMemo(
    () =>
      [...seasonRoster].sort((a, b) => (STATUS_SORT[a.status] ?? 3) - (STATUS_SORT[b.status] ?? 3)),
    [seasonRoster]
  );

  const availableCount = sortedRoster.filter(
    (p) => !p.status || p.status === 'available' || p.status === 'fit'
  ).length;
  // sanction, injured, doubtful, rest → non-disponibles

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
      {/* ─── Dernier match ─── */}
      <div className="sc-card" style={{ marginBottom: '1.25rem' }}>
        <div className="sc-card-header">Dernier match</div>
        <div style={{ padding: '1rem' }}>
          {lastGame ? (
            <div
              onClick={() => setView('history')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.9375rem' }}>
                  vs {lastGame.opponent || 'Adversaire'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                  {lastGame.date || '—'}
                </div>
              </div>
              <div
                style={{
                  fontSize: '1.625rem',
                  fontWeight: 900,
                  color: 'var(--text-1)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {lastGame.homeScore ?? '—'}&nbsp;–&nbsp;{lastGame.awayScore ?? '—'}
              </div>
              {lastGame.homeScore != null && lastGame.awayScore != null && (
                <WinLossBadge win={lastGame.homeScore > lastGame.awayScore} />
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-3)' }}>
              <div style={{ marginBottom: '1rem' }}>Aucun match enregistré</div>
              <button className="sc-btn-accent" onClick={() => window.open('live.html', '_blank')}>
                Démarrer un match
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bilan saison ─── */}
      {/* ─── Bilan saison ─── */}
      <div className="sc-card" style={{ marginBottom: '1.25rem' }}>
        <div className="sc-card-header">
          Bilan saison
          {activeSeason && (
            <span
              style={{
                marginLeft: '0.5rem',
                color: 'var(--accent)',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {activeSeason.label || activeSeason.name}
            </span>
          )}
        </div>
        <div style={{ padding: '1rem' }}>
          {!activeSeason ? (
            <EmptySeason onConfigure={() => setView('settings')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Ligne 1 : Global (Victoires, Défaites, Différentiel) */}
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}
              >
                <StatBlock label="Victoires" value={seasonStats.wins} color="#22c55e" />
                <StatBlock label="Défaites" value={seasonStats.losses} color="#ef4444" />
                <StatBlock
                  label="Différentiel"
                  value={seasonStats.diff}
                  color={
                    seasonStats.diff.startsWith('+')
                      ? '#22c55e'
                      : seasonStats.diff === '—'
                        ? '#94a3b8'
                        : '#ef4444'
                  }
                />
              </div>

              {/* Ligne 2 : Points & Pertes de balles */}
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}
              >
                <StatBlock label="PTS / match" value={seasonStats.ptsFor} color="var(--accent)" />
                <StatBlock
                  label="PTS enc. / match"
                  value={seasonStats.ptsAgainst}
                  color="#94a3b8"
                />
                <StatBlock label="Pertes B. / match" value={seasonStats.tov} color="#f59e0b" />
              </div>

              {/* Ligne 3 : Pourcentages (Tir, 3PT, LF) */}
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}
              >
                <StatBlock label="% Tir" value={seasonStats.fgPct} color="#3b82f6" />
                <StatBlock label="% 3PT" value={seasonStats.fg3Pct} color="#8b5cf6" />
                <StatBlock label="% Lancer Franc" value={seasonStats.ftPct} color="#ec4899" />
              </div>

              {/* Ligne 4 : Rebonds */}
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}
              >
                <StatBlock label="Rebonds Off" value={seasonStats.orb} color="#14b8a6" />
                <StatBlock label="Rebonds Def" value={seasonStats.drb} color="#06b6d4" />
                <StatBlock label="Rebonds Tot" value={seasonStats.trb} color="#0ea5e9" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Effectif ─── */}
      <div className="sc-card" style={{ marginBottom: '1.25rem' }}>
        <div className="sc-card-header">
          {activeSeason
            ? `Effectif — ${availableCount} disponible${availableCount > 1 ? 's' : ''} sur ${sortedRoster.length}`
            : 'Effectif'}
        </div>
        <div style={{ padding: '1rem' }}>
          {!activeSeason ? (
            <EmptySeason onConfigure={() => setView('settings')} />
          ) : sortedRoster.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                color: 'var(--text-3)',
                fontSize: '0.875rem',
              }}
            >
              Aucun joueur dans cette saison.{' '}
              <button
                onClick={() => setView('settings')}
                style={{
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Gérer l'effectif
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {sortedRoster.map((player) => {
                const cfg = STATUS_CONFIG[player.status] || STATUS_CONFIG.available;
                return (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.4375rem 0.75rem',
                      background: 'var(--bg-3)',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-3)',
                        width: '2.25rem',
                        textAlign: 'right',
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      #{player.number}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        color: 'var(--text-1)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {player.name}
                    </span>
                    <span
                      style={{
                        width: '0.5rem',
                        height: '0.5rem',
                        borderRadius: '50%',
                        background: cfg.color,
                        flexShrink: 0,
                      }}
                    />
                    {isAdmin ? (
                      <select
                        value={player.status || 'available'}
                        onChange={(e) => updatePlayerStatus(String(player.id), e.target.value)}
                        style={{
                          background: 'var(--bg-2)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-1)',
                          borderRadius: '0.25rem',
                          padding: '0.125rem 0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="available">Disponible</option>
                        <option value="injured">Blessé</option>
                        <option value="doubtful">Incertain</option>
                        <option value="rest">Repos</option>
                        <option value="sanction">Sanction</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: cfg.color, fontWeight: 600 }}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Actions rapides ─── */}
      <div className="sc-card">
        <div className="sc-card-header">Actions rapides</div>
        <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="sc-btn-accent" onClick={() => window.open('live.html', '_blank')}>
            Nouveau match
          </button>
          <button className="sc-btn-ghost" onClick={() => setView('global_stats')}>
            Stats équipe
          </button>
          <button className="sc-btn-ghost" onClick={() => setView('global_stats')}>
            Rapports
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, color }) {
  return (
    <div
      style={{
        background: 'var(--bg-3)',
        borderRadius: '0.5rem',
        padding: '0.875rem 1rem',
        textAlign: 'center',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: '1.75rem',
          fontWeight: 900,
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '0.6875rem',
          color: 'var(--text-3)',
          marginTop: '0.375rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function WinLossBadge({ win }) {
  return (
    <span
      style={{
        padding: '0.25rem 0.625rem',
        borderRadius: '0.375rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        flexShrink: 0,
        background: win ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        color: win ? '#22c55e' : '#ef4444',
        border: `1px solid ${win ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}
    >
      {win ? 'V' : 'D'}
    </span>
  );
}

function EmptySeason({ onConfigure }) {
  return (
    <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--text-3)' }}>
      <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>Aucune saison active</div>
      <button className="sc-btn-accent" onClick={onConfigure}>
        Configurez votre première saison
      </button>
    </div>
  );
}
