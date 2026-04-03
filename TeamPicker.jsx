import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from './src/stores/auth-store';
import { useDataStore } from './src/stores/data-store';
import { DB } from './src/db/firebase';

export default function TeamPicker() {
  const isRoot = useAuthStore((s) => s.isRoot);
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const availableTeams = useAuthStore((s) => s.availableTeams);
  const setAvailableTeams = useAuthStore((s) => s.setAvailableTeams);
  const setTeam = useAuthStore((s) => s.setTeam);

  const setPlayers = useDataStore((s) => s.setPlayers);
  const setGames = useDataStore((s) => s.setGames);
  const setPhases = useDataStore((s) => s.setPhases);
  const setSeasons = useDataStore((s) => s.setSeasons);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Si on n'est pas root ou que les équipes sont déjà chargées, on ignore
    if (!isRoot || availableTeams.length > 0) return;

    const initTeams = async () => {
      try {
        let teams = [];
        // On tente de récupérer les équipes depuis Firebase (si implémenté)
        if (DB && typeof DB.getTeams === 'function') {
          teams = await DB.getTeams();
        }

        // SYSTÈME DE MERGE / BACKWARD COMPATIBILITY
        // Si aucune équipe n'existe, on crée des équipes virtuelles pour la transition
        if (!teams || teams.length === 0) {
          teams = [
            { id: 'legacy_team', name: 'Équipe Principale (Anciennes données)' },
            { id: 'test_team', name: 'Équipe B (Test Supabase)' },
          ];
        }
        setAvailableTeams(teams);

        // Auto-sélection de l'ancienne base pour débloquer l'UI immédiatement
        const current = useAuthStore.getState().currentTeamId;
        if (!current) {
          setTeam('legacy_team');
        }
      } catch (error) {
        console.error('Erreur chargement équipes, fallback sur le mode legacy:', error);
        // Fallback de sécurité strict en cas d'erreur de permissions Firebase
        const fallbackTeams = [
          { id: 'legacy_team', name: 'Équipe Principale (Anciennes données)' },
        ];
        setAvailableTeams(fallbackTeams);
        setTeam('legacy_team');
      }
    };

    initTeams();
  }, [isRoot]); // On enlève les dépendances non nécessaires pour éviter les boucles

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isRoot) return null;

  const currentTeam = availableTeams.find((t) => t.id === currentTeamId);
  const label = currentTeam?.name || 'Choisir une équipe';

  const handleSelect = (teamId) => {
    setOpen(false);
    // Reset stores avant de changer d'équipe pour ne pas polluer le state
    setPlayers([]);
    setGames([]);
    setPhases([]);
    setSeasons([]);
    setTeam(teamId);
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: '0.75rem',
        right: '0.75rem',
        zIndex: 200,
        userSelect: 'none',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          background: 'var(--bg-3)',
          border: '1px solid var(--border-accent)',
          borderRadius: '0.5rem',
          color: 'var(--accent)',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        <span
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            background: currentTeamId ? '#22c55e' : '#ef4444',
            flexShrink: 0,
          }}
        />
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.375rem)',
            right: 0,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            minWidth: '16rem',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {availableTeams.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
              Chargement…
            </div>
          ) : (
            availableTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelect(team.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.625rem 1rem',
                  background: team.id === currentTeamId ? 'var(--accent-ghost)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: team.id === currentTeamId ? 'var(--accent)' : 'var(--text-1)',
                  fontSize: '0.8125rem',
                  fontWeight: team.id === currentTeamId ? 700 : 400,
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: team.id === currentTeamId ? 'var(--accent)' : 'var(--text-3)',
                  }}
                />
                {team.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
