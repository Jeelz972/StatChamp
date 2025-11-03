const { useState, useEffect, useRef } = React;

const ZONES = [
  { id: 'gauche_0', name: 'Gauche 0°', color: '#3b82f6' },
  { id: 'droit_0', name: 'Droit 0°', color: '#ec4899' },
  { id: 'gauche_45', name: 'Gauche 45°', color: '#10b981' },
  { id: 'droit_45', name: 'Droit 45°', color: '#f59e0b' },
  { id: 'gauche_70', name: 'Gauche 70°', color: '#06b6d4' },
  { id: 'droit_70', name: 'Droit 70°', color: '#ef4444' },
  { id: 'axe', name: 'Axe', color: '#6366f1' }
];

function BasketballStatsTracker() {
  const [players] = useState([
    { id: 1, name: 'Maxime' },
    { id: 2, name: 'Sasha' },
    { id: 3, name: 'Théotime' },
    { id: 4, name: 'Noé' },
    { id: 5, name: 'Keziah' },
    { id: 6, name: 'Nathan' },
    { id: 7, name: 'Valentin' },
    { id: 8, name: 'Jad' },
    { id: 9, name: 'Marco' },
    { id: 10, name: 'Thierno' },
    { id: 11, name: 'Peniel' },
    { id: 12, name: 'Nat' }
  ]);
  const [selectedPlayer, setSelectedPlayer] = useState(players[0]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [shots, setShots] = useState({});
  const [inputTentes, setInputTentes] = useState('');
  const [inputMarques, setInputMarques] = useState('');
  const [view, setView] = useState('main');
  const tentesRef = useRef(null);
  const marquesRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const savedShots = localStorage.getItem('basketball_shots');
      if (savedShots) {
        setShots(JSON.parse(savedShots));
      }
    } catch (error) {
      console.log('Initialisation des données');
    }
  };

  const saveData = (newShots) => {
    try {
      localStorage.setItem('basketball_shots', JSON.stringify(newShots || shots));
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
    }
  };

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
    
    setShots(newShots);
    saveData(newShots);
    
    setInputTentes('');
    setInputMarques('');
    // remettre le focus sur tentes pour saisie rapide
    if (tentesRef.current) tentesRef.current.focus();
  };

  const exportToCSV = () => {
    let csv = 'Joueur,Zone,Tirs Tentés,Tirs Marqués,Pourcentage\n';
    
    players.forEach(player => {
      const playerShots = shots[player.id] || {};
      ZONES.forEach(zone => {
        const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
        const pct = zoneData.tentes > 0 ? ((zoneData.marques / zoneData.tentes) * 100).toFixed(1) : '0';
        csv += `${player.name},${zone.name},${zoneData.tentes},${zoneData.marques},${pct}%\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stats_basketball_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetAllData = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données ?')) {
      setShots({});
      setSelectedZone(null);
      localStorage.removeItem('basketball_shots');
    }
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

  if (view === 'stats') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Statistiques de l'Équipe</h2>
              <button
                onClick={() => setView('main')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-lg font-semibold"
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
                  {players.map(player => {
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-blue-600 p-6 text-white">
            <h1 className="text-4xl font-bold mb-2">🏀 Stats de Tir Basketball</h1>
            <p className="text-lg opacity-90">Sélectionnez joueur → zone → entrez les tirs</p>
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-80 bg-gray-50 border-r border-gray-200 p-4">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">👥 Joueurs (12)</h2>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {players.map(player => {
                  const stats = getPlayerStats(player.id);
                  const isSelected = selectedPlayer?.id === player.id;
                  
                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{player.name}</h3>
                          <p className={`text-sm ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}> 
                            {stats.tentes} tirs • {stats.pct}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 p-6">
              {!selectedPlayer ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p className="text-2xl mb-2">👈</p>
                    <p className="text-xl">Sélectionnez un joueur pour commencer</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">
                      Joueur sélectionné : {selectedPlayer.name}
                    </h2>
                    <p className="text-gray-600">Sélectionnez une zone de tir ci-dessous</p>
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
                            isSelected
                              ? 'shadow-2xl scale-105'
                              : 'shadow-md hover:scale-102'
                          }`}
                          style={{
                            borderColor: zone.color,
                            backgroundColor: isSelected ? zone.color : 'white',
                            color: isSelected ? 'white' : zone.color
                          }}
                        >
                          <h3 className="font-bold text-lg mb-2">{zone.name}</h3>
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
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">
                        Zone : {ZONES.find(z => z.id === selectedZone)?.name}
                      </h3>
                      
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Tirs tentés
                          </label>
                          <input
                            ref={tentesRef}
                            type="number"
                            min="0"
                            value={inputTentes}
                            onChange={(e) => setInputTentes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // si on appuie sur Enter dans Tentes -> passer à Marques
                                e.preventDefault();
                                if (marquesRef.current) marquesRef.current.focus();
                              }
                            }}
                            placeholder="0"
                            className="w-full px-4 py-3 text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Tirs marqués
                          </label>
                          <input
                            ref={marquesRef}
                            type="number"
                            min="0"
                            value={inputMarques}
                            onChange={(e) => setInputMarques(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // si on appuie sur Enter dans Marques -> valider
                                e.preventDefault();
                                validateEntry();
                              }
                            }}
                            placeholder="0"
                            className="w-full px-4 py-3 text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                          />
                        </div>

                        <button
                          onClick={validateEntry}
                          disabled={!inputTentes}
                          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-xl font-bold shadow-lg"
                        >
                          ✓ VALIDER
                        </button>
                      </div>

                      <p className="text-sm text-gray-600 mt-3">
                        Exemple : 10 tentés, 8 marqués = 8 paniers sur 10 tentatives (80%)
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-6 flex-wrap">
                <button
                  onClick={() => setView('stats')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                >
                  📊 Voir Statistiques
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  💾 Exporter CSV
                </button>
                <button
                  onClick={resetAllData}
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
}

ReactDOM.render(<BasketballStatsTracker />, document.getElementById('root'));