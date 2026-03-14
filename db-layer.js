// db-layer.js — Couche d'abstraction Firebase Firestore
// Dépendance : window.db (instance firebase.firestore() initialisée ailleurs)
// Dépendance : sessionStorage.getItem('statchamp_wk') pour le write-token

(function () {
  'use strict';

  function getWk() {
    return sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
  }

  function getDb() {
    return window.db;
  }

  window.DB = {
    // ========== ROSTER ==========
    getRoster: function () {
      return getDb().collection('team_data').doc('roster').get();
    },
    onRoster: function (callback) {
      return getDb().collection('team_data').doc('roster').onSnapshot(callback);
    },
    saveRoster: function (list) {
      return getDb().collection('team_data').doc('roster').set({ list: list, _wk: getWk() });
    },

    // ========== PHASES ==========
    getPhases: function () {
      return getDb().collection('team_data').doc('phases').get();
    },
    onPhases: function (callback) {
      return getDb().collection('team_data').doc('phases').onSnapshot(callback);
    },
    savePhases: function (list) {
      return getDb().collection('team_data').doc('phases').set({ list: list, _wk: getWk() });
    },

    // ========== CONFIG ==========
    getConfig: function () {
      return getDb().collection('team_data').doc('config').get();
    },
    saveConfig: function (data) {
      var payload = Object.assign({}, data, { _wk: getWk() });
      return getDb().collection('team_data').doc('config').set(payload, { merge: true });
    },

    // ========== SEASONS ==========
    onSeasons: function (callback) {
      return getDb().collection('team_data').doc('seasons').onSnapshot(callback);
    },
    saveSeasons: function (list) {
      return getDb().collection('team_data').doc('seasons').set({ list: list, _wk: getWk() });
    },

    // ========== GAMES (collection éclatée) ==========
    getGames: function () {
      return getDb()
        .collection('games')
        .get()
        .then(function (snapshot) {
          return snapshot.docs.map(function (doc) {
            return doc.data();
          });
        });
    },
    getGame: function (gameId) {
      return getDb().collection('games').doc(gameId).get();
    },
    onGames: function (callback) {
      // callback reçoit un tableau de games, pas un snapshot brut
      return getDb()
        .collection('games')
        .onSnapshot(function (snapshot) {
          var gamesList = snapshot.docs.map(function (doc) {
            return doc.data();
          });
          callback(gamesList);
        });
    },
    saveGame: function (game) {
      if (!game || !game.id) return Promise.reject(new Error('Game sans id'));
      var payload = Object.assign({}, game, {
        _wk: getWk(),
        updatedAt: new Date().toISOString(),
      });
      return getDb().collection('games').doc(game.id).set(payload);
    },
    deleteGame: function (gameId) {
      // Les Security Rules interdisent delete.
      // On supprime en écrasant avec un flag, ou on utilise une approche différente.
      // Pour l'instant : set avec un objet minimal marqué deleted
      return getDb().collection('games').doc(gameId).set({
        id: gameId,
        _deleted: true,
        _wk: getWk(),
        updatedAt: new Date().toISOString(),
      });
    },

    // ========== GAME PREPS ==========
    getPrep: function (prepId) {
      return getDb().collection('gamePreps').doc(prepId).get();
    },
    savePrep: function (prepId, data) {
      var payload = Object.assign({}, data, { _wk: getWk(), updatedAt: new Date().toISOString() });
      return getDb().collection('gamePreps').doc(prepId).set(payload, { merge: true });
    },
  };
})();
