// src/live/context-manager.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createContextManager() {
  return {
    current: 'attack',

    update(trigger, team) {
      const State = window.LiveState;
      const PlaySelector = window._live && window._live.PlaySelector;
      const UI = window._live && window._live.UI;
      const rules = {
        SHOT_MADE_home: 'defense', SHOT_MADE_away: 'attack',
        SHOT_MISS_home: 'defense', SHOT_MISS_away: 'attack',
        DREB_home: 'attack', DREB_away: 'defense',
        OREB_home: 'attack', OREB_away: 'defense',
        TOV_home: 'defense', TOV_away: 'attack',
        STL_home: 'attack', STL_away: 'defense',
      };
      if (rules[`${trigger}_${team}`]) {
        const newCtx = rules[`${trigger}_${team}`];
        if (this.current !== newCtx && State.currentPlay) {
          State.currentPlay = null;
          if (PlaySelector) PlaySelector.renderBadge();
        }
        this.current = newCtx;
        this.render();
      }
    },

    toggle() {
      const UI = window._live && window._live.UI;
      this.current = this.current === 'attack' ? 'defense' : 'attack';
      this.render();
      if (UI) UI.toast(`${this.current === 'attack' ? '🏀 Attaque' : '🛡️ Défense'}`);
    },

    render() {
      const b = document.getElementById('contextBadge');
      if (!b) return;
      b.className = `context-badge ${this.current}`;
      b.textContent = this.current === 'attack' ? '🏀 ATT' : '🛡️ DÉF';
    },
  };
}
