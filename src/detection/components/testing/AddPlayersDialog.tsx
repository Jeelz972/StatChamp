import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
import type { AgeCategory, Gender } from '../../types/detection';

interface AddPlayersDialogProps {
  onClose: () => void;
}

const CATEGORIES: (AgeCategory | 'all')[] = ['all', 'U11', 'U13', 'U15', 'U17', 'U18', 'U21', 'Senior'];

export function AddPlayersDialog({ onClose }: AddPlayersDialogProps) {
  const { players, sessions, activeSessionId } = useDetectionStore();

  const session = sessions.find((s) => s.id === activeSessionId);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<AgeCategory | 'all'>('all');
  const [filterGender, setFilterGender] = useState<Gender | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set<string>(session?.playerIds ?? []));
  const [saving, setSaving] = useState(false);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        search === '' ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase());
      const matchesCat = filterCat === 'all' || p.category === filterCat;
      const matchesGender = filterGender === 'all' || p.gender === filterGender;
      return matchesSearch && matchesCat && matchesGender;
    });
  }, [players, search, filterCat, filterGender]);

  function toggle(id: string, alreadyIn: boolean) {
    if (alreadyIn) return; // Can't uncheck already-in players
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    const updated: typeof session = { ...session, playerIds: [...selected] as string[], updatedAt: new Date().toISOString() };
    await DetectionDB.saveSession(updated);
    onClose();
  }

  const existingIds: string[] = session?.playerIds ?? [];
  const newCount = [...selected].filter((id) => !existingIds.includes(id)).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des joueurs à la session</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {/* Inline filters */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'M', 'F'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setFilterGender(g)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  filterGender === g
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border text-muted-foreground hover:border-accent/50'
                }`}
              >
                {g === 'all' ? 'Tous' : g === 'M' ? 'Masc.' : 'Fém.'}
              </button>
            ))}
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  filterCat === cat
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border text-muted-foreground hover:border-accent/50'
                }`}
              >
                {cat === 'all' ? 'Tout' : cat}
              </button>
            ))}
          </div>

          {/* Player list */}
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {filteredPlayers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun joueur trouvé.</p>
            ) : (
              filteredPlayers.map((player) => {
                const alreadyIn = session?.playerIds.includes(player.id) ?? false;
                const isChecked = selected.has(player.id);
                return (
                  <label
                    key={player.id}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/5 ${alreadyIn ? 'opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={alreadyIn}
                      onChange={() => toggle(player.id, alreadyIn)}
                      className="h-4 w-4 accent-[oklch(0.7_0.18_45)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {player.category} · {player.gender === 'M' ? 'Masc.' : 'Fém.'}
                        {player.club ? ` · ${player.club}` : ''}
                      </p>
                    </div>
                    {alreadyIn && (
                      <span className="text-xs text-emerald-400 font-medium">Déjà ajouté</span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleSave}
            disabled={saving || newCount === 0}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving ? 'Sauvegarde…' : `Ajouter ${newCount > 0 ? newCount : ''} joueur${newCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
