import React from 'react';
import { getScoreColor, getScoreLabel } from '../../engine/baremes';

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, showLabel = false, size = 'md' }: ScoreBadgeProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const bg = `${color}20`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
      style={{ backgroundColor: bg, color }}
    >
      {score.toFixed(1)}
      {showLabel && <span className="font-normal opacity-80">{label}</span>}
    </span>
  );
}
