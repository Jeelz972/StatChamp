import React, { useState, useEffect } from 'react';

// Configuration des constantes
const ZONES = [
  { id: 'gauche_0', name: '0° gauche', color: '#3b82f6' },
  { id: 'gauche_45', name: '45° gauche', color: '#10b981' },
  { id: 'gauche_70', name: '70° gauche', color: '#06b6d4' },
  { id: 'axe', name: 'Axe', color: '#6366f1' },
  { id: 'droit_70', name: '70° droit', color: '#ef4444' },
  { id: 'droit_45', name: '45° droit', color: '#f59e0b' },
  { id: 'droit_0', name: '0° droit', color: '#ec4899' }
];

const PLAYERS = [
  { id: 1, name: 'Nathanaël' },
  { id: 2, name: 'Keziah' },
  { id: 3, name: 'Sacha' },
  { id: 4, name: 'Maxime' },
  { id: 5, name: 'Marco' },
  { id: 6, name: 'Theotime' },
  { id: 7, name: 'Nathan' },
  { id: 8, name: 'Noe' },
  { id: 9, name: 'Thierno' },
  { id: 10, name: 'Valentin' },
  { id: 11, name: 'Jad' },
  { id: 12, name: 'Peniel' },
  { id: 13, name: 'Ariel' }
];

export default function BasketballStatsApp() {
  const [activeModule, setActiveModule] = useState('shooting');
  const [dailyShots, setDailyShots] = useState({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    try {
      const savedDailyShots = localStorage.getItem('basketball_daily_shots');
      if (savedDailyShots) setDailyShots(JSON.parse(savedDailyShots));
    } catch (error) {
      console.log('Initialisation des données');
    }
  };

  const saveDailyShots = (newShots) => {
    setDailyShots(newShots);
    localStorage.setItem('basketball_daily_shots', JSON.stringify(newShots));
  };

  const exportAllDataToCSV = () => {
    let csv = '=== STATISTIQUES DE TIR PAR DATE ===\n';
    csv += 'Date,Joueur,Zone,Tirs Tentés,Tirs Marqués,Pourcentage\n';
    
    Object.keys(dailyShots).sort().forEach(date => {
      PLAYERS.forEach(player => {
        const playerShots = dailyShots[date]?.[player.id] || {};
        ZONES.forEach(zone => {
          const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
          if (zoneData.tentes > 0) {
            const pct = ((zoneData.marques / zoneData.tentes) * 100).toFixed(1);
            csv += `${date},${player.name},${zone.name},${zoneData.tentes},${zoneData.marques},${pct}%\n`;
          }
        });
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stats_basketball_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetAllData = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer TOUTES les données ?')) {
      setDailyShots({});
      localStorage.removeItem('basketball_daily_shots');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="bg-gradient-to-r from-orange-600 to-blue-600 p-4 text-white shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">🏀 Stats Basketball Pro</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveModule('shooting')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeModule === 'shooting' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              📊 Prise de Stats
            </button>
            <button
              onClick={() => setActiveModule('daily')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeModule === 'daily' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              📅 Stats Journalières
            </button>
            <button
              onClick={() => setActiveModule('global')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeModule === 'global' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              📈 Stats Globales
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {activeModule === 'shooting' && (
          <ShootingModule 
            dailyShots={dailyShots} 
            saveDailyShots={saveDailyShots}
            exportToCSV={exportAllDataToCSV}
            resetData={resetAllData}
          />
        )}
        {activeModule === 'daily' && (
          <DailyStatsModule dailyShots={dailyShots} />
        )}
        {activeModule === 'global' && (
          <GlobalStatsModule dailyShots={dailyShots} exportToCSV={exportAllDataToCSV} />
        )}
      </div>
    </div>
  );
}

function ShootingModule({ dailyShots, saveDailyShots, exportToCSV, resetData }) {
  const [selectedPlayer, setSelectedPlayer] = useState(PLAYERS[0]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [inputTentes, setInputTentes] = useState('');
  const [inputMarques, setInputMarques] = useState('');
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);

  const validateEntry = () => {
    if (!selectedPlayer || !selectedZone) return;
    
    const tentes = parseInt(inputTentes) || 0;
    const marques = parseInt(inputMarques) || 0;

    if (tentes === 0) return;
    if (marques > tentes) {
      alert('Le nombre de tirs marqués ne peut pas dépasser le nombre de tirs tentés');
      return;
    }

    const newDailyShots = { ...dailyShots };
    if (!newDailyShots[currentDate]) newDailyShots[currentDate] = {};
    if (!newDailyShots[currentDate][selectedPlayer.id]) {
      newDailyShots[currentDate][selectedPlayer.id] = {};
    }
    
    const playerShots = newDailyShots[currentDate][selectedPlayer.id];
    const zoneShots = playerShots[selectedZone] || { tentes: 0, marques: 0 };

    newDailyShots[currentDate][selectedPlayer.id][selectedZone] = {
      tentes: zoneShots.tentes + tentes,
      marques: zoneShots.marques + marques
    };

    saveDailyShots(newDailyShots);
    setInputTentes('');
    setInputMarques('');
  };

  const getTodayPlayerStats = (playerId) => {
    const playerShots = dailyShots[currentDate]?.[playerId] || {};
    let tentes = 0;
    let marques = 0;
    
    ZONES.forEach(zone => {
      const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
      tentes += zoneData.tentes;
      marques += zoneData.marques;
    });

    return { tentes, marques, pct: tentes > 0 ? ((marques / tentes) * 100).toFixed(1) : '0' };
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-80 bg-gray-50 border-r border-gray-200 p-4">
            <div className="mb-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm font-semibold text-gray-700">Date</p>
              <p className="text-lg font-bold text-blue-800">
                {new Date(currentDate).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-4">👥 Joueurs</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {PLAYERS.map(player => {
                const stats = getTodayPlayerStats(player.id);
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
                      Aujourd'hui: {stats.tentes} tirs • {stats.pct}%
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
                    const zoneData = (dailyShots[currentDate]?.[selectedPlayer.id] || {})[zone.id] || { tentes: 0, marques: 0 };
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
  );
}

function DailyStatsModule({ dailyShots }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const getPlayerStatsForDate = (playerId, date) => {
    const playerShots = dailyShots[date]?.[playerId] || {};
    let tentes = 0;
    let marques = 0;
    
    ZONES.forEach(zone => {
      const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
      tentes += zoneData.tentes;
      marques += zoneData.marques;
    });

    return { tentes, marques, pct: tentes > 0 ? ((marques / tentes) * 100).toFixed(1) : '0', zones: playerShots };
  };

  const dateHasData = (date) => {
    return dailyShots[date] && Object.keys(dailyShots[date]).length > 0;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-800">📅 Statistiques Journalières</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Sélectionner une date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedPlayer(null);
              }}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {!dateHasData(selectedDate) ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">Aucune statistique enregistrée pour cette date</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PLAYERS.map(player => {
              const stats = getPlayerStatsForDate(player.id, selectedDate);
              if (stats.tentes === 0) return null;

              return (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedPlayer?.id === player.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xl'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <h3 className="font-bold text-lg mb-2">{player.name}</h3>
                  <div className={`text-sm ${selectedPlayer?.id === player.id ? 'text-blue-100' : 'text-gray-600'}`}>
                    <p>{stats.marques}/{stats.tentes} tirs</p>
                    <p className="text-2xl font-bold mt-1">{stats.pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedPlayer && dateHasData(selectedDate) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Détail par zone - {selectedPlayer.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ZONES.map(zone => {
              const stats = getPlayerStatsForDate(selectedPlayer.id, selectedDate);
              const zoneData = stats.zones[zone.id] || { tentes: 0, marques: 0 };
              if (zoneData.tentes === 0) return null;

              const pct = ((zoneData.marques / zoneData.tentes) * 100).toFixed(1);

              return (
                <div
                  key={zone.id}
                  className="p-4 rounded-lg border-4"
                  style={{ borderColor: zone.color, backgroundColor: 'white' }}
                >
                  <h4 className="font-bold mb-2" style={{ color: zone.color }}>
                    {zone.name}
                  </h4>
                  <div className="text-gray-700">
                    <p className="text-lg">{zoneData.marques}/{zoneData.tentes}</p>
                    <p className="text-2xl font-bold" style={{ color: zone.color }}>
                      {pct}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GlobalStatsModule({ dailyShots, exportToCSV }) {
  const [viewMode, setViewMode] = useState('table'); // table or player

  const getGlobalPlayerStats = (playerId) => {
    let tentes = 0;
    let marques = 0;
    const zoneStats = {};

    ZONES.forEach(zone => {
      zoneStats[zone.id] = { tentes: 0, marques: 0 };
    });

    Object.keys(dailyShots).forEach(date => {
      const playerShots = dailyShots[date][playerId] || {};
      ZONES.forEach(zone => {
        const zoneData = playerShots[zone.id] || { tentes: 0, marques: 0 };
        tentes += zoneData.tentes;
        marques += zoneData.marques;
        zoneStats[zone.id].tentes += zoneData.tentes;
        zoneStats[zone.id].marques += zoneData.marques;
      });
    });

    return { 
      tentes, 
      marques, 
      pct: tentes > 0 ? ((marques / tentes) * 100).toFixed(1) : '0',
      zones: zoneStats
    };
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">📈 Statistiques Globales</h2>
          <button
            onClick={exportToCSV}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            💾 Exporter CSV
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
                const stats = getGlobalPlayerStats(player.id);
                if (stats.tentes === 0) return null;
                
                return (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3 font-semibold">{player.name}</td>
                    {ZONES.map(zone => {
                      const zoneData = stats.zones[zone.id];
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
