import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDetectionStore } from '../../stores/detection-store';
import { DetectionDB } from '../../db/detection-firebase';
import type { AgeCategory, Gender } from '../../types/detection';

function computeCategory(birthDate: string): AgeCategory {
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  if (age <= 10) return 'U11';
  if (age <= 12) return 'U13';
  if (age <= 14) return 'U15';
  if (age <= 16) return 'U17';
  if (age <= 17) return 'U18';
  if (age <= 20) return 'U21';
  return 'Senior';
}

const POSITIONS = ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot'];

export function PlayerQuickAdd() {
  const { setShowPlayerCreate } = useDetectionStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [club, setClub] = useState('');
  const [position, setPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const autoCategory = birthDate ? computeCategory(birthDate) : null;

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError('Prénom et nom requis.'); return; }
    if (!birthDate) { setError('Date de naissance requise.'); return; }

    setSaving(true);
    setError('');

    const player = {
      id: `p_${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate,
      gender,
      category: computeCategory(birthDate),
      club: club.trim() || undefined,
      position: position || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      await DetectionDB.savePlayer(player);
      setShowPlayerCreate(false);
    } catch {
      setError('Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && setShowPlayerCreate(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un joueur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prénom *</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom *</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date de naissance *</label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              {autoCategory && (
                <p className="text-xs text-muted-foreground">
                  Catégorie auto :{' '}
                  <span className="font-semibold text-accent">{autoCategory}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Genre *</label>
              <div className="flex gap-2 pt-1">
                {(['M', 'F'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                      gender === g
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Club</label>
              <Input value={club} onChange={(e) => setClub(e.target.value)} placeholder="Nom du club" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Poste</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">— Poste —</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations libres…" />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowPlayerCreate(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? 'Ajout…' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
