// src/live/assist-popup.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createAssistPopup() {
  return {
    callback: null,
    scorerId: null,
    shotData: null,
    show(scorerId, team, shotData) {
      const State = window.LiveState;
      this.scorerId = scorerId;
      this.shotData = shotData;
      const teammates = State.onCourt[team]
        .filter((id) => id !== scorerId)
        .map((id) => State.players[id])
        .filter(Boolean);
      document.getElementById('assistPlayers').innerHTML = teammates
        .map(
          (p) =>
            `<button onclick="event.stopPropagation();AssistPopup.select(${p.id})">${p.number}<span>${p.name.substring(0, 5)}</span></button>`
        )
        .join('');
      document.getElementById('assistPopup').classList.add('show');
    },
    select(assisterId) {
      const State = window.LiveState;
      const live = window._live || {};
      document.getElementById('assistPopup').classList.remove('show');
      for (let i = State.actions.length - 1; i >= 0; i--) {
        if (
          State.actions[i].type === 'SHOT' &&
          State.actions[i].pid === this.scorerId &&
          State.actions[i].made &&
          !State.actions[i].astId
        ) {
          State.actions[i].astId = assisterId;
          break;
        }
      }
      State.players[assisterId].stats.ast++;
      if (live.UI) { live.UI.renderRoster(); live.UI.renderPBP(); }
      if (live.TimelineFloat) live.TimelineFloat.render();
      if (live.UI) live.UI.toast(`🎯 Passe #${State.players[assisterId].number}`);
      this.shotData = null;
    },
    skip() {
      document.getElementById('assistPopup').classList.remove('show');
      this.shotData = null;
    },
  };
}
