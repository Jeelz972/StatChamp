import React from 'react';
import { Zap, Footprints, Flame, Heart, Target, Ruler } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TestCategory } from '../../types/detection';

interface TestCategoryTabsProps {
  activeCategory: TestCategory;
  onCategoryChange: (cat: TestCategory) => void;
  counts?: Partial<Record<TestCategory, { filled: number; total: number }>>;
}

const TABS: { id: TestCategory; label: string; Icon: React.ElementType }[] = [
  { id: 'speed', label: 'Vitesse', Icon: Zap },
  { id: 'agility', label: 'Agilité', Icon: Footprints },
  { id: 'power', label: 'Puissance', Icon: Flame },
  { id: 'endurance', label: 'Endurance', Icon: Heart },
  { id: 'shooting', label: 'Tir', Icon: Target },
  { id: 'anthropometry', label: 'Mesures', Icon: Ruler },
];

export function TestCategoryTabs({ activeCategory, onCategoryChange, counts }: TestCategoryTabsProps) {
  return (
    <Tabs value={activeCategory} onValueChange={(v) => onCategoryChange(v as TestCategory)}>
      <div className="overflow-x-auto">
        <TabsList className="inline-flex w-max gap-0.5 rounded-lg bg-muted p-1">
          {TABS.map(({ id, label, Icon }) => {
            const c = counts?.[id];
            return (
              <TabsTrigger
                key={id}
                value={id}
                className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
                {c && (
                  <span
                    className={`ml-1 rounded-full px-1.5 text-xs font-medium ${
                      c.filled === c.total && c.total > 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : c.filled > 0
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}
                  >
                    {c.filled}/{c.total}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}
