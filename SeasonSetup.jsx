import React, { useState, useMemo } from 'react';
import { useDataStore } from './src/stores/data-store';

const generateId = () => Math.random().toString(36).substr(2, 9);

function generateSeasonLabel() {
  const now = new Date();
  const month = now.getMonth(); // 0 = jan, 8 = sept
  const year = now.getFullYear();
  if (month >= 8) return `Saison ${year}-${year + 1}`;
  return `Saison ${year - 1}-${year}`;
}

export default function SeasonSetup() {
  const players = useDataStore((s) => s.players);
  const games = useDataStore((s) => s.games);
  const phases = useDataStore((s) => s.phases);
  const seasons = useDataStore((s) => s.seasons);
  const setSeasons = useDataStore((s) => s.setSeasons);
  const setActiveSeason = useDataStore((s) => s.setActiveSeason);
  const setPlayers = useDataStore((s) => s.setPlayers);

  const [label, setLabel] = useState(generateSeasonLabel);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(
    () => new Set(players.map((p) => String(p.id)))
  );
  const [selectedPhaseIds, setSelectedPhaseIds] = useState(
    () => new Set(phases.map((p) => p.id || p.name))
  );
  const [newPhaseName, setNewPhaseName] = useState('');

  const togglePlayer = (id) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePhase = (pid) => {
    setSelectedPhaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const selectedPhasesArray = phases.filter((p) => selectedPhaseIds.has(p.id || p.name));

  const matchCount = useMemo(() => {
    const pIds = new Set(selectedPhasesArray.map((p) => p.id || p.name));
    return games.filter((g) => pIds.has(g.phase)).length;
  }, [games, selectedPhasesArray]);

  const handleConfirm = async () => {
    if (!label.trim()) return;
    const seasonId = generateId();

    let phasesForSeason = selectedPhasesArray.map((p) => p.id || p.name);
    if (phases.length === 0 && newPhaseName.trim()) {
      phasesForSeason = [newPhaseName.trim()];
    }

    const newSeason = {
      id: seasonId,
      label: label.trim(),
      name: label.trim(),
      phases: phasesForSeason,
      archived: false,
      roster: [],
      games: [],
    };

    const updatedSeasons = [...seasons, newSeason];
    const updatedPlayers = players.map((p) =>
      selectedPlayerIds.has(String(p.id))
        ? { ...p, seasonIds: [...(p.seasonIds || []), seasonId] }
        : p
    );

    setPlayers(updatedPlayers);
    if (window.DB) {
      await window.DB.saveRoster(updatedPlayers).catch(console.error);
      await window.DB.saveSeasons(updatedSeasons).catch(console.error);
    }
    setActiveSeason(newSeason);
    setSeasons(updatedSeasons);
  };

  const row = (lbl, val) => (
    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0' }}>
      <span style={{ color: 'var(--text-3)' }}>{lbl}</span>
      <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{val}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '0.25rem' }}>
          Configuration de la saison
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>
          Des données existent sans saison associée. Configurez votre première saison pour continuer.
        </p>
      </div>

      {/* Section 1 — Nom */}
      <div className="sc-card" style={{ marginBottom: '1rem' }}>
        <div className="sc-card-header">1 — Nom de la saison</div>
        <div style={{ padding: '1rem' }}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem 0.75rem',
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: '0.375rem', color: 'var(--text-1)', fontSize: '0.9375rem',
              outline: 'none', boxSizing: 'border-box',
            }}
            placeholder="Saison 2025-2026"
          />
        </div>
      </div>

      {/* Section 2 — Effectif */}
      <div className="sc-card" style={{ marginBottom: '1rem' }}>
        <div className="sc-card-header">
          2 — Effectif —{' '}
          {selectedPlayerIds.size} joueur{selectedPlayerIds.size > 1 ? 's' : ''} sélectionné{selectedPlayerIds.size > 1 ? 's' : ''} sur {players.length}
        </div>
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '16rem', overflowY: 'auto' }}>
          {players.map((p) => (
            <label
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.375rem 0.5rem', borderRadius: '0.375rem',
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={selectedPlayerIds.has(String(p.id))}
                onChange={() => togglePlayer(String(p.id))}
                style={{ accentColor: 'var(--accent)', width: '1rem', height: '1rem', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', width: '2rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                #{p.number}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{p.name}</span>
              {p.pos && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.pos}</span>}
            </label>
          ))}
        </div>
      </div>

      {/* Section 3 — Phases */}
      <div className="sc-card" style={{ marginBottom: '1rem' }}>
        <div className="sc-card-header">3 — Phases de compétition</div>
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {phases.length === 0 ? (
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
                Aucune phase existante. Créez-en une :
              </p>
              <input
                type="text"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                placeholder="Ex: Phase Régulière"
                style={{
                  width: '100%', padding: '0.5rem 0.75rem',
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: '0.375rem', color: 'var(--text-1)', fontSize: '0.875rem',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            phases.map((p) => {
              const pid = p.id || p.name;
              return (
                <label
                  key={pid}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.375rem 0.5rem', borderRadius: '0.375rem',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPhaseIds.has(pid)}
                    onChange={() => togglePhase(pid)}
                    style={{ accentColor: 'var(--accent)', width: '1rem', height: '1rem', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}>{p.name}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Section 4 — Résumé */}
      <div className="sc-card" style={{ marginBottom: '1.5rem' }}>
        <div className="sc-card-header">4 — Résumé</div>
        <div style={{ padding: '1rem' }}>
          {row('Saison', label || '—')}
          {row('Joueurs', String(selectedPlayerIds.size))}
          {row('Phases', String(phases.length === 0 && newPhaseName.trim() ? 1 : selectedPhasesArray.length))}
          {row('Matchs associés', String(matchCount))}
        </div>
      </div>

      <button
        className="sc-btn-accent"
        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem', fontSize: '0.875rem' }}
        onClick={handleConfirm}
        disabled={!label.trim() || (phases.length === 0 && !newPhaseName.trim())}
      >
        Confirmer et démarrer
      </button>
    </div>
  );
}
