// app.js - Application Complète Stats Basketball
const { useState, useEffect } = React;

// Configuration des constantes
const ZONES = [
{ id: ‘gauche_0’, name: ‘Gauche 0°’, color: ‘#3b82f6’ },
{ id: ‘droit_0’, name: ‘Droit 0°’, color: ‘#ec4899’ },
{ id: ‘gauche_45’, name: ‘Gauche 45°’, color: ‘#10b981’ },
{ id: ‘droit_45’, name: ‘Droit 45°’, color: ‘#f59e0b’ },
{ id: ‘gauche_70’, name: ‘Gauche 70°’, color: ‘#06b6d4’ },
{ id: ‘droit_70’, name: ‘Droit 70°’, color: ‘#ef4444’ },
{ id: ‘axe’, name: ‘Axe’, color: ‘#6366f1’ }
];

const PLAYERS = [
{ id: 1, name: ‘Maxime’ },
{ id: 2, name: ‘Sasha’ },
{ id: 3, name: ‘Théotime’ },
{ id: 4, name: ‘Noé’ },
{ id: 5, name: ‘Keziah’ },
{ id: 6, name: ‘Nathan’ },
{ id: 7, name: ‘Valentin’ },
{ id: 8, name: ‘Jad’ },
{ id: 9, name: ‘Marco’ },
{ id: 10, name: ‘Thierno’ },
{ id: 11, name: ‘Peniel’ },
{ id: 12, name: ‘Nat’ }
];

function BasketballStatsApp() {
const [activeModule, setActiveModule] = useState(‘shooting’); // shooting, team, history
const [shots, setShots] = useState({});
const [teamStats, setTeamStats] = useState([]);
const [currentMatchStats, setCurrentMatchStats] = useState({
date: new Date().toISOString().split(‘T’)[0],
time: new Date().toLocaleTimeString(‘fr-FR’, { hour: ‘2-digit’, minute: ‘2-digit’ }),
nous: {
troisPoints: { marques: 0, tentes: 0 },
lancersFrancs: { marques: 0, tentes: 0 },
rebondsOffensifs: { pris: 0, marques: 0 },
pertesDeBalle: { total: 0, paniersEncaisses: 0 },
paniersFaciles: 0,
statsIndividuelles: {}
},
adversaire: {
nom: ‘’,
troisPoints: { marques: 0, tentes: 0 },
rebonds: { subis: 0, marques: 0 }
}
});

// Chargement initial des données
useEffect(() => {
loadAllData();
}, []);

const loadAllData = () => {
  try {
    // Initialiser les états avec des valeurs par défaut
    let initialShots = {};
    let initialTeamStats = [];
    
    // Tenter de charger les données du localStorage
    const savedShots = localStorage.getItem('basketball_shots');
    const savedTeamStats = localStorage.getItem('basketball_team_stats');
    
    // Si des données existent, les parser, sinon garder les valeurs par défaut
    if (savedShots) {
      try {
        const parsedShots = JSON.parse(savedShots);
        if (parsedShots && typeof parsedShots === 'object') {
          initialShots = parsedShots;
        }
      } catch (parseError) {
        console.log('Erreur de parsing des tirs:', parseError);
      }
    }
    
    if (savedTeamStats) {
      try {
        const parsedTeamStats = JSON.parse(savedTeamStats);
        if (Array.isArray(parsedTeamStats)) {
          initialTeamStats = parsedTeamStats;
        }
      } catch (parseError) {
        console.log('Erreur de parsing des stats d\'équipe:', parseError);
      }
    }
    
    // Mettre à jour les états avec les données chargées ou les valeurs par défaut
    setShots(initialShots);
    setTeamStats(initialTeamStats);
    
  } catch (error) {
    // En cas d'erreur, initialiser avec des valeurs par défaut
    console.log('Initialisation avec des valeurs par défaut');
    setShots({});
    setTeamStats([]);
  }
};

```
  if (savedShots) setShots(JSON.parse(savedShots));
  if (savedTeamStats) setTeamStats(JSON.parse(savedTeamStats));
} catch (error) {
  console.log('Initialisation des données');
}
```

};

const saveShots = (newShots) => {
setShots(newShots);
localStorage.setItem(‘basketball_shots’, JSON.stringify(newShots));
};

const saveTeamStats = (newStats) => {
setTeamStats(newStats);
localStorage.setItem(‘basketball_team_stats’, JSON.stringify(newStats));
};

const exportAllDataToCSV = () => {
let csv = ‘=== STATISTIQUES DE TIR ===\n’;
csv += ‘Joueur,Zone,Tirs Tentés,Tirs Marqués,Pourcentage\n’;

```
PLAYERS.forEach(player => {
  const playerShots = shots[player.id] || {};
  ZONES.forEach(zone => {
    const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
    if (zoneData.tentes > 0) {
      const pct = ((zoneData.marques / zoneData.tentes) * 100).toFixed(1);
      csv += `${player.name},${zone.name},${zoneData.tentes},${zoneData.marques},${pct}%\n`;
    }
  });
});

csv += '\n=== STATISTIQUES D\'ÉQUIPE PAR MATCH ===\n';
csv += 'Date,Heure,Adversaire,3pts Nous,LF Nous,Reb Off,Pertes,Paniers Faciles,3pts Adv,Reb Adv\n';

teamStats.forEach(match => {
  const nous = match.nous;
  const adv = match.adversaire;
  csv += `${match.date},${match.time},${adv.nom || 'N/A'},`;
  csv += `${nous.troisPoints.marques}/${nous.troisPoints.tentes},`;
  csv += `${nous.lancersFrancs.marques}/${nous.lancersFrancs.tentes},`;
  csv += `${nous.rebondsOffensifs.pris}(${nous.rebondsOffensifs.marques}),`;
  csv += `${nous.pertesDeBalle.total}(${nous.pertesDeBalle.paniersEncaisses}),`;
  csv += `${nous.paniersFaciles},`;
  csv += `${adv.troisPoints.marques}/${adv.troisPoints.tentes},`;
  csv += `${adv.rebonds.subis}(${adv.rebonds.marques})\n`;
});

const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `stats_basketball_complet_${new Date().toISOString().split('T')[0]}.csv`;
link.click();
```

};

const resetAllData = () => {
if (confirm(‘Êtes-vous sûr de vouloir effacer TOUTES les données (tirs et matchs) ?’)) {
setShots({});
setTeamStats([]);
setCurrentMatchStats({
date: new Date().toISOString().split(‘T’)[0],
time: new Date().toLocaleTimeString(‘fr-FR’, { hour: ‘2-digit’, minute: ‘2-digit’ }),
nous: {
troisPoints: { marques: 0, tentes: 0 },
lancersFrancs: { marques: 0, tentes: 0 },
rebondsOffensifs: { pris: 0, marques: 0 },
pertesDeBalle: { total: 0, paniersEncaisses: 0 },
paniersFaciles: 0,
statsIndividuelles: {}
},
adversaire: {
nom: ‘’,
troisPoints: { marques: 0, tentes: 0 },
rebonds: { subis: 0, marques: 0 }
}
});
localStorage.removeItem(‘basketball_shots’);
localStorage.removeItem(‘basketball_team_stats’);
}
};

return (
<div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
{/* Header avec Navigation */}
<div className="bg-gradient-to-r from-orange-600 to-blue-600 p-4 text-white shadow-lg">
<div className="max-w-7xl mx-auto">
<h1 className="text-3xl font-bold mb-4">🏀 Stats Basketball Pro</h1>
<div className="flex flex-wrap gap-2">
<button
onClick={() => setActiveModule(‘shooting’)}
className={`px-6 py-2 rounded-lg font-semibold transition-all ${ activeModule === 'shooting' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30' }`}
>
📊 Stats de Tir
</button>
<button
onClick={() => setActiveModule(‘team’)}
className={`px-6 py-2 rounded-lg font-semibold transition-all ${ activeModule === 'team' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30' }`}
>
👥 Stats d’Équipe
</button>
<button
onClick={() => setActiveModule(‘history’)}
className={`px-6 py-2 rounded-lg font-semibold transition-all ${ activeModule === 'history' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30' }`}
>
📅 Historique
</button>
</div>
</div>
</div>

```
  {/* Contenu Principal */}
  <div className="p-4">
    {activeModule === 'shooting' && (
      <ShootingModule 
        shots={shots} 
        saveShots={saveShots}
        exportToCSV={exportAllDataToCSV}
        resetData={resetAllData}
      />
    )}
    {activeModule === 'team' && (
      <TeamStatsModule 
        teamStats={teamStats}
        currentMatchStats={currentMatchStats}
        setCurrentMatchStats={setCurrentMatchStats}
        saveTeamStats={saveTeamStats}
      />
    )}
    {activeModule === 'history' && (
      <HistoryModule 
        shots={shots}
        teamStats={teamStats}
        exportToCSV={exportAllDataToCSV}
      />
    )}
  </div>
</div>
```

);
}

// Module de Stats de Tir
function ShootingModule({ shots, saveShots, exportToCSV, resetData }) {
const [selectedPlayer, setSelectedPlayer] = useState(PLAYERS[0]);
const [selectedZone, setSelectedZone] = useState(null);
const [inputTentes, setInputTentes] = useState(’’);
const [inputMarques, setInputMarques] = useState(’’);
const [viewStats, setViewStats] = useState(false);

const validateEntry = () => {
if (!selectedPlayer || !selectedZone) return;

```
const tentes = parseInt(inputTentes) || 0;
const marques = parseInt(inputMarques) || 0;

if (tentes === 0) return;
if (marques > tentes) {
  alert('Le nombre de tirs marqués ne peut pas dépasser le nombre de tirs tentés');
  return;
}

const playerShots = shots[selectedPlayer.id] || {};
const zoneShots = playerShots[selectedZone] || { tentes: 0, marques: 0 };

const newShots = {
  ...shots,
  [selectedPlayer.id]: {
    ...playerShots,
    [selectedZone]: {
      tentes: zoneShots.tentes + tentes,
      marques: zoneShots.marques + marques
    }
  }
};

saveShots(newShots);
setInputTentes('');
setInputMarques('');
```

};

const getPlayerStats = (playerId) => {
const playerShots = shots[playerId] || {};
let tentes = 0;
let marques = 0;

```
ZONES.forEach(zone => {
  const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
  tentes += zoneData.tentes;
  marques += zoneData.marques;
});

return { tentes, marques, pct: tentes > 0 ? ((marques / tentes) * 100).toFixed(1) : '0' };
```

};

if (viewStats) {
return (
<div className="max-w-6xl mx-auto">
<div className="bg-white rounded-lg shadow-lg p-6">
<div className="flex justify-between items-center mb-6">
<h2 className="text-3xl font-bold text-gray-800">Tableau des Statistiques</h2>
<button
onClick={() => setViewStats(false)}
className=“px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold”
>
Retour
</button>
</div>

```
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left">Joueur</th>
              {ZONES.map(zone => (
                <th key={zone.id} className="border border-gray-300 p-3 text-center" style={{ color: zone.color }}>
                  {zone.name}
                </th>
              ))}
              <th className="border border-gray-300 p-3 text-center bg-gray-200">Total</th>
            </tr>
          </thead>
          <tbody>
            {PLAYERS.map(player => {
              const playerShots = shots[player.id] || {};
              const stats = getPlayerStats(player.id);
              
              return (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3 font-semibold">{player.name}</td>
                  {ZONES.map(zone => {
                    const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
                    const pct = zoneData.tentes > 0 ? ((zoneData.marques / zoneData.tentes) * 100).toFixed(0) : '-';
                    
                    return (
                      <td key={zone.id} className="border border-gray-300 p-3 text-center text-sm">
                        <div>{zoneData.marques}/{zoneData.tentes}</div>
                        <div className="text-xs text-gray-600">{pct !== '-' ? `${pct}%` : '-'}</div>
                      </td>
                    );
                  })}
                  <td className="border border-gray-300 p-3 text-center font-semibold bg-gray-50">
                    <div>{stats.marques}/{stats.tentes}</div>
                    <div className="text-sm text-gray-600">{stats.pct}%</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
```

}

return (
<div className="max-w-7xl mx-auto">
<div className="bg-white rounded-lg shadow-2xl overflow-hidden">
<div className="flex flex-col lg:flex-row">
<div className="lg:w-80 bg-gray-50 border-r border-gray-200 p-4">
<h2 className="text-xl font-bold text-gray-800 mb-4">👥 Joueurs</h2>
<div className="space-y-2 max-h-96 overflow-y-auto">
{PLAYERS.map(player => {
const stats = getPlayerStats(player.id);
const isSelected = selectedPlayer?.id === player.id;

```
            return (
              <div
                key={player.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white hover:bg-gray-100'
                }`}
                onClick={() => setSelectedPlayer(player)}
              >
                <h3 className="font-bold">{player.name}</h3>
                <p className={`text-sm ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                  {stats.tentes} tirs • {stats.pct}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-6">
        {selectedPlayer && (
          <>
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedPlayer.name} - Sélectionnez une zone
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {ZONES.map(zone => {
                const zoneData = (shots[selectedPlayer.id] || {})[zone.id] || { tentes: 0, marques: 0 };
                const pct = zoneData.tentes > 0 ? ((zoneData.marques / zoneData.tentes) * 100).toFixed(1) : '0';
                const isSelected = selectedZone === zone.id;

                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                    className={`p-4 rounded-lg border-4 transition-all ${
                      isSelected ? 'shadow-2xl scale-105' : 'shadow-md'
                    }`}
                    style={{
                      borderColor: zone.color,
                      backgroundColor: isSelected ? zone.color : 'white',
                      color: isSelected ? 'white' : zone.color
                    }}
                  >
                    <h3 className="font-bold">{zone.name}</h3>
                    <div className={`text-sm ${isSelected ? 'opacity-90' : 'opacity-70'}`}>
                      <div>{zoneData.marques}/{zoneData.tentes}</div>
                      <div className="font-semibold">{pct}%</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedZone && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-blue-500">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Zone : {ZONES.find(z => z.id === selectedZone)?.name}
                </h3>
                
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tirs tentés
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inputTentes}
                      onChange={(e) => setInputTentes(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tirs marqués
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inputMarques}
                      onChange={(e) => setInputMarques(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                    />
                  </div>

                  <button
                    onClick={validateEntry}
                    disabled={!inputTentes}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-xl font-bold"
                  >
                    ✓ VALIDER
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 mt-6 flex-wrap">
          <button
            onClick={() => setViewStats(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
          >
            📊 Voir Tableau
          </button>
          <button
            onClick={exportToCSV}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            💾 Exporter CSV
          </button>
          <button
            onClick={resetData}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
          >
            🗑️ Réinitialiser Tout
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

);
}

// Module Stats d’Équipe
function TeamStatsModule({ teamStats, currentMatchStats, setCurrentMatchStats, saveTeamStats }) {
const [selectedPlayer, setSelectedPlayer] = useState(null);
const [defResponsability, setDefResponsability] = useState(’’);

const updateStat = (category, field, subfield, value) => {
const newStats = { …currentMatchStats };
if (subfield) {
newStats[category][field][subfield] = parseInt(value) || 0;
} else {
newStats[category][field] = parseInt(value) || 0;
}
setCurrentMatchStats(newStats);
};

const addIndividualStat = () => {
if (!selectedPlayer || !defResponsability) return;

```
const newStats = { ...currentMatchStats };
if (!newStats.nous.statsIndividuelles[selectedPlayer.id]) {
  newStats.nous.statsIndividuelles[selectedPlayer.id] = {
    name: selectedPlayer.name,
    responsabilitesDefensives: []
  };
}

newStats.nous.statsIndividuelles[selectedPlayer.id].responsabilitesDefensives.push(defResponsability);
setCurrentMatchStats(newStats);
setDefResponsability('');
```

};

const saveMatch = () => {
if (!currentMatchStats.adversaire.nom) {
alert(‘Veuillez entrer le nom de l'adversaire’);
return;
}

```
const newTeamStats = [...teamStats, { ...currentMatchStats }];
saveTeamStats(newTeamStats);

// Réinitialiser pour un nouveau match
setCurrentMatchStats({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  nous: {
    troisPoints: { marques: 0, tentes: 0 },
    lancersFrancs: { marques: 0, tentes: 0 },
    rebondsOffensifs: { pris: 0, marques: 0 },
    pertesDeBalle: { total: 0, paniersEncaisses: 0 },
    paniersFaciles: 0,
    statsIndividuelles: {}
  },
  adversaire: {
    nom: '',
    troisPoints: { marques: 0, tentes: 0 },
    rebonds: { subis: 0, marques: 0 }
  }
});

alert('Match enregistré avec succès !');
```

};

return (
<div className="max-w-6xl mx-auto">
<div className="bg-white rounded-lg shadow-lg p-6">
<h2 className="text-3xl font-bold text-gray-800 mb-6">📊 Stats du Match</h2>

```
    {/* Infos du match */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={currentMatchStats.date}
          onChange={(e) => setCurrentMatchStats({...currentMatchStats, date: e.target.value})}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Heure</label>
        <input
          type="time"
          value={currentMatchStats.time}
          onChange={(e) => setCurrentMatchStats({...currentMatchStats, time: e.target.value})}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Adversaire</label>
        <input
          type="text"
          value={currentMatchStats.adversaire.nom}
          onChange={(e) => {
            const newStats = {...currentMatchStats};
            newStats.adversaire.nom = e.target.value;
            setCurrentMatchStats(newStats);
          }}
          placeholder="Nom de l'équipe adverse"
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
        />
      </div>
    </div>

    {/* Section NOUS */}
    <div className="bg-blue-50 p-4 rounded-lg mb-6">
      <h3 className="text-xl font-bold text-blue-800 mb-4">🏀 Notre Équipe</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">3 Points</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.troisPoints.marques}
              onChange={(e) => updateStat('nous', 'troisPoints', 'marques', e.target.value)}
              placeholder="Marqués"
              className="w-1/2 px-3 py-2 border rounded"
            />
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.troisPoints.tentes}
              onChange={(e) => updateStat('nous', 'troisPoints', 'tentes', e.target.value)}
              placeholder="Tentés"
              className="w-1/2 px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Lancers Francs</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.lancersFrancs.marques}
              onChange={(e) => updateStat('nous', 'lancersFrancs', 'marques', e.target.value)}
              placeholder="Marqués"
              className="w-1/2 px-3 py-2 border rounded"
            />
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.lancersFrancs.tentes}
              onChange={(e) => updateStat('nous', 'lancersFrancs', 'tentes', e.target.value)}
              placeholder="Tentés"
              className="w-1/2 px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Rebonds Offensifs</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.rebondsOffensifs.pris}
              onChange={(e) => updateStat('nous', 'rebondsOffensifs', 'pris', e.target.value)}
              placeholder="Pris"
              className="w-1/2 px-3 py-2 border rounded"
            />
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.rebondsOffensifs.marques}
              onChange={(e) => updateStat('nous', 'rebondsOffensifs', 'marques', e.target.value)}
              placeholder="→ Marqués"
              className="w-1/2 px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Pertes de Balle</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.pertesDeBalle.total}
              onChange={(e) => updateStat('nous', 'pertesDeBalle', 'total', e.target.value)}
              placeholder="Total"
              className="w-1/2 px-3 py-2 border rounded"
            />
            <input
              type="number"
              min="0"
              value={currentMatchStats.nous.pertesDeBalle.paniersEncaisses}
              onChange={(e) => updateStat('nous', 'pertesDeBalle', 'paniersEncaisses', e.target.value)}
              placeholder="→ Encaissés"
              className="w-1/2 px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Paniers Faciles</label>
          <input
            type="number"
            min="0"
            value={currentMatchStats.nous.paniersFaciles}
            onChange={(e) => updateStat('nous', 'paniersFaciles', null, e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      {/* Stats Individuelles */}
      <div className="mt-6 border-t pt-4">
        <h4 className="font-bold text-gray-700 mb-3">Stats Individuelles</h4>
        <div className="flex gap-2 mb-3">
          <select
            value={selectedPlayer?.id || ''}
            onChange={(e) => setSelectedPlayer(PLAYERS.find(p => p.id === parseInt(e.target.value)))}
            className="flex-1 px-3 py-2 border rounded"
          >
            <option value="">Sélectionner un joueur</option>
            {PLAYERS.map(player => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={defResponsability}
            onChange={(e) => setDefResponsability(e.target.value)}
            placeholder="Responsabilité défensive"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={addIndividualStat}
            disabled={!selectedPlayer || !defResponsability}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            Ajouter
          </button>
        </div>
        
        {Object.values(currentMatchStats.nous.statsIndividuelles).length > 0 && (
          <div className="bg-white p-3 rounded">
            {Object.values(currentMatchStats.nous.statsIndividuelles).map((stat, idx) => (
              <div key={idx} className="mb-2">
                <span className="font-semibold">{stat.name}:</span>
                <span className="ml-2">{stat.responsabilitesDefensives.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Section ADVERSAIRE */}
    <div className="bg-red-50 p-4 rounded-lg mb-6">
      <h3 className="text-xl font-bold text-red-800 mb-4">⚔️ Équipe Adverse</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">3 Points</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={currentMatchStats.adversaire.troisPoints.marques}
              onChange={(e) => updateStat('adversaire', 'troisPoints', 'marques', e.target.value)}
              placeholder="Marqués"
              className="w-1/2 px-3 py-2 border rounded"
            />
            <input
              type="number"
              min="0"
              value={currentMatchStats.adversaire.troisPoints.tentes}
              onChange={(e) => updateStat('adversaire', 'troisPoints', 'tentes', e.target.value)}
              placeholder="Tentés"
              className="w-1/2 px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Rebonds Subis</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={currentMatchStats.adversaire.rebonds.subis}
              onChange={(e) => updateStat('adversaire', 'rebonds', 'subis', e.target.value)}
              placeholder="Subis"
              className="w-1/2 px-3 py-2 border rounded"
            />
            <input
              type="number"
              min="0"
              value={currentMatchStats.adversaire.rebonds.marques}
              onChange={(e) => updateStat('adversaire', 'rebonds', 'marques', e.target.value)}
              placeholder="→ Marqués"
              className="w-1/2 px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>
    </div>

    <button
      onClick={saveMatch}
      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg"
    >
      💾 Enregistrer le Match
    </button>
  </div>
</div>
```

);
}

// Module Historique
function HistoryModule({ shots, teamStats, exportToCSV }) {
const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split(‘T’)[0]);

const getMatchesByDate = (date) => {
return teamStats.filter(match => match.date === date);
};

const getGlobalStats = () => {
let totalTirs = 0;
let totalMarques = 0;
let total3pts = { marques: 0, tentes: 0 };
let totalLF = { marques: 0, tentes: 0 };
let totalRebonds = 0;
let totalPertes = 0;

```
// Stats de tir
Object.values(shots).forEach(playerShots => {
  Object.values(playerShots).forEach(zoneData => {
    totalTirs += zoneData.tentes || 0;
    totalMarques += zoneData.marques || 0;
  });
});

// Stats d'équipe
teamStats.forEach(match => {
  total3pts.marques += match.nous.troisPoints.marques;
  total3pts.tentes += match.nous.troisPoints.tentes;
  totalLF.marques += match.nous.lancersFrancs.marques;
  totalLF.tentes += match.nous.lancersFrancs.tentes;
  totalRebonds += match.nous.rebondsOffensifs.pris;
  totalPertes += match.nous.pertesDeBalle.total;
});

return {
  tirs: { total: totalTirs, marques: totalMarques },
  troisPoints: total3pts,
  lancersFrancs: totalLF,
  rebonds: totalRebonds,
  pertes: totalPertes,
  matchs: teamStats.length
};
```

};

const globalStats = getGlobalStats();
const dailyMatches = getMatchesByDate(selectedDate);

return (
<div className="max-w-6xl mx-auto space-y-6">
{/* Statistiques Globales */}
<div className="bg-white rounded-lg shadow-lg p-6">
<h2 className="text-3xl font-bold text-gray-800 mb-6">📈 Statistiques Globales</h2>

```
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-blue-600">
          {globalStats.matchs}
        </div>
        <div className="text-sm text-gray-600">Matchs Joués</div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-green-600">
          {globalStats.tirs.total > 0 ? 
            ((globalStats.tirs.marques / globalStats.tirs.total) * 100).toFixed(1) : '0'}%
        </div>
        <div className="text-sm text-gray-600">Réussite Tirs</div>
      </div>
      
      <div className="bg-purple-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-purple-600">
          {globalStats.troisPoints.tentes > 0 ? 
            ((globalStats.troisPoints.marques / globalStats.troisPoints.tentes) * 100).toFixed(1) : '0'}%
        </div>
        <div className="text-sm text-gray-600">3 Points</div>
      </div>
      
      <div className="bg-orange-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-orange-600">
          {globalStats.lancersFrancs.tentes > 0 ? 
            ((globalStats.lancersFrancs.marques / globalStats.lancersFrancs.tentes) * 100).toFixed(1) : '0'}%
        </div>
        <div className="text-sm text-gray-600">Lancers Francs</div>
      </div>
      
      <div className="bg-cyan-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-cyan-600">
          {globalStats.rebonds}
        </div>
        <div className="text-sm text-gray-600">Rebonds Off.</div>
      </div>
      
      <div className="bg-red-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-red-600">
          {globalStats.pertes}
        </div>
        <div className="text-sm text-gray-600">Pertes de Balle</div>
      </div>
    </div>
  </div>

  {/* Historique par Jour */}
  <div className="bg-white rounded-lg shadow-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800">📅 Historique par Jour</h2>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="px-4 py-2 border-2 border-gray-300 rounded-lg"
      />
    </div>

    {dailyMatches.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        Aucun match enregistré pour cette date
      </div>
    ) : (
      <div className="space-y-4">
        {dailyMatches.map((match, idx) => (
          <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">vs {match.adversaire.nom}</h3>
                <p className="text-sm text-gray-600">{match.time}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="font-semibold">3pts:</span> {match.nous.troisPoints.marques}/{match.nous.troisPoints.tentes}
              </div>
              <div>
                <span className="font-semibold">LF:</span> {match.nous.lancersFrancs.marques}/{match.nous.lancersFrancs.tentes}
              </div>
              <div>
                <span className="font-semibold">Reb Off:</span> {match.nous.rebondsOffensifs.pris}
              </div>
              <div>
                <span className="font-semibold">Pertes:</span> {match.nous.pertesDeBalle.total}
              </div>
            </div>

            {Object.values(match.nous.statsIndividuelles).length > 0 && (
              <div className="mt-3 pt-3 border-t text-sm">
                <span className="font-semibold">Stats individuelles:</span>
                {Object.values(match.nous.statsIndividuelles).map((stat, i) => (
                  <span key={i} className="ml-2">
                    {stat.name} ({stat.responsabilitesDefensives.length} resp.)
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
    
    <button
      onClick={exportToCSV}
      className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
    >
      💾 Exporter Toutes les Données
    </button>
  </div>
</div>
```

);
}

// Rendu de l’application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<BasketballStatsApp />);
