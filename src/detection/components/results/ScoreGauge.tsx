import React from 'react';
import { getScoreColor, getScoreLabel } from '../../engine/baremes';

interface ScoreGaugeProps {
  score: number;
  label: string;
  rawValue?: number;
  unit?: string;
}

export function ScoreGauge({ score, label, rawValue, unit }: ScoreGaugeProps) {
  const color = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const pct = Math.min(100, Math.max(0, (score / 5) * 100));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        {rawValue !== undefined && unit && (
          <span className="font-mono text-foreground">
            {rawValue} <span className="text-muted-foreground">{unit}</span>
          </span>
        )}
      </div>
      <div className="relative h-8 overflow-hidden rounded-md bg-muted">
        <div
          className="h-full rounded-md transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: `${color}33` }}
        />
        <div
          className="absolute inset-0 flex items-center justify-between px-2"
        >
          <span className="text-xs font-medium" style={{ color }}>
            {scoreLabel}
          </span>
          <span className="text-xs font-bold" style={{ color }}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
