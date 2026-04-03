import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
import { SearchBar } from '../shared/SearchBar';
import { CategoryFilter } from '../shared/CategoryFilter';
import { GenderFilter } from '../shared/GenderFilter';
import type { DetectionPlayer } from '../../types/detection';

const PAGE_SIZE = 20;

export function PlayerRegistry() {
  const { players, filterSearch, filterCategory, filterGender, setShowPlayerCreate } = useDetectionStore();
  const [page, setPage] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        filterSearch === '' ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(filterSearch.toLowerCase());
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      const matchesGender = filterGender === 'all' || p.gender === filterGender;
      return matchesSearch && matchesCategory && matchesGender;
    });
  }, [players, filterSearch, filterCategory, filterGender]);

  // Reset page when filters change
  React.useEffect(() => { setPage(0); }, [filterSearch, filterCategory, filterGender]);

  const pageCount = Math.ceil(filteredPlayers.length / PAGE_SIZE);
  const pagePlayers = filteredPlayers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleDelete(id: string) {
    await DetectionDB.deletePlayer(id);
    setConfirmDeleteId(null);
  }

  function calcAge(birthDate: string) {
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">👤</div>
        <h3 className="mb-2 text-lg font-semibold">Aucun joueur</h3>
        <p className="mb-6 text-sm text-muted-foreground">Ajoutez des joueurs au registre.</p>
        <Button onClick={() => setShowPlayerCreate(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          Ajouter un joueur
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar />
        <GenderFilter />
        <CategoryFilter />
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredPlayers.length} joueur{filteredPlayers.length !== 1 ? 's' : ''}
        {filteredPlayers.length !== players.length && ` sur ${players.length}`}
      </p>

      {/* Desktop table */}
      <div className="hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Âge</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Club</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagePlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Aucun joueur ne correspond aux filtres.
                </TableCell>
              </TableRow>
            ) : (
              pagePlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    {player.firstName} {player.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {calcAge(player.birthDate)} ans
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        player.gender === 'M' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'
                      }`}
                    >
                      {player.gender}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
                      {player.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{player.club ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{player.position ?? '—'}</TableCell>
                  <TableCell>
                    {confirmDeleteId === player.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleDelete(player.id)}>
                          OK
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setConfirmDeleteId(null)}>
                          Non
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground" onClick={() => setConfirmDeleteId(player.id)}>
                        Suppr.
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {pagePlayers.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun joueur ne correspond aux filtres.</p>
        ) : (
          pagePlayers.map((player) => (
            <div key={player.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{player.firstName} {player.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {calcAge(player.birthDate)} ans · {player.club ?? '—'} · {player.position ?? '—'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${player.gender === 'M' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                    {player.gender}
                  </span>
                  <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">{player.category}</span>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                {confirmDeleteId === player.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDelete(player.id)}>Confirmer</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setConfirmDeleteId(player.id)}>
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Préc.
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {pageCount}
          </span>
          <Button size="sm" variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Suiv. →
          </Button>
        </div>
      )}
    </div>
  );
}
