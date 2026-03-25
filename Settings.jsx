import React, { useState, useMemo } from 'react';
import { useDataStore } from './src/stores/data-store';
import { useAuthStore } from './src/stores/auth-store';

const generateId = () => Math.random().toString(36).substr(2, 9);

const POSITIONS = ['Meneur', 'Arrière', 'Ailier', 'Ailier-fort', 'Pivot'];

// ─── Styles partagés ────────────────────────────────────────────

const inputStyle = {
  background: 'var(--bg-3)', border: '1px solid var(--border)',
  color: 'var(--text-1)', borderRadius: '0.375rem',
  padding: '0.4375rem 0.75rem', fontSize: '0.875rem',
  outline: 'none', width: '100%',
};

const selectStyle = {
  ...inputStyle, cursor: 'pointer',
};

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600,
        borderRadius: '0.375rem 0.375rem 0 0', border: 'none', cursor: 'pointer',
        background: active ? 'var(--bg-2)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-3)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 1 — EFFECTIF
// ═══════════════════════════════════════════════════════════════

function RosterTab() {
  const players = useDataStore((s) => s.players);
  const setPlayers = useDataStore((s) => s.setPlayers);
  const activeSeason = useDataStore((s) => s.activeSeason);
  const rosterForSeason = useDataStore((s) => s.rosterForSeason);
  const isAdmin = useAuthStore((s) => s.isAdmin); // eslint-disable-line

  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('Meneur');
  const [showExisting, setShowExisting] = useState(false);

  const saveRoster = (updatedPlayers) => {
    setPlayers(updatedPlayers);
    if ((window).db) {
      (window).DB?.saveRoster(updatedPlayers);
    }
  };

  const seasonRoster = useMemo(
    () => (activeSeason?.id ? rosterForSeason(activeSeason.id) : []),
    [activeSeason, rosterForSeason, players]
  );

  // Joueurs hors saison active (ont des seasonIds explicites qui n'incluent pas la saison active)
  const outOfSeasonPlayers = useMemo(() => {
    if (!activeSeason?.id) return [];
    return players.filter(
      (p) => p.seasonIds && p.seasonIds.length > 0 && !p.seasonIds.includes(activeSeason.id)
    );
  }, [players, activeSeason]);

  if (!activeSeason) {
    return (
      <div className="sc-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ marginBottom: '1rem' }}>Aucune saison active.</div>
        <div style={{ fontSize: '0.875rem' }}>
          Créez-en une dans l'onglet{' '}
          <strong style={{ color: 'var(--accent)' }}>Saisons & Phases</strong>.
        </div>
      </div>
    );
  }

  const updatePlayer = (id, field, value) => {
    const updated = players.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    saveRoster(updated);
  };

  const removeFromSeason = (playerId) => {
    const updated = players.map((p) =>
      p.id === playerId
        ? { ...p, seasonIds: (p.seasonIds || []).filter((sid) => sid !== activeSeason.id) }
        : p
    );
    saveRoster(updated);
  };

  const deletePlayer = (playerId) => {
    if (!confirm('Supprimer définitivement ce joueur ?')) return;
    saveRoster(players.filter((p) => p.id !== playerId));
  };

  const addToSeason = (playerId) => {
    const updated = players.map((p) =>
      p.id === playerId
        ? { ...p, seasonIds: [...(p.seasonIds || []), activeSeason.id] }
        : p
    );
    saveRoster(updated);
  };

  const addNewPlayer = () => {
    if (!newName.trim()) return;
    const maxId = players.reduce((max, p) => Math.max(max, p.id), 0);
    const newPlayer = {
      id: maxId + 1,
      name: newName.trim(),
      number: newNumber.trim() || '0',
      pos: newPos,
      status: 'available',
      seasonIds: [activeSeason.id],
    };
    saveRoster([...players, newPlayer]);
    setNewName('');
    setNewNumber('');
    setNewPos('Meneur');
  };

  return (
    <div>
      <div className="sc-card" style={{ marginBottom: '1rem' }}>
        <div className="sc-card-header">
          Effectif — {activeSeason.label || activeSeason.name}
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-2)', textTransform: 'none', fontWeight: 500 }}>
            ({seasonRoster.length} joueur{seasonRoster.length > 1 ? 's' : ''})
          </span>
        </div>
        <div style={{ padding: '0.75rem' }}>
          {seasonRoster.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
              Aucun joueur dans cette saison
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {seasonRoster.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  onUpdateField={updatePlayer}
                  onRemoveFromSeason={() => removeFromSeason(p.id)}
                  onDelete={() => deletePlayer(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Formulaire ajout */}
      <div className="sc-card" style={{ marginBottom: '1rem' }}>
        <div className="sc-card-header">Ajouter un nouveau joueur</div>
        <div style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>Nom *</div>
            <input
              style={inputStyle}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewPlayer()}
              placeholder="Nom du joueur"
            />
          </div>
          <div style={{ flex: '0 0 80px' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>#</div>
            <input
              style={inputStyle}
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="00"
              maxLength={3}
            />
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 700 }}>Poste</div>
            <select style={selectStyle} value={newPos} onChange={(e) => setNewPos(e.target.value)}>
              {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
            </select>
          </div>
          <button className="sc-btn-accent" onClick={addNewPlayer} style={{ flexShrink: 0 }}>
            Ajouter
          </button>
        </div>
      </div>

      {/* Ajouter un joueur existant */}
      {outOfSeasonPlayers.length > 0 && (
        <div className="sc-card">
          <div className="sc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Ajouter un joueur existant</span>
            <button
              onClick={() => setShowExisting((v) => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
            >
              {showExisting ? 'Masquer' : `Voir (${outOfSeasonPlayers.length})`}
            </button>
          </div>
          {showExisting && (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {outOfSeasonPlayers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.5rem 0.75rem', background: 'var(--bg-3)',
                    borderRadius: '0.375rem', border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', width: '2rem', textAlign: 'right' }}>#{p.number}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-1)', fontSize: '0.875rem' }}>{p.name}</span>
                  {p.pos && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.pos}</span>}
                  <button
                    className="sc-btn-accent"
                    onClick={() => addToSeason(p.id)}
                    style={{ padding: '0.25rem 0.625rem', fontSize: '0.6875rem' }}
                  >
                    Ajouter à la saison
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player, onUpdateField, onRemoveFromSeason, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.4375rem 0.625rem', background: 'var(--bg-3)',
      borderRadius: '0.375rem', border: '1px solid var(--border)',
    }}>
      <input
        style={{ ...inputStyle, width: '3rem', padding: '0.25rem 0.375rem', textAlign: 'center', flexShrink: 0 }}
        value={player.number}
        onChange={(e) => onUpdateField(player.id, 'number', e.target.value)}
        maxLength={3}
      />
      <input
        style={{ ...inputStyle, flex: 1, padding: '0.25rem 0.5rem' }}
        value={player.name}
        onChange={(e) => onUpdateField(player.id, 'name', e.target.value)}
      />
      <select
        style={{ ...selectStyle, width: '9rem', padding: '0.25rem 0.375rem', fontSize: '0.75rem' }}
        value={player.pos || ''}
        onChange={(e) => onUpdateField(player.id, 'pos', e.target.value)}
      >
        <option value="">— Poste —</option>
        {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
      </select>
      <select
        style={{ ...selectStyle, width: '8rem', padding: '0.25rem 0.375rem', fontSize: '0.75rem' }}
        value={player.status || 'available'}
        onChange={(e) => onUpdateField(player.id, 'status', e.target.value)}
      >
        <option value="available">Disponible</option>
        <option value="injured">Blessé</option>
        <option value="doubtful">Incertain</option>
        <option value="rest">Repos</option>
        <option value="sanction">Sanction</option>
      </select>
      <button
        onClick={onRemoveFromSeason}
        title="Retirer de la saison"
        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.6875rem', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        Retirer
      </button>
      <button
        onClick={onDelete}
        title="Supprimer définitivement"
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 2 — SYSTÈMES DE JEU
// ═══════════════════════════════════════════════════════════════

function PlaysTab() {
  const playTypes = useDataStore((s) => s.playTypes);
  const setPlayTypes = useDataStore((s) => s.setPlayTypes);
  const [newPlay, setNewPlay] = useState('');

  const savePlayTypes = (updated) => {
    setPlayTypes(updated);
    if ((window).db) {
      (window).DB?.saveConfig({ playTypes: updated });
    }
    localStorage.setItem('basket_play_types', JSON.stringify(updated));
  };

  const addPlay = () => {
    const trimmed = newPlay.trim();
    if (!trimmed || playTypes.includes(trimmed)) return;
    savePlayTypes([...playTypes, trimmed]);
    setNewPlay('');
  };

  return (
    <div className="sc-card">
      <div className="sc-card-header">Systèmes de jeu disponibles en match live</div>
      <div style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
          {playTypes.map((pt, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem', background: 'var(--bg-3)',
                borderRadius: '0.375rem', border: '1px solid var(--border)',
              }}
            >
              <span style={{ flex: 1, color: 'var(--text-1)', fontSize: '0.875rem', fontWeight: 500 }}>{pt}</span>
              <button
                onClick={() => savePlayTypes(playTypes.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Nouveau système..."
            value={newPlay}
            onChange={(e) => setNewPlay(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlay()}
          />
          <button className="sc-btn-accent" onClick={addPlay}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET 3 — SAISONS & PHASES
// ═══════════════════════════════════════════════════════════════

function SeasonsTab() {
  const seasons = useDataStore((s) => s.seasons);
  const setSeasons = useDataStore((s) => s.setSeasons);
  const phases = useDataStore((s) => s.phases);
  const setPhases = useDataStore((s) => s.setPhases);
  const activeSeason = useDataStore((s) => s.activeSeason);
  const setActiveSeason = useDataStore((s) => s.setActiveSeason);
  const isRoot = useAuthStore((s) => s.isRoot);

  const [newSeasonLabel, setNewSeasonLabel] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [newPhaseName, setNewPhaseName] = useState('');

  // Saison sélectionnée pour édition des phases (par défaut : saison active)
  const selectedSeason = useMemo(
    () => seasons.find((s) => s.id === selectedSeasonId) || activeSeason || null,
    [seasons, selectedSeasonId, activeSeason]
  );

  // Phases de la saison sélectionnée (depuis le store global par seasonId)
  const phasesForSelected = useMemo(
    () => phases.filter((p) => p.seasonId === selectedSeason?.id),
    [phases, selectedSeason]
  );

  const saveSeasons = (updated) => {
    setSeasons(updated);
    if ((window).db) {
      (window).DB?.saveSeasons(updated);
    }
  };

  const createSeason = () => {
    const label = newSeasonLabel.trim();
    if (!label) return;
    if (seasons.some((s) => (s.label || s.name) === label)) {
      alert('Une saison avec ce nom existe déjà');
      return;
    }
    const newSeason = { id: generateId(), label, name: label, phases: [], roster: [], games: [] };
    const updated = [...seasons, newSeason];
    saveSeasons(updated);
    setNewSeasonLabel('');
    // Activer automatiquement si c'est la première saison non archivée
    if (!activeSeason) {
      setActiveSeason(newSeason);
    }
  };

  const activateSeason = (season) => {
    setActiveSeason(season);
  };

  const archiveSeason = (season) => {
    if (!confirm(`Archiver la saison "${season.label || season.name}" ?`)) return;
    const updated = seasons.map((s) =>
      s.id === season.id ? { ...s, archived: true, archivedAt: new Date().toISOString() } : s
    );
    saveSeasons(updated);
    if (activeSeason?.id === season.id) {
      const next = updated.find((s) => !s.archived && !s.archivedAt) || null;
      setActiveSeason(next);
    }
  };

  const deleteSeason = (season) => {
    if (activeSeason?.id === season.id) {
      alert('Désactivez ou changez de saison active avant de supprimer.');
      return;
    }
    if (!confirm(`Supprimer la saison "${season.label || season.name}" ? Les phases associées seront également supprimées. Les matchs ne seront pas supprimés mais ne seront plus rattachés à aucune saison.`)) return;
    const updatedSeasons = seasons.filter((s) => s.id !== season.id);
    saveSeasons(updatedSeasons);
    const updatedPhases = phases.filter((p) => p.seasonId !== season.id);
    setPhases(updatedPhases);
    if ((window).db) (window).DB?.savePhases(updatedPhases);
  };

  // ── Phases de la saison sélectionnée ──

  const addPhase = () => {
    if (!selectedSeason || !newPhaseName.trim()) return;
    const newPhase = {
      id: `phase_${generateId()}`,
      name: newPhaseName.trim(),
      seasonId: selectedSeason.id,
    };
    // Update embedded season phases (retrocompat)
    const embeddedUpdated = [...(selectedSeason.phases || []), newPhase];
    const updatedSeasons = seasons.map((s) =>
      s.id === selectedSeason.id ? { ...s, phases: embeddedUpdated } : s
    );
    saveSeasons(updatedSeasons);
    // Add to global flat phases store
    const updatedPhases = [...phases, newPhase];
    setPhases(updatedPhases);
    if ((window).db) (window).DB?.savePhases(updatedPhases);
    setNewPhaseName('');
  };

  const removePhase = (phaseId) => {
    if (!selectedSeason) return;
    // Remove from embedded season phases (retrocompat)
    const embeddedUpdated = (selectedSeason.phases || []).filter((p) => p.id !== phaseId);
    const updatedSeasons = seasons.map((s) =>
      s.id === selectedSeason.id ? { ...s, phases: embeddedUpdated } : s
    );
    saveSeasons(updatedSeasons);
    // Remove from global flat phases store
    const updatedPhases = phases.filter((p) => p.id !== phaseId);
    setPhases(updatedPhases);
    if ((window).db) (window).DB?.savePhases(updatedPhases);
  };

  return (
    <div>
      {/* ── Liste des saisons ── */}
      <div className="sc-card" style={{ marginBottom: '1rem' }}>
        <div className="sc-card-header">Saisons</div>
        <div style={{ padding: '0.75rem' }}>
          {seasons.length === 0 ? (
            <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
              Aucune saison créée
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {seasons.map((s) => {
                const isActive = activeSeason?.id === s.id;
                const isArchived = s.archived || !!s.archivedAt;
                const label = s.label || s.name;
                const isSelected = selectedSeason?.id === s.id;
                return (
                  <div
                    key={s.id || s.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                      background: isSelected ? 'rgba(255,107,53,0.06)' : 'var(--bg-3)',
                      border: `1px solid ${isSelected ? 'var(--border-accent, var(--accent))' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedSeasonId(s.id || null)}
                  >
                    <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-1)', fontSize: '0.875rem' }}>
                      {label}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700, padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem', background: 'rgba(255,107,53,0.15)',
                        color: 'var(--accent)', border: '1px solid rgba(255,107,53,0.3)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        Active
                      </span>
                    )}
                    {isArchived && !isActive && (
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Archivée
                      </span>
                    )}
                    {!isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); activateSeason(s); }}
                        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '0.25rem', padding: '0.125rem 0.5rem', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        Activer
                      </button>
                    )}
                    {!isArchived && (
                      <button
                        onClick={(e) => { e.stopPropagation(); archiveSeason(s); }}
                        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', borderRadius: '0.25rem', padding: '0.125rem 0.5rem', cursor: 'pointer', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}
                      >
                        Archiver
                      </button>
                    )}
                    {isRoot && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSeason(s); }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.6875rem', padding: '0.125rem 0.25rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Formulaire création saison */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Nom de la saison (ex : 2025-2026)"
              value={newSeasonLabel}
              onChange={(e) => setNewSeasonLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSeason()}
            />
            <button className="sc-btn-accent" onClick={createSeason}>Créer</button>
          </div>
        </div>
      </div>

      {/* ── Phases de la saison sélectionnée ── */}
      {selectedSeason && (
        <div className="sc-card">
          <div className="sc-card-header">
            Phases — {selectedSeason.label || selectedSeason.name}
          </div>
          <div style={{ padding: '0.75rem' }}>
            {phasesForSelected.length === 0 ? (
              <div style={{ padding: '0.5rem 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                Aucune phase définie
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
                {phasesForSelected.map((ph) => (
                  <div
                    key={ph.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.4375rem 0.75rem', background: 'var(--bg-3)',
                      borderRadius: '0.375rem', border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ flex: 1, color: 'var(--text-1)', fontSize: '0.875rem', fontWeight: 500 }}>{ph.name}</span>
                    <button
                      onClick={() => removePhase(ph.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Nouvelle phase..."
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPhase()}
              />
              <button className="sc-btn-accent" onClick={addPhase}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function Settings() {
  const [activeTab, setActiveTab] = useState('roster');

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
      {/* Barre d'onglets */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
        <TabBtn active={activeTab === 'roster'} onClick={() => setActiveTab('roster')}>
          Effectif
        </TabBtn>
        <TabBtn active={activeTab === 'plays'} onClick={() => setActiveTab('plays')}>
          Systèmes de jeu
        </TabBtn>
        <TabBtn active={activeTab === 'seasons'} onClick={() => setActiveTab('seasons')}>
          Saisons &amp; Phases
        </TabBtn>
      </div>

      {activeTab === 'roster'  && <RosterTab />}
      {activeTab === 'plays'   && <PlaysTab />}
      {activeTab === 'seasons' && <SeasonsTab />}
    </div>
  );
}
