// src/live/court-first.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createCourtFirst() {
  return {
    data: null,
    show(x, y, val, screenX, screenY) {
      const State = window.LiveState;
      const live = window._live || {};
      const team = x < 14 ? 'away' : 'home';
      const players = State.onCourt[team].map((id) => State.players[id]).filter(Boolean);
      if (!players.length) {
        if (live.UI) live.UI.toast('Pas de joueurs', 'error');
        return;
      }
      this.data = { x, y, val, team, selectedId: null };
      document.getElementById('courtPopupValue').textContent = `${val} PTS`;
      document.getElementById('courtPopupPlayers').innerHTML = players
        .map(
          (p) =>
            `<button data-id="${p.id}" onclick="CourtFirst.selectPlayer(${p.id})">${p.number}</button>`
        )
        .join('');
      const popup = document.getElementById('courtPopup');
      popup.style.left = `${screenX}px`;
      popup.style.top = `${screenY}px`;
      popup.classList.add('active');
    },
    selectPlayer(id) {
      this.data.selectedId = id;
      document
        .querySelectorAll('#courtPopupPlayers button')
        .forEach((b) => b.classList.remove('selected'));
      document
        .querySelector(`#courtPopupPlayers button[data-id="${id}"]`)
        ?.classList.add('selected');
    },
    confirm(made) {
      const live = window._live || {};
      if (!this.data || !this.data.selectedId) {
        if (live.UI) live.UI.toast('Sélectionnez joueur', 'warning');
        return;
      }
      if (live.GameEngine) {
        live.GameEngine.recordShot(
          this.data.selectedId,
          this.data.val,
          made,
          this.data.x,
          this.data.y
        );
      }
      this.hide();
    },
    hide() {
      document.getElementById('courtPopup').classList.remove('active');
      this.data = null;
    },
  };
}
