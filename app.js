// app.js - Application Complète Stats Basketball
const { useState, useEffect } = React;

// Configuration des constantes
const ZONES = [
{ id: 'gauche_0', name: 'Gauche 0deg', color: '#3b82f6' },
{ id: 'droit_0', name: 'Droit 0deg', color: '#ec4899' },
{ id: 'gauche_45', name: 'Gauche 45deg', color: '#10b981' },
{ id: 'droit_45', name: 'Droit 45deg', color: '#f59e0b' },
{ id: 'gauche_70', name: 'Gauche 70deg', color: '#06b6d4' },
{ id: 'droit_70', name: 'Droit 70deg', color: '#ef4444' },
{ id: 'axe', name: 'Axe', color: '#6366f1' }
];

const PLAYERS = [
{ id: 1, name: 'Maxime' },
{ id: 2, name: 'Sasha' },
{ id: 3, name: 'Theotime' },
{ id: 4, name: 'Noe' },
{ id: 5, name: 'Keziah' },
{ id: 6, name: 'Nathan' },
{ id: 7, name: 'Valentin' },
{ id: 8, name: 'Jad' },
{ id: 9, name: 'Marco' },
{ id: 10, name: 'Thierno' },
{ id: 11, name: 'Peniel' },
{ id: 12, name: 'Nat' }
];

function BasketballStatsApp() {
const [activeModule, setActiveModule] = useState('team');
const [shots, setShots] = useState({});
const [teamStats, setTeamStats] = useState([]);
const [currentMatchStats, setCurrentMatchStats] = useState({
date: new Date().toISOString().split('T')[0],
time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
adversaire: { nom: '' },
location: 'home', // 'home' ou 'away'
quartersData: [
{ quarter: 1, nous: 0, adversaire: 0, actions: [] },
{ quarter: 2, nous: 0, adversaire: 0, actions: [] },
{ quarter: 3, nous: 0, adversaire: 0, actions: [] },
{ quarter: 4, nous: 0, adversaire: 0, actions: [] }
],
overtime: null,
activeQuarter: 0
});

// Chargement initial des données
useEffect(() => {
try {
const savedShots = localStorage.getItem('basketball_shots');
const savedTeamStats = localStorage.getItem('basketball_team_stats');
if (savedShots) setShots(JSON.parse(savedShots));
if (savedTeamStats) setTeamStats(JSON.parse(savedTeamStats));
} catch (error) {
console.log('Initialisation des données');
}
}, []);

const saveShots = (newShots) => {
setShots(newShots);
localStorage.setItem('basketball_shots', JSON.stringify(newShots));
};

const saveTeamStats = (newStats) => {
setTeamStats(newStats);
localStorage.setItem('basketball_team_stats', JSON.stringify(newStats));
};

const exportAllDataToCSV = () => {
let csv = '=== STATISTIQUES DE TIR ===\n';
csv += 'Joueur,Zone,Tirs Tentés,Tirs Marqués,Pourcentage\n';


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
csv += 'Date,Heure,Adversaire,Score Final Nous,Score Final Adv,Q1 Nous,Q1 Adv,Q2 Nous,Q2 Adv,Q3 Nous,Q3 Adv,Q4 Nous,Q4 Adv\n';

teamStats.forEach(match => {
  const scoreNous = match.quartersData.reduce((sum, q) => sum + q.nous, 0);
  const scoreAdv = match.quartersData.reduce((sum, q) => sum + q.adversaire, 0);
  csv += `${match.date},${match.time},${match.adversaire.nom || 'N/A'},${scoreNous},${scoreAdv},`;
  match.quartersData.forEach(q => {
    csv += `${q.nous},${q.adversaire},`;
  });
  csv += '\n';
});

const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `stats_basketball_${new Date().toISOString().split('T')[0]}.csv`;
link.click();


};

const resetAllData = () => {
if (confirm('Êtes-vous sûr de vouloir effacer TOUTES les données ?')) {
setShots({});
setTeamStats([]);
setCurrentMatchStats({
date: new Date().toISOString().split('T')[0],
time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
adversaire: { nom: '' },
location: 'home',
quartersData: [
{ quarter: 1, nous: 0, adversaire: 0, actions: [] },
{ quarter: 2, nous: 0, adversaire: 0, actions: [] },
{ quarter: 3, nous: 0, adversaire: 0, actions: [] },
{ quarter: 4, nous: 0, adversaire: 0, actions: [] }
],
overtime: null,
activeQuarter: 0
});
localStorage.clear();
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
onClick={() => setActiveModule('team')}
className={`px-6 py-2 rounded-lg font-semibold transition-all ${ activeModule === 'team' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30' }`}
>
🏀 Match en Cours
</button>
<button
onClick={() => setActiveModule('shooting')}
className={`px-6 py-2 rounded-lg font-semibold transition-all ${ activeModule === 'shooting' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30' }`}
>
🎯 Stats de Tir
</button>
<button
onClick={() => setActiveModule('history')}
className={`px-6 py-2 rounded-lg font-semibold transition-all ${ activeModule === 'history' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30' }`}
>
📊 Historique
</button>
</div>
</div>


    {/* Statistiques détaillées avec conséquences */}
    <div className="mt-6 space-y-4">
      <h3 className="text-xl font-bold text-gray-700">📊 Détail des Conséquences</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rebonds Offensifs NOUS */}
        <div className="bg-cyan-50 p-4 rounded-lg border-2 border-cyan-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-cyan-800">🔄 Rebonds Offensifs (Nous)</h4>
            <span className="text-2xl font-bold text-cyan-600">{globalStats.rebonds}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 2pts:</span>
              <span className="font-semibold text-green-600">{globalStats.rebondsConsequences.panier2pts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 3pts:</span>
              <span className="font-semibold text-green-700">{globalStats.rebondsConsequences.panier3pts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Faute:</span>
              <span className="font-semibold text-yellow-600">{globalStats.rebondsConsequences.faute}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Rien:</span>
              <span className="font-semibold text-gray-500">{globalStats.rebondsConsequences.rien}</span>
            </div>
          </div>
        </div>

        {/* Pertes de Balle */}
        <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-orange-800">⚠️ Pertes de Balle</h4>
            <span className="text-2xl font-bold text-orange-600">{globalStats.pertes}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 2pts Nous:</span>
              <span className="font-semibold text-green-600">{globalStats.pertesConsequences.panier2ptsNous}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 3pts Nous:</span>
              <span className="font-semibold text-green-700">{globalStats.pertesConsequences.panier3ptsNous}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 2pts Adv:</span>
              <span className="font-semibold text-red-600">{globalStats.pertesConsequences.panier2ptsAdv}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 3pts Adv:</span>
              <span className="font-semibold text-red-700">{globalStats.pertesConsequences.panier3ptsAdv}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Faute:</span>
              <span className="font-semibold text-yellow-600">{globalStats.pertesConsequences.faute}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Rien:</span>
              <span className="font-semibold text-gray-500">{globalStats.pertesConsequences.rien}</span>
            </div>
          </div>
        </div>

        {/* Interceptions */}
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-purple-800">🎯 Interceptions</h4>
            <span className="text-2xl font-bold text-purple-600">{globalStats.interceptions}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 2pts:</span>
              <span className="font-semibold text-green-600">{globalStats.interceptionsConsequences.panier2pts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 3pts:</span>
              <span className="font-semibold text-green-700">{globalStats.interceptionsConsequences.panier3pts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Faute:</span>
              <span className="font-semibold text-yellow-600">{globalStats.interceptionsConsequences.faute}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Rien:</span>
              <span className="font-semibold text-gray-500">{globalStats.interceptionsConsequences.rien}</span>
            </div>
          </div>
        </div>

        {/* Rebonds Offensifs Adversaire */}
        <div className="bg-rose-50 p-4 rounded-lg border-2 border-rose-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-rose-800">🔄 Rebonds Offensifs (Adv)</h4>
            <span className="text-2xl font-bold text-rose-600">{globalStats.rebondsAdv}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 2pts:</span>
              <span className="font-semibold text-red-600">{globalStats.rebondsAdvConsequences.panier2pts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Panier 3pts:</span>
              <span className="font-semibold text-red-700">{globalStats.rebondsAdvConsequences.panier3pts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Faute:</span>
              <span className="font-semibold text-yellow-600">{globalStats.rebondsAdvConsequences.faute}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">→ Rien:</span>
              <span className="font-semibold text-gray-500">{globalStats.rebondsAdvConsequences.rien}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

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
        saveTeamStats={saveTeamStats}
      />
    )}
  </div>
</div>


);
}

// Module de Stats de Tir
function ShootingModule({ shots, saveShots, exportToCSV, resetData }) {
const [selectedPlayer, setSelectedPlayer] = useState(PLAYERS[0]);
const [selectedZone, setSelectedZone] = useState(null);
const [inputTentes, setInputTentes] = useState('');
const [inputMarques, setInputMarques] = useState('');
const [viewStats, setViewStats] = useState(false);

const validateEntry = () => {
if (!selectedPlayer || !selectedZone) return;


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


};

const getPlayerStats = (playerId) => {
const playerShots = shots[playerId] || {};
let tentes = 0;
let marques = 0;


ZONES.forEach(zone => {
  const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
  tentes += zoneData.tentes;
  marques += zoneData.marques;
});

return { tentes, marques, pct: tentes > 0 ? ((marques / tentes) * 100).toFixed(1) : '0' };


};

if (viewStats) {
return (
<div className="max-w-6xl mx-auto">
<div className="bg-white rounded-lg shadow-lg p-6">
<div className="flex justify-between items-center mb-6">
<h2 className="text-3xl font-bold text-gray-800">Tableau des Statistiques</h2>
<button
onClick={() => setViewStats(false)}
className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
>
Retour
</button>
</div>


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
            🗑️ Réinitialiser
          </button>
        </div>
      </div>
    </div>
  </div>
</div>


);
}

// Module Stats d'Équipe
function TeamStatsModule({ teamStats, currentMatchStats, setCurrentMatchStats, saveTeamStats }) {
const [showActionModal, setShowActionModal] = useState(false);
const [showMissedShotModal, setShowMissedShotModal] = useState(false);
const [missedShotTeam, setMissedShotTeam] = useState(null);
const [currentAction, setCurrentAction] = useState(null);
const [selectedPlayer, setSelectedPlayer] = useState(null);
const [showRecap, setShowRecap] = useState(false);

const activeQuarter = currentMatchStats.quartersData[currentMatchStats.activeQuarter];
const totalScoreNous = currentMatchStats.quartersData.reduce((sum, q) => sum + q.nous, 0);
const totalScoreAdv = currentMatchStats.quartersData.reduce((sum, q) => sum + q.adversaire, 0);

// Calculer les statistiques du match
const getMatchStats = () => {
let stats = {
nous: {
paniers2pts: { reussis: 0, tentes: 0 },
paniers3pts: { reussis: 0, tentes: 0 },
lancersFrancs: { reussis: 0, tentes: 0 },
rebondsOffensifs: { total: 0, consequences: { panier2pts: 0, panier3pts: 0, faute: 0, rien: 0 } },
pertesDeBalle: { total: 0, consequences: { panier2ptsNous: 0, panier3ptsNous: 0, panier2ptsAdv: 0, panier3ptsAdv: 0, faute: 0, rien: 0 } },
interceptions: { total: 0, consequences: { panier2pts: 0, panier3pts: 0, faute: 0, rien: 0 } },
paniersFacilesLoupes: 0,
fautes: 0
},
adversaire: {
paniers2pts: { reussis: 0, tentes: 0 },
paniers3pts: { reussis: 0, tentes: 0 },
rebondsOffensifs: { total: 0, consequences: { panier2pts: 0, panier3pts: 0, faute: 0, rien: 0 } },
fautes: 0
}
};


currentMatchStats.quartersData.forEach(quarter => {
  quarter.actions.forEach(action => {
    if (action.team === 'nous') {
      // Paniers réussis
      if (action.type === 'panier_2pts') {
        stats.nous.paniers2pts.reussis++;
        stats.nous.paniers2pts.tentes++;
      }
      if (action.type === 'panier_3pts') {
        stats.nous.paniers3pts.reussis++;
        stats.nous.paniers3pts.tentes++;
      }
      if (action.type === 'lancer_franc') {
        stats.nous.lancersFrancs.reussis++;
        stats.nous.lancersFrancs.tentes++;
      }
      
      // Tirs loupés
      if (action.type === 'tir_loupe') {
        if (action.shotType === '2pts') stats.nous.paniers2pts.tentes++;
        if (action.shotType === '3pts') stats.nous.paniers3pts.tentes++;
        if (action.shotType === 'lf') stats.nous.lancersFrancs.tentes++;
      }
      
      // Rebonds offensifs
      if (action.type === 'rebond_offensif_nous') {
        stats.nous.rebondsOffensifs.total++;
        if (action.consequence) {
          if (action.consequence.points === 2) stats.nous.rebondsOffensifs.consequences.panier2pts++;
          if (action.consequence.points === 3) stats.nous.rebondsOffensifs.consequences.panier3pts++;
          if (action.consequence.type === 'faute') stats.nous.rebondsOffensifs.consequences.faute++;
        } else {
          stats.nous.rebondsOffensifs.consequences.rien++;
        }
      }
      
      // Pertes de balle
      if (action.type === 'perte_balle') {
        stats.nous.pertesDeBalle.total++;
        if (action.consequence) {
          if (action.consequence.team === 'nous' && action.consequence.points === 2) stats.nous.pertesDeBalle.consequences.panier2ptsNous++;
          if (action.consequence.team === 'nous' && action.consequence.points === 3) stats.nous.pertesDeBalle.consequences.panier3ptsNous++;
          if (action.consequence.team === 'adversaire' && action.consequence.points === 2) stats.nous.pertesDeBalle.consequences.panier2ptsAdv++;
          if (action.consequence.team === 'adversaire' && action.consequence.points === 3) stats.nous.pertesDeBalle.consequences.panier3ptsAdv++;
          if (action.consequence.type === 'faute') stats.nous.pertesDeBalle.consequences.faute++;
        } else {
          stats.nous.pertesDeBalle.consequences.rien++;
        }
      }
      
      // Interceptions
      if (action.type === 'interception') {
        stats.nous.interceptions.total++;
        if (action.consequence) {
          if (action.consequence.points === 2) stats.nous.interceptions.consequences.panier2pts++;
          if (action.consequence.points === 3) stats.nous.interceptions.consequences.panier3pts++;
          if (action.consequence.type === 'faute') stats.nous.interceptions.consequences.faute++;
        } else {
          stats.nous.interceptions.consequences.rien++;
        }
      }
      
      if (action.type === 'panier_facile_loupe') stats.nous.paniersFacilesLoupes++;
      if (action.type === 'faute') stats.nous.fautes++;
    } else if (action.team === 'adversaire') {
      // Paniers réussis adversaire
      if (action.type === 'panier_2pts') {
        stats.adversaire.paniers2pts.reussis++;
        stats.adversaire.paniers2pts.tentes++;
      }
      if (action.type === 'panier_3pts') {
        stats.adversaire.paniers3pts.reussis++;
        stats.adversaire.paniers3pts.tentes++;
      }
      
      // Tirs loupés adversaire
      if (action.type === 'tir_loupe') {
        if (action.shotType === '2pts') stats.adversaire.paniers2pts.tentes++;
        if (action.shotType === '3pts') stats.adversaire.paniers3pts.tentes++;
      }
      
      // Rebonds offensifs adversaire
      if (action.type === 'rebond_offensif_adv') {
        stats.adversaire.rebondsOffensifs.total++;
        if (action.consequence) {
          if (action.consequence.points === 2) stats.adversaire.rebondsOffensifs.consequences.panier2pts++;
          if (action.consequence.points === 3) stats.adversaire.rebondsOffensifs.consequences.panier3pts++;
          if (action.consequence.type === 'faute') stats.adversaire.rebondsOffensifs.consequences.faute++;
        } else {
          stats.adversaire.rebondsOffensifs.consequences.rien++;
        }
      }
      
      if (action.type === 'faute') stats.adversaire.fautes++;
    }
  });
});

return stats;


};

// Sauvegarde automatique
useEffect(() => {
const timer = setTimeout(() => {
localStorage.setItem('basketball_current_match', JSON.stringify(currentMatchStats));
}, 1000);
return () => clearTimeout(timer);
}, [currentMatchStats]);

// Chargement du match en cours
useEffect(() => {
const saved = localStorage.getItem('basketball_current_match');
if (saved) {
try {
setCurrentMatchStats(JSON.parse(saved));
} catch (e) {
console.log('Erreur chargement match en cours');
}
}
}, []);

const addAction = (actionType, team, points = 0, consequence = null, shotType = null) => {
const action = {
id: Date.now(),
timestamp: new Date().toISOString(),
type: actionType,
team: team,
points: points,
consequence: consequence,
shotType: shotType,
player: selectedPlayer?.name || null,
quarter: currentMatchStats.activeQuarter + 1
};


const newStats = { ...currentMatchStats };
const quarter = newStats.quartersData[currentMatchStats.activeQuarter];
quarter.actions.push(action);

// Ajouter les points de l'action principale
if (team === 'nous') {
  quarter.nous += points;
} else if (team === 'adversaire') {
  quarter.adversaire += points;
}

// Gérer les conséquences ET incrémenter automatiquement les compteurs
if (consequence) {
  // Ajouter les points de la conséquence
  if (consequence.team === 'nous') {
    quarter.nous += consequence.points || 0;
    
    // Créer automatiquement l'action correspondante
    if (consequence.points === 2) {
      quarter.actions.push({
        id: Date.now() + 1,
        timestamp: new Date().toISOString(),
        type: 'panier_2pts',
        team: 'nous',
        points: 2,
        consequence: null,
        shotType: null,
        player: selectedPlayer?.name || null,
        quarter: currentMatchStats.activeQuarter + 1,
        autoGenerated: true
      });
    } else if (consequence.points === 3) {
      quarter.actions.push({
        id: Date.now() + 1,
        timestamp: new Date().toISOString(),
        type: 'panier_3pts',
        team: 'nous',
        points: 3,
        consequence: null,
        shotType: null,
        player: selectedPlayer?.name || null,
        quarter: currentMatchStats.activeQuarter + 1,
        autoGenerated: true
      });
    }
  } else if (consequence.team === 'adversaire') {
    quarter.adversaire += consequence.points || 0;
    
    // Créer automatiquement l'action correspondante
    if (consequence.points === 2) {
      quarter.actions.push({
        id: Date.now() + 1,
        timestamp: new Date().toISOString(),
        type: 'panier_2pts',
        team: 'adversaire',
        points: 2,
        consequence: null,
        shotType: null,
        player: null,
        quarter: currentMatchStats.activeQuarter + 1,
        autoGenerated: true
      });
    } else if (consequence.points === 3) {
      quarter.actions.push({
        id: Date.now() + 1,
        timestamp: new Date().toISOString(),
        type: 'panier_3pts',
        team: 'adversaire',
        points: 3,
        consequence: null,
        shotType: null,
        player: null,
        quarter: currentMatchStats.activeQuarter + 1,
        autoGenerated: true
      });
    }
  }
  
  // Si la conséquence est une faute, créer une action faute
  if (consequence.type === 'faute') {
    quarter.actions.push({
      id: Date.now() + 2,
      timestamp: new Date().toISOString(),
      type: 'faute',
      team: team === 'nous' ? 'adversaire' : 'nous',
      points: 0,
      consequence: null,
      shotType: null,
      player: null,
      quarter: currentMatchStats.activeQuarter + 1,
      autoGenerated: true
    });
  }
}

setCurrentMatchStats(newStats);
setShowActionModal(false);
setShowMissedShotModal(false);
setCurrentAction(null);
setMissedShotTeam(null);


};

const undoLastAction = () => {
const newStats = { …currentMatchStats };
const quarter = newStats.quartersData[currentMatchStats.activeQuarter];


if (quarter.actions.length === 0) return;

// Trouver la dernière action non auto-générée
let lastActionIndex = -1;
for (let i = quarter.actions.length - 1; i >= 0; i--) {
  if (!quarter.actions[i].autoGenerated) {
    lastActionIndex = i;
    break;
  }
}

if (lastActionIndex === -1) return;

const lastAction = quarter.actions[lastActionIndex];

// Annuler les points de l'action principale
if (lastAction.team === 'nous') {
  quarter.nous -= lastAction.points;
} else if (lastAction.team === 'adversaire') {
  quarter.adversaire -= lastAction.points;
}

// Compter combien d'actions auto-générées suivent cette action
let autoGeneratedCount = 0;
for (let i = lastActionIndex + 1; i < quarter.actions.length; i++) {
  if (quarter.actions[i].autoGenerated) {
    const autoAction = quarter.actions[i];
    // Annuler les points des actions auto-générées
    if (autoAction.team === 'nous') {
      quarter.nous -= autoAction.points;
    } else if (autoAction.team === 'adversaire') {
      quarter.adversaire -= autoAction.points;
    }
    autoGeneratedCount++;
  } else {
    break; // Arrêter si on trouve une action non auto-générée
  }
}

// Supprimer l'action principale et toutes les actions auto-générées qui suivent
quarter.actions.splice(lastActionIndex, 1 + autoGeneratedCount);

setCurrentMatchStats(newStats);


};

const addOvertime = () => {
const newStats = { …currentMatchStats };
if (!newStats.overtime) {
newStats.overtime = { nous: 0, adversaire: 0, actions: [] };
newStats.quartersData.push({ quarter: 5, nous: 0, adversaire: 0, actions: [] });
newStats.activeQuarter = 4;
}
setCurrentMatchStats(newStats);
};

const saveMatch = () => {
if (!currentMatchStats.adversaire.nom) {
alert(“Veuillez entrer le nom de l'adversaire");
return;
}


const newTeamStats = [...teamStats, { ...currentMatchStats }];
saveTeamStats(newTeamStats);

// Réinitialiser
setCurrentMatchStats({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  adversaire: { nom: '' },
  location: 'home',
  quartersData: [
    { quarter: 1, nous: 0, adversaire: 0, actions: [] },
    { quarter: 2, nous: 0, adversaire: 0, actions: [] },
    { quarter: 3, nous: 0, adversaire: 0, actions: [] },
    { quarter: 4, nous: 0, adversaire: 0, actions: [] }
  ],
  overtime: null,
  activeQuarter: 0
});

localStorage.removeItem('basketball_current_match');
alert('Match enregistré avec succès !');


};

return (
<div className="max-w-6xl mx-auto">
<div className="bg-white rounded-lg shadow-lg p-4">
{/* En-tête du match */}
<div className="mb-4">
<h2 className="text-2xl font-bold text-gray-800 mb-3">🏀 Match en Cours</h2>
<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
<input
type=“date"
value={currentMatchStats.date}
onChange={(e) => setCurrentMatchStats({…currentMatchStats, date: e.target.value})}
className=“px-3 py-2 border-2 border-gray-300 rounded-lg"
/>
<input
type=“time"
value={currentMatchStats.time}
onChange={(e) => setCurrentMatchStats({…currentMatchStats, time: e.target.value})}
className=“px-3 py-2 border-2 border-gray-300 rounded-lg"
/>
<input
type=“text"
value={currentMatchStats.adversaire.nom}
onChange={(e) => {
const newStats = {…currentMatchStats};
newStats.adversaire.nom = e.target.value;
setCurrentMatchStats(newStats);
}}
placeholder=“Nom de l'équipe adverse"
className=“px-3 py-2 border-2 border-gray-300 rounded-lg"
/>
<select
value={currentMatchStats.location}
onChange={(e) => setCurrentMatchStats({…currentMatchStats, location: e.target.value})}
className=“px-3 py-2 border-2 border-gray-300 rounded-lg font-semibold"
>
<option value="home">🏠 Domicile</option>
<option value="away">✈️ Extérieur</option>
</select>
</div>
</div>


    {/* Score Total */}
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
        <div className="text-sm font-semibold">NOUS</div>
        <div className="text-5xl font-bold">{totalScoreNous}</div>
      </div>
      <div className="bg-red-600 text-white p-4 rounded-lg text-center">
        <div className="text-sm font-semibold">{currentMatchStats.adversaire.nom || 'ADVERSAIRE'}</div>
        <div className="text-5xl font-bold">{totalScoreAdv}</div>
      </div>
    </div>

    {/* Onglets Quarts-Temps */}
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
      {currentMatchStats.quartersData.map((q, idx) => (
        <button
          key={idx}
          onClick={() => setCurrentMatchStats({...currentMatchStats, activeQuarter: idx})}
          className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
            currentMatchStats.activeQuarter === idx
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Q{q.quarter}: {q.nous}-{q.adversaire}
        </button>
      ))}
      {!currentMatchStats.overtime && (
        <button
          onClick={addOvertime}
          className="px-4 py-2 rounded-lg font-bold bg-orange-200 text-orange-700 hover:bg-orange-300 whitespace-nowrap"
        >
          + Prolongation
        </button>
      )}
    </div>

    {/* Sélection Joueur */}
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-2">Joueur actif</label>
      <select
        value={selectedPlayer?.id || ''}
        onChange={(e) => setSelectedPlayer(PLAYERS.find(p => p.id === parseInt(e.target.value)))}
        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
      >
        <option value="">Sélectionner un joueur</option>
        {PLAYERS.map(player => (
          <option key={player.id} value={player.id}>{player.name}</option>
        ))}
      </select>
    </div>

    {/* Boutons d'Actions - Section NOUS */}
    <div className="mb-4">
      <h3 className="font-bold text-blue-600 mb-2">🏀 Actions NOUS</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => addAction('panier_2pts', 'nous', 2)}
          className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold text-sm"
        >
          ✓ Panier 2pts
        </button>
        <button
          onClick={() => addAction('panier_3pts', 'nous', 3)}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm"
        >
          ✓ Panier 3pts
        </button>
        <button
          onClick={() => addAction('lancer_franc', 'nous', 1)}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-sm"
        >
          ✓ Lancer Franc
        </button>
        <button
          onClick={() => {
            setMissedShotTeam('nous');
            setShowMissedShotModal(true);
          }}
          className="px-3 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 font-bold text-sm"
        >
          ❌ Tir Loupé
        </button>
        <button
          onClick={() => {
            setCurrentAction('rebond_offensif_nous');
            setShowActionModal(true);
          }}
          className="px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-bold text-sm"
        >
          🔄 Rebond Off.
        </button>
        <button
          onClick={() => {
            setCurrentAction('perte_balle');
            setShowActionModal(true);
          }}
          className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold text-sm"
        >
          ⚠️ Perte Balle
        </button>
        <button
          onClick={() => {
            setCurrentAction('interception');
            setShowActionModal(true);
          }}
          className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-bold text-sm"
        >
          🎯 Interception
        </button>
        <button
          onClick={() => addAction('panier_facile_loupe', 'nous', 0)}
          className="px-3 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 font-bold text-sm"
        >
          ❌ Panier Facile Loupé
        </button>
      </div>
    </div>

    {/* Boutons d'Actions - Section ADVERSAIRE */}
    <div className="mb-4">
      <h3 className="font-bold text-red-600 mb-2">⚔️ Actions ADVERSAIRE</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => addAction('panier_2pts', 'adversaire', 2)}
          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold text-sm"
        >
          Panier 2pts ADV
        </button>
        <button
          onClick={() => addAction('panier_3pts', 'adversaire', 3)}
          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm"
        >
          Panier 3pts ADV
        </button>
        <button
          onClick={() => {
            setMissedShotTeam('adversaire');
            setShowMissedShotModal(true);
          }}
          className="px-3 py-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 font-bold text-sm"
        >
          ❌ Tir Loupé ADV
        </button>
        <button
          onClick={() => {
            setCurrentAction('rebond_offensif_adv');
            setShowActionModal(true);
          }}
          className="px-3 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 font-bold text-sm"
        >
          🔄 Rebond Off. ADV
        </button>
        <button
          onClick={() => addAction('faute', 'adversaire', 0)}
          className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold text-sm"
        >
          🟡 Faute ADV
        </button>
      </div>
    </div>

    {/* Modal Tir Loupé */}
    {showMissedShotModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">
            ❌ Type de Tir Loupé - {missedShotTeam === 'nous' ? 'NOUS' : 'ADVERSAIRE'}
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => addAction('tir_loupe', missedShotTeam, 0, null, '2pts')}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold"
            >
              Tir 2 Points Loupé
            </button>
            <button
              onClick={() => addAction('tir_loupe', missedShotTeam, 0, null, '3pts')}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold"
            >
              Tir 3 Points Loupé
            </button>
            {missedShotTeam === 'nous' && (
              <button
                onClick={() => addAction('tir_loupe', missedShotTeam, 0, null, 'lf')}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold"
              >
                Lancer Franc Loupé
              </button>
            )}
            <button
              onClick={() => {
                setShowMissedShotModal(false);
                setMissedShotTeam(null);
              }}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal Conséquence */}
    {showActionModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">
            {currentAction === 'rebond_offensif_nous' && '🔄 Conséquence Rebond Off. NOUS'}
            {currentAction === 'rebond_offensif_adv' && '🔄 Conséquence Rebond Off. ADVERSAIRE'}
            {currentAction === 'perte_balle' && '⚠️ Conséquence Perte de Balle'}
            {currentAction === 'interception' && '🎯 Conséquence Interception'}
          </h3>
          <div className="space-y-2">
            {(currentAction === 'rebond_offensif_nous' || currentAction === 'perte_balle' || currentAction === 'interception') && (
              <>
                <button
                  onClick={() => addAction(currentAction, 'nous', 0, { team: 'nous', points: 2 })}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold"
                >
                  → Panier 2pts NOUS
                </button>
                <button
                  onClick={() => addAction(currentAction, 'nous', 0, { team: 'nous', points: 3 })}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                >
                  → Panier 3pts NOUS
                </button>
              </>
            )}
            {(currentAction === 'rebond_offensif_adv' || currentAction === 'perte_balle' || currentAction === 'interception') && (
              <>
                <button
                  onClick={() => addAction(currentAction, currentAction === 'rebond_offensif_adv' ? 'adversaire' : 'nous', 0, { team: 'adversaire', points: 2 })}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold"
                >
                  → Panier 2pts ADVERSAIRE
                </button>
                <button
                  onClick={() => addAction(currentAction, currentAction === 'rebond_offensif_adv' ? 'adversaire' : 'nous', 0, { team: 'adversaire', points: 3 })}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                >
                  → Panier 3pts ADVERSAIRE
                </button>
              </>
            )}
            <button
              onClick={() => addAction(currentAction, currentAction === 'rebond_offensif_adv' ? 'adversaire' : 'nous', 0, { type: 'faute' })}
              className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold"
            >
              → Faute
            </button>
            <button
              onClick={() => addAction(currentAction, currentAction === 'rebond_offensif_adv' ? 'adversaire' : 'nous', 0)}
              className="w-full px-4 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-bold"
            >
              → Rien
            </button>
            <button
              onClick={() => {
                setShowActionModal(false);
                setCurrentAction(null);
              }}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Historique des Actions */}
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800">📋 Actions Q{activeQuarter.quarter}</h3>
        <button
          onClick={undoLastAction}
          disabled={activeQuarter.actions.length === 0}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm"
        >
          ↶ Annuler
        </button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {activeQuarter.actions.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">Aucune action</p>
        ) : (
          activeQuarter.actions.slice().reverse().map((action) => (
            <div key={action.id} className="bg-white p-2 rounded border-l-4 text-sm" style={{
              borderColor: action.team === 'nous' ? '#3b82f6' : '#ef4444',
              opacity: action.autoGenerated ? 0.7 : 1
            }}>
              <div className="flex justify-between items-start">
                <div>
                  {action.autoGenerated && <span className="text-xs text-gray-500 italic">[Auto] </span>}
                  <span className="font-semibold">
                    {action.type === 'tir_loupe' 
                      ? `TIR LOUPE ${action.shotType ? action.shotType.toUpperCase() : ''}`
                      : action.type.replace(/_/g, ' ').toUpperCase()
                    }
                  </span>
                  {action.player && <span className="text-xs text-gray-600"> - {action.player}</span>}
                  {action.points > 0 && <span className="ml-1 font-bold text-green-600">+{action.points}</span>}
                  {action.consequence && !action.autoGenerated && (
                    <span className="ml-1 text-xs text-gray-700">
                      → {action.consequence.points ? `+${action.consequence.points}pts` : action.consequence.type}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(action.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Bouton Sauvegarder et Récapitulatif */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button
        onClick={() => setShowRecap(true)}
        className="px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-lg"
      >
        📊 Récapitulatif du Match
      </button>
      <button
        onClick={saveMatch}
        className="px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg"
      >
        💾 Enregistrer le Match
      </button>
    </div>

    {/* Modal Récapitulatif */}
    {showRecap && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">📊 Récapitulatif du Match</h3>
            <button
              onClick={() => setShowRecap(false)}
              className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Info du match */}
          <div className="mb-4 text-center">
            <span className="inline-block px-4 py-2 rounded-lg text-sm font-semibold" style={{
              backgroundColor: currentMatchStats.location === 'home' ? '#dbeafe' : '#fee2e2',
              color: currentMatchStats.location === 'home' ? '#1e40af' : '#991b1b'
            }}>
              {currentMatchStats.location === 'home' ? '🏠 Match à Domicile' : '✈️ Match à l\'Extérieur'}
            </span>
          </div>

          {/* Score Final */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded-lg text-center">
              <div className="text-sm font-semibold text-blue-800">NOUS</div>
              <div className="text-5xl font-bold text-blue-600">{totalScoreNous}</div>
            </div>
            <div className="bg-red-100 p-4 rounded-lg text-center">
              <div className="text-sm font-semibold text-red-800">{currentMatchStats.adversaire.nom || 'ADVERSAIRE'}</div>
              <div className="text-5xl font-bold text-red-600">{totalScoreAdv}</div>
            </div>
          </div>

          {/* Scores par Quart-Temps */}
          <div className="mb-6">
            <h4 className="font-bold text-gray-700 mb-3">Scores par Quart-Temps</h4>
            <div className="grid grid-cols-4 gap-2">
              {currentMatchStats.quartersData.map((q, idx) => (
                <div key={idx} className="bg-gray-100 p-3 rounded text-center">
                  <div className="text-xs text-gray-600 font-semibold">Q{q.quarter}</div>
                  <div className="text-lg font-bold text-blue-600">{q.nous}</div>
                  <div className="text-xs text-gray-500">-</div>
                  <div className="text-lg font-bold text-red-600">{q.adversaire}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistiques Détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NOUS */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-bold text-blue-800 mb-3 text-lg">🏀 Notre Équipe</h4>
              <div className="space-y-3 text-sm">
                {/* Tirs */}
                <div className="border-b pb-2">
                  <div className="font-bold text-gray-700 mb-1">🎯 Tirs</div>
                  <div className="flex justify-between ml-2">
                    <span className="text-gray-700">Paniers 2 points:</span>
                    <span className="font-bold text-blue-600">
                      {getMatchStats().nous.paniers2pts.reussis}/{getMatchStats().nous.paniers2pts.tentes}
                      {getMatchStats().nous.paniers2pts.tentes > 0 && 
                        ` (${((getMatchStats().nous.paniers2pts.reussis / getMatchStats().nous.paniers2pts.tentes) * 100).toFixed(1)}%)`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between ml-2">
                    <span className="text-gray-700">Paniers 3 points:</span>
                    <span className="font-bold text-blue-600">
                      {getMatchStats().nous.paniers3pts.reussis}/{getMatchStats().nous.paniers3pts.tentes}
                      {getMatchStats().nous.paniers3pts.tentes > 0 && 
                        ` (${((getMatchStats().nous.paniers3pts.reussis / getMatchStats().nous.paniers3pts.tentes) * 100).toFixed(1)}%)`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between ml-2">
                    <span className="text-gray-700">Lancers Francs:</span>
                    <span className="font-bold text-blue-600">
                      {getMatchStats().nous.lancersFrancs.reussis}/{getMatchStats().nous.lancersFrancs.tentes}
                      {getMatchStats().nous.lancersFrancs.tentes > 0 && 
                        ` (${((getMatchStats().nous.lancersFrancs.reussis / getMatchStats().nous.lancersFrancs.tentes) * 100).toFixed(1)}%)`
                      }
                    </span>
                  </div>
                </div>

                {/* Rebonds Offensifs */}
                <div className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">🔄 Rebonds Offensifs:</span>
                    <span className="font-bold text-cyan-600">{getMatchStats().nous.rebondsOffensifs.total}</span>
                  </div>
                  {getMatchStats().nous.rebondsOffensifs.total > 0 && (
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      {getMatchStats().nous.rebondsOffensifs.consequences.panier2pts > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>→ Panier 2pts:</span>
                          <span>{getMatchStats().nous.rebondsOffensifs.consequences.panier2pts}</span>
                        </div>
                      )}
                      {getMatchStats().nous.rebondsOffensifs.consequences.panier3pts > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>→ Panier 3pts:</span>
                          <span>{getMatchStats().nous.rebondsOffensifs.consequences.panier3pts}</span>
                        </div>
                      )}
                      {getMatchStats().nous.rebondsOffensifs.consequences.faute > 0 && (
                        <div className="flex justify-between text-yellow-600">
                          <span>→ Faute:</span>
                          <span>{getMatchStats().nous.rebondsOffensifs.consequences.faute}</span>
                        </div>
                      )}
                      {getMatchStats().nous.rebondsOffensifs.consequences.rien > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>→ Rien:</span>
                          <span>{getMatchStats().nous.rebondsOffensifs.consequences.rien}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pertes de Balle */}
                <div className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">⚠️ Pertes de Balle:</span>
                    <span className="font-bold text-orange-600">{getMatchStats().nous.pertesDeBalle.total}</span>
                  </div>
                  {getMatchStats().nous.pertesDeBalle.total > 0 && (
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      {getMatchStats().nous.pertesDeBalle.consequences.panier2ptsNous > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>→ Panier 2pts Nous:</span>
                          <span>{getMatchStats().nous.pertesDeBalle.consequences.panier2ptsNous}</span>
                        </div>
                      )}
                      {getMatchStats().nous.pertesDeBalle.consequences.panier3ptsNous > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>→ Panier 3pts Nous:</span>
                          <span>{getMatchStats().nous.pertesDeBalle.consequences.panier3ptsNous}</span>
                        </div>
                      )}
                      {getMatchStats().nous.pertesDeBalle.consequences.panier2ptsAdv > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>→ Panier 2pts Adv:</span>
                          <span>{getMatchStats().nous.pertesDeBalle.consequences.panier2ptsAdv}</span>
                        </div>
                      )}
                      {getMatchStats().nous.pertesDeBalle.consequences.panier3ptsAdv > 0 && (
                        <div className="flex justify-between text-red-700">
                          <span>→ Panier 3pts Adv:</span>
                          <span>{getMatchStats().nous.pertesDeBalle.consequences.panier3ptsAdv}</span>
                        </div>
                      )}
                      {getMatchStats().nous.pertesDeBalle.consequences.faute > 0 && (
                        <div className="flex justify-between text-yellow-600">
                          <span>→ Faute:</span>
                          <span>{getMatchStats().nous.pertesDeBalle.consequences.faute}</span>
                        </div>
                      )}
                      {getMatchStats().nous.pertesDeBalle.consequences.rien > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>→ Rien:</span>
                          <span>{getMatchStats().nous.pertesDeBalle.consequences.rien}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Interceptions */}
                <div className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">🎯 Interceptions:</span>
                    <span className="font-bold text-purple-600">{getMatchStats().nous.interceptions.total}</span>
                  </div>
                  {getMatchStats().nous.interceptions.total > 0 && (
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      {getMatchStats().nous.interceptions.consequences.panier2pts > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>→ Panier 2pts:</span>
                          <span>{getMatchStats().nous.interceptions.consequences.panier2pts}</span>
                        </div>
                      )}
                      {getMatchStats().nous.interceptions.consequences.panier3pts > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>→ Panier 3pts:</span>
                          <span>{getMatchStats().nous.interceptions.consequences.panier3pts}</span>
                        </div>
                      )}
                      {getMatchStats().nous.interceptions.consequences.faute > 0 && (
                        <div className="flex justify-between text-yellow-600">
                          <span>→ Faute:</span>
                          <span>{getMatchStats().nous.interceptions.consequences.faute}</span>
                        </div>
                      )}
                      {getMatchStats().nous.interceptions.consequences.rien > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>→ Rien:</span>
                          <span>{getMatchStats().nous.interceptions.consequences.rien}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Autres */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Paniers Faciles Loupés:</span>
                    <span className="font-bold text-red-600">{getMatchStats().nous.paniersFacilesLoupes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Fautes:</span>
                    <span className="font-bold text-yellow-600">{getMatchStats().nous.fautes}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ADVERSAIRE */}
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-bold text-red-800 mb-3 text-lg">⚔️ Équipe Adverse</h4>
              <div className="space-y-3 text-sm">
                {/* Tirs */}
                <div className="border-b pb-2">
                  <div className="font-bold text-gray-700 mb-1">🎯 Tirs</div>
                  <div className="flex justify-between ml-2">
                    <span className="text-gray-700">Paniers 2 points:</span>
                    <span className="font-bold text-red-600">
                      {getMatchStats().adversaire.paniers2pts.reussis}/{getMatchStats().adversaire.paniers2pts.tentes}
                      {getMatchStats().adversaire.paniers2pts.tentes > 0 && 
                        ` (${((getMatchStats().adversaire.paniers2pts.reussis / getMatchStats().adversaire.paniers2pts.tentes) * 100).toFixed(1)}%)`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between ml-2">
                    <span className="text-gray-700">Paniers 3 points:</span>
                    <span className="font-bold text-red-600">
                      {getMatchStats().adversaire.paniers3pts.reussis}/{getMatchStats().adversaire.paniers3pts.tentes}
                      {getMatchStats().adversaire.paniers3pts.tentes > 0 && 
                        ` (${((getMatchStats().adversaire.paniers3pts.reussis / getMatchStats().adversaire.paniers3pts.tentes) * 100).toFixed(1)}%)`
                      }
                    </span>
                  </div>
                </div>

                {/* Rebonds Offensifs */}
                <div className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">🔄 Rebonds Offensifs:</span>
                    <span className="font-bold text-rose-600">{getMatchStats().adversaire.rebondsOffensifs.total}</span>
                  </div>
                  {getMatchStats().adversaire.rebondsOffensifs.total > 0 && (
                    <div className="ml-4 mt-1 text-xs space-y-1">
                      {getMatchStats().adversaire.rebondsOffensifs.consequences.panier2pts > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>→ Panier 2pts:</span>
                          <span>{getMatchStats().adversaire.rebondsOffensifs.consequences.panier2pts}</span>
                        </div>
                      )}
                      {getMatchStats().adversaire.rebondsOffensifs.consequences.panier3pts > 0 && (
                        <div className="flex justify-between text-red-700">
                          <span>→ Panier 3pts:</span>
                          <span>{getMatchStats().adversaire.rebondsOffensifs.consequences.panier3pts}</span>
                        </div>
                      )}
                      {getMatchStats().adversaire.rebondsOffensifs.consequences.faute > 0 && (
                        <div className="flex justify-between text-yellow-600">
                          <span>→ Faute:</span>
                          <span>{getMatchStats().adversaire.rebondsOffensifs.consequences.faute}</span>
                        </div>
                      )}
                      {getMatchStats().adversaire.rebondsOffensifs.consequences.rien > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>→ Rien:</span>
                          <span>{getMatchStats().adversaire.rebondsOffensifs.consequences.rien}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Autres */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Fautes:</span>
                    <span className="font-bold text-yellow-600">{getMatchStats().adversaire.fautes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowRecap(false)}
            className="mt-6 w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    )}
  </div>
</div>


);
}

// Module Historique
function HistoryModule({ shots, teamStats, exportToCSV, saveTeamStats }) {
const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
const [expandedMatch, setExpandedMatch] = useState(null);
const [locationFilter, setLocationFilter] = useState('all'); // 'all', 'home', 'away'

const deleteMatch = (matchIndex) => {
if (confirm('Supprimer ce match ?')) {
const newStats = teamStats.filter((_, idx) => idx !== matchIndex);
saveTeamStats(newStats);
alert('Match supprimé !');
}
};

const getGlobalStats = () => {
let totalTirs = 0;
let totalMarques = 0;


Object.values(shots).forEach(playerShots => {
  Object.values(playerShots).forEach(zoneData => {
    totalTirs += zoneData.tentes || 0;
    totalMarques += zoneData.marques || 0;
  });
});

let total3pts = 0;
let totalLF = 0;
let totalRebonds = 0;
let totalPertes = 0;
let totalInterceptions = 0;
let totalPaniersFacilesLoupes = 0;
let totalTirsLoupes = 0;
let totalRebondsAdv = 0;
let totalTirsLoupesAdv = 0;

// Nouvelles statistiques pour les conséquences globales
let rebondsConsequences = { panier2pts: 0, panier3pts: 0, faute: 0, rien: 0 };
let pertesConsequences = { panier2ptsNous: 0, panier3ptsNous: 0, panier2ptsAdv: 0, panier3ptsAdv: 0, faute: 0, rien: 0 };
let interceptionsConsequences = { panier2pts: 0, panier3pts: 0, faute: 0, rien: 0 };
let rebondsAdvConsequences = { panier2pts: 0, panier3pts: 0, faute: 0, rien: 0 };

// Filtrer les matchs selon le lieu
const filteredMatches = teamStats.filter(match => {
  if (locationFilter === 'all') return true;
  return (match.location || 'home') === locationFilter; // Par défaut 'home' pour les anciens matchs
});

filteredMatches.forEach(match => {
  match.quartersData.forEach(quarter => {
    quarter.actions.forEach(action => {
      // Ne compter que les actions non auto-générées
      if (!action.autoGenerated) {
        if (action.type === 'panier_3pts' && action.team === 'nous') total3pts++;
        if (action.type === 'lancer_franc' && action.team === 'nous') totalLF++;
        if (action.type === 'tir_loupe' && action.team === 'nous') totalTirsLoupes++;
        if (action.type === 'tir_loupe' && action.team === 'adversaire') totalTirsLoupesAdv++;
        if (action.type === 'panier_facile_loupe') totalPaniersFacilesLoupes++;
        
        // Rebonds offensifs avec conséquences
        if (action.type === 'rebond_offensif_nous') {
          totalRebonds++;
          if (action.consequence) {
            if (action.consequence.points === 2) rebondsConsequences.panier2pts++;
            if (action.consequence.points === 3) rebondsConsequences.panier3pts++;
            if (action.consequence.type === 'faute') rebondsConsequences.faute++;
          } else {
            rebondsConsequences.rien++;
          }
        }
        
        // Pertes de balle avec conséquences
        if (action.type === 'perte_balle') {
          totalPertes++;
          if (action.consequence) {
            if (action.consequence.team === 'nous' && action.consequence.points === 2) pertesConsequences.panier2ptsNous++;
            if (action.consequence.team === 'nous' && action.consequence.points === 3) pertesConsequences.panier3ptsNous++;
            if (action.consequence.team === 'adversaire' && action.consequence.points === 2) pertesConsequences.panier2ptsAdv++;
            if (action.consequence.team === 'adversaire' && action.consequence.points === 3) pertesConsequences.panier3ptsAdv++;
            if (action.consequence.type === 'faute') pertesConsequences.faute++;
          } else {
            pertesConsequences.rien++;
          }
        }
        
        // Interceptions avec conséquences
        if (action.type === 'interception') {
          totalInterceptions++;
          if (action.consequence) {
            if (action.consequence.points === 2) interceptionsConsequences.panier2pts++;
            if (action.consequence.points === 3) interceptionsConsequences.panier3pts++;
            if (action.consequence.type === 'faute') interceptionsConsequences.faute++;
          } else {
            interceptionsConsequences.rien++;
          }
        }
        
        // Rebonds offensifs adversaires avec conséquences
        if (action.type === 'rebond_offensif_adv') {
          totalRebondsAdv++;
          if (action.consequence) {
            if (action.consequence.points === 2) rebondsAdvConsequences.panier2pts++;
            if (action.consequence.points === 3) rebondsAdvConsequences.panier3pts++;
            if (action.consequence.type === 'faute') rebondsAdvConsequences.faute++;
          } else {
            rebondsAdvConsequences.rien++;
          }
        }
      }
    });
  });
});

return {
  tirs: { total: totalTirs, marques: totalMarques },
  troisPoints: total3pts,
  lancersFrancs: totalLF,
  rebonds: totalRebonds,
  pertes: totalPertes,
  interceptions: totalInterceptions,
  paniersFacilesLoupes: totalPaniersFacilesLoupes,
  tirsLoupes: totalTirsLoupes,
  rebondsAdv: totalRebondsAdv,
  tirsLoupesAdv: totalTirsLoupesAdv,
  matchs: filteredMatches.length,
  rebondsConsequences: rebondsConsequences,
  pertesConsequences: pertesConsequences,
  interceptionsConsequences: interceptionsConsequences,
  rebondsAdvConsequences: rebondsAdvConsequences
};


};

const globalStats = getGlobalStats();
const dailyMatches = teamStats.filter(m => m.date === selectedDate);

return (
<div className="max-w-6xl mx-auto space-y-6">
{/* Statistiques Globales */}
<div className="bg-white rounded-lg shadow-lg p-6">
<div className="flex justify-between items-center mb-6">
<h2 className="text-3xl font-bold text-gray-800">📈 Statistiques Globales</h2>


      {/* Filtre par lieu */}
      <select
        value={locationFilter}
        onChange={(e) => setLocationFilter(e.target.value)}
        className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold"
      >
        <option value="all">🌍 Tous les matchs</option>
        <option value="home">🏠 Matchs à domicile</option>
        <option value="away">✈️ Matchs à l'extérieur</option>
      </select>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-blue-600">{globalStats.matchs}</div>
        <div className="text-sm text-gray-600">Matchs</div>
      </div>
      <div className="bg-green-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-green-600">
          {globalStats.tirs.total > 0 ? ((globalStats.tirs.marques / globalStats.tirs.total) * 100).toFixed(1) : '0'}%
        </div>
        <div className="text-sm text-gray-600">Réussite Tirs</div>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-purple-600">{globalStats.troisPoints}</div>
        <div className="text-sm text-gray-600">3 Points</div>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-orange-600">{globalStats.lancersFrancs}</div>
        <div className="text-sm text-gray-600">Lancers Francs</div>
      </div>
      <div className="bg-cyan-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-cyan-600">{globalStats.rebonds}</div>
        <div className="text-sm text-gray-600">Rebonds Off. Nous</div>
      </div>
      <div className="bg-red-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-red-600">{globalStats.pertes}</div>
        <div className="text-sm text-gray-600">Pertes</div>
      </div>
      <div className="bg-indigo-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-indigo-600">{globalStats.interceptions}</div>
        <div className="text-sm text-gray-600">Interceptions</div>
      </div>
      <div className="bg-pink-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-pink-600">{globalStats.paniersFacilesLoupes}</div>
        <div className="text-sm text-gray-600">Paniers Faciles Loupés</div>
      </div>
      <div className="bg-amber-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-amber-600">{globalStats.tirsLoupes}</div>
        <div className="text-sm text-gray-600">Tirs Loupés Nous</div>
      </div>
      <div className="bg-rose-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-rose-600">{globalStats.rebondsAdv}</div>
        <div className="text-sm text-gray-600">Rebonds Off. Adv</div>
      </div>
      <div className="bg-fuchsia-50 p-4 rounded-lg text-center">
        <div className="text-3xl font-bold text-fuchsia-600">{globalStats.tirsLoupesAdv}</div>
        <div className="text-sm text-gray-600">Tirs Loupés Adv</div>
      </div>
    </div>
  </div>

  {/* Liste de tous les matchs */}
  <div className="bg-white rounded-lg shadow-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800">🏀 Tous les Matchs</h2>
      <button
        onClick={exportToCSV}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
      >
        💾 Exporter CSV
      </button>
    </div>

    {teamStats.length === 0 ? (
      <div className="text-center py-8 text-gray-500">Aucun match</div>
    ) : (
      <div className="space-y-4">
        {teamStats.map((match, matchIdx) => {
          const scoreNous = match.quartersData.reduce((sum, q) => sum + q.nous, 0);
          const scoreAdv = match.quartersData.reduce((sum, q) => sum + q.adversaire, 0);
          const isExpanded = expandedMatch === matchIdx;

          return (
            <div key={matchIdx} className="border rounded-lg overflow-hidden">
              <div
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedMatch(isExpanded ? null : matchIdx)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">vs {match.adversaire.nom}</h3>
                    <p className="text-sm text-gray-600">{match.date} à {match.time}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${scoreNous > scoreAdv ? 'text-green-600' : scoreNous < scoreAdv ? 'text-red-600' : 'text-gray-600'}`}>
                      {scoreNous} - {scoreAdv}
                    </div>
                    <div className="text-sm text-gray-600">
                      {scoreNous > scoreAdv ? 'Victoire' : scoreNous < scoreAdv ? 'Défaite' : 'Égalité'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {match.quartersData.map((q, idx) => (
                    <div key={idx} className="flex-1 text-center bg-gray-100 rounded p-2">
                      <div className="text-xs text-gray-600">Q{q.quarter}</div>
                      <div className="text-sm font-semibold">{q.nous}-{q.adversaire}</div>
                    </div>
                  ))}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="space-y-3">
                    {match.quartersData.map((quarter, qIdx) => (
                      <div key={qIdx} className="bg-white rounded p-3">
                        <h4 className="font-bold mb-2">Q{quarter.quarter}</h4>
                        {quarter.actions.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucune action</p>
                        ) : (
                          <div className="space-y-1">
                            {quarter.actions.map((action, aIdx) => (
                              <div key={aIdx} className="text-sm flex justify-between">
                                <span>
                                  {action.type === 'tir_loupe' 
                                    ? `Tir loupé ${action.shotType ? action.shotType : ''}`
                                    : action.type.replace(/_/g, ' ')
                                  }
                                  {action.player && ` - ${action.player}`}
                                </span>
                                <span className="font-semibold">
                                  {action.points > 0 && `+${action.points}pts`}
                                  {action.consequence && ` → ${action.consequence.points ? `+${action.consequence.points}pts` : 'faute'}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMatch(matchIdx);
                    }}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>

  {/* Historique par Jour */}
  <div className="bg-white rounded-lg shadow-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800">📅 Matchs par Date</h2>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="px-4 py-2 border-2 border-gray-300 rounded-lg"
      />
    </div>

    {dailyMatches.length === 0 ? (
      <div className="text-center py-8 text-gray-500">Aucun match pour cette date</div>
    ) : (
      <div className="space-y-3">
        {dailyMatches.map((match, idx) => {
          const scoreNous = match.quartersData.reduce((sum, q) => sum + q.nous, 0);
          const scoreAdv = match.quartersData.reduce((sum, q) => sum + q.adversaire, 0);

          return (
            <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">vs {match.adversaire.nom}</h3>
                  <p className="text-sm text-gray-600">
                    {match.time}
                    <span className="ml-2 px-2 py-1 rounded text-xs font-semibold" style={{
                      backgroundColor: (match.location || 'home') === 'home' ? '#dbeafe' : '#fee2e2',
                      color: (match.location || 'home') === 'home' ? '#1e40af' : '#991b1b'
                    }}>
                      {(match.location || 'home') === 'home' ? '🏠 Domicile' : '✈️ Extérieur'}
                    </span>
                  </p>
                </div>
                <div className={`text-2xl font-bold ${scoreNous > scoreAdv ? 'text-green-600' : scoreNous < scoreAdv ? 'text-red-600' : 'text-gray-600'}`}>
                  {scoreNous} - {scoreAdv}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>


);
}

// Rendu de l'application
ReactDOM.render(<BasketballStatsApp />, document.getElementById('root'));
