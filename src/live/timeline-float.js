// src/live/timeline-float.js
// Extrait de live.html -- lit window.LiveState et window._live au moment de l'appel

export function createTimelineFloat() {
  return {
    render() {
      const State = window.LiveState;
      const last3 = State.actions.slice(-3).reverse(),
        c = document.getElementById('timelineFloat');
      if (!last3.length) {
        c.innerHTML =
          '<div style="color:var(--text-muted);font-size:0.55rem;">Aucune action</div>';
        return;
      }
      c.innerHTML = last3
        .map((a, ri) => {
          const idx = State.actions.length - 1 - ri,
            p = State.players[a.pid];
          if (!p) return '';
          let icon = '📋',
            desc = a.type;
          if (a.type === 'SHOT') {
            icon = a.made ? '✅' : '❌';
            desc = `${a.val}p`;
          } else if (a.type === 'OREB') {
            icon = '🔄';
            desc = 'RO';
          } else if (a.type === 'DREB') {
            icon = '🛡️';
            desc = 'RD';
          } else if (a.type === 'STL') {
            icon = '⚡';
            desc = 'Int';
          } else if (a.type === 'BLK') {
            icon = '✋';
            desc = 'Ctr';
          } else if (a.type === 'TOV') {
            icon = '💨';
            desc = 'BP';
          } else if (a.type === 'FOUL') {
            icon = '🚨';
            desc =
              a.foulType === 'technical'
                ? 'Tech'
                : a.foulType === 'unsportsmanlike'
                  ? 'Anti'
                  : 'Fte';
          } else if (a.type === 'FT') {
            icon = '🎯';
            desc = a.ftMade ? '✓' : '✗';
          } else if (a.type === 'SUB') {
            icon = '🔁';
            desc = 'Sub';
          } else if (a.type === 'TIMEOUT') {
            icon = '⏸';
            desc = `Timeout ${a.team === 'home' ? 'Nous' : 'Eux'}`;
          } else if (a.type === 'STOPPAGE') {
            icon = '⏱';
            desc = `Arrêt chrono ${a.duration || 0}s`;
          }

          return `<div class="timeline-item ${p.team}" onclick="UI.editAction(${idx})"><span style="font-size:0.8rem">${icon}</span><span style="font-weight:700">#${p.number}</span><span style="color:var(--text-secondary);font-size:0.6rem">${desc}</span><button class="timeline-undo" onclick="event.stopPropagation();TimelineFloat.undo(${idx})">↩</button></div>`;
        })
        .join('');
    },

    undo(idx) {
      const State = window.LiveState;
      const live = window._live || {};
      State.actions.splice(idx, 1);
      if (live.GameEngine) live.GameEngine.recalc();
      if (live.UI) {
        live.UI.renderRoster();
        live.UI.updateHeader();
        live.UI.renderPBP();
        live.UI.toast('Annulé');
      }
      this.render();
      if (live.Court) live.Court.draw();
      if (live.WormChart) live.WormChart.draw();
    },
  };
}
