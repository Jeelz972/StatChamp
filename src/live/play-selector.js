// src/live/play-selector.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createPlaySelector() {
  return {
    show() {
      const State = window.LiveState;
      const live = window._live || {};
      const plays = State.playTypes;
      let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
      plays.forEach((p) => {
        const isActive = State.currentPlay === p;
        html += `<button class="btn-mod ${isActive ? 'prim' : ''}" onclick="PlaySelector.select('${p.replace(/'/g, "\\'")}')\" style="padding:10px;font-size:0.8rem;${isActive ? 'box-shadow:0 0 8px rgba(13,148,136,0.5);' : ''}">${isActive ? '✓ ' : ''}${p}</button>`;
      });
      html += `<button class="btn-mod" onclick="PlaySelector.clear()" style="padding:8px;font-size:0.75rem;color:var(--text-muted);">✕ Aucun système</button>`;
      html += '</div>';
      if (live.UI) {
        live.UI.showModal(
          '📋 Système de jeu',
          html,
          [{ text: 'Fermer', action: 'UI.closeModal()', class: '' }],
          'g-1'
        );
      }
    },
    select(play) {
      const State = window.LiveState;
      const live = window._live || {};
      State.currentPlay = play;
      if (live.UI) { live.UI.closeModal(); live.UI.toast(`📋 ${play}`); }
      this.renderBadge();
    },
    clear() {
      const State = window.LiveState;
      const live = window._live || {};
      State.currentPlay = null;
      if (live.UI) live.UI.closeModal();
      this.renderBadge();
    },
    renderBadge() {
      const State = window.LiveState;
      const el = document.getElementById('playBadge');
      if (!el) return;
      if (State.currentPlay) {
        el.style.display = 'block';
        el.textContent = '📋 ' + State.currentPlay;
      } else {
        el.style.display = 'none';
        el.textContent = '';
      }
    },
  };
}
