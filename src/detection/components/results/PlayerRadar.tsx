import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { getScoreColor } from '../../engine/baremes';
import type { PlayerProfile, DetectionPlayer } from '../../types/detection';

interface PlayerRadarProps {
  profile: PlayerProfile;
  player: DetectionPlayer;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 200, md: 300, lg: 400 };
const ACCENT = '#e8913a';

const radarDataFromProfile = (profile: PlayerProfile) => [
  { axis: 'Vitesse', value: profile.axisScores.speed, fullMark: 5 },
  { axis: 'Agilité', value: profile.axisScores.agility, fullMark: 5 },
  { axis: 'Puissance', value: profile.axisScores.power, fullMark: 5 },
  { axis: 'Endurance', value: profile.axisScores.endurance, fullMark: 5 },
  { axis: 'Tir', value: profile.axisScores.shooting, fullMark: 5 },
  { axis: 'Mesures', value: profile.axisScores.anthropometry, fullMark: 5 },
];

export function PlayerRadar({ profile, player, size = 'md' }: PlayerRadarProps) {
  const dim = SIZE_MAP[size];
  const radarData = radarDataFromProfile(profile);
  const compositeColor = getScoreColor(profile.compositeScore);
  const fontSize = size === 'sm' ? 10 : 12;

  return (
    <div className="flex flex-col items-center gap-2">
      <RadarChart
        width={dim}
        height={dim}
        data={radarData}
        margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
      >
        <PolarGrid stroke="var(--border, #2a2b3d)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: 'var(--muted-foreground, #888)', fontSize }}
        />
        <Radar
          name={`${player.firstName} ${player.lastName}`}
          dataKey="value"
          stroke={ACCENT}
          fill={ACCENT}
          fillOpacity={0.3}
          dot={{ r: 3, fill: ACCENT }}
        />
      </RadarChart>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className={`font-semibold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {player.firstName} {player.lastName}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
            {player.category}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: `${compositeColor}20`, color: compositeColor }}
          >
            {profile.compositeScore.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

export { radarDataFromProfile };
