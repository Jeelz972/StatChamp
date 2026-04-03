import React from 'react';
import { Button } from '@/components/ui/button';
import { useDetectionStore } from '../../stores/detection-store';
import type { Gender } from '../../types/detection';

const OPTIONS: { value: Gender | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'M', label: 'M' },
  { value: 'F', label: 'F' },
];

export function GenderFilter() {
  const { filterGender, setFilterGender } = useDetectionStore();
  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={filterGender === opt.value ? 'default' : 'outline'}
          onClick={() => setFilterGender(opt.value)}
          className="h-7 px-2 text-xs"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
