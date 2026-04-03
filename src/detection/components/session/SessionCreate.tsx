import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
import { getEligibleTests } from '../../engine/test-catalog';
import type { AgeCategory, Gender } from '../../types/detection';

const ALL_CATEGORIES: AgeCategory[] = ['U11', 'U13', 'U15', 'U17', 'U18', 'U21', 'Senior'];
const ALL_GENDERS: Gender[] = ['M', 'F'];

export function SessionCreate() {
  const { setShowSessionCreate } = useDetectionStore();

  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [categories, setCategories] = useState<AgeCategory[]>([]);
  const [genders, setGenders] = useState<Gender[]>(['M', 'F']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleCategory(cat: AgeCategory) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleGender(g: Gender) {
    setGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  async function handleSave() {
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    if (categories.length === 0) { setError('Sélectionnez au moins une catégorie.'); return; }
    if (genders.length === 0) { setError('Sélectionnez au moins un genre.'); return; }

    setSaving(true);
    setError('');

    // Auto-compute eligible testIds for selected categories
    const testIdSet = new Set<string>();
    for (const cat of categories) {
      getEligibleTests(cat).forEach((t) => testIdSet.add(t.id));
    }

    const session = {
      id: `s_${Date.now()}`,
      name: name.trim(),
      date,
      location: location.trim() || null,
      categories,
      genders,
      playerIds: [],
      testIds: Array.from(testIdSet),
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await DetectionDB.saveSession(session);
      setShowSessionCreate(false);
    } catch (err) {
      console.error('[Detection] Save session error:', err);
      setError('Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && setShowSessionCreate(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Détection Régionale U17"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date *</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Lieu</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Salle, ville…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Catégories *</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    categories.includes(cat)
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-border text-muted-foreground hover:border-accent/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Genre *</label>
            <div className="flex gap-2">
              {ALL_GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGender(g)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    genders.includes(g)
                      ? g === 'M'
                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                        : 'bg-pink-500/20 text-pink-400 ring-1 ring-pink-500/50'
                      : 'border border-border text-muted-foreground hover:border-accent/50'
                  }`}
                >
                  {g === 'M' ? 'Masculin' : 'Féminin'}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowSessionCreate(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? 'Création…' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
