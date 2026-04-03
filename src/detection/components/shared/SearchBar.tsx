import React from 'react';
import { Input } from '@/components/ui/input';
import { useDetectionStore } from '../../stores/detection-store';

export function SearchBar() {
  const { filterSearch, setFilterSearch } = useDetectionStore();
  return (
    <Input
      type="search"
      placeholder="Rechercher un joueur..."
      value={filterSearch}
      onChange={(e) => setFilterSearch(e.target.value)}
      className="w-full max-w-xs"
    />
  );
}
