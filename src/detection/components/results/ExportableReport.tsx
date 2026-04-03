import React from 'react';
import { PlayerRadar } from './PlayerRadar';
import type { PlayerProfile, DetectionPlayer, DetectionSession, PlayerAxisScores } from '../../types/detection';

interface ExportableReportProps {
  profiles: PlayerProfile[];
  players: DetectionPlayer[];
  session: DetectionSession;
}

const AXES: { key: keyof PlayerAxisScores; label: string }[] = [
  { key: 'speed', label: 'Vitesse' },
  { key: 'agility', label: 'Agilité' },
  { key: 'power', label: 'Puissance' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'shooting', label: 'Tir' },
  { key: 'anthropometry', label: 'Anthropo' },
];

function scoreColor(score: number): string {
  if (score === 0) return '#555';
  if (score >= 4.5) return '#22c55e';
  if (score >= 3.5) return '#3b82f6';
  if (score >= 2.5) return '#f59e0b';
  if (score >= 1.5) return '#f97316';
  return '#ef4444';
}

export function ExportableReport({ profiles, players, session }: ExportableReportProps) {
  const sorted = [...profiles].sort((a, b) => b.compositeScore - a.compositeScore);

  return (
    <div
      id="detection-export"
      style={{
        backgroundColor: '#0e0f1a',
        color: '#e8e8f0',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
        minWidth: '1000px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #2a2b3d', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#e8913a', margin: 0 }}>
          StatChamp — Rapport de Détection
        </h1>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
          {session.name}
          {' · '}
          {new Date(session.date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
          {session.location ? ` · ${session.location}` : ''}
        </p>
      </div>

      {/* Ranking table */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#e8e8f0' }}>
          Classement général
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2b3d', color: '#888' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px', width: '24px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Joueur</th>
              <th style={{ textAlign: 'center', padding: '4px 8px' }}>Cat</th>
              <th style={{ textAlign: 'center', padding: '4px 8px', color: '#e8913a' }}>Global</th>
              {AXES.map(({ label }) => (
                <th key={label} style={{ textAlign: 'center', padding: '4px 8px' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((profile, idx) => {
              const player = players.find((p) => p.id === profile.playerId);
              if (!player) return null;
              return (
                <tr
                  key={profile.playerId}
                  style={{ borderBottom: '1px solid #1e1f30' }}
                >
                  <td style={{ padding: '4px 8px', color: '#666', textAlign: 'center' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '4px 8px', fontWeight: 500 }}>
                    {player.lastName} {player.firstName[0]}.
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', color: '#e8913a' }}>
                    {player.category}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                    <span
                      style={{
                        backgroundColor: `${scoreColor(profile.compositeScore)}20`,
                        color: scoreColor(profile.compositeScore),
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {profile.compositeScore.toFixed(1)}
                    </span>
                  </td>
                  {AXES.map(({ key }) => {
                    const s = profile.axisScores[key];
                    return (
                      <td key={key} style={{ padding: '4px 8px', textAlign: 'center' }}>
                        {s > 0 ? (
                          <span style={{ color: scoreColor(s), fontWeight: 500 }}>
                            {s.toFixed(1)}
                          </span>
                        ) : (
                          <span style={{ color: '#444' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Radar grid */}
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#e8e8f0' }}>
          Profils individuels
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {sorted.map((profile) => {
            const player = players.find((p) => p.id === profile.playerId);
            if (!player) return null;
            return (
              <div
                key={profile.playerId}
                style={{
                  border: '1px solid #2a2b3d',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <PlayerRadar profile={profile} player={player} size="sm" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
