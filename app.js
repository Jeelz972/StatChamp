import React, { useState, useEffect } from 'react';
import { Plus, BarChart3, ArrowLeft, Trophy, Trash2, Home, MapPin, X, Check } from 'lucide-react';

const MatchStatsApp = () => {
  const [matches, setMatches] = useState({});
  const [currentScreen, setCurrentScreen] = useState('home');
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [pendingConsequence, setPendingConsequence] = useState(null);
  const [history, setHistory] = useState([]);
  const [showMatchSetup, setShowMatchSetup] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [matchSetup, setMatchSetup] = useState({
    adversaire: '',
    lieu: 'domicile'
  });

  // Charger les données depuis le stockage persistant
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await window.storage.get('basketball_matches');
      if (result) {
        setMatches(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('Pas de données sauvegardées ou erreur de chargement');
    }
  };

  // Sauvegarder les données
  const saveData = async (data) => {
    try {
      await window.storage.set('basketball_matches', JSON.stringify(data));
      setMatches(data);
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      // Fallback sur le state local
      setMatches(data);
    }
  };

  // Créer un nouveau match
  const createNewMatch = () => {
    setMatchSetup({ adversaire: '', lieu: 'domicile' });
    setShowMatchSetup(true);
  };

  const confirmMatchSetup = () => {
    if (!matchSetup.adversaire.trim()) {
      alert('Veuillez entrer le nom de l\'adversaire');
      return;
    }

    const matchId = `match_${Date.now()}`;
    const newMatch = {
      id: matchId,
      date: new Date().toLocaleString('fr-FR'),
      adversaire: matchSetup.adversaire,
      lieu: matchSetup.lieu,
      quarters: {
        1: { equipe: 0, adversaire: 0 },
        2: { equipe: 0, adversaire: 0 },
        3: { equipe: 0, adversaire: 0 },
        4: { equipe: 0, adversaire: 0 }
      },
      equipe: {
        pts3_made: 0,
        pts3_taken: 0,
        lf_made: 0,
        lf_taken: 0,
        perte_panier2: 0,
        perte_panier3: 0,
        perte_faute: 0,
        perte_rien: 0,
        reb_panier2: 0,
        reb_panier3: 0,
        reb_faute: 0,
        reb_rien: 0,
        inter_panier2: 0,
        inter_panier3: 0,
        inter_faute: 0,
        inter_rien: 0,
        panier_facile_loupe: 0
      },
      adversaire_stats: {
        pts3_made: 0,
        pts3_taken: 0,
        lf_made: 0,
        lf_taken: 0,
        reb_panier2: 0,
        reb_panier3: 0,
        reb_faute: 0,
        reb_rien: 0
      }
    };

    const updatedMatches = { ...matches, [matchId]: newMatch };
    saveData(updatedMatches);
    setCurrentMatchId(matchId);
    setShowMatchSetup(false);
    setCurrentScreen('match');
    setCurrentQuarter(1);
    setHistory([]);
  };

  // Supprimer un match
  const deleteMatch = (matchId) => {
    const updatedMatches = { ...matches };
    delete updatedMatches[matchId];
    saveData(updatedMatches);
    setMatchToDelete(null);
  };

  // Modifier le score
  const updateScore = (team, delta) => {
    const match = { ...matches[currentMatchId] };
    match.quarters[currentQuarter][team] = Math.max(0, match.quarters[currentQuarter][team] + delta);
    saveData({ ...matches, [currentMatchId]: match });
  };

  // Ajouter une stat simple
  const addSimpleStat = (team, statName, value = 1) => {
    const match = { ...matches[currentMatchId] };
    const targetStats = team === 'adversaire' ? match.adversaire_stats : match[team];
    const oldValue = targetStats[statName];
    targetStats[statName] += value;
    
    setHistory([...history, { 
      matchId: currentMatchId,
      team, 
      statName, 
      oldValue, 
      newValue: targetStats[statName] 
    }]);
    
    saveData({ ...matches, [currentMatchId]: match });
  };

  // Ajouter shot marqué
  const addMadeShot = (team, shotType) => {
    const match = { ...matches[currentMatchId] };
    const targetStats = team === 'adversaire' ? match.adversaire_stats : match[team];
    const madeKey = `${shotType}_made`;
    const takenKey = `${shotType}_taken`;
    
    const oldMade = targetStats[madeKey];
    const oldTaken = targetStats[takenKey];
    
    targetStats[madeKey] += 1;
    targetStats[takenKey] += 1;
    
    setHistory([...history, { 
      matchId: currentMatchId,
      team, 
      stats: [
        { statName: madeKey, oldValue: oldMade, newValue: targetStats[madeKey] },
        { statName: takenKey, oldValue: oldTaken, newValue: targetStats[takenKey] }
      ]
    }]);
    
    saveData({ ...matches, [currentMatchId]: match });
  };

  // Ajouter une conséquence
  const addConsequence = (consequence) => {
    const match = { ...matches[currentMatchId] };
    const { team, action } = pendingConsequence;
    const targetStats = team === 'adversaire' ? match.adversaire_stats : match[team];
    const statName = `${action}_${consequence}`;
    
    const oldValue = targetStats[statName];
    targetStats[statName] += 1;
    
    setHistory([...history, { 
      matchId: currentMatchId,
      team, 
      statName, 
      oldValue, 
      newValue: targetStats[statName] 
    }]);
    
    saveData({ ...matches, [currentMatchId]: match });
    setPendingConsequence(null);
  };

  // Annuler la dernière action
  const undoLastAction = () => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    if (lastAction.matchId !== currentMatchId) return;
    
    const match = { ...matches[currentMatchId] };
    const targetStats = lastAction.team === 'adversaire' ? match.adversaire_stats : match[lastAction.team];
    
    if (lastAction.stats) {
      lastAction.stats.forEach(stat => {
        targetStats[stat.statName] = stat.oldValue;
      });
    } else {
      targetStats[lastAction.statName] = lastAction.oldValue;
    }
    
    saveData({ ...matches, [currentMatchId]: match });
    setHistory(history.slice(0, -1));
  };

  // Calculer le score total
  const calculateTotalScore = (match) => {
    let equipe = 0, adversaire = 0;
    Object.values(match.quarters).forEach(q => {
      equipe += q.equipe;
      adversaire += q.adversaire;
    });
    return { equipe, adversaire };
  };

  // Calculer les stats globales
  const calculateGlobalStats = () => {
    const global = {
      equipe: {
        pts3_made: 0,
        pts3_taken: 0,
        lf_made: 0,
        lf_taken: 0,
        pertes: 0,
        rebonds: 0,
        interceptions: 0,
        paniers_loupes: 0,
        victories: 0,
        defeats: 0,
        totalMatches: 0
      },
      adversaire: {
        pts3_made: 0,
        pts3_taken: 0,
        lf_made: 0,
        lf_taken: 0,
        rebonds: 0
      }
    };

    Object.values(matches).forEach(match => {
      if (match.equipe && match.adversaire_stats) {
        global.equipe.totalMatches++;
        
        // Calculer victoires/défaites
        const totals = calculateTotalScore(match);
        if (totals.equipe > totals.adversaire) {
          global.equipe.victories++;
        } else if (totals.equipe < totals.adversaire) {
          global.equipe.defeats++;
        }
        
        // Stats équipe
        global.equipe.pts3_made += match.equipe.pts3_made || 0;
        global.equipe.pts3_taken += match.equipe.pts3_taken || 0;
        global.equipe.lf_made += match.equipe.lf_made || 0;
        global.equipe.lf_taken += match.equipe.lf_taken || 0;
        global.equipe.pertes += (match.equipe.perte_panier2 || 0) + (match.equipe.perte_panier3 || 0) + 
                                 (match.equipe.perte_faute || 0) + (match.equipe.perte_rien || 0);
        global.equipe.rebonds += (match.equipe.reb_panier2 || 0) + (match.equipe.reb_panier3 || 0) + 
                                  (match.equipe.reb_faute || 0) + (match.equipe.reb_rien || 0);
        global.equipe.interceptions += (match.equipe.inter_panier2 || 0) + (match.equipe.inter_panier3 || 0) + 
                                        (match.equipe.inter_faute || 0) + (match.equipe.inter_rien || 0);
        global.equipe.paniers_loupes += match.equipe.panier_facile_loupe || 0;

        // Stats adversaire
        global.adversaire.pts3_made += match.adversaire_stats.pts3_made || 0;
        global.adversaire.pts3_taken += match.adversaire_stats.pts3_taken || 0;
        global.adversaire.lf_made += match.adversaire_stats.lf_made || 0;
        global.adversaire.lf_taken += match.adversaire_stats.lf_taken || 0;
        global.adversaire.rebonds += (match.adversaire_stats.reb_panier2 || 0) + 
                                      (match.adversaire_stats.reb_panier3 || 0) + 
                                      (match.adversaire_stats.reb_faute || 0) + 
                                      (match.adversaire_stats.reb_rien || 0);
      }
    });

    return global;
  };

  const formatPercentage = (made, taken) => {
    if (taken === 0) return '0%';
    return `${Math.round((made / taken) * 100)}%`;
  };

  // Modal de configuration du match
  if (showMatchSetup) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Nouveau Match</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nom de l'adversaire
            </label>
            <input
              type="text"
              value={matchSetup.adversaire}
              onChange={(e) => setMatchSetup({ ...matchSetup, adversaire: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex: Lakers"
              autoFocus
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Lieu du match
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMatchSetup({ ...matchSetup, lieu: 'domicile' })}
                className={`py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  matchSetup.lieu === 'domicile'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Home size={20} />
                Domicile
              </button>
              <button
                onClick={() => setMatchSetup({ ...matchSetup, lieu: 'exterieur' })}
                className={`py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  matchSetup.lieu === 'exterieur'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <MapPin size={20} />
                Extérieur
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowMatchSetup(false)}
              className="bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-semibold transition-all"
            >
              Annuler
            </button>
            <button
              onClick={confirmMatchSetup}
              className="bg-orange-600 hover:bg-orange-700 py-3 rounded-xl font-bold transition-all"
            >
              Commencer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal de suppression
  if (matchToDelete) {
    const match = matches[matchToDelete];
    const totals = calculateTotalScore(match);
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Confirmer la suppression</h2>
          <p className="text-gray-300 mb-6">
            Êtes-vous sûr de vouloir supprimer ce match ?
          </p>
          <div className="bg-gray-800 rounded-xl p-4 mb-6">
            <p className="font-semibold">{match.adversaire}</p>
            <p className="text-sm text-gray-400">{match.date}</p>
            <p className="text-sm mt-2">
              Score: <span className="text-green-400">{totals.equipe}</span> - <span className="text-red-400">{totals.adversaire}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMatchToDelete(null)}
              className="bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-semibold transition-all"
            >
              Annuler
            </button>
            <button
              onClick={() => deleteMatch(matchToDelete)}
              className="bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={20} />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ÉCRAN D'ACCUEIL
  if (currentScreen === 'home') {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
              <BarChart3 className="text-orange-500" size={40} />
              Stats Match Basket
            </h1>
            <p className="text-gray-400">Module de statistiques de match</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={createNewMatch}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 p-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all shadow-lg transform hover:scale-105"
            >
              <Plus size={28} />
              Nouveau Match
            </button>
            <button
              onClick={() => setCurrentScreen('global')}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 p-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all shadow-lg transform hover:scale-105"
            >
              <Trophy size={28} />
              Vue Globale
            </button>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Matchs enregistrés</h2>
            {Object.keys(matches).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Aucun match enregistré</p>
                <p className="text-sm mt-2">Créez votre premier match pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(matches).reverse().map(match => {
                  const totals = calculateTotalScore(match);
                  const isVictory = totals.equipe > totals.adversaire;
                  return (
                    <div
                      key={match.id}
                      className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl transition-all group relative"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setCurrentMatchId(match.id);
                          setCurrentScreen('match');
                          setHistory([]);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-bold text-lg">{match.adversaire}</p>
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                match.lieu === 'domicile' 
                                  ? 'bg-green-900 text-green-300' 
                                  : 'bg-blue-900 text-blue-300'
                              }`}>
                                {match.lieu === 'domicile' ? <Home size={14} className="inline mr-1" /> : <MapPin size={14} className="inline mr-1" />}
                                {match.lieu === 'domicile' ? 'Domicile' : 'Extérieur'}
                              </span>
                              {isVictory && (
                                <span className="bg-yellow-900 text-yellow-400 px-2 py-1 rounded-lg text-xs font-semibold">
                                  <Trophy size={14} className="inline mr-1" />
                                  Victoire
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-sm">{match.date}</p>
                            <p className="text-sm mt-2">
                              Score final: <span className={`font-bold ${isVictory ? 'text-green-400' : 'text-green-500'}`}>{totals.equipe}</span> 
                              <span className="text-gray-500 mx-2">-</span> 
                              <span className={`font-bold ${!isVictory ? 'text-red-400' : 'text-red-500'}`}>{totals.adversaire}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMatchToDelete(match.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                            <div className="text-blue-400 font-semibold">
                              →
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ÉCRAN VUE GLOBALE
  if (currentScreen === 'global') {
    const globalStats = calculateGlobalStats();
    
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setCurrentScreen('home')}
            className="mb-6 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <Trophy className="text-yellow-500" size={36} />
            Vue Globale - Tous les matchs
          </h1>

          {/* Statistiques de victoires */}
          <div className="bg-gray-900 rounded-2xl p-6 shadow-xl mb-6">
            <h2 className="text-xl font-bold mb-4">Bilan général</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Matchs joués</p>
                <p className="text-3xl font-bold">{globalStats.equipe.totalMatches}</p>
              </div>
              <div className="bg-green-900 bg-opacity-30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Victoires</p>
                <p className="text-3xl font-bold text-green-400">{globalStats.equipe.victories}</p>
              </div>
              <div className="bg-red-900 bg-opacity-30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Défaites</p>
                <p className="text-3xl font-bold text-red-400">{globalStats.equipe.defeats}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 bg-gray-900 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Notre Équipe</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">3 Points</p>
                <p className="text-2xl font-bold">{globalStats.equipe.pts3_made}/{globalStats.equipe.pts3_taken}</p>
                <p className="text-green-400 text-sm font-semibold">{formatPercentage(globalStats.equipe.pts3_made, globalStats.equipe.pts3_taken)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Lancers Francs</p>
                <p className="text-2xl font-bold">{globalStats.equipe.lf_made}/{globalStats.equipe.lf_taken}</p>
                <p className="text-green-400 text-sm font-semibold">{formatPercentage(globalStats.equipe.lf_made, globalStats.equipe.lf_taken)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Pertes de balle</p>
                <p className="text-2xl font-bold text-red-400">{globalStats.equipe.pertes}</p>
                <p className="text-gray-500 text-xs">Total cumulé</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Rebonds Off.</p>
                <p className="text-2xl font-bold text-purple-400">{globalStats.equipe.rebonds}</p>
                <p className="text-gray-500 text-xs">Total cumulé</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Interceptions</p>
                <p className="text-2xl font-bold text-blue-400">{globalStats.equipe.interceptions}</p>
                <p className="text-gray-500 text-xs">Total cumulé</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Paniers Faciles Loupés</p>
                <p className="text-2xl font-bold text-orange-400">{globalStats.equipe.paniers_loupes}</p>
                <p className="text-gray-500 text-xs">Total cumulé</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-red-400">Adversaires (cumulé)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">3 Points</p>
                <p className="text-2xl font-bold">{globalStats.adversaire.pts3_made}/{globalStats.adversaire.pts3_taken}</p>
                <p className="text-red-400 text-sm font-semibold">{formatPercentage(globalStats.adversaire.pts3_made, globalStats.adversaire.pts3_taken)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Lancers Francs</p>
                <p className="text-2xl font-bold">{globalStats.adversaire.lf_made}/{globalStats.adversaire.lf_taken}</p>
                <p className="text-red-400 text-sm font-semibold">{formatPercentage(globalStats.adversaire.lf_made, globalStats.adversaire.lf_taken)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Rebonds Off.</p>
                <p className="text-2xl font-bold text-purple-400">{globalStats.adversaire.rebonds}</p>
                <p className="text-gray-500 text-xs">Total cumulé</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ÉCRAN MATCH
  const currentMatch = matches[currentMatchId];
  if (!currentMatch) {
    setCurrentScreen('home');
    return null;
  }
  
  const totalScore = calculateTotalScore(currentMatch);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => {
            setCurrentScreen('home');
            setSelectedTeam(null);
            setPendingConsequence(null);
          }}
          className="mb-4 bg-gray-800 hover:bg-gray-700 px-4 py-2
