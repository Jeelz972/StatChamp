// src/live/keyboard-shortcuts.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createKeyboardShortcuts() {
  return {
    active: true,
    init() {
      document.addEventListener('keydown', (e) => {
        if (!this.active) return;
        if (
          document.querySelector('.modal-wrap.show') ||
          document.querySelector('.stats-modal.show') ||
          document.querySelector('.subs-modal.show') ||
          document.querySelector('.starters-modal.show') ||
          document.querySelector('.foul-panel.show') ||
          document.querySelector('.assist-popup.show') ||
          document.querySelector('.rebound-banner.show') ||
          document.getElementById('customModal')?.classList.contains('show')
        )
          return;
        const live = window._live || {};
        const State = window.LiveState;
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            if (live.GameEngine) live.GameEngine.toggleTimer();
            break;
          case 'Digit1':
          case 'Digit2':
          case 'Digit3':
          case 'Digit4':
          case 'Digit5':
            e.preventDefault();
            if (State) {
              const idx = parseInt(e.code.replace('Digit', '')) - 1;
              const onCourt = State.onCourt.home;
              if (onCourt[idx] && live.GameEngine) live.GameEngine.handlePlayerClick(onCourt[idx]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            if (live.UI) live.UI.closeModal();
            break;
        }
      });
    },
  };
}
