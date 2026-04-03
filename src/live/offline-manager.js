// src/live/offline-manager.js
// Extrait de live.html -- lit window.LiveState au moment de l'appel

export function createOfflineManager() {
  return {
    save() {
      const State = window.LiveState;
      localStorage.setItem(
        'liveMatchState',
        JSON.stringify({
          match: State.match,
          players: State.players,
          actions: State.actions,
          onCourt: State.onCourt,
          starters: State.starters,
          opponentStarters: State.opponentStarters,
          teamFouls: State.teamFouls,
          scoreHistory: State.scoreHistory,
          playTypes: State.playTypes,
          currentPlay: State.currentPlay,
          specialFouls: State.specialFouls,
          timeouts: State.timeouts,
          pauseStartWall: State.pauseStartWall,
          savedAt: Date.now(),
        })
      );
    },

    load() {
      const s = localStorage.getItem('liveMatchState');
      if (!s) return null;
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    },

    clear() {
      localStorage.removeItem('liveMatchState');
    },
  };
}
