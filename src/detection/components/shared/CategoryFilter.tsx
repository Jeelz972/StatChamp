import React from 'react';
import { Button } from '@/components/ui/button';
import { useDetectionStore } from '../../stores/detection-store';
import type { AgeCategory } from '../../types/detection';

const CATEGORIES: (AgeCategory | 'all')[] = ['all', 'U11', 'U13', 'U15', 'U17', 'U18', 'U21', 'Senior'];

export function CategoryFilter() {
  const { filterCategory, setFilterCategory } = useDetectionStore();
  return (
    <div className="flex flex-wrap gap-1">
      {CATEGORIES.map((cat) => (
        <Button
          key={cat}
          size="sm"
          variant={filterCategory === cat ? 'default' : 'outline'}
          onClick={() => setFilterCategory(cat)}
          className="h-7 px-2 text-xs"
        >
          {cat === 'all' ? 'Tous' : cat}
        </Button>
      ))}
    </div>
  );
}
